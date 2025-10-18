
import React from 'react';
import MessageBubble from './MessageBubble';

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
  is_read?: boolean;
  profiles?: {
    id: string;
    first_name?: string;
    last_name?: string;
    username?: string;
    avatar_url?: string;
    is_teacher?: boolean;
  };
  validated_by_teacher_id?: string;
}

interface MessageItemProps {
  message: Message;
  isTeacher: boolean;
  onValidateExercise?: (messageId: string, isValid: boolean) => void;
  onReply?: (message: Message) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, isTeacher, onReply }) => {
  if (message.message_type === 'system') {
    return (
      <div className="text-center">
        <span className="bg-[#dcf8c6] text-gray-700 px-3 py-2 rounded-lg text-sm shadow-sm">
          {message.content}
        </span>
      </div>
    );
  }

  return <MessageBubble message={message} isTeacher={isTeacher} onReply={onReply} />;
};

export default MessageItem;
