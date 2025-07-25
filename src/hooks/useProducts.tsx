
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
          profiles:instructor_id (
            first_name,
            last_name,
            username
          ),
          categories (
            name,
            label
          )
        `)
        .eq('is_active', true)
        .neq('product_type', 'formation'); // Exclure les formations

      if (category && category !== 'all') {
        query = query.eq('categories.name', category);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
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
