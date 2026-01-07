import React, { useRef, useEffect, useState, useMemo } from 'react';
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
import { useCachePreloader } from '@/file-manager/hooks/useCachePreloader';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id?: string;
  created_at: string;
  updated_at?: string;
  message_type?: string;
  file_url?: string;
  file_type?: string;
  file_name?: string;
  is_exercise_submission?: boolean;
  exercise_status?: string;
  exercise_id?: string;
  lesson_id?: string;
  formation_id?: string;
  level_id?: string;
  promotion_id?: string;
  is_read?: boolean;
  profiles?: {
    id: string;
    first_name?: string;
    last_name?: string;
    username?: string;
    avatar_url?: string;
    is_teacher?: boolean;
  };
  replied_to_message_id?: string;
  replied_to_message?: {
    id: string;
    content: string;
    sender_id: string;
    profiles?: {
      id: string;
      first_name?: string;
      last_name?: string;
      username?: string;
    };
  };
  is_system_message?: boolean;
  validated_by_teacher_id?: string;
  type?: string;
}

interface Exercise {
  id: string;
  title: string;
  description?: string;
  type?: string;
  content?: string;
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
  const hasInitialScrolled = useRef(false);

  // ⚡ OPTIMISATION: Extraire toutes les URLs de médias et précharger le cache
  const mediaUrls = useMemo(() => {
    return messages
      .filter(msg => msg.file_url)
      .map(msg => msg.file_url as string);
  }, [messages]);

  // Précharger le cache mémoire pour un affichage instantané des médias
  useCachePreloader({ urls: mediaUrls, enabled: mediaUrls.length > 0 });

  // Fonction utilitaire pour obtenir le statut d'un exercice pour l'utilisateur actuel
  const getExerciseStatus = (exerciseId: string): string | undefined => {
    if (!user?.id) return undefined;
    
    // Trouver toutes les soumissions de cet exercice par l'utilisateur
    const submissions = messages.filter(msg => 
      msg.exercise_id === exerciseId && 
      msg.sender_id === user.id &&
      msg.is_exercise_submission === true
    );

    if (submissions.length === 0) return undefined;

    // Un exercice est complètement approuvé uniquement si TOUTES les soumissions sont 'approved'
    const allApproved = submissions.every(sub => sub.exercise_status === 'approved');
    if (allApproved) return 'approved';

    // S'il y a au moins une soumission rejetée
    const hasRejected = submissions.some(sub => sub.exercise_status === 'rejected');
    if (hasRejected) return 'rejected';

    // Sinon, il y a des soumissions en attente
    return 'pending';
  };

  const scrollToBottom = (instant = false) => {
    messagesEndRef.current?.scrollIntoView({ behavior: instant ? "instant" : "smooth" });
  };

  // Écouter les indicateurs de frappe
  const typingUsers = useTypingListener(lessonId.toString(), formationId);

  // Activer les mises à jour temps réel
  useRealtimeMessages(lessonId.toString(), formationId);

  // Récupérer les évaluations en attente pour les étudiants
  const { data: pendingEvaluations = [] } = useStudentEvaluations();

  // Scroll initial instantané au dernier message
  useEffect(() => {
    if (messages.length > 0 && !hasInitialScrolled.current) {
      scrollToBottom(true); // Scroll instantané au premier chargement
      hasInitialScrolled.current = true;
    }
  }, [messages.length]);

  // Scroll smooth pour les nouveaux messages
  useEffect(() => {
    if (hasInitialScrolled.current) {
      scrollToBottom(false);
    }
  }, [messages, typingUsers]);

  // Exposer scrollToBottom pour l'utiliser depuis l'extérieur
  useEffect(() => {
    if (window) {
      (window as any).__scrollToBottom = () => scrollToBottom(false);
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
          
          // Obtenir le statut de l'exercice pour l'utilisateur actuel
          const exerciseStatus = message.exercise_id ? getExerciseStatus(message.exercise_id) : undefined;
          
          console.log('🎯 SystemMessage exercise detected:', {
            exerciseId: message.exercise_id,
            exerciseTitle: exercise?.title,
            exerciseStatus,
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
              exerciseStatus={exerciseStatus}
              isTeacherView={isTeacherView}
              isGroupChat={isGroupChatContext}
              levelId={effectiveLevelId}
              messages={messages}
            />
          );
        }


        // Exercices autonomes (pour le groupe chat) - seulement les exercices système
        if (message.item_type === 'exercise' && message.exercise_id && message.is_system_message) {
          // Dans le groupe chat, l'exercice est dans message.exercises
          const exercise = (message as any).exercises || exercises.find(ex => ex.id === message.exercise_id);
          if (exercise) {
            // Obtenir le statut de l'exercice pour l'utilisateur actuel
            const exerciseStatus = message.exercise_id ? getExerciseStatus(message.exercise_id) : undefined;
            
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
                  exerciseStatus={exerciseStatus}
                  isTeacherView={isTeacherView}
                  showSubmissionOptions={!isTeacherView}
                  isGroupChat={true}
                  levelId={lessonId} // Dans le contexte groupe, lessonId correspond au levelId
                  messages={messages}
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
              formationId={formationId}
              levelId={lessonId}
              isGroupChat={isGroupChat}
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