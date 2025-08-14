/**
 * Composant pour afficher la référence à un message répondu de façon persistante
 */
import React from 'react';
import { Reply } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
    username?: string;
  };
}

interface ReplyReferenceProps {
  repliedToMessage: Message;
  onScrollToMessage: (messageId: string) => void;
}

const ReplyReference: React.FC<ReplyReferenceProps> = ({
  repliedToMessage,
  onScrollToMessage
}) => {
  const { user } = useAuth();
  
  const isOwnMessage = repliedToMessage.sender_id === user?.id;
  const senderName = isOwnMessage 
    ? 'Vous'
    : repliedToMessage.profiles?.username || 
      `${repliedToMessage.profiles?.first_name || ''} ${repliedToMessage.profiles?.last_name || ''}`.trim() ||
      'Utilisateur';

  const handleClick = () => {
    onScrollToMessage(repliedToMessage.id);
  };

  return (
    <div 
      className="bg-gray-50 border-l-4 border-[#25d366] p-2 mb-2 rounded-r cursor-pointer hover:bg-gray-100 transition-colors"
      onClick={handleClick}
    >
      <div className="flex items-start space-x-2">
        <Reply size={14} className="text-[#25d366] mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-[#25d366] mb-1">
            Réponse à {senderName}
          </div>
          <div className="text-sm text-gray-600 line-clamp-2">
            {repliedToMessage.content.length > 100 
              ? `${repliedToMessage.content.substring(0, 100)}...` 
              : repliedToMessage.content
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReplyReference;