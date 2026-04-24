// Hook pour la gestion du fond d'écran personnalisable avec persistance Supabase
// Offline-first : lit le cache local au premier rendu pour éviter le flash du
// fond par défaut, puis synchronise en arrière-plan.
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { offlineStore } from '@/offline/utils/offlineStore';
import { hashQueryKey } from '@/offline/utils/queryPersister';

const DEFAULT_WALLPAPER = 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80';

const wallpaperCacheKey = (userId: string) =>
  hashQueryKey(['school-wallpaper', userId]);

export const useWallpaper = () => {
  const { user } = useAuth();

  // Lecture synchrone du cache au montage : pas de flash par défaut.
  const [wallpaper, setWallpaper] = useState<string>(() => {
    if (!user?.id) return DEFAULT_WALLPAPER;
    const cached = offlineStore.getCachedQuerySync(wallpaperCacheKey(user.id));
    return typeof cached === 'string' && cached.length > 0 ? cached : DEFAULT_WALLPAPER;
  });
  const [isLoading, setIsLoading] = useState(true);

  // Charger le fond d'écran depuis Supabase et mettre à jour le cache
  useEffect(() => {
    let cancelled = false;
    const loadWallpaper = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      // Si rien en mémoire, tenter une lecture IndexedDB asynchrone
      const cached = offlineStore.getCachedQuerySync(wallpaperCacheKey(user.id));
      if (!cached) {
        try {
          const fromIdb = await offlineStore.getCachedQuery(
            wallpaperCacheKey(user.id),
          );
          if (!cancelled && typeof fromIdb === 'string' && fromIdb.length > 0) {
            setWallpaper(fromIdb);
          }
        } catch {
          /* ignore */
        }
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('wallpaper_url')
          .eq('id', user.id)
          .single();

        if (!cancelled && !error && data?.wallpaper_url) {
          setWallpaper(data.wallpaper_url);
          // Persister pour le mode hors-ligne
          offlineStore
            .cacheQuery(wallpaperCacheKey(user.id), data.wallpaper_url)
            .catch(() => {});
        }
      } catch (e) {
        console.error('Error loading wallpaper:', e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadWallpaper();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const changeWallpaper = useCallback(async (url: string) => {
    setWallpaper(url);
    if (!user?.id) return;

    // Mise à jour immédiate du cache local (visible hors-ligne)
    offlineStore.cacheQuery(wallpaperCacheKey(user.id), url).catch(() => {});

    try {
      await supabase
        .from('profiles')
        .update({ wallpaper_url: url })
        .eq('id', user.id);
    } catch (e) {
      console.error('Error saving wallpaper:', e);
    }
  }, [user?.id]);

  const resetWallpaper = useCallback(async () => {
    await changeWallpaper(DEFAULT_WALLPAPER);
  }, [changeWallpaper]);

  return {
    wallpaper,
    changeWallpaper,
    resetWallpaper,
    isLoading,
  };
};
