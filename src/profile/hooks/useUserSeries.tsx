/**
 * Hook pour récupérer les séries créées par l'utilisateur
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useUserSeries = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['user-series', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('series')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    },
    enabled: !!userId,
  });
};
