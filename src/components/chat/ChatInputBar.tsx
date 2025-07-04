import React, { useState, useRef } from 'react';
import { Send, Paperclip, Smile } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import EmojiPicker from '@/components/EmojiPicker';
import WhatsAppVoiceRecorder from './WhatsAppVoiceRecorder';
import EnhancedCameraCapture from './EnhancedCameraCapture';
import { SubscriptionUpgradeModal } from './SubscriptionUpgradeModal';
import { toast } from 'sonner';

interface ChatInputBarProps {
  onSendMessage: (content: string, messageType?: string, file?: File) => void;
  disabled?: boolean;
  lessonId?: string;
  formationId?: string;
  contactName?: string;
  contactAvatar?: string;
}

const ChatInputBar: React.FC<ChatInputBarProps> = ({ 
  onSendMessage, 
  disabled = false,
  lessonId = '',
  formationId = '',
  contactName = 'Contact',
  contactAvatar
}) => {
  const [message, setMessage] = useState('');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalData, setUpgradeModalData] = useState<{
    message: string;
    restrictionType?: string;
    currentPlan?: string;
  }>({ message: '' });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { startTyping, stopTyping } = useTypingIndicator(lessonId, formationId);
  const { uploadFile, isUploading } = useFileUpload();
  const { checkPermission, incrementMessageCount } = useSubscriptionLimits(formationId);

  const checkAuthAndExecute = (action: () => void) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    action();
  };

  const showRestrictionModal = (message: string, restrictionType?: string, currentPlan?: string) => {
    setUpgradeModalData({ message, restrictionType, currentPlan });
    setShowUpgradeModal(true);
  };

  const sendMessage = () => {
    if (!message.trim()) return;
    
    if (!user) {
      navigate('/auth');
      return;
    }

    // Vérifier les permissions au moment de l'envoi
    const permission = checkPermission('message');
    if (!permission.allowed) {
      showRestrictionModal(permission.message || 'Action non autorisée', permission.restrictionType, permission.currentPlan);
      return;
    }

    // Envoyer le message si autorisé
    onSendMessage(message, 'text');
    incrementMessageCount();
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
        
        const uploadedFile = new File([new Blob()], uploadResult.fileName, { type: file.type });
        Object.defineProperty(uploadedFile, 'uploadUrl', { value: uploadResult.fileUrl });

        onSendMessage(
          'Message vocal',
          'audio',
          uploadedFile
        );
        
        toast.success('Message vocal envoyé');
      } catch (error) {
        console.error('Upload error:', error);
        toast.error('Erreur lors de l\'upload');
      }
    });
  };

  return (
    <>
      <div className="bg-[#f0f0f0] border-t border-gray-200 p-2 sm:p-3 fixed bottom-16 left-0 right-0 md:relative md:bottom-0 z-50">
        <div className="flex items-end space-x-2 sm:space-x-3 max-w-full">
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
            <WhatsAppVoiceRecorder
              onRecordingComplete={handleVoiceMessage}
              disabled={isUploading}
            />
          )}
        </div>
      </div>

      <SubscriptionUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        message={upgradeModalData.message}
        formationId={formationId}
        variant="warning"
        restrictionType={upgradeModalData.restrictionType as any}
        currentPlan={upgradeModalData.currentPlan}
      />
    </>
  );
};

export default ChatInputBar;
