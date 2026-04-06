import type { Tables } from '@/integrations/supabase/types';

export type LiveMarketplaceProduct = Pick<
  Tables<'products'>,
  'id' | 'title' | 'description' | 'price' | 'image_url' | 'seller_id' | 'stock' | 'is_active'
> & {
  product_media?: Array<{
    media_url: string;
    display_order: number | null;
  }>;
  seller_name?: string | null;
};

export type LiveFormation = Pick<
  Tables<'formations'>,
  'id' | 'title' | 'description' | 'price' | 'image_url' | 'thumbnail_url' | 'author_id' | 'accepted_payment_methods' | 'students_count' | 'is_active'
> & {
  author_name?: string | null;
};

export type LiveScreenKind = 'shop_product' | 'formation_enrollment';

export interface LiveScreenBase {
  activatedAt: string;
}

export interface LiveShopProductScreen extends LiveScreenBase {
  type: 'shop_product';
  product: LiveMarketplaceProduct;
}

export interface LiveFormationEnrollmentScreen extends LiveScreenBase {
  type: 'formation_enrollment';
  formation: LiveFormation;
}

export type LiveScreen = LiveShopProductScreen | LiveFormationEnrollmentScreen;

export const getLiveProductImage = (product: Pick<LiveMarketplaceProduct, 'image_url' | 'product_media'>) => {
  return product.image_url || product.product_media?.[0]?.media_url || null;
};

export const getLiveFormationImage = (formation: Pick<LiveFormation, 'image_url' | 'thumbnail_url'>) => {
  return formation.image_url || formation.thumbnail_url || null;
};

export const isLiveScreen = (value: unknown): value is LiveScreen => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return candidate.type === 'shop_product' || candidate.type === 'formation_enrollment';
};