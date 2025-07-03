
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useTeacherLessonData = (lessonId: string) => {
  return useQuery({
    queryKey: ['teacher-lesson-data', lessonId],
    queryFn: async () => {
      if (!lessonId) return { lesson: null, exercises: [] };

      console.log('Fetching lesson and exercises for teacher view:', lessonId);

      // Récupérer les informations de la leçon
      const { data: lesson, error: lessonError } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .single();

      if (lessonError) {
        console.error('Error fetching lesson:', lessonError);
        return { lesson: null, exercises: [] };
      }

      // Récupérer les exercices de la leçon
      const { data: exercises, error: exercisesError } = await supabase
        .from('exercises')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: true });

      if (exercisesError) {
        console.error('Error fetching exercises:', exercisesError);
        return { lesson, exercises: [] };
      }

      console.log('Fetched lesson and exercises:', { lesson, exercises });
      return { lesson, exercises: exercises || [] };
    },
    enabled: !!lessonId,
  });
};
