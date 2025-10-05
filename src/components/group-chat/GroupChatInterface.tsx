
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
import { usePlanLimits } from '@/plan-limits/hooks/usePlanLimits';
import { useLessonAccessControl } from '@/hooks/useLessonAccessControl';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useLevelExercises } from '@/hooks/group-chat/useLevelExercises';

// Hooks spécifiques au chat de groupe
import { useChatMode } from '@/hooks/chat/useChatMode';
import { usePromotionMessages } from '@/hooks/lesson-messages/usePromotionMessages';
import { useSendPromotionMessage } from '@/hooks/group-chat/useSendPromotionMessage';
import { useProgressionLogic } from '@/hooks/group-chat/useProgressionLogic';
import { useGroupLessonId } from '@/hooks/group-chat/useGroupLessonId';

// Réutilisation des composants existants de ChatInterface
import ChatInputBar from '../chat/ChatInputBar';
import MessageList from '../chat/MessageList';
import { SubscriptionUpgradeModal } from '../chat/SubscriptionUpgradeModal';
import VideoMessageSwitch from '../video/VideoMessageSwitch';
import { LessonVideoPlayerWithTimer } from '../video/LessonVideoPlayerWithTimer';
import { Button } from '../ui/button';
import { GroupInfoDrawer } from './GroupInfoDrawer';
import { toast } from 'sonner';

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
    video_url?: string;
    duration?: string;
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
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const videoRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  
  // Détection automatique du mode de chat
  const { mode, isLoading: chatModeLoading, promotionId } = useChatMode(formation.id);
  
  // Si ce n'est pas un mode groupe, rediriger vers ChatInterface
  useEffect(() => {
    if (!chatModeLoading && mode === 'private') {
      console.log('🔄 Redirecting to private chat mode');
      toast.info('Vous êtes en mode formation privée');
    }
  }, [mode, chatModeLoading]);
  
  // Récupération des messages avec logique de groupe
  const { data: messages = [], isLoading } = usePromotionMessages(
    level.id.toString(),
    formation.id,
    promotionId || '',
    'level'
  );
  
  // Récupérer les exercices du niveau avec le hook spécialisé
  const { data: levelExercises = [] } = useLevelExercises(level.id.toString());
  
  // Utiliser les exercices récupérés depuis la base de données
  const exercises = levelExercises;
  
  const { data: userRole } = useUserRole(formation.id);
  
  // Déterminer le bon lessonId pour le chat de groupe
  const { data: groupLessonId, isLoading: isLoadingLessonId } = useGroupLessonId(level.id.toString(), formation.id);
  
  console.log('🔍 GroupChatInterface: Group lesson ID determined:', { 
    levelId: level.id, 
    groupLessonId, 
    isLoadingLessonId 
  });
  
  // Opérations de chat de groupe
  const sendMessage = useSendPromotionMessage(formation.id);
  const { uploadFile } = useFileUpload();
  
  // Logique de progression séquentielle
  const { validateExercise } = useProgressionLogic(formation.id, level.id.toString());

  // Fonctionnalités d'appel réutilisées
  const { initiateCall } = useCallFunctionality(formation.id);
  const { incomingCall, dismissCall, acceptCall, rejectCall } = useCallNotifications();

  // Nouveau système de limites centralisé
  const planLimits = usePlanLimits({
    formationId: formation.id,
    context: 'chat',
    isActive: true
  });

  // Contrôle d'accès centralisé avec modal
  const accessControl = useLessonAccessControl(
    formation.id,
    isVideoPlaying,
    () => {}
  );

  // Fonctions de scroll pour le switch
  const scrollToVideo = () => {
    videoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToMessages = () => {
    messagesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

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

      console.log('📤 Sending group message with data:', { content, messageType, fileUrl, fileType, fileName, groupLessonId });

      if (!groupLessonId) {
        console.error('❌ GroupChatInterface: No lesson ID available for sending message');
        toast.error('Impossible d\'envoyer le message : leçon non déterminée');
        return;
      }

      await sendMessage.mutateAsync({
        lessonId: groupLessonId, // Utiliser le lessonId déterminé par useGroupLessonId
        levelId: level.id.toString(),
        content,
        messageType,
        fileUrl,
        fileType,
        fileName,
        isExerciseSubmission: messageType === 'file' || messageType === 'image',
        promotionId: promotionId || '',
        repliedToMessageId
      });
      
      console.log('✅ GroupChatInterface: Message sent successfully with lessonId:', {
        lessonId: groupLessonId,
        levelId: level.id.toString(),
        promotionId: promotionId || '',
        content: content.substring(0, 50) + '...'
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

    if (userRole?.role === 'student') {
      const success = await initiateCall(type, '', level.id.toString());
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
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleScrollToMessage = (messageId: string) => {
    setTimeout(() => {
      const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedMessageId(messageId);
        setTimeout(() => setHighlightedMessageId(null), 3000);
      }
    }, 100);
  };

  const handleOpenVideo = (lesson: any) => {
    setSelectedVideo(lesson);
  };

  const handleCloseVideo = () => {
    setSelectedVideo(null);
  };

  const handleValidateExercise = async (
    messageId: string, 
    isValid: boolean, 
    rejectReason?: string,
    exerciseId?: string,
    lessonId?: string
  ) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (!exerciseId || !lessonId) {
      console.error('Missing exerciseId or lessonId for validation');
      toast.error('Erreur: informations d\'exercice manquantes');
      return;
    }

    try {
      await validateExercise.mutateAsync({
        messageId,
        isValid,
        rejectReason,
        exerciseId,
        lessonId
      });
    } catch (error) {
      console.error('Error validating exercise:', error);
      toast.error('Erreur lors de la validation');
    }
  };

  if (authLoading || chatModeLoading) {
    return (
      <div className="min-h-screen bg-[#e5ddd5] flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">Chargement...</div>
          <p className="text-gray-600">Configuration du chat de groupe</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (isLoading || !promotionId) {
    return (
      <div className="min-h-screen bg-[#e5ddd5] flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">
            {!promotionId ? 'Configuration en cours...' : 'Chargement...'}
          </div>
          <p className="text-gray-600">
            {!promotionId 
              ? 'Veuillez patienter pendant que nous configurons votre accès au groupe.'
              : 'Récupération des messages du groupe'
            }
          </p>
        </div>
      </div>
    );
  }

  // Affichage du lecteur vidéo si une vidéo est sélectionnée
  if (selectedVideo) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <div className="bg-[#25d366] text-white p-3 flex items-center">
          <button
            onClick={handleCloseVideo}
            className="mr-3 p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-semibold text-sm">{selectedVideo.title}</h1>
            <p className="text-xs text-white/80">Niveau: {level.title}</p>
          </div>
        </div>
        
        <div className="flex-1">
          <LessonVideoPlayerWithTimer
            src={selectedVideo.video_url}
            formationId={formation.id}
            onUpgrade={() => navigate(`/formation/${formation.id}/pricing`)}
            onPlayStateChange={() => {}}
            className="w-full h-full"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#e5ddd5] flex flex-col relative">
      {/* Notifications d'appels entrants - réutilisé de ChatInterface */}
      {incomingCall && userRole?.role === 'teacher' && (
        <div className="fixed top-20 right-4 bg-white border rounded-lg shadow-lg p-4 z-50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Appel entrant</h3>
            <span className="text-sm text-gray-500">
              {incomingCall.call_type === 'video' ? '📹' : '📞'}
            </span>
          </div>
          <p className="text-sm mb-3">
            Vous avez un appel entrant
          </p>
          <div className="flex space-x-2">
            <Button 
              size="sm" 
              onClick={() => acceptCall(incomingCall.id)}
              className="bg-green-500 hover:bg-green-600"
            >
              Accepter
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => rejectCall(incomingCall.id)}
            >
              Rejeter
            </Button>
          </div>
        </div>
      )}

      {/* Header cliquable pour ouvrir les infos du groupe */}
      <div className="bg-[#25d366] text-white p-3 sm:p-4 fixed top-0 left-0 right-0 z-50 border-b shadow-sm">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center flex-1 min-w-0 cursor-pointer hover:bg-white/5 rounded-lg transition-colors p-1 -ml-1"
            onClick={() => setShowGroupInfo(true)}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onBack();
              }}
              className="mr-2 sm:mr-3 p-2 hover:bg-white/10 rounded-full transition-colors flex-shrink-0"
            >
              <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
            </button>
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
              <span className="text-white font-bold text-xs sm:text-sm">🎓</span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-sm sm:text-base md:text-lg truncate">Niveau: {level.title}</h1>
              <p className="text-xs sm:text-sm text-white/80 truncate">
                Formation: {formation.title} 
              </p>
            </div>
          </div>
          
          {/* Boutons d'appel - réutilise le style de ChatInterface */}
          {userRole?.role === 'student' && (
            <div className="flex items-center space-x-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCall('video')}
                className="p-2 hover:bg-white/10 rounded-full text-white"
                title="Appel vidéo"
              >
                <Video size={18} className="sm:w-5 sm:h-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCall('audio')}
                className="p-2 hover:bg-white/10 rounded-full text-white"
                title="Appel audio"
              >
                <Phone size={18} className="sm:w-5 sm:h-5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Drawer d'informations du groupe */}
      <GroupInfoDrawer
        level={{
          ...level,
          id: level.id.toString()
        }}
        formation={formation}
        promotionId={promotionId || null}
        isOpen={showGroupInfo}
        onClose={() => setShowGroupInfo(false)}
      />

      {/* Modal d'upgrade - réutilisé de ChatInterface */}
      <SubscriptionUpgradeModal
        isOpen={accessControl.showAlert}
        onClose={accessControl.hideAlert}
        message={accessControl.alertMessage}
        formationId={formation.id}
        variant={accessControl.alertVariant}
      />


      {/* Bouton Switch - réutilisé de ChatInterface */}
      <VideoMessageSwitch
        onScrollToVideo={scrollToVideo}
        onScrollToMessages={scrollToMessages}
      />

      {/* Messages - réutilise MessageList de ChatInterface */}
      <div ref={messagesRef} className="flex-1 flex flex-col min-h-0 pt-[100px] pb-[80px] px-2 md:px-4">
        

        <MessageList
          messages={messages}
          exercises={exercises}
          formationId={formation.id}
          lessonId={level.id.toString()}
          isTeacherView={userRole?.role === 'teacher'}
          isTeacher={userRole?.role === 'teacher'}
          onValidateExercise={handleValidateExercise}
          evaluations={[]}
          onReply={handleReply}
          highlightedMessageId={highlightedMessageId}
          onScrollToMessage={handleScrollToMessage}
          onOpenVideo={handleOpenVideo}
          isGroupChat={true}
        />
      </div>

      {/* Chat Input - réutilisé de ChatInterface */}
      <div className="bg-background border-t p-2 sm:p-4 fixed bottom-0 left-0 right-0 z-50 bg-white shadow-sm">
        <ChatInputBar
          onSendMessage={handleSendMessage}
          disabled={sendMessage.isPending}
          lessonId={level.id.toString()}
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
