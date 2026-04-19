/**
 * Mutations : création/édition de packs, upload de fichiers (privé),
 * soumission à validation et modération.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { StickerPackData } from '../types';

const db = supabase as any;

/** Crée ou met à jour un pack (en draft uniquement côté créateur). */
export const useSaveStickerPack = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (pack: Partial<StickerPackData>): Promise<StickerPackData> => {
      if (!user) throw new Error('Non authentifié');
      const payload: Record<string, unknown> = {
        name: pack.name,
        description: pack.description ?? null,
        icon_url: pack.icon_url ?? null,
        icon_path: pack.icon_path ?? null,
        price: pack.price_sc ?? pack.price ?? 0, // legacy
        price_sc: pack.price_sc ?? pack.price ?? 0,
        price_sb: pack.price_sb ?? 0,
        creator_id: user.id,
      };
      if (pack.id) {
        const { data, error } = await db
          .from('sticker_packs')
          .update(payload)
          .eq('id', pack.id)
          .select()
          .single();
        if (error) throw error;
        return data as StickerPackData;
      }
      // Nouveau pack : statut draft par défaut
      payload.status = 'draft';
      const { data, error } = await db
        .from('sticker_packs')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as StickerPackData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-sticker-packs'] });
      toast.success('Pack enregistré');
    },
    onError: (error: any) => {
      console.error(error);
      toast.error(error?.message || 'Erreur lors de la sauvegarde');
    },
  });
};

/** Upload d'icône de pack dans le bucket privé. */
export const useUploadStickerPackIcon = () => {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ file, packId }: { file: File; packId: string | null }) => {
      if (!user) throw new Error('Non authentifié');
      const rawExt = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
      const allowed = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
      const ext = allowed.includes(rawExt) ? rawExt : 'png';
      // Convention chemin : <user_id>/icons/<packId|pending>/<uuid>.<ext>
      const folder = packId && packId !== 'new' ? packId : 'pending';
      const path = `${user.id}/icons/${folder}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('stickers-private')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;

      // Pour l'icône on génère une URL signée longue (1h, renouvelée par le hook côté front)
      const { data: signed, error: signErr } = await supabase.storage
        .from('stickers-private')
        .createSignedUrl(path, 60 * 60);
      if (signErr) throw signErr;

      return { publicUrl: signed.signedUrl, path };
    },
    onError: (error: any) => {
      console.error(error);
      toast.error("Échec de l'upload de l'icône");
    },
  });
};

/** Upload d'un sticker dans le bucket privé. */
export const useUploadStickerImage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ file, packId }: { file: File; packId: string }) => {
      if (!user) throw new Error('Non authentifié');
      const rawExt = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
      const allowed = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
      const ext = allowed.includes(rawExt) ? rawExt : 'png';
      const path = `${user.id}/packs/${packId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('stickers-private')
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: signed, error: signErr } = await supabase.storage
        .from('stickers-private')
        .createSignedUrl(path, 60 * 60);
      if (signErr) throw signErr;

      const isAnimated = file.type === 'image/gif' || file.type === 'image/webp';
      const { data: stickerData, error: dbError } = await db
        .from('stickers')
        .insert({
          pack_id: packId,
          file_url: signed.signedUrl, // URL signée temporaire (sera re-signée à la lecture)
          file_path: path,
          is_animated: isAnimated,
        })
        .select()
        .single();
      if (dbError) throw dbError;
      return stickerData;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pack-stickers', variables.packId] });
      toast.success('Sticker ajouté');
    },
    onError: (error: any) => {
      console.error(error);
      toast.error(error?.message || "Échec de l'upload");
    },
  });
};

/** Soumet un pack pour validation admin. */
export const useSubmitPackForReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (packId: string) => {
      const { data, error } = await db.rpc('submit_sticker_pack_for_review', { _pack_id: packId });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Échec de la soumission');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-sticker-packs'] });
      toast.success('Pack soumis à validation 🎉');
    },
    onError: (error: any) => toast.error(error?.message || 'Erreur lors de la soumission'),
  });
};

/** Approuver / rejeter un pack (admin). */
export const useReviewStickerPack = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      packId,
      decision,
      reason,
    }: {
      packId: string;
      decision: 'approve' | 'reject';
      reason?: string;
    }) => {
      const { data, error } = await db.rpc('review_sticker_pack', {
        _pack_id: packId,
        _decision: decision,
        _reason: reason ?? null,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Échec de la modération');
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['sticker-moderation-queue'] });
      queryClient.invalidateQueries({ queryKey: ['store-sticker-packs'] });
      toast.success(vars.decision === 'approve' ? 'Pack approuvé ✅' : 'Pack rejeté');
    },
    onError: (error: any) => toast.error(error?.message || 'Erreur de modération'),
  });
};
