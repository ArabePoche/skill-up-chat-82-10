// Hook d'orchestration du flux de creation video : etat, effets, refs et handlers metier.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useFormations } from '@/hooks/useFormations';
import { supabase } from '@/integrations/supabase/client';
import { isSingleActiveLiveViolation } from '@/live/lib/userLiveShared';
import type { LiveTeachingStudio } from '@/live/types';
import { NotificationTriggers } from '@/utils/notificationHelpers';
import {
  captureThumbnailFromVideoElement,
  captureVideoThumbnail,
  composeVideoForPublish,
  getOverlayTransformFromPosition,
  type OverlayTransform,
  type StickerOverlayItem,
  type TextOverlayItem,
  type TextOverlayStyle,
} from '@/utils/videoComposer';
import { BASE_SOUNDS, DEFAULT_THUMBNAIL_RATIO, getDefaultCreationState } from '../constants';
import type {
  CreationMethod,
  EditableOverlayKind,
  FinalizeOverlay,
  FlowStep,
  LiveFormData,
  LiveVisibility,
  OverlayPointerInteraction,
  OverlaySelection,
  OverlayTouchInteraction,
  VideoCreationFlowDialogProps,
  VideoFormData,
} from '../types';
import { clampOverlayTransform, createOverlayId, getDisplayName } from '../utils';

type UseVideoCreationFlowParams = Pick<
  VideoCreationFlowDialogProps,
  'open' | 'onOpenChange' | 'onSuccess' | 'initialStep' | 'initialMethod' | 'initialSourceVideoFile'
>;

const getInitialFormData = (): VideoFormData => ({
  title: '',
  description: '',
  video_type: 'classic',
  formation_id: '',
});

const getInitialLiveData = (): LiveFormData => ({
  title: '',
  description: '',
  visibility: 'public',
  isPaid: false,
  entryPrice: '',
  isScheduled: false,
  scheduledDate: '',
  scheduledTime: '',
  maxAttendees: '',
});

const DEFAULT_TEXT_STYLE: TextOverlayStyle = {
  color: '#FFFFFF',
  fontFamily: 'Segoe UI',
  fontWeight: 'bold',
  fontStyle: 'normal',
  textDecoration: 'none',
};

