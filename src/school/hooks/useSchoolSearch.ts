import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook pour rechercher des écoles
 * Permet de chercher par nom, ville, etc.
 */
export const useSchoolSearch = (searchQuery: string) => {
  return useQuery({
    queryKey: ['school-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.trim().length < 2) return [];

      const { data, error } = await supabase
        .from('schools')
        .select('id, name, description, school_type')
        .ilike('name', `%${searchQuery}%`)
        .limit(10);

      if (error) {
        console.error('Error searching schools:', error);
        throw error;
      }

      return data || [];
    },
    enabled: searchQuery.trim().length >= 2,
  });
};
