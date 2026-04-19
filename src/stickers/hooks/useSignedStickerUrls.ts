/**
 * Génère et met en cache des URLs signées pour les fichiers de stickers
 * stockés dans le bucket privé `stickers-private`.
 *
 * Re-signature automatique : TanStack Query staleTime = 50 min (TTL = 1h).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const SIGNED_TTL_SECONDS = 60 * 60; // 1h
const STALE_MS = 50 * 60 * 1000; // 50 min

/**
 * Donne une map { path -> signed_url } pour une liste de chemins.
 * Si un sticker n'a pas de file_path (ancien upload public), son file_url est
 * conservé tel quel (compat ascendante côté UI).
 */
export const useSignedStickerUrls = (paths: (string | null | undefined)[]) => {
  const validPaths = Array.from(new Set(paths.filter((p): p is string => !!p)));
  return useQuery({
    queryKey: ['signed-sticker-urls', validPaths.sort().join('|')],
    queryFn: async () => {
      if (validPaths.length === 0) return {} as Record<string, string>;
      const { data, error } = await supabase.storage
        .from('stickers-private')
        .createSignedUrls(validPaths, SIGNED_TTL_SECONDS);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data ?? []).forEach((entry) => {
        if (entry.path && entry.signedUrl) map[entry.path] = entry.signedUrl;
      });
      return map;
    },
    enabled: validPaths.length > 0,
    staleTime: STALE_MS,
    refetchOnWindowFocus: false,
  });
};
