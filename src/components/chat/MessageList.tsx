import React, { useRef, useEffect, useState } from 'react';
import MessageBubble from './MessageBubble';
import SystemMessage from './SystemMessage';
import TypingIndicator from './TypingIndicator';
import { useIsTeacherInFormation } from '@/hooks/useIsTeacherInFormation';
import MessageItem from './MessageItem';
import InterviewEvaluationCard from './InterviewEvaluationCard';
import { useAuth } from '@/hooks/useAuth';
import ExerciseDisplay from './ExerciseDisplay';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { useTypingListener } from '@/hooks/useTypingListener';
import { useStudentEvaluations } from '@/hooks/useStudentEvaluations';

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
  formationId: string;
  
  isTeacherView: boolean;
  lessonId: string;
  isTeacher: boolean;
  onValidateExercise: (messageId: string, isValid: boolean, rejectReason?: string) => void;
  evaluations?: any[];
  typingUsers?: any[];
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  exercises,
  lessonId,
  formationId,
  
  isTeacherView,
  isTeacher,
  onValidateExercise,
  evaluations = [],
  
}) => {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Écouter les indicateurs de frappe
  const typingUsers = useTypingListener(lessonId.toString(), formationId);

  // Activer les mises à jour temps réel
  useRealtimeMessages(lessonId.toString(), formationId);

   // Récupérer les évaluations en attente pour les étudiants
  const { data: pendingEvaluations = [] } = useStudentEvaluations();
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
          teacherName={evaluation.teacher?.first_name || evaluation.teacher?.username || 'Professeur'}
          expiresAt={evaluation.expires_at}
        />
      ))}

      {/* Messages */}
      {messages.map((message) => {
        if (message.is_system_message) {
          return (
            <SystemMessage
              key={message.id}
              content={message.content}
              exercise={message.exercise_id ? exercises.find(ex => ex.id === message.exercise_id) : undefined}
              lessonId={lessonId}
              formationId={formationId}
              isTeacherView={isTeacherView}
            />
          );
        }

        return (
          <MessageBubble
            key={message.id}
            message={message}
            isTeacher={isTeacher}
          />
        );
      })}

      {/* Affichage des évaluations en attente pour les étudiants - APRÈS les messages */}
      {!isTeacherView && pendingEvaluations.map((evaluation) => (
        <InterviewEvaluationCard
          key={evaluation.id}
          evaluationId={evaluation.id}
          teacherName={
            evaluation.teachers?.profiles
              ? `${evaluation.teachers.profiles.first_name || ''} ${evaluation.teachers.profiles.last_name || ''}`.trim()
                || evaluation.teachers.profiles.username
                || 'Professeur'
              : 'Professeur'
          }
          expiresAt={evaluation.expires_at}
        />
      ))}
      {/* Indicateur de frappe */}
      {typingUsers && typingUsers.length > 0 && 
        typingUsers.map((user: any, index: number) => (
          <TypingIndicator 
            key={index}
            userName={user.name || 'Utilisateur'}
            isTeacher={user.isTeacher || false}
          />
        ))
      }

      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;