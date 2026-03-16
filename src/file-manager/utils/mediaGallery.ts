/**
 * Service pour sauvegarder les médias dans la galerie Android/iOS
 * Utilise @capacitor-community/media (v8+) pour l'intégration native
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
 * Vérifie si on est sur une plateforme native (Android/iOS)
 */
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Demande les permissions de stockage sur Android
 * Nécessaire pour écrire dans ExternalStorage (dossier Downloads)
 */
export const requestStoragePermissions = async (): Promise<boolean> => {
  if (!isNativePlatform() || permissionsRequested) {
    return true;
  }

  try {
    const platform = Capacitor.getPlatform();
    
    if (platform === 'android') {
      // Sur Android 10+, on n'a pas besoin de permission pour le dossier Downloads
      // Mais on doit quand même vérifier les permissions du Filesystem
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
      try {
        const base64 = reader.result as string;
        // Retirer le préfixe data:xxx;base64,
        const base64Data = base64.split(',')[1] || base64;
        resolve(base64Data);
      } catch (e) {
        reject(new Error('Erreur conversion base64'));
      }
    };
    reader.onerror = () => reject(new Error('Erreur lecture du fichier pour conversion base64'));
    // Utiliser readAsDataURL - fonctionne pour les gros fichiers sur Capacitor
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
 * Note: Les audios ne vont pas dans la galerie photos mais dans le dossier EducaTok
 * Utilise ExternalStorage sur Android pour être visible dans le gestionnaire de fichiers
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
    
    // Sur Android: utiliser ExternalStorage pour que les fichiers soient visibles
    // Sur iOS: utiliser Documents (pas d'accès externe sur iOS)
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
 * Utilise ExternalStorage sur Android pour être visible dans le gestionnaire de fichiers
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
    
    // Sur Android: utiliser ExternalStorage pour que les fichiers soient visibles
    // Sur iOS: utiliser Documents (pas d'accès externe sur iOS)
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
 * Sauvegarde un média dans la galerie/système de fichiers selon son type
 * Point d'entrée principal pour la sauvegarde de médias
 * 
 * Comportement:
 * - Images/Vidéos → Galerie Photos (album EducaTok)
 * - Audios → Dossier Download/EducaTok/Audio (visible dans gestionnaire fichiers)
 * - Documents → Dossier Download/EducaTok/Documents (visible dans gestionnaire fichiers)
 */
export const saveMediaToDevice = async (
  blob: Blob,
  fileName: string,
  mimeType: string
): Promise<SaveToGalleryResult> => {
  // Demander les permissions de stockage si nécessaire (Android)
  await requestStoragePermissions();
  
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
