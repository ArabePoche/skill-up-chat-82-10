import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineSync } from '@/offline/hooks/useOfflineSync';
import { toast } from 'sonner';
import { sendPushNotification } from '@/utils/notificationHelpers';
import {
  getForwardedMessagePreview,
  markForwardedMessageContent,
} from '@/utils/forwardedConversationMessage';
import type { ForwardableMessage } from '@/conversations/forwardableMessage';
import type { ConversationForwardRecipient } from '@/conversations/components/ConversationForwardDialog';

/**
 * Transfert d'un message vers une conversation privée (conversation_messages).
 * Réutilisé par la page Messages et par le chat de formation.
 * @param onAfterSuccess ex. fermer le dialogue (setMessageToForward(null))
 */
export function useForwardConversationMessage(onAfterSuccess?: () => void) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isOnline } = useOfflineSync();

  const { data: currentUserProfile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, username, avatar_url')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  return useMutation({
    mutationFn: async ({
      recipient,
      message,
    }: {
      recipient: ConversationForwardRecipient;
      message: ForwardableMessage;
    }) => {
      if (!user?.id) {
        throw new Error('Non authentifié');
      }

      if (!isOnline) {
        throw new Error('Le transfert de message nécessite une connexion');
      }

      const targetUserId = recipient.id;
      if (!targetUserId || targetUserId === user.id) {
        throw new Error('Destinataire invalide');
      }

      const { data: forwardedMessage, error: messageError } = await supabase
        .from('conversation_messages')
        .insert({
          story_id: null,
          sender_id: user.id,
          receiver_id: targetUserId,
          content: markForwardedMessageContent(message.content || ''),
          is_story_reply: false,
          replied_to_message_id: null,
        })
        .select('id')
        .single();

      if (messageError) {
        throw messageError;
      }

      if (message.conversation_media?.length) {
        const copiedMedia = message.conversation_media.map((media) => ({
          message_id: forwardedMessage.id,
          file_url: media.file_url,
          file_type: media.file_type,
          file_name: media.file_name,
          file_size: media.file_size,
          duration_seconds: media.duration_seconds,
        }));

        const { error: mediaError } = await supabase.from('conversation_media').insert(copiedMedia);

        if (mediaError) {
          throw mediaError;
        }
      }

      return recipient;
    },
    onSuccess: (recipient, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conversations-list', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', recipient.id] });
      toast.success(`Message transféré à ${recipient.name}`);

      if (user?.id) {
        const senderName =
          `${currentUserProfile?.first_name || user.user_metadata?.first_name || ''} ${currentUserProfile?.last_name || user.user_metadata?.last_name || ''}`.trim() ||
          currentUserProfile?.username ||
          user.user_metadata?.username ||
          user.email?.split('@')[0] ||
          "Quelqu'un";
        const senderAvatar = currentUserProfile?.avatar_url || user.user_metadata?.avatar_url || null;
        const previewContent = getForwardedMessagePreview(variables.message.content, 'Média transféré');
        const preview = previewContent.substring(0, 100);

        sendPushNotification({
          userIds: [recipient.id],
          title: senderName,
          message: preview,
          type: 'private_chat',
          clickAction: '/messages',
          data: {
            senderId: user.id,
            senderName,
            senderAvatar,
            imageUrl: senderAvatar,
          },
        }).catch(() => {});
      }

      onAfterSuccess?.();
    },
    onError: (error) => {
      console.error('Erreur lors du transfert du message:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors du transfert du message');
    },
  });
}
