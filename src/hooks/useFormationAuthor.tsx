import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useFormationAuthor = (formationId: string | undefined) => {
  return useQuery({
    queryKey: ['formation-author', formationId],
    queryFn: async () => {
      if (!formationId) return null;

      // First get the author_id from formations
      const { data: formation, error: formationError } = await supabase
        .from('formations')
        .select('author_id')
        .eq('id', formationId)
        .single();

      if (formationError || !formation?.author_id) return null;

      // Then get the profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, username, avatar_url')
        .eq('id', formation.author_id)
        .single();

      if (profileError) return null;

      return profile;
    },
    enabled: !!formationId,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};