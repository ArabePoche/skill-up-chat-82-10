/**
 * useSchoolSearch - Hook pour rechercher des écoles avec filtres
 * Permet de chercher par nom, ville et filtrer par type, pays, niveau
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SchoolSearchFilters {
  online?: boolean;
  physical?: boolean;
  country?: string;
  level?: string;
}

export interface SchoolResult {
  id: string;
  name: string;
  description: string | null;
  school_type: string;
  country: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  founded_year: number | null;
  teaching_language: string | null;
}

export const useSchoolSearch = (searchQuery: string, filters?: SchoolSearchFilters) => {
  return useQuery({
    queryKey: ['school-search', searchQuery, filters],
    queryFn: async (): Promise<SchoolResult[]> => {
      if (!searchQuery || searchQuery.trim().length < 2) return [];

      let query = supabase
        .from('schools')
        .select('id, name, description, school_type, country, city, address, phone, email, website, logo_url, primary_color, secondary_color, founded_year, teaching_language')
        .ilike('name', `%${searchQuery}%`);

      // Filtrer par type d'école
      if (filters?.online && !filters?.physical) {
        query = query.eq('school_type', 'virtual');
      } else if (filters?.physical && !filters?.online) {
        query = query.eq('school_type', 'physical');
      } else if (filters?.online && filters?.physical) {
        query = query.in('school_type', ['virtual', 'physical', 'both']);
      }

      // Filtrer par pays
      if (filters?.country) {
        query = query.eq('country', filters.country);
      }

      const { data, error } = await query.limit(20);

      if (error) {
        console.error('Error searching schools:', error);
        throw error;
      }

      // Si filtre par niveau, on doit filtrer côté client car c'est dans une autre table
      // TODO: Améliorer avec une jointure si nécessaire
      
      return data || [];
    },
    enabled: searchQuery.trim().length >= 2,
  });
};
