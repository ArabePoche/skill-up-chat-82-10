import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface IncomingCall {
  id: string;
  caller_id: string;
  formation_id: string;
  lesson_id: string;
  call_type: 'audio' | 'video';
  created_at: string;
  caller_name?: string;
  caller_avatar?: string;
  lesson_title?: string;
}

export const useIncomingCalls = (formationId?: string) => {
  const { user } = useAuth();
  const [incomingCalls, setIncomingCalls] = useState<IncomingCall[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchIncomingCalls = async () => {
    if (!user) {
      console.log('useIncomingCalls: Pas d\'utilisateur connecté');
      return;
    }

    console.log('useIncomingCalls: Récupération des appels pour formationId:', formationId);
    
    try {
      setIsLoading(true);
      
      // Récupérer tous les appels en attente
      const { data: callsData, error } = await supabase
        .from('call_sessions')
        .select('*')
        .eq('status', 'pending')
        .is('receiver_id', null); // Appels ouverts à tous les professeurs

      console.log('useIncomingCalls: Appels trouvés:', callsData);

      if (error) {
        console.error('Erreur lors de la récupération des appels:', error);
        return;
      }

      // Vérifier quels appels concernent ce professeur
      const relevantCalls = [];
      
      for (const call of callsData || []) {
        // Vérifier si l'utilisateur est professeur de cette formation
        const { data: teacherFormation } = await supabase
          .from('teachers')
          .select(`
            id,
            teacher_formations!inner(formation_id)
          `)
          .eq('user_id', user.id)
          .eq('teacher_formations.formation_id', call.formation_id)
          .single();

        console.log('useIncomingCalls: Vérification professeur pour formation', call.formation_id, ':', teacherFormation);

        if (teacherFormation && (!formationId || call.formation_id === formationId)) {
          // Récupérer les infos du profil de l'appelant
          const { data: callerProfile } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url')
            .eq('id', call.caller_id)
            .single();

          // Récupérer les infos de la leçon
          const { data: lessonInfo } = await supabase
            .from('lessons')
            .select('title')
            .eq('id', call.lesson_id)
            .single();

          relevantCalls.push({
            id: call.id,
            caller_id: call.caller_id,
            formation_id: call.formation_id,
            lesson_id: call.lesson_id,
            call_type: call.call_type,
            created_at: call.created_at,
            caller_name: callerProfile ? `${callerProfile.first_name} ${callerProfile.last_name}` : 'Utilisateur inconnu',
            caller_avatar: callerProfile?.avatar_url,
            lesson_title: lessonInfo?.title
          });
        }
      }

      console.log('useIncomingCalls: Appels pertinents trouvés:', relevantCalls.length);
      setIncomingCalls(relevantCalls);
    } catch (error) {
      console.error('Erreur lors de la récupération des appels:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    fetchIncomingCalls();

    // Écouter les changements en temps réel
    const channel = supabase
      .channel('incoming_calls')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_sessions',
          filter: 'status=eq.pending'
        },
        () => {
          console.log('Nouvel appel détecté, actualisation...');
          fetchIncomingCalls();
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
          console.log('Appel mis à jour:', payload);
          if (payload.new.status !== 'pending') {
            // Retirer l'appel de la liste s'il n'est plus en attente
            setIncomingCalls(prev => prev.filter(call => call.id !== payload.new.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, formationId]);

  const acceptCall = async (callId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('call_sessions')
        .update({ 
          status: 'accepted',
          receiver_id: user.id,
          started_at: new Date().toISOString()
        })
        .eq('id', callId);

      if (error) {
        console.error('Erreur lors de l\'acceptation de l\'appel:', error);
        return false;
      }

      // Retirer l'appel de la liste locale
      setIncomingCalls(prev => prev.filter(call => call.id !== callId));
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'acceptation de l\'appel:', error);
      return false;
    }
  };

  const rejectCall = async (callId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('call_sessions')
        .update({ 
          status: 'rejected',
          receiver_id: user.id,
          ended_at: new Date().toISOString()
        })
        .eq('id', callId);

      if (error) {
        console.error('Erreur lors du rejet de l\'appel:', error);
        return false;
      }

      // Retirer l'appel de la liste locale
      setIncomingCalls(prev => prev.filter(call => call.id !== callId));
      return true;
    } catch (error) {
      console.error('Erreur lors du rejet de l\'appel:', error);
      return false;
    }
  };

  return {
    incomingCalls,
    isLoading,
    acceptCall,
    rejectCall,
    refreshCalls: fetchIncomingCalls
  };
};