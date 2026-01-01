/**
 * Composant Gate qui vérifie l'accès offline-first
 * Bloque l'app si jamais ouverte en ligne et actuellement hors connexion
 */

import React, { useEffect } from 'react';
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

  // Marquer le cache comme prêt quand l'app charge avec succès en ligne
  useEffect(() => {
    if (isOnline && canAccessApp) {
      // Attendre un peu que le SW cache les assets
      const timer = setTimeout(() => {
        markCacheReady();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, canAccessApp, markCacheReady]);

  // Écran de chargement initial
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

  // Écran de connexion requise si pas d'accès
  if (!canAccessApp) {
    return (
      <ConnectionRequiredScreen 
        onRetry={checkRealConnection}
        isFirstRun={isFirstRun}
      />
    );
  }

  // App normale
  return <>{children}</>;
};
