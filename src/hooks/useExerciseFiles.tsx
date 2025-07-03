
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExerciseFile {
  id?: string;
  exercise_id?: string;
  file_url: string;
  file_type: string;
  file_name?: string;
}

export const useExerciseFiles = (exerciseId?: string) => {
  const [files, setFiles] = useState<ExerciseFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Charger les fichiers existants
  useEffect(() => {
    if (exerciseId) {
      loadExerciseFiles(exerciseId);
    }
  }, [exerciseId]);

  const loadExerciseFiles = async (id: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('exercise_files')
        .select('*')
        .eq('exercise_id', id);

      if (error) throw error;

      const formattedFiles = data?.map(file => ({
        id: file.id,
        exercise_id: file.exercise_id,
        file_url: file.file_url,
        file_type: file.file_type,
        file_name: file.file_url.split('/').pop() || 'Fichier'
      })) || [];

      setFiles(formattedFiles);
    } catch (error) {
      console.error('Erreur lors du chargement des fichiers:', error);
      toast.error('Erreur lors du chargement des fichiers');
    } finally {
      setIsLoading(false);
    }
  };

  const saveExerciseFiles = async (exerciseId: string, fileData: { url: string; type: string; name?: string }[]) => {
    try {
      // Supprimer les anciens fichiers
      await supabase
        .from('exercise_files')
        .delete()
        .eq('exercise_id', exerciseId);

      // Ajouter les nouveaux fichiers
      if (fileData.length > 0) {
        const { error } = await supabase
          .from('exercise_files')
          .insert(
            fileData.map(file => ({
              exercise_id: exerciseId,
              file_url: file.url,
              file_type: file.type
            }))
          );

        if (error) throw error;
      }

      // Recharger les fichiers
      await loadExerciseFiles(exerciseId);
      toast.success('Fichiers sauvegardés avec succès');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des fichiers:', error);
      toast.error('Erreur lors de la sauvegarde des fichiers');
      throw error;
    }
  };

  return {
    files,
    isLoading,
    saveExerciseFiles,
    loadExerciseFiles
  };
};
