import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProductImageUploadProps {
  images: File[];
  onImagesChange: (images: File[]) => void;
  maxImages?: number;
}

/**
 * Composant pour uploader jusqu'à 5 images pour un produit
 */
const ProductImageUpload: React.FC<ProductImageUploadProps> = ({
  images,
  onImagesChange,
  maxImages = 5,
}) => {
  const [previews, setPreviews] = useState<string[]>([]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (images.length + files.length > maxImages) {
      toast.error(`Vous ne pouvez ajouter que ${maxImages} images maximum`);
      return;
    }

    // Vérifier que ce sont des images
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length !== files.length) {
      toast.error('Seules les images sont acceptées');
      return;
    }

    // Créer les previews
    const newPreviews: string[] = [];
    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        if (newPreviews.length === imageFiles.length) {
          setPreviews([...previews, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });

    onImagesChange([...images, ...imageFiles]);
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    onImagesChange(newImages);
    setPreviews(newPreviews);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium">
          Images du produit ({images.length}/{maxImages})
        </label>
        {images.length < maxImages && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => document.getElementById('product-image-input')?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            Ajouter des images
          </Button>
        )}
      </div>

      <input
        id="product-image-input"
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Grille de previews */}
      <div className="grid grid-cols-3 gap-4">
        {previews.map((preview, index) => (
          <div key={index} className="relative group">
            <img
              src={preview}
              alt={`Preview ${index + 1}`}
              className="w-full h-32 object-cover rounded-lg border"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => removeImage(index)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
        
        {/* Zone d'ajout si aucune image */}
        {images.length === 0 && (
          <div
            className="col-span-3 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => document.getElementById('product-image-input')?.click()}
          >
            <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm text-muted-foreground">
              Cliquez pour ajouter des images
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Jusqu'à {maxImages} images
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductImageUpload;
