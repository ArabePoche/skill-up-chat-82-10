/**
 * Composant d'upload d'image pour les produits de boutique
 * Upload vers le bucket Supabase 'product-images'
 */
import React, { useRef, useState } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { compressImage } from '@/utils/imageCompression';
import { toast } from 'sonner';

interface ProductImageUploaderProps {
  imageUrl: string;
  onImageChange: (url: string) => void;
}

const ProductImageUploader: React.FC<ProductImageUploaderProps> = ({ imageUrl, onImageChange }) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    // Vérifier le type
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    setIsUploading(true);
    try {
      // Compresser l'image
      const compressed = await compressImage(file, {
        maxSizeMB: 2,
        maxWidthOrHeight: 1200,
        quality: 0.8,
      });

      // Upload vers Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, compressed, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      onImageChange(publicUrl);
      toast.success('Image uploadée !');
    } catch (err: any) {
      console.error('Erreur upload image produit:', err);
      toast.error(err.message || "Erreur lors de l'upload");
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    onImageChange('');
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {imageUrl ? (
        <div className="relative w-full h-40 rounded-lg overflow-hidden border border-border">
          <img
            src={imageUrl}
            alt="Aperçu produit"
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full h-40 border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
        >
          {isUploading ? (
            <>
              <Loader2 size={24} className="animate-spin" />
              <span className="text-sm">Upload en cours...</span>
            </>
          ) : (
            <>
              <Camera size={24} />
              <span className="text-sm">Ajouter une photo</span>
            </>
          )}
        </button>
      )}

      {imageUrl && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="text-xs text-primary hover:underline"
        >
          {isUploading ? 'Upload en cours...' : 'Changer la photo'}
        </button>
      )}
    </div>
  );
};

export default ProductImageUploader;
