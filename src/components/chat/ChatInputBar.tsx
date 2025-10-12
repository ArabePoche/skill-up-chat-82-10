import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useFileUpload } from '@/hooks/useFileUpload';
import EmojiPicker from '@/components/EmojiPicker';
import WhatsAppVoiceRecorder from './WhatsAppVoiceRecorder';
import VoiceBar from './VoiceBar';
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
  onScrollToMessage
}) => {
  const [message, setMessage] = useState('');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [showVoiceBar, setShowVoiceBar] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { startTyping, stopTyping } = useTypingIndicator(lessonId, formationId);
  const { uploadFile, isUploading } = useFileUpload();

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
    
    if (newMessage.trim() && lessonId && formationId) {
      startTyping();
    } else if (!newMessage.trim()) {
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

  const handleFileUpload = () => {
    checkAuthAndExecute(() => {
      fileInputRef.current?.click();
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && !disabled) {
      checkAuthAndExecute(async () => {
        try {
          toast.loading('Upload du fichier en cours...');
          
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
          
          toast.success('Fichier envoyé avec succès');
        } catch (error) {
          console.error('Upload error:', error);
          toast.error('Erreur lors de l\'upload');
        }
      });
    }
    
    event.target.value = '';
  };

  const handleCameraCapture = async (file: File, annotated = false) => {
    checkAuthAndExecute(async () => {
      try {
        toast.loading('Upload de la photo en cours...');
        
        const uploadResult = await uploadFile(file);
        const messageType = file.type.startsWith('video/') ? 'video' : 'image';
        
        const uploadedFile = new File([new Blob()], uploadResult.fileName, { type: file.type });
        Object.defineProperty(uploadedFile, 'uploadUrl', { value: uploadResult.fileUrl });

        onSendMessage(
          annotated ? `Image annotée: ${uploadResult.fileName}` : `Photo capturée: ${uploadResult.fileName}`,
          messageType,
          uploadedFile
        );
        
        toast.success('Photo envoyée avec succès');
      } catch (error) {
        console.error('Upload error:', error);
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
        
        setShowVoiceBar(false);
        toast.success('Message vocal envoyé');
      } catch (error) {
        console.error('Upload error:', error);
        toast.error('Erreur lors de l\'upload');
      }
    });
  };

  const handleStartVoiceRecording = () => {
    checkAuthAndExecute(() => {
      setShowVoiceBar(true);
    });
  };

  const handleCancelVoiceRecording = () => {
    setShowVoiceBar(false);
  };


  // Auto-focus sur le textarea quand on répond
  useEffect(() => {
    if (replyingTo) {
      const textarea = document.querySelector('textarea[placeholder="Tapez votre message..."]') as HTMLTextAreaElement;
      textarea?.focus();
    }
  }, [replyingTo]);

  return (
    <>
      {showVoiceBar ? (
        <VoiceBar
          onSendVoice={handleVoiceMessage}
          onCancel={handleCancelVoiceRecording}
          disabled={isUploading}
        />
      ) : (
        <div className="bg-[#f0f0f0] border-t border-gray-200 p-2 sm:p-3 fixed bottom-0 left-0 right-0 z-50">
          {/* Zone de réponse */}
          {replyingTo && (
            <div className="bg-white rounded-lg p-3 mb-2 border-l-4 border-[#25d366] shadow-sm">
              <div className="flex items-start justify-between">
                <div 
                  className="flex-1 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors"
                  onClick={() => onScrollToMessage?.(replyingTo.id)}
                >
                  <div className="text-xs font-semibold mb-1" style={{ color: '#25d366' }}>
                    Réponse à <span style={{ color: '#0066cc' }}>{replyingTo.sender_name}</span>
                  </div>
                  <div className="text-sm line-clamp-2" style={{ color: '#0066cc' }}>
                    {replyingTo.content.length > 100 
                      ? `${replyingTo.content.substring(0, 100)}...` 
                      : replyingTo.content
                    }
                  </div>
                </div>
                <button
                  onClick={onCancelReply}
                  className="ml-2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={16} className="text-gray-500" />
                </button>
              </div>
            </div>
          )}
          <div className="flex items-end space-x-2 sm:space-x-3 max-w-full overflow-hidden">
            
            <button 
              onClick={() => checkAuthAndExecute(() => fileInputRef.current?.click())}
              disabled={isUploading}
              className="p-2 text-gray-500 hover:text-[#25d366] transition-colors rounded-full hover:bg-gray-200 disabled:opacity-50"
            >
              <Paperclip size={18} />
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
              onChange={handleFileSelect}
            />
            
            <div className="flex-1 flex items-end space-x-1 sm:space-x-2 bg-white rounded-3xl px-3 sm:px-4 py-2 shadow-sm min-h-[40px] sm:min-h-[48px]">
              <div className="relative">
                <button
                  onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                  className="p-1 text-gray-500 hover:text-[#25d366] transition-colors"
                >
                  <Smile size={16} className="sm:w-[18px] sm:h-[18px]" />
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
                className="flex-1 bg-transparent outline-none text-sm resize-none max-h-16 sm:max-h-20 py-1 sm:py-2 min-w-0"
                rows={1}
                style={{
                  minHeight: '18px',
                  height: 'auto'
                }}
              />
              
              <EnhancedCameraCapture
                onCapture={handleCameraCapture}
                disabled={false}
              />
            </div>
            
            {message.trim() ? (
              <Button
                onClick={sendMessage}
                className="bg-[#25d366] hover:bg-[#20c75a] p-2 sm:p-3 rounded-full shadow-lg min-w-[40px] h-[40px] sm:min-w-[48px] sm:h-[48px]"
                size="icon"
              >
                <Send size={16} className="sm:w-[18px] sm:h-[18px]" />
              </Button>
            ) : (
              <Button
                onClick={handleStartVoiceRecording}
                disabled={isUploading}
                className="bg-[#25d366] hover:bg-[#20c75a] p-2 sm:p-3 rounded-full shadow-lg min-w-[40px] h-[40px] sm:min-w-[48px] sm:h-[48px]"
                size="icon"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="sm:w-[18px] sm:h-[18px]">
                  <path d="M12 1C13.1 1 14 1.9 14 3V11C14 12.1 13.1 13 12 13C10.9 13 10 12.1 10 11V3C10 1.9 10.9 1 12 1Z" fill="currentColor"/>
                  <path d="M19 11C19 15.4 15.4 19 11 19V21H13C13.6 21 14 21.4 14 22C14 22.6 13.6 23 13 23H11C10.4 23 10 22.6 10 22C10 21.4 10.4 21 11 21V19C6.6 19 3 15.4 3 11C3 10.4 3.4 10 4 10C4.6 10 5 10.4 5 11C5 14.3 7.7 17 11 17C14.3 17 17 14.3 17 11C17 10.4 17.4 10 18 10C18.6 10 19 10.4 19 11Z" fill="currentColor"/>
                </svg>
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ChatInputBar;