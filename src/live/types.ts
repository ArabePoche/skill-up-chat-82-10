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

export type LiveFormationPricingOption = Pick<
  Tables<'formation_pricing_options'>,
  'id' | 'plan_type' | 'price_monthly' | 'price_yearly' | 'is_active'
>;

export type LiveFormation = Pick<
  Tables<'formations'>,
  'id' | 'title' | 'description' | 'price' | 'image_url' | 'thumbnail_url' | 'author_id' | 'accepted_payment_methods' | 'students_count' | 'is_active'
> & {
  author_name?: string | null;
  pricing_options?: LiveFormationPricingOption[];
};

export type LiveTeachingLesson = Pick<
  Tables<'lessons'>,
  'id' | 'title' | 'description' | 'duration' | 'language' | 'order_index' | 'video_url'
> & {
  formation_id: string;
  formation_title: string;
  formation_image_url?: string | null;
  level_id?: string | null;
  level_title?: string | null;
};

export type LiveTeachingStudioElementType = 'whiteboard' | 'notes' | 'document';

export interface LiveTeachingStudioElementWindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  minimized: boolean;
}

export interface LiveTeachingStudioDocumentHighlightPoint {
  x: number;
  y: number;
}

export interface LiveTeachingStudioDocumentHighlightStroke {
  id: string;
  color: string;
  strokeWidth: number;
  points: LiveTeachingStudioDocumentHighlightPoint[];
}

export interface LiveTeachingStudioElement {
  id: string;
  type: LiveTeachingStudioElementType;
  title: string;
  content?: string | null;
  document_name?: string | null;
  document_url?: string | null;
  document_path?: string | null;
  document_zoom?: number | null;
  document_highlights?: LiveTeachingStudioDocumentHighlightStroke[] | null;
  window_state?: LiveTeachingStudioElementWindowState | null;
}

export interface LiveTeachingStudioScene {
  id: string;
  name: string;
  elements: LiveTeachingStudioElement[];
}

export interface LiveTeachingStudio {
  title: string;
  subtitle?: string | null;
  cover_image_url?: string | null;
  summary?: string | null;
  scenes: LiveTeachingStudioScene[];
  activeSceneId: string;
}

export type LiveScreenKind = 'shop_product' | 'formation_enrollment' | 'teaching_lesson' | 'teaching_studio';

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

export interface LiveTeachingLessonScreen extends LiveScreenBase {
  type: 'teaching_lesson';
  lesson: LiveTeachingLesson;
}

export interface LiveTeachingStudioScreen extends LiveScreenBase {
  type: 'teaching_studio';
  studio: LiveTeachingStudio;
}

export type LiveScreen = LiveShopProductScreen | LiveFormationEnrollmentScreen | LiveTeachingLessonScreen | LiveTeachingStudioScreen;

export const getLiveProductImage = (product: Pick<LiveMarketplaceProduct, 'image_url' | 'product_media'>) => {
  return product.image_url || product.product_media?.[0]?.media_url || null;
};

export const getLiveFormationImage = (formation: Pick<LiveFormation, 'image_url' | 'thumbnail_url'>) => {
  return formation.image_url || formation.thumbnail_url || null;
};

export const getLiveTeachingLessonImage = (lesson: Pick<LiveTeachingLesson, 'formation_image_url'>) => {
  return lesson.formation_image_url || null;
};

export const getLiveTeachingStudioImage = (studio: Pick<LiveTeachingStudio, 'cover_image_url'>) => {
  return studio.cover_image_url || null;
};

export const getLiveTeachingStudioActiveScene = (studio: LiveTeachingStudio) => {
  return studio.scenes.find((scene) => scene.id === studio.activeSceneId) || studio.scenes[0] || null;
};

export const getLiveFormationPlanLabel = (planType: string) => {
  switch (planType) {
    case 'free':
      return 'Gratuit';
    case 'standard':
      return 'Standard';
    case 'premium':
      return 'Premium';
    case 'groupe':
      return 'Groupe';
    default:
      return planType;
  }
};

export const isLiveScreen = (value: unknown): value is LiveScreen => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return candidate.type === 'shop_product' || candidate.type === 'formation_enrollment' || candidate.type === 'teaching_lesson' || candidate.type === 'teaching_studio';
};