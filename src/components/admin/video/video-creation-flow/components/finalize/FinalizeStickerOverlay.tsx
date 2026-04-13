// Overlay sticker interactif affiche dans la scene de finalisation.
import { Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FinalizeStepOverlayHandlers, OverlaySelection } from '../../types';
import type { StickerOverlayItem } from '@/utils/videoComposer';

interface FinalizeStickerOverlayProps {
  overlay: StickerOverlayItem;
  selectedOverlay: OverlaySelection;
  overlayHandlers: FinalizeStepOverlayHandlers;
  onSelectOverlay: (selection: OverlaySelection) => void;
}

export const FinalizeStickerOverlay = ({
  overlay,
  selectedOverlay,
  overlayHandlers,
  onSelectOverlay,
}: FinalizeStickerOverlayProps) => (
  <div
    className="absolute left-0 top-0 touch-none select-none"
    style={{
      left: `${overlay.transform.x * 100}%`,
      top: `${overlay.transform.y * 100}%`,
      transform: `translate(-50%, -50%) scale(${overlay.transform.scale})`,
    }}
    onPointerDown={(event) => overlayHandlers.beginPointerInteraction(event, 'sticker', overlay.id, 'drag')}
    onPointerMove={(event) => overlayHandlers.handlePointerMove(event, 'sticker', overlay.id)}
    onPointerUp={(event) => overlayHandlers.endPointerInteraction(event, 'sticker', overlay.id)}
    onPointerCancel={(event) => overlayHandlers.endPointerInteraction(event, 'sticker', overlay.id)}
    onTouchStart={(event) => overlayHandlers.handleTouchStart(event, 'sticker', overlay.id)}
    onTouchMove={(event) => overlayHandlers.handleTouchMove(event, 'sticker', overlay.id)}
    onTouchEnd={(event) => overlayHandlers.handleTouchEnd(event, 'sticker', overlay.id)}
    onTouchCancel={(event) => overlayHandlers.handleTouchEnd(event, 'sticker', overlay.id)}
    onClick={(event) => {
      event.stopPropagation();
      onSelectOverlay({ kind: 'sticker', id: overlay.id });
    }}
  >
    <div className={cn(
      'relative cursor-grab rounded-3xl px-2 py-1 active:cursor-grabbing',
      selectedOverlay?.kind === 'sticker' && selectedOverlay.id === overlay.id && 'ring-2 ring-orange-400/80 bg-black/10 backdrop-blur-[2px]'
    )}>
      <div className="text-6xl drop-shadow-[0_10px_22px_rgba(0,0,0,0.5)]">{overlay.emoji}</div>
      {selectedOverlay?.kind === 'sticker' && selectedOverlay.id === overlay.id && (
        <button
          type="button"
          className="absolute -bottom-3 -right-3 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-orange-500 text-white shadow-lg"
          onPointerDown={(event) => overlayHandlers.beginPointerInteraction(event, 'sticker', overlay.id, 'resize')}
          onClick={(event) => event.stopPropagation()}
        >
          <Wand2 size={14} />
        </button>
      )}
    </div>
  </div>
);