/**
 * Hook pour récupérer les centres d'intérêt de l'utilisateur depuis la table profiles
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useUserInterests = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-interests', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: profile } = await supabase
        .from('profiles')
        .select('interests')
        .eq('id', user.id)
        .single();

      return profile?.interests || [];
    },
    enabled: !!user,
  });
};
