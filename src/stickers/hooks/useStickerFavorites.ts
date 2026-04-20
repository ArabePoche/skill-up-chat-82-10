// Hook pour gérer les stickers favoris (localStorage)
// Utilisation : const { isFavorite, toggleFavorite } = useStickerFavorites(stickerId)
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'favorite_stickers';

function getFavorites(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setFavorites(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function useStickerFavorites(stickerId: string) {
  const [favorites, setFavoritesState] = useState<string[]>(() => getFavorites());
  const isFavorite = favorites.includes(stickerId);

  // Sync favorites from localStorage on mount and when storage changes (multi-tab)
  useEffect(() => {
    const sync = () => setFavoritesState(getFavorites());
    window.addEventListener('storage', sync);
    sync();
    return () => window.removeEventListener('storage', sync);
  }, []);

  const toggleFavorite = useCallback(() => {
    setFavoritesState((prev) => {
      let updated: string[];
      if (prev.includes(stickerId)) {
        updated = prev.filter((id) => id !== stickerId);
      } else {
        updated = [...prev, stickerId];
      }
      setFavorites(updated);
      return updated;
    });
  }, [stickerId]);

  return { isFavorite, toggleFavorite };
}
