import type { ForwardableMessage } from '@/conversations/forwardableMessage';

/** Convertit un message de leçon / groupe (messages) en charge utile pour conversation_messages. */
export function lessonMessageToForwardable(message: {
  id: string;
  content?: string | null;
  file_url?: string | null;
  file_type?: string | null;
  file_name?: string | null;
}): ForwardableMessage {
  const base: ForwardableMessage = {
    id: message.id,
    content: message.content ?? '',
  };

  if (message.file_url?.trim() && message.file_type?.trim()) {
    base.conversation_media = [
      {
        file_url: message.file_url.trim(),
        file_type: message.file_type.trim(),
        file_name: (message.file_name || 'fichier').trim() || 'fichier',
      },
    ];
  }

  return base;
}
