// Hook pour gérer les fichiers de supports attachés aux matières
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SubjectFile {
  id: string;
  subject_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UploadSubjectFileData {
  subject_id: string;
  file: File;
}

// Récupérer les fichiers d'une matière
export const useSubjectFiles = (subjectId?: string) => {
  return useQuery({
    queryKey: ['subject-files', subjectId],
    queryFn: async () => {
      if (!subjectId) return [];

      const { data, error } = await supabase
        .from('subject_files')
        .select('*')
        .eq('subject_id', subjectId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching subject files:', error);
        throw error;
      }
      
      return data as SubjectFile[];
    },
    enabled: !!subjectId,
  });
};

// Uploader un fichier pour une matière
export const useUploadSubjectFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ subject_id, file }: UploadSubjectFileData) => {
      // 1. Uploader le fichier dans le bucket storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${subject_id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('subject_files')
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
        .from('subject_files')
        .getPublicUrl(fileName);

      // 3. Enregistrer la référence dans la table subject_files
      const { data: fileRecord, error: dbError } = await supabase
        .from('subject_files')
        .insert({
          subject_id,
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
        await supabase.storage.from('subject_files').remove([fileName]);
        throw dbError;
      }

      return fileRecord;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subject-files', variables.subject_id] });
      toast.success('Fichier ajouté avec succès');
    },
    onError: (error) => {
      console.error('Error uploading subject file:', error);
      toast.error('Erreur lors de l\'ajout du fichier');
    },
  });
};

// Supprimer un fichier de support
export const useDeleteSubjectFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: SubjectFile) => {
      // 1. Extraire le chemin du fichier depuis l'URL
      const url = new URL(file.file_url);
      const pathParts = url.pathname.split('/subject_files/');
      const filePath = pathParts[1];

      // 2. Supprimer le fichier du storage
      const { error: storageError } = await supabase.storage
        .from('subject_files')
        .remove([filePath]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
        throw storageError;
      }

      // 3. Supprimer l'entrée de la base de données
      const { error: dbError } = await supabase
        .from('subject_files')
        .delete()
        .eq('id', file.id);

      if (dbError) {
        console.error('Database deletion error:', dbError);
        throw dbError;
      }
    },
    onSuccess: (_, file) => {
      queryClient.invalidateQueries({ queryKey: ['subject-files', file.subject_id] });
      toast.success('Fichier supprimé avec succès');
    },
    onError: (error) => {
      console.error('Error deleting subject file:', error);
      toast.error('Erreur lors de la suppression du fichier');
    },
  });
};
