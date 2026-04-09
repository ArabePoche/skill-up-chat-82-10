import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Check,
  FileText,
  Globe,
  ImagePlus,
  Link as LinkIcon,
  Loader2,
  Music,
  Pause,
  Play,
  Presentation,
  Radio,
  RefreshCw,
  Square,
  Sticker,
  Timer,
  Type,
  Upload,
  Users,
  Wand2,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useFormations } from '@/hooks/useFormations';
import { supabase } from '@/integrations/supabase/client';
import { NotificationTriggers } from '@/utils/notificationHelpers';
import { captureThumbnailFromVideoElement, captureVideoThumbnail, composeVideoForPublish, type StickerPosition } from '@/utils/videoComposer';
import type { LiveTeachingStudio } from '@/live/types';
import LiveTeachingStudioEditor from '@/live/components/LiveTeachingStudioEditor';

type CreationMethod = 'record' | 'upload' | 'url';
type FlowStep = 'choice' | 'record' | 'finalize' | 'details' | 'live';
type FinalizeOverlay = 'sticker' | 'text' | 'sound' | null;
type LiveVisibility = 'public' | 'friends_followers';

interface VideoCreationFlowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialStep?: FlowStep;
}

const STICKERS = ['🔥', '✨', '🎯', '❤️', '🚀', '🎉'];
const DEFAULT_THUMBNAIL_RATIO = 0.08;
const BASE_SOUNDS = [
  { id: 'notification-default', label: 'Pulse', path: '/sounds/notification-default.mp3' },
  { id: 'notification-friend', label: 'Echo', path: '/sounds/notification-friend.mp3' },
  { id: 'notification-order', label: 'Drive', path: '/sounds/notification-order.mp3' },
  { id: 'ringtone-call', label: 'Wave', path: '/sounds/ringtone-call.mp3' },
];

const getDisplayName = (profile?: { first_name?: string | null; last_name?: string | null; username?: string | null } | null) => {
  if (profile?.first_name && profile?.last_name) {
    return `${profile.first_name} ${profile.last_name}`;
  }

  return profile?.username || 'Un utilisateur';
};

