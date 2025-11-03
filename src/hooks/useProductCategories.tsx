/**
 * Hook pour récupérer les catégories de produits utilisées dans la base de données
 * Récupère uniquement les catégories qui ont au moins un produit actif
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useProductCategories = () => {
  return useQuery({
    queryKey: ['product-categories-used'],
    queryFn: async () => {
      // Récupérer toutes les catégories distinctes des produits actifs
      const { data, error } = await supabase
        .from('products')
        .select(`
          categories (
            id,
            name,
            label
          )
        `)
        .eq('is_active', true)
        .neq('product_type', 'formation');

      if (error) throw error;

      // Extraire les catégories uniques (sans doublons)
      const categoriesMap = new Map();
      
      data?.forEach(product => {
        if (product.categories) {
          const cat = product.categories as { id: string; name: string; label: string };
          if (!categoriesMap.has(cat.id)) {
            categoriesMap.set(cat.id, cat);
          }
        }
      });

      // Convertir en tableau et ajouter "Tout" au début
      const uniqueCategories = Array.from(categoriesMap.values());
      
      return [
        { id: 'all', name: 'all', label: 'Tout' },
        ...uniqueCategories
      ];
    },
  });
};
