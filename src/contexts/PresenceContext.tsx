/**
 * Context pour gérer la présence utilisateur globalement dans l'application
 */
import React, { createContext, useContext, ReactNode } from 'react';
import { useRealtimePresence } from '@/hooks/useRealtimePresence';
import type { PresenceStatus, PresenceState } from '@/types/presence';

interface PresenceContextType {
  presenceState: PresenceState;
  currentStatus: PresenceStatus;
  trackPresence: (status?: PresenceStatus) => Promise<void>;
  untrackPresence: () => Promise<void>;
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined);

export const PresenceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const presence = useRealtimePresence();

  return (
    <PresenceContext.Provider value={presence}>
      {children}
    </PresenceContext.Provider>
  );
};

export const usePresence = () => {
  const context = useContext(PresenceContext);
  if (context === undefined) {
    throw new Error('usePresence doit être utilisé dans un PresenceProvider');
  }
  return context;
};
