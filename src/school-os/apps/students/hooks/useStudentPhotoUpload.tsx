// Hook pour l'upload de photo d'élève
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StudentPhotoUploadParams {
  file: File;
  studentId: string;
  schoolId: string;
  currentPhotoUrl?: string;
}

export const useStudentPhotoUpload = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, studentId, schoolId, currentPhotoUrl }: StudentPhotoUploadParams) => {
      // Vérifier le type et la taille du fichier
      if (!file.type.startsWith('image/')) {
        throw new Error('Veuillez sélectionner une image');
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error('La taille de l\'image ne doit pas dépasser 5 Mo');
      }

      // Supprimer l'ancienne photo si elle existe
      if (currentPhotoUrl) {
        const oldPath = currentPhotoUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('student-photos')
            .remove([`${schoolId}/${oldPath}`]);
        }
      }

      // Upload la nouvelle photo
      const fileExt = file.name.split('.').pop();
      const fileName = `${studentId}-${Date.now()}.${fileExt}`;
      const filePath = `${schoolId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('student-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('student-photos')
        .getPublicUrl(filePath);

      // Mettre à jour l'élève
      const { error: updateError } = await supabase
        .from('students_school')
        .update({ photo_url: publicUrl })
        .eq('id', studentId);

      if (updateError) throw updateError;

      return publicUrl;
    },
    onSuccess: () => {
      toast.success('Photo mise à jour avec succès');
      // Invalider les queries pour rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student'] });
    },
    onError: (error: Error) => {
      console.error('Erreur upload photo élève:', error);
      toast.error('Erreur lors de l\'upload de la photo: ' + error.message);
    },
  });
};
