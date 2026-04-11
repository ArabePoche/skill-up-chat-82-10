import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Mic, Paperclip, Pause, Play, Send, Smile, Square, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useFileUpload } from '@/hooks/useFileUpload';
import EmojiPicker from '@/components/EmojiPicker';
import EnhancedCameraCapture from './EnhancedCameraCapture';
import { toast } from 'sonner';

interface ChatInputBarProps {
  onSendMessage: (content: string, messageType?: string, file?: File, repliedToMessageId?: string) => void;
  disabled?: boolean;
  lessonId?: string;
  formationId?: string;
  contactName?: string;
  contactAvatar?: string;
  formationTitle?: string;
  lessonTitle?: string;
  replyingTo?: {
    id: string;
    content: string;
    sender_name: string;
  } | null;
  onCancelReply?: () => void;
  onScrollToMessage?: (messageId: string) => void;
  onTyping?: (activity?: 'typing' | 'recording') => void;
}

const ChatInputBar: React.FC<ChatInputBarProps> = ({ 
  onSendMessage, 
  disabled = false,
  lessonId = '',
  formationId = '',
  contactName = 'Contact',
  contactAvatar,
  formationTitle,
  lessonTitle,
  replyingTo,
  onCancelReply,
  onScrollToMessage,
  onTyping
}) => {
  const [message, setMessage] = useState('');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [voiceDraftBlob, setVoiceDraftBlob] = useState<Blob | null>(null);
  const [voiceDraftUrl, setVoiceDraftUrl] = useState<string | null>(null);
  const [isPlayingVoiceDraft, setIsPlayingVoiceDraft] = useState(false);
  const [voiceDraftDuration, setVoiceDraftDuration] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioPreviewRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { startTyping, stopTyping } = useTypingIndicator(lessonId, formationId);
  const { uploadFile, isUploading } = useFileUpload();

  const clearRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const stopRecordingStream = () => {
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
  };

  const clearVoiceDraft = () => {
    audioPreviewRef.current?.pause();
    setIsPlayingVoiceDraft(false);
    setVoiceDraftBlob(null);
    setVoiceDraftDuration(0);
    setRecordingTime(0);

    if (voiceDraftUrl) {
      URL.revokeObjectURL(voiceDraftUrl);
      setVoiceDraftUrl(null);
    }
  };

  const checkAuthAndExecute = (action: () => void) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    action();
  };

  const sendMessage = () => {
    if (!message.trim()) return;
    
    if (!user) {
      navigate('/auth');
      return;
    }

    // Construire le contenu avec la réponse si nécessaire
    let content = message;
    let repliedToMessageId = undefined;
    if (replyingTo) {
      content = message;
      repliedToMessageId = replyingTo.id;
      onCancelReply?.();
    }

    // Envoyer le message sans restriction
    onSendMessage(content, 'text', undefined, repliedToMessageId);
    setMessage('');
    stopTyping();
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMessage = e.target.value;
    setMessage(newMessage);
    
    if (newMessage.trim()) {
      if (lessonId && formationId) startTyping();
      onTyping?.();
    } else {
      stopTyping();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
    if (lessonId && formationId) {
      startTyping();
    }
    setIsEmojiPickerOpen(false);
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

  const handleFileUpload = () => {
    checkAuthAndExecute(() => {
      fileInputRef.current?.click();
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && !disabled) {
      checkAuthAndExecute(async () => {
        const toastId = toast.loading('Chargement du fichier en cours...');
        try {
          
          const uploadResult = await uploadFile(file);
          
          let messageType = 'file';
          if (file.type.startsWith('image/')) {
            messageType = 'image';
          } else if (file.type.startsWith('video/')) {
            messageType = 'video';
          } else if (file.type.startsWith('audio/')) {
            messageType = 'audio';
          }

          const uploadedFile = new File([new Blob()], uploadResult.fileName, { type: file.type });
          Object.defineProperty(uploadedFile, 'uploadUrl', { value: uploadResult.fileUrl });

          onSendMessage(
            `Fichier partagé: ${uploadResult.fileName}`,
            messageType,
            uploadedFile
          );
          
          toast.dismiss(toastId);
          toast.success('Fichier envoyé avec succès');
        } catch (error) {
          console.error('Upload error:', error);
          toast.dismiss(toastId);
          toast.error('Erreur lors de l\'upload');
        }
      });
    }
    
    event.target.value = '';
  };

  const handleCameraCapture = async (file: File, annotated = false) => {
    checkAuthAndExecute(async () => {
      const toastId = toast.loading('Envoi en cours...');
      try {
        const uploadResult = await uploadFile(file);
        const messageType = file.type.startsWith('video/') ? 'video' : 'image';
        
        const uploadedFile = new File([new Blob()], uploadResult.fileName, { type: file.type });
        Object.defineProperty(uploadedFile, 'uploadUrl', { value: uploadResult.fileUrl });

        onSendMessage(
          '',
          messageType,
          uploadedFile
        );
        
        toast.dismiss(toastId);
        toast.success('Photo envoyée');
      } catch (error) {
        console.error('Upload error:', error);
        toast.dismiss(toastId);
        toast.error('Erreur lors de l\'upload');
      }
    });
  };

  const handleVoiceMessage = async (file: File) => {
    checkAuthAndExecute(async () => {
      try {
        toast.loading('Upload du message vocal...');
        
        const uploadResult = await uploadFile(file);
        
        // Créer un fichier avec l'URL uploadée en propriété
        const uploadedFile = new File([new Blob()], uploadResult.fileName, { type: file.type });
        Object.defineProperty(uploadedFile, 'uploadUrl', { value: uploadResult.fileUrl });

        toast.dismiss();
        
        // Inclure repliedToMessageId si on répond à un message
        let repliedToMessageId = undefined;
        if (replyingTo) {
          repliedToMessageId = replyingTo.id;
          onCancelReply?.();
        }
        
        onSendMessage(
          '🎤 Message vocal',
          'audio',
          uploadedFile,
          repliedToMessageId
        );

        clearVoiceDraft();
        toast.success('Message vocal envoyé');
      } catch (error) {
        console.error('Upload error:', error);
        toast.error('Erreur lors de l\'upload');
      }
    });
  };

  const handleStartVoiceRecording = () => {
    checkAuthAndExecute(() => {
      void (async () => {
        try {
          if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error('Votre navigateur ne supporte pas l\'enregistrement audio.');
          }

          clearVoiceDraft();

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
          recordingChunksRef.current = [];

          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              recordingChunksRef.current.push(event.data);
            }
          };

          mediaRecorder.onstop = () => {
            const blob = new Blob(recordingChunksRef.current, { type: actualMimeType });
            stopRecordingStream();
            clearRecordingTimer();
            setIsRecording(false);

            if (blob.size === 0) {
              setRecordingTime(0);
              return;
            }

            const url = URL.createObjectURL(blob);
            setVoiceDraftBlob(blob);
            setVoiceDraftUrl(url);

            const previewAudio = new Audio(url);
            previewAudio.onloadedmetadata = () => {
              setVoiceDraftDuration(previewAudio.duration || 0);
            };
          };

          mediaRecorder.start(100);
          setIsRecording(true);
          setRecordingTime(0);

          clearRecordingTimer();
          recordingTimerRef.current = setInterval(() => {
            setRecordingTime((previous) => previous + 1);
          }, 1000);

          if (lessonId && formationId) startTyping();
          onTyping?.('recording');
        } catch (error) {
          console.error('Erreur accès microphone:', error);
          toast.error(error instanceof Error ? error.message : 'Impossible d\'accéder au microphone.');
        }
      })();
    });
  };

  const handleStopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (!message.trim()) {
      stopTyping();
    }
  };

  const handleDeleteVoiceDraft = () => {
    clearVoiceDraft();
    if (!message.trim()) {
      stopTyping();
    }
  };

  const handleToggleVoiceDraftPlayback = async () => {
    const audio = audioPreviewRef.current;
    if (!audio || !voiceDraftUrl) {
      return;
    }

    if (isPlayingVoiceDraft) {
      audio.pause();
      return;
    }

    try {
      await audio.play();
    } catch (error) {
      console.error('Lecture audio impossible:', error);
      toast.error('Impossible de lire ce vocal.');
    }
  };

  const handleSendVoiceDraft = () => {
    if (!voiceDraftBlob) {
      return;
    }

    const fileExt = voiceDraftBlob.type.includes('mp4') ? 'mp4' : voiceDraftBlob.type.includes('ogg') ? 'ogg' : 'webm';
    const file = new File([voiceDraftBlob], `vocal_${Date.now()}.${fileExt}`, {
      type: voiceDraftBlob.type || 'audio/webm',
    });

    void handleVoiceMessage(file);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      clearRecordingTimer();
      const mediaRecorder = mediaRecorderRef.current;
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      stopRecordingStream();
      if (voiceDraftUrl) {
        URL.revokeObjectURL(voiceDraftUrl);
      }
    };
  }, [voiceDraftUrl]);


  // Auto-focus sur le textarea quand on répond
  useEffect(() => {
    if (replyingTo) {
      const textarea = document.querySelector('textarea[placeholder="Tapez votre message..."]') as HTMLTextAreaElement;
      textarea?.focus();
    }
  }, [replyingTo]);

  const hasTextMessage = message.trim().length > 0;
  const hasVoiceDraft = Boolean(voiceDraftBlob && voiceDraftUrl);
  const primaryActionIcon = isUploading ? (
    <Loader2 className="w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] animate-spin" />
  ) : hasTextMessage || hasVoiceDraft ? (
    <Send className="w-[16px] h-[16px] sm:w-[18px] sm:h-[18px]" />
  ) : isRecording ? (
    <Square className="w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] fill-current" />
  ) : (
    <Mic className="w-[16px] h-[16px] sm:w-[18px] sm:h-[18px]" />
  );

  const handlePrimaryAction = () => {
    if (isUploading) {
      return;
    }

    if (hasTextMessage) {
      sendMessage();
      return;
    }

    if (isRecording) {
      handleStopVoiceRecording();
      return;
    }

    if (hasVoiceDraft) {
      handleSendVoiceDraft();
      return;
    }

    handleStartVoiceRecording();
  };

  return (
    <>
        <div className="bg-[#f0f0f0] border-t border-gray-200 p-[0.5rem] sm:p-[0.75rem] fixed bottom-0 left-0 right-0 z-50">
          {/* Zone de réponse */}
          {replyingTo && (
            <div className="bg-white rounded-lg p-[0.75rem] mb-[0.5rem] border-l-4 border-[#25d366] shadow-sm">
              <div className="flex items-start justify-between">
                <div 
                  className="flex-1 cursor-pointer hover:bg-gray-50 p-[0.25rem] rounded transition-colors"
                  onClick={() => onScrollToMessage?.(replyingTo.id)}
                >
                  <div className="text-[0.75rem] font-semibold mb-[0.25rem]" style={{ color: '#25d366' }}>
                    Réponse à <span style={{ color: '#0066cc' }}>{replyingTo.sender_name}</span>
                  </div>
                  <div className="text-[0.875rem] line-clamp-2" style={{ color: '#0066cc' }}>
                    {replyingTo.content.length > 100 
                      ? `${replyingTo.content.substring(0, 100)}...` 
                      : replyingTo.content
                    }
                  </div>
                </div>
                <button
                  onClick={onCancelReply}
                  className="ml-[0.5rem] p-[0.25rem] hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-[1rem] h-[1rem] text-gray-500" />
                </button>
              </div>
            </div>
          )}
          <div className="flex items-end space-x-[0.5rem] sm:space-x-[0.75rem] max-w-full overflow-visible">
            
            <button 
              onClick={() => checkAuthAndExecute(() => fileInputRef.current?.click())}
              disabled={isUploading || isRecording || hasVoiceDraft}
              className="p-[0.5rem] text-gray-500 hover:text-[#25d366] transition-colors rounded-full hover:bg-gray-200 disabled:opacity-50"
            >
              <Paperclip className="w-[1.125rem] h-[1.125rem]" />
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
              onChange={handleFileSelect}
            />
            
            <div className="flex-1 min-w-0 flex items-end space-x-[0.25rem] sm:space-x-[0.5rem] bg-white rounded-3xl px-[0.75rem] sm:px-[1rem] py-[0.5rem] shadow-sm min-h-[2.5rem] sm:min-h-[3rem]">
              <div className="relative">
                <button
                  onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                  disabled={isRecording || hasVoiceDraft}
                  className="p-[0.25rem] text-gray-500 hover:text-[#25d366] transition-colors disabled:opacity-50"
                >
                  <Smile className="w-[1rem] h-[1rem] sm:w-[1.125rem] sm:h-[1.125rem]" />
                </button>
                
                {isEmojiPickerOpen && (
                  <div className="absolute bottom-12 left-0 z-50">
                    <EmojiPicker
                      onEmojiSelect={handleEmojiSelect}
                      isOpen={isEmojiPickerOpen}
                      onToggle={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                    />
                  </div>
                )}
              </div>
              
              {hasVoiceDraft ? (
                <div className="flex flex-1 items-center justify-between gap-2 py-[4px] sm:py-[8px] min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleToggleVoiceDraftPlayback()}
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#e8f5e9] text-[#25d366] transition-colors hover:bg-[#d9f2dc]"
                    >
                      {isPlayingVoiceDraft ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-700">Message vocal prêt</p>
                      <p className="text-xs text-slate-500">{formatTime(Math.floor(voiceDraftDuration || recordingTime))}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteVoiceDraft}
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : isRecording ? (
                <div className="flex flex-1 items-center gap-3 py-[4px] sm:py-[8px] min-w-0 text-red-500">
                  <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-red-500 animate-pulse"></span>
                  <span className="truncate text-sm font-medium">Enregistrement en cours...</span>
                  <span className="ml-auto flex-shrink-0 font-mono text-sm">{formatTime(recordingTime)}</span>
                </div>
              ) : (
                <textarea
                  value={message}
                  onChange={handleMessageChange}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  onBlur={() => {
                    stopTyping();
                  }}
                  placeholder="Tapez votre message..."
                  className="flex-1 bg-transparent outline-none resize-none max-h-[64px] sm:max-h-[80px] py-[4px] sm:py-[8px] min-w-0 leading-normal"
                  style={{ fontSize: '14px', minHeight: '18px', height: 'auto' }}
                  rows={1}
                />
              )}
              
              <EnhancedCameraCapture
                onCapture={handleCameraCapture}
                disabled={isRecording || hasVoiceDraft}
              />
            </div>

            <Button
              onClick={handlePrimaryAction}
              disabled={isUploading}
              className="bg-[#25d366] hover:bg-[#20c75a] p-[8px] sm:p-[12px] rounded-full shadow-lg min-w-[40px] h-[40px] sm:min-w-[48px] sm:h-[48px]"
              size="icon"
              title={hasTextMessage ? 'Envoyer le message' : isRecording ? 'Arrêter l’enregistrement' : hasVoiceDraft ? 'Envoyer le vocal' : 'Enregistrer un vocal'}
            >
              {primaryActionIcon}
            </Button>
          </div>
        </div>

        {voiceDraftUrl && (
          <audio
            ref={audioPreviewRef}
            src={voiceDraftUrl}
            onPlay={() => setIsPlayingVoiceDraft(true)}
            onPause={() => setIsPlayingVoiceDraft(false)}
            onEnded={() => setIsPlayingVoiceDraft(false)}
            className="hidden"
          />
        )}
    </>
  );
};

export default ChatInputBar;