import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook pour récupérer les matières d'une classe
 */
export const useClassSubjects = (classId?: string) => {
  return useQuery({
    queryKey: ['class-subjects', classId],
    queryFn: async () => {
      if (!classId) return [];

      const { data, error } = await supabase
        .from('class_subjects')
        .select(`
          *,
          subjects (
            id,
            name,
            code
          )
        `)
        .eq('class_id', classId)
        .order('subjects(name)');

      if (error) throw error;
      return data || [];
    },
    enabled: !!classId,
  });
};
