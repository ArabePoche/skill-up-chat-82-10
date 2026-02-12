/**
 * Hook pour gérer le déblocage des leçons selon leur unlock_mode
 * Modes : teacher_validation, next_button, quiz, free
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useLessonUnlocking = (formationId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['lesson-unlocking', formationId, user?.id],
    queryFn: async () => {
      if (!user?.id || !formationId) return [];

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
            unlock_mode,
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

      return userProgress || [];
    },
    enabled: !!user?.id && !!formationId,
  });
};

/**
 * Vérifie si une leçon est déverrouillée pour l'utilisateur
 * Prend en compte le unlock_mode de la leçon
 */
export const useIsLessonUnlocked = (lessonId: string | number, formationId: string) => {
  const { user } = useAuth();
  const { data: unlockedLessons = [] } = useLessonUnlocking(formationId);

  return useQuery({
    queryKey: ['lesson-unlocked', lessonId, formationId, user?.id],
    queryFn: async () => {
      if (!user?.id || !lessonId || !formationId) return false;

      // Récupérer la leçon et son mode de déblocage
      const { data: lesson } = await supabase
        .from('lessons')
        .select('id, unlock_mode, order_index, level_id')
        .eq('id', lessonId.toString())
        .single();

      if (!lesson) return false;

      const unlockMode = lesson.unlock_mode || 'teacher_validation';

      // Mode libre : toujours accessible
      if (unlockMode === 'free') return true;

      // Vérifier si la leçon a une progression existante
      const hasProgress = unlockedLessons.some(
        (p: any) => p.lesson_id === lessonId.toString()
      );
      if (hasProgress) return true;

      // Si c'est la première leçon du niveau, elle est toujours accessible
      const { data: levelLessons } = await supabase
        .from('lessons')
        .select('id, order_index')
        .eq('level_id', lesson.level_id)
        .order('order_index', { ascending: true })
        .limit(1);

      if (levelLessons?.[0]?.id === lessonId.toString()) return true;

      // Pour les autres modes, vérifier la leçon précédente
      const { data: allLevelLessons } = await supabase
        .from('lessons')
        .select('id, order_index, unlock_mode')
        .eq('level_id', lesson.level_id)
        .order('order_index', { ascending: true });

      const currentIndex = allLevelLessons?.findIndex(l => l.id === lessonId.toString()) ?? -1;
      if (currentIndex <= 0) return true;

      const previousLesson = allLevelLessons![currentIndex - 1];
      const prevProgress = unlockedLessons.find(
        (p: any) => p.lesson_id === previousLesson.id
      );

      if (!prevProgress) return false;

      const prevMode = previousLesson.unlock_mode || 'teacher_validation';

      switch (prevMode) {
        case 'free':
        case 'next_button':
          // Débloqué si la leçon précédente a été visitée (status exists)
          return true;

        case 'teacher_validation':
          // Débloqué si exercice validé par le prof
          return (prevProgress as any)?.exercise_completed === true ||
                 (prevProgress as any)?.status === 'completed';

        case 'quiz': {
          // Débloqué si quiz réussi
          const { data: quiz } = await supabase
            .from('quizzes')
            .select('id')
            .eq('lesson_id', previousLesson.id)
            .single();

          if (!quiz) return true; // Pas de quiz configuré = accès libre

          const { data: attempts } = await supabase
            .from('quiz_attempts')
            .select('passed')
            .eq('quiz_id', quiz.id)
            .eq('user_id', user!.id)
            .eq('passed', true)
            .limit(1);

          return (attempts?.length ?? 0) > 0;
        }

        default:
          return false;
      }
    },
    enabled: !!user?.id && !!lessonId && !!formationId,
  }).data ?? false;
};
