
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useTeacherFormations = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['teacher-formations', userId],
    queryFn: async () => {
      if (!userId) {
        console.log('❌ No userId provided for teacher formations');
        return [];
      }

      
      
      // D'abord vérifier si l'utilisateur est professeur dans son profil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_teacher')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('❌ Error fetching user profile:', profileError);
        return [];
      }

      

      

      // Récupérer le teacher ID
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (teacherError) {
        console.error('❌ Error fetching teacher record:', teacherError);
        return [];
      }

      if (!teacherData) {
        console.log('⚠️ No teacher record found for user');
        return [];
      }

      

      // Récupérer les formations assignées avec toutes les données nécessaires
      // On utilise l'ID du teacher, pas l'userId directement
      const { data: assignedFormations, error: formationsError } = await supabase
        .from('teacher_formations')
        .select(`
          assigned_at,
          formation_id,
          formations!inner (
            id,
            title,
            description,
            image_url,
            rating,
            students_count,
            duration_hours,
            is_active,
            created_at,
            author_id,
            price,
            duration,
            badge
          )
        `)
        .eq('teacher_id', teacherData.id);

      if (formationsError) {
        console.error('❌ Error fetching teacher formations:', formationsError);
        return [];
      }

      if (!assignedFormations || assignedFormations.length === 0) {
        console.log('📭 No formations found for teacher');
        return [];
      }

      

      // Mapper les formations avec les informations nécessaires
      const formattedFormations = assignedFormations
        .filter(tf => tf.formations) // Filtrer les formations qui existent encore
        .map(tf => ({
          ...tf.formations,
          isTeacher: true,
          assigned_at: tf.assigned_at,
          students_count: tf.formations.students_count || 0
        }));

      
      return formattedFormations;
    },
    enabled: !!userId,
    retry: (failureCount, error) => {
      
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
