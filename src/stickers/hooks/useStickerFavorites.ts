// Hook pour gérer les stickers favoris (localStorage)
// Utilisation : const { isFavorite, toggleFavorite } = useStickerFavorites(stickerId)
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'favorite_stickers';

function getFavorites(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setFavorites(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function useStickerFavorites(stickerId: string) {
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const favs = getFavorites();
    setIsFavorite(favs.includes(stickerId));
  }, [stickerId]);

  const toggleFavorite = useCallback(() => {
    const favs = getFavorites();
    let updated: string[];
    if (favs.includes(stickerId)) {
      updated = favs.filter((id) => id !== stickerId);
    } else {
      updated = [...favs, stickerId];
    }
    setFavorites(updated);
    setIsFavorite(updated.includes(stickerId));
  }, [stickerId]);

  return { isFavorite, toggleFavorite };
}
