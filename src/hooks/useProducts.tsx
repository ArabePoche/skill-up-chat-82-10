
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useProducts = (category?: string) => {
  return useQuery({
    queryKey: ['products', category],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          *,
          categories (
            name,
            label
          ),
          profiles:seller_id (
            id,
            first_name,
            last_name,
            username,
            avatar_url
          ),
          product_media!product_media_product_id_fkey (
            media_url,
            display_order
          )
        `)
        .eq('is_active', true)
        .neq('product_type', 'formation') // Exclure les formations
        .order('display_order', { foreignTable: 'product_media', ascending: true });

      if (category && category !== 'all') {
        query = query.eq('categories.name', category);
      }

      // Utiliser un ordre aléatoire pour éviter un ordre fixe
      const { data, error } = await query;

      if (error) throw error;
      
      // Ajouter l'image principale (première image de product_media) à chaque produit
      const productsWithImages = data?.map(product => ({
        ...product,
        image_url: product.image_url || product.product_media?.[0]?.media_url || null
      })) || [];
      
      // Mélanger aléatoirement les produits pour un affichage varié
      return productsWithImages.sort(() => Math.random() - 0.5);
    },
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    },
  });
};
