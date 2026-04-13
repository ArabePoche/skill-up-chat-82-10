// Scene d'aperçu finale qui affiche la video et les overlays interactifs.
import type { OverlaySelection, FinalizeStepOverlayHandlers, StickerOverlayList, TextOverlayList } from '../../types';
import { FinalizeStickerOverlay } from './FinalizeStickerOverlay';
import { FinalizeTextOverlay } from './FinalizeTextOverlay';

interface FinalizePreviewStageProps {
  sourcePreviewUrl: string;
  previewAspectRatio: number;
  setPreviewAspectRatio: (ratio: number) => void;
  customAudioFile: File | null;
  stickerOverlays: StickerOverlayList;
  textOverlays: TextOverlayList;
  selectedOverlay: OverlaySelection;
  finalizeStageRef: React.RefObject<HTMLDivElement>;
  overlayHandlers: FinalizeStepOverlayHandlers;
  onSelectOverlay: (selection: OverlaySelection) => void;
  onEditSelectedText: (overlayId: string) => void;
}

export const FinalizePreviewStage = ({
  sourcePreviewUrl,
  previewAspectRatio,
  setPreviewAspectRatio,
  customAudioFile,
  stickerOverlays,
  textOverlays,
  selectedOverlay,
  finalizeStageRef,
  overlayHandlers,
  onSelectOverlay,
  onEditSelectedText,
}: FinalizePreviewStageProps) => (
  <div className="pointer-events-none absolute inset-0 z-0">
    <div
      ref={finalizeStageRef}
      className="pointer-events-auto relative h-full w-full overflow-hidden bg-black"
      style={{ aspectRatio: previewAspectRatio > 1 ? previewAspectRatio : undefined }}
    >
      {sourcePreviewUrl && (
        <video
          src={sourcePreviewUrl}
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover"
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;
            if (video.videoWidth && video.videoHeight) {
              setPreviewAspectRatio(video.videoWidth / video.videoHeight);
            }
          }}
        />
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4">
        <div className="rounded-full border border-white/10 bg-black/45 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-zinc-200 backdrop-blur-md">
          Apercu final
        </div>
        {customAudioFile && (
          <div className="rounded-full border border-emerald-400/25 bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-200 backdrop-blur-md">
            Son actif
          </div>
        )}
      </div>

      {stickerOverlays.map((overlay) => (
        <FinalizeStickerOverlay
          key={overlay.id}
          overlay={overlay}
          selectedOverlay={selectedOverlay}
          overlayHandlers={overlayHandlers}
          onSelectOverlay={onSelectOverlay}
        />
      ))}

      {textOverlays.map((overlay) => (
        <FinalizeTextOverlay
          key={overlay.id}
          overlay={overlay}
          selectedOverlay={selectedOverlay}
          overlayHandlers={overlayHandlers}
          onSelectOverlay={onSelectOverlay}
          onEditText={onEditSelectedText}
        />
      ))}
    </div>
  </div>
);