// Composant: Bulle de message de conversation avec réactions, réponse et suppression
// Rôle: afficher un message avec toutes ses actions possibles
import React, { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Reply, Edit2, Trash2, Smile } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import EmojiPicker from '@/components/EmojiPicker';
import ModernMediaPreview from '@/components/chat/ModernMediaPreview';
import { useConversationMessageReactions, useToggleConversationReaction } from '@/hooks/conversations/useConversationMessageReactions';
import { useDeleteConversationMessage, useEditConversationMessage } from '@/hooks/conversations/useConversationOperations';
import { LinkifiedText } from '@/utils/linkify';

interface ConversationMedia {
  id: string;
  file_url: string;
  file_type: string;
  file_name: string;
  file_size?: number;
  duration_seconds?: number;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string | null;
  created_at: string;
  is_story_reply?: boolean;
  replied_to_message_id?: string | null;
  conversation_media?: ConversationMedia[];
}

interface ConversationMessageBubbleProps {
  message: Message;
  onReply?: (message: Message) => void;
}

export const ConversationMessageBubble: React.FC<ConversationMessageBubbleProps> = ({
  message,
  onReply,
}) => {
  const { user } = useAuth();
  const isOwnMessage = message.sender_id === user?.id;
  
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const { data: reactions = {} } = useConversationMessageReactions(message.id);
  const toggleReaction = useToggleConversationReaction();
  const deleteMessage = useDeleteConversationMessage();
  const editMessage = useEditConversationMessage();

  const aggregatedReactions = useMemo(() => {
    return Object.entries(reactions || {}).map(([emoji, info]) => ({ emoji, ...info }));
  }, [reactions]);

  const onSelectEmoji = async (emoji: string) => {
    setShowEmojiPicker(false);
    toggleReaction.mutate({ messageId: message.id, emoji });
  };

  const handleReply = () => onReply?.(message);
  
  const handleEdit = () => {
    setIsEditing(true);
    setEditContent(message.content);
  };
  
  const handleDelete = () => {
    if (!window.confirm('Supprimer ce message ?')) return;
    deleteMessage.mutate({ messageId: message.id });
  };
  
  const handleSaveEdit = () => {
    if (!editContent.trim()) return;
    editMessage.mutate({ messageId: message.id, content: editContent }, {
      onSuccess: () => setIsEditing(false)
    });
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="relative">
          <div
            className={`relative max-w-[70%] p-3 rounded-lg shadow-sm ${
              isOwnMessage
                ? 'bg-[#25d366] text-white rounded-br-sm ml-auto'
                : 'bg-white text-gray-800 rounded-bl-sm border border-[#25d366]/20'
            }`}
          >
            {/* Contenu ou édition */}
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  className="w-full text-sm border rounded p-2 text-gray-800"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2 justify-end">
                  <button 
                    className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-800" 
                    onClick={() => setIsEditing(false)}
                  >
                    Annuler
                  </button>
                  <button 
                    className="text-xs px-2 py-1 rounded bg-[#25d366] text-white" 
                    onClick={handleSaveEdit}
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Indicateur de réponse à une story */}
                {message.is_story_reply && (
                  <div className={`text-xs mb-2 pb-2 border-b flex items-center gap-1 ${
                    isOwnMessage ? 'border-white/20 text-white/80' : 'border-gray-200 text-gray-500'
                  }`}>
                    <span className="text-base">📖</span>
                    <span>Réponse au statut</span>
                  </div>
                )}
                
                {message.content && (
                  <p className="text-sm break-words">
                    <LinkifiedText text={message.content} />
                  </p>
                )}
                
                {/* Prévisualisation des médias */}
                {message.conversation_media && message.conversation_media.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {message.conversation_media.map((media) => (
                      <ModernMediaPreview
                        key={media.id}
                        fileUrl={media.file_url}
                        fileName={media.file_name}
                        fileType={media.file_type}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Heure et bouton réaction */}
            <div className={`text-xs mt-1 flex items-center justify-end gap-2 ${
              isOwnMessage ? 'text-white/70' : 'text-gray-500'
            }`}>
              <button
                className="opacity-70 hover:opacity-100 transition"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEmojiPicker((v) => !v);
                }}
                title="Réactions"
              >
                <Smile size={14} />
              </button>
              <span>
                {new Date(message.created_at).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          {/* Réactions agrégées */}
          {aggregatedReactions.length > 0 && (
            <div className={`absolute -bottom-3 ${isOwnMessage ? 'right-2' : 'left-2'} bg-white border border-gray-200 rounded-full px-2 py-0.5 text-xs shadow-sm flex gap-1`}>
              {aggregatedReactions.map(r => (
                <button
                  key={r.emoji}
                  onClick={() => toggleReaction.mutate({ messageId: message.id, emoji: r.emoji })}
                  className={`flex items-center gap-0.5 ${r.reactedByMe ? 'font-semibold' : ''}`}
                >
                  <span>{r.emoji}</span>
                  <span>{r.count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div className={`absolute ${isOwnMessage ? 'right-0' : 'left-0'} -top-2 translate-y-[-100%] z-50`}>
              <EmojiPicker
                onEmojiSelect={onSelectEmoji}
                isOpen={showEmojiPicker}
                onToggle={() => setShowEmojiPicker(false)}
              />
            </div>
          )}
        </div>
      </ContextMenuTrigger>

      {/* Menu contextuel */}
      <ContextMenuContent>
        <ContextMenuItem onSelect={handleReply}>
          <Reply className="mr-2 h-4 w-4" /> Répondre
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => setShowEmojiPicker(true)}>
          <Smile className="mr-2 h-4 w-4" /> Réactions…
        </ContextMenuItem>
        {isOwnMessage && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={handleEdit}>
              <Edit2 className="mr-2 h-4 w-4" /> Modifier
            </ContextMenuItem>
            <ContextMenuItem onSelect={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4 text-red-600" /> Supprimer
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default ConversationMessageBubble; 
