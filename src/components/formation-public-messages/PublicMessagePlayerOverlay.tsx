import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Headphones, Heart, Loader2, MessageCircle, Mic, PlayCircle, Send, Square, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { FormationPublicMessage } from '@/hooks/formation-public-messages/useFormationPublicMessages';
import { useAuth } from '@/hooks/useAuth';
import { useFormationPublicMessageInteractions } from '@/hooks/formation-public-messages/useFormationPublicMessageInteractions';
import { toast } from 'sonner';

interface PublicMessagePlayerOverlayProps {
  open: boolean;
  message: FormationPublicMessage | null;
  blocking?: boolean;
  onClose: () => void;
  onCompleted?: (messageId: string) => Promise<void> | void;
}

const COMPLETION_RATIO = 0.98;

const PublicMessagePlayerOverlay: React.FC<PublicMessagePlayerOverlayProps> = ({
  open,
  message,
  blocking = false,
  onClose,
  onCompleted,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasMarkedCompletedRef = useRef(false);

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [canClose, setCanClose] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { user } = useAuth();
  const {
    isLiked,
    likesCount,
    comments,
    commentsCount,
    toggleLike,
    addTextComment,
    addAudioComment,
    deleteComment,
    isTogglingLike,
    isSubmittingTextComment,
    isSubmittingAudioComment,
    isDeletingComment,
  } = useFormationPublicMessageInteractions(message?.id);

  useEffect(() => {
    if (!open || !message) {
      return;
    }

    hasMarkedCompletedRef.current = false;
    setDuration(0);
    setCurrentTime(0);
    setIsCompleting(false);
    setCanClose(!blocking || message.hasViewed || !message.urgent);
    setCommentDraft('');
    setIsRecording(false);
    setRecordingTime(0);
  }, [blocking, message, open]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (mediaRecorderRef.current?.state !== 'inactive') {
        mediaRecorderRef.current?.stop();
      }

      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = '0px';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, [commentDraft]);

  const progress = useMemo(() => {
    if (!duration || duration <= 0) {
      return 0;
    }

    return Math.min(100, Math.round((currentTime / duration) * 100));
  }, [currentTime, duration]);

  const markCompleted = async () => {
    if (!message || hasMarkedCompletedRef.current) {
      return;
    }

    hasMarkedCompletedRef.current = true;
    setIsCompleting(true);

    try {
      if (message.urgent && !message.hasViewed) {
        await onCompleted?.(message.id);
      }
      setCanClose(true);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleTimeUpdate = (event: React.SyntheticEvent<HTMLVideoElement | HTMLAudioElement>) => {
    const media = event.currentTarget;
    setCurrentTime(media.currentTime || 0);
    setDuration(media.duration || 0);

    if (media.duration > 0 && media.currentTime / media.duration >= COMPLETION_RATIO) {
      void markCompleted();
    }
  };

  if (!open || !message) {
    return null;
  }

  const submitTextComment = async () => {
    try {
      await addTextComment(commentDraft);
      setCommentDraft('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible d\'envoyer le commentaire');
    }
  };

  const submitAudioComment = async (file: File) => {
    try {
      await addAudioComment(file);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible d\'envoyer le commentaire vocal');
    }
  };

  const getSupportedMimeType = () => {
    const formats = [
      { mimeType: 'audio/mp4', extension: 'mp4' },
      { mimeType: 'audio/webm;codecs=opus', extension: 'webm' },
      { mimeType: 'audio/webm', extension: 'webm' },
      { mimeType: 'audio/ogg;codecs=opus', extension: 'ogg' },
    ];

    for (const format of formats) {
      if (MediaRecorder.isTypeSupported(format.mimeType)) {
        return format;
      }
    }

    return { mimeType: '', extension: 'webm' };
  };

  const stopRecordingState = () => {
    setIsRecording(false);
    setRecordingTime(0);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startVoiceRecording = async () => {
    if (isSubmittingAudioComment || isSubmittingTextComment) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const { mimeType } = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const actualMimeType = mediaRecorder.mimeType || mimeType || 'audio/webm';

      recordingStreamRef.current = stream;
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: actualMimeType });
        const fileExt = actualMimeType.includes('mp4') ? 'mp4' : actualMimeType.includes('ogg') ? 'ogg' : 'webm';
        const file = new File([blob], `public_message_comment_${Date.now()}.${fileExt}`, { type: actualMimeType });

        recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        mediaRecorderRef.current = null;
        stopRecordingState();

        if (blob.size > 0) {
          void submitAudioComment(file);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((previous) => previous + 1);
      }, 1000);
    } catch (error) {
      console.error('Erreur accès microphone:', error);
      toast.error('Impossible d\'accéder au microphone. Vérifiez vos permissions.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      return;
    }

    stopRecordingState();
  };

  const displayName = (comment: (typeof comments)[number]) => {
    const profile = comment.profiles;
    if (!profile) {
      return 'Utilisateur';
    }

    const fullName = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim();
    return fullName || profile.username || 'Utilisateur';
  };

  const authorLabel = 'Créateur';
  const hasTextToSend = commentDraft.trim().length > 0;
  const isCommentActionPending = isSubmittingTextComment || isSubmittingAudioComment;
  const formatRecordingTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleCommentPrimaryAction = () => {
    if (isRecording) {
      stopVoiceRecording();
      return;
    }

    if (hasTextToSend) {
      void submitTextComment();
      return;
    }

    void startVoiceRecording();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm">
      <div className="flex h-full w-full items-stretch justify-center sm:p-4">
        <div className="flex h-full w-full max-w-4xl flex-col overflow-hidden bg-[#e5ddd5] shadow-2xl sm:h-[calc(100vh-2rem)] sm:rounded-3xl">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-white/60 shadow-sm">
                  <AvatarImage src="" alt={authorLabel} />
                  <AvatarFallback className="bg-[#25d366] text-white">CP</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900 sm:text-base">{authorLabel}</p>
                    {message.urgent && (
                      <Badge className="bg-red-600 text-white hover:bg-red-600">
                        <AlertTriangle className="mr-1 h-3.5 w-3.5" />
                        Urgent
                      </Badge>
                    )}
                    <Badge variant="secondary">
                      {message.media_type === 'video' ? 'Vidéo' : 'Audio'}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-slate-500 sm:text-sm">
                    {message.title?.trim() || 'Message public du créateur'}
                  </p>
                </div>
              </div>
              {message.description && (
                <p className="mt-3 text-sm text-slate-600">{message.description}</p>
              )}
            </div>

            <Button variant="ghost" size="icon" onClick={onClose} disabled={!canClose && blocking}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="mx-auto flex w-full max-w-3xl flex-1 min-h-0 flex-col px-2 pb-3 pt-3 sm:px-4 sm:pb-4">
              <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
                <div className="bg-black">
                  {message.media_type === 'video' ? (
                    <video
                      ref={videoRef}
                      src={message.media_url}
                      controls
                      autoPlay
                      controlsList={blocking ? 'nodownload noplaybackrate' : undefined}
                      className="aspect-video w-full bg-black"
                      onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
                      onTimeUpdate={handleTimeUpdate}
                      onEnded={() => void markCompleted()}
                    />
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center bg-slate-950 px-5 py-8 text-white">
                      <div className="w-full max-w-md space-y-5 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
                          <Headphones className="h-7 w-7" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Message audio public</p>
                          <p className="mt-1 text-xs text-white/65">Lecture complète requise pour déverrouiller.</p>
                        </div>
                        <audio
                          ref={audioRef}
                          src={message.media_url}
                          controls
                          autoPlay
                          controlsList={blocking ? 'nodownload noplaybackrate' : undefined}
                          className="w-full"
                          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
                          onTimeUpdate={handleTimeUpdate}
                          onEnded={() => void markCompleted()}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4 p-4 sm:p-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-600 sm:text-sm">
                      <span>{blocking && !canClose ? 'Lecture complète obligatoire' : 'Lecture terminée'}</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={toggleLike}
                      disabled={isTogglingLike}
                      className={cn('rounded-full px-3 text-slate-600', isLiked && 'text-red-600')}
                    >
                      <Heart className={cn('mr-2 h-4 w-4', isLiked && 'fill-current')} />
                      {likesCount}
                    </Button>
                    <div className="inline-flex items-center rounded-full px-3 py-2 text-sm text-slate-600">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      {commentsCount}
                    </div>
                    <div className="ml-auto">
                      <Button
                        onClick={canClose ? onClose : () => undefined}
                        disabled={!canClose || isCompleting}
                        className={cn('rounded-full', canClose ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-300')}
                      >
                        {isCompleting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Validation...
                          </>
                        ) : canClose ? (
                          <>
                            <PlayCircle className="mr-2 h-4 w-4" />
                            Continuer
                          </>
                        ) : (
                          'Lecture requise'
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {comments.length === 0 ? (
                      <div className="rounded-2xl bg-[#f7f7f7] px-4 py-8 text-center text-sm text-slate-500">
                        Aucun commentaire pour l’instant.
                      </div>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="flex items-start gap-2">
                          <Avatar className="mt-1 h-8 w-8 flex-shrink-0">
                            <AvatarImage src={comment.profiles?.avatar_url ?? undefined} alt={displayName(comment)} />
                            <AvatarFallback className="bg-slate-200 text-slate-700">
                              {displayName(comment).slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-100">
                              <div className="mb-1 flex items-center justify-between gap-2">
                                <p className="truncate text-sm font-semibold text-slate-900">{displayName(comment)}</p>
                                {user?.id === comment.user_id && (
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => void deleteComment(comment.id)}
                                    disabled={isDeletingComment}
                                    className="h-7 w-7 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                              {comment.comment_type === 'audio' && comment.audio_url ? (
                                <audio controls src={comment.audio_url} className="mt-1 w-full" />
                              ) : (
                                <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{comment.content}</p>
                              )}
                            </div>
                            <p className="mt-1 px-2 text-[11px] text-slate-500">
                              {new Date(comment.created_at).toLocaleString('fr-FR', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-white px-2 py-2 sm:px-4 sm:py-3">
              <div className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-[28px] bg-white px-2 py-2 shadow-sm ring-1 ring-slate-200">
                <div className="min-w-0 flex-1">
                  {isRecording && (
                    <div className="px-2 pb-1 text-xs font-medium text-red-500">
                      Enregistrement en cours... {formatRecordingTime(recordingTime)}
                    </div>
                  )}
                  <Textarea
                    ref={textareaRef}
                    value={commentDraft}
                    onChange={(event) => setCommentDraft(event.target.value)}
                    placeholder="Écrire un commentaire..."
                    className="min-h-[40px] max-h-[120px] resize-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0"
                    disabled={isCommentActionPending || isRecording}
                    rows={1}
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleCommentPrimaryAction}
                  disabled={isCommentActionPending}
                  size="icon"
                  className={cn(
                    'h-10 w-10 rounded-full transition-all',
                    isRecording
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : hasTextToSend
                        ? 'bg-[#25d366] text-white hover:bg-[#20c55a]'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                  )}
                  title={isRecording ? 'Arrêter l’enregistrement' : hasTextToSend ? 'Envoyer le commentaire' : 'Enregistrer un commentaire vocal'}
                >
                  {isCommentActionPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isRecording ? (
                    <Square className="h-4 w-4 fill-current" />
                  ) : hasTextToSend ? (
                    <Send className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicMessagePlayerOverlay;