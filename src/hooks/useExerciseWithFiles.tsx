
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ExerciseWithFiles {
  id: string;
  title: string;
  description?: string;
  content?: string;
  files?: {
    id: string;
    file_url: string;
    file_type: string;
  }[];
}

export const useExerciseWithFiles = (exerciseId?: string) => {
  return useQuery({
    queryKey: ['exercise-with-files', exerciseId],
    queryFn: async (): Promise<ExerciseWithFiles | null> => {
      if (!exerciseId) return null;

      // Récupérer l'exercice
      const { data: exercise, error: exerciseError } = await supabase
        .from('exercises')
        .select('*')
        .eq('id', exerciseId)
        .single();

      if (exerciseError) {
        console.error('Erreur lors de la récupération de l\'exercice:', exerciseError);
        throw exerciseError;
      }

      // Récupérer les fichiers associés
      const { data: files, error: filesError } = await supabase
        .from('exercise_files')
        .select('id, file_url, file_type')
        .eq('exercise_id', exerciseId);

      if (filesError) {
        console.error('Erreur lors de la récupération des fichiers:', filesError);
        // Ne pas throw l'erreur pour les fichiers, juste les ignorer
      }

      return {
        id: exercise.id,
        title: exercise.title,
        description: exercise.description,
        content: exercise.content,
        files: files || []
      };
    },
    enabled: !!exerciseId,
  });
};
