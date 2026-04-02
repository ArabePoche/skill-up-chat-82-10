/**
 * Service pour sauvegarder les médias dans la galerie Android/iOS.
 * Utilise @capacitor-community/media (v8+) pour l'intégration native.
 *
 * Comportement type WhatsApp:
 * - Les médias téléchargés apparaissent dans la galerie (images/vidéos)
 * - Dossier EducaTok dans Downloads pour les audios/documents
 * - Album dédié "EducaTok" pour regrouper les médias
 * - Fallback web pour les environnements non-natifs
 */

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Media as MediaPlugin } from '@capacitor-community/media';

// Nom de l'album dans la galerie
const ALBUM_NAME = 'EducaTok';

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
    console.warn('⚠️ Erreur demande permissions:', error);
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

/**
 * Crée ou récupère l'album EducTok dans la galerie.
 * Sur Android, on évite getAlbums() qui peut être lent et bloquant.
 */
export const ensureAlbumExists = async (): Promise<string | null> => {
  if (albumIdentifier) return albumIdentifier;

  const Media = await getMediaPlugin();
  if (!Media) return null;

  if (Capacitor.getPlatform() === 'android') {
    try {
      const { path } = await Media.getAlbumsPath();
      albumIdentifier = `${path}/${ALBUM_NAME}`;

      try {
        await Media.createAlbum({ name: ALBUM_NAME });
        console.log('✅ Album Android créé:', ALBUM_NAME);
      } catch (error: any) {
        const message = String(error?.message || '').toLowerCase();
        if (!message.includes('already exists')) {
          console.warn('⚠️ Création album Android:', error);
        }
      }

      console.log('📁 Album Android prêt:', albumIdentifier);
      return albumIdentifier;
    } catch (error) {
      console.error('❌ Erreur création album Android:', error);
      return null;
    }
  }

  try {
    const { albums } = await Media.getAlbums();
    const existingAlbum = albums.find(album => album.name === ALBUM_NAME);

    if (existingAlbum) {
      albumIdentifier = existingAlbum.identifier;
      console.log('📁 Album existant trouvé:', ALBUM_NAME);
      return albumIdentifier;
    }

    await Media.createAlbum({ name: ALBUM_NAME });

    const { albums: updatedAlbums } = await Media.getAlbums();
    const newAlbum = updatedAlbums.find(album => album.name === ALBUM_NAME);

    if (newAlbum) {
      albumIdentifier = newAlbum.identifier;
      console.log('✅ Album créé:', ALBUM_NAME);
      return albumIdentifier;
    }

    return null;
  } catch (error) {
    console.error('❌ Erreur création album:', error);
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

  return `EducaTok_${mediaType}_${timestamp}_${baseName}.${extension}`;
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

  console.log(`💾 Écriture fichier ${fileName} (${(blob.size / 1024 / 1024).toFixed(1)} MB)...`);

  const base64 = await blobToBase64(blob);
  await new Promise(resolve => setTimeout(resolve, 10));

  const result = await Filesystem.writeFile({
    path: fileName,
    data: base64,
    directory: Directory.Cache,
  });

  console.log(`✅ Fichier temporaire écrit: ${result.uri}`);
  return result.uri;
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

/**
 * Sauvegarde une image dans la galerie Android/iOS.
 */
export const saveImageToGallery = async (
  blob: Blob,
  fileName: string
): Promise<SaveToGalleryResult> => {
  const Media = await getMediaPlugin();

  if (!Media) {
    console.log('📱 Plateforme web - pas de sauvegarde galerie');
    return { success: true, savedToGallery: false };
  }

  try {
    const platform = Capacitor.getPlatform();
    
    // Sauvegarde également dans File Manager (Download/EducaTok/Images)
    if (platform === 'android') {
      try {
        const base64 = await blobToBase64(blob);
        await Filesystem.writeFile({
          path: `Download/EducaTok/Images/${fileName}`,
          data: base64,
          directory: Directory.ExternalStorage,
          recursive: true,
        });
        console.log('✅ Image copiée dans Download/EducaTok/Images');
      } catch (fsError) {
        console.warn('⚠️ Erreur copie dans Download/EducaTok/Images', fsError);
      }
    }

    const albumId = await ensureAlbumExists();

    if (!albumId) {
      return {
        success: false,
        error: 'Album de destination inaccessible',
        savedToGallery: false,
      };
    }

    const tempPath = await saveTempFile(blob, fileName);
    console.log('📁 Fichier temporaire créé:', tempPath);

    const result = await Media.savePhoto({
      path: tempPath,
      albumIdentifier: albumId,
    });

    console.log('✅ Image sauvegardée dans la galerie:', result.filePath);

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
      filePath: result.filePath,
      savedToGallery: true,
    };
  } catch (error: any) {
    console.error('❌ Erreur sauvegarde galerie image:', error);
    return {
      success: false,
      error: error.message || 'Erreur inconnue',
      savedToGallery: false,
    };
  }
};

/**
 * Sauvegarde une vidéo dans la galerie Android/iOS.
 * Sur Android, on passe directement une data URI au plugin pour éviter
 * une écriture cache supplémentaire qui rallonge fortement la fin à 97 %.
 */
export const saveVideoToGallery = async (
  blob: Blob,
  fileName: string,
  mimeType?: string
): Promise<SaveToGalleryResult> => {
  const Media = await getMediaPlugin();

  if (!Media) {
    console.log('📱 Plateforme web - pas de sauvegarde galerie');
    return { success: true, savedToGallery: false };
  }

  try {
    const platform = Capacitor.getPlatform();
    const albumId = await ensureAlbumExists();

    // Copie de sauvegarde dans File Manager (Download/EducaTok/Videos)
    if (platform === 'android') {
      try {
        const base64 = await blobToBase64(blob);
        await Filesystem.writeFile({
          path: `Download/EducaTok/Videos/${fileName}`,
          data: base64,
          directory: Directory.ExternalStorage,
          recursive: true,
        });
        console.log('✅ Vidéo copiée dans Download/EducaTok/Videos');
      } catch (fsError) {
        console.warn('⚠️ Erreur copie dans Download/EducaTok/Videos', fsError);
      }
    }

    if (!albumId) {
      return {
        success: false,
        error: 'Album de destination inaccessible',
        savedToGallery: false,
      };
    }

    if (platform === 'android') {
      const base64 = await blobToBase64(blob);
      const result = await Media.saveVideo({
        path: `data:${mimeType || blob.type || 'video/mp4'};base64,${base64}`,
        albumIdentifier: albumId,
        fileName: getBaseFileName(fileName),
      });

      console.log('✅ Vidéo sauvegardée dans la galerie Android:', result.filePath);

      return {
        success: true,
        filePath: result.filePath,
        savedToGallery: true,
      };
    }

    const tempPath = await saveTempFile(blob, fileName);
    console.log('📁 Fichier vidéo temporaire créé:', tempPath);

    const result = await Media.saveVideo({
      path: tempPath,
      albumIdentifier: albumId,
    });

    console.log('✅ Vidéo sauvegardée dans la galerie:', result.filePath);

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
      filePath: result.filePath,
      savedToGallery: true,
    };
  } catch (error: any) {
    console.error('❌ Erreur sauvegarde galerie vidéo:', error);
    return {
      success: false,
      error: error.message || 'Erreur inconnue',
      savedToGallery: false,
    };
  }
};

