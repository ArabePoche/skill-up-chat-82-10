import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TeacherApplicationData {
  motivationMessage: string;
  experienceYears: number | '';
  educationLevel: string;
  specialties: string[];
  availability: string;
  selectedFormations: string[];
  files: File[];
}

export const useTeacherApplication = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const submitApplication = async (userId: string, data: TeacherApplicationData) => {
    try {
      setIsSubmitting(true);

      // Créer la candidature
      const { data: applicationData, error: applicationError } = await supabase
        .from('teacher_applications')
        .insert({
          user_id: userId,
          motivation_message: data.motivationMessage,
          experience_years: data.experienceYears || null,
          education_level: data.educationLevel,
          specialties: data.specialties,
          availability: data.availability
        })
        .select()
        .single();

      if (applicationError) throw applicationError;

      // Ajouter les formations sélectionnées
      if (data.selectedFormations.length > 0) {
        const formationInserts = data.selectedFormations.map(formationId => ({
          application_id: applicationData.id,
          formation_id: formationId
        }));

        const { error: formationsError } = await supabase
          .from('teacher_application_formations')
          .insert(formationInserts);

        if (formationsError) throw formationsError;
      }

      // Uploader les fichiers
      const fileUploads = await Promise.all(
        data.files.map(async (file) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${userId}/${applicationData.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('teacher_application_files')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('teacher_application_files')
            .getPublicUrl(fileName);

          return {
            application_id: applicationData.id,
            file_name: file.name,
            file_url: publicUrl,
            file_type: file.type,
            file_size: file.size
          };
        })
      );

      // Enregistrer les métadonnées des fichiers
      if (fileUploads.length > 0) {
        const { error: filesError } = await supabase
          .from('teacher_application_files')
          .insert(fileUploads);

        if (filesError) throw filesError;
      }

      toast({
        title: "Candidature soumise !",
        description: "Votre candidature pour devenir encadreur a été soumise avec succès. Vous recevrez une réponse sous peu.",
      });

      return applicationData;
    } catch (error: any) {
      console.error('Erreur lors de la soumission:', error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la soumission",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitApplication,
    isSubmitting
  };
};