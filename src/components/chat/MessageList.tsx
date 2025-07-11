
import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import SystemMessage from './SystemMessage';
import TypingIndicator from './TypingIndicator';
import InterviewEvaluationCard from './InterviewEvaluationCard';
import { useAuth } from '@/hooks/useAuth';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  message_type: string;
  file_url?: string;
  file_type?: string;
  file_name?: string;
  is_system_message?: boolean;
  exercise_id?: string;
  exercise_status?: string;
  is_exercise_submission?: boolean;
  profiles?: {
    first_name?: string;
    last_name?: string;
    username?: string;
    avatar_url?: string;
  };
}

interface Exercise {
  id: string;
  title: string;
  description?: string;
  content?: string;
  type?: string;
}

interface MessageListProps {
  messages: Message[];
  exercises: Exercise[];
  onValidateExercise: (messageId: string, isValid: boolean, rejectReason?: string) => void;
  isTeacher?: boolean;
  evaluations?: any[];
  typingUsers?: any[];
}

const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  exercises,
  onValidateExercise, 
  isTeacher = false,
  evaluations = [],
  typingUsers = []
}) => {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers]);

  if (!messages) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Chargement des messages...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 space-y-4 overflow-y-auto">
      {/* Évaluations d'entretien */}
      {evaluations && evaluations.length > 0 && evaluations.map((evaluation) => (
        <InterviewEvaluationCard
          key={evaluation.id}
          evaluationId={evaluation.id}
          studentId={evaluation.student_id}
          teacherId={evaluation.teacher_id}
          formationId={evaluation.formation_id}
          lessonId={evaluation.lesson_id}
          expiresAt={evaluation.expires_at}
          respondedAt={evaluation.responded_at}
          isSatisfied={evaluation.is_satisfied}
          feedbackText={evaluation.feedback_text}
          teacherName={evaluation.teacher?.first_name || evaluation.teacher?.username || 'Professeur'}
        />
      ))}

      {/* Messages */}
      {messages.map((message) => {
        if (message.is_system_message) {
          return (
            <SystemMessage
              key={message.id}
              content={message.content}
              exerciseId={message.exercise_id}
              exercises={exercises}
            />
          );
        }

        return (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={message.sender_id === user?.id}
            exercises={exercises}
            onValidateExercise={onValidateExercise}
            isTeacher={isTeacher}
          />
        );
      })}

      {/* Indicateur de frappe */}
      {typingUsers && typingUsers.length > 0 && (
        <TypingIndicator typingUsers={typingUsers} />
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
