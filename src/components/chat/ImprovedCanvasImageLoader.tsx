
import React, { useState, useCallback, useEffect } from 'react';
import { RefreshCw, AlertTriangle, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ImprovedCanvasImageLoaderProps {
  imageUrl: string;
  fileName: string;
  onImageLoad: (img: HTMLImageElement) => void;
  onError?: (error: string) => void;
}

const ImprovedCanvasImageLoader: React.FC<ImprovedCanvasImageLoaderProps> = ({
  imageUrl,
  fileName,
  onImageLoad,
  onError
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const loadImage = useCallback(() => {
    console.log('Attempting to load image:', imageUrl);
    setLoading(true);
    setError(null);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      console.log('Image loaded successfully:', img.width, 'x', img.height);
      setLoading(false);
      onImageLoad(img);
    };
    
    img.onerror = (event) => {
      console.error('Image loading failed:', event);
      const errorMsg = 'Impossible de charger l\'image. Vérifiez le format ou la connexion.';
      setError(errorMsg);
      setLoading(false);
      onError?.(errorMsg);
    };

    // Gérer les différents formats d'URL avec validation
    let processedUrl = imageUrl;
    
    try {
      // Si c'est un blob ou data URL, utiliser tel quel
      if (imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')) {
        processedUrl = imageUrl;
      }
      // Si c'est une URL relative, la convertir en URL complète
      else if (imageUrl.startsWith('/')) {
        processedUrl = `${window.location.origin}${imageUrl}`;
      }
      // Si c'est déjà une URL complète, utiliser tel quel
      else if (imageUrl.startsWith('http')) {
        processedUrl = imageUrl;
      }
      // Sinon, essayer de créer une URL valide
      else {
        processedUrl = imageUrl;
      }

      console.log('Loading image with URL:', processedUrl);
      img.src = processedUrl;
      
      // Timeout pour éviter les blocages
      setTimeout(() => {
        if (loading) {
          setError('Timeout: L\'image met trop de temps à charger');
          setLoading(false);
        }
      }, 10000);
      
    } catch (urlError) {
      console.error('URL processing error:', urlError);
      setError('URL d\'image invalide');
      setLoading(false);
    }
  }, [imageUrl, onImageLoad, onError]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    loadImage();
  };

  // Charger l'image au montage et quand l'URL change
  useEffect(() => {
    if (imageUrl) {
      loadImage();
    }
  }, [imageUrl, loadImage]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="relative">
            <ImageIcon className="mx-auto mb-4 text-gray-400" size={48} />
            <RefreshCw className="absolute top-0 right-0 animate-spin text-blue-500" size={20} />
          </div>
          <p className="text-sm text-gray-600 mb-2">Chargement de l'image...</p>
          <p className="text-xs text-gray-500 truncate max-w-xs">{fileName}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="m-4 max-w-md mx-auto">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="space-y-3">
          <div>
            <p className="font-medium">Erreur de chargement</p>
            <p className="text-sm text-gray-600">{error}</p>
            {retryCount > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Tentatives: {retryCount}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RefreshCw size={14} className="mr-1" />
              Réessayer
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};

export default ImprovedCanvasImageLoader;
