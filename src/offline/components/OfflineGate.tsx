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
  // Délai réduit à 10 secondes pour ne pas bloquer l'offline inutilement
  useEffect(() => {
    if (isOnline && canAccessApp) {
      // Marquer immédiatement + timer court pour être sûr que le SW a commencé le cache
      const timer = setTimeout(() => {
        markCacheReady();
        console.log('[OfflineGate] Cache marqué comme prêt après 10s');
      }, 10000); // 10 secondes
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
