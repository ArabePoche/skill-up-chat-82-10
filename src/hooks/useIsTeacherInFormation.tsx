
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useIsTeacherInFormation = (formationId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['is-teacher-in-formation', user?.id, formationId],
    queryFn: async () => {
      if (!user?.id || !formationId) return false;

      console.log('Checking if user is teacher in formation:', { userId: user.id, formationId });

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_teacher')
        .eq('id', user.id)
        .single();

      if (!profile?.is_teacher) {
        console.log('User is not a teacher globally');
        return false;
      }

      // Vérifier si l'utilisateur est professeur dans cette formation spécifique via teacher_formations
      const { data: teacher } = await supabase
        .from('teachers')
        .select(`
          id,
          teacher_formations!inner (
            formation_id
          )
        `)
        .eq('user_id', user.id)
        .eq('teacher_formations.formation_id', formationId)
        .single();

      const isTeacher = !!teacher;
      console.log('User is teacher in this formation:', isTeacher);
      return isTeacher;
    },
    enabled: !!user?.id && !!formationId,
  });
};
