/**
 * Service pour sauvegarder les médias dans la galerie Android/iOS.
 * Utilise @capacitor-community/media (v8+) pour l'intégration native.
 *
 * Comportement type WhatsApp:
 * - Les médias téléchargés apparaissent dans la galerie (images/vidéos)
 * - Dossier REZO dans Downloads pour les audios/documents
 * - Album dédié "REZO" pour regrouper les médias
 * - Fallback web pour les environnements non-natifs
 */

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Media as MediaPlugin } from '@capacitor-community/media';

// Nom de l'album dans la galerie
const ALBUM_NAME = 'REZO';
const isDevelopment = import.meta.env.DEV;

const debugLog = (...args: unknown[]) => {
  if (isDevelopment) {
    console.log(...args);
  }
};

const logWarning = (message: string, error?: unknown) => {
  if (isDevelopment && error !== undefined) {
    console.warn(message, error);
    return;
  }

  console.warn(message);
};

const logError = (message: string, error?: unknown) => {
  if (isDevelopment && error !== undefined) {
    console.error(message, error);
    return;
  }

  console.error(message);
};

// Cache pour l'identifiant de l'album
let albumIdentifier: string | null = null;

// Cache pour savoir si les permissions ont été demandées
let permissionsRequested = false;

/**
 * Vérifie si on est sur une plateforme native (Android/iOS).
 */
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Demande les permissions de stockage sur Android.
 * Nécessaire uniquement pour écrire dans les dossiers partagés.
 */
export const requestStoragePermissions = async (): Promise<boolean> => {
  if (!isNativePlatform() || permissionsRequested) {
    return true;
  }

  try {
    const platform = Capacitor.getPlatform();

    if (platform === 'android') {
      const permStatus = await Filesystem.checkPermissions();

      if (permStatus.publicStorage !== 'granted') {
        const reqResult = await Filesystem.requestPermissions();
        permissionsRequested = true;
        return reqResult.publicStorage === 'granted';
      }
    }

    permissionsRequested = true;
    return true;
  } catch (error) {
    logWarning('⚠️ Erreur demande permissions');
    permissionsRequested = true;
    return false;
  }
};

/**
 * Accès au plugin Media si disponible côté natif.
 */
const getMediaPlugin = async (): Promise<typeof MediaPlugin | null> => {
  if (!isNativePlatform()) return null;
  return MediaPlugin;
};

const findAlbumByName = async (Media: typeof MediaPlugin, albumName: string) => {
  try {
    const { albums } = await Media.getAlbums();
    return albums.find(album => album.name === albumName) ?? null;
  } catch (error) {
    logWarning('⚠️ Lecture albums impossible', error);
    return null;
  }
};

/**
 * Crée ou récupère l'album REZO dans la galerie.
 * Sur Android, on évite getAlbums() qui peut être lent et bloquant.
 */
export const ensureAlbumExists = async (): Promise<string | null> => {
  if (albumIdentifier) return albumIdentifier;

  const Media = await getMediaPlugin();
  if (!Media) return null;

  if (Capacitor.getPlatform() === 'android') {
    try {
      const { path } = await Media.getAlbumsPath();
      const expectedAlbumPath = `${path}/${ALBUM_NAME}`;

      const existingAlbum = await findAlbumByName(Media, ALBUM_NAME);
      if (existingAlbum?.identifier) {
        albumIdentifier = existingAlbum.identifier;
        debugLog('📁 Album Android existant trouvé');
        return albumIdentifier;
      }

      try {
        await Media.createAlbum({ name: ALBUM_NAME });
        debugLog('✅ Album Android créé');
      } catch (error: any) {
        const message = String(error?.message || '').toLowerCase();
        if (!message.includes('already exists')) {
          logWarning('⚠️ Création album Android', error);
        }
      }

      const createdAlbum = await findAlbumByName(Media, ALBUM_NAME);
      if (createdAlbum?.identifier) {
        albumIdentifier = createdAlbum.identifier;
        debugLog('📁 Album Android validé');
        return albumIdentifier;
      }

      albumIdentifier = expectedAlbumPath;
      debugLog('📁 Album Android prêt (fallback chemin)');
      return albumIdentifier;
    } catch (error) {
      logError('❌ Erreur création album Android', error);
      return null;
    }
  }

  try {
    const { albums } = await Media.getAlbums();
    const existingAlbum = albums.find(album => album.name === ALBUM_NAME);

    if (existingAlbum) {
      albumIdentifier = existingAlbum.identifier;
      debugLog('📁 Album existant trouvé');
      return albumIdentifier;
    }

    await Media.createAlbum({ name: ALBUM_NAME });

    const { albums: updatedAlbums } = await Media.getAlbums();
    const newAlbum = updatedAlbums.find(album => album.name === ALBUM_NAME);

    if (newAlbum) {
      albumIdentifier = newAlbum.identifier;
      debugLog('✅ Album créé');
      return albumIdentifier;
    }

    return null;
  } catch (error) {
    logError('❌ Erreur création album', error);
    return null;
  }
};

