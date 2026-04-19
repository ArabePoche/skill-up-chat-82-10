// Composant modale boutique de stickers (packs gratuits et payants)
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';


import { useStoreStickerPacks, useUserUnlockedPacks, useUnlockStickerPack } from '@/hooks/useStickerSystem';
import { Loader2 } from 'lucide-react';

interface StickerShopModalProps {
  open: boolean;
  onClose: () => void;
  onPackAdded?: (packId: string) => void;
}

const StickerShopModal: React.FC<StickerShopModalProps> = ({ open, onClose, onPackAdded }) => {

  // Récupérer tous les packs publiés (boutique)
  const { data: storePacks, isLoading: loadingStore } = useStoreStickerPacks();
  // Packs déjà débloqués par l'utilisateur
  const { data: unlocked, isLoading: loadingUnlocked } = useUserUnlockedPacks();
  const unlockStickerPack = useUnlockStickerPack();

  // Liste des IDs de packs déjà débloqués
  const unlockedIds = React.useMemo(() => {
    if (!unlocked) return [];
    return unlocked.map((entry: any) => entry.pack_id || entry.sticker_packs?.id).filter(Boolean);
  }, [unlocked]);

  const handleAddPack = (packId: string) => {
    unlockStickerPack.mutate(packId, {
      onSuccess: () => {
        onPackAdded?.(packId);
      }
    });
  };


  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle>Boutique de stickers</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 min-h-[120px]">
          {(loadingStore || loadingUnlocked) && (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="animate-spin w-6 h-6 text-slate-400" />
            </div>
          )}
          {storePacks && storePacks.length === 0 && (
            <div className="text-center text-slate-400 py-8">Aucun pack disponible pour le moment.</div>
          )}
          {storePacks && storePacks.map((pack: any) => {
            const owned = unlockedIds.includes(pack.id);
            return (
              <div key={pack.id} className="flex items-center gap-4 p-3 rounded-xl border bg-white/80 shadow-sm">
                <span className="text-3xl">
                  {pack.icon_url ? (
                    <img src={pack.icon_url} alt="icon" className="w-10 h-10 object-contain rounded-lg bg-slate-100" />
                  ) : '🎭'}
                </span>
                <div className="flex-1">
                  <div className="font-semibold text-base">{pack.name}</div>
                  <div className="text-xs text-slate-500">{pack.description}</div>
                </div>
                {owned ? (
                  <span className="text-green-500 font-semibold text-xs">Ajouté</span>
                ) : (
                  <Button size="sm" loading={unlockStickerPack.isPending && unlockStickerPack.variables === pack.id} onClick={() => handleAddPack(pack.id)}>
                    {pack.price === 0 ? 'Ajouter' : `Acheter (${pack.price}€)`}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
        <DialogClose asChild>
          <Button variant="outline" className="mt-6 w-full">Fermer</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
};

export default StickerShopModal;
