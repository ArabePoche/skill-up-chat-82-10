
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import MediaPreview from './MediaPreview';
import MessageSender from './MessageSender';
import ExerciseValidation from './ExerciseValidation';
import ExerciseStatus from './ExerciseStatus';
import FilePreviewBadge from './FilePreviewBadge';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  message_type: string;
  file_url?: string;
  file_type?: string;
  file_name?: string;
  is_exercise_submission?: boolean;
  exercise_status?: string;
  created_at: string;
  lesson_id?: string;
  formation_id?: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
    username?: string;
    is_teacher?: boolean;
  };
}

interface MessageBubbleProps {
  message: Message;
  isTeacher: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isTeacher }) => {
  const { user } = useAuth();

  const formatTime = (date: string | Date) => {
    return new Date(date).toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const isOwnMessage = message.sender_id === user?.id;
  const isRealExerciseSubmission = message.is_exercise_submission === true;
  
  // Determine if this is a recent message (less than 5 minutes old)
  const isNewMessage = new Date().getTime() - new Date(message.created_at).getTime() < 5 * 60 * 1000;

  // Determine the context for the file badge
  const getFileContext = () => {
    if (isRealExerciseSubmission) return 'submitted';
    if (message.content.includes('annotée')) return 'annotated';
    return 'shared';
  };

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div className={`rounded-lg shadow-sm max-w-xs p-3 relative ${
        isOwnMessage ? 'bg-[#dcf8c6]' : 'bg-white'
      }`}>
        {!isOwnMessage && (
          <MessageSender profile={message.profiles} />
        )}
        
        {/* File badge for files */}
        {message.file_url && message.file_name && (
          <div className="mb-2">
            <FilePreviewBadge
              fileName={message.file_name}
              fileType={message.file_type}
              isNew={isNewMessage}
              context={getFileContext()}
            />
          </div>
        )}
        
        <p className="text-sm text-gray-800 mb-2">{message.content}</p>
        
        {message.file_url && message.file_name && (
          <div className="mt-2">
            <MediaPreview
              fileUrl={message.file_url}
              fileName={message.file_name}
              fileType={message.file_type}
              messageId={message.id}
              isTeacher={isTeacher}
              lessonId={message.lesson_id}
              formationId={message.formation_id}
            />
          </div>
        )}
        
        {isTeacher && isRealExerciseSubmission && !message.exercise_status && (
          <ExerciseValidation message={message} />
        )}
        
        {isRealExerciseSubmission && message.exercise_status && (
          <ExerciseStatus status={message.exercise_status} />
        )}
        
        <div className="text-xs text-gray-500 mt-1 text-right">
          {formatTime(message.created_at)}
        </div>
        
        <div className={`absolute ${isOwnMessage ? 'right-0' : 'left-0'} top-0 w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px] border-b-transparent transform ${
          isOwnMessage 
            ? 'border-l-[#dcf8c6] border-r-transparent translate-x-2' 
            : 'border-l-transparent border-r-white -translate-x-2'
        }`}></div>
      </div>
    </div>
  );
};

export default MessageBubble;
