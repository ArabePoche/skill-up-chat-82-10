import React, { useEffect, useState, useRef } from 'react';

import { ArrowLeft, Phone, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStudentMessages, useLessonExercises } from '@/hooks/useStudentMessages';
import { useSendMessage } from '@/hooks/useSendMessage';
import { useMarkMessagesAsRead } from '@/hooks/useMarkMessagesAsRead';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { useLessonAccessControl } from '@/hooks/useLessonAccessControl';
import { usePlanLimits } from '@/plan-limits/hooks/usePlanLimits';
import { useCallFunctionality } from '@/hooks/useCallFunctionality';
import { useStudentEvaluations } from '@/hooks/useStudentEvaluations';
import { useCallNotifications } from '@/hooks/useCallNotifications';
import AgoraCallUI from '@/call-system/components/AgoraCallUI';
import ChatInputBar from './chat/ChatInputBar';
import MessageList from './chat/MessageList';
import DateSeparator from './chat/DateSeparator';
import QuizPlayer from './quiz/QuizPlayer';

import { groupMessagesByDate } from '@/utils/dateUtils';
import { LessonVideoPlayerWithTimer } from './video/LessonVideoPlayerWithTimer';
import { SubscriptionUpgradeModal } from './chat/SubscriptionUpgradeModal';
import VideoMessageSwitch from './video/VideoMessageSwitch';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useLessonUnlocking } from '@/hooks/useLessonUnlocking';
import { useMarkLessonAsCompleted } from '@/hooks/useMarkLessonAsCompleted';
import { useQuiz } from '@/hooks/quiz/useQuiz';
import { CheckCircle } from 'lucide-react';


interface ChatInterfaceProps {
  lesson: {
    id: number | string;
    title: string;
    video_url?: string;
  };
  formation: {
    id: string;
    title: string;
  };
  onBack: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ lesson, formation, onBack }) => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    content: string;
    sender_name: string;
  } | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  
  const { data: messages = [], isLoading } = useStudentMessages(
    lesson.id.toString(), 
    formation.id
  );
  
  const { data: exercises = [], isLoading: exercisesLoading } = useLessonExercises(lesson.id.toString());
  const { data: userRole } = useUserRole(formation.id);
  const { data: evaluations = [] } = useStudentEvaluations();

  const { data: unlockedLessons } = useLessonUnlocking(formation.id);
  const { data: quiz, isLoading: isQuizLoading } = useQuiz(lesson.id.toString());
  const { mutate: markAsCompleted, isPending: isMarkingCompleted } = useMarkLessonAsCompleted();

  const currentLessonProgress = unlockedLessons?.find((l: any) => l.lesson_id === lesson.id.toString());
  const isCompleted = currentLessonProgress?.status === 'completed';

  const handleMarkAsCompleted = () => {
    markAsCompleted({ lessonId: lesson.id, formationId: formation.id });
  };
  
  const sendMessageMutation = useSendMessage(lesson.id.toString(), formation.id);
  const markAsReadMutation = useMarkMessagesAsRead();

