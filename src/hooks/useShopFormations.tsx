import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useShopFormations = (category?: string) => {
  return useQuery({
    queryKey: ['shop-formations', category],
    queryFn: async () => {
      let query = supabase
        .from('formations')
        .select(`
          *,
          profiles:author_id (
            first_name,
            last_name,
            username
          )
        `);

      // Récupérer toutes les formations (actives et inactives)
      // Le filtrage se fera côté client dans FormationSections

      const { data, error } = await query
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
};

export const useFormationCategories = () => {
  return useQuery({
    queryKey: ['formation-categories'],
    queryFn: async () => {
      // Pour l'instant, retournons des catégories statiques
      // Si besoin, on peut créer une table formation_categories
      return [
        { id: 'programmation', name: 'programmation', label: 'Programmation' },
        { id: 'design', name: 'design', label: 'Design' },
        { id: 'marketing', name: 'marketing', label: 'Marketing' },
        { id: 'business', name: 'business', label: 'Business' }
      ];
    },
  });
};
