// Hook pour la gestion du fond d'écran personnalisable avec persistance Supabase
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const DEFAULT_WALLPAPER = 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80';

export const useWallpaper = () => {
  const { user } = useAuth();
  const [wallpaper, setWallpaper] = useState<string>(DEFAULT_WALLPAPER);
  const [isLoading, setIsLoading] = useState(true);

  // Charger le fond d'écran depuis Supabase
  useEffect(() => {
    const loadWallpaper = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('wallpaper_url')
          .eq('id', user.id)
          .single();

        if (!error && data?.wallpaper_url) {
          setWallpaper(data.wallpaper_url);
        }
      } catch (e) {
        console.error('Error loading wallpaper:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadWallpaper();
  }, [user?.id]);

  const changeWallpaper = useCallback(async (url: string) => {
    setWallpaper(url);
    
    if (!user?.id) return;

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
