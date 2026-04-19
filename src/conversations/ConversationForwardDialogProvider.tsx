/**
 * Une seule instance de ConversationForwardDialog pour toute l’app (Messages + chat formation).
 */
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useConversationsList } from '@/hooks/messages/useConversationsList';
import ConversationForwardDialog from '@/conversations/components/ConversationForwardDialog';
import { useForwardConversationMessage } from '@/hooks/conversations/useForwardConversationMessage';
import type { ForwardableMessage } from '@/conversations/forwardableMessage';

export type OpenConversationForwardOptions = {
  /** En plus de l’utilisateur connecté, exclure ces profils (ex. l’interlocuteur sur /conversations/:id). */
  extraExcludedUserIds?: string[];
};

type ConversationForwardDialogContextValue = {
  openConversationForward: (message: ForwardableMessage, options?: OpenConversationForwardOptions) => void;
};

const ConversationForwardDialogContext = createContext<ConversationForwardDialogContextValue | null>(null);

type ForwardUiState = {
  message: ForwardableMessage | null;
  extraExcludedUserIds: string[];
};

const emptyState: ForwardUiState = { message: null, extraExcludedUserIds: [] };

export const ConversationForwardDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [state, setState] = useState<ForwardUiState>(emptyState);
  /** Horodatage d’ouverture : Radix peut appeler onOpenChange(false) dans les ms qui suivent (même geste que le menu). */
  const openedAtRef = useRef<number | null>(null);

  const close = useCallback(() => {
    openedAtRef.current = null;
    setState(emptyState);
  }, []);

  const forwardMessageMutation = useForwardConversationMessage(close);

  const { data: conversations = [] } = useConversationsList(!!user?.id);

  const recentRecipients = useMemo(
    () =>
      conversations.map((conversation: { otherUserId: string; name?: string; avatar?: string; lastMessage?: string }) => ({
        id: conversation.otherUserId,
        name: conversation.name || 'Utilisateur',
        avatarUrl:
          typeof conversation.avatar === 'string' && conversation.avatar !== '💬' ? conversation.avatar : null,
        subtitle: conversation.lastMessage || null,
      })),
    [conversations],
  );

  const excludedUserIds = useMemo(() => {
    const ids = new Set<string>();
    if (user?.id) ids.add(user.id);
    state.extraExcludedUserIds.forEach((id) => {
      if (id) ids.add(id);
    });
    return Array.from(ids);
  }, [user?.id, state.extraExcludedUserIds]);

  const openConversationForward = useCallback(
    (message: ForwardableMessage, options?: OpenConversationForwardOptions) => {
      if (!user?.id) return;
      const extra = options?.extraExcludedUserIds?.filter(Boolean) ?? [];
      // Délai court : laisser finir le clic du menu ; les onOpenChange(false) immédiats sont filtrés (handleDialogOpenChange).
      window.setTimeout(() => {
        openedAtRef.current = Date.now();
        setState({ message, extraExcludedUserIds: extra });
      }, 32);
    },
    [user?.id],
  );

  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        const t0 = openedAtRef.current;
        if (t0 !== null && Date.now() - t0 < 50) {
          return;
        }
        close();
      }
    },
    [close],
  );

  const value = useMemo(
    () => ({ openConversationForward }),
    [openConversationForward],
  );

  return (
    <ConversationForwardDialogContext.Provider value={value}>
      {children}
      <ConversationForwardDialog
        open={!!state.message}
        onOpenChange={handleDialogOpenChange}
        recentRecipients={recentRecipients}
        excludedUserIds={excludedUserIds}
        isForwarding={forwardMessageMutation.isPending}
        onConfirm={async (recipient) => {
          if (!state.message) return;
          await forwardMessageMutation.mutateAsync({ recipient, message: state.message });
        }}
      />
    </ConversationForwardDialogContext.Provider>
  );
};

export function useConversationForwardDialog(): ConversationForwardDialogContextValue {
  const ctx = useContext(ConversationForwardDialogContext);
  if (!ctx) {
    throw new Error('useConversationForwardDialog must be used within ConversationForwardDialogProvider');
  }
  return ctx;
}
