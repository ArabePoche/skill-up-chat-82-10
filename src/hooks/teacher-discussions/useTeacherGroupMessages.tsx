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

      // Récupérer toutes les leçons de ce niveau
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id')
        .eq('level_id', levelId);

      if (!lessons || lessons.length === 0) {
        console.log('No lessons found for level:', levelId);
        return [];
      }

      const lessonIds = lessons.map(l => l.id);

      // Récupérer tous les messages de groupe pour ce niveau (promotion_id NOT NULL)
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
          is_system_message,
          exercise_id,
          exercise_status,
          is_exercise_submission,
          sender_profile:profiles!sender_id (
            first_name,
            last_name,
            username
          )
        `)
        .eq('formation_id', formationId)
        .in('lesson_id', lessonIds)
        .not('promotion_id', 'is', null) // Messages de groupe uniquement
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching group messages:', error);
        return [];
      }

      console.log('Teacher group messages found:', messages?.length || 0);
      return messages || [];
    },
    enabled: !!formationId && !!levelId && !!user?.id,
    refetchInterval: 3000, // Actualisation automatique
  });
};