const VideoCreationFlowDialog: React.FC<VideoCreationFlowDialogProps> = ({ open, onOpenChange, onSuccess, initialStep }) => {
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

  const [step, setStep] = useState<FlowStep>(initialStep ?? 'choice');
  const [method, setMethod] = useState<CreationMethod | null>(null);
  const [sourceVideoFile, setSourceVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [customAudioFile, setCustomAudioFile] = useState<File | null>(null);
  const [selectedBaseSoundId, setSelectedBaseSoundId] = useState<string | null>(null);
  const [stickerEmoji, setStickerEmoji] = useState<string | null>(null);
  const [stickerPosition, setStickerPosition] = useState<StickerPosition>('bottom-right');
  const [textOverlay, setTextOverlay] = useState('');
  const [textPosition, setTextPosition] = useState<StickerPosition>('center');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [recordingTimerSeconds, setRecordingTimerSeconds] = useState<0 | 3 | 10>(0);
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const [activeFinalizeOverlay, setActiveFinalizeOverlay] = useState<FinalizeOverlay>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    video_type: 'classic' as 'lesson' | 'promo' | 'classic',
    formation_id: '',
  });
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState('');
  const [isLaunchingLive, setIsLaunchingLive] = useState(false);
  const [preparedStudio, setPreparedStudio] = useState<LiveTeachingStudio | null>(null);
  const [isStudioEditorOpen, setIsStudioEditorOpen] = useState(false);
  const [liveData, setLiveData] = useState({
    title: '',
    description: '',
    visibility: 'public' as LiveVisibility,
    isPaid: false,
    entryPrice: '',
    isScheduled: false,
    scheduledDate: '',
    scheduledTime: '',
    maxAttendees: '',
  });

  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const countdownIntervalRef = useRef<number | null>(null);
  const nativeAudioInputRef = useRef<HTMLInputElement>(null);
  const detailsPreviewVideoRef = useRef<HTMLVideoElement>(null);

  const sourcePreviewUrl = useMemo(() => (sourceVideoFile ? URL.createObjectURL(sourceVideoFile) : ''), [sourceVideoFile]);
  const thumbnailPreviewUrl = useMemo(() => (thumbnailFile ? URL.createObjectURL(thumbnailFile) : ''), [thumbnailFile]);

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
    if (!open) {
      stopRecordingDevices();
      resetFlow();
    }
  }, [open]);

  useEffect(() => {
    if (open && step === 'record') {
      void startRecordingDevices();
    }

    if (step !== 'record') {
      stopRecordingDevices();
    }
  }, [open, step]);

  const resetFlow = () => {
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    setStep(initialStep ?? 'choice');
    setMethod(null);
    setSourceVideoFile(null);
    setVideoUrl('');
    setCustomAudioFile(null);
    setSelectedBaseSoundId(null);
    setStickerEmoji(null);
    setStickerPosition('bottom-right');
    setTextOverlay('');
    setTextPosition('center');
    setThumbnailFile(null);
    setCameraFacingMode('user');
    setFlashEnabled(false);
    setRecordingTimerSeconds(0);
    setCountdownValue(null);
    setActiveFinalizeOverlay(null);
    setFormData({ title: '', description: '', video_type: 'classic', formation_id: '' });
    setIsRecording(false);
    setIsRecordingPaused(false);
    setIsProcessing(false);
    setProcessingLabel('');
    setIsLaunchingLive(false);
    setLiveData({ title: '', description: '', visibility: 'public', isPaid: false, entryPrice: '', isScheduled: false, scheduledDate: '', scheduledTime: '', maxAttendees: '' });
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
      setStep('choice');
    }
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

    // Validate scheduled date if scheduling
    let scheduledAt: string | null = null;
    if (liveData.isScheduled) {
      if (!liveData.scheduledDate || !liveData.scheduledTime) {
        toast.error('Veuillez saisir la date et l\'heure du live programmé.');
        return;
      }
      const scheduled = new Date(`${liveData.scheduledDate}T${liveData.scheduledTime}`);
      const minScheduled = new Date(Date.now() + 5 * 60 * 1000); // at least 5 minutes in the future
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
        await notifyAudienceAboutLive(createdLive.id, liveTitle, liveData.visibility);
        toast.success('Live demarre.');
        navigate(`/live/${createdLive.id}?host=1`, { state: { preparedStudio } });
      }
    } catch (error) {
      console.error('Erreur demarrage live:', error);
      toast.error('Impossible de demarrer le live.');
    } finally {
      setIsLaunchingLive(false);
    }
  };

  const uploadToBucket = async (file: File) => {
    const bucket = formData.video_type === 'lesson' ? 'lesson_discussion_files' : 'tiktok_feed_media';
    const result = await uploadFile(file, bucket);
    return result.fileUrl;
  };

  const handleMethodSelection = (nextMethod: CreationMethod) => {
    setMethod(nextMethod);
    setStep(nextMethod === 'record' ? 'record' : 'details');
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

  const detailsPreviewSource = method === 'url' ? videoUrl.trim() : sourcePreviewUrl;

  useEffect(() => {
    const source = method === 'url' ? videoUrl.trim() : sourceVideoFile;

    if (step !== 'details' || thumbnailFile || !source) {
      return;
    }

    let cancelled = false;

    void captureVideoThumbnail({
      source,
      timeRatio: DEFAULT_THUMBNAIL_RATIO,
      stickerEmoji,
      stickerPosition,
      textOverlay,
      textPosition,
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
  }, [method, sourceVideoFile, step, stickerEmoji, stickerPosition, textOverlay, textPosition, thumbnailFile, videoUrl]);

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
      const composedFile = await composeVideoForPublish({
        videoFile: sourceVideoFile,
        stickerEmoji,
        stickerPosition,
        textOverlay,
        textPosition,
        audioFile: customAudioFile,
        onProgress: (progress) => setProcessingLabel(`Preparation de la video ${progress}%`),
      });
      setSourceVideoFile(composedFile);
      setStep('details');
    } catch (error) {
      console.error('Erreur finalisation video:', error);
      toast.error('Impossible de finaliser la video.');
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
            stickerEmoji,
            stickerPosition,
            textOverlay,
            textPosition,
          })
        : await captureVideoThumbnail({
            source,
            timeRatio: DEFAULT_THUMBNAIL_RATIO,
            stickerEmoji,
            stickerPosition,
            textOverlay,
            textPosition,
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
      setStep('choice');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        {step === 'choice' && (
          <DialogContent className="max-w-xl border-0 bg-zinc-950 p-0 text-white sm:rounded-3xl">
            <div className="overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_top,_rgba(255,120,80,0.18),_transparent_38%),linear-gradient(160deg,#0b0b12_0%,#171727_48%,#11111a_100%)] p-6">
              <DialogHeader className="space-y-2 text-left">
                <DialogTitle className="text-2xl font-semibold">Creer une video</DialogTitle>
                <DialogDescription className="text-zinc-300">
                  Choisissez votre point de depart: filmer, importer une video locale ou publier a partir d'une URL directe.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                {[
                  { key: 'record', icon: Camera, title: 'Filmer', text: 'Capture plein ecran puis finalisation.' },
                  { key: 'upload', icon: Upload, title: 'Upload', text: 'Importer une video deja presente sur votre appareil.' },
                  { key: 'url', icon: LinkIcon, title: 'URL', text: 'Publier a partir d\'un lien vers une video.' },
                  { key: 'live', icon: Radio, title: 'Live', text: 'Demarrer un vrai direct public ou reserve a vos amis et suiveurs.' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        if (item.key === 'live') {
                          setStep('live');
                          return;
                        }

                        handleMethodSelection(item.key as CreationMethod);
                      }}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-orange-400/40 hover:bg-white/10"
                    >
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-200">
                        <Icon size={22} />
                      </div>
                      <div className="text-lg font-semibold">{item.title}</div>
                      <p className="mt-2 text-sm leading-6 text-zinc-300">{item.text}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </DialogContent>
        )}

        {step === 'live' && (
          <DialogContent className="max-h-[100dvh] w-[calc(100vw-1rem)] max-w-lg overflow-y-auto border-0 bg-zinc-950 p-0 text-white sm:max-h-[90vh] sm:rounded-3xl">
            <div className="rounded-3xl bg-[radial-gradient(circle_at_top,_rgba(255,90,90,0.18),_transparent_42%),linear-gradient(160deg,#0b0b12_0%,#19111a_48%,#120f12_100%)] p-1">
              <div className="rounded-[22px] border border-white/10 bg-black/50 p-4 sm:p-6">
                <DialogHeader className="space-y-2 text-left">
                  <DialogTitle className="text-xl font-semibold sm:text-2xl">Configurer le live</DialogTitle>
                  <DialogDescription className="text-zinc-300">
                    Choisissez le titre, la description et qui pourra rejoindre votre direct.
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-4 space-y-4 sm:mt-6">
                  <div className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-3 sm:p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-sky-300">
                          <Presentation size={20} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">Studio d'Enseignement Libre</p>
                          <p className="text-xs text-zinc-400">
                            {preparedStudio ? "Configuration prête (Modifiable en direct)" : "Optionnel : préparez vos tableaux et documents"}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsStudioEditorOpen(true)}
                        className="w-full border-sky-500/50 text-sky-400 hover:bg-sky-500/10 hover:text-sky-300 sm:w-auto"
                      >
                        {preparedStudio ? "Modifier" : "Configurer"}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="live-title">Titre du live</Label>
                    <Input
                      id="live-title"
                      value={liveData.title}
                      onChange={(event) => setLiveData((current) => ({ ...current, title: event.target.value }))}
                      placeholder="Exemple : Session questions-réponses"
                      className="border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="live-description">Description</Label>
                    <Textarea
                      id="live-description"
                      value={liveData.description}
                      onChange={(event) => setLiveData((current) => ({ ...current, description: event.target.value }))}
                      placeholder="Décrivez rapidement le sujet du live."
                      className="min-h-20 border-white/10 bg-white/5 text-white placeholder:text-zinc-500 sm:min-h-24"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Visibilité</Label>
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setLiveData((current) => ({ ...current, visibility: 'public' }))}
                        className={`rounded-2xl border p-3 sm:p-4 text-left transition ${liveData.visibility === 'public' ? 'border-red-400/60 bg-red-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                      >
                        <div className="mb-2 sm:mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white">
                          <Globe size={20} />
                        </div>
                        <div className="text-sm font-semibold">Tout le monde</div>
                        <p className="mt-1 text-xs leading-5 text-zinc-300">Toute personne ayant le lien peut rejoindre le live.</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setLiveData((current) => ({ ...current, visibility: 'friends_followers' }))}
                        className={`rounded-2xl border p-3 sm:p-4 text-left transition ${liveData.visibility === 'friends_followers' ? 'border-red-400/60 bg-red-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                      >
                        <div className="mb-2 sm:mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white">
                          <Users size={20} />
                        </div>
                        <div className="text-sm font-semibold">Amis et suiveurs</div>
                        <p className="mt-1 text-xs leading-5 text-zinc-300">Seuls vos amis acceptés et vos followers peuvent regarder.</p>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Accès au live</Label>
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setLiveData((current) => ({ ...current, isPaid: false, entryPrice: '' }))}
                        className={`rounded-2xl border p-3 sm:p-4 text-left transition ${!liveData.isPaid ? 'border-emerald-400/60 bg-emerald-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                      >
                        <div className="mb-2 sm:mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white">
                          <Zap size={20} />
                        </div>
                        <div className="text-sm font-semibold">Gratuit</div>
                        <p className="mt-1 text-xs leading-5 text-zinc-300">Accès libre sans frais d'entrée.</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setLiveData((current) => ({ ...current, isPaid: true }))}
                        className={`rounded-2xl border p-3 sm:p-4 text-left transition ${liveData.isPaid ? 'border-emerald-400/60 bg-emerald-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                      >
                        <div className="mb-2 sm:mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white">
                          <Timer size={20} />
                        </div>
                        <div className="text-sm font-semibold">Payant</div>
                        <p className="mt-1 text-xs leading-5 text-zinc-300">Fixez un prix d'entrée en FCFA.</p>
                      </button>
                    </div>

                    {liveData.isPaid && (
                      <div className="mt-3 space-y-1">
                        <Label htmlFor="live-price">Prix d'entrée (FCFA)</Label>
                        <Input
                          id="live-price"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          min="1"
                          step="1"
                          value={liveData.entryPrice}
                          onChange={(event) => {
                            const raw = event.target.value.replace(/[^0-9]/g, '');
                            setLiveData((current) => ({ ...current, entryPrice: raw }));
                          }}
                          placeholder="Ex : 500"
                          className="border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Scheduling */}
                  <div className="space-y-2">
                    <Label>Programmation</Label>
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setLiveData((current) => ({ ...current, isScheduled: false, scheduledDate: '', scheduledTime: '' }))}
                        className={`rounded-2xl border p-3 sm:p-4 text-left transition ${!liveData.isScheduled ? 'border-sky-400/60 bg-sky-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                      >
                        <div className="mb-2 sm:mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white">
                          <Radio size={20} />
                        </div>
                        <div className="text-sm font-semibold">Démarrer maintenant</div>
                        <p className="mt-1 text-xs leading-5 text-zinc-300">Le live commence immédiatement.</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setLiveData((current) => ({ ...current, isScheduled: true }))}
                        className={`rounded-2xl border p-3 sm:p-4 text-left transition ${liveData.isScheduled ? 'border-sky-400/60 bg-sky-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                      >
                        <div className="mb-2 sm:mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white">
                          <Timer size={20} />
                        </div>
                        <div className="text-sm font-semibold">Programmer</div>
                        <p className="mt-1 text-xs leading-5 text-zinc-300">Choisissez une date et heure.</p>
                      </button>
                    </div>

                    {liveData.isScheduled && (
                      <div className="mt-3 grid gap-3 grid-cols-2">
                        <div className="space-y-1">
                          <Label htmlFor="live-date">Date</Label>
                          <Input
                            id="live-date"
                            type="date"
                            value={liveData.scheduledDate}
                            onChange={(event) => setLiveData((current) => ({ ...current, scheduledDate: event.target.value }))}
                            min={new Date().toISOString().split('T')[0]}
                            className="border-white/10 bg-white/5 text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="live-time">Heure</Label>
                          <Input
                            id="live-time"
                            type="time"
                            value={liveData.scheduledTime}
                            onChange={(event) => setLiveData((current) => ({ ...current, scheduledTime: event.target.value }))}
                            className="border-white/10 bg-white/5 text-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Max attendees */}
                  <div className="space-y-2">
                    <Label htmlFor="live-max">Places maximales (optionnel)</Label>
                    <Input
                      id="live-max"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      min="1"
                      value={liveData.maxAttendees}
                      onChange={(event) => {
                        const raw = event.target.value.replace(/[^0-9]/g, '');
                        setLiveData((current) => ({ ...current, maxAttendees: raw }));
                      }}
                      placeholder="Illimité si vide"
                      className="border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
                    />
                  </div>
                </div>


                <div className="mt-4 flex flex-col-reverse gap-2 sm:mt-6 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                  <Button type="button" variant="ghost" className="w-full text-white hover:bg-white/10 hover:text-white sm:w-auto" onClick={handleLiveCancel}>
                    Annuler
                  </Button>
                  <Button type="button" onClick={() => void launchLive()} disabled={isLaunchingLive} className="w-full bg-red-600 text-white hover:bg-red-700 sm:w-auto">
                    {isLaunchingLive ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Radio className="mr-2 h-4 w-4" />}
                    {liveData.isScheduled ? 'Programmer le live' : 'Lancer le live'}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        )}

        {step === 'record' && (
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
                  onClick={() => void toggleCameraFacingMode()}
                  disabled={isRecording || countdownValue !== null}
                  className="flex w-20 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium text-white transition hover:text-orange-300 disabled:opacity-50"
                  title="Basculer la camera"
                >
                  <RefreshCw size={22} />
                  <span className="text-center leading-tight">{cameraFacingMode === 'user' ? 'Avant' : 'Arriere'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void toggleFlash()}
                  disabled={isRecording || countdownValue !== null}
                  className={`flex w-20 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition disabled:opacity-50 ${flashEnabled ? 'text-orange-400' : 'text-white hover:text-orange-300'}`}
                  title="Activer le flash"
                >
                  <Zap size={22} />
                  <span className="text-center leading-tight">Flash {flashEnabled ? 'on' : 'off'}</span>
                </button>
                <button
                  type="button"
                  onClick={cycleRecordingTimer}
                  disabled={isRecording || countdownValue !== null}
                  className="flex w-20 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium text-white transition hover:text-orange-300 disabled:opacity-50"
                  title="Configurer la minuterie"
                >
                  <Timer size={22} />
                  <span className="text-center leading-tight">{recordingTimerSeconds === 0 ? 'Timer off' : `${recordingTimerSeconds}s`}</span>
                </button>
                </div>
              )}
              <div className="absolute left-0 right-0 top-0 flex items-center justify-between p-5 text-white">
                <Button type="button" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={() => setStep('choice')}>
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
                <Button type="button" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={() => setStep('choice')}>
                  Annuler
                </Button>
                {!isRecording ? (
                  <button type="button" onClick={startRecording} className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-red-600 shadow-[0_0_40px_rgba(255,70,70,0.45)]">
                    <Camera size={28} className="text-white" />
                  </button>
                ) : (
                  <div className="flex items-center gap-4">
                    <button type="button" onClick={toggleRecordingPause} className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/80 bg-black/35 text-white shadow-[0_0_28px_rgba(0,0,0,0.28)]">
                      {isRecordingPaused ? <Play size={22} className="fill-white" /> : <Pause size={22} className="fill-white" />}
                    </button>
                    <button type="button" onClick={stopRecording} className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white text-black shadow-[0_0_40px_rgba(255,255,255,0.35)]">
                      <Square size={22} className="fill-black" />
                    </button>
                  </div>
                )}
                <div className="min-w-[120px] text-center text-sm text-zinc-200">{isRecording ? (isRecordingPaused ? 'En pause' : 'Enregistrement') : countdownValue !== null ? 'Demarrage...' : 'Pret'}</div>
              </div>
            </div>
          </DialogContent>
        )}

        {step === 'finalize' && (
          <DialogContent className="h-screen max-w-none border-0 bg-black p-0 text-white sm:rounded-none">
            <DialogHeader className="sr-only">
              <DialogTitle>Finaliser la video</DialogTitle>
              <DialogDescription>Ajoutez un sticker, un texte ou un son avant de publier la video.</DialogDescription>
            </DialogHeader>
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-black">
              {sourcePreviewUrl && <video src={sourcePreviewUrl} controls className="h-full w-full object-cover" />}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />
              <div className="absolute left-0 right-0 top-0 flex items-center justify-between p-5 text-white">
                <Button type="button" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={() => setStep('record')}>
                  <ArrowLeft size={18} strokeWidth={2.75} className="mr-2" />
                  Retour
                </Button>
                <div className="rounded-full bg-black/30 px-4 py-2 text-sm">Finaliser</div>
              </div>

              <div className="absolute right-4 top-1/2 flex -translate-y-1/2 flex-col gap-4">
                <button
                  type="button"
                  onClick={() => setActiveFinalizeOverlay('sticker')}
                  className={`flex w-20 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition ${activeFinalizeOverlay === 'sticker' ? 'text-orange-400' : 'text-white hover:text-orange-300'}`}
                  title="Ajouter un sticker"
                >
                  <Sticker size={24} strokeWidth={2.75} />
                  <span>Sticker</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFinalizeOverlay('text')}
                  className={`flex w-20 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition ${activeFinalizeOverlay === 'text' ? 'text-orange-400' : 'text-white hover:text-orange-300'}`}
                  title="Ajouter un texte"
                >
                  <Type size={24} strokeWidth={2.75} />
                  <span>Texte</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFinalizeOverlay('sound')}
                  className={`flex w-20 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition ${activeFinalizeOverlay === 'sound' ? 'text-orange-400' : 'text-white hover:text-orange-300'}`}
                  title="Ajouter un son"
                >
                  <Music size={24} strokeWidth={2.75} />
                  <span>Son</span>
                </button>
              </div>

              <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-3 px-4">
                <Button type="button" variant="ghost" className="text-zinc-200 hover:bg-white/10 hover:text-white" onClick={() => setStep('record')}>
                  Refilmer
                </Button>
                <Button type="button" className="bg-orange-500 text-white hover:bg-orange-400" onClick={() => void continueAfterFinalize()} disabled={isProcessing}>
                  {isProcessing ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Check size={16} className="mr-2" />}
                  Continuer
                </Button>
              </div>

              {activeFinalizeOverlay && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/45 p-4" onClick={() => setActiveFinalizeOverlay(null)}>
                  <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950/96 p-5 text-white shadow-2xl backdrop-blur-xl" onClick={(event) => event.stopPropagation()}>
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-semibold">
                          {activeFinalizeOverlay === 'sticker' ? 'Ajouter un sticker' : activeFinalizeOverlay === 'text' ? 'Ajouter un texte' : 'Ajouter un son'}
                        </div>
                        <p className="mt-1 text-sm text-zinc-400">
                          {activeFinalizeOverlay === 'sticker'
                            ? 'Choisissez un sticker et sa position sur la video.'
                            : activeFinalizeOverlay === 'text'
                              ? 'Saisissez votre texte et choisissez son emplacement.'
                              : 'Choisissez un son de la bibliotheque de l app ou importez votre propre fichier.'}
                        </p>
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" onClick={() => setActiveFinalizeOverlay(null)}>
                        <Square size={16} strokeWidth={2.75} className="rotate-45" />
                      </Button>
                    </div>

                    {activeFinalizeOverlay === 'sticker' && (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {STICKERS.map((emoji) => (
                            <button key={emoji} type="button" onClick={() => setStickerEmoji((current) => current === emoji ? null : emoji)} className={`rounded-2xl border px-4 py-3 text-2xl transition ${stickerEmoji === emoji ? 'border-orange-400 bg-orange-500/20' : 'border-white/10 bg-white/5'}`}>
                              {emoji}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            ['top-left', 'Haut gauche'],
                            ['top-right', 'Haut droite'],
                            ['center', 'Centre'],
                            ['bottom-left', 'Bas gauche'],
                            ['bottom-right', 'Bas droite'],
                          ].map(([position, label]) => (
                            <button key={position} type="button" onClick={() => setStickerPosition(position as StickerPosition)} className={`rounded-xl border px-3 py-2 text-sm transition ${stickerPosition === position ? 'border-orange-400 bg-orange-500/15 text-white' : 'border-white/10 text-zinc-300'}`}>
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeFinalizeOverlay === 'text' && (
                      <div className="space-y-3">
                        <Textarea
                          value={textOverlay}
                          onChange={(event) => setTextOverlay(event.target.value)}
                          placeholder="Ex: Nouveau tuto en 20 secondes"
                          rows={4}
                          className="border-white/10 bg-black/20 text-white"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            ['top-left', 'Haut gauche'],
                            ['top-right', 'Haut droite'],
                            ['center', 'Centre'],
                            ['bottom-left', 'Bas gauche'],
                            ['bottom-right', 'Bas droite'],
                          ].map(([position, label]) => (
                            <button key={position} type="button" onClick={() => setTextPosition(position as StickerPosition)} className={`rounded-xl border px-3 py-2 text-sm transition ${textPosition === position ? 'border-orange-400 bg-orange-500/15 text-white' : 'border-white/10 text-zinc-300'}`}>
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeFinalizeOverlay === 'sound' && (
                      <div className="space-y-4">
                        <div>
                          <div className="mb-2 text-sm font-medium text-white">Bibliotheque Skill Up</div>
                          <div className="grid gap-2">
                            {BASE_SOUNDS.map((sound) => (
                              <button
                                key={sound.id}
                                type="button"
                                onClick={() => void handleBaseSoundSelection(sound.id)}
                                className={`rounded-xl border px-4 py-3 text-left text-sm transition ${selectedBaseSoundId === sound.id ? 'border-orange-400 bg-orange-500/15 text-white' : 'border-white/10 text-zinc-300 hover:bg-white/5'}`}
                              >
                                {sound.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="border-t border-white/10 pt-4">
                          <div className="mb-2 text-sm font-medium text-white">Uploader un son</div>
                          <input ref={nativeAudioInputRef} type="file" accept="audio/*" onChange={handleCustomAudioSelection} className="hidden" />
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="secondary" className="bg-white/10 text-white hover:bg-white/20" onClick={() => nativeAudioInputRef.current?.click()}>
                              <Upload size={16} className="mr-2" />
                              Choisir un fichier
                            </Button>
                            {customAudioFile && (
                              <Button type="button" variant="ghost" className="text-zinc-300 hover:bg-white/10 hover:text-white" onClick={clearSelectedAudio}>
                                Retirer le son
                              </Button>
                            )}
                          </div>
                        </div>
                        {customAudioFile && (
                          <p className="text-sm text-emerald-300">
                            Son actif : {customAudioFile.name}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

                {stickerEmoji && (
                  <div className={`pointer-events-none absolute text-6xl drop-shadow-[0_10px_22px_rgba(0,0,0,0.5)] ${
                    stickerPosition === 'top-left' ? 'left-6 top-6' :
                    stickerPosition === 'top-right' ? 'right-6 top-6' :
                    stickerPosition === 'center' ? 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2' :
                    stickerPosition === 'bottom-left' ? 'bottom-6 left-6' : 'bottom-6 right-6'
                  }`}>
                    {stickerEmoji}
                  </div>
                )}
                {textOverlay.trim() && (
                  <div className={`pointer-events-none absolute max-w-[70%] text-center text-3xl font-bold leading-tight text-white drop-shadow-[0_10px_22px_rgba(0,0,0,0.65)] ${
                    textPosition === 'top-left' ? 'left-6 top-10 text-left' :
                    textPosition === 'top-right' ? 'right-6 top-10 text-right' :
                    textPosition === 'center' ? 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2' :
                    textPosition === 'bottom-left' ? 'bottom-10 left-6 text-left' : 'bottom-10 right-6 text-right'
                  }`}>
                    {textOverlay}
                  </div>
                )}
            </div>
          </DialogContent>
        )}

        {step === 'details' && (
          <DialogContent className="max-w-5xl overflow-hidden border-0 bg-white p-0 sm:rounded-3xl">
            <DialogHeader className="sr-only">
              <DialogTitle>Informations de publication</DialogTitle>
              <DialogDescription>Renseignez le titre, la description et la miniature de votre video.</DialogDescription>
            </DialogHeader>
            <div className="grid max-h-[88vh] gap-0 md:grid-cols-[0.95fr_1.05fr]">
              <div className="overflow-y-auto border-r bg-zinc-950 p-6 text-white">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1 text-xs uppercase tracking-[0.24em] text-orange-200">
                  <ImagePlus size={14} />
                  Apercu
                </div>
                <h2 className="mt-3 text-2xl font-semibold">Infos et miniature</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  Choisissez la frame de couverture ou importez votre image, puis renseignez les informations de la publication.
                </p>

                <div className="mt-6 rounded-3xl border border-white/10 bg-black/40 p-4">
                  {method === 'url' ? (
                    <div className="space-y-3">
                      <Label className="text-zinc-200">URL de la video</Label>
                      <Input value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://example.com/video.mp4" className="border-white/10 bg-black/20 text-white" />
                      {detailsPreviewSource && (
                        <video ref={detailsPreviewVideoRef} src={detailsPreviewSource} controls className="aspect-[9/16] w-full rounded-2xl bg-black object-cover" />
                      )}
                    </div>
                  ) : sourcePreviewUrl ? (
                    <video ref={detailsPreviewVideoRef} src={sourcePreviewUrl} controls className="aspect-[9/16] w-full rounded-2xl bg-black object-cover" />
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 p-4">
                      <Label className="text-zinc-200">Importer une video</Label>
                      <Input type="file" accept="video/*" onChange={handleUploadVideoSelection} className="mt-3 border-white/10 bg-black/20 text-white" />
                    </div>
                  )}
                </div>

                <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-4">
                  <Label className="text-zinc-200">Miniature</Label>
                  <div className="mt-3 space-y-3">
                    <p className="text-xs leading-5 text-zinc-400">
                      Une miniature est proposee automatiquement au debut de la video. Pour en choisir une autre, lancez la video ci-dessus, mettez-la en pause sur la frame voulue, puis capturez.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" className="bg-white/10 text-white hover:bg-white/20" onClick={() => void captureThumbnail()} disabled={isProcessing || !detailsPreviewSource}>
                        Capturer la frame en pause
                      </Button>
                      <Label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-200 transition hover:bg-white/10">
                        Uploader une image
                        <input type="file" accept="image/*" onChange={handleThumbnailUploadSelection} className="hidden" />
                      </Label>
                    </div>
                    {thumbnailPreviewUrl && <img src={thumbnailPreviewUrl} alt="Miniature choisie" className="aspect-video w-full rounded-2xl object-cover" />}
                  </div>
                </div>
              </div>

              <div className="overflow-y-auto p-6">
                <DialogHeader className="text-left">
                  <DialogTitle className="text-2xl">Publier la video</DialogTitle>
                  <DialogDescription>
                    Finalisez les informations visibles par vos amis, vos suivis et le reste de l'audience.
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-6 space-y-5">
                  <div>
                    <Label htmlFor="video-title">Titre</Label>
                    <Input id="video-title" value={formData.title} onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))} placeholder="Donnez envie de regarder la video" className="mt-2" />
                  </div>

                  <div>
                    <Label htmlFor="video-description">Description</Label>
                    <Textarea id="video-description" value={formData.description} onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))} placeholder="Decrivez votre contenu" rows={5} className="mt-2" />
                  </div>

                  <div>
                    <Label htmlFor="video-type">Type de video</Label>
                    <Select value={formData.video_type} onValueChange={(value: 'lesson' | 'promo' | 'classic') => setFormData((current) => ({ ...current, video_type: value }))}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Selectionner le type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="classic">Classique</SelectItem>
                        <SelectItem value="promo">Promotion</SelectItem>
                        <SelectItem value="lesson">Lecon</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(formData.video_type === 'promo' || formData.video_type === 'lesson') && (
                    <div>
                      <Label htmlFor="video-formation">Formation associee</Label>
                      <Select value={formData.formation_id} onValueChange={(value) => setFormData((current) => ({ ...current, formation_id: value }))}>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Selectionner une formation" />
                        </SelectTrigger>
                        <SelectContent>
                          {formations.length === 0 ? (
                            <SelectItem value="no-formations" disabled>
                              Aucune formation disponible
                            </SelectItem>
                          ) : (
                            formations.map((formation) => (
                              <SelectItem key={formation.id} value={formation.id}>
                                {formation.title}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-600">
                    <p>
                      Les stickers, textes et sons choisis seront appliques au parcours <strong>Filmer</strong>. Pour l'URL et l'upload, la miniature peut etre capturee a partir du clip ou fournie par une image.
                    </p>
                  </div>

                  <div className="flex flex-wrap justify-between gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setStep(method === 'record' ? 'finalize' : 'choice')}>
                      Retour
                    </Button>
                    <div className="flex flex-wrap gap-3">
                      <Button type="button" variant="outline" onClick={() => void submitVideo('draft')} disabled={isUploading || isProcessing}>
                        {(isUploading || isProcessing) ? <Loader2 size={16} className="mr-2 animate-spin" /> : <FileText size={16} className="mr-2" />}
                        Brouillon
                      </Button>
                      <Button type="button" className="bg-orange-500 text-white hover:bg-orange-400" onClick={() => void submitVideo('publish')} disabled={isUploading || isProcessing}>
                        {(isUploading || isProcessing) ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Upload size={16} className="mr-2" />}
                        Publier
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {isProcessing && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4">
          <div className="rounded-3xl bg-white p-6 text-center shadow-2xl">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-orange-500" />
            <p className="mt-4 text-sm font-medium text-zinc-900">{processingLabel || 'Traitement en cours'}</p>
          </div>
        </div>
      )}

      <LiveTeachingStudioEditor 
        open={isStudioEditorOpen}
        onOpenChange={setIsStudioEditorOpen}
        initialStudio={preparedStudio}
        onSave={setPreparedStudio}
      />
    </>
  );
};

export default VideoCreationFlowDialog;