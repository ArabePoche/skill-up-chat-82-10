/**
 * Hook pour gérer les appels (initiation, écoute de la réponse, état d'appel Agora)
 * Utilisé côté étudiant ET côté professeur pour initier un appel
 */
import { useState, useCallback, useRef } from 'react';
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
          receiver_id: null,
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

      toast.success(`Appel ${callType === 'voice' ? 'audio' : 'vidéo'} lancé`);
      toast.info('En attente qu\'un professeur réponde...');

      // Écouter la réponse du professeur
      const callChannel = supabase
        .channel(`call-${callSession.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'call_sessions',
            filter: `id=eq.${callSession.id}`
          },
          (payload: any) => {
            const updatedCall = payload.new;

            if (updatedCall.status === 'accepted') {
              toast.success('Un professeur a accepté votre appel !');
              // Ouvrir l'UI Agora côté étudiant
              setAcceptedCall({
                id: callSession.id,
                callType: callType === 'voice' ? 'audio' : 'video',
                channelName: `call_${callSession.id}`,
              });
              setIsCallActive(false);
            } else if (updatedCall.status === 'rejected' || updatedCall.status === 'ended') {
              toast.info('Appel terminé');
              setIsCallActive(false);
              setCurrentCall(null);
              // Nettoyer le channel
              supabase.removeChannel(callChannel);
            }
          }
        )
        .subscribe();

      channelRef.current = callChannel;

      // Timeout après 2 minutes
      setTimeout(() => {
        supabase.removeChannel(callChannel);
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
  }, [user, canMakeCall, formationId]);

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

      setIsCallActive(false);
      setCurrentCall(null);
      toast.info('Appel terminé');
    } catch (error) {
      console.error('Erreur lors de la fin de l\'appel:', error);
    }

    // Nettoyer le channel realtime
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, [currentCall, user]);

  const closeAgoraUI = useCallback(() => {
    setAcceptedCall(null);
    setCurrentCall(null);
    setIsCallActive(false);
  }, []);

  const openAgoraUI = useCallback((call: AcceptedCall) => {
    setAcceptedCall(call);
  }, []);

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
