// Etape de capture video avec camera, flash, minuterie et controles d'enregistrement.
import { ArrowLeft, Camera, Pause, Play, RefreshCw, Square, Timer, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface VideoCreationRecordStepProps {
  liveVideoRef: React.RefObject<HTMLVideoElement>;
  isRecording: boolean;
  isRecordingPaused: boolean;
  countdownValue: number | null;
  cameraFacingMode: 'user' | 'environment';
  flashEnabled: boolean;
  recordingTimerSeconds: 0 | 3 | 10;
  onClose: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onToggleRecordingPause: () => void;
  onToggleCameraFacingMode: () => void;
  onToggleFlash: () => void;
  onCycleRecordingTimer: () => void;
}

export const VideoCreationRecordStep = ({
  liveVideoRef,
  isRecording,
  isRecordingPaused,
  countdownValue,
  cameraFacingMode,
  flashEnabled,
  recordingTimerSeconds,
  onClose,
  onStartRecording,
  onStopRecording,
  onToggleRecordingPause,
  onToggleCameraFacingMode,
  onToggleFlash,
  onCycleRecordingTimer,
}: VideoCreationRecordStepProps) => (
  <DialogContent className="h-screen max-w-none border-0 bg-black p-0 sm:rounded-none">
    <DialogHeader className="sr-only">
      <DialogTitle>Filmer une video</DialogTitle>
      <DialogDescription>Enregistrez votre video avec les controles camera, flash et minuterie.</DialogDescription>
    </DialogHeader>
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-black">
      <video ref={liveVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />
      {!isRecording && (
        <div className="absolute right-4 top-24 flex flex-col gap-3">
          <button
            type="button"
            onClick={onToggleCameraFacingMode}
            disabled={isRecording || countdownValue !== null}
            className="flex w-20 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium text-white transition hover:text-orange-300 disabled:opacity-50"
            title="Basculer la camera"
          >
            <RefreshCw size={22} />
            <span className="text-center leading-tight">{cameraFacingMode === 'user' ? 'Avant' : 'Arriere'}</span>
          </button>
          <button
            type="button"
            onClick={onToggleFlash}
            disabled={isRecording || countdownValue !== null}
            className={`flex w-20 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition disabled:opacity-50 ${flashEnabled ? 'text-orange-400' : 'text-white hover:text-orange-300'}`}
            title="Activer le flash"
          >
            <Zap size={22} />
            <span className="text-center leading-tight">Flash {flashEnabled ? 'on' : 'off'}</span>
          </button>
          <button
            type="button"
            onClick={onCycleRecordingTimer}
            disabled={isRecording || countdownValue !== null}
            className="flex w-20 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium text-white transition hover:text-orange-300 disabled:opacity-50"
            title="Configurer la minuterie"
          >
            <Timer size={22} />
            <span className="text-center leading-tight">{recordingTimerSeconds === 0 ? 'Timer off' : `${recordingTimerSeconds}s`}</span>
          </button>
        </div>
      )}
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between p-5 text-white">
        <Button type="button" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={onClose}>
          <ArrowLeft size={18} className="mr-2" />
          Retour
        </Button>
        <div className="rounded-full bg-black/30 px-4 py-2 text-sm">Mode filmer</div>
      </div>
      {countdownValue !== null && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-black/55 px-10 py-8 text-6xl font-semibold text-white backdrop-blur-sm">
            {countdownValue}
          </div>
        </div>
      )}
      <div className="absolute bottom-10 left-0 right-0 flex items-center justify-center gap-6">
        <Button type="button" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={onClose}>
          Annuler
        </Button>
        {!isRecording ? (
          <button type="button" onClick={onStartRecording} className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-red-600 shadow-[0_0_40px_rgba(255,70,70,0.45)]">
            <Camera size={28} className="text-white" />
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <button type="button" onClick={onToggleRecordingPause} className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/80 bg-black/35 text-white shadow-[0_0_28px_rgba(0,0,0,0.28)]">
              {isRecordingPaused ? <Play size={22} className="fill-white" /> : <Pause size={22} className="fill-white" />}
            </button>
            <button type="button" onClick={onStopRecording} className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white text-black shadow-[0_0_40px_rgba(255,255,255,0.35)]">
              <Square size={22} className="fill-black" />
            </button>
          </div>
        )}
        <div className="min-w-[120px] text-center text-sm text-zinc-200">{isRecording ? (isRecordingPaused ? 'En pause' : 'Enregistrement') : countdownValue !== null ? 'Demarrage...' : 'Pret'}</div>
      </div>
    </div>
  </DialogContent>
);