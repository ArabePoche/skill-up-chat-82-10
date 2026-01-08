/**
 * Service pour sauvegarder les médias dans la galerie Android/iOS
 * Utilise le plugin Capacitor "Media" (si présent côté natif)
 *
 * Comportement type WhatsApp:
 * - Les médias téléchargés apparaissent dans la galerie
 * - Album dédié "EducTok" pour regrouper les médias
 * - Fallback web pour les environnements non-natifs
 */

import { Capacitor, registerPlugin } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

// Types pour le plugin Media (bridge Capacitor : pas d'import NPM requis pour le build web)
interface MediaPlugin {
  savePhoto: (options: { path: string; albumIdentifier?: string }) => Promise<{ filePath: string }>;
  saveVideo: (options: { path: string; albumIdentifier?: string }) => Promise<{ filePath: string }>;
  createAlbum: (options: { name: string }) => Promise<void>;
  getAlbums: () => Promise<{ albums: Array<{ identifier: string; name: string }> }>;
}

// Instance du plugin (résolue à l'exécution sur Android/iOS)
const MediaBridge = registerPlugin<MediaPlugin>('Media');

// Nom de l'album dans la galerie
const ALBUM_NAME = 'EducaTok';

// Cache pour l'identifiant de l'album
let albumIdentifier: string | null = null;

/**
 * Vérifie si on est sur une plateforme native (Android/iOS)
 */
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Accès au plugin Media si disponible côté natif.
 * (Aucun import de "@capacitor-community/media" → évite l'erreur Netlify/Vite.)
 */
const getMediaPlugin = async (): Promise<MediaPlugin | null> => {
  if (!isNativePlatform()) return null;

  if (!Capacitor.isPluginAvailable('Media')) {
    console.warn('⚠️ Plugin Media non disponible (Media)');
    return null;
  }

  return MediaBridge;
};

/**
 * Crée ou récupère l'album EducTok dans la galerie
 */
export const ensureAlbumExists = async (): Promise<string | null> => {
  if (albumIdentifier) return albumIdentifier;
  
  const Media = await getMediaPlugin();
  if (!Media) return null;

  try {
    // Vérifier si l'album existe déjà
    const { albums } = await Media.getAlbums();
    const existingAlbum = albums.find(album => album.name === ALBUM_NAME);
    
    if (existingAlbum) {
      albumIdentifier = existingAlbum.identifier;
      console.log('📁 Album existant trouvé:', ALBUM_NAME);
      return albumIdentifier;
    }

    // Créer l'album s'il n'existe pas
    await Media.createAlbum({ name: ALBUM_NAME });
    
    // Récupérer l'identifiant du nouvel album
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
 * Détermine le type de média à partir du MIME type
 */
export type MediaType = 'image' | 'video' | 'audio' | 'document';

export const getMediaType = (mimeType: string): MediaType => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
};

/**
 * Génère un nom de fichier unique avec timestamp
 */
export const generateFileName = (originalName: string, mediaType: MediaType): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const extension = originalName.split('.').pop() || getDefaultExtension(mediaType);
  const baseName = originalName.replace(/\.[^/.]+$/, '').slice(0, 30);
  
  return `EducaTok_${mediaType}_${timestamp}_${baseName}.${extension}`;
};

/**
 * Retourne l'extension par défaut selon le type
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
 * Sauvegarde un fichier temporairement pour le transfert vers la galerie
 */
const saveTempFile = async (
  blob: Blob,
  fileName: string
): Promise<string> => {
  // Convertir le blob en base64
  const base64 = await blobToBase64(blob);
  
  // Sauvegarder dans le cache Capacitor
  const result = await Filesystem.writeFile({
    path: fileName,
    data: base64,
    directory: Directory.Cache,
  });

  return result.uri;
};

/**
 * Convertit un Blob en base64
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Retirer le préfixe data:xxx;base64,
      const base64Data = base64.split(',')[1] || base64;
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Interface pour le résultat de sauvegarde
 */
export interface SaveToGalleryResult {
  success: boolean;
  filePath?: string;
  error?: string;
  savedToGallery: boolean;
}

/**
 * Sauvegarde une image dans la galerie Android/iOS
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
    // S'assurer que l'album existe
    const albumId = await ensureAlbumExists();
    
    // Sauvegarder temporairement le fichier
    const tempPath = await saveTempFile(blob, fileName);
    console.log('📁 Fichier temporaire créé:', tempPath);

    // Sauvegarder dans la galerie
    const result = await Media.savePhoto({
      path: tempPath,
      albumIdentifier: albumId || undefined,
    });

    console.log('✅ Image sauvegardée dans la galerie:', result.filePath);
    
    // Nettoyer le fichier temporaire
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
 * Sauvegarde une vidéo dans la galerie Android/iOS
 */
export const saveVideoToGallery = async (
  blob: Blob,
  fileName: string
): Promise<SaveToGalleryResult> => {
  const Media = await getMediaPlugin();
  
  if (!Media) {
    console.log('📱 Plateforme web - pas de sauvegarde galerie');
    return { success: true, savedToGallery: false };
  }

  try {
    const albumId = await ensureAlbumExists();
    const tempPath = await saveTempFile(blob, fileName);
    
    console.log('📁 Fichier vidéo temporaire créé:', tempPath);

    const result = await Media.saveVideo({
      path: tempPath,
      albumIdentifier: albumId || undefined,
    });

    console.log('✅ Vidéo sauvegardée dans la galerie:', result.filePath);
    
    // Nettoyer
    try {
      await Filesystem.deleteFile({
        path: fileName,
        directory: Directory.Cache,
      });
    } catch (e) {}

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
 * Sauvegarde un audio dans le système de fichiers
 * Note: Les audios ne vont pas dans la galerie photos mais dans le dossier de l'app
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
    
    // Sauvegarder dans le dossier Documents de l'app
    const result = await Filesystem.writeFile({
      path: `EducaTok/Audio/${fileName}`,
      data: base64,
      directory: Directory.Documents,
      recursive: true,
    });

    console.log('✅ Audio sauvegardé:', result.uri);
    
    return {
      success: true,
      filePath: result.uri,
      savedToGallery: false, // Les audios ne vont pas dans la galerie photos
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
 * Sauvegarde un document dans le système de fichiers
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
    
    const result = await Filesystem.writeFile({
      path: `EducaTok/Documents/${fileName}`,
      data: base64,
      directory: Directory.Documents,
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
 * Sauvegarde un média dans la galerie/système de fichiers selon son type
 * Point d'entrée principal pour la sauvegarde de médias
 */
export const saveMediaToDevice = async (
  blob: Blob,
  fileName: string,
  mimeType: string
): Promise<SaveToGalleryResult> => {
  const mediaType = getMediaType(mimeType);
  const finalFileName = generateFileName(fileName, mediaType);
  
  console.log(`📥 Sauvegarde ${mediaType}: ${finalFileName}`);

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
