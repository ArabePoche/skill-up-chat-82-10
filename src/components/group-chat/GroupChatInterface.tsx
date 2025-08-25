/**
 * Interface de chat groupe qui réutilise les composants de ChatInterface
 * Spécialisée pour la progression par niveau avec logique de promotion
 */
import React, { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Phone, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useCallFunctionality } from '@/hooks/useCallFunctionality';
import { useCallNotifications } from '@/hooks/useCallNotifications';
import { useChatTimer } from '@/hooks/useChatTimer';
import { useLessonAccessControl } from '@/hooks/useLessonAccessControl';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useStudentPromotion } from '@/hooks/usePromotion';

// Réutilisation des composants existants
import ChatInputBar from '../chat/ChatInputBar';
import MessageList from '../chat/MessageList';
import { SubscriptionUpgradeModal } from '../chat/SubscriptionUpgradeModal';
import { Button } from '../ui/button';
import { toast } from 'sonner';

// Hooks spécifiques au chat groupe
import { usePromotionMessages } from '@/hooks/lesson-messages/usePromotionMessages';
import { useSendPromotionMessage } from '@/hooks/useSendPromotionMessage';

// Types
interface Level {
  id: string | number;
  title: string;
  description?: string;
  order_index: number;
  lessons?: Array<{
    id: string | number;
    title: string;
    description?: string;
    order_index: number;
    exercises?: { id: string }[];
  }>;
}

interface GroupChatInterfaceProps {
  level: Level;
  formation: {
    id: string;
    title: string;
  };
  onBack: () => void;
}

export const GroupChatInterface: React.FC<GroupChatInterfaceProps> = ({
  level,
  formation,
  onBack
}) => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    content: string;
    sender_name: string;
  } | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  
  // Utilisation de la première leçon du niveau comme référence pour les hooks
  const firstLessonId = level.lessons?.[0]?.id?.toString() || level.id.toString();
  
  // Récupérer la promotion de l'étudiant
  const { data: studentPromotion } = useStudentPromotion(formation.id);
  
  // Récupération des messages avec logique de promotion
  const { data: messages = [], isLoading } = usePromotionMessages(
    firstLessonId,
    formation.id,
    studentPromotion?.promotion_id || ''
  );
  
  const { data: userRole } = useUserRole(formation.id);
  const sendMessage = useSendPromotionMessage(formation.id);
  const { uploadFile } = useFileUpload();

  // Fonctionnalités d'appel réutilisées
  const { initiateCall } = useCallFunctionality(formation.id);
  const { incomingCall, dismissCall, acceptCall, rejectCall } = useCallNotifications();

  // Timer pour le chat (indépendant de la vidéo)
  const chatTimer = useChatTimer({
    formationId: formation.id,
    lessonId: firstLessonId,
    isActive: true
  });

  // Contrôle d'accès centralisé avec modal
  const accessControl = useLessonAccessControl(
    formation.id,
    false, // Pas de vidéo dans le chat groupe
    () => {}
  );

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleSendMessage = async (content: string, messageType = 'text', file?: File, repliedToMessageId?: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    try {
      let fileUrl, fileType, fileName;
      
      // Si un fichier est fourni, l'uploader d'abord
      if (file) {
        const uploadResult = await uploadFile(file);
        fileUrl = uploadResult.fileUrl;
        fileType = uploadResult.fileType;
        fileName = uploadResult.fileName;
      }

      await sendMessage.mutateAsync({
        lessonId: firstLessonId,
        content,
        messageType,
        fileUrl,
        fileType,
        fileName,
        isExerciseSubmission: messageType === 'file' || messageType === 'image'
      });
    } catch (error) {
      console.error('Error sending group message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    }
  };

  const handleCall = async (type: 'audio' | 'video') => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Pour les élèves, initier un appel vers tous les professeurs
    if (userRole?.role === 'student') {
      const success = await initiateCall(type, '', firstLessonId);
      if (success) {
        toast.info(`Appel ${type === 'video' ? 'vidéo' : 'audio'} envoyé aux professeurs`);
      }
    } else {
      toast.info('Fonctionnalité d\'appel disponible pour les élèves');
    }
  };

  const handleReply = (message: any) => {
    const senderName = message.profiles?.username || 
                      `${message.profiles?.first_name || ''} ${message.profiles?.last_name || ''}`.trim() ||
                      'Utilisateur';
    
    setReplyingTo({
      id: message.id,
      content: message.content,
      sender_name: senderName
    });
    
    // Scroll vers l'input
    const inputContainer = document.querySelector('.bg-\\[\\#f0f0f0\\]');
    inputContainer?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleScrollToMessage = (messageId: string) => {
    console.log('Scrolling to message:', messageId);
    
    setTimeout(() => {
      const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
      console.log('Found message element:', messageElement);
      
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Highlight temporaire
        setHighlightedMessageId(messageId);
        setTimeout(() => setHighlightedMessageId(null), 3000);
      }
    }, 100);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#e5ddd5] flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">Vérification...</div>
          <p className="text-gray-600">Connexion en cours</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (isLoading || !studentPromotion) {
    return (
      <div className="min-h-screen bg-[#e5ddd5] flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">
            {!studentPromotion ? 'Configuration en cours...' : 'Chargement...'}
          </div>
          <p className="text-gray-600">
            {!studentPromotion 
              ? 'Veuillez patienter pendant que nous configurons votre accès au groupe.'
              : 'Récupération des messages du groupe'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#e5ddd5] flex flex-col relative">
      {/* Messages - responsive - prend tout l'écran */}
      <div ref={messagesRef} className="flex-1 flex flex-col min-h-0 px-2 md:px-4 pt-4 pb-[80px]">
        <MessageList
          messages={messages}
          exercises={[]} // Les exercices sont intégrés dans les messages système pour les groupes
          formationId={formation.id}
          lessonId={firstLessonId}
          isTeacherView={userRole?.role === 'teacher'}
          isTeacher={userRole?.role === 'teacher'}
          onValidateExercise={() => {}}
          evaluations={[]}
          onReply={handleReply}
          highlightedMessageId={highlightedMessageId}
          onScrollToMessage={handleScrollToMessage}
        />
      </div>

      {/* Chat Input - responsive - réutilisation du composant existant */}
      <div className="bg-background border-t p-2 sm:p-4 fixed bottom-0 left-0 right-0 z-50 bg-white border-b shadow-sm">
        <ChatInputBar
          onSendMessage={handleSendMessage}
          disabled={sendMessage.isPending}
          lessonId={firstLessonId}
          formationId={formation.id}
          replyingTo={replyingTo}
          onCancelReply={handleCancelReply}
          onScrollToMessage={handleScrollToMessage}
          contactName={level.title}
          formationTitle={formation.title}
          lessonTitle={`Niveau: ${level.title}`}
        />
      </div>
    </div>
  );
};