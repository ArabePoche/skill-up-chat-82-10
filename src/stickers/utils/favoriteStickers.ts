// Utilitaire pour obtenir la liste des stickers favoris depuis le localStorage
const STORAGE_KEY = 'favorite_stickers';

export function getFavoriteStickerIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