/**
 * Détermine le type de média à partir du MIME type.
 */
export type MediaType = 'image' | 'video' | 'audio' | 'document';

export const getMediaType = (mimeType: string): MediaType => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
};

/**
 * Génère un nom de fichier unique avec timestamp.
 */
export const generateFileName = (originalName: string, mediaType: MediaType): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const extension = originalName.split('.').pop() || getDefaultExtension(mediaType);
  const baseName = originalName.replace(/\.[^/.]+$/, '').slice(0, 30);

  return `REZO_${mediaType}_${timestamp}_${baseName}.${extension}`;
};

/**
 * Retourne le nom sans extension pour l'API Android du plugin Media.
 */
const getBaseFileName = (fileName: string): string => {
  return fileName.replace(/\.[^/.]+$/, '');
};

/**
 * Retourne l'extension par défaut selon le type.
 */
const getDefaultExtension = (mediaType: MediaType): string => {
  switch (mediaType) {
    case 'image': return 'jpg';
    case 'video': return 'mp4';
    case 'audio': return 'mp3';
    default: return 'bin';
  }
};

/**
 * Sauvegarde un fichier temporairement pour le transfert vers la galerie.
 */
/**
 * Convertit un slice de Blob en base64 (sans préfixe data:).
 */
const blobChunkToBase64 = (chunk: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1] || result;
      resolve(base64Data);
    };
    reader.onerror = () => reject(new Error('Erreur lecture chunk base64'));
    reader.readAsDataURL(chunk);
  });
};

const saveTempFile = async (
  blob: Blob,
  fileName: string
): Promise<string> => {
  try {
    await Filesystem.deleteFile({
      path: fileName,
      directory: Directory.Cache,
    });
  } catch (e) {
    // Ignorer si le fichier n'existe pas
  }

  const sizeMb = blob.size / 1024 / 1024;
  debugLog(`💾 Écriture fichier temporaire (${sizeMb.toFixed(1)} MB)`);

  // Pour les gros fichiers (vidéos watermarkées), on écrit en streaming
  // par chunks via append pour éviter un OOM lors de la conversion base64.
  // La taille de chunk doit être un multiple de 3 octets pour que les segments
  // base64 se concatènent proprement (pas de padding intermédiaire).
  const CHUNK_SIZE = 512 * 1024 * 3; // ~1.5 MB de données binaires par chunk
  let offset = 0;
  let firstChunk = true;
  let result: { uri: string } | null = null;

  while (offset < blob.size) {
    const end = Math.min(offset + CHUNK_SIZE, blob.size);
    const chunk = blob.slice(offset, end);
    const base64 = await blobChunkToBase64(chunk);

    if (firstChunk) {
      result = await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Cache,
      });
      firstChunk = false;
    } else {
      await Filesystem.appendFile({
        path: fileName,
        data: base64,
        directory: Directory.Cache,
      });
    }

    offset = end;
    // Laisse respirer la JS thread (et le GC)
    await new Promise((r) => setTimeout(r, 0));
  }

  if (!result) {
    // Cas blob vide: créer un fichier vide
    result = await Filesystem.writeFile({
      path: fileName,
      data: '',
      directory: Directory.Cache,
    });
  }

  debugLog('✅ Fichier temporaire écrit (streaming)');

  // Sur Android, le plugin Media accepte mieux un chemin absolu issu de getUri
  // que l'URI brute renvoyée par writeFile (selon la version d'Android / Scoped
  // Storage). On résout donc l'URI canonique avant de la retourner.
  try {
    const { uri } = await Filesystem.getUri({
      path: fileName,
      directory: Directory.Cache,
    });
    return uri || result.uri;
  } catch {
    return result.uri;
  }
};

