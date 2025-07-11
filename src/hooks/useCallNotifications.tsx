
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface CallNotification {
  id: string;
  caller_id: string;
  formation_id: string;
  lesson_id: string;
  call_type: 'audio' | 'video';
  caller_name?: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export const useCallNotifications = (formationId: string) => {
  const { user } = useAuth();
  const [incomingCalls, setIncomingCalls] = useState<CallNotification[]>([]);
  const [isTeacher, setIsTeacher] = useState(false);

  useEffect(() => {
    if (!user?.id || !formationId) return;

    // Vérifier si l'utilisateur est professeur dans cette formation
    const checkTeacherStatus = async () => {
      try {
        const { data } = await supabase
          .from('teachers')
          .select('id')
          .eq('user_id', user.id)
          .eq('formation_id', formationId)
          .single();
        
        setIsTeacher(!!data);
      } catch (error) {
        console.error('Error checking teacher status:', error);
        setIsTeacher(false);
      }
    };

    checkTeacherStatus();
  }, [user?.id, formationId]);

  useEffect(() => {
    if (!isTeacher || !formationId) return;

    // Écouter les nouveaux appels entrants
    const callsChannel = supabase
      .channel(`calls-${formationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_sessions',
          filter: `formation_id=eq.${formationId}`
        },
        async (payload) => {
          const newCall = payload.new;
          
          // Ne pas notifier si c'est notre propre appel
          if (newCall.caller_id === user?.id) return;

          try {
            // Récupérer les infos du demandeur
            const { data: callerProfile } = await supabase
              .from('profiles')
              .select('first_name, last_name, username')
              .eq('id', newCall.caller_id)
              .single();

            const callerName = callerProfile 
              ? `${callerProfile.first_name || ''} ${callerProfile.last_name || ''}`.trim() || callerProfile.username || 'Utilisateur'
              : 'Utilisateur';

            const callNotification: CallNotification = {
              id: newCall.id,
              caller_id: newCall.caller_id,
              formation_id: newCall.formation_id,
              lesson_id: newCall.lesson_id,
              call_type: newCall.call_type,
              caller_name: callerName,
              status: 'pending'
            };

            setIncomingCalls(prev => [...prev, callNotification]);
            
            toast.info(`📞 Appel ${newCall.call_type === 'video' ? 'vidéo' : 'audio'} entrant de ${callerName}`, {
              duration: 30000,
              action: {
                label: 'Répondre',
                onClick: () => acceptCall(callNotification.id)
              }
            });
          } catch (error) {
            console.error('Error handling new call:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'call_sessions',
          filter: `formation_id=eq.${formationId}`
        },
        (payload) => {
          const updatedCall = payload.new;
          
          setIncomingCalls(prev => 
            prev.map(call => 
              call.id === updatedCall.id 
                ? { ...call, status: updatedCall.status }
                : call
            )
          );

          // Si l'appel a été accepté par un autre prof, supprimer la notification
          if (updatedCall.status === 'accepted' && updatedCall.receiver_id !== user?.id) {
            setIncomingCalls(prev => prev.filter(call => call.id !== updatedCall.id));
            toast.info('Appel déjà pris par un autre professeur');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(callsChannel);
    };
  }, [isTeacher, formationId, user?.id]);

  const acceptCall = async (callId: string) => {
    try {
      const { error } = await supabase
        .from('call_sessions')
        .update({ 
          status: 'accepted',
          receiver_id: user?.id,
          started_at: new Date().toISOString()
        })
        .eq('id', callId)
        .eq('status', 'pending'); // S'assurer que l'appel est encore en attente

      if (error) {
        toast.error('Impossible d\'accepter l\'appel');
        return;
      }

      // Supprimer l'appel des notifications locales
      setIncomingCalls(prev => prev.filter(call => call.id !== callId));
      
      toast.success('Appel accepté ! Connexion en cours...');
      // TODO: Ici, implémenter la logique WebRTC
      
    } catch (error) {
      console.error('Error accepting call:', error);
      toast.error('Erreur lors de l\'acceptation de l\'appel');
    }
  };

  const rejectCall = async (callId: string) => {
    try {
      const { error } = await supabase
        .from('call_sessions')
        .update({ 
          status: 'rejected',
          ended_at: new Date().toISOString()
        })
        .eq('id', callId);

      if (error) {
        toast.error('Erreur lors du rejet de l\'appel');
        return;
      }

      setIncomingCalls(prev => prev.filter(call => call.id !== callId));
      toast.info('Appel rejeté');
      
    } catch (error) {
      console.error('Error rejecting call:', error);
    }
  };

  return {
    incomingCalls: incomingCalls.filter(call => call.status === 'pending'),
    acceptCall,
    rejectCall,
    isTeacher
  };
};
