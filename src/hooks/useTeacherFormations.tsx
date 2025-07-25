
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useTeacherFormations = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['teacher-formations', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('teachers')
        .select(`
          id,
          teacher_formations!inner (
            assigned_at,
            formations (
              *,
              profiles:author_id (
                first_name,
                last_name,
                username
              )
            )
          )
        `)
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching teacher formations:', error);
        return [];
      }

      if (!data || !Array.isArray(data)) {
        return [];
      }

      return data.flatMap(teacher => 
        teacher.teacher_formations?.map(tf => ({
          ...tf.formations,
          isTeacher: true,
          assigned_at: tf.assigned_at,
          students_count: 0 // À calculer dynamiquement plus tard
        })) || []
      );
    },
    enabled: !!userId,
  });
};
