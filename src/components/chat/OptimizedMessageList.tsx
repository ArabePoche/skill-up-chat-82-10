import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import MessageBubble from './MessageBubble';
import SystemMessage from './SystemMessage';
import DateSeparator from './DateSeparator';
import { useAuth } from '@/hooks/useAuth';
import LessonVideoPlayer from '../LessonVideoPlayer';
import { groupMessagesByDate } from '@/utils/dateUtils';
import { useFormationAuthor } from '@/hooks/useFormationAuthor';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { MessageListSkeleton } from './MessageSkeleton';

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
  replied_to_message?: any;
  is_system_message?: boolean;
  validated_by_teacher_id?: string;
  type?: string;
  item_type?: 'message' | 'lesson_video' | 'exercise';
  video_url?: string;
  lesson_title?: string;
  lesson_status?: string;
}

interface Exercise {
  id: string;
  title: string;
  description?: string;
  type?: string;
  content?: string;
}

interface OptimizedMessageListProps {
  messages: Message[];
  exercises: Exercise[];
  formationId: string;
  lessonId: string;
  isTeacherView: boolean;
  isTeacher: boolean;
  onValidateExercise: (messageId: string, isValid: boolean, rejectReason?: string, exerciseId?: string, lessonId?: string) => void;
  evaluations?: any[];
  onReply?: (message: Message) => void;
  onForward?: (message: Message) => void;
  highlightedMessageId?: string | null;
  onScrollToMessage?: (messageId: string) => void;
  onOpenVideo?: (lesson: any) => void;
  isGroupChat?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

const OptimizedMessageList: React.FC<OptimizedMessageListProps> = ({
  messages,
  exercises,
  formationId,
  lessonId,
  isTeacherView,
  isTeacher,
  onValidateExercise,
  evaluations = [],
  onReply,
  onForward,
  highlightedMessageId,
  onScrollToMessage,
  onOpenVideo,
  isGroupChat = false,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
}) => {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitialScrolled = useRef(false);
  const { data: formationAuthor } = useFormationAuthor(formationId);

  // Hook pour détecter quand l'utilisateur scrolle vers le haut (charger plus de messages)
  const { targetRef: loadMoreRef, isInView } = useInfiniteScroll({
    threshold: 0.1,
    rootMargin: '200px',
    enabled: hasMore && !isLoadingMore,
  });

  // Charger plus de messages quand l'utilisateur scrolle vers le haut
  useEffect(() => {
    if (isInView && hasMore && !isLoadingMore && onLoadMore) {
      onLoadMore();
    }
  }, [isInView, hasMore, isLoadingMore, onLoadMore]);

  const scrollToBottom = useCallback((instant = false) => {
    messagesEndRef.current?.scrollIntoView({ behavior: instant ? "instant" : "smooth" });
  }, []);

  // Scroll initial instantané au dernier message
  useEffect(() => {
    if (messages.length > 0 && !hasInitialScrolled.current) {
      scrollToBottom(true);
      hasInitialScrolled.current = true;
    }
  }, [messages.length, scrollToBottom]);

  // Scroll smooth pour les nouveaux messages
  const prevMessageCountRef = useRef(messages.length);
  useEffect(() => {
    if (hasInitialScrolled.current && messages.length > prevMessageCountRef.current) {
      scrollToBottom(false);
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length, scrollToBottom]);

  if (!messages || messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Aucun message pour le moment</div>
      </div>
    );
  }

  // Afficher le skeleton pendant le chargement initial si on a des messages mais qu'ils sont en train de charger
  if (isLoadingMore && messages.length === 0) {
    return <MessageListSkeleton count={5} />;
  }

  // Grouper les messages par date
  const groupedMessages = groupMessagesByDate(messages);

  // Fonction utilitaire pour obtenir le statut d'un exercice
  const getExerciseStatus = useCallback((exerciseId: string): string | undefined => {
    if (!user?.id) return undefined;
    
    const submissions = messages.filter(msg => 
      msg.exercise_id === exerciseId && 
      msg.sender_id === user.id &&
      msg.is_exercise_submission === true
    );

    if (submissions.length === 0) return undefined;

    const allApproved = submissions.every(sub => sub.exercise_status === 'approved');
    if (allApproved) return 'approved';

    const hasRejected = submissions.some(sub => sub.exercise_status === 'rejected');
    if (hasRejected) return 'rejected';

    return 'pending';
  }, [messages, user?.id]);

  // Mémoiser le rendu des messages pour éviter les re-rendus inutiles
  const renderMessage = useCallback((message: Message) => {
    // Vidéos de leçons
    if (message.item_type === 'lesson_video') {
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
            lessonId={message.lesson_id || undefined}
            title={message.lesson_title || 'Vidéo de la leçon'}
            views="Formation"
            authorName={
              message.profiles 
                ? (message.profiles.first_name || message.profiles.last_name 
                    ? `${message.profiles.first_name || ''} ${message.profiles.last_name || ''}`.trim() 
                    : message.profiles.username || 'Utilisateur')
                : (formationAuthor 
                    ? (formationAuthor.first_name || formationAuthor.last_name
                        ? `${formationAuthor.first_name || ''} ${formationAuthor.last_name || ''}`.trim()
                        : formationAuthor.username)
                    : 'Formateur')
            }
            onOpenVideo={onOpenVideo}
          />
        </div>
      );
    }

    // Cartes d'exercice
    if (message.item_type === 'exercise' && message.exercise_id) {
      const exercise = exercises.find(e => e.id === message.exercise_id);
      if (!exercise) return null;

      const status = getExerciseStatus(message.exercise_id);
      
      return (
        <SystemMessage
          key={message.id}
          message={message}
          exercise={exercise}
          exerciseStatus={status}
          isTeacher={isTeacher}
          onValidateExercise={onValidateExercise}
          formationId={formationId}
          lessonId={lessonId}
        />
      );
    }

    // Messages système
    if (message.is_system_message) {
      return (
        <SystemMessage
          key={message.id}
          message={message}
          isTeacher={isTeacher}
          onValidateExercise={onValidateExercise}
          formationId={formationId}
          lessonId={lessonId}
        />
      );
    }

    // Messages normaux
    return (
      <MessageBubble
        key={message.id}
        message={message}
        isOwnMessage={message.sender_id === user?.id}
        isTeacherView={isTeacherView}
        isTeacher={isTeacher}
        onReply={onReply}
        onForward={onForward}
        highlighted={highlightedMessageId === message.id}
        onScrollToMessage={onScrollToMessage}
      />
    );
  }, [
    user?.id,
    isTeacherView,
    isTeacher,
    highlightedMessageId,
    onReply,
    onForward,
    onScrollToMessage,
    onOpenVideo,
    onValidateExercise,
    formationId,
    lessonId,
    exercises,
    formationAuthor,
    getExerciseStatus
  ]);

  return (
    <div className="flex-1 p-4 space-y-4 overflow-y-auto">
      {/* Loader pour infinite scroll */}
      <div ref={loadMoreRef} className="flex justify-center py-2">
        {isLoadingMore && (
          <div className="text-gray-500 text-sm">Chargement des messages précédents...</div>
        )}
      </div>

      {/* Messages groupés par date */}
      {Object.entries(groupedMessages).map(([dateLabel, messagesInGroup]) => (
        <div key={dateLabel} className="space-y-4">
          <DateSeparator date={dateLabel} />
          
          {messagesInGroup.map(renderMessage)}
        </div>
      ))}

      {/* Ref pour le scroll vers le bas */}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default OptimizedMessageList;
