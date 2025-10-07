import React, { useRef, useEffect, useState } from 'react';
import MessageBubble from './MessageBubble';
import SystemMessage from './SystemMessage';
import TypingIndicator from './TypingIndicator';
import DateSeparator from './DateSeparator';
import { useIsTeacherInFormation } from '@/hooks/useIsTeacherInFormation';
import MessageItem from './MessageItem';
import InterviewEvaluationCard from './InterviewEvaluationCard';
import { useAuth } from '@/hooks/useAuth';
import ExerciseDisplay from './ExerciseDisplay';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { useTypingListener } from '@/hooks/useTypingListener';
import { useStudentEvaluations } from '@/hooks/useStudentEvaluations';
import LessonVideoPlayer from '../LessonVideoPlayer';
import { groupMessagesByDate } from '@/utils/dateUtils';

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
  level_id?: string; // Pour identifier les messages du chat de groupe
  replied_to_message_id?: string;
  replied_to_message?: {
    id: string;
    content: string;
    sender_id: string;
    profiles?: {
      first_name?: string;
      last_name?: string;
      username?: string;
    };
  };
  profiles?: {
    first_name?: string;
    last_name?: string;
    username?: string;
    avatar_url?: string;
  };
  // Propriétés pour les vidéos leçons
  video_url?: string;
  lesson_title?: string;
  lesson_status?: string;
  // Type d'élément dans le flux
  item_type?: 'message' | 'lesson_video' | 'exercise';
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
  onValidateExercise: (messageId: string, isValid: boolean, rejectReason?: string, exerciseId?: string, lessonId?: string) => void;
  evaluations?: any[];
  typingUsers?: any[];
  onReply?: (message: Message) => void;
  highlightedMessageId?: string | null;
  onScrollToMessage?: (messageId: string) => void;
  onOpenVideo?: (lesson: any) => void;
  isGroupChat?: boolean; // Ajout: contexte explicite de chat de groupe
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
  onReply,
  highlightedMessageId,
  onScrollToMessage,
  onOpenVideo,
  isGroupChat = false,
  
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

  // Exposer scrollToBottom pour l'utiliser depuis l'extérieur
  useEffect(() => {
    if (window) {
      (window as any).__scrollToBottom = scrollToBottom;
    }
  }, []);

  if (!messages) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Chargement des messages...</div>
      </div>
    );
  }

  // Grouper les messages par date
  const groupedMessages = groupMessagesByDate(messages);

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

      {/* Messages groupés par date */}
      {Object.entries(groupedMessages).map(([dateLabel, messagesInGroup]) => (
        <React.Fragment key={dateLabel}>
          <DateSeparator date={dateLabel} />
          
          {messagesInGroup.map((message) => {
        // Vidéos de leçons (priorité sur les messages système)
        if (message.item_type === 'lesson_video') {
          console.log('🎥 Rendering lesson video:', message);
          return (
            <div
              key={message.id}
              data-message-id={message.id}
              className={`mb-4 transition-all duration-500 ${
                highlightedMessageId === message.id ? 'bg-yellow-200 border-2 border-yellow-400 rounded-lg p-2 -m-2 shadow-lg' : ''
              }`}
            >
              <LessonVideoPlayer 
                url={message.video_url || ''}
                title={message.lesson_title || 'Vidéo de la leçon'}
                views="Formation"
                channelName="Académie"
                className="w-full rounded-lg overflow-hidden shadow-md"
              />
            </div>
          );
        }

        // Messages système (exercices envoyés par le système aux élèves)
        if (message.is_system_message && message.exercise_id) {
          const exercise = exercises.find(ex => ex.id === message.exercise_id);
          // Détecter le contexte groupe à partir de la prop globale OU du message
          const isGroupChatContext = isGroupChat || !!message.level_id;
          // Dans le groupe, lessonId transporté par le parent est un levelId
          const effectiveLevelId = isGroupChatContext ? lessonId : (message.level_id || lessonId);
          
          console.log('🎯 SystemMessage exercise detected:', {
            exerciseId: message.exercise_id,
            exerciseTitle: exercise?.title,
            messageLevelId: message.level_id,
            lessonId,
            effectiveLevelId,
            isGroupChatContext
          });
          
          return (
            <SystemMessage
              key={message.id}
              content={message.content}
              exercise={exercise}
              lessonId={lessonId}
              formationId={formationId}
              isTeacherView={isTeacherView}
              isGroupChat={isGroupChatContext}
              levelId={effectiveLevelId}
            />
          );
        }


        // Exercices autonomes (pour le groupe chat) - seulement les exercices système
        if (message.item_type === 'exercise' && message.exercise_id && message.is_system_message) {
          // Dans le groupe chat, l'exercice est dans message.exercises
          const exercise = (message as any).exercises || exercises.find(ex => ex.id === message.exercise_id);
          if (exercise) {
            return (
              <div
                key={message.id}
                data-message-id={message.id}
                className={`transition-all duration-500 ${
                  highlightedMessageId === message.id ? 'bg-yellow-200 border-2 border-yellow-400 rounded-lg p-2 -m-2 shadow-lg' : ''
                }`}
              >
                <ExerciseDisplay
                  exercise={exercise}
                  lessonId={lessonId}
                  formationId={formationId}
                  isTeacherView={isTeacherView}
                  showSubmissionOptions={!isTeacherView}
                  isGroupChat={true}
                  levelId={lessonId} // Dans le contexte groupe, lessonId correspond au levelId
                />
              </div>
            );
          }
        }

        // Messages normaux
        return (
          <div
            key={message.id}
            data-message-id={message.id}
            className={`transition-all duration-500 ${
              highlightedMessageId === message.id ? 'bg-yellow-200 border-2 border-yellow-400 rounded-lg p-2 -m-2 shadow-lg' : ''
            }`}
          >
            <MessageBubble
              message={message}
              isTeacher={isTeacher}
              onReply={onReply}
              onScrollToMessage={onScrollToMessage}
            />
          </div>
        );
          })}
        </React.Fragment>
      ))}

      {/* Affichage des évaluations en attente pour les étudiants - APRÈS les messages */}
      {!isTeacherView && pendingEvaluations.map((evaluation) => (
        <InterviewEvaluationCard
          key={evaluation.id}
          evaluationId={evaluation.id}
          teacherName="Professeur"
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