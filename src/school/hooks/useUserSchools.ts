import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook pour récupérer toutes les écoles d'un utilisateur
 * Retourne les écoles dont il est créateur ou membre
 */
export const useUserSchools = (userId?: string) => {
  return useQuery({
    queryKey: ['user-schools', userId],
    queryFn: async () => {
      if (!userId) return [];

      // Récupérer les écoles créées par l'utilisateur
      const { data: ownedSchools, error: ownedError } = await supabase
        .from('schools')
        .select('id, name, description, school_type')
        .eq('owner_id', userId);

      if (ownedError) {
        console.error('Error fetching owned schools:', ownedError);
        throw ownedError;
      }

      // Récupérer les écoles où l'utilisateur est membre
      const { data: memberSchools, error: memberError } = await supabase
        .from('school_members')
        .select(`
          role,
          schools:school_id (
            id,
            name,
            description,
            school_type
          )
        `)
        .eq('user_id', userId);

      if (memberError) {
        console.error('Error fetching member schools:', memberError);
        throw memberError;
      }

      // Combiner les résultats
      const owned = (ownedSchools || []).map(school => ({
        ...school,
        role: 'owner' as const
      }));

      const member = (memberSchools || [])
        .filter(m => m.schools)
        .map(m => ({
          ...(m.schools as any),
          role: m.role
        }));

      return [...owned, ...member];
    },
    enabled: !!userId,
  });
};
