
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface StudentProgressionData {
  lessonId: string;
  lessonTitle: string;
  levelId: string;
  levelTitle: string;
  status: 'not_started' | 'in_progress' | 'awaiting_review' | 'completed';
  exerciseCompleted: boolean;
  completedAt?: string;
  canAccess: boolean;
  exercises: {
    id: string;
    title: string;
    isVisible: boolean;
    isCompleted: boolean;
  }[];
}

export const useStudentProgression = (formationId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['student-progression', user?.id, formationId],
    queryFn: async () => {
      if (!user?.id || !formationId) return [];

      console.log('Fetching student progression:', { userId: user.id, formationId });

      // Récupérer toutes les leçons de la formation avec leur progression
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select(`
          id,
          title,
          order_index,
          level_id,
          levels!inner (
            id,
            title,
            order_index,
            formation_id
          ),
          user_lesson_progress (
            status,
            exercise_completed,
            completed_at
          ),
          exercises (
            id,
            title,
            created_at
          )
        `)
        .eq('levels.formation_id', formationId)
        .eq('user_lesson_progress.user_id', user.id)
        .order('levels.order_index', { ascending: true })
        .order('order_index', { ascending: true });

      if (lessonsError) {
        console.error('Error fetching lessons progression:', lessonsError);
        throw lessonsError;
      }

      if (!lessonsData) return [];

      // Récupérer les exercices validés pour cet utilisateur
      const { data: validatedExercises, error: exercisesError } = await supabase
        .from('lesson_messages')
        .select('exercise_id')
        .eq('sender_id', user.id)
        .eq('formation_id', formationId)
        .eq('is_exercise_submission', true)
        .eq('exercise_status', 'approved')
        .not('exercise_id', 'is', null);

      if (exercisesError) {
        console.error('Error fetching validated exercises:', exercisesError);
        throw exercisesError;
      }

      const validatedExerciseIds = new Set(validatedExercises?.map(ve => ve.exercise_id) || []);

      // Transformer les données pour créer la progression
      const progression: StudentProgressionData[] = lessonsData.map((lesson, index) => {
        const progress = lesson.user_lesson_progress?.[0];
        const canAccess = index === 0 || !!progress; // Première leçon ou déjà débloquée

        // Déterminer quels exercices sont visibles
        const exercises = (lesson.exercises || []).map(exercise => ({
          id: exercise.id,
          title: exercise.title,
          isVisible: canAccess && !!progress, // Visible si la leçon est accessible et débloquée
          isCompleted: validatedExerciseIds.has(exercise.id),
        }));

        return {
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          levelId: lesson.levels.id,
          levelTitle: lesson.levels.title,
          status: progress?.status || 'not_started',
          exerciseCompleted: progress?.exercise_completed || false,
          completedAt: progress?.completed_at,
          canAccess,
          exercises,
        };
      });

      console.log('Student progression computed:', progression.length, 'lessons');
      return progression;
    },
    enabled: !!user?.id && !!formationId,
  });
};

// Hook pour obtenir les messages avec logique de promotion
export const usePromotionMessages = (lessonId?: string, formationId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['promotion-messages', lessonId, formationId, user?.id],
    queryFn: async () => {
      if (!lessonId || !formationId || !user?.id) return [];

      console.log('Fetching promotion messages:', { lessonId, formationId, userId: user.id });

      const { data, error } = await supabase
        .from('lesson_messages')
        .select(`
          *,
          sender_profile:profiles!lesson_messages_sender_id_fkey(
            first_name,
            last_name,
            avatar_url
          ),
          exercises(
            id,
            title,
            description,
            content
          )
        `)
        .eq('lesson_id', lessonId)
        .eq('formation_id', formationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching promotion messages:', error);
        throw error;
      }

      console.log('Promotion messages fetched:', data?.length || 0);
      return data || [];
    },
    enabled: !!lessonId && !!formationId && !!user?.id,
    staleTime: 30000, // Cache pendant 30 secondes
    refetchInterval: false, // Désactivé - utiliser invalidation manuelle après action
  });
};
