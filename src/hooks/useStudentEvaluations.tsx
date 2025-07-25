import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useStudentEvaluations = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['student-evaluations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: evaluations, error } = await supabase
        .from('interview_evaluations')
        .select(`
          *,
          teachers (
            profiles (
              first_name,
              last_name,
              username
            )
          )
        `)
        .eq('student_id', user.id)
        .is('responded_at', null)
        .gt('expires_at', new Date().toISOString());

      if (error) {
        console.error('Error fetching student evaluations:', error);
        throw error; // Lancer l'erreur au lieu de retourner un tableau vide
      }

      return evaluations || [];
    },
    enabled: !!user?.id,
    refetchInterval: 10000,
  });
};
