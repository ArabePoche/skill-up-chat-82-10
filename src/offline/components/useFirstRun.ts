/**
 * Hook pour détecter si l'app a déjà été ouverte en ligne
 * Permet de bloquer l'accès si jamais initialisée
 */

import { useState, useEffect, useCallback } from 'react';
import { offlineStore } from '../utils/offlineStore';

const FIRST_RUN_KEY = 'educatok_first_run_complete';
const CACHE_INITIALIZED_KEY = 'educatok_cache_initialized';

interface FirstRunState {
  isFirstRun: boolean;
  isOnline: boolean;
  isCacheReady: boolean;
  isLoading: boolean;
  canAccessApp: boolean;
}

export const useFirstRun = () => {
  const [state, setState] = useState<FirstRunState>({
    isFirstRun: true,
    isOnline: navigator.onLine,
    isCacheReady: false,
    isLoading: true,
    canAccessApp: false,
  });

  // Vérifier si l'app a déjà été initialisée
  const checkFirstRun = useCallback(async () => {
    const hasBeenOpened = localStorage.getItem(FIRST_RUN_KEY);
    const cacheInitialized = localStorage.getItem(CACHE_INITIALIZED_KEY);
    const isOnline = navigator.onLine;

    // Initialiser IndexedDB
    try {
      await offlineStore.init();
    } catch (error) {
      console.error('Erreur initialisation IndexedDB:', error);
    }

    const isFirstRun = !hasBeenOpened;
    const isCacheReady = cacheInitialized === 'true';

    // Logique d'accès :
    // - En ligne : toujours accès
    // - Hors ligne + jamais ouvert : bloqué
    // - Hors ligne + déjà ouvert : accès (mode offline)
    const canAccessApp = isOnline || (!isFirstRun && isCacheReady);

    setState({
      isFirstRun,
      isOnline,
      isCacheReady,
      isLoading: false,
      canAccessApp,
    });

    // Si en ligne et première fois, marquer comme initialisé
    if (isOnline && isFirstRun) {
      localStorage.setItem(FIRST_RUN_KEY, Date.now().toString());
      localStorage.setItem(CACHE_INITIALIZED_KEY, 'true');
    }
  }, []);

  // Écouter les changements de connexion
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({
        ...prev,
        isOnline: true,
        canAccessApp: true,
      }));
      
      // Marquer comme initialisé quand on retrouve la connexion
      if (!localStorage.getItem(FIRST_RUN_KEY)) {
        localStorage.setItem(FIRST_RUN_KEY, Date.now().toString());
        localStorage.setItem(CACHE_INITIALIZED_KEY, 'true');
      }
    };

    const handleOffline = () => {
      const hasBeenOpened = localStorage.getItem(FIRST_RUN_KEY);
      const cacheInitialized = localStorage.getItem(CACHE_INITIALIZED_KEY);
      
      setState(prev => ({
        ...prev,
        isOnline: false,
        canAccessApp: !!hasBeenOpened && cacheInitialized === 'true',
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    checkFirstRun();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkFirstRun]);

  // Marquer le cache comme prêt après premier chargement réussi
  const markCacheReady = useCallback(() => {
    localStorage.setItem(CACHE_INITIALIZED_KEY, 'true');
    setState(prev => ({ ...prev, isCacheReady: true }));
  }, []);

  // Forcer une vérification de connexion réelle
  const checkRealConnection = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('https://jiasafdbfqqhhdazoybu.supabase.co/rest/v1/', {
        method: 'HEAD',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppYXNhZmRiZnFxaGhkYXpveWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MTQ5MTAsImV4cCI6MjA2NTQ5MDkxMH0.TXPwCkGAZRrn83pTsZHr2QFZwX03nBWdNPJN0s_jLKQ',
        },
        cache: 'no-store',
      });
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  return {
    ...state,
    markCacheReady,
    checkRealConnection,
    refresh: checkFirstRun,
  };
};
