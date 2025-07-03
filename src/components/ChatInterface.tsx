import React, { useEffect, useState } from 'react';
import { ArrowLeft, Phone, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStudentMessages, useLessonExercises } from '@/hooks/useStudentMessages';
import { useSendMessage } from '@/hooks/useSendMessage';
import { useMarkMessagesAsRead } from '@/hooks/useMarkMessagesAsRead';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { useLessonAccessControl } from '@/hooks/useLessonAccessControl';
import { useChatTimer } from '@/hooks/useChatTimer';
import { useCallFunctionality } from '@/hooks/useCallFunctionality';
import { useCallNotifications } from '@/hooks/useCallNotifications';
import ChatInputBar from './chat/ChatInputBar';
import MessageList from './chat/MessageList';
import { LessonVideoPlayerWithTimer } from './video/LessonVideoPlayerWithTimer';
import { SubscriptionUpgradeModal } from './chat/SubscriptionUpgradeModal';
import { Button } from './ui/button';
import { toast } from 'sonner';

import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { useTypingListener } from '@/hooks/useTypingListener';

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
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  
  const { data: messages = [], isLoading } = useStudentMessages(
    lesson.id.toString(), 
    formation.id
  );
  
  const { data: exercises = [] } = useLessonExercises(lesson.id.toString());
  const { data: userRole } = useUserRole(formation.id);
  
  const sendMessageMutation = useSendMessage(lesson.id.toString(), formation.id);
  const markAsReadMutation = useMarkMessagesAsRead();

  const { isSubscribed, connectionStatus, reconnectAttempts, maxReconnectAttempts } = useRealtimeMessages(lesson.id.toString(), formation.id);
  const typingUsers = useTypingListener(lesson.id.toString(), formation.id);

  // Fonctionnalités d'appel
  const { initiateCall } = useCallFunctionality(formation.id);
  const { incomingCalls, acceptCall, rejectCall, isTeacher } = useCallNotifications(formation.id);

  // Timer pour le chat (indépendant de la vidéo)
  const chatTimer = useChatTimer({
    formationId: formation.id,
    lessonId: lesson.id.toString(),
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

  const handleSendMessage = (content: string, messageType = 'text', file?: File) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    sendMessageMutation.mutate({
      content,
      messageType,
      file,
      isExerciseSubmission: messageType === 'file' || messageType === 'image'
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
        toast.info(`Appel ${type === 'video' ? 'vidéo' : 'audio'} envoyé aux professeurs`);
      }
    } else {
      toast.info('Fonctionnalité d\'appel disponible pour les élèves');
    }
  };

  const handleValidateExercise = (messageId: string, isValid: boolean) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    console.log('Validate exercise:', messageId, isValid);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#e5ddd5] flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">Chargement...</div>
          <p className="text-gray-600">Récupération des messages</p>
        </div>
      </div>
    );
  }

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return '🟢';
      case 'connecting':
        return '🟡';
      case 'error':
        return '🔴';
      default:
        return '⚪';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Temps réel actif';
      case 'connecting':
        return 'Connexion...';
      case 'error':
        return `Erreur (${reconnectAttempts}/${maxReconnectAttempts})`;
      default:
        return 'Déconnecté';
    }
  };

  return (
    <div className="min-h-screen bg-[#e5ddd5] flex flex-col">
      {/* Notifications d'appels entrants pour les professeurs */}
      {isTeacher && incomingCalls.map(call => (
        <div key={call.id} className="fixed top-20 right-4 bg-white border rounded-lg shadow-lg p-4 z-50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Appel entrant</h3>
            <span className="text-sm text-gray-500">
              {call.call_type === 'video' ? '📹' : '📞'}
            </span>
          </div>
          <p className="text-sm mb-3">
            {call.caller_name} vous appelle
          </p>
          <div className="flex space-x-2">
            <Button 
              size="sm" 
              onClick={() => acceptCall(call.id)}
              className="bg-green-500 hover:bg-green-600"
            >
              Accepter
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => rejectCall(call.id)}
            >
              Rejeter
            </Button>
          </div>
        </div>
      ))}

      {/* Header responsive avec boutons d'appel intégrés */}
      <div className="bg-[#25d366] text-white p-3 sm:p-4 sticky top-0 md:top-16 z-40">
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
                Formation: {formation.title}
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs text-white/60">
                <span className="flex items-center gap-1">
                  {getConnectionStatusIcon()} {getConnectionStatusText()}
                </span>
                <span className="flex items-center gap-1">
                  ⏱ Session: {chatTimer.sessionTime}
                </span>
                {typingUsers.length > 0 && (
                  <span>• {typingUsers.length} en train d'écrire</span>
                )}
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
        <div className="bg-black">
          <LessonVideoPlayerWithTimer
            src={lesson.video_url}
            formationId={formation.id}
            timeRemainingToday={chatTimer.timeRemainingToday}
            dailyTimeLimit={chatTimer.dailyTimeLimit}
            isLimitReached={chatTimer.isLimitReached}
            canPlay={chatTimer.canContinue}
            sessionTime={chatTimer.sessionTime}
            onUpgrade={() => navigate(`/formation/${formation.id}/pricing`)}
            onPlayStateChange={setIsVideoPlaying}
            className="w-full"
          />
        </div>
      )}

      {/* Messages - responsive */}
      <div className="flex-1 flex flex-col min-h-0">
        <MessageList
          messages={messages}
          exercises={exercises}
          lesson={lesson}
          formationId={formation.id.toString()}
          isTeacherView={false}
          isTeacher={userRole?.role === 'teacher'}
          onValidateExercise={() => {}}
        />
      </div>

      {/* Chat Input - responsive - jamais désactivé */}
      <div className="bg-background border-t p-2 sm:p-4">
        <ChatInputBar
          onSendMessage={handleSendMessage}
          disabled={sendMessageMutation.isPending}
          lessonId={lesson.id.toString()}
          formationId={formation.id}
        />
      </div>
    </div>
  );
};

export default ChatInterface;
