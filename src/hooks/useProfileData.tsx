
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useUserStats = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['user-stats', userId],
    queryFn: async () => {
      if (!userId) return null;

      // Calculer les formations complétées
      const { data: completedFormations } = await supabase
        .from('enrollment_requests')
        .select(`
          formations (
            id,
            levels (
              lessons (
                id,
                user_lesson_progress (
                  status
                )
              )
            )
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'approved');

      let totalFormations = 0;
      let completedFormations_count = 0;
      let totalLessons = 0;
      let completedLessons = 0;

      completedFormations?.forEach(enrollment => {
        const formation = enrollment.formations;
        if (formation) {
          totalFormations++;
          let formationCompleted = true;
          
          formation.levels?.forEach(level => {
            level.lessons?.forEach(lesson => {
              totalLessons++;
              const progress = lesson.user_lesson_progress?.[0];
              if (progress?.status === 'completed') {
                completedLessons++;
              } else {
                formationCompleted = false;
              }
            });
          });

          if (formationCompleted && formation.levels?.length > 0) {
            completedFormations_count++;
          }
        }
      });

      // Calculer les heures d'apprentissage (estimation basée sur les leçons complétées)
      const estimatedHours = Math.round(completedLessons * 0.5); // 30 min par leçon en moyenne

      // Calculer les exercices validés à partir de lesson_messages
      const { data: validatedExercises } = await supabase
        .from('lesson_messages')
        .select('id')
        .eq('sender_id', userId)
        .eq('is_exercise_submission', true)
        .eq('exercise_status', 'approved');

      const validatedExercisesCount = validatedExercises?.length || 0;

      return {
        completedFormations: completedFormations_count,
        learningHours: estimatedHours,
        validatedExercises: validatedExercisesCount,
        badges: 0 // À implémenter plus tard
      };
    },
    enabled: !!userId,
  });
};
