/**
 * Page de création de vidéo style TikTok
 * Ouvre directement la caméra avec des onglets en bas : Filmer, Live, URL, Upload
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Link as LinkIcon,
  Loader2,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Square,
  Timer,
  Upload,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import VideoCreationFlowDialog from '@/components/admin/video/VideoCreationFlowDialog';

type CreationTab = 'record' | 'live' | 'url' | 'upload';

const UploadVideo = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<CreationTab>('record');
  const [showFullDialog, setShowFullDialog] = useState(false);
  const [dialogInitialMethod, setDialogInitialMethod] = useState<'record' | 'upload' | 'url' | null>(null);
  const [dialogSourceVideoFile, setDialogSourceVideoFile] = useState<File | null>(null);
  const [showLiveDialog, setShowLiveDialog] = useState(false);

  // Camera state
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [recordingTimerSeconds, setRecordingTimerSeconds] = useState<0 | 3 | 10>(0);
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const countdownIntervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Start camera when on record tab
  useEffect(() => {
    if (activeTab === 'record') {
      void startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [activeTab]);

  const startCamera = async (facingMode: 'user' | 'environment' = cameraFacingMode) => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
      }
      setCameraReady(true);
    } catch {
      toast.error("Impossible d'accéder à la caméra.");
      setCameraReady(false);
    }
  };

  const stopCamera = () => {
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdownValue(null);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  };

  const toggleCameraFacingMode = async () => {
    if (isRecording || countdownValue !== null) return;
    const next = cameraFacingMode === 'user' ? 'environment' : 'user';
    setCameraFacingMode(next);
    if (next === 'user') setFlashEnabled(false);
    await startCamera(next);
  };

  const toggleFlash = async () => {
    if (cameraFacingMode !== 'environment') {
      toast.error("Le flash n'est disponible qu'avec la caméra arrière.");
      return;
    }
    const track = streamRef.current?.getVideoTracks()?.[0] as any;
    if (!track?.getCapabilities?.()?.torch) {
      toast.error('Flash indisponible.');
      return;
    }
    const next = !flashEnabled;
    await track.applyConstraints({ advanced: [{ torch: next }] });
    setFlashEnabled(next);
  };

  const cycleTimer = () => {
    setRecordingTimerSeconds((c) => (c === 0 ? 3 : c === 3 ? 10 : 0));
  };

  const startRecordingNow = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    let options: MediaRecorderOptions = { mimeType: 'video/webm;codecs=vp8,opus' };
    if (!MediaRecorder.isTypeSupported(options.mimeType || '')) {
      options = { mimeType: 'video/webm' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/mp4' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) options = {};
      }
    }
    const recorder = new MediaRecorder(streamRef.current, options.mimeType ? options : undefined);
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onpause = () => setIsRecordingPaused(true);
    recorder.onresume = () => setIsRecordingPaused(false);
    recorder.onstop = () => {
      const mimeType = recorder.mimeType || 'video/webm';
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const file = new File([blob], `video_${Date.now()}.${ext}`, { type: mimeType });
      // Open the full dialog with the recorded file
      stopCamera();
      setIsRecording(false);
      setIsRecordingPaused(false);
      setDialogInitialMethod('record');
      setDialogSourceVideoFile(file);
      setShowFullDialog(true);
    };
    recorder.start(150);
    setIsRecording(true);
    setIsRecordingPaused(false);
  };

  const startRecording = () => {
    if (!streamRef.current || countdownValue !== null) return;
    if (recordingTimerSeconds === 0) { startRecordingNow(); return; }
    let remaining = recordingTimerSeconds;
    setCountdownValue(remaining);
    countdownIntervalRef.current = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        if (countdownIntervalRef.current) window.clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
        setCountdownValue(null);
        startRecordingNow();
        return;
      }
      setCountdownValue(remaining);
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording' || mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsRecordingPaused(false);
  };

  const togglePause = () => {
    const r = mediaRecorderRef.current;
    if (!r) return;
    if (r.state === 'recording') r.pause();
    else if (r.state === 'paused') r.resume();
  };

  const handleTabChange = (tab: CreationTab) => {
    if (isRecording) return; // Don't switch while recording

    if (tab === 'upload') {
      fileInputRef.current?.click();
      return;
    }
    if (tab === 'url') {
      stopCamera();
      setDialogInitialMethod('url');
      setDialogSourceVideoFile(null);
      setShowFullDialog(true);
      return;
    }
    if (tab === 'live') {
      stopCamera();
      setShowLiveDialog(true);
      return;
    }
    setActiveTab(tab);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopCamera();
    setDialogInitialMethod('upload');
    setDialogSourceVideoFile(file);
    setShowFullDialog(true);
    e.target.value = '';
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setShowFullDialog(false);
      setDialogInitialMethod(null);
      setDialogSourceVideoFile(null);
      // Restart camera
      setActiveTab('record');
    }
  };

  const handleLiveDialogClose = (open: boolean) => {
    if (!open) {
      setShowLiveDialog(false);
      setActiveTab('record');
    }
  };

  const tabs: { id: CreationTab; label: string; icon: React.ElementType }[] = [
    { id: 'live', label: 'Live', icon: Radio },
    { id: 'record', label: 'Filmer', icon: Camera },
    { id: 'url', label: 'URL', icon: LinkIcon },
    { id: 'upload', label: 'Upload', icon: Upload },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      {/* Camera preview */}
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

        {/* Top bar */}
        <div className="absolute left-0 right-0 top-0 flex items-center justify-between p-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 rounded-full bg-black/30 px-3 py-2 text-sm font-medium backdrop-blur-sm"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Retour</span>
          </button>
          <div className="rounded-full bg-black/30 px-4 py-2 text-sm font-medium backdrop-blur-sm">
            {isRecording ? (isRecordingPaused ? 'En pause' : '● REC') : 'Créer'}
          </div>
        </div>

        {/* Right side controls (when not recording) */}
        {!isRecording && activeTab === 'record' && (
          <div className="absolute right-3 top-1/2 flex -translate-y-1/2 flex-col gap-3">
            <button
              onClick={() => void toggleCameraFacingMode()}
              disabled={countdownValue !== null}
              className="flex flex-col items-center gap-1 rounded-2xl p-2 text-[11px] font-medium text-white transition hover:text-orange-300 disabled:opacity-50"
            >
              <RefreshCw size={22} />
              <span>{cameraFacingMode === 'user' ? 'Avant' : 'Arrière'}</span>
            </button>
            <button
              onClick={() => void toggleFlash()}
              disabled={countdownValue !== null}
              className={`flex flex-col items-center gap-1 rounded-2xl p-2 text-[11px] font-medium transition disabled:opacity-50 ${flashEnabled ? 'text-orange-400' : 'text-white hover:text-orange-300'}`}
            >
              <Zap size={22} />
              <span>Flash {flashEnabled ? 'on' : 'off'}</span>
            </button>
            <button
              onClick={cycleTimer}
              disabled={countdownValue !== null}
              className="flex flex-col items-center gap-1 rounded-2xl p-2 text-[11px] font-medium text-white transition hover:text-orange-300 disabled:opacity-50"
            >
              <Timer size={22} />
              <span>{recordingTimerSeconds === 0 ? 'Timer off' : `${recordingTimerSeconds}s`}</span>
            </button>
          </div>
        )}

        {/* Countdown overlay */}
        {countdownValue !== null && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-full bg-black/55 px-10 py-8 text-6xl font-semibold text-white backdrop-blur-sm">
              {countdownValue}
            </div>
          </div>
        )}
      </div>

      {/* Bottom section: record button + tabs */}
      <div className="relative bg-black/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        {/* Record / Stop button */}
        <div className="flex items-center justify-center gap-4 py-4">
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={!cameraReady || activeTab !== 'record'}
              className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-[4px] border-white bg-red-600 shadow-[0_0_40px_rgba(255,70,70,0.4)] transition hover:scale-105 disabled:opacity-40"
            >
              <Camera size={28} className="text-white" />
            </button>
          ) : (
            <div className="flex items-center gap-4">
              <button
                onClick={togglePause}
                className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/80 bg-black/35 text-white shadow-lg"
              >
                {isRecordingPaused ? <Play size={22} className="fill-white" /> : <Pause size={22} className="fill-white" />}
              </button>
              <button
                onClick={stopRecording}
                className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-[4px] border-white bg-white text-black shadow-[0_0_40px_rgba(255,255,255,0.35)] transition hover:scale-105"
              >
                <Square size={22} className="fill-black" />
              </button>
            </div>
          )}
        </div>

        {/* Tab bar */}
        {!isRecording && (
          <div className="flex items-center justify-center gap-1 pb-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Hidden file input for upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Full creation dialog (for finalize, details, URL) */}
      <VideoCreationFlowDialog
        open={showFullDialog}
        onOpenChange={handleDialogClose}
        initialMethod={dialogInitialMethod}
        initialSourceVideoFile={dialogSourceVideoFile}
        onSuccess={() => {
          setShowFullDialog(false);
          setDialogSourceVideoFile(null);
          navigate('/profil');
        }}
      />

      {/* Live setup dialog — opens directly on the live configuration step */}
      <VideoCreationFlowDialog
        open={showLiveDialog}
        onOpenChange={handleLiveDialogClose}
        initialStep="live"
      />
    </div>
  );
};

export default UploadVideo;
