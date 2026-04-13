// Etape plein ecran d'edition finale avec overlays texte, sticker et piste audio.
import { ArrowLeft, Check, Loader2, Music, Square, Sticker, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { BaseSoundOption, FinalizeOverlay, FinalizeStepOverlayHandlers, OverlaySelection, StickerOverlayList, TextOverlayList } from '../types';
import { FinalizePreviewStage } from './finalize/FinalizePreviewStage';
import { FinalizeSoundPanel } from './finalize/FinalizeSoundPanel';
import { FinalizeStickerPanel } from './finalize/FinalizeStickerPanel';
import { FinalizeTextPanel } from './finalize/FinalizeTextPanel';

interface VideoCreationFinalizeStepProps {
  sourcePreviewUrl: string;
  previewAspectRatio: number;
  setPreviewAspectRatio: (ratio: number) => void;
  customAudioFile: File | null;
  customAudioPreviewUrl: string;
  selectedBaseSoundId: string | null;
  activeFinalizeOverlay: FinalizeOverlay;
  stickerOverlays: StickerOverlayList;
  textOverlays: TextOverlayList;
  selectedOverlay: OverlaySelection;
  textDraft: string;
  textColorDraft: string;
  textFontFamilyDraft: string;
  textBoldDraft: boolean;
  textItalicDraft: boolean;
  textUnderlineDraft: boolean;
  isProcessing: boolean;
  stickers: string[];
  baseSounds: BaseSoundOption[];
  finalizeStageRef: React.RefObject<HTMLDivElement>;
  nativeAudioInputRef: React.RefObject<HTMLInputElement>;
  overlayHandlers: FinalizeStepOverlayHandlers;
  onBack: () => void;
  onRefilm: () => void;
  onContinue: () => void;
  onSetActiveOverlay: (overlay: FinalizeOverlay) => void;
  onAddSticker: (emoji: string) => void;
  onAddText: () => void;
  onEditSelectedText: (overlayId: string) => void;
  onUpdateSelectedText: (value: string) => void;
  onUpdateSelectedTextColor: (value: string) => void;
  onUpdateSelectedTextFontFamily: (value: string) => void;
  onToggleBold: () => void;
  onToggleItalic: () => void;
  onToggleUnderline: () => void;
  onResetOverlayTransform: (kind: 'sticker' | 'text') => void;
  onRemoveSelectedOverlay: (kind: 'sticker' | 'text') => void;
  onSelectOverlay: (selection: OverlaySelection) => void;
  onHandleBaseSoundSelection: (soundId: string) => void;
  onHandleCustomAudioSelection: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearSelectedAudio: () => void;
}

export const VideoCreationFinalizeStep = ({
  sourcePreviewUrl,
  previewAspectRatio,
  setPreviewAspectRatio,
  customAudioFile,
  customAudioPreviewUrl,
  selectedBaseSoundId,
  activeFinalizeOverlay,
  stickerOverlays,
  textOverlays,
  selectedOverlay,
  textDraft,
  textColorDraft,
  textFontFamilyDraft,
  textBoldDraft,
  textItalicDraft,
  textUnderlineDraft,
  isProcessing,
  stickers,
  baseSounds,
  finalizeStageRef,
  nativeAudioInputRef,
  overlayHandlers,
  onBack,
  onRefilm,
  onContinue,
  onSetActiveOverlay,
  onAddSticker,
  onAddText,
  onEditSelectedText,
  onUpdateSelectedText,
  onUpdateSelectedTextColor,
  onUpdateSelectedTextFontFamily,
  onToggleBold,
  onToggleItalic,
  onToggleUnderline,
  onResetOverlayTransform,
  onRemoveSelectedOverlay,
  onSelectOverlay,
  onHandleBaseSoundSelection,
  onHandleCustomAudioSelection,
  onClearSelectedAudio,
}: VideoCreationFinalizeStepProps) => (
  <DialogContent className="h-screen max-w-none border-0 bg-black p-0 text-white sm:rounded-none">
    <DialogHeader className="sr-only">
      <DialogTitle>Finaliser la video</DialogTitle>
      <DialogDescription>Ajoutez un sticker, un texte ou un son avant de publier la video.</DialogDescription>
    </DialogHeader>
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-black">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.18),transparent_28%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.16),transparent_24%),linear-gradient(180deg,rgba(10,10,10,0.92),rgba(0,0,0,1))]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.04)_0%,transparent_35%,transparent_65%,rgba(255,255,255,0.04)_100%)] opacity-60" />
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between p-5 text-white">
        <Button type="button" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={onBack}>
          <ArrowLeft size={18} strokeWidth={2.75} className="mr-2" />
          Retour
        </Button>
        <div className="rounded-full bg-black/30 px-4 py-2 text-sm">Finaliser</div>
      </div>

      <div className="absolute right-4 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-4">
        <button
          type="button"
          onClick={() => onSetActiveOverlay('sticker')}
          className={`flex w-20 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition ${activeFinalizeOverlay === 'sticker' ? 'text-orange-400' : 'text-white hover:text-orange-300'}`}
          title="Ajouter un sticker"
        >
          <Sticker size={24} strokeWidth={2.75} />
          <span>Sticker</span>
        </button>
        <button
          type="button"
          onClick={() => {
            onAddText();
            onSetActiveOverlay('text');
          }}
          className={`flex w-20 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition ${activeFinalizeOverlay === 'text' ? 'text-orange-400' : 'text-white hover:text-orange-300'}`}
          title="Ajouter un texte"
        >
          <Type size={24} strokeWidth={2.75} />
          <span>Texte</span>
        </button>
        <button
          type="button"
          onClick={() => onSetActiveOverlay('sound')}
          className={`flex w-20 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition ${activeFinalizeOverlay === 'sound' ? 'text-orange-400' : 'text-white hover:text-orange-300'}`}
          title="Ajouter un son"
        >
          <Music size={24} strokeWidth={2.75} />
          <span>Son</span>
        </button>
      </div>

      <div className="absolute bottom-8 left-0 right-0 z-10 flex items-center justify-center gap-3 px-4">
        <Button type="button" variant="ghost" className="text-zinc-200 hover:bg-white/10 hover:text-white" onClick={onRefilm}>
          Refilmer
        </Button>
        <Button type="button" className="bg-orange-500 text-white hover:bg-orange-400" onClick={onContinue} disabled={isProcessing}>
          {isProcessing ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Check size={16} className="mr-2" />}
          Continuer
        </Button>
      </div>

      {activeFinalizeOverlay && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/45 p-4" onClick={() => onSetActiveOverlay(null)}>
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950/96 p-5 text-white shadow-2xl backdrop-blur-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">
                  {activeFinalizeOverlay === 'sticker' ? 'Ajouter un sticker' : activeFinalizeOverlay === 'text' ? 'Ajouter un texte' : 'Ajouter un son'}
                </div>
                <p className="mt-1 text-sm text-zinc-400">
                  {activeFinalizeOverlay === 'sticker'
                    ? 'Choisissez un sticker puis déplacez-le directement sur l aperçu. Pincez à deux doigts pour le redimensionner.'
                    : activeFinalizeOverlay === 'text'
                      ? 'Modifiez le texte, la couleur et la police.'
                      : 'Choisissez un son de la bibliotheque de l app ou importez votre propre fichier.'}
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" onClick={() => onSetActiveOverlay(null)}>
                <Square size={16} strokeWidth={2.75} className="rotate-45" />
              </Button>
            </div>

            {activeFinalizeOverlay === 'sticker' && (
              <FinalizeStickerPanel
                stickers={stickers}
                stickerOverlays={stickerOverlays}
                onAddSticker={onAddSticker}
                onResetOverlayTransform={() => onResetOverlayTransform('sticker')}
                onRemoveSelectedOverlay={() => onRemoveSelectedOverlay('sticker')}
              />
            )}

            {activeFinalizeOverlay === 'text' && (
              <FinalizeTextPanel
                textDraft={textDraft}
                textColorDraft={textColorDraft}
                textFontFamilyDraft={textFontFamilyDraft}
                textBoldDraft={textBoldDraft}
                textItalicDraft={textItalicDraft}
                textUnderlineDraft={textUnderlineDraft}
                textOverlays={textOverlays}
                hasSelectedText={selectedOverlay?.kind === 'text'}
                onUpdateSelectedText={onUpdateSelectedText}
                onUpdateSelectedTextColor={onUpdateSelectedTextColor}
                onUpdateSelectedTextFontFamily={onUpdateSelectedTextFontFamily}
                onToggleBold={onToggleBold}
                onToggleItalic={onToggleItalic}
                onToggleUnderline={onToggleUnderline}
                onResetOverlayTransform={() => onResetOverlayTransform('text')}
                onRemoveSelectedOverlay={() => onRemoveSelectedOverlay('text')}
              />
            )}

            {activeFinalizeOverlay === 'sound' && (
              <FinalizeSoundPanel
                baseSounds={baseSounds}
                selectedBaseSoundId={selectedBaseSoundId}
                customAudioFile={customAudioFile}
                customAudioPreviewUrl={customAudioPreviewUrl}
                nativeAudioInputRef={nativeAudioInputRef}
                onHandleBaseSoundSelection={onHandleBaseSoundSelection}
                onHandleCustomAudioSelection={onHandleCustomAudioSelection}
                onClearSelectedAudio={onClearSelectedAudio}
              />
            )}
          </div>
        </div>
      )}

      <FinalizePreviewStage
        sourcePreviewUrl={sourcePreviewUrl}
        previewAspectRatio={previewAspectRatio}
        setPreviewAspectRatio={setPreviewAspectRatio}
        customAudioFile={customAudioFile}
        stickerOverlays={stickerOverlays}
        textOverlays={textOverlays}
        selectedOverlay={selectedOverlay}
        finalizeStageRef={finalizeStageRef}
        overlayHandlers={overlayHandlers}
        onSelectOverlay={onSelectOverlay}
        onEditSelectedText={onEditSelectedText}
      />
    </div>
  </DialogContent>
);