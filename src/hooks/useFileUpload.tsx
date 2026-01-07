/**
 * Hook pour l'upload de fichiers vers Supabase Storage
 * Avec sauvegarde automatique dans le cache local (FileStore) pour l'expéditeur
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { fileStore } from '@/file-manager/stores/FileStore';

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

      // ✅ Sauvegarder immédiatement dans le cache local (FileStore)
      // L'expéditeur verra directement l'aperçu sans bouton "Télécharger"
      try {
        const blob = new Blob([await file.arrayBuffer()], { type: file.type });
        await fileStore.saveFile(publicUrl, blob, {
          remoteUrl: publicUrl,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          ownerId: user.id,
          isOwnFile: true,
        });
        console.log('💾 Fichier sauvegardé dans le cache local (expéditeur)');
      } catch (cacheError) {
        // Ne pas bloquer l'upload si le cache échoue
        console.warn('⚠️ Impossible de sauvegarder dans le cache local:', cacheError);
      }
      
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
