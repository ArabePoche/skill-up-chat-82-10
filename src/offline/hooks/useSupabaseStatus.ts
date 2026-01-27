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
      // Fait une requête simple pour vérifier si Supabase répond
      const { error: dbError } = await supabase
        .from('formations')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (dbError) {
        // Vérifie si c'est une erreur 402 (quota dépassé / service suspendu)
        const errorMessage = dbError.message || '';
        
        if (errorMessage.includes('402') || 
            errorMessage.includes('restricted') || 
            errorMessage.includes('quota') ||
            errorMessage.includes('payment')) {
          console.warn('⚠️ Supabase service is restricted (billing issue)');
          setError('Service Supabase suspendu - Mode offline activé');
          setIsAvailable(false);
          return false;
        }

        // Autres erreurs de connexion
        if (dbError.code === 'PGRST301' || 
            errorMessage.includes('network') ||
            errorMessage.includes('fetch')) {
          console.warn('⚠️ Supabase is not reachable');
          setError('Supabase inaccessible - Mode offline activé');
          setIsAvailable(false);
          return false;
        }

        // Erreur RLS ou autre - Supabase fonctionne
        console.log('✅ Supabase is available (RLS or other error, but service is running)');
        setIsAvailable(true);
        return true;
      }

      console.log('✅ Supabase is available');
      setIsAvailable(true);
      return true;

    } catch (err: any) {
      console.error('❌ Error checking Supabase status:', err);
      setError('Erreur de connexion à Supabase');
      setIsAvailable(false);
      return false;
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
