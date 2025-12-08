/**
 * useSchoolFilters - Hook pour récupérer les filtres dynamiques des écoles
 * Récupère les pays et niveaux (cycles) disponibles depuis la base de données
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FilterOption {
  code: string;
  label: string;
}

export const useSchoolFilters = () => {
  // Récupérer les pays distincts
  const countriesQuery = useQuery({
    queryKey: ['school-countries'],
    queryFn: async (): Promise<FilterOption[]> => {
      const { data, error } = await supabase
        .from('schools')
        .select('country')
        .not('country', 'is', null)
        .order('country');

      if (error) throw error;

      // Extraire les pays uniques
      const uniqueCountries = [...new Set(data?.map(s => s.country).filter(Boolean))];
      
      return [
        { code: '', label: 'Tous les pays' },
        ...uniqueCountries.map(country => ({
          code: country as string,
          label: country as string,
        })),
      ];
    },
  });

  // Récupérer les niveaux (cycles) distincts
  const levelsQuery = useQuery({
    queryKey: ['school-levels'],
    queryFn: async (): Promise<FilterOption[]> => {
      const { data, error } = await supabase
        .from('classes')
        .select('cycle')
        .not('cycle', 'is', null)
        .order('cycle');

      if (error) throw error;

      // Extraire les cycles uniques
      const uniqueCycles = [...new Set(data?.map(c => c.cycle).filter(Boolean))];
      
      // Mapping des labels français
      const cycleLabels: Record<string, string> = {
        maternel: 'Maternelle',
        primaire: 'Primaire',
        college: 'Collège',
        lycee: 'Lycée',
        universite: 'Université',
        formation: 'Formation Pro',
      };

      return [
        { code: '', label: 'Tous les niveaux' },
        ...uniqueCycles.map(cycle => ({
          code: cycle as string,
          label: cycleLabels[cycle as string] || (cycle as string),
        })),
      ];
    },
  });

  return {
    countries: countriesQuery.data || [{ code: '', label: 'Tous les pays' }],
    levels: levelsQuery.data || [{ code: '', label: 'Tous les niveaux' }],
    isLoading: countriesQuery.isLoading || levelsQuery.isLoading,
  };
};
