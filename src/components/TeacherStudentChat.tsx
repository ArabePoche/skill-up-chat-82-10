import React, { useRef, useEffect, useState } from 'react';
import MessageItem from './chat/MessageItem';
import TypingIndicator from './chat/TypingIndicator';
import TeacherChatHeader from './teacher/TeacherChatHeader';
import ChatInputBar from './chat/ChatInputBar';
import InterviewToggleButton from './teacher/InterviewToggleButton';
import LessonVideoPlayer from './LessonVideoPlayer';
import TeachingStudio from './live-classroom/TeachingStudio';
import DateSeparator from './chat/DateSeparator';
import SendExerciseModal from './teacher/SendExerciseModal';
import { Button } from './ui/button';
import { BookOpen } from 'lucide-react';
import { groupMessagesByDate } from '@/utils/dateUtils';
import { useTeacherStudentMessages } from '@/hooks/useTeacherStudentMessages';
import { useSendTeacherStudentMessage } from '@/hooks/useSendTeacherStudentMessage';
import { useValidateExercise } from '@/hooks/useValidateExercise';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { useTypingListener } from '@/hooks/useTypingListener';
import { useMarkMessagesAsRead } from '@/hooks/useMarkMessagesAsRead';
import { useAuth } from '@/hooks/useAuth';
import { useDirectCallModal } from '@/hooks/useDirectCallModal';
import TeacherCallModal from './live-classroom/TeacherCallModal';

interface Student {
  id: string;
  user_id: string;
  profiles: {
    id: string;
    first_name?: string;
    last_name?: string;
    username?: string;
    avatar_url?: string;
  } | null;
}

interface TeacherStudentChatProps {
  formation: {
    id: string;
    title: string;
  };
  student: Student;
  lesson: {
    id: string;
    title: string;
    video_url: string
  };
  onBack: () => void;
}

