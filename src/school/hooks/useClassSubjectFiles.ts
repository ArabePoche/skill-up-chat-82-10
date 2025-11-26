// Hook pour gérer les fichiers de supports attachés aux matières d'une classe
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ClassSubjectFile {
  id: string;
  class_subject_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UploadClassSubjectFileData {
  class_subject_id: string;
  file: File;
}

// Récupérer les fichiers d'une matière dans une classe spécifique
export const useClassSubjectFiles = (classSubjectId?: string) => {
  return useQuery({
    queryKey: ['class-subject-files', classSubjectId],
    queryFn: async () => {
      if (!classSubjectId) return [];

      const { data, error } = await supabase
        .from('class_subject_files')
        .select('*')
        .eq('class_subject_id', classSubjectId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching class subject files:', error);
        throw error;
      }
      
      return data as ClassSubjectFile[];
    },
    enabled: !!classSubjectId,
  });
};

// Uploader un fichier pour une matière d'une classe
export const useUploadClassSubjectFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ class_subject_id, file }: UploadClassSubjectFileData) => {
      // 1. Uploader le fichier dans le bucket storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${class_subject_id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('class_subject_files')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // 2. Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('class_subject_files')
        .getPublicUrl(fileName);

      // 3. Enregistrer la référence dans la table class_subject_files
      const { data: fileRecord, error: dbError } = await supabase
        .from('class_subject_files')
        .insert({
          class_subject_id,
          file_url: publicUrl,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        // Tenter de supprimer le fichier uploadé si l'insertion en DB échoue
        await supabase.storage.from('class_subject_files').remove([fileName]);
        throw dbError;
      }

      return fileRecord;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['class-subject-files', variables.class_subject_id] });
      toast.success('Fichier ajouté avec succès');
    },
    onError: (error) => {
      console.error('Error uploading class subject file:', error);
      toast.error('Erreur lors de l\'ajout du fichier');
    },
  });
};

// Supprimer un fichier de support
export const useDeleteClassSubjectFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: ClassSubjectFile) => {
      // 1. Extraire le chemin du fichier depuis l'URL
      const url = new URL(file.file_url);
      const pathParts = url.pathname.split('/class_subject_files/');
      const filePath = pathParts[1];

      // 2. Supprimer le fichier du storage
      const { error: storageError } = await supabase.storage
        .from('class_subject_files')
        .remove([filePath]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
        throw storageError;
      }

      // 3. Supprimer l'entrée de la base de données
      const { error: dbError } = await supabase
        .from('class_subject_files')
        .delete()
        .eq('id', file.id);

      if (dbError) {
        console.error('Database deletion error:', dbError);
        throw dbError;
      }
    },
    onSuccess: (_, file) => {
      queryClient.invalidateQueries({ queryKey: ['class-subject-files', file.class_subject_id] });
      toast.success('Fichier supprimé avec succès');
    },
    onError: (error) => {
      console.error('Error deleting class subject file:', error);
      toast.error('Erreur lors de la suppression du fichier');
    },
  });
};
