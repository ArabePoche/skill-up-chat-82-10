import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook pour tracker les vues de vidéos
 * Enregistre automatiquement une vue quand la vidéo devient active
 */
export const useVideoViews = (videoId: string, isActive: boolean) => {
  const { user } = useAuth();
  const hasTrackedView = useRef(false);

  useEffect(() => {
    // Ne tracker qu'une seule fois par session
    if (!isActive || hasTrackedView.current) return;

    const trackView = async () => {
      try {
        // Créer un ID de session unique pour cette session de navigation
        const sessionId = sessionStorage.getItem('video_session_id') || 
          `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        if (!sessionStorage.getItem('video_session_id')) {
          sessionStorage.setItem('video_session_id', sessionId);
        }

        await supabase
          .from('video_views')
          .insert({
            video_id: videoId,
            user_id: user?.id || null,
            session_id: sessionId,
            viewed_at: new Date().toISOString(),
          });

        hasTrackedView.current = true;
      } catch (error) {
        console.error('Error tracking video view:', error);
      }
    };

    // Attendre 5 secondes avant de compter la vue (pour éviter les vues accidentelles)
    const timer = setTimeout(trackView, 5000);

    return () => clearTimeout(timer);
  }, [videoId, isActive, user?.id]);
};
