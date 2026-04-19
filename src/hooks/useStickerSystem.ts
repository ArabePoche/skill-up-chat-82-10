import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

// --- TYPES ---
export interface StickerPackData {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  creator_id: string | null;
  price: number;
  is_published: boolean;
  created_at: string;
}

export interface StickerData {
  id: string;
  pack_id: string;
  file_url: string;
  is_animated: boolean;
  sort_order: number;
  created_at: string;
}

// ============================================================================
// HOOKS POUR LE CRÉATEUR (Studio)
// ============================================================================

export const useCreatorStickerPacks = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['creator-sticker-packs', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('sticker_packs')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as StickerPackData[];
    },
    enabled: !!user,
  });
};

export const useStickersForPack = (packId: string | null) => {
  return useQuery({
    queryKey: ['pack-stickers', packId],
    queryFn: async () => {
      if (!packId) return [];
      const { data, error } = await supabase
        .from('stickers')
        .select('*')
        .eq('pack_id', packId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as StickerData[];
    },
    enabled: !!packId,
  });
};

export const useSaveStickerPack = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (pack: Partial<StickerPackData>) => {
      if (!user) throw new Error("Non authentifié");

      const payload = {
        name: pack.name,
        description: pack.description,
        icon_url: pack.icon_url,
        price: pack.price || 0,
        is_published: pack.is_published || false,
        creator_id: user.id
      };

      if (pack.id) {
        // Update
        const { data, error } = await supabase
          .from('sticker_packs')
          .update(payload)
          .eq('id', pack.id)
          .select()
          .single();
        if (error) throw error;
        return data as StickerPackData;
      } else {
        // Create
        const { data, error } = await supabase
          .from('sticker_packs')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data as StickerPackData;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-sticker-packs'] });
      toast.success("Pack enregistré avec succès");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erreur lors de la sauvegarde du pack");
    }
  });
};

/** Icône de pack : upload dans le bucket stickers (pas d’URL externe). */
export const useUploadStickerPackIcon = () => {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ file, packId }: { file: File; packId: string | null }) => {
      if (!user) throw new Error('Non authentifié');

      const rawExt = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
      const allowed = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
      const fileExt = allowed.includes(rawExt) ? rawExt : 'png';

      const folder =
        packId && packId !== 'new' ? `${packId}` : `${user.id}/pending`;
      const fileName = `${folder}/pack-icon-${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('stickers').upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('stickers').getPublicUrl(fileName);

      return { publicUrl };
    },
    onError: (error) => {
      console.error(error);
      toast.error("Échec de l'upload de l'icône");
    },
  });
};

export const useUploadStickerImage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ file, packId }: { file: File, packId: string }) => {
      if (!user) throw new Error("Non authentifié");

      // 1. Upload vers le bucket "stickers"
      const fileExt = file.name.split('.').pop();
      const fileName = `${packId}/${crypto.randomUUID()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('stickers')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Récupérer l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('stickers')
        .getPublicUrl(fileName);

      // 2. Insérer dans la table `stickers`
      const isAnimated = file.type === 'image/gif' || file.type === 'image/webp'; // approximation simple
      
      const { data: stickerData, error: dbError } = await supabase
        .from('stickers')
        .insert({
          pack_id: packId,
          file_url: publicUrl,
          is_animated: isAnimated
        })
        .select()
        .single();
        
      if (dbError) throw dbError;
      return stickerData;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pack-stickers', variables.packId] });
      toast.success("Sticker ajouté");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Échec de l'upload");
    }
  });
};

// ============================================================================
// HOOKS POUR LA BOUTIQUE ET LE CHAT (Store / Users)
// ============================================================================

export const useStoreStickerPacks = () => {
  return useQuery({
    queryKey: ['store-sticker-packs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sticker_packs')
        .select(`
          *,
          profiles:creator_id (first_name, last_name, username, avatar_url)
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });
};

export const useUserUnlockedPacks = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-unlocked-packs', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // On récupère les packs débloqués
      // Et pour pouvoir les afficher dans le Chat, on inclus directement les stickers liés !
      const { data, error } = await supabase
        .from('user_sticker_packs')
        .select(`
          pack_id,
          unlocked_at,
          sticker_packs (
            id, name, description, icon_url, price,
            stickers (
              id, file_url, is_animated
            )
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useUnlockStickerPack = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (packId: string) => {
      if (!user) throw new Error("Non authentifié");

      const { data, error } = await supabase
        .from('user_sticker_packs')
        .insert({
          user_id: user.id,
          pack_id: packId
        })
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-unlocked-packs'] });
      toast.success("Pack débloqué ! Il est maintenant disponible dans votre clavier de stickers.");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erreur lors du déblocage du pack");
    }
  });
};
