import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLessonMessages } from './useLessonMessages';

// Deprecated: Use useLessonMessages instead
export const useStudentMessages = useLessonMessages;
export const usePromotionMessages = useLessonMessages;

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