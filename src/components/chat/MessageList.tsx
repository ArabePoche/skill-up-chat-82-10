
import React, { useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import MessageItem from './MessageItem';
import TypingIndicator from './TypingIndicator';
import SystemMessage from './SystemMessage';
import { useTypingListener } from '@/hooks/useTypingListener';
import InterviewEvaluationCard from './InterviewEvaluationCard';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
  is_system_message?: boolean;
  message_type?: string;
  exercise_id?: string;
  exercise_status?: string;
  is_exercise_submission?: boolean;
  profiles?: {
    first_name?: string;
    last_name?: string;
    username?: string;
    avatar_url?: string;
    is_teacher?: boolean;
  };
}

interface InterviewEvaluation {
  id: string;
  student_id: string;
  teacher_id: string;
  formation_id: string;
  lesson_id: string;
  expires_at: string;
  responded_at?: string;
  is_satisfied?: boolean;
  feedback_text?: string;
  created_at: string;
  teachers?: {
    first_name?: string;
    last_name?: string;
    username?: string;
    avatar_url?: string;
  } | null;
}

interface MessageListProps {
  messages: Message[];
  formationId: string;
  lessonId: string;
  isTeacher?: boolean;
  onUpdateMessage?: (messageId: string, newFileUrl: string) => void;
  pendingEvaluations?: InterviewEvaluation[];
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  formationId,
  lessonId,
  isTeacher = false,
  onUpdateMessage,
  pendingEvaluations = []
}) => {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { typingUsers } = useTypingListener(formationId, lessonId);

  // Scroll vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Filtrer les évaluations non expirées et non répondues pour les étudiants
  const validEvaluations = useMemo(() => {
    if (isTeacher || !user) return [];
    
    return pendingEvaluations.filter(evaluation => {
      const isExpired = new Date(evaluation.expires_at) < new Date();
      const isAlreadyResponded = evaluation.responded_at;
      const isForCurrentUser = evaluation.student_id === user.id;
      
      return !isExpired && !isAlreadyResponded && isForCurrentUser;
    });
  }, [pendingEvaluations, isTeacher, user]);

  const currentUsersTyping = typingUsers.filter(typingUser => typingUser.user_id !== user?.id);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Affichage des évaluations d'entretien en attente */}
      {validEvaluations.map((evaluation) => (
        <div key={evaluation.id} className="mb-4">
          <InterviewEvaluationCard
            evaluation={{
              id: evaluation.id,
              student_id: evaluation.student_id,
              teacher_id: evaluation.teacher_id,
              formation_id: evaluation.formation_id,
              lesson_id: evaluation.lesson_id,
              expires_at: evaluation.expires_at,
              responded_at: evaluation.responded_at,
              is_satisfied: evaluation.is_satisfied,
              feedback_text: evaluation.feedback_text,
              created_at: evaluation.created_at,
              teacher: {
                first_name: evaluation.teachers?.first_name || '',
                last_name: evaluation.teachers?.last_name || '',
                username: evaluation.teachers?.username || '',
                avatar_url: evaluation.teachers?.avatar_url || ''
              }
            }}
          />
        </div>
      ))}

      {/* Messages */}
      {messages.map((message) => (
        <div key={message.id}>
          {message.is_system_message ? (
            <SystemMessage message={message} />
          ) : (
            <MessageItem
              message={message}
              isOwn={message.sender_id === user?.id}
              isTeacher={isTeacher}
              formationId={formationId}
              lessonId={lessonId}
              onUpdate={onUpdateMessage}
            />
          )}
        </div>
      ))}

      {/* Indicateur de frappe */}
      {currentUsersTyping.length > 0 && (
        <TypingIndicator users={currentUsersTyping} />
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
