/**
 * Hook pour tracker les visiteurs anonymes (sans compte) via heartbeat Supabase.
 * Enregistre un session_id unique dans localStorage et envoie un heartbeat toutes les 30s.
 * Ne s'active que pour les utilisateurs non connectés.
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const SESSION_KEY = 'visitor_session_id';
const HEARTBEAT_INTERVAL = 30000; // 30 secondes

function getSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

export function useVisitorTracker() {
  const { user } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Ne tracker que les visiteurs non connectés
    if (user) return;

    const sessionId = getSessionId();

    const sendHeartbeat = async () => {
      try {
        await supabase
          .from('site_visitors')
          .upsert(
            { session_id: sessionId, last_seen: new Date().toISOString() },
            { onConflict: 'session_id' }
          );
      } catch (e) {
        console.error('[VisitorTracker] Heartbeat error:', e);
      }
    };

    // Premier heartbeat immédiat
    sendHeartbeat();
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user]);
}
