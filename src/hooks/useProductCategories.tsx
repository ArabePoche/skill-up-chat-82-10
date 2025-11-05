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
      // Récupérer toutes les catégories qui ont au moins un produit actif
      const { data: categories, error } = await supabase
        .from('categories')
        .select('id, name, label');

      if (error) throw error;

      // Pour chaque catégorie, vérifier s'il y a des produits actifs
      const categoriesWithProducts = await Promise.all(
        (categories || []).map(async (category) => {
          const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', category.id)
            .eq('is_active', true)
            .neq('product_type', 'formation');
          
          return count && count > 0 ? category : null;
        })
      );

      // Filtrer les catégories sans produits
      return categoriesWithProducts.filter(cat => cat !== null);
    },
  });
};
