/**
 * Types métier du système de stickers.
 * Évite la dépendance directe au type Database (chaînes trop profondes -> TS2589).
 */

export type StickerPackStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

export interface StickerPackData {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  icon_path: string | null;
  creator_id: string | null;
  /** Prix legacy (deprecated, utiliser price_sc) */
  price: number;
  price_sc: number;
  price_sb: number;
  status: StickerPackStatus;
  is_published: boolean;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  total_sales: number;
  total_revenue_sc: number;
  total_revenue_sb: number;
  created_at: string;
  updated_at: string;
}

export interface StickerData {
  id: string;
  pack_id: string;
  file_url: string;
  file_path: string | null;
  is_animated: boolean;
  preview_visible: boolean;
  sort_order: number;
  created_at: string;
}

export interface StickerPurchase {
  id: string;
  pack_id: string;
  buyer_id: string;
  creator_id: string | null;
  price_sc: number;
  price_sb: number;
  amount_paid_sc: number;
  amount_paid_sb: number;
  creator_share_sc: number;
  creator_share_sb: number;
  platform_share_sc: number;
  platform_share_sb: number;
  is_free: boolean;
  created_at: string;
}

export interface StickerCommissionSettings {
  id: string;
  creator_share_percent: number;
  platform_share_percent: number;
  updated_at: string;
}