/**
 * Convertit un Blob en base64.
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      try {
        const base64 = reader.result as string;
        const base64Data = base64.split(',')[1] || base64;
        resolve(base64Data);
      } catch (e) {
        reject(new Error('Erreur conversion base64'));
      }
    };
    reader.onerror = () => reject(new Error('Erreur lecture du fichier pour conversion base64'));
    reader.readAsDataURL(blob);
  });
};

/**
 * Interface pour le résultat de sauvegarde.
 */
export interface SaveToGalleryResult {
  success: boolean;
  filePath?: string;
  error?: string;
  savedToGallery: boolean;
}

type RezoFolderName = 'Images' | 'Videos' | 'Audio' | 'Documents';

const getDeviceDirectory = (): Directory => {
  return Capacitor.getPlatform() === 'android' ? Directory.ExternalStorage : Directory.Documents;
};

const getRezoFolderPath = (folderName: RezoFolderName): string => {
  return Capacitor.getPlatform() === 'android'
    ? `Download/REZO/${folderName}`
    : `REZO/${folderName}`;
};

const writeBlobToDevicePath = async (
  blob: Blob,
  directory: Directory,
  filePath: string
): Promise<string> => {
  try {
    await Filesystem.deleteFile({
      path: filePath,
      directory,
    });
  } catch {
    // Ignorer si le fichier n'existe pas encore.
  }

  const CHUNK_SIZE = 512 * 1024 * 3;
  let offset = 0;
  let firstChunk = true;
  let result: { uri: string } | null = null;

  while (offset < blob.size) {
    const end = Math.min(offset + CHUNK_SIZE, blob.size);
    const chunk = blob.slice(offset, end);
    const base64 = await blobChunkToBase64(chunk);

    if (firstChunk) {
      result = await Filesystem.writeFile({
        path: filePath,
        data: base64,
        directory,
        recursive: true,
      });
      firstChunk = false;
    } else {
      await Filesystem.appendFile({
        path: filePath,
        data: base64,
        directory,
      });
    }

    offset = end;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  if (!result) {
    result = await Filesystem.writeFile({
      path: filePath,
      data: '',
      directory,
      recursive: true,
    });
  }

  try {
    const { uri } = await Filesystem.getUri({
      path: filePath,
      directory,
    });
    return uri || result.uri;
  } catch {
    return result.uri;
  }
};

const saveBlobToRezoFolder = async (
  blob: Blob,
  fileName: string,
  folderName: RezoFolderName
): Promise<string> => {
  const directory = getDeviceDirectory();
  const targetPath = `${getRezoFolderPath(folderName)}/${fileName}`;

  debugLog(`💾 Copie dans ${targetPath}`);
  return writeBlobToDevicePath(blob, directory, targetPath);
};

/**
 * Sauvegarde une image dans la galerie Android/iOS.
 */
export const saveImageToGallery = async (
  blob: Blob,
  fileName: string
): Promise<SaveToGalleryResult> => {
  try {
    const deviceFilePath = await saveBlobToRezoFolder(blob, fileName, 'Images');
    debugLog('✅ Image copiée dans REZO/Images');

    const Media = await getMediaPlugin();

    if (!Media) {
      debugLog('📱 Plugin galerie indisponible - image conservée dans REZO uniquement');
      return {
        success: true,
        filePath: deviceFilePath,
        savedToGallery: false,
      };
    }

    const albumId = await ensureAlbumExists();

    if (!albumId) {
      return {
        success: true,
        filePath: deviceFilePath,
        savedToGallery: false,
      };
    }

    const tempPath = await saveTempFile(blob, fileName);
    debugLog('📁 Fichier temporaire image créé');

    const result = await Media.savePhoto({
      path: tempPath,
      albumIdentifier: albumId,
    });

    debugLog('✅ Image sauvegardée dans la galerie');

    try {
      await Filesystem.deleteFile({
        path: fileName,
        directory: Directory.Cache,
      });
    } catch (e) {
      // Ignorer les erreurs de nettoyage
    }

    return {
      success: true,
      filePath: deviceFilePath,
      savedToGallery: true,
    };
  } catch (error: any) {
    logError('❌ Erreur sauvegarde galerie image', error);
    // Nettoyage best-effort du temp en cas d'échec pour éviter d'occuper le cache
    try {
      await Filesystem.deleteFile({ path: fileName, directory: Directory.Cache });
    } catch (_) { /* noop */ }
    return {
      success: false,
      error: error.message || 'Erreur inconnue',
      savedToGallery: false,
    };
  }
};

/**
 * Sauvegarde une vidéo dans la galerie Android/iOS.
 * On passe par un vrai fichier temporaire pour éviter les échecs intermittents
 * observés sur Android avec les data URI volumineuses.
 */
export const saveVideoToGallery = async (
  blob: Blob,
  fileName: string
): Promise<SaveToGalleryResult> => {
  try {
    const platform = Capacitor.getPlatform();
    const deviceFilePath = await saveBlobToRezoFolder(blob, fileName, 'Videos');
    debugLog('✅ Vidéo copiée dans REZO/Videos');

    const Media = await getMediaPlugin();

    if (!Media) {
      debugLog('📱 Plugin galerie indisponible - vidéo conservée dans REZO uniquement');
      return {
        success: true,
        filePath: deviceFilePath,
        savedToGallery: false,
      };
    }

    const albumId = await ensureAlbumExists();

    if (!albumId) {
      return {
        success: true,
        filePath: deviceFilePath,
        savedToGallery: false,
      };
    }

    const tempPath = await saveTempFile(blob, fileName);
    debugLog('📁 Fichier vidéo temporaire créé');

    const result = await Media.saveVideo({
      path: tempPath,
      albumIdentifier: albumId,
      ...(platform === 'android' ? { fileName: getBaseFileName(fileName) } : {}),
    });

    debugLog(`✅ Vidéo sauvegardée dans la galerie ${platform}`);

    try {
      await Filesystem.deleteFile({
        path: fileName,
        directory: Directory.Cache,
      });
    } catch (e) {
      // Ignorer les erreurs de nettoyage
    }

    return {
      success: true,
      filePath: deviceFilePath,
      savedToGallery: true,
    };
  } catch (error: any) {
    logError('❌ Erreur sauvegarde galerie vidéo', error);
    // Nettoyer le fichier temporaire pour ne pas saturer le cache après un échec
    try {
      await Filesystem.deleteFile({ path: fileName, directory: Directory.Cache });
    } catch (_) { /* noop */ }
    return {
      success: false,
      error: error.message || 'Erreur inconnue',
      savedToGallery: false,
    };
  }
};

/**
 * Sauvegarde un audio dans le système de fichiers.
 * Les audios vont dans le dossier REZO dédié.
 */
export const saveAudioToDevice = async (
  blob: Blob,
  fileName: string
): Promise<SaveToGalleryResult> => {
  if (!isNativePlatform()) {
    return { success: true, savedToGallery: false };
  }

  try {
    const resultUri = await saveBlobToRezoFolder(blob, fileName, 'Audio');

    debugLog('✅ Audio sauvegardé');

    return {
      success: true,
      filePath: resultUri,
      savedToGallery: false,
    };
  } catch (error: any) {
    logError('❌ Erreur sauvegarde audio', error);
    return {
      success: false,
      error: error.message,
      savedToGallery: false,
    };
  }
};

/**
 * Sauvegarde un document dans le système de fichiers.
 */
export const saveDocumentToDevice = async (
  blob: Blob,
  fileName: string
): Promise<SaveToGalleryResult> => {
  if (!isNativePlatform()) {
    return { success: true, savedToGallery: false };
  }

  try {
    const resultUri = await saveBlobToRezoFolder(blob, fileName, 'Documents');

    debugLog('✅ Document sauvegardé');

    return {
      success: true,
      filePath: resultUri,
      savedToGallery: false,
    };
  } catch (error: any) {
    logError('❌ Erreur sauvegarde document', error);
    return {
      success: false,
      error: error.message,
      savedToGallery: false,
    };
  }
};

/**
 * Sauvegarde un média dans la galerie/système de fichiers selon son type.
 */
export const saveMediaToDevice = async (
  blob: Blob,
  fileName: string,
  mimeType: string
): Promise<SaveToGalleryResult> => {
  const mediaType = getMediaType(mimeType);

  if (
    isNativePlatform() &&
    Capacitor.getPlatform() === 'android'
  ) {
    const hasStoragePermission = await requestStoragePermissions();
    if (!hasStoragePermission) {
      return {
        success: false,
        error: 'Autorisation de stockage refusée',
        savedToGallery: false,
      };
    }
  }

  const finalFileName = generateFileName(fileName, mediaType);

  debugLog(`📥 Sauvegarde ${mediaType}`);

  switch (mediaType) {
    case 'image':
      return saveImageToGallery(blob, finalFileName);
    case 'video':
      return saveVideoToGallery(blob, finalFileName);
    case 'audio':
      return saveAudioToDevice(blob, finalFileName);
    default:
      return saveDocumentToDevice(blob, finalFileName);
  }
};
