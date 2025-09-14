import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook pour récupérer les messages de groupe d'un niveau spécifique côté professeur
 */
export const useTeacherGroupMessages = (formationId: string, levelId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['teacher-group-messages', formationId, levelId, user?.id],
    queryFn: async () => {
      if (!formationId || !levelId || !user?.id) return [];

      console.log('Fetching teacher group messages for level:', levelId, 'formation:', formationId);

      // Vérifier si l'utilisateur est professeur de cette formation
      const { data: teacherCheck } = await supabase
        .from('teachers')
        .select(`
          id,
          teacher_formations!inner (
            formation_id
          )
        `)
        .eq('user_id', user.id)
        .eq('teacher_formations.formation_id', formationId)
        .maybeSingle();

      if (!teacherCheck) {
        console.error('User is not a teacher in this formation');
        return [];
      }

      // Récupérer TOUS les messages de groupe pour ce niveau (toutes promotions confondues)
      // EXCLURE les messages système pour les professeurs
      const { data: messages, error } = await supabase
        .from('lesson_messages')
        .select(`
          id,
          content,
          message_type,
          file_url,
          file_type,
          file_name,
          created_at,
          sender_id,
          receiver_id,
          promotion_id,
          level_id,
          is_system_message,
          exercise_id,
          exercise_status,
          is_exercise_submission,
          profiles!sender_id (
            first_name,
            last_name,
            username,
            avatar_url,
            is_teacher
          )
        `)
        .eq('formation_id', formationId)
        .eq('level_id', levelId) // Filtrer par level_id pour avoir tous les messages du niveau
        .eq('is_system_message', false) // Exclure les messages système pour les profs
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching group messages:', error);
        return [];
      }

      console.log('Teacher group messages found:', messages?.length || 0);
      return messages || [];
    },
    enabled: !!formationId && !!levelId && !!user?.id,
    refetchInterval: 2000, // Actualisation automatique chaque 2 secondes
  });
};