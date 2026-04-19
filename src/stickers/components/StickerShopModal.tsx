/**
 * Boutique de stickers — packs gratuits et payants (SC + SB).
 * Affiche le créateur, prix, ventes, et permet l'achat avec choix
 * du dosage SC/SB pour les packs payants.
 */
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Gift, ShoppingCart, BadgeCheck } from 'lucide-react';
import { useStoreStickerPacks, useUserUnlockedPacks } from '@/stickers/hooks/useStickerPacks';
import { usePurchaseStickerPack } from '@/stickers/hooks/usePurchaseStickerPack';
import { useUserWallet } from '@/hooks/useUserWallet';

interface StickerShopModalProps {
  open: boolean;
  onClose: () => void;
  onPackAdded?: (packId: string) => void;
}

const StickerShopModal: React.FC<StickerShopModalProps> = ({ open, onClose, onPackAdded }) => {
  const { data: storePacks, isLoading: loadingStore } = useStoreStickerPacks();
  const { data: unlocked, isLoading: loadingUnlocked } = useUserUnlockedPacks();
  const purchase = usePurchaseStickerPack();
  const { data: wallet } = useUserWallet() as any;
  const [pendingPackId, setPendingPackId] = useState<string | null>(null);

  const unlockedIds = React.useMemo(() => {
    if (!unlocked) return new Set<string>();
    return new Set(
      (unlocked as any[])
        .map((entry) => entry.pack_id || entry.sticker_packs?.id)
        .filter(Boolean),
    );
  }, [unlocked]);

  const handlePurchase = (packId: string, priceSc: number) => {
    setPendingPackId(packId);
    // Stratégie simple : utiliser tout le SB disponible jusqu'au prix
    const availableSb = wallet?.soumboulah_bonus ?? 0;
    const useSb = Math.min(availableSb, priceSc);
    purchase.mutate(
      { packId, useSbAmount: useSb },
      {
        onSuccess: () => {
          setPendingPackId(null);
          onPackAdded?.(packId);
        },
        onError: () => setPendingPackId(null),
      },
    );
  };

  const isPending = (id: string) => purchase.isPending && pendingPackId === id;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-full max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Boutique de stickers
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 min-h-[120px]">
          {(loadingStore || loadingUnlocked) && (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="animate-spin w-6 h-6 text-muted-foreground" />
            </div>
          )}

          {storePacks && storePacks.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              Aucun pack disponible pour le moment.
            </div>
          )}

          {storePacks?.map((pack: any) => {
            const owned = unlockedIds.has(pack.id);
            const priceSc: number = pack.price_sc ?? pack.price ?? 0;
            const isFree = priceSc === 0;
            const creator = pack.profiles;

            return (
              <div
                key={pack.id}
                className="flex items-center gap-3 p-3 rounded-xl border bg-card shadow-sm"
              >
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {pack.icon_url ? (
                    <img
                      src={pack.icon_url}
                      alt={pack.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Sparkles className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{pack.name}</div>
                  {creator && (
                    <div className="text-[11px] text-muted-foreground truncate">
                      Par {creator.first_name || creator.username || 'Créateur'}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    {isFree ? (
                      <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                        <Gift className="w-3 h-3" /> Gratuit
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-primary">
                        {priceSc} SC
                      </span>
                    )}
                    {pack.total_sales > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        · {pack.total_sales} vente(s)
                      </span>
                    )}
                  </div>
                </div>

                {owned ? (
                  <span className="flex items-center gap-1 text-emerald-600 font-medium text-xs">
                    <BadgeCheck className="w-4 h-4" /> Possédé
                  </span>
                ) : (
                  <Button
                    size="sm"
                    disabled={isPending(pack.id) || purchase.isPending}
                    onClick={() => handlePurchase(pack.id, priceSc)}
                  >
                    {isPending(pack.id) ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <ShoppingCart className="w-3 h-3 mr-1" />
                    )}
                    {isFree ? 'Ajouter' : 'Acheter'}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <DialogClose asChild>
          <Button variant="outline" className="mt-4 w-full">
            Fermer
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
};

export default StickerShopModal;
