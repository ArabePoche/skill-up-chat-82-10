
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useLessonUnlocking = (formationId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['lesson-unlocking', formationId, user?.id],
    queryFn: async () => {
      if (!user?.id || !formationId) return [];

      console.log('Fetching lesson unlocking status for formation:', formationId);

      // Récupérer le progrès de l'utilisateur pour cette formation
      const { data: userProgress, error } = await supabase
        .from('user_lesson_progress')
        .select(`
          lesson_id,
          status,
          exercise_completed,
          completed_at,
          lessons!inner(
            id,
            title,
            level_id,
            order_index,
            levels!inner(
              formation_id
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('lessons.levels.formation_id', formationId);

      if (error) {
        console.error('Error fetching user lesson progress:', error);
        return [];
      }

      console.log('User lesson progress:', userProgress);
      return userProgress || [];
    },
    enabled: !!user?.id && !!formationId,
  });
};

export const useIsLessonUnlocked = (lessonId: string | number, formationId: string) => {
  const { data: unlockedLessons = [] } = useLessonUnlocking(formationId);
  
  // Une leçon est déverrouillée si elle existe dans user_lesson_progress (peu importe le statut)
  return unlockedLessons.some(progress => 
    progress.lesson_id === lessonId.toString()
  );
};