/**
 * Sauvegarde un audio dans le système de fichiers.
 * Les audios vont dans le dossier EducaTok dédié.
 */
export const saveAudioToDevice = async (
  blob: Blob,
  fileName: string
): Promise<SaveToGalleryResult> => {
  if (!isNativePlatform()) {
    return { success: true, savedToGallery: false };
  }

  try {
    const base64 = await blobToBase64(blob);
    const platform = Capacitor.getPlatform();
    const directory = platform === 'android' ? Directory.ExternalStorage : Directory.Documents;
    const basePath = platform === 'android' ? 'Download/EducaTok/Audio' : 'EducaTok/Audio';

    const result = await Filesystem.writeFile({
      path: `${basePath}/${fileName}`,
      data: base64,
      directory,
      recursive: true,
    });

    console.log('✅ Audio sauvegardé:', result.uri);

    return {
      success: true,
      filePath: result.uri,
      savedToGallery: false,
    };
  } catch (error: any) {
    console.error('❌ Erreur sauvegarde audio:', error);
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
    const base64 = await blobToBase64(blob);
    const platform = Capacitor.getPlatform();
    const directory = platform === 'android' ? Directory.ExternalStorage : Directory.Documents;
    const basePath = platform === 'android' ? 'Download/EducaTok/Documents' : 'EducaTok/Documents';

    const result = await Filesystem.writeFile({
      path: `${basePath}/${fileName}`,
      data: base64,
      directory,
      recursive: true,
    });

    console.log('✅ Document sauvegardé:', result.uri);

    return {
      success: true,
      filePath: result.uri,
      savedToGallery: false,
    };
  } catch (error: any) {
    console.error('❌ Erreur sauvegarde document:', error);
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
    Capacitor.getPlatform() === 'android' &&
    (mediaType === 'audio' || mediaType === 'document')
  ) {
    await requestStoragePermissions();
  }

  const finalFileName = generateFileName(fileName, mediaType);

  console.log(`📥 Sauvegarde ${mediaType}: ${finalFileName}`);

  switch (mediaType) {
    case 'image':
      return saveImageToGallery(blob, finalFileName);
    case 'video':
      return saveVideoToGallery(blob, finalFileName, mimeType);
    case 'audio':
      return saveAudioToDevice(blob, finalFileName);
    default:
      return saveDocumentToDevice(blob, finalFileName);
  }
};
