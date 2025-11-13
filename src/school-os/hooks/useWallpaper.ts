// Hook pour la gestion du fond d'écran personnalisable
import { useState, useEffect } from 'react';

const DEFAULT_WALLPAPER = 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80';
const WALLPAPER_KEY = 'school-os-wallpaper';

export const useWallpaper = () => {
  const [wallpaper, setWallpaper] = useState<string>(() => {
    return localStorage.getItem(WALLPAPER_KEY) || DEFAULT_WALLPAPER;
  });

  useEffect(() => {
    localStorage.setItem(WALLPAPER_KEY, wallpaper);
  }, [wallpaper]);

  const changeWallpaper = (url: string) => {
    setWallpaper(url);
  };

  const resetWallpaper = () => {
    setWallpaper(DEFAULT_WALLPAPER);
  };

  return {
    wallpaper,
    changeWallpaper,
    resetWallpaper,
  };
};
