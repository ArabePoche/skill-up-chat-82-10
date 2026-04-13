// Panneau dedie a l'ajout et a la gestion des stickers dans l'etape de finalisation.
import { Button } from '@/components/ui/button';
import type { StickerOverlayList } from '../../types';

interface FinalizeStickerPanelProps {
  stickers: string[];
  stickerOverlays: StickerOverlayList;
  onAddSticker: (emoji: string) => void;
  onResetOverlayTransform: () => void;
  onRemoveSelectedOverlay: () => void;
}

export const FinalizeStickerPanel = ({
  stickers,
  stickerOverlays,
  onAddSticker,
  onResetOverlayTransform,
  onRemoveSelectedOverlay,
}: FinalizeStickerPanelProps) => (
  <div className="space-y-3">
    <div className="flex flex-wrap gap-2">
      {stickers.map((emoji) => (
        <button key={emoji} type="button" onClick={() => onAddSticker(emoji)} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-2xl transition hover:border-orange-400 hover:bg-orange-500/20">
          {emoji}
        </button>
      ))}
    </div>
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" className="border-white/10 text-zinc-200 hover:bg-white/10 hover:text-white" onClick={onResetOverlayTransform}>
        Recentrer / taille par défaut
      </Button>
      {!!stickerOverlays.length && (
        <Button type="button" variant="ghost" className="text-zinc-300 hover:bg-white/10 hover:text-white" onClick={onRemoveSelectedOverlay}>
          Retirer le sticker
        </Button>
      )}
    </div>
    {!!stickerOverlays.length && (
      <p className="text-xs text-zinc-400">{stickerOverlays.length} sticker(s) ajouté(s). Touchez un sticker dans l’aperçu pour le sélectionner.</p>
    )}
  </div>
);