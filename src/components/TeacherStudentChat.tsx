
import React, { useRef, useEffect } from 'react';
import MessageItem from './chat/MessageItem';
import TypingIndicator from './chat/TypingIndicator';
import TeacherChatHeader from './teacher/TeacherChatHeader';
import ChatInputBar from './chat/ChatInputBar';
import InterviewToggleButton from './teacher/InterviewToggleButton';
import { useTeacherStudentMessages } from '@/hooks/useTeacherStudentMessages';
import { useSendTeacherStudentMessage } from '@/hooks/useSendTeacherStudentMessage';
import { useValidateExercise } from '@/hooks/useValidateExercise';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { useTypingListener } from '@/hooks/useTypingListener';
import { useMarkMessagesAsRead } from '@/hooks/useMarkMessagesAsRead';
import { useAuth } from '@/hooks/useAuth';

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
  const { user } = useAuth();
  
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

  // Debug logs
  useEffect(() => {
    console.log('TeacherStudentChat Debug:', {
      lessonId: lesson.id,
      formationId: formation.id,
      studentId: student.user_id,
      messagesCount: messages.length,
      isRealtimeSubscribed: isSubscribed,
      typingUsersCount: typingUsers.length
    });
  }, [lesson.id, formation.id, student.user_id, messages.length, isSubscribed, typingUsers.length]);

  const handleSendMessage = (content: string, messageType = 'text', fileData?: any) => {
    if (student.user_id && lesson.id) {
      sendMessageMutation.mutate({
        formationId: formation.id,
        studentId: student.user_id,
        lessonId: lesson.id,
        content,
        messageType,
        fileUrl: fileData?.fileUrl,
        fileType: fileData?.fileType,
        fileName: fileData?.fileName
      });
    }
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

  return (
    <div className="min-h-screen bg-[#e5ddd5] flex flex-col pb-24 md:pb-4 md:pt-16 relative">
      <TeacherChatHeader
        formation={formation}
        student={student}
        lesson={lesson}
        isSubscribed={isSubscribed}
        typingUsersCount={typingUsers.length}
        onBack={onBack}
      />

      {/* Messages */}
      <div className="flex-1 p-4 space-y-4 custom-scrollbar overflow-y-auto">
        {/* Message système de bienvenue */}
        <div className="text-center">
          <span className="bg-[#dcf8c6] text-gray-700 px-3 py-2 rounded-lg text-sm shadow-sm">
            Discussion avec {student.profiles?.first_name || 'Étudiant'} - {lesson.title}
          </span>
        </div>

        {/* Messages */}
        {messages && messages.length > 0 ? (
          messages.map((msg) => (
            <div key={msg.id} className="message-appear">
              <MessageItem
                message={msg}
                isTeacher={true}
                onValidateExercise={(messageId, isValid) => handleValidateExercise(messageId, isValid)}
              />
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

      {/* Bouton toggle entretien */}
      <InterviewToggleButton
        lessonId={lesson.id}
        formationId={formation.id}
        studentId={student.user_id}
        studentName={student.profiles?.first_name || student.profiles?.username || 'Étudiant'}
      />

      <ChatInputBar
        onSendMessage={handleSendMessage}
        disabled={sendMessageMutation.isPending}
        lessonId={lesson.id}
        formationId={formation.id}
      />
    </div>
  );
};

export default TeacherStudentChat;
