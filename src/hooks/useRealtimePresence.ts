/**
 * Hook pour gérer la présence utilisateur en temps réel
 * - Supabase Realtime Presence pour le tracking instantané
 * - Mise à jour périodique de last_seen en base
 * - Détection d'inactivité (idle après 10 minutes)
 * - Gestion propre de la déconnexion (web + mobile)
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { App } from '@capacitor/app';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { PresenceStatus, UserPresence, PresenceState } from '@/types/presence';

const PRESENCE_CHANNEL = 'user-presence';
const IDLE_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const LAST_SEEN_UPDATE_INTERVAL = 2 * 60 * 1000; // 2 minutes
const PRESENCE_UPDATE_INTERVAL = 30 * 1000; // 30 secondes

export const useRealtimePresence = () => {
  const { user, profile } = useAuth();
  const [presenceState, setPresenceState] = useState<PresenceState>({});
  const [currentStatus, setCurrentStatus] = useState<PresenceStatus>('online');
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSeenTimerRef = useRef<NodeJS.Timeout | null>(null);
  const presenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountingRef = useRef(false);

  // Mise à jour de last_seen en base de données
  const updateLastSeen = useCallback(async () => {
    if (!user || isUnmountingRef.current) return;
    
    try {
      await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', user.id);
    } catch (error) {
      console.error('Erreur mise à jour last_seen:', error);
    }
  }, [user]);

  // Track la présence avec le statut actuel
  const trackPresence = useCallback(async (status: PresenceStatus = 'online') => {
    if (!channelRef.current || !user || isUnmountingRef.current) return;

    const presenceData: UserPresence = {
      user_id: user.id,
      status,
      last_active: new Date().toISOString(),
      username: profile?.username,
      avatar_url: profile?.avatar_url,
    };

    try {
      await channelRef.current.track(presenceData);
      setCurrentStatus(status);
    } catch (error) {
      console.error('Erreur track presence:', error);
    }
  }, [user, profile]);

  // Untrack la présence (déconnexion propre)
  const untrackPresence = useCallback(async () => {
    if (!channelRef.current || isUnmountingRef.current) return;
    
    try {
      await channelRef.current.untrack();
      setCurrentStatus('offline');
    } catch (error) {
      console.error('Erreur untrack presence:', error);
    }
  }, []);

  // Réinitialiser le timer d'inactivité
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    // Repasser en online si on était idle
    if (currentStatus === 'idle') {
      trackPresence('online');
    }

    // Nouveau timer pour passer en idle
    idleTimerRef.current = setTimeout(() => {
      if (!isUnmountingRef.current) {
        trackPresence('idle');
      }
    }, IDLE_TIMEOUT);
  }, [currentStatus, trackPresence]);

  // Gérer l'activité utilisateur
  const handleUserActivity = useCallback(() => {
    if (isUnmountingRef.current) return;
    resetIdleTimer();
  }, [resetIdleTimer]);

  // Initialiser le channel Realtime Presence
  useEffect(() => {
    if (!user) return;

    isUnmountingRef.current = false;
    
    // Créer le channel de présence
    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channelRef.current = channel;

    // Écouter les changements de présence
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<UserPresence>();
        setPresenceState(state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track initial presence
          await trackPresence('online');
          
          // Mise à jour immédiate de last_seen
          await updateLastSeen();
        }
      });

    // Timer pour mise à jour périodique de last_seen
    lastSeenTimerRef.current = setInterval(() => {
      updateLastSeen();
    }, LAST_SEEN_UPDATE_INTERVAL);

    // Timer pour rafraîchir la présence périodiquement
    presenceTimerRef.current = setInterval(() => {
      if (currentStatus !== 'offline') {
        trackPresence(currentStatus);
      }
    }, PRESENCE_UPDATE_INTERVAL);

    // Écouter les événements d'activité
    window.addEventListener('focus', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('keypress', handleUserActivity);
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);

    // Initialiser le timer d'inactivité
    resetIdleTimer();

    // Gérer la fermeture de l'onglet/navigateur (WEB)
    const handleBeforeUnload = () => {
      isUnmountingRef.current = true;
      // Mise à jour synchrone avant fermeture
      updateLastSeen();
      // Untrack via l'API directement car le channel peut ne pas avoir le temps
      channel.untrack();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Gérer les changements d'état de l'app (MOBILE - Capacitor)
    let appStateListener: any = null;
    
    const setupMobileListeners = async () => {
      try {
        appStateListener = await App.addListener('appStateChange', async ({ isActive }) => {
          if (isActive) {
            // App revient au premier plan
            await trackPresence('online');
            resetIdleTimer();
          } else {
            // App passe en arrière-plan
            isUnmountingRef.current = true;
            await updateLastSeen();
            await untrackPresence();
          }
        });
      } catch (error) {
        // Pas sur mobile, ignorer
      }
    };
    setupMobileListeners();

    // Cleanup
    return () => {
      isUnmountingRef.current = true;
      
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      if (lastSeenTimerRef.current) {
        clearInterval(lastSeenTimerRef.current);
      }
      if (presenceTimerRef.current) {
        clearInterval(presenceTimerRef.current);
      }

      window.removeEventListener('focus', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('keypress', handleUserActivity);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      window.removeEventListener('beforeunload', handleBeforeUnload);

      if (appStateListener) {
        appStateListener.remove();
      }

      // Untrack et fermer le channel
      if (channel) {
        channel.untrack();
        supabase.removeChannel(channel);
      }
      
      // Dernière mise à jour de last_seen
      updateLastSeen();
    };
  }, [user, trackPresence, untrackPresence, updateLastSeen, resetIdleTimer, handleUserActivity, currentStatus, profile]);

  return {
    presenceState,
    currentStatus,
    trackPresence,
    untrackPresence,
  };
};
