
/**
 * Hook spécifique pour déterminer le bon lessonId dans le contexte du chat de groupe
 * Basé sur le niveau courant et la progression réelle de l'utilisateur
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Détermine la leçon active pour le chat de groupe basé sur la progression réelle
 */
const getActiveGroupLessonId = async (
  userId: string, 
  levelId: string, 
  formationId: string
): Promise<string> => {
  console.log('🎯 getActiveGroupLessonId: Determining active lesson for group chat', {
    userId, levelId, formationId
  });

  // 1. Récupérer toutes les leçons du niveau avec leurs progressions
  const { data: lessonsWithProgress, error: lessonsError } = await supabase
    .from('lessons')
    .select(`
      id,
      title,
      order_index,
      user_lesson_progress!left (
        status,
        exercise_completed,
        completed_at
      )
    `)
    .eq('level_id', levelId)
    .eq('user_lesson_progress.user_id', userId)
    .order('order_index', { ascending: true });

  if (lessonsError || !lessonsWithProgress || lessonsWithProgress.length === 0) {
    console.error('getActiveGroupLessonId: Error fetching lessons with progress:', lessonsError);
    throw new Error('Could not find lessons for this level');
  }

  console.log('📚 getActiveGroupLessonId: Lessons with progress:', 
    lessonsWithProgress.map(l => ({
      id: l.id,
      title: l.title,
      order: l.order_index,
      progress: l.user_lesson_progress?.[0]?.status || 'no_progress'
    }))
  );

  // 2. Logique de sélection de la leçon active
  
  // Chercher la leçon en cours (in_progress)
  let activeLesson = lessonsWithProgress.find(lesson => 
    lesson.user_lesson_progress?.[0]?.status === 'in_progress'
  );

  if (activeLesson) {
    console.log('✅ getActiveGroupLessonId: Found in_progress lesson:', activeLesson.title);
    return activeLesson.id;
  }

  // Chercher la première leçon not_started après une leçon completed
  const lessonsWithProgressStatus = lessonsWithProgress.map(lesson => ({
    ...lesson,
    progressStatus: lesson.user_lesson_progress?.[0]?.status || null
  }));

  for (let i = 0; i < lessonsWithProgressStatus.length; i++) {
    const current = lessonsWithProgressStatus[i];
    
    // Si c'est une leçon not_started ou awaiting_review, c'est notre leçon active
    if (current.progressStatus === 'not_started' || current.progressStatus === 'awaiting_review') {
      console.log('✅ getActiveGroupLessonId: Found not_started/awaiting_review lesson:', current.title);
      return current.id;
    }
  }

  // Chercher la dernière leçon avec une progression (completed)
  const lastCompletedLesson = lessonsWithProgressStatus
    .filter(lesson => lesson.progressStatus === 'completed')
    .sort((a, b) => b.order_index - a.order_index)[0];

  if (lastCompletedLesson) {
    console.log('✅ getActiveGroupLessonId: Using last completed lesson:', lastCompletedLesson.title);
    return lastCompletedLesson.id;
  }

  // Fallback: première leçon avec progression ou première leçon du niveau
  const lessonWithAnyProgress = lessonsWithProgressStatus.find(lesson => lesson.progressStatus);
  
  if (lessonWithAnyProgress) {
    console.log('✅ getActiveGroupLessonId: Using first lesson with any progress:', lessonWithAnyProgress.title);
    return lessonWithAnyProgress.id;
  }

  // Derniers recours: première leçon du niveau
  console.log('⚠️ getActiveGroupLessonId: No progress found, using first lesson');
  return lessonsWithProgress[0].id;
};

export const useGroupLessonId = (levelId: string, formationId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['group-lesson-id', levelId, formationId, user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('Utilisateur non authentifié');
      }

      console.log('🔍 useGroupLessonId: Determining lesson ID for group chat', { 
        levelId, 
        formationId, 
        userId: user.id 
      });

      try {
        // Utiliser notre nouvelle logique pour déterminer la leçon active
        const selectedLessonId = await getActiveGroupLessonId(user.id, levelId, formationId);
        
        console.log('🎯 useGroupLessonId: Active lesson determined:', selectedLessonId);
        return selectedLessonId;

      } catch (error) {
        console.error('useGroupLessonId: Error determining active lesson, using fallback:', error);
        
        // Fallback : récupérer la première leçon du niveau
        const { data: fallbackLesson, error: fallbackError } = await supabase
          .from('lessons')
          .select('id')
          .eq('level_id', levelId)
          .order('order_index', { ascending: true })
          .limit(1)
          .single();

        if (fallbackError || !fallbackLesson) {
          console.error('useGroupLessonId: Error in fallback lesson fetch:', fallbackError);
          throw new Error('Could not determine any lesson for this level');
        }

        console.log('🔄 useGroupLessonId: Using fallback lesson:', fallbackLesson.id);
        return fallbackLesson.id;
      }
    },
    enabled: !!user?.id && !!levelId && !!formationId,
    staleTime: 30000, // Cache pendant 30 secondes
  });
};