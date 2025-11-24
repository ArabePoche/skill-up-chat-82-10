// Hook pour gérer les professeurs d'une école
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

// Récupérer tous les professeurs d'une école depuis la table school_teachers
export const useTeachers = (schoolId?: string) => {
  return useQuery({
    queryKey: ['school-teachers', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      
      const { data, error } = await supabase
        .from('school_teachers')
        .select('id, first_name, last_name, email')
        .eq('school_id', schoolId)
        .order('last_name', { ascending: true });
      
      if (error) {
        console.error('Error fetching teachers:', error);
        throw error;
      }
      
      return data as Teacher[];
    },
    enabled: !!schoolId,
  });
};
