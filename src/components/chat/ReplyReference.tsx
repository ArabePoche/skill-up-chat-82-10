/**
 * Composant pour afficher la référence à un message répondu de façon persistante
 */
import React from 'react';
import { Reply, Image as ImageIcon, FileText, Video, Mic } from 'lucide-react';
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
  lesson_media?: {
    file_type?: string;
    file_name?: string;
  }[];
  conversation_media?: {
    file_type?: string;
    file_name?: string;
  }[];
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

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onScrollToMessage(repliedToMessage.id);
  };

  // Déterminer intelligemment le contenu à afficher
  let previewContent = repliedToMessage.content;
  let MediaIcon = null;

  const mediaList = repliedToMessage.conversation_media?.length 
    ? repliedToMessage.conversation_media 
    : repliedToMessage.lesson_media;

  if (mediaList && mediaList.length > 0) {
    const media = mediaList[0];
    const fileType = media.file_type || '';
    
    if (fileType.startsWith('image/')) {
      MediaIcon = ImageIcon;
      if (!previewContent) previewContent = 'Photo';
    } else if (fileType.startsWith('video/')) {
      MediaIcon = Video;
      if (!previewContent) previewContent = 'Vidéo';
    } else if (fileType.startsWith('audio/')) {
      MediaIcon = Mic;
      if (!previewContent) previewContent = 'Message vocal';
    } else {
      MediaIcon = FileText;
      if (!previewContent) previewContent = media.file_name || 'Fichier joint';
    }
  }

  // Fallback de sécurité
  if (!previewContent && !MediaIcon) {
    previewContent = 'Message';
  }

  return (
    <div 
      className="bg-white/40 border-l-4 border-violet-500 p-2 mb-2 rounded-r-xl rounded-l-[4px] cursor-pointer hover:bg-white/60 transition-colors shadow-sm ring-1 ring-black/5"
      onClick={handleClick}
    >
      <div className="flex items-start space-x-2">
        <Reply size={14} className="text-violet-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold text-violet-700 mb-0.5 tracking-tight">
            Réponse à {senderName}
          </div>
          <div className="text-[12px] text-slate-700 line-clamp-2 leading-snug flex items-center gap-1.5 font-medium">
            {MediaIcon && <MediaIcon size={14} className="text-slate-500 flex-shrink-0" />}
            <span className="truncate">
              {previewContent.length > 100 
                ? `${previewContent.substring(0, 100)}...` 
                : previewContent
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReplyReference;