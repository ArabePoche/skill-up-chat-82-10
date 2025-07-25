
import { useState, useCallback } from 'react';
import { useSubscriptionLimits } from './useSubscriptionLimits';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface CallFunctionality {
  initiateCall: (type: 'audio' | 'video', receiverId: string, lessonId: string) => Promise<boolean>;
  isCallActive: boolean;
  currentCall: any;
  endCall: () => void;
}

export const useCallFunctionality = (formationId: string): CallFunctionality => {
  const { user } = useAuth();
  const { checkPermission } = useSubscriptionLimits(formationId);
  const [isCallActive, setIsCallActive] = useState(false);
  const [currentCall, setCurrentCall] = useState(null);

  const initiateCall = useCallback(async (type: 'audio' | 'video', receiverId: string, lessonId: string) => {
    if (!user) {
      toast.error('Vous devez être connecté pour passer un appel');
      return false;
    }

    // Vérifier les permissions d'abonnement
    const action = type === 'audio' ? 'call' : 'video_call';
    const permission = checkPermission(action);
    
    if (!permission.allowed) {
      toast.error(permission.message || 'Appel non autorisé');
      return false;
    }

    try {
      // Créer une session d'appel qui sera reçue par tous les professeurs
      const { data: callSession, error } = await supabase
        .from('call_sessions')
        .insert({
          caller_id: user.id,
          receiver_id: '', // Vide car l'appel va à tous les professeurs
          formation_id: formationId,
          lesson_id: lessonId,
          call_type: type,
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
      
      toast.success(`Appel ${type === 'audio' ? 'audio' : 'vidéo'} lancé`);
      toast.info('En attente qu\'un professeur réponde...');
      
      // Écouter la réponse des professeurs
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
          (payload) => {
            const updatedCall = payload.new;
            
            if (updatedCall.status === 'accepted') {
              toast.success('Un professeur a accepté votre appel !');
              // TODO: Démarrer la connexion WebRTC
            } else if (updatedCall.status === 'rejected') {
              toast.info('Appel terminé');
              setIsCallActive(false);
              setCurrentCall(null);
            }
          }
        )
        .subscribe();

      // Nettoyer l'écoute après 2 minutes si pas de réponse
      setTimeout(() => {
        supabase.removeChannel(callChannel);
        if (callSession.status === 'pending') {
          endCall();
          toast.info('Aucun professeur n\'est disponible pour le moment');
        }
      }, 120000); // 2 minutes
      
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'initiation de l\'appel:', error);
      toast.error('Erreur lors de l\'appel');
      return false;
    }
  }, [user, checkPermission, formationId]);

  const endCall = useCallback(async () => {
    if (!currentCall) return;

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
  }, [currentCall]);

  return {
    initiateCall,
    isCallActive,
    currentCall,
    endCall
  };
};
