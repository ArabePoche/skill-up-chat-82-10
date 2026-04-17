/**
 * Hook pour détecter si Supabase est accessible
 * Utile pour activer le mode offline quand la DB est en pause
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const CONNECTIVITY_PROBE_URLS = [
  'https://www.gstatic.com/generate_204',
  'https://connectivitycheck.gstatic.com/generate_204',
  'https://jiasafdbfqqhhdazoybu.supabase.co/auth/v1/settings',
];

const probeSupabaseReachability = async (timeoutMs: number = 8000): Promise<boolean> => {
  for (const url of CONNECTIVITY_PROBE_URLS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      await fetch(url, {
        method: 'GET',
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return true;
    } catch {
      continue;
    }
  }

  return false;
};

export interface SupabaseStatus {
  isAvailable: boolean;
  isChecking: boolean;
  error: string | null;
  lastCheck: Date | null;
  checkNow: () => Promise<boolean>;
}

export const useSupabaseStatus = (): SupabaseStatus => {
  const [isAvailable, setIsAvailable] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkSupabaseStatus = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);
    setError(null);

    try {
      if (!navigator.onLine) {
        const stillReachable = await probeSupabaseReachability(3000);

        if (!stillReachable) {
          console.warn('📵 Supabase unreachable: navigateur et sonde indiquent hors ligne');
          setError('Pas de connexion internet');
          setIsAvailable(false);
          return false;
        }

        console.warn('⚠️ navigator.onLine=false mais la sonde confirme la connectivité');
      }

      const reachable = await probeSupabaseReachability(8000);

      if (!reachable) {
        console.warn('⚠️ Aucune sonde de connectivité n’a répondu, on conserve l’état en ligne');
        setIsAvailable(true);
        return true;
      }

      console.log('✅ Supabase is reachable');
      setIsAvailable(true);
      return true;

    } catch (err: any) {
      const errName = err?.name || '';
      const errMsg = (err?.message || '').toLowerCase();

      // Seules les erreurs réseau réelles déclenchent le mode offline
      const isNetworkError = errName === 'TypeError' ||
        errMsg.includes('network') ||
        errMsg.includes('failed to fetch');

      if (isNetworkError) {
        if (!navigator.onLine) {
          console.warn('📵 Supabase unreachable (network error):', errMsg || errName);
          setError('Pas de connexion réseau');
          setIsAvailable(false);
          return false;
        }

        console.warn('⚠️ Erreur réseau isolée ignorée, on reste en ligne:', errMsg || errName);
        setIsAvailable(true);
        return true;
      }

      if (errName === 'AbortError') {
        console.warn('⏱️ Timeout de vérification, on reste en ligne');
        setIsAvailable(true);
        return true;
      }

      // Erreur inattendue mais pas réseau → on reste en ligne
      console.warn('⚠️ Unexpected error checking Supabase, staying online:', err);
      setIsAvailable(true);
      return true;
    } finally {
      setIsChecking(false);
      setLastCheck(new Date());
    }
  }, []);

  useEffect(() => {
    // Vérification initiale
    checkSupabaseStatus();

    // Vérification périodique toutes les 30 secondes
    const interval = setInterval(checkSupabaseStatus, 30000);

    // Écoute les changements de connexion réseau
    const handleOnline = () => {
      console.log('🌐 Network is online, checking Supabase...');
      checkSupabaseStatus();
    };

    const handleOffline = () => {
      console.log('📴 Offline event reçu, vérification en cours...');
      void checkSupabaseStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkSupabaseStatus]);

  return {
    isAvailable,
    isChecking,
    error,
    lastCheck,
    checkNow: checkSupabaseStatus,
  };
};
