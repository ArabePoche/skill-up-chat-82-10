/**
 * Hooks de lecture des packs de stickers (créateur, marketplace, modération).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { StickerPackData, StickerData } from '../types';

// On caste via "as any" sur le client pour éviter l'inflation de types Database
// qui provoquait des erreurs TS2589 (instantiation excessively deep).
const db = supabase as any;

/** Packs créés par l'utilisateur courant (tous statuts confondus). */
export const useCreatorStickerPacks = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['creator-sticker-packs', user?.id],
    queryFn: async (): Promise<StickerPackData[]> => {
      if (!user) return [];
      const { data, error } = await db
        .from('sticker_packs')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as StickerPackData[];
    },
    enabled: !!user,
  });
};

/** Stickers d'un pack donné (vue éditeur ou possesseur). */
export const useStickersForPack = (packId: string | null) => {
  return useQuery({
    queryKey: ['pack-stickers', packId],
    queryFn: async (): Promise<StickerData[]> => {
      if (!packId) return [];
      const { data, error } = await db
        .from('stickers')
        .select('*')
        .eq('pack_id', packId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as StickerData[];
    },
    enabled: !!packId,
  });
};

/** Packs approuvés visibles dans la marketplace. */
export const useStoreStickerPacks = () => {
  return useQuery({
    queryKey: ['store-sticker-packs'],
    queryFn: async () => {
      const { data, error } = await db
        .from('sticker_packs')
        .select(`
          *,
          profiles:creator_id (first_name, last_name, username, avatar_url)
        `)
        .eq('status', 'approved')
        .order('total_sales', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
};

/** Packs débloqués/achetés par l'utilisateur (avec stickers inlinés pour le picker). */
export const useUserUnlockedPacks = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['user-unlocked-packs', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await db
        .from('user_sticker_packs')
        .select(`
          pack_id,
          unlocked_at,
          sticker_packs (
            id, name, description, icon_url, price, price_sc, price_sb, status,
            stickers ( id, file_url, file_path, is_animated, preview_visible )
          )
        `)
        .eq('user_id', user.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
};

/** File d'attente de modération des packs (admin uniquement, RLS bloque sinon). */
export const useStickerModerationQueue = () => {
  return useQuery({
    queryKey: ['sticker-moderation-queue'],
    queryFn: async () => {
      const { data, error } = await db
        .from('sticker_packs')
        .select(`
          *,
          profiles:creator_id (first_name, last_name, username, avatar_url),
          stickers ( id, file_url, file_path, preview_visible, status )
        `)
        .eq('status', 'pending_review')
        .order('submitted_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
};

/** Stickers individuels en attente de validation (dans des packs approuvés). */
export const usePendingStickersModeration = () => {
  return useQuery({
    queryKey: ['pending-stickers-moderation'],
    queryFn: async () => {
      const { data, error } = await db
        .from('stickers')
        .select(`
          id, file_url, file_path, is_animated, status, created_at,
          sticker_packs!inner ( id, name, icon_url, status, creator_id,
            profiles:creator_id ( first_name, last_name, username )
          )
        `)
        .eq('status', 'pending_review')
        .eq('sticker_packs.status', 'approved')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
};
