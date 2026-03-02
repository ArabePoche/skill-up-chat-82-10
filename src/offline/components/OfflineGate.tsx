/**
 * Composant Gate qui vérifie l'accès offline-first
 * Bloque l'app si jamais ouverte en ligne et actuellement hors connexion
 */

import React, { useEffect, useState } from 'react';
import { useFirstRun } from '../hooks/useFirstRun';
import { ConnectionRequiredScreen } from './ConnectionRequiredScreen';

interface OfflineGateProps {
  children: React.ReactNode;
}

export const OfflineGate: React.FC<OfflineGateProps> = ({ children }) => {
  const { 
    isLoading, 
    canAccessApp, 
    isFirstRun, 
    isOnline,
    markCacheReady,
    checkRealConnection 
  } = useFirstRun();
  const [offlineDismissed, setOfflineDismissed] = useState(false);

  useEffect(() => {
    if (isOnline && canAccessApp) {
      const timer = setTimeout(() => {
        markCacheReady();
        console.log('[OfflineGate] Cache marqué comme prêt après 10s');
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, canAccessApp, markCacheReady]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!canAccessApp && !offlineDismissed) {
    return (
      <ConnectionRequiredScreen 
        onDismiss={() => setOfflineDismissed(true)}
      />
    );
  }

  return <>{children}</>;
};
