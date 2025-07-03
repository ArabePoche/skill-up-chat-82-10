
import React, { useState, useCallback } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CanvasImageLoaderProps {
  imageUrl: string;
  fileName: string;
  onImageLoad: (img: HTMLImageElement) => void;
  onError?: (error: string) => void;
}

const CanvasImageLoader: React.FC<CanvasImageLoaderProps> = ({
  imageUrl,
  fileName,
  onImageLoad,
  onError
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadImage = useCallback(() => {
    setLoading(true);
    setError(null);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      setLoading(false);
      onImageLoad(img);
    };
    
    img.onerror = () => {
      const errorMsg = 'Impossible de charger l\'image';
      setError(errorMsg);
      setLoading(false);
      onError?.(errorMsg);
    };

    // Gérer les différents formats d'URL
    let processedUrl = imageUrl;
    
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

    img.src = processedUrl;
  }, [imageUrl, onImageLoad, onError]);

  // Charger l'image au montage
  React.useEffect(() => {
    loadImage();
  }, [loadImage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-2" size={32} />
          <p className="text-sm text-gray-600">Chargement de l'image...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={loadImage} className="ml-2">
            <RefreshCw size={14} className="mr-1" />
            Réessayer
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};

export default CanvasImageLoader;
