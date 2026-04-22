import { useAuth } from './useAuth';

/**
 * Hook utilitaire pour accéder aux informations utilisateur
 * Wrapper autour de useAuth pour compatibilité
 */
export function useUser() {
  const { user, profile, loading, session } = useAuth();
  
  return {
    user,
    profile,
    loading,
    session,
  };
}

export type { User } from '@supabase/supabase-js';
