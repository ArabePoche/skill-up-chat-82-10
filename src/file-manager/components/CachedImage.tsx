/**
 * CachedImage — lightweight offline-first <img>
 *
 * Conçu pour les usages "inline" (stickers, avatars, miniatures de pack)
 * où le composant OfflineImage (avec son UI de téléchargement) est trop lourd.
 *
 * Stratégie:
 *  1. Lecture SYNCHRONE du cache mémoire (fileStatusCache) → affichage instantané du blob si présent.
 *  2. Sinon, lecture ASYNC d'IndexedDB (fileStore) au montage, en arrière-plan.
 *  3. En attendant, on affiche directement la remoteUrl pour ne pas faire clignoter l'UI quand on est en ligne.
 *  4. Quand l'image distante se charge correctement, on télécharge silencieusement les bytes
 *     et on les sauvegarde dans IndexedDB pour les disponibles hors-ligne plus tard.
 *  5. Hors-ligne sans cache: on conserve l'attribut src pour laisser l'UA gérer son propre cache HTTP,
 *     et on appelle onError si le navigateur échoue.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { fileStore } from '../stores/FileStore';
import { fileStatusCache } from '../stores/FileStatusCache';

export interface CachedImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  /** URL distante (Supabase publique ou signée) */
  src: string | null | undefined;
  /** Identifiant stable (ex: file_path Supabase). Recommandé pour les URLs signées. */
  fileId?: string | null;
  /** Type MIME, sinon deviné depuis l'extension */
  mimeType?: string;
  /** Si l'image distante échoue à charger, ce qu'on rend à la place */
  fallback?: React.ReactNode;
}

const guessMimeType = (url: string): string => {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
    default:
      return 'image/*';
  }
};

const getFileNameFromUrl = (url: string): string => {
  try {
    const pathname = new URL(url).pathname;
    return pathname.split('/').pop() || 'image';
  } catch {
    return 'image';
  }
};

export const CachedImage: React.FC<CachedImageProps> = ({
  src,
  fileId,
  mimeType,
  fallback,
  onLoad,
  onError,
  ...imgProps
}) => {
  // Clé stable: fileId fourni > sinon hash de l'URL
  const resolvedFileId = useMemo(() => {
    if (fileId) return `cimg_${fileId}`;
    if (src) return fileStore.generateFileId(src);
    return null;
  }, [fileId, src]);

  // Lecture synchrone du cache mémoire → affichage instantané si déjà téléchargé
  const initialBlobUrl = useMemo(() => {
    if (!resolvedFileId) return null;
    const cached = fileStatusCache.get(resolvedFileId);
    return cached?.status === 'downloaded' ? cached.blobUrl : null;
  }, [resolvedFileId]);

  const [blobUrl, setBlobUrl] = useState<string | null>(initialBlobUrl);
  const [hasFailed, setHasFailed] = useState(false);

  // Reset si la clé change
  useEffect(() => {
    setBlobUrl(initialBlobUrl);
    setHasFailed(false);
  }, [resolvedFileId, initialBlobUrl]);

  // Lecture IndexedDB asynchrone si pas déjà en mémoire
  useEffect(() => {
    if (!resolvedFileId || !src) return;
    if (blobUrl) return;

    let cancelled = false;
    (async () => {
      try {
        const localFile = await fileStore.getFileById(resolvedFileId);
        if (cancelled) return;
        if (localFile?.blob) {
          const url = URL.createObjectURL(localFile.blob);
          fileStatusCache.set(resolvedFileId, {
            fileId: resolvedFileId,
            status: 'downloaded',
            blobUrl: url,
            checkedAt: Date.now(),
            remoteUrl: src,
          });
          setBlobUrl(url);
        }
      } catch {
        /* ignore — on retombera sur la remoteUrl */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resolvedFileId, src, blobUrl]);

  // Quand la remote charge, on snapshot le blob en arrière-plan pour usage offline.
  const persistInFlightRef = useRef(false);
  const persistFromRemote = async () => {
    if (!src || !resolvedFileId) return;
    if (blobUrl) return;
    if (persistInFlightRef.current) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

    persistInFlightRef.current = true;
    try {
      const response = await fetch(src);
      if (!response.ok) return;
      const blob = await response.blob();
      // Créer une URL locale et la pousser en cache mémoire pour les prochains rendus
      const url = URL.createObjectURL(blob);
      fileStatusCache.set(resolvedFileId, {
        fileId: resolvedFileId,
        status: 'downloaded',
        blobUrl: url,
        checkedAt: Date.now(),
        remoteUrl: src,
      });
      // Persister dans IndexedDB sans bloquer
      fileStore
        .saveFile(resolvedFileId, blob, {
          remoteUrl: src,
          fileName: getFileNameFromUrl(src),
          fileType: mimeType || guessMimeType(src),
          fileSize: blob.size,
          isOwnFile: false,
        })
        .catch(() => {
          /* ignore */
        });
      // Pas besoin de re-rendre : le cache est rempli pour les prochains montages.
      // (On évite de switcher la src maintenant pour ne pas refaire flicker)
    } catch {
      /* ignore — pas de cache, mais l'affichage online fonctionne quand même */
    } finally {
      persistInFlightRef.current = false;
    }
  };

  // Choix du src à afficher: blob local si présent, sinon URL distante
  const displaySrc = blobUrl || src || undefined;

  if (!displaySrc) {
    return <>{fallback ?? null}</>;
  }

  if (hasFailed && !blobUrl) {
    return <>{fallback ?? null}</>;
  }

  return (
    <img
      {...imgProps}
      src={displaySrc}
      onLoad={(e) => {
        // Si on affiche depuis la remote et qu'on a une clé stable, on persiste.
        if (!blobUrl) {
          void persistFromRemote();
        }
        onLoad?.(e);
      }}
      onError={(e) => {
        setHasFailed(true);
        onError?.(e);
      }}
    />
  );
};

export default CachedImage;