const TeacherStudentChat: React.FC<TeacherStudentChatProps> = ({ 
  formation, 
  student, 
  lesson,
  onBack 
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const [showStudio, setShowStudio] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    content: string;
    sender_name: string;
  } | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  
  // Hooks pour la gestion des messages
  const { data: messages = [], isLoading } = useTeacherStudentMessages(
    formation.id, 
    student.user_id,
    lesson.id
  );
  
  const { isSubscribed } = useRealtimeMessages(lesson.id, formation.id);
  const typingUsers = useTypingListener(lesson.id, formation.id);
  
  const sendMessageMutation = useSendTeacherStudentMessage();
  const validateExerciseMutation = useValidateExercise();
  const markAsReadMutation = useMarkMessagesAsRead();
  
  // Hook pour les appels directs (quand on est en chat avec l'étudiant)
  const { directCall, acceptDirectCall, rejectDirectCall } = useDirectCallModal(
    student.user_id,
    lesson.id
  );

  // Auto-scroll et marquage des messages comme lus
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    
    // Marquer les messages comme lus quand on est dans le chat
    if (messages.length > 0) {
      markAsReadMutation.mutate({
        formationId: formation.id,
        lessonId: lesson.id,
        studentId: student.user_id
      });
    }
  }, [messages, formation.id, lesson.id, student.user_id]);

  

  const handleSendMessage = (content: string, messageType = 'text', fileData?: any, repliedToMessageId?: string) => {
    if (student.user_id && lesson.id) {
      sendMessageMutation.mutate({
        formationId: formation.id,
        studentId: student.user_id,
        lessonId: lesson.id,
        content,
        messageType,
        fileUrl: fileData?.uploadUrl || fileData?.fileUrl,
        fileType: fileData?.type || fileData?.fileType,
        fileName: fileData?.name || fileData?.fileName,
        repliedToMessageId
      });
    }
  };

  const handleReplyToMessage = (message: any) => {
    const senderName = message.profiles?.first_name || message.profiles?.username || 'Utilisateur';
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

  const handleValidateExercise = async (messageId: string, isValid: boolean, rejectReason?: string) => {
    try {
      await validateExerciseMutation.mutateAsync({
        messageId,
        userId: student.user_id,
        lessonId: lesson.id,
        formationId: formation.id,
        isValid,
        rejectReason
      });
    } catch (error) {
      console.error('Error validating exercise:', error);
    }
  };

  

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

  if (showStudio) {
    return (
      <TeachingStudio
        formationId={formation.id}
        lessonId={lesson.id}
        lesson={lesson}
        onClose={() => setShowStudio(false)}
      />
    );
  }

  return (
    // Conteneur principal : flex-col pour empiler les sections, padding adapté selon le mode
    <div className="min-h-screen bg-[#e5ddd5] flex flex-col relative">
      <TeacherChatHeader
        formation={formation}
        student={student}
        lesson={lesson}
        isSubscribed={isSubscribed}
        typingUsersCount={typingUsers.length}
        onBack={onBack}
        onOpenStudio={() => setShowStudio(true)}
      />

      {/* Section Vidéo - avec marge pour éviter le header fixe */}
      <div ref={videoRef} className="bg-black pt-16">
        <LessonVideoPlayer
          url={lesson.video_url || `https://example.com/lesson-${lesson.id}.mp4`}
          className="w-full aspect-video"
        />
      </div>

      

      {/* Zone messages + input séparées pour meilleure responsivité */}
      <div className="flex-1 flex flex-col md:pb-4 md:pt-16 pb-24">
        {/* Messages */}
        <div ref={messagesRef} className="flex-1 p-4 space-y-4 custom-scrollbar overflow-y-auto">
          {/* Message système de bienvenue */}
          <div className="text-center">
            <span className="bg-[#dcf8c6] text-gray-700 px-3 py-2 rounded-lg text-sm shadow-sm">
              Discussion avec {student.profiles?.first_name || 'Étudiant'} - {lesson.title}
            </span>
          </div>

          {/* Messages */}
          {messages && messages.length > 0 ? (
            Object.entries(groupMessagesByDate(messages)).map(([date, dateMessages]) => (
              <div key={date}>
                <DateSeparator date={date} />
                {dateMessages.map((msg) => (
                  <div key={msg.id} className="message-appear">
                    <MessageItem
                      message={msg}
                      isTeacher={true}
                      onValidateExercise={(messageId, isValid) => handleValidateExercise(messageId, isValid)}
                      onReply={handleReplyToMessage}
                      onScrollToMessage={handleScrollToMessage}
                      highlightedMessageId={highlightedMessageId}
                    />
                  </div>
                ))}
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-8">
              <p>Aucun message pour le moment</p>
            </div>
          )}

        {/* Indicateurs de frappe */}
          {typingUsers.map(user => (
            <TypingIndicator
              key={user.user_id}
              userName={user.user_name}
              isTeacher={user.is_teacher}
            />
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Bouton d'envoi d'exercice */}
        <div className="px-4 py-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExerciseModal(true)}
            className="w-full border-primary/30 text-primary hover:bg-primary/10"
          >
            <BookOpen size={16} className="mr-2" />
            Envoyer un exercice
          </Button>
        </div>

        {/* Bouton toggle entretien */}
        <InterviewToggleButton
          lessonId={lesson.id}
          formationId={formation.id}
          studentId={student.user_id}
          studentName={student.profiles?.first_name || student.profiles?.username || 'Étudiant'}
        />

        {/* Barre d'entrée de message : sticky en bas sur mobile, relative sur desktop */}
        <div className="sticky bottom-5 md:relative md:bottom-14 bg-[#e5ddd5] z-30 pt-8">
          <ChatInputBar
            onSendMessage={handleSendMessage}
            disabled={sendMessageMutation.isPending}
            lessonId={lesson.id}
            formationId={formation.id}
            replyingTo={replyingTo}
            onCancelReply={handleCancelReply}
            onScrollToMessage={handleScrollToMessage}
          />
        </div>
      </div>

      {/* Modal d'envoi d'exercice */}
      <SendExerciseModal
        isOpen={showExerciseModal}
        onClose={() => setShowExerciseModal(false)}
        formationId={formation.id}
        lessonId={lesson.id}
        studentId={student.user_id}
        studentName={student.profiles?.first_name || student.profiles?.username || 'Étudiant'}
      />

      {/* Modal d'appel direct (quand en chat avec l'étudiant) */}
      {directCall && (
        <TeacherCallModal
          isOpen={true}
          onAccept={async () => {
            const success = await acceptDirectCall();
            if (success) {
              
              // TODO: Rediriger vers l'interface d'appel
            }
          }}
          onReject={async () => {
            await rejectDirectCall();
          }}
          studentName={directCall.caller_name}
          studentAvatar={directCall.caller_avatar}
          callType={directCall.call_type}
          formationTitle={formation.title}
          lessonTitle={lesson.title}
        />
      )}
    </div>
  );
};

export default TeacherStudentChat;
