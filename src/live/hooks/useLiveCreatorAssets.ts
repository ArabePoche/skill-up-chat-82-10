import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { LiveFormation, LiveMarketplaceProduct, LiveTeachingLesson } from '@/live/types';

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
      const [productsResponse, formationsResponse, lessonsResponse] = await Promise.all([
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
        supabase
          .from('lessons')
          .select(`
            id,
            title,
            description,
            duration,
            language,
            order_index,
            video_url,
            level_id,
            levels!inner (
              id,
              title,
              formations!inner (
                id,
                title,
                image_url,
                thumbnail_url,
                author_id
              )
            )
          `)
          .eq('levels.formations.author_id', creatorId as string)
          .order('title'),
      ]);

      if (productsResponse.error) {
        throw productsResponse.error;
      }

      if (formationsResponse.error) {
        throw formationsResponse.error;
      }

      if (lessonsResponse.error) {
        throw lessonsResponse.error;
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

      const lessons: LiveTeachingLesson[] = (lessonsResponse.data || []).flatMap((lesson: any) => {
        const formation = lesson.levels?.formations;

        if (!formation?.id || !formation?.title) {
          return [];
        }

        return [{
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          duration: lesson.duration,
          language: lesson.language,
          order_index: lesson.order_index,
          video_url: lesson.video_url,
          formation_id: formation.id,
          formation_title: formation.title,
          formation_image_url: formation.image_url || formation.thumbnail_url || null,
          level_id: lesson.levels?.id || null,
          level_title: lesson.levels?.title || null,
        }];
      });

      return {
        products,
        formations,
        lessons,
      };
    },
  });
};