/**
 * Hook pour l'upload de fichiers (cover + galerie) vers le bucket school_site_files.
 * Retourne l'URL publique après upload.
 */
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const BUCKET = 'school_site_files';

export const useSchoolSiteUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuth();

  const uploadFile = async (file: File, subfolder: string = 'gallery'): Promise<string | null> => {
    if (!user?.id) {
      toast.error('Vous devez être connecté pour uploader des fichiers');
      return null;
    }

    // Vérifier le type (images uniquement)
    if (!file.type.startsWith('image/')) {
      toast.error('Seules les images sont acceptées');
      return null;
    }

    // Limiter la taille à 5 Mo
    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 5 Mo');
      return null;
    }

    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/${subfolder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

      if (error) {
        console.error('❌ Upload error:', error);
        toast.error(`Erreur upload: ${error.message}`);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(path);

      return publicUrl;
    } catch (err) {
      console.error('❌ Upload error:', err);
      toast.error('Erreur lors de l\'upload');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const uploadCover = (file: File) => uploadFile(file, 'cover');
  const uploadGalleryImage = (file: File) => uploadFile(file, 'gallery');
  const uploadLogo = (file: File) => uploadFile(file, 'logo');

  return { uploadCover, uploadGalleryImage, uploadLogo, isUploading };
};
