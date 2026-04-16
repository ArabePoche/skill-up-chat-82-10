/**
 * Hook pour gérer les appels (initiation, écoute de la réponse, état d'appel Agora)
 * Utilisé côté étudiant ET côté professeur pour initier un appel
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { usePlanLimits } from '@/plan-limits/hooks/usePlanLimits';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';


export interface AcceptedCall {
  id: string;
  callType: 'audio' | 'video';
  channelName: string;
  callerName?: string;
}

interface CallFunctionality {
  initiateCall: (type: 'audio' | 'video' | 'voice', receiverId: string, lessonId: string) => Promise<boolean>;
  isCallActive: boolean;
  currentCall: any;
  endCall: () => void;
  /** Appel accepté par un professeur — prêt pour Agora */
  acceptedCall: AcceptedCall | null;
  /** Fermer l'UI d'appel Agora */
  closeAgoraUI: () => void;
  /** Ouvrir manuellement l'UI Agora (pour le prof qui accepte un appel entrant) */
  openAgoraUI: (call: AcceptedCall) => void;
}

export const useCallFunctionality = (formationId: string): CallFunctionality => {
  const { user } = useAuth();
  const { canMakeCall } = usePlanLimits({ formationId, context: 'call' });
  const [isCallActive, setIsCallActive] = useState(false);
  const [currentCall, setCurrentCall] = useState<any>(null);
  const [acceptedCall, setAcceptedCall] = useState<AcceptedCall | null>(null);
  const channelRef = useRef<any>(null);

  const cleanupRealtimeChannel = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const clearCallState = useCallback(() => {
    setAcceptedCall(null);
    setCurrentCall(null);
    setIsCallActive(false);
  }, []);

  const subscribeToCallSession = useCallback((
    callId: string,
    options?: {
      onAccepted?: () => void;
      showEndedToast?: boolean;
    }
  ) => {
    cleanupRealtimeChannel();

    const callChannel = supabase
      .channel(`call-${callId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'call_sessions',
          filter: `id=eq.${callId}`
        },
        (payload: any) => {
          const updatedCall = payload.new;

          if (updatedCall.status === 'accepted') {
            setCurrentCall(updatedCall);
            options?.onAccepted?.();
            return;
          }

          if (updatedCall.status === 'rejected') {
            toast.info('Appel rejeté');
            clearCallState();
            cleanupRealtimeChannel();
            return;
          }

          if (updatedCall.status === 'ended') {
            if (options?.showEndedToast !== false) {
              toast.info('Appel terminé');
            }
            clearCallState();
            cleanupRealtimeChannel();
          }
        }
      )
      .subscribe();

    channelRef.current = callChannel;
  }, [clearCallState, cleanupRealtimeChannel]);

  // Son d'attente supprimé — l'appelant n'a plus de sonnerie

  const initiateCall = useCallback(async (type: 'audio' | 'video' | 'voice', receiverId: string, lessonId: string) => {
    if (!user) {
      toast.error('Vous devez être connecté pour passer un appel');
      return false;
    }

    const permission = canMakeCall(type);
    if (!permission.allowed) {
      toast.error(permission.reason || 'Appel non autorisé');
      return false;
    }

    try {
      const callType = type === 'audio' || type === 'voice' ? 'voice' : 'video';

      const { data: callSession, error } = await supabase
        .from('call_sessions')
        .insert({
          caller_id: user.id,
          receiver_id: receiverId ? receiverId : null,
          formation_id: formationId,
          lesson_id: lessonId,
          call_type: callType,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('Erreur lors de la création de la session d\'appel:', error);
        toast.error('Impossible d\'initier l\'appel');
        return false;
      }

      setCurrentCall(callSession);
      setIsCallActive(true);

      // 📞 Envoyer une notification push FCM pour réveiller l'app du destinataire (même fermée/verrouillée)
      if (receiverId) {
        try {
          const callerName = (user.user_metadata as any)?.full_name 
            || (user.user_metadata as any)?.first_name 
            || 'Quelqu\'un';
          
          await supabase.functions.invoke('send-push-notification', {
            body: {
              userIds: [receiverId],
              title: `Appel ${callType === 'voice' ? 'audio' : 'vidéo'} entrant`,
              message: `${callerName} vous appelle...`,
              type: 'incoming_call',
              data: {
                callId: callSession.id,
                callType,
                callerId: user.id,
                callerName,
                formationId,
                lessonId,
                clickAction: `/formations/${formationId}/lessons/${lessonId}`,
              },
            },
          });
          console.log('📲 Notification d\'appel FCM envoyée au destinataire');
        } catch (pushError) {
          console.error('⚠️ Erreur envoi push (l\'appel reste actif via Realtime):', pushError);
        }
      }

      toast.success(`Appel ${callType === 'voice' ? 'audio' : 'vidéo'} lancé`);
      toast.info('En attente qu\'un professeur réponde...');

      subscribeToCallSession(callSession.id, {
        onAccepted: () => {
          toast.success('Un professeur a accepté votre appel !');
          setAcceptedCall({
            id: callSession.id,
            callType: callType === 'voice' ? 'audio' : 'video',
            channelName: `call_${callSession.id}`,
          });
          setIsCallActive(false);
        }
      });

      // Timeout après 2 minutes
      setTimeout(() => {
        cleanupRealtimeChannel();
        setIsCallActive((active) => {
          if (active) {
            toast.info('Aucun professeur n\'est disponible pour le moment');
            setCurrentCall(null);
            return false;
          }
          return active;
        });
      }, 120000);

      return true;
    } catch (error) {
      console.error('Erreur lors de l\'initiation de l\'appel:', error);
      toast.error('Erreur lors de l\'appel');
      return false;
    }
  }, [user, canMakeCall, formationId, subscribeToCallSession, cleanupRealtimeChannel]);

  const endCall = useCallback(async () => {
    if (!currentCall || !user) return;

    try {
      await supabase
        .from('call_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('id', currentCall.id);

      clearCallState();
      toast.info('Appel terminé');
    } catch (error) {
      console.error('Erreur lors de la fin de l\'appel:', error);
    }

    cleanupRealtimeChannel();
  }, [clearCallState, cleanupRealtimeChannel, currentCall, user]);

  const closeAgoraUI = useCallback(() => {
    clearCallState();
  }, [clearCallState]);

  const openAgoraUI = useCallback((call: AcceptedCall) => {
    setCurrentCall((previous: any) => ({
      ...previous,
      id: call.id,
      status: 'accepted',
    }));
    setAcceptedCall(call);
    subscribeToCallSession(call.id, {
      showEndedToast: true,
    });
  }, [subscribeToCallSession]);

  useEffect(() => {
    return () => {
      cleanupRealtimeChannel();
    };
  }, [cleanupRealtimeChannel]);

  return {
    initiateCall,
    isCallActive,
    currentCall,
    endCall,
    acceptedCall,
    closeAgoraUI,
    openAgoraUI,
  };
};
