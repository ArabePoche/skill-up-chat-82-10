/**
 * Achat / déblocage d'un pack via la fonction SQL sécurisée.
 * Gère gratuit + payant (SC + SB).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const db = supabase as any;

interface PurchaseArgs {
  packId: string;
  /** Montant à payer en Soumboulah Bonus (le reste sera prélevé en SC). */
  useSbAmount?: number;
}

export const usePurchaseStickerPack = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ packId, useSbAmount = 0 }: PurchaseArgs) => {
      const { data, error } = await db.rpc('purchase_sticker_pack', {
        _pack_id: packId,
        _use_sb_amount: useSbAmount,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Achat impossible');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-unlocked-packs'] });
      queryClient.invalidateQueries({ queryKey: ['store-sticker-packs'] });
      queryClient.invalidateQueries({ queryKey: ['user-wallet'] });
      toast.success('Pack ajouté à votre collection 🎉');
    },
    onError: (error: any) => toast.error(error?.message || 'Échec de l’achat'),
  });
};

/** Lit la commission active. */
export const useStickerCommissionSettings = () => {
  return {
    queryKey: ['sticker-commission-settings'] as const,
    fetch: async () => {
      const { data } = await db
        .from('sticker_commission_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  };
};
