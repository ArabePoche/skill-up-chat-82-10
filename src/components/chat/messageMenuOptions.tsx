import React from 'react';
import { Reply, Smile, Edit2, Trash2, Forward, Copy } from 'lucide-react';
import { MenuOption } from './AdaptiveMessageMenu';

interface UseMessageMenuOptionsParams {
  message: any;
  isOwnMessage: boolean;
  onReply?: (message: any) => void;
  onForward?: (message: any) => void;
  setShowEmojiPicker: (show: boolean) => void;
  setIsEditing: (editing: boolean) => void;
  setEditContent: (content: string) => void;
  deleteMessage: { mutate: (args: { messageId: string }) => void };
}

export const useMessageMenuOptions = ({
  message,
  isOwnMessage,
  onReply,
  onForward,
  setShowEmojiPicker,
  setIsEditing,
  setEditContent,
  deleteMessage,
}: UseMessageMenuOptionsParams) => {

  const handleReply = () => onReply?.(message);

  const handleReact = () => setShowEmojiPicker(true);

  const handleEdit = () => {
    setIsEditing(true);
    setEditContent(message.content);
  };

  const handleDelete = () => {
    if (!window.confirm('Supprimer ce message ?')) return;
    deleteMessage.mutate({ messageId: message.id });
  };

  const handleForward = () => {
    if (onForward) {
      onForward(message);
    } else {
      console.log('Forward action not implemented');
    }
  };

  const options: MenuOption[] = [
    {
      id: 'reply',
      label: 'Répondre',
      icon: <Reply className="h-4 w-4" />,
      onClick: handleReply,
    },
    {
      id: 'forward',
      label: 'Transférer',
      icon: <Forward className="h-4 w-4" />,
      onClick: handleForward,
    },
    {
      id: 'react',
      label: 'Réagir',
      icon: <Smile className="h-4 w-4" />,
      onClick: handleReact,
    },
  ];

  if (isOwnMessage && !message.is_system_message) {
    options.push(
      {
        id: 'edit',
        label: 'Modifier',
        icon: <Edit2 className="h-4 w-4" />,
        onClick: handleEdit,
      },
      {
        id: 'delete',
        label: 'Supprimer',
        icon: <Trash2 className="h-4 w-4" />,
        onClick: handleDelete,
      }
    );
  }

  return {
    options,
    handleReply,
    handleReact,
    handleEdit,
    handleDelete,
    handleForward,
  };
};
