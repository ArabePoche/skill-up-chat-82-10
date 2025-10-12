// Hook pour mettre à jour automatiquement la présence de l'utilisateur
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useUserPresence = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Fonction pour mettre à jour last_seen
    const updatePresence = async () => {
      await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', user.id);
    };

    // Mettre à jour immédiatement
    updatePresence();

    // Mettre à jour toutes les 2 minutes
    const interval = setInterval(updatePresence, 2 * 60 * 1000);

    // Mettre à jour lors des événements d'activité
    const handleActivity = () => {
      updatePresence();
    };

    window.addEventListener('focus', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('keypress', handleActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keypress', handleActivity);
    };
  }, [user]);
};
