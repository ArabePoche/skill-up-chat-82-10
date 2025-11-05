import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCachedLessonMessages } from '@/message-cache';

// Deprecated: Use useCachedLessonMessages instead
export const useStudentMessages = useCachedLessonMessages;
export const usePromotionMessages = useCachedLessonMessages;

export const useLessonExercises = (lessonId: string | undefined) => {
  return useQuery({
    queryKey: ['lesson-exercises', lessonId],
    queryFn: async () => {
      if (!lessonId) return [];

      console.log('Fetching exercises for lesson:', lessonId);

      const { data: exercises, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching lesson exercises:', error);
        return [];
      }

      console.log('Lesson exercises found:', exercises?.length || 0);
      return exercises || [];
    },
    enabled: !!lessonId,
    refetchInterval: false,
  });
};