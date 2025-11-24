// Hook pour gérer les matières
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Subject {
  id: string;
  name: string;
  code: string | null;
  created_at: string;
}

// Récupérer toutes les matières
export const useSubjects = () => {
  return useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Error fetching subjects:', error);
        throw error;
      }
      
      return data as Subject[];
    },
  });
};
