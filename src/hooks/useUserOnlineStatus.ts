/**
 * Hook pour obtenir le statut en ligne d'un utilisateur spécifique
 */
import { useMemo } from 'react';
import { usePresence } from '@/contexts/PresenceContext';
import type { PresenceStatus } from '@/types/presence';

export const useUserOnlineStatus = (userId: string | undefined): PresenceStatus => {
  const { presenceState } = usePresence();

  return useMemo(() => {
    if (!userId) return 'offline';

    // Chercher l'utilisateur dans le state de présence
    const userPresences = presenceState[userId];
    if (!userPresences || userPresences.length === 0) {
      return 'offline';
    }

    // Prendre la dernière présence (la plus récente)
    const latestPresence = userPresences[userPresences.length - 1];
    return latestPresence.status;
  }, [userId, presenceState]);
};
