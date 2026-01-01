/**
 * Provider qui active la synchronisation automatique des conversations
 * Doit être placé à l'intérieur de AuthProvider
 */

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineConversations } from '../hooks/useOfflineConversations';

interface ConversationSyncProviderProps {
  children: React.ReactNode;
}

/**
 * Ce composant active la synchronisation automatique des messages de conversation
 * pour l'utilisateur connecté. Il ne rend rien visuellement.
 */
export const ConversationSyncProvider: React.FC<ConversationSyncProviderProps> = ({ children }) => {
  const { user } = useAuth();
  
  // Active la synchronisation automatique des conversations
  useOfflineConversations(user?.id);
  
  return <>{children}</>;
};
