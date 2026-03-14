/**
 * Hook pour rechercher dans les CV publics
 * Utilise la fonction RPC search_public_cvs côté Supabase
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CvSearchFilters {
  query: string;
  location: string;
  experience: string;
  education: string;
}

export interface PublicCvResult {
  id: string;
  user_id: string;
  title: string;
  personal_info: any;
  skills: any[];
  experiences: any[];
  education: any[];
  languages: any[];
  updated_at: string;
  profile?: {
    first_name: string;
    last_name: string;
    avatar_url: string;
  };
}

export const useSearchCvs = (filters: CvSearchFilters, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['search-cvs', filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_public_cvs', {
        search_query: filters.query || null,
        search_location: filters.location || null,
        search_experience: filters.experience || null,
        search_education: filters.education || null,
      });

      if (error) throw error;

      // Charger les profils
      const userIds = (data || []).map((cv: any) => cv.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .in('id', userIds);

      return (data || []).map((cv: any) => ({
        ...cv,
        profile: profiles?.find((p) => p.id === cv.user_id),
      })) as PublicCvResult[];
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
};
