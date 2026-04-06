import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { LiveFormation, LiveMarketplaceProduct } from '@/live/types';

const getDisplayName = (profile?: {
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
} | null) => {
  if (!profile) {
    return null;
  }

  if (profile.first_name && profile.last_name) {
    return `${profile.first_name} ${profile.last_name}`;
  }

  return profile.username || null;
};

const normalizeNumericValue = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const normalized = Number(value.replace(',', '.').trim());
    return Number.isFinite(normalized) ? normalized : 0;
  }

  return 0;
};

export const useLiveCreatorAssets = (creatorId?: string | null) => {
  return useQuery({
    queryKey: ['live-creator-assets', creatorId],
    enabled: !!creatorId,
    queryFn: async () => {
      const [productsResponse, formationsResponse] = await Promise.all([
        supabase
          .from('products')
          .select(`
            id,
            title,
            description,
            price,
            image_url,
            seller_id,
            stock,
            is_active,
            product_media!product_media_product_id_fkey (
              media_url,
              display_order
            ),
            profiles:seller_id (
              first_name,
              last_name,
              username
            )
          `)
          .eq('seller_id', creatorId as string)
          .eq('is_active', true)
          .neq('product_type', 'formation')
          .order('title'),
        supabase
          .from('formations')
          .select(`
            id,
            title,
            description,
            price,
            image_url,
            thumbnail_url,
            author_id,
            accepted_payment_methods,
            students_count,
            is_active,
            profiles:author_id (
              first_name,
              last_name,
              username
            ),
            formation_pricing_options (
              id,
              plan_type,
              price_monthly,
              price_yearly,
              is_active
            )
          `)
          .eq('author_id', creatorId as string)
          .eq('is_active', true)
          .order('title'),
      ]);

      if (productsResponse.error) {
        throw productsResponse.error;
      }

      if (formationsResponse.error) {
        throw formationsResponse.error;
      }

      const products: LiveMarketplaceProduct[] = (productsResponse.data || []).map((product: any) => ({
        ...product,
        price: normalizeNumericValue(product.price),
        seller_name: getDisplayName(product.profiles),
      }));

      const formations: LiveFormation[] = (formationsResponse.data || []).map((formation: any) => ({
        ...formation,
        author_name: getDisplayName(formation.profiles),
        pricing_options: (formation.formation_pricing_options || []).filter((option: any) => option.is_active !== false),
      }));

      return {
        products,
        formations,
      };
    },
  });
};