
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useUserRole = (formationId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-role', user?.id, formationId],
    queryFn: async () => {
      if (!user?.id || !formationId) return null;

      console.log('Checking user role for:', user.id, 'in formation:', formationId);

      // Vérifier si l'utilisateur est professeur de cette formation spécifique
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select(`
          id,
          user_id,
          formation_id
        `)
        .eq('user_id', user.id)
        .eq('formation_id', formationId)
        .single();

      if (!teacherError && teacherData) {
        console.log('User is teacher in this formation:', teacherData);
        return {
          role: 'teacher',
          teacherId: teacherData.id,
          formationId: teacherData.formation_id
        };
      }

      // Vérifier si l'utilisateur est élève de cette formation
      const { data: studentData, error: studentError } = await supabase
        .from('enrollment_requests')
        .select('id, user_id, formation_id')
        .eq('user_id', user.id)
        .eq('formation_id', formationId)
        .eq('status', 'approved')
        .single();

      if (!studentError && studentData) {
        console.log('User is student in this formation');
        return {
          role: 'student',
          formationId: studentData.formation_id
        };
      }

      console.log('User has no role in this formation');
      return null;
    },
    enabled: !!user?.id && !!formationId,
  });
};
