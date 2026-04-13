// Panneau dedie a la selection et a la preecoute du son dans l'etape de finalisation.
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BaseSoundOption } from '../../types';

interface FinalizeSoundPanelProps {
  baseSounds: BaseSoundOption[];
  selectedBaseSoundId: string | null;
  customAudioFile: File | null;
  customAudioPreviewUrl: string;
  nativeAudioInputRef: React.RefObject<HTMLInputElement>;
  onHandleBaseSoundSelection: (soundId: string) => void;
  onHandleCustomAudioSelection: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearSelectedAudio: () => void;
}

export const FinalizeSoundPanel = ({
  baseSounds,
  selectedBaseSoundId,
  customAudioFile,
  customAudioPreviewUrl,
  nativeAudioInputRef,
  onHandleBaseSoundSelection,
  onHandleCustomAudioSelection,
  onClearSelectedAudio,
}: FinalizeSoundPanelProps) => (
  <div className="space-y-4">
    <div>
      <div className="mb-2 text-sm font-medium text-white">Bibliotheque Skill Up</div>
      <div className="grid gap-2">
        {baseSounds.map((sound) => (
          <button
            key={sound.id}
            type="button"
            onClick={() => onHandleBaseSoundSelection(sound.id)}
            className={`rounded-xl border px-4 py-3 text-left text-sm transition ${selectedBaseSoundId === sound.id ? 'border-orange-400 bg-orange-500/15 text-white' : 'border-white/10 text-zinc-300 hover:bg-white/5'}`}
          >
            {sound.label}
          </button>
        ))}
      </div>
    </div>
    <div className="border-t border-white/10 pt-4">
      <div className="mb-2 text-sm font-medium text-white">Uploader un son</div>
      <input ref={nativeAudioInputRef} type="file" accept="audio/*" onChange={onHandleCustomAudioSelection} className="hidden" />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" className="bg-white/10 text-white hover:bg-white/20" onClick={() => nativeAudioInputRef.current?.click()}>
          <Upload size={16} className="mr-2" />
          Choisir un fichier
        </Button>
        {customAudioFile && (
          <Button type="button" variant="ghost" className="text-zinc-300 hover:bg-white/10 hover:text-white" onClick={onClearSelectedAudio}>
            Retirer le son
          </Button>
        )}
      </div>
    </div>
    {customAudioFile && (
      <div className="space-y-3 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-3">
        <p className="text-sm text-emerald-300">Son actif : {customAudioFile.name}</p>
        {customAudioPreviewUrl && <audio controls preload="metadata" src={customAudioPreviewUrl} className="w-full" />}
        <p className="text-xs text-zinc-400">Cette piste sera appliquee pendant la finalisation de la video.</p>
      </div>
    )}
  </div>
);