/**
 * Hook pour récupérer tous les exercices d'un niveau (toutes les leçons)
 * Spécialement conçu pour le chat de groupe
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useLevelExercises = (levelId: string | undefined) => {
  return useQuery({
    queryKey: ['level-exercises', levelId],
    queryFn: async () => {
      if (!levelId) return [];

      console.log('🔍 Fetching exercises for level:', levelId);

      // 1. Récupérer toutes les leçons du niveau
      const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('id')
        .eq('level_id', levelId)
        .order('order_index', { ascending: true });

      if (lessonsError) {
        console.error('Error fetching lessons:', lessonsError);
        return [];
      }

      const lessonIds = lessons?.map(l => l.id) || [];
      
      if (lessonIds.length === 0) {
        console.log('No lessons found for level:', levelId);
        return [];
      }

      // 2. Récupérer tous les exercices de ces leçons
      const { data: exercises, error: exercisesError } = await supabase
        .from('exercises')
        .select(`
          id,
          title,
          description,
          content,
          type,
          lesson_id,
          created_at,
          lessons!lesson_id (
            id,
            title
          )
        `)
        .in('lesson_id', lessonIds)
        .order('created_at', { ascending: true });

      if (exercisesError) {
        console.error('Error fetching level exercises:', exercisesError);
        return [];
      }

      console.log('✅ Level exercises found:', exercises?.length || 0);
      return exercises || [];
    },
    enabled: !!levelId,
    refetchInterval: false,
  });
};