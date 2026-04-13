// Overlay texte interactif affiche dans la scene de finalisation.
import { Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FinalizeStepOverlayHandlers, OverlaySelection } from '../../types';
import type { TextOverlayItem } from '@/utils/videoComposer';

interface FinalizeTextOverlayProps {
  overlay: TextOverlayItem;
  selectedOverlay: OverlaySelection;
  overlayHandlers: FinalizeStepOverlayHandlers;
  onSelectOverlay: (selection: OverlaySelection) => void;
  onEditText: (overlayId: string) => void;
}

export const FinalizeTextOverlay = ({
  overlay,
  selectedOverlay,
  overlayHandlers,
  onSelectOverlay,
  onEditText,
}: FinalizeTextOverlayProps) => (
  <div
    className="absolute left-0 top-0 touch-none select-none"
    style={{
      left: `${overlay.transform.x * 100}%`,
      top: `${overlay.transform.y * 100}%`,
      transform: `translate(-50%, -50%) scale(${overlay.transform.scale})`,
      width: '72%',
    }}
    onPointerDown={(event) => overlayHandlers.beginPointerInteraction(event, 'text', overlay.id, 'drag')}
    onPointerMove={(event) => overlayHandlers.handlePointerMove(event, 'text', overlay.id)}
    onPointerUp={(event) => overlayHandlers.endPointerInteraction(event, 'text', overlay.id)}
    onPointerCancel={(event) => overlayHandlers.endPointerInteraction(event, 'text', overlay.id)}
    onTouchStart={(event) => overlayHandlers.handleTouchStart(event, 'text', overlay.id)}
    onTouchMove={(event) => overlayHandlers.handleTouchMove(event, 'text', overlay.id)}
    onTouchEnd={(event) => overlayHandlers.handleTouchEnd(event, 'text', overlay.id)}
    onTouchCancel={(event) => overlayHandlers.handleTouchEnd(event, 'text', overlay.id)}
    onClick={(event) => {
      event.stopPropagation();
      onSelectOverlay({ kind: 'text', id: overlay.id });
    }}
  >
    <div className={cn(
      'relative cursor-grab rounded-3xl px-3 py-2 text-center active:cursor-grabbing',
      selectedOverlay?.kind === 'text' && selectedOverlay.id === overlay.id && 'ring-2 ring-orange-400/80 bg-black/10 backdrop-blur-[2px]'
    )}>
      <div
        className="whitespace-pre-line text-center text-3xl leading-tight drop-shadow-[0_10px_22px_rgba(0,0,0,0.65)]"
        style={{
          color: overlay.style.color,
          fontFamily: `"${overlay.style.fontFamily}", sans-serif`,
          fontWeight: overlay.style.fontWeight,
          fontStyle: overlay.style.fontStyle,
          textDecoration: overlay.style.textDecoration,
        }}
      >
        {overlay.text}
      </div>
      {selectedOverlay?.kind === 'text' && selectedOverlay.id === overlay.id && (
        <>
          <button
            type="button"
            className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-black/70 px-3 py-1 text-xs font-medium text-white shadow-lg"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.stopPropagation();
              onEditText(overlay.id);
            }}
          >
            Modifier
          </button>
          <button
            type="button"
            className="absolute -bottom-3 -right-3 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-orange-500 text-white shadow-lg"
            onPointerDown={(event) => overlayHandlers.beginPointerInteraction(event, 'text', overlay.id, 'resize')}
            onClick={(event) => event.stopPropagation()}
          >
            <Wand2 size={14} />
          </button>
        </>
      )}
    </div>
  </div>
);