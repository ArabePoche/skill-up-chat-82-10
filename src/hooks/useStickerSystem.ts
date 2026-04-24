/**
 * Façade de compatibilité ascendante.
 * Toute la logique a été déplacée dans `src/stickers/hooks/*` pour éviter
 * les erreurs TS2589 (instantiation excessively deep) et clarifier l'archi.
 *
 * NE PLUS AJOUTER DE CODE ICI — éditez les fichiers du dossier stickers/.
 */

export type { StickerPackData, StickerData, StickerPackStatus } from '@/stickers/types';

export {
  useCreatorStickerPacks,
  useStickersForPack,
  useStoreStickerPacks,
  useUserUnlockedPacks,
  useStickerModerationQueue,
} from '@/stickers/hooks/useStickerPacks';

export {
  useSaveStickerPack,
  useUploadStickerPackIcon,
  useUploadStickerImage,
  useSubmitPackForReview,
  useReviewStickerPack,
  useDeleteStickerPack,
} from '@/stickers/hooks/useStickerMutations';

export { usePurchaseStickerPack } from '@/stickers/hooks/usePurchaseStickerPack';
export { useSignedStickerUrls } from '@/stickers/hooks/useSignedStickerUrls';

// Alias rétro-compatible : ancien hook "useUnlockStickerPack" -> nouveau "usePurchaseStickerPack"
import { usePurchaseStickerPack } from '@/stickers/hooks/usePurchaseStickerPack';
export const useUnlockStickerPack = () => {
  const m = usePurchaseStickerPack();
  return {
    ...m,
    // L'ancienne signature acceptait juste un packId : on adapte.
    mutate: (packId: string, opts?: Parameters<typeof m.mutate>[1]) =>
      m.mutate({ packId }, opts as any),
    mutateAsync: (packId: string) => m.mutateAsync({ packId }),
  };
};
