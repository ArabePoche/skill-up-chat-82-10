
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

export const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuth();

  const uploadFile = async (file: File, bucketName: string = 'lesson_discussion_files') => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    setIsUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      console.log('📤 Upload fichier:', {
        name: file.name,
        size: file.size,
        bucket: bucketName,
        path: fileName
      });
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Erreur upload:', uploadError);
        toast.error(`Erreur upload: ${uploadError.message}`);
        throw uploadError;
      }

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      console.log('✅ Fichier uploadé:', {
        originalName: file.name,
        storagePath: fileName,
        publicUrl: publicUrl,
        bucket: bucketName
      });
      
      return {
        fileUrl: publicUrl,
        fileName: file.name,
        fileType: file.type,
        filePath: fileName
      };
    } catch (error) {
      console.error('❌ Erreur dans uploadFile:', error);
      toast.error('Erreur lors de l\'upload');
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  // Méthode spécifique pour les fichiers d'exercices (admin uniquement)
  const uploadExerciseFile = async (file: File) => {
    console.log('📚 Upload fichier exercice vers lessons_exercises_files');
    try {
      const result = await uploadFile(file, 'lessons_exercises_files');
      console.log('✅ Fichier exercice uploadé:', result);
      return result;
    } catch (error) {
      console.error('❌ Erreur upload fichier exercice:', error);
      throw error;
    }
  };

  return {
    uploadFile,
    uploadExerciseFile,
    isUploading
  };
};
