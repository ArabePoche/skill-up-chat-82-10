/**
 * Utilitaire de compression d'image côté client
 * Compresse les images tout en préservant la qualité visuelle
 */

interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
}

/**
 * Compresse une image en réduisant sa taille
 * @param file - Fichier image à compresser
 * @param options - Options de compression
 * @returns Promise<File> - Image compressée
 */
export const compressImage = async (
  file: File,
  options: CompressionOptions = {}
): Promise<File> => {
  const {
    maxSizeMB = 4.5, // Légèrement en dessous de 5MB pour avoir une marge
    maxWidthOrHeight = 1920,
    quality = 0.85
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Redimensionner si nécessaire
        if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
          if (width > height) {
            height = (height / width) * maxWidthOrHeight;
            width = maxWidthOrHeight;
          } else {
            width = (width / height) * maxWidthOrHeight;
            height = maxWidthOrHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Impossible de créer le contexte canvas'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Compression progressive jusqu'à atteindre la taille cible
        let currentQuality = quality;
        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Erreur lors de la compression'));
                return;
              }

              const sizeInMB = blob.size / (1024 * 1024);

              // Si la taille est acceptable ou si on ne peut plus compresser
              if (sizeInMB <= maxSizeMB || currentQuality <= 0.5) {
                const compressedFile = new File([blob], file.name, {
                  type: file.type,
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                // Réduire la qualité et réessayer
                currentQuality -= 0.05;
                tryCompress();
              }
            },
            file.type,
            currentQuality
          );
        };

        tryCompress();
      };

      img.onerror = () => reject(new Error('Erreur lors du chargement de l\'image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'));
    reader.readAsDataURL(file);
  });
};

/**
 * Formate la taille d'un fichier pour l'affichage
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};