// realtime hooks handled in MessageList to avoid duplicate subscriptions

  // Fonctionnalités d'appel
  const { initiateCall, acceptedCall, closeAgoraUI, openAgoraUI } = useCallFunctionality(formation.id);
  const { incomingCall, dismissCall, acceptCall: acceptNotificationCall, rejectCall } = useCallNotifications();

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
    () => {
      // Cette fonction sera appelée par le modal
    }
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

  useEffect(() => {
    if (messages.length > 0 && userRole?.role === 'teacher' && user) {
      const unreadMessages = messages.filter(msg => !msg.is_read && msg.sender_id !== user.id);
      if (unreadMessages.length > 0) {
        markAsReadMutation.mutate({
          lessonId: lesson.id.toString(),
          formationId: formation.id,
          studentId: unreadMessages[0].sender_id
        });
      }
    }
  }, [messages, userRole, lesson.id, formation.id, markAsReadMutation, user]);

  const handleSendMessage = (content: string, messageType = 'text', file?: File, repliedToMessageId?: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    sendMessageMutation.mutate({
      content,
      messageType,
      file,
      isExerciseSubmission: messageType === 'file' || messageType === 'image',
      repliedToMessageId
    });
  };

  const handleCall = async (type: 'audio' | 'video') => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Pour les élèves, initier un appel vers tous les professeurs
    if (userRole?.role === 'student') {
      const success = await initiateCall(type, '', lesson.id.toString());
      if (success) {
        toast.info(`${t(type === 'video' ? 'formation.videoCall' : 'formation.audioCall')} ${t('video.share').toLowerCase()}`);
      }
    } else {
      toast.info(t('formation.audioCall'));
    }
  };

  const handleValidateExercise = (messageId: string, isValid: boolean) => {
    if (!user) {
      navigate('/auth');
      return;
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
    
    // Attendre un peu pour que le DOM soit mis à jour
    setTimeout(() => {
      const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
      
      
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
          <div className="text-lg font-semibold mb-2">{t('formation.verifying')}</div>
          <p className="text-gray-600">{t('formation.connecting')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#e5ddd5] flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">{t('common.loading')}</div>
          <p className="text-gray-600">{t('formation.loadingMessages')}</p>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-[#e5ddd5] flex flex-col relative">
      {/* Notifications d'appels entrants */}
      {incomingCall && userRole?.role === 'teacher' && (
        <div className="fixed top-20 right-4 bg-white border rounded-lg shadow-lg p-4 z-50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">{t('formation.incomingCall')}</h3>
            <span className="text-sm text-gray-500">
              {incomingCall.call_type === 'video' ? '📹' : '📞'}
            </span>
          </div>
          <p className="text-sm mb-3">
            {t('formation.incomingCallMsg')}
          </p>
          <div className="flex space-x-2">
            <Button 
              size="sm" 
              onClick={async () => {
                await acceptNotificationCall(incomingCall.id);
                openAgoraUI({
                  id: incomingCall.id,
                  callType: (incomingCall.call_type === 'video' ? 'video' : 'audio') as 'audio' | 'video',
                  channelName: `call_${incomingCall.id}`,
                  callerName: 'Élève',
                });
              }}
              className="bg-green-500 hover:bg-green-600"
            >
              {t('formation.accept')}
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => rejectCall(incomingCall.id)}
            >
              {t('formation.reject')}
            </Button>
          </div>
        </div>
      )}

      {/* Header responsive avec boutons d'appel intégrés */}
      <div className="bg-[#25d366] text-white p-3 sm:p-4 fixed top-0 left-0 right-0 z-50  border-b shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-1 min-w-0">
            <button
              onClick={onBack}
              className="mr-2 sm:mr-3 p-2 hover:bg-white/10 rounded-full transition-colors flex-shrink-0"
            >
              <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
            </button>
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
              <span className="text-white font-bold text-xs sm:text-sm">📚</span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-sm sm:text-base md:text-lg truncate">{lesson.title}</h1>
              <p className="text-xs sm:text-sm text-white/80 truncate">
                {t('formation.formationLabel')} {formation.title}
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs text-white/60">
              {/* Indicateur de frappe en-tête supprimé (géré en liste) */}
              </div>
            </div>
          </div>
          
          {/* Boutons d'appel responsifs - uniquement pour les élèves */}
          {userRole?.role === 'student' && (
            <div className="flex items-center space-x-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCall('video')}
                className="p-2 hover:bg-white/10 rounded-full text-white"
                title={t('formation.videoCall')}
              >
                <Video size={18} className="sm:w-5 sm:h-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCall('audio')}
                className="p-2 hover:bg-white/10 rounded-full text-white"
                title={t('formation.audioCall')}
              >
                <Phone size={18} className="sm:w-5 sm:h-5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Modal d'upgrade au lieu d'alerte inline */}
      <SubscriptionUpgradeModal
        isOpen={accessControl.showAlert}
        onClose={accessControl.hideAlert}
        message={accessControl.alertMessage}
        formationId={formation.id}
        variant={accessControl.alertVariant}
      />

      {/* Section vidéo avec timer intégré - responsive */}
      {lesson.video_url && (
        <div ref={videoRef} className="bg-black mt-[60px]">
          <LessonVideoPlayerWithTimer
            src={lesson.video_url}
            formationId={formation.id}
            lessonId={lesson.id.toString()}
            onUpgrade={() => navigate(`/formation/${formation.id}/pricing`)}
            onPlayStateChange={setIsVideoPlaying}
            className="w-full"
          />
          {/* Quiz sous la vidéo - visible uniquement pour les élèves */}
          {userRole?.role !== 'teacher' && (
            <QuizPlayer lessonId={lesson.id.toString()} />
          )}

          {/* Bouton Terminer pour les leçons libres (sans quiz ni exercices) */}
          {userRole?.role !== 'teacher' && !isCompleted && !quiz && !isQuizLoading && !exercisesLoading && (!exercises || exercises.length === 0) && (
             <div className="p-4 flex justify-center bg-gray-900 border-t border-gray-800">
               <Button 
                onClick={handleMarkAsCompleted} 
                disabled={isMarkingCompleted} 
                className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
               >
                 <CheckCircle className="mr-2 h-4 w-4" />
                 {t('lesson.markAsCompleted', 'Terminer la leçon')}
               </Button>
             </div>
          )}
        </div>
      )}

      {/* Bouton Switch */}
      <VideoMessageSwitch
        onScrollToVideo={scrollToVideo}
        onScrollToMessages={scrollToMessages}
      />

      {/* Messages - responsive */}
      <div ref={messagesRef} className="flex-1 flex flex-col p-24 min-h-0 pt-[100px] pb-[80px] px-2 md:px-4">
        <MessageList
          messages={messages}
          exercises={exercises}
          formationId={formation.id.toString()}
          lessonId={lesson.id.toString()}
          isTeacherView={userRole?.role === 'teacher'}
          isTeacher={userRole?.role === 'teacher'}
          onValidateExercise={() => {}}
          evaluations={evaluations}
          onReply={handleReply}
          highlightedMessageId={highlightedMessageId}
          onScrollToMessage={handleScrollToMessage}
        />
      </div>

      {/* Chat Input - responsive - jamais désactivé */}
      <div className="bg-background border-t p-2 sm:p-4 fixed bottom-0 left-0 right-0 z-50 bg-white border-b shadow-sm">
        <ChatInputBar
          onSendMessage={handleSendMessage}
          disabled={sendMessageMutation.isPending}
          lessonId={lesson.id.toString()}
          formationId={formation.id}
          replyingTo={replyingTo}
          onCancelReply={handleCancelReply}
          onScrollToMessage={handleScrollToMessage}
        />
      </div>
      {/* UI Agora quand un professeur a accepté l'appel */}
      {acceptedCall && (
        <AgoraCallUI
          callId={acceptedCall.id}
          channelName={acceptedCall.channelName}
          callType={acceptedCall.callType}
          remoteUserName={acceptedCall.callerName || (userRole?.role === 'teacher' ? 'Élève' : 'Professeur')}
          onEndCall={closeAgoraUI}
        />
      )}

    </div>
  );
};

export default ChatInterface;