
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook pour gérer la progression par groupes/promotions
 * Suit la logique : leçons et exercices apparaissent progressivement dans le chat
 */
export const useGroupProgression = (formationId: string, promotionId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['group-progression', user?.id, formationId, promotionId],
    queryFn: async () => {
      if (!user?.id || !formationId) return [];

      console.log('Fetching group progression:', { userId: user.id, formationId, promotionId });

      // Récupérer la progression de l'utilisateur avec les messages système de présentation des leçons/exercices
      const { data: progressionData, error } = await supabase
        .from('lesson_messages')
        .select(`
          lesson_id,
          exercise_id,
          content,
          created_at,
          lessons!inner(
            id,
            title,
            order_index,
            level_id,
            levels!inner(
              id,
              title,
              order_index,
              formation_id
            )
          ),
          exercises(
            id,
            title,
            type
          )
        `)
        .eq('formation_id', formationId)
        .eq('receiver_id', user.id)
        .eq('is_system_message', true)
        .not('exercise_id', 'is', null)
        .eq('lessons.levels.formation_id', formationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching group progression:', error);
        throw error;
      }

      // Récupérer aussi les exercices validés pour déterminer le statut
      const { data: validatedExercises, error: validatedError } = await supabase
        .from('lesson_messages')
        .select('exercise_id, lesson_id')
        .eq('sender_id', user.id)
        .eq('formation_id', formationId)
        .eq('is_exercise_submission', true)
        .eq('exercise_status', 'approved')
        .not('exercise_id', 'is', null);

      if (validatedError) {
        console.error('Error fetching validated exercises:', validatedError);
        throw validatedError;
      }

      const validatedExerciseIds = new Set(validatedExercises?.map(ve => ve.exercise_id) || []);

      // Traitement de la progression
      const progression = progressionData?.map(item => ({
        lessonId: item.lesson_id,
        lessonTitle: item.lessons?.title || '',
        levelId: item.lessons?.levels?.id || '',
        levelTitle: item.lessons?.levels?.title || '',
        levelOrder: item.lessons?.levels?.order_index || 0,
        lessonOrder: item.lessons?.order_index || 0,
        exerciseId: item.exercise_id,
        exerciseTitle: item.exercises?.title || '',
        exerciseType: item.exercises?.type || 'practical',
        isCompleted: validatedExerciseIds.has(item.exercise_id),
        presentedAt: item.created_at
      })) || [];

      console.log('Group progression computed:', progression.length, 'items');
      return progression;
    },
    enabled: !!user?.id && !!formationId,
  });
};

/**
 * Hook pour obtenir le statut de progression actuel de l'utilisateur
 */
export const useCurrentProgressionStatus = (formationId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['current-progression-status', user?.id, formationId],
    queryFn: async () => {
      if (!user?.id || !formationId) return null;

      // Récupérer la progression maximale de l'utilisateur
      const { data: maxProgress, error } = await supabase
        .from('user_lesson_progress')
        .select(`
          lesson_id,
          status,
          exercise_completed,
          lessons!inner(
            id,
            title,
            order_index,
            level_id,
            levels!inner(
              order_index,
              formation_id
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('lessons.levels.formation_id', formationId)
        .order('lessons.levels.order_index', { ascending: false })
        .order('lessons.order_index', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching current progression status:', error);
        return null;
      }

      if (!maxProgress || maxProgress.length === 0) {
        return null;
      }

      const current = maxProgress[0];
      return {
        lessonId: current.lesson_id,
        levelOrder: current.lessons?.levels?.order_index || 0,
        lessonOrder: current.lessons?.order_index || 0,
        status: current.status,
        exerciseCompleted: current.exercise_completed
      };
    },
    enabled: !!user?.id && !!formationId,
  });
};
