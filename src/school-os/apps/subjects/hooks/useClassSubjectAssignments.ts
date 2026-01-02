// Hook pour gérer l'affectation des matières aux classes
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ClassSubjectAssignment, AssignSubjectToClassData } from '../types';

/**
 * Récupérer les matières assignées à une classe
 */
export const useClassSubjectAssignments = (classId?: string) => {
  return useQuery({
    queryKey: ['class-subject-assignments', classId],
    queryFn: async () => {
      if (!classId) return [];

      const { data, error } = await supabase
        .from('class_subjects')
        .select(`
          *,
          subjects(id, name, code, color, description),
          profiles:teacher_id(first_name, last_name)
        `)
        .eq('class_id', classId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching class subject assignments:', error);
        throw error;
      }

      return data as unknown as ClassSubjectAssignment[];
    },
    enabled: !!classId,
  });
};

/**
 * Assigner une matière à une classe
 */
export const useAssignSubjectToClass = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AssignSubjectToClassData) => {
      // Vérifier si la matière est déjà assignée à cette classe
      const { data: existing } = await supabase
        .from('class_subjects')
        .select('id')
        .eq('class_id', data.class_id)
        .eq('subject_id', data.subject_id)
        .single();

      if (existing) {
        throw new Error('Cette matière est déjà assignée à cette classe');
      }

      const { data: result, error } = await supabase
        .from('class_subjects')
        .insert({
          class_id: data.class_id,
          subject_id: data.subject_id,
          coefficient: data.coefficient,
          max_score: data.max_score,
          teacher_id: data.teacher_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['class-subject-assignments', data.class_id] });
      queryClient.invalidateQueries({ queryKey: ['class-subjects'] });
      toast.success('Matière assignée à la classe');
    },
    onError: (error: any) => {
      console.error('Error assigning subject to class:', error);
      toast.error(error.message || 'Erreur lors de l\'assignation');
    },
  });
};

/**
 * Modifier l'affectation d'une matière (coefficient, enseignant)
 */
export const useUpdateClassSubjectAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      classId,
      updates,
    }: {
      id: string;
      classId: string;
      updates: Partial<AssignSubjectToClassData>;
    }) => {
      const { data, error } = await supabase
        .from('class_subjects')
        .update({
          coefficient: updates.coefficient,
          max_score: updates.max_score,
          teacher_id: updates.teacher_id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, classId };
    },
    onSuccess: ({ classId }) => {
      queryClient.invalidateQueries({ queryKey: ['class-subject-assignments', classId] });
      queryClient.invalidateQueries({ queryKey: ['class-subjects'] });
      toast.success('Affectation mise à jour');
    },
    onError: (error) => {
      console.error('Error updating class subject assignment:', error);
      toast.error('Erreur lors de la mise à jour');
    },
  });
};

/**
 * Retirer une matière d'une classe
 */
export const useRemoveSubjectFromClass = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, classId }: { id: string; classId: string }) => {
      const { error } = await supabase
        .from('class_subjects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return classId;
    },
    onSuccess: (classId) => {
      queryClient.invalidateQueries({ queryKey: ['class-subject-assignments', classId] });
      queryClient.invalidateQueries({ queryKey: ['class-subjects'] });
      toast.success('Matière retirée de la classe');
    },
    onError: (error) => {
      console.error('Error removing subject from class:', error);
      toast.error('Erreur lors de la suppression');
    },
  });
};
