/**
 * Hook pour détecter si Supabase est accessible
 * Utile pour activer le mode offline quand la DB est en pause
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
      // Ping léger HEAD pour vérifier uniquement la connectivité réseau
      // Ne pas utiliser de requête DB qui peut échouer pour des raisons non-réseau
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch('https://jiasafdbfqqhhdazoybu.supabase.co/rest/v1/', {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Toute réponse HTTP (même 401, 402, 403, 500) = le serveur répond = réseau OK
      console.log('✅ Supabase is reachable (status:', response.status, ')');
      setIsAvailable(true);
      return true;

    } catch (err: any) {
      const errName = err?.name || '';
      const errMsg = (err?.message || '').toLowerCase();

      // Seules les erreurs réseau réelles déclenchent le mode offline
      const isNetworkError = errName === 'AbortError' ||
        errName === 'TypeError' ||
        errMsg.includes('network') ||
        errMsg.includes('failed to fetch');

      if (isNetworkError) {
        console.warn('📵 Supabase unreachable (network error):', errMsg || errName);
        setError('Pas de connexion réseau');
        setIsAvailable(false);
        return false;
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
      console.log('📴 Network is offline');
      setIsAvailable(false);
      setError('Pas de connexion internet');
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