export const useVideoCreationFlow = ({
  open,
  onOpenChange,
  onSuccess,
  initialStep,
  initialMethod,
  initialSourceVideoFile,
}: UseVideoCreationFlowParams) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { uploadFile, isUploading } = useFileUpload();
  const { data: allFormations = [] } = useFormations();

  const formations = useMemo(() => {
    if (profile?.role === 'admin') {
      return allFormations;
    }

    return allFormations.filter((formation) => formation.author_id === user?.id);
  }, [allFormations, profile?.role, user?.id]);

  const [step, setStep] = useState<FlowStep>(initialStep ?? getDefaultCreationState().step);
  const [method, setMethod] = useState<CreationMethod | null>(getDefaultCreationState().method);
  const [sourceVideoFile, setSourceVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [customAudioFile, setCustomAudioFile] = useState<File | null>(null);
  const [selectedBaseSoundId, setSelectedBaseSoundId] = useState<string | null>(null);
  const [stickerOverlays, setStickerOverlays] = useState<StickerOverlayItem[]>([]);
  const [textOverlays, setTextOverlays] = useState<TextOverlayItem[]>([]);
  const [textDraft, setTextDraft] = useState('');
  const [textColorDraft, setTextColorDraft] = useState(DEFAULT_TEXT_STYLE.color);
  const [textFontFamilyDraft, setTextFontFamilyDraft] = useState(DEFAULT_TEXT_STYLE.fontFamily);
  const [textBoldDraft, setTextBoldDraft] = useState(DEFAULT_TEXT_STYLE.fontWeight === 'bold');
  const [textItalicDraft, setTextItalicDraft] = useState(DEFAULT_TEXT_STYLE.fontStyle === 'italic');
  const [textUnderlineDraft, setTextUnderlineDraft] = useState(DEFAULT_TEXT_STYLE.textDecoration === 'underline');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [recordingTimerSeconds, setRecordingTimerSeconds] = useState<0 | 3 | 10>(0);
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const [activeFinalizeOverlay, setActiveFinalizeOverlay] = useState<FinalizeOverlay>(null);
  const [formData, setFormData] = useState<VideoFormData>(getInitialFormData());
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState('');
  const [isLaunchingLive, setIsLaunchingLive] = useState(false);
  const [preparedStudio, setPreparedStudio] = useState<LiveTeachingStudio | null>(null);
  const [isStudioEditorOpen, setIsStudioEditorOpen] = useState(false);
  const [selectedOverlay, setSelectedOverlay] = useState<OverlaySelection>(null);
  const [previewAspectRatio, setPreviewAspectRatio] = useState(9 / 16);
  const [liveData, setLiveData] = useState<LiveFormData>(getInitialLiveData());

  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const countdownIntervalRef = useRef<number | null>(null);
  const nativeAudioInputRef = useRef<HTMLInputElement>(null);
  const detailsPreviewVideoRef = useRef<HTMLVideoElement>(null);
  const finalizeStageRef = useRef<HTMLDivElement>(null);
  const pointerInteractionRef = useRef<OverlayPointerInteraction | null>(null);
  const touchInteractionRef = useRef<OverlayTouchInteraction | null>(null);

  const sourcePreviewUrl = useMemo(() => (sourceVideoFile ? URL.createObjectURL(sourceVideoFile) : ''), [sourceVideoFile]);
  const thumbnailPreviewUrl = useMemo(() => (thumbnailFile ? URL.createObjectURL(thumbnailFile) : ''), [thumbnailFile]);
  const customAudioPreviewUrl = useMemo(() => (customAudioFile ? URL.createObjectURL(customAudioFile) : ''), [customAudioFile]);
  const detailsPreviewSource = method === 'url' ? videoUrl.trim() : sourcePreviewUrl;

  const resetFlow = () => {
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    const defaultState = getDefaultCreationState();
    setStep(initialStep ?? defaultState.step);
    setMethod(defaultState.method);
    setSourceVideoFile(null);
    setVideoUrl('');
    setCustomAudioFile(null);
    setSelectedBaseSoundId(null);
    setStickerOverlays([]);
    setTextOverlays([]);
    setTextDraft('');
    setTextColorDraft(DEFAULT_TEXT_STYLE.color);
    setTextFontFamilyDraft(DEFAULT_TEXT_STYLE.fontFamily);
    setTextBoldDraft(DEFAULT_TEXT_STYLE.fontWeight === 'bold');
    setTextItalicDraft(DEFAULT_TEXT_STYLE.fontStyle === 'italic');
    setTextUnderlineDraft(DEFAULT_TEXT_STYLE.textDecoration === 'underline');
    setThumbnailFile(null);
    setCameraFacingMode('user');
    setFlashEnabled(false);
    setRecordingTimerSeconds(0);
    setCountdownValue(null);
    setActiveFinalizeOverlay(null);
    setFormData(getInitialFormData());
    setIsRecording(false);
    setIsRecordingPaused(false);
    setIsProcessing(false);
    setProcessingLabel('');
    setIsLaunchingLive(false);
    setSelectedOverlay(null);
    setPreviewAspectRatio(9 / 16);
    setLiveData(getInitialLiveData());
    setPreparedStudio(null);
  };

  const stopRecordingDevices = () => {
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    setCountdownValue(null);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    return () => {
      if (sourcePreviewUrl) {
        URL.revokeObjectURL(sourcePreviewUrl);
      }
    };
  }, [sourcePreviewUrl]);

  useEffect(() => {
    return () => {
      if (thumbnailPreviewUrl) {
        URL.revokeObjectURL(thumbnailPreviewUrl);
      }
    };
  }, [thumbnailPreviewUrl]);

  useEffect(() => {
    return () => {
      if (customAudioPreviewUrl) {
        URL.revokeObjectURL(customAudioPreviewUrl);
      }
    };
  }, [customAudioPreviewUrl]);

  useEffect(() => {
    if (!open) {
      stopRecordingDevices();
      resetFlow();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (initialStep === 'live') {
      setMethod(null);
      setSourceVideoFile(null);
      setStep('live');
      return;
    }

    if (initialMethod === 'upload' && initialSourceVideoFile) {
      setMethod('upload');
      setSourceVideoFile(initialSourceVideoFile);
      setStep('details');
      return;
    }

    if (initialMethod === 'record' && initialSourceVideoFile) {
      setMethod('record');
      setSourceVideoFile(initialSourceVideoFile);
      setStep('finalize');
      return;
    }

    if (initialMethod === 'url') {
      setMethod('url');
      setSourceVideoFile(null);
      setStep('details');
      return;
    }

    const defaultState = getDefaultCreationState();
    setMethod(defaultState.method);
    setSourceVideoFile(null);
    setStep(initialStep ?? defaultState.step);
  }, [open, initialMethod, initialSourceVideoFile, initialStep]);

  const applyTorchConstraint = async (stream: MediaStream | null, enabled: boolean) => {
    const track = stream?.getVideoTracks()?.[0] as MediaStreamTrack & {
      getCapabilities?: () => MediaTrackCapabilities & { torch?: boolean };
      applyConstraints?: (constraints: MediaTrackConstraints) => Promise<void>;
    };

    if (!track?.applyConstraints || !track?.getCapabilities) {
      return false;
    }

    const capabilities = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
    if (!capabilities?.torch) {
      return false;
    }

    await track.applyConstraints({ advanced: [{ torch: enabled } as MediaTrackConstraintSet] });
    return true;
  };

  const startRecordingDevices = async (
    nextFacingMode: 'user' | 'environment' = cameraFacingMode,
    nextFlashEnabled: boolean = flashEnabled
  ) => {
    stopRecordingDevices();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextFacingMode, width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: true,
      });

      streamRef.current = stream;
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.muted = true;
      }

      if (nextFlashEnabled) {
        const torchApplied = await applyTorchConstraint(stream, true);
        if (!torchApplied) {
          setFlashEnabled(false);
          toast.error('Flash indisponible sur cette camera.');
        }
      }
    } catch (error) {
      console.error('Erreur acces camera:', error);
      toast.error('Impossible d\'acceder a la camera et au microphone.');
      setStep('details');
    }
  };

  useEffect(() => {
    if (open && step === 'record') {
      void startRecordingDevices();
    }

    if (step !== 'record') {
      stopRecordingDevices();
    }
  }, [open, step]);

  const getOverlayTransform = (kind: EditableOverlayKind, overlayId: string) => {
    const overlays = kind === 'sticker' ? stickerOverlays : textOverlays;
    return overlays.find((overlay) => overlay.id === overlayId)?.transform ?? getOverlayTransformFromPosition('center', 1);
  };

  const setOverlayTransform = (kind: EditableOverlayKind, overlayId: string, nextTransform: OverlayTransform) => {
    const clampedTransform = clampOverlayTransform(nextTransform);
    if (kind === 'sticker') {
      setStickerOverlays((current) => current.map((overlay) => overlay.id === overlayId ? { ...overlay, transform: clampedTransform } : overlay));
      return;
    }

    setTextOverlays((current) => current.map((overlay) => overlay.id === overlayId ? { ...overlay, transform: clampedTransform } : overlay));
  };

  const getStageRect = () => finalizeStageRef.current?.getBoundingClientRect() ?? null;

  const beginPointerInteraction = (
    event: React.PointerEvent<HTMLDivElement | HTMLButtonElement>,
    kind: EditableOverlayKind,
    overlayId: string,
    mode: 'drag' | 'resize'
  ) => {
    if (event.pointerType === 'touch') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setSelectedOverlay({ kind, id: overlayId });
    pointerInteractionRef.current = {
      kind,
      overlayId,
      mode,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startTransform: getOverlayTransform(kind, overlayId),
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>, kind: EditableOverlayKind, overlayId: string) => {
    const interaction = pointerInteractionRef.current;
    if (!interaction || interaction.kind !== kind || interaction.overlayId !== overlayId || interaction.pointerId !== event.pointerId || event.pointerType === 'touch') {
      return;
    }

    const rect = getStageRect();
    if (!rect) {
      return;
    }

    event.preventDefault();

    if (interaction.mode === 'drag') {
      const deltaX = (event.clientX - interaction.startClientX) / rect.width;
      const deltaY = (event.clientY - interaction.startClientY) / rect.height;
      setOverlayTransform(kind, overlayId, {
        ...interaction.startTransform,
        x: interaction.startTransform.x + deltaX,
        y: interaction.startTransform.y + deltaY,
      });
      return;
    }

    const delta = (event.clientX - interaction.startClientX - (event.clientY - interaction.startClientY)) / Math.min(rect.width, rect.height);
    setOverlayTransform(kind, overlayId, {
      ...interaction.startTransform,
      scale: interaction.startTransform.scale + delta * 1.6,
    });
  };

  const endPointerInteraction = (event: React.PointerEvent<HTMLDivElement>, kind: EditableOverlayKind, overlayId: string) => {
    const interaction = pointerInteractionRef.current;
    if (!interaction || interaction.kind !== kind || interaction.overlayId !== overlayId || interaction.pointerId !== event.pointerId) {
      return;
    }

    event.currentTarget.releasePointerCapture?.(event.pointerId);
    pointerInteractionRef.current = null;
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>, kind: EditableOverlayKind, overlayId: string) => {
    const rect = getStageRect();
    if (!rect) {
      return;
    }

    setSelectedOverlay({ kind, id: overlayId });

    if (event.touches.length === 1) {
      const touch = event.touches[0];
      touchInteractionRef.current = {
        kind,
        overlayId,
        mode: 'drag',
        startTransform: getOverlayTransform(kind, overlayId),
        startCenterX: touch.clientX,
        startCenterY: touch.clientY,
        startDistance: 0,
      };
      return;
    }

    if (event.touches.length >= 2) {
      event.preventDefault();
      const [firstTouch, secondTouch] = Array.from(event.touches);
      const centerX = (firstTouch.clientX + secondTouch.clientX) / 2;
      const centerY = (firstTouch.clientY + secondTouch.clientY) / 2;
      const distance = Math.hypot(secondTouch.clientX - firstTouch.clientX, secondTouch.clientY - firstTouch.clientY);
      touchInteractionRef.current = {
        kind,
        overlayId,
        mode: 'pinch',
        startTransform: getOverlayTransform(kind, overlayId),
        startCenterX: centerX,
        startCenterY: centerY,
        startDistance: Math.max(distance, 1),
      };
    }
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>, kind: EditableOverlayKind, overlayId: string) => {
    const interaction = touchInteractionRef.current;
    const rect = getStageRect();
    if (!interaction || interaction.kind !== kind || interaction.overlayId !== overlayId || !rect) {
      return;
    }

    if (interaction.mode === 'drag' && event.touches.length === 1) {
      event.preventDefault();
      const touch = event.touches[0];
      const deltaX = (touch.clientX - interaction.startCenterX) / rect.width;
      const deltaY = (touch.clientY - interaction.startCenterY) / rect.height;
      setOverlayTransform(kind, overlayId, {
        ...interaction.startTransform,
        x: interaction.startTransform.x + deltaX,
        y: interaction.startTransform.y + deltaY,
      });
      return;
    }

    if (event.touches.length >= 2) {
      event.preventDefault();
      const [firstTouch, secondTouch] = Array.from(event.touches);
      const centerX = (firstTouch.clientX + secondTouch.clientX) / 2;
      const centerY = (firstTouch.clientY + secondTouch.clientY) / 2;
      const distance = Math.hypot(secondTouch.clientX - firstTouch.clientX, secondTouch.clientY - firstTouch.clientY);
      const deltaX = (centerX - interaction.startCenterX) / rect.width;
      const deltaY = (centerY - interaction.startCenterY) / rect.height;
      const scaleRatio = Math.max(distance, 1) / Math.max(interaction.startDistance, 1);

      setOverlayTransform(kind, overlayId, {
        x: interaction.startTransform.x + deltaX,
        y: interaction.startTransform.y + deltaY,
        scale: interaction.startTransform.scale * scaleRatio,
      });
    }
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>, kind: EditableOverlayKind, overlayId: string) => {
    const interaction = touchInteractionRef.current;
    if (!interaction || interaction.kind !== kind || interaction.overlayId !== overlayId) {
      return;
    }

    if (event.touches.length === 1) {
      const touch = event.touches[0];
      touchInteractionRef.current = {
        kind,
        overlayId,
        mode: 'drag',
        startTransform: getOverlayTransform(kind, overlayId),
        startCenterX: touch.clientX,
        startCenterY: touch.clientY,
        startDistance: 0,
      };
      return;
    }

    if (event.touches.length === 0) {
      touchInteractionRef.current = null;
    }
  };

  const resetOverlayTransform = (kind: EditableOverlayKind) => {
    if (!selectedOverlay || selectedOverlay.kind !== kind) {
      return;
    }

    setOverlayTransform(kind, selectedOverlay.id, getOverlayTransformFromPosition(kind === 'sticker' ? 'bottom-right' : 'center', 1));
  };

  useEffect(() => {
    if (!selectedOverlay || selectedOverlay.kind !== 'text') {
      return;
    }

    const selectedText = textOverlays.find((overlay) => overlay.id === selectedOverlay.id);
    setTextDraft(selectedText?.text ?? '');
    setTextColorDraft(selectedText?.style.color ?? DEFAULT_TEXT_STYLE.color);
    setTextFontFamilyDraft(selectedText?.style.fontFamily ?? DEFAULT_TEXT_STYLE.fontFamily);
    setTextBoldDraft((selectedText?.style.fontWeight ?? DEFAULT_TEXT_STYLE.fontWeight) === 'bold');
    setTextItalicDraft((selectedText?.style.fontStyle ?? DEFAULT_TEXT_STYLE.fontStyle) === 'italic');
    setTextUnderlineDraft((selectedText?.style.textDecoration ?? DEFAULT_TEXT_STYLE.textDecoration) === 'underline');
  }, [selectedOverlay, textOverlays]);

  const removeSelectedOverlay = (kind: EditableOverlayKind) => {
    if (!selectedOverlay || selectedOverlay.kind !== kind) {
      return;
    }

    if (kind === 'sticker') {
      setStickerOverlays((current) => current.filter((overlay) => overlay.id !== selectedOverlay.id));
    } else {
      setTextOverlays((current) => current.filter((overlay) => overlay.id !== selectedOverlay.id));
      setTextDraft('');
      setTextColorDraft(DEFAULT_TEXT_STYLE.color);
      setTextFontFamilyDraft(DEFAULT_TEXT_STYLE.fontFamily);
      setTextBoldDraft(DEFAULT_TEXT_STYLE.fontWeight === 'bold');
      setTextItalicDraft(DEFAULT_TEXT_STYLE.fontStyle === 'italic');
      setTextUnderlineDraft(DEFAULT_TEXT_STYLE.textDecoration === 'underline');
    }

    setSelectedOverlay(null);
  };

  const addStickerOverlay = (emoji: string) => {
    const overlayId = createOverlayId();
    setStickerOverlays((current) => [...current, {
      id: overlayId,
      emoji,
      transform: getOverlayTransformFromPosition('center', 1),
    }]);
    setSelectedOverlay({ kind: 'sticker', id: overlayId });
  };

  const addTextOverlay = () => {
    const overlayId = createOverlayId();
    const nextText = '';
    const nextStyle = {
      color: DEFAULT_TEXT_STYLE.color,
      fontFamily: DEFAULT_TEXT_STYLE.fontFamily,
      fontWeight: DEFAULT_TEXT_STYLE.fontWeight,
      fontStyle: DEFAULT_TEXT_STYLE.fontStyle,
      textDecoration: DEFAULT_TEXT_STYLE.textDecoration,
    };

    setTextOverlays((current) => [...current, {
      id: overlayId,
      text: nextText,
      transform: getOverlayTransformFromPosition('center', 1),
      style: nextStyle,
    }]);
    setTextDraft(nextText);
    setTextColorDraft(nextStyle.color);
    setTextFontFamilyDraft(nextStyle.fontFamily);
    setTextBoldDraft(nextStyle.fontWeight === 'bold');
    setTextItalicDraft(nextStyle.fontStyle === 'italic');
    setTextUnderlineDraft(nextStyle.textDecoration === 'underline');
    setSelectedOverlay({ kind: 'text', id: overlayId });
  };

  const updateSelectedTextOverlay = (value: string) => {
    setTextDraft(value);

    if (!selectedOverlay || selectedOverlay.kind !== 'text') {
      return;
    }

    setTextOverlays((current) => current.map((overlay) => overlay.id === selectedOverlay.id ? { ...overlay, text: value } : overlay));
  };

  const updateSelectedTextStyle = (style: Partial<TextOverlayStyle>) => {
    const nextColor = style.color ?? textColorDraft;
    const nextFontFamily = style.fontFamily ?? textFontFamilyDraft;
    const nextFontWeight = style.fontWeight ?? (textBoldDraft ? 'bold' : 'normal');
    const nextFontStyle = style.fontStyle ?? (textItalicDraft ? 'italic' : 'normal');
    const nextTextDecoration = style.textDecoration ?? (textUnderlineDraft ? 'underline' : 'none');

    setTextColorDraft(nextColor);
    setTextFontFamilyDraft(nextFontFamily);
    setTextBoldDraft(nextFontWeight === 'bold');
    setTextItalicDraft(nextFontStyle === 'italic');
    setTextUnderlineDraft(nextTextDecoration === 'underline');

    if (!selectedOverlay || selectedOverlay.kind !== 'text') {
      return;
    }

    setTextOverlays((current) => current.map((overlay) => (
      overlay.id === selectedOverlay.id
        ? {
            ...overlay,
            style: {
              color: style.color ?? overlay.style.color,
              fontFamily: style.fontFamily ?? overlay.style.fontFamily,
              fontWeight: style.fontWeight ?? overlay.style.fontWeight,
              fontStyle: style.fontStyle ?? overlay.style.fontStyle,
              textDecoration: style.textDecoration ?? overlay.style.textDecoration,
            },
          }
        : overlay
    )));
  };

  const startRecordingNow = () => {
    if (!streamRef.current) {
      return;
    }

    chunksRef.current = [];
    let options: MediaRecorderOptions = { mimeType: 'video/webm;codecs=vp8,opus' };
    if (!MediaRecorder.isTypeSupported(options.mimeType || '')) {
      options = { mimeType: 'video/webm' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/mp4' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = {};
        }
      }
    }

    const recorder = new MediaRecorder(streamRef.current, options.mimeType ? options : undefined);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onpause = () => {
      setIsRecordingPaused(true);
    };

    recorder.onresume = () => {
      setIsRecordingPaused(false);
    };

    recorder.onstop = () => {
      const mimeType = recorder.mimeType || 'video/webm';
      const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const file = new File([blob], `video_${Date.now()}.${extension}`, { type: mimeType });
      setSourceVideoFile(file);
      setIsRecordingPaused(false);
      setStep('finalize');
    };

    recorder.start(150);
    setIsRecording(true);
    setIsRecordingPaused(false);
  };

  const startRecording = () => {
    if (!streamRef.current || countdownValue !== null) {
      return;
    }

    if (recordingTimerSeconds === 0) {
      startRecordingNow();
      return;
    }

    let remainingSeconds = recordingTimerSeconds;
    setCountdownValue(remainingSeconds);

    countdownIntervalRef.current = window.setInterval(() => {
      remainingSeconds -= 1;

      if (remainingSeconds <= 0) {
        if (countdownIntervalRef.current) {
          window.clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }

        setCountdownValue(null);
        startRecordingNow();
        return;
      }

      setCountdownValue(remainingSeconds);
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording' || mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsRecordingPaused(false);
  };

  const toggleRecordingPause = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      return;
    }

    if (recorder.state === 'recording') {
      recorder.pause();
      setIsRecordingPaused(true);
      return;
    }

    if (recorder.state === 'paused') {
      recorder.resume();
      setIsRecordingPaused(false);
    }
  };

  const toggleCameraFacingMode = async () => {
    if (isRecording || countdownValue !== null) {
      return;
    }

    const nextFacingMode = cameraFacingMode === 'user' ? 'environment' : 'user';
    setCameraFacingMode(nextFacingMode);

    const nextFlashEnabled = nextFacingMode === 'environment' ? flashEnabled : false;
    if (nextFacingMode === 'user') {
      setFlashEnabled(false);
    }

    if (open && step === 'record') {
      await startRecordingDevices(nextFacingMode, nextFlashEnabled);
    }
  };

  const toggleFlash = async () => {
    if (cameraFacingMode !== 'environment') {
      toast.error('Le flash n\'est disponible qu\'avec la camera arriere.');
      return;
    }

    const nextFlashEnabled = !flashEnabled;
    setFlashEnabled(nextFlashEnabled);

    const torchApplied = await applyTorchConstraint(streamRef.current, nextFlashEnabled);
    if (!torchApplied) {
      setFlashEnabled(false);
      toast.error('Flash indisponible sur cet appareil.');
    }
  };

  const cycleRecordingTimer = () => {
    setRecordingTimerSeconds((current) => (current === 0 ? 3 : current === 3 ? 10 : 0));
  };

  const notifyAudienceAboutVideo = async (videoId: string, videoTitle?: string | null) => {
    if (!user?.id) {
      return;
    }

    const [{ data: followRows, error: followsError }, { data: friendRows, error: friendsError }] = await Promise.all([
      supabase.from('user_follows').select('follower_id').eq('following_id', user.id),
      supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .eq('status', 'accepted')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`),
    ]);

    if (followsError) {
      throw followsError;
    }
    if (friendsError) {
      throw friendsError;
    }

    const recipientIds = Array.from(new Set([
      ...(followRows || []).map((row) => row.follower_id),
      ...(friendRows || []).map((row) => (row.sender_id === user.id ? row.receiver_id : row.sender_id)),
    ].filter((recipientId): recipientId is string => !!recipientId && recipientId !== user.id)));

    if (recipientIds.length === 0) {
      return;
    }

    const authorName = getDisplayName(profile);
    const message = `${authorName} a publie une nouvelle video${videoTitle ? ` : "${videoTitle}"` : ''}`;

    const { error: notificationsError } = await supabase.from('notifications').insert(
      recipientIds.map((recipientId) => ({
        user_id: recipientId,
        sender_id: user.id,
        title: 'Nouvelle video publiee',
        message,
        type: 'new_video',
        video_id: videoId,
        is_read: false,
        is_for_all_admins: false,
      }))
    );

    if (notificationsError) {
      throw notificationsError;
    }

    try {
      await NotificationTriggers.onVideoPublished(recipientIds, videoId, authorName, videoTitle);
    } catch (pushError) {
      console.error('Erreur push nouvelle video:', pushError);
    }
  };

  const notifyAudienceAboutLive = async (liveStreamId: string, liveTitle: string, visibility: LiveVisibility) => {
    if (!user?.id) {
      return;
    }

    const [{ data: followRows, error: followsError }, { data: friendRows, error: friendsError }] = await Promise.all([
      supabase.from('user_follows').select('follower_id').eq('following_id', user.id),
      supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .eq('status', 'accepted')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`),
    ]);

    if (followsError) {
      throw followsError;
    }

    if (friendsError) {
      throw friendsError;
    }

    const recipientIds = Array.from(new Set([
      ...(followRows || []).map((row) => row.follower_id),
      ...(friendRows || []).map((row) => (row.sender_id === user.id ? row.receiver_id : row.sender_id)),
    ].filter((recipientId): recipientId is string => !!recipientId && recipientId !== user.id)));

    if (recipientIds.length === 0) {
      return;
    }

    const authorName = getDisplayName(profile);
    const visibilitySuffix = visibility === 'public' ? ' est en direct.' : ' a demarre un live reserve a ses amis et suiveurs.';
    const message = `${authorName}${liveTitle ? ` a lance le live "${liveTitle}".` : visibilitySuffix}`;

    const { error: notificationsError } = await supabase.from('notifications').insert(
      recipientIds.map((recipientId) => ({
        user_id: recipientId,
        sender_id: user.id,
        title: 'Live en direct',
        message,
        type: 'live_started',
        live_stream_id: liveStreamId,
        is_read: false,
        is_for_all_admins: false,
      }))
    );

    if (notificationsError) {
      throw notificationsError;
    }

    try {
      await NotificationTriggers.onLiveStarted(recipientIds, liveStreamId, authorName, liveTitle);
    } catch (pushError) {
      console.error('Erreur push live:', pushError);
    }
  };

  const launchLive = async () => {
    if (!user?.id) {
      toast.error('Vous devez etre connecte pour lancer un live.');
      return;
    }

    const liveTitle = liveData.title.trim();
    if (!liveTitle) {
      toast.error('Ajoutez un titre a votre live.');
      return;
    }

    if (liveData.isPaid) {
      const priceValue = parseFloat(liveData.entryPrice);
      if (!liveData.entryPrice || isNaN(priceValue) || priceValue <= 0) {
        toast.error('Veuillez saisir un prix valide pour le live payant.');
        return;
      }
    }

    let scheduledAt: string | null = null;
    if (liveData.isScheduled) {
      if (!liveData.scheduledDate || !liveData.scheduledTime) {
        toast.error('Veuillez saisir la date et l\'heure du live programmé.');
        return;
      }
      const scheduled = new Date(`${liveData.scheduledDate}T${liveData.scheduledTime}`);
      const minScheduled = new Date(Date.now() + 5 * 60 * 1000);
      if (isNaN(scheduled.getTime()) || scheduled <= minScheduled) {
        toast.error('La date du live doit être au moins 5 minutes dans le futur.');
        return;
      }
      scheduledAt = scheduled.toISOString();
    }

    const maxAttendees = liveData.maxAttendees ? parseInt(liveData.maxAttendees, 10) : null;
    if (liveData.maxAttendees && (maxAttendees === null || isNaN(maxAttendees) || maxAttendees < 1)) {
      toast.error('Le nombre maximum de places doit être un entier positif.');
      return;
    }

    setIsLaunchingLive(true);

    try {
      const agoraChannel = `live_${user.id.replace(/-/g, '')}_${Date.now()}`;
      const entryPrice = liveData.isPaid ? parseFloat(liveData.entryPrice) : null;
      const isScheduled = liveData.isScheduled && scheduledAt != null;

      const { data: createdLive, error } = await supabase
        .from('user_live_streams')
        .insert({
          host_id: user.id,
          title: liveTitle,
          description: liveData.description.trim() || null,
          visibility: liveData.visibility,
          status: isScheduled ? 'scheduled' : 'active',
          agora_channel: agoraChannel,
          entry_price: entryPrice,
          scheduled_at: scheduledAt,
          max_attendees: maxAttendees,
        })
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      if (isScheduled) {
        toast.success('Live programmé ! Partagez le lien de ticket pour que les gens réservent.');
        navigate(`/live/${createdLive.id}/ticket`);
      } else {
        toast.success('Live démarré !');
        navigate(`/live/${createdLive.id}?host=1`, { state: { preparedStudio } });
        notifyAudienceAboutLive(createdLive.id, liveTitle, liveData.visibility).catch((error) => {
          console.error('Erreur notification live:', error);
        });
      }
    } catch (error) {
      console.error('Erreur demarrage live:', error);
      if (isSingleActiveLiveViolation(error as { code?: string; message?: string | null })) {
        toast.error('Vous avez déjà un live en cours. Terminez-le avant d’en lancer un autre.');
      } else {
        toast.error('Impossible de démarrer le live.');
      }
    } finally {
      setIsLaunchingLive(false);
    }
  };

  const uploadToBucket = async (file: File) => {
    const bucket = formData.video_type === 'lesson' ? 'lesson_discussion_files' : 'tiktok_feed_media';
    const result = await uploadFile(file, bucket);
    return result.fileUrl;
  };

  const handleUploadVideoSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith('video/')) {
      toast.error('Veuillez selectionner un fichier video.');
      return;
    }
    setSourceVideoFile(file);
  };

  const handleCustomAudioSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith('audio/')) {
      toast.error('Veuillez selectionner un fichier audio.');
      return;
    }
    setCustomAudioFile(file);
    setSelectedBaseSoundId(null);
  };

  const handleBaseSoundSelection = async (soundId: string) => {
    const selectedSound = BASE_SOUNDS.find((sound) => sound.id === soundId);
    if (!selectedSound) {
      return;
    }

    setIsProcessing(true);
    setProcessingLabel('Chargement du son');

    try {
      const response = await fetch(selectedSound.path);
      if (!response.ok) {
        throw new Error('Son introuvable');
      }

      const blob = await response.blob();
      const extension = selectedSound.path.split('.').pop() || 'mp3';
      const audioFile = new File([blob], `${selectedSound.id}.${extension}`, {
        type: blob.type || 'audio/mpeg',
      });

      setCustomAudioFile(audioFile);
      setSelectedBaseSoundId(soundId);
      setActiveFinalizeOverlay(null);
      toast.success(`Son ${selectedSound.label} ajoute.`);
    } catch (error) {
      console.error('Erreur chargement son de base:', error);
      toast.error('Impossible de charger ce son.');
    } finally {
      setIsProcessing(false);
      setProcessingLabel('');
    }
  };

  const clearSelectedAudio = () => {
    setCustomAudioFile(null);
    setSelectedBaseSoundId(null);
  };

  useEffect(() => {
    const source = method === 'url' ? videoUrl.trim() : sourceVideoFile;

    if (step !== 'details' || thumbnailFile || !source) {
      return;
    }

    let cancelled = false;

    void captureVideoThumbnail({
      source,
      timeRatio: DEFAULT_THUMBNAIL_RATIO,
      stickerOverlays,
      textOverlays,
    }).then((generatedThumbnail) => {
      if (!cancelled) {
        setThumbnailFile(generatedThumbnail);
      }
    }).catch((error) => {
      console.error('Erreur generation miniature par defaut:', error);
    });

    return () => {
      cancelled = true;
    };
  }, [method, sourceVideoFile, step, stickerOverlays, textOverlays, thumbnailFile, videoUrl]);

  const handleThumbnailUploadSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez selectionner une image.');
      return;
    }
    setThumbnailFile(file);
  };

  const continueAfterFinalize = async () => {
    if (!sourceVideoFile) {
      return;
    }

    setIsProcessing(true);
    setProcessingLabel('Preparation de la video');

    try {
      const hasFinalizeEdits = !!customAudioFile || stickerOverlays.length > 0 || textOverlays.length > 0;
      const composedFile = await composeVideoForPublish({
        videoFile: sourceVideoFile,
        stickerOverlays,
        textOverlays,
        audioFile: customAudioFile,
        onProgress: (progress) => setProcessingLabel(`Preparation de la video ${progress}%`),
      });

      if (hasFinalizeEdits && composedFile === sourceVideoFile) {
        throw new Error('Composition non supportee sur cet appareil.');
      }

      setSourceVideoFile(composedFile);
      setStep('details');
    } catch (error) {
      console.error('Erreur finalisation video:', error);
      toast.error('Impossible de finaliser la video avec le texte, les stickers ou le son sur cet appareil.');
    } finally {
      setIsProcessing(false);
      setProcessingLabel('');
    }
  };

  const captureThumbnail = async () => {
    const source = method === 'url' ? videoUrl.trim() : sourceVideoFile;
    if (!source) {
      toast.error('Ajoutez d\'abord une video.');
      return;
    }

    const previewVideo = detailsPreviewVideoRef.current;

    if (previewVideo && !previewVideo.paused) {
      previewVideo.pause();
    }

    setIsProcessing(true);
    setProcessingLabel('Generation de la miniature');

    try {
      const generatedThumbnail = previewVideo && previewVideo.videoWidth > 0
        ? await captureThumbnailFromVideoElement({
            video: previewVideo,
            stickerOverlays,
            textOverlays,
          })
        : await captureVideoThumbnail({
            source,
            timeRatio: DEFAULT_THUMBNAIL_RATIO,
            stickerOverlays,
            textOverlays,
          });
      setThumbnailFile(generatedThumbnail);
      toast.success('Miniature capturee.');
    } catch (error) {
      console.error('Erreur capture miniature:', error);
      toast.error('Impossible de capturer cette miniature.');
    } finally {
      setIsProcessing(false);
      setProcessingLabel('');
    }
  };

  const submitVideo = async (publishMode: 'draft' | 'publish') => {
    if (!user?.id) {
      toast.error('Vous devez etre connecte pour publier.');
      return;
    }

    if (!formData.title.trim()) {
      toast.error('Le titre est requis.');
      return;
    }

    if ((formData.video_type === 'promo' || formData.video_type === 'lesson') && !formData.formation_id) {
      toast.error('Veuillez choisir une formation pour ce type de video.');
      return;
    }

    if (method === 'url' && !videoUrl.trim()) {
      toast.error('Veuillez saisir l\'URL de la video.');
      return;
    }

    if ((method === 'upload' || method === 'record') && !sourceVideoFile) {
      toast.error('Veuillez fournir un fichier video.');
      return;
    }

    setIsProcessing(true);
    setProcessingLabel(publishMode === 'draft' ? 'Enregistrement du brouillon' : 'Publication de la video');

    try {
      let finalVideoUrl = videoUrl.trim();
      if ((method === 'upload' || method === 'record') && sourceVideoFile) {
        finalVideoUrl = await uploadToBucket(sourceVideoFile);
      }

      let thumbnailUrl: string | null = null;
      if (thumbnailFile) {
        thumbnailUrl = await uploadToBucket(thumbnailFile);
      }

      const { data: created, error } = await supabase
        .from('videos')
        .insert({
          title: formData.title.trim(),
          description: formData.description.trim(),
          video_url: finalVideoUrl,
          thumbnail_url: thumbnailUrl,
          video_type: formData.video_type,
          formation_id: formData.formation_id || null,
          author_id: user.id,
          is_active: publishMode === 'publish',
        })
        .select()
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!created) {
        toast.error('La creation a ete refusee.');
        return;
      }

      if (publishMode === 'publish') {
        try {
          await notifyAudienceAboutVideo(created.id, created.title);
        } catch (notificationError) {
          console.error('Erreur notifications nouvelle video:', notificationError);
        }
      }

      toast.success(publishMode === 'draft' ? 'Brouillon enregistre.' : 'Video creee avec succes.');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Erreur creation video:', error);
      toast.error(publishMode === 'draft' ? 'Erreur lors de l enregistrement du brouillon.' : 'Erreur lors de la creation de la video.');
    } finally {
      setIsProcessing(false);
      setProcessingLabel('');
    }
  };

  const handleLiveCancel = () => {
    if (initialStep === 'live') {
      onOpenChange(false);
    } else {
      setStep('details');
      setMethod('url');
    }
  };

  const handleDetailsBack = () => {
    if (method === 'record') {
      setStep('finalize');
      return;
    }

    onOpenChange(false);
  };

  return {
    formations,
    isUploading,
    step,
    method,
    videoUrl,
    sourcePreviewUrl,
    thumbnailPreviewUrl,
    customAudioPreviewUrl,
    customAudioFile,
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
    processingLabel,
    previewAspectRatio,
    isLaunchingLive,
    liveData,
    formData,
    cameraFacingMode,
    flashEnabled,
    recordingTimerSeconds,
    countdownValue,
    isRecording,
    isRecordingPaused,
    preparedStudio,
    isStudioEditorOpen,
    detailsPreviewSource,
    refs: {
      liveVideoRef,
      nativeAudioInputRef,
      detailsPreviewVideoRef,
      finalizeStageRef,
    },
    setters: {
      setStep,
      setMethod,
      setActiveFinalizeOverlay,
      setSelectedOverlay,
      setPreviewAspectRatio,
      setLiveData,
      setFormData,
      setVideoUrl,
      setIsStudioEditorOpen,
      setPreparedStudio,
    },
    actions: {
      handleLiveCancel,
      launchLive,
      startRecording,
      stopRecording,
      toggleRecordingPause,
      toggleCameraFacingMode,
      toggleFlash,
      cycleRecordingTimer,
      continueAfterFinalize,
      addStickerOverlay,
      addTextOverlay,
      updateSelectedTextOverlay,
      updateSelectedTextStyle,
      resetOverlayTransform,
      removeSelectedOverlay,
      handleBaseSoundSelection,
      handleCustomAudioSelection,
      clearSelectedAudio,
      handleUploadVideoSelection,
      captureThumbnail,
      handleThumbnailUploadSelection,
      handleDetailsBack,
      submitVideo,
      setSourceVideoFile,
    },
    overlayHandlers: {
      beginPointerInteraction,
      handlePointerMove,
      endPointerInteraction,
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd,
    },
  };
};