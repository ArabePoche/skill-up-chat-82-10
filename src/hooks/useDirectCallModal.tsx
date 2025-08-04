import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface DirectCall {
  id: string;
  caller_id: string;
  formation_id: string;
  lesson_id: string;
  call_type: 'audio' | 'video';
  caller_name: string;
  caller_avatar?: string;
}

export const useDirectCallModal = (currentStudentId?: string, currentLessonId?: string) => {
  const { user } = useAuth();
  const [directCall, setDirectCall] = useState<DirectCall | null>(null);

  useEffect(() => {
    if (!user || !currentStudentId || !currentLessonId) return;

    const channel = supabase
      .channel('direct_call_modal')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_sessions',
          filter: `status=eq.pending`
        },
        async (payload) => {
          const call = payload.new;
          
          // Vérifier si l'appel vient de l'étudiant actuellement en chat
          // et concerne la leçon actuelle
          if (call.caller_id === currentStudentId && call.lesson_id === currentLessonId) {
            console.log('Appel direct détecté pour le chat en cours');
            
            // Récupérer les infos du profil de l'appelant
            const { data: callerProfile } = await supabase
              .from('profiles')
              .select('first_name, last_name, avatar_url')
              .eq('id', call.caller_id)
              .single();

            setDirectCall({
              id: call.id,
              caller_id: call.caller_id,
              formation_id: call.formation_id,
              lesson_id: call.lesson_id,
              call_type: call.call_type,
              caller_name: callerProfile ? `${callerProfile.first_name} ${callerProfile.last_name}` : 'Utilisateur inconnu',
              caller_avatar: callerProfile?.avatar_url
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'call_sessions'
        },
        (payload) => {
          if (directCall && payload.new.id === directCall.id && payload.new.status !== 'pending') {
            setDirectCall(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, currentStudentId, currentLessonId, directCall]);

  const acceptDirectCall = async () => {
    if (!directCall || !user) return false;

    try {
      const { error } = await supabase
        .from('call_sessions')
        .update({ 
          status: 'accepted',
          receiver_id: user.id,
          started_at: new Date().toISOString()
        })
        .eq('id', directCall.id);

      if (error) {
        console.error('Erreur lors de l\'acceptation de l\'appel direct:', error);
        return false;
      }

      setDirectCall(null);
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'acceptation de l\'appel direct:', error);
      return false;
    }
  };

  const rejectDirectCall = async () => {
    if (!directCall || !user) return false;

    try {
      const { error } = await supabase
        .from('call_sessions')
        .update({ 
          status: 'rejected',
          receiver_id: user.id,
          ended_at: new Date().toISOString()
        })
        .eq('id', directCall.id);

      if (error) {
        console.error('Erreur lors du rejet de l\'appel direct:', error);
        return false;
      }

      setDirectCall(null);
      return true;
    } catch (error) {
      console.error('Erreur lors du rejet de l\'appel direct:', error);
      return false;
    }
  };

  return {
    directCall,
    acceptDirectCall,
    rejectDirectCall
  };
};