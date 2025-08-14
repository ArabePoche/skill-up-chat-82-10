
// Composant : Affichage et gestion des réactions d'emoji sur les messages
// Rôle : permettre aux utilisateurs d'ajouter/retirer des réactions et afficher le décompte
import React, { useState } from 'react';
import { Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EmojiPicker from '@/components/EmojiPicker';
import { useMessageReactions, useToggleReaction } from '@/hooks/useMessageReactions';

interface MessageReactionsProps {
  messageId: string;
  showAddButton?: boolean;
}

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  messageId,
  showAddButton = true
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { data: reactions = {} } = useMessageReactions(messageId);
  const toggleReaction = useToggleReaction();

  const handleEmojiSelect = (emoji: string) => {
    setShowEmojiPicker(false);
    toggleReaction.mutate({ messageId, emoji });
  };

  const handleReactionClick = (emoji: string) => {
    toggleReaction.mutate({ messageId, emoji });
  };

  const reactionEntries = Object.entries(reactions);

  if (reactionEntries.length === 0 && !showAddButton) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 relative">
      {/* Réactions existantes */}
      {reactionEntries.map(([emoji, info]) => (
        <button
          key={emoji}
          onClick={() => handleReactionClick(emoji)}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-colors ${
            info.reactedByMe
              ? 'bg-blue-100 border-blue-300 text-blue-700'
              : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <span>{emoji}</span>
          <span>{info.count}</span>
        </button>
      ))}

      {/* Bouton d'ajout de réaction */}
      {showAddButton && (
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <Smile size={14} />
          </Button>

          {showEmojiPicker && (
            <div className="absolute bottom-full right-0 mb-1 z-50">
              <EmojiPicker
                onEmojiSelect={handleEmojiSelect}
                isOpen={showEmojiPicker}
                onToggle={() => setShowEmojiPicker(false)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageReactions;