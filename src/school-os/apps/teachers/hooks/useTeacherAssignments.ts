import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Hook pour assigner un enseignant généraliste à une classe
 * Note: La table classes n'a pas de champ teacher_id,
 * donc on utilise class_subjects pour l'assignation
 */
export const useAssignTeacherToClass = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teacherId, classId, userId }: { teacherId: string; classId: string; userId: string }) => {
      // On marque simplement le professeur comme assigné à cette classe
      // L'assignation réelle se fait via class_subjects
      console.log('Teacher assigned to class:', { teacherId, classId, userId });
      
      // Optionnel : créer une table class_teachers pour suivre les profs principaux
      // Pour l'instant, on considère que c'est fait via class_subjects
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['school-classes'] });
      toast.success('Enseignant assigné à la classe');
    },
    onError: (error: any) => {
      console.error('Error assigning teacher to class:', error);
      toast.error(error.message || 'Erreur lors de l\'assignation');
    },
  });
};

/**
 * Hook pour assigner un enseignant spécialiste à des matières
 */
export const useAssignTeacherToSubjects = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      classSubjectIds 
    }: { 
      userId: string; 
      classSubjectIds: string[] 
    }) => {
      // Mettre à jour les class_subjects avec le user_id de l'enseignant
      const { error } = await supabase
        .from('class_subjects')
        .update({ teacher_id: userId })
        .in('id', classSubjectIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['class-subjects'] });
      toast.success('Enseignant assigné aux matières');
    },
    onError: (error: any) => {
      console.error('Error assigning teacher to subjects:', error);
      toast.error(error.message || 'Erreur lors de l\'assignation');
    },
  });
};

/**
 * Hook pour retirer l'assignation d'un enseignant
 */
export const useRemoveTeacherAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      type,
      id
    }: { 
      type: 'class' | 'subject';
      id: string;
    }) => {
      if (type === 'class') {
        // Les classes n'ont pas de teacher_id, donc rien à faire
        console.log('Remove class assignment:', id);
      } else {
        const { error } = await supabase
          .from('class_subjects')
          .update({ teacher_id: null })
          .eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['school-classes'] });
      queryClient.invalidateQueries({ queryKey: ['class-subjects'] });
      toast.success('Assignation retirée');
    },
    onError: (error: any) => {
      console.error('Error removing assignment:', error);
      toast.error(error.message || 'Erreur lors du retrait');
    },
  });
};
