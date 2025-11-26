// Hook pour gérer les matières d'une école
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Subject, CreateSubjectData, UpdateSubjectData } from '../types';

/**
 * Récupérer toutes les matières d'une école
 */
export const useSchoolSubjects = (schoolId?: string) => {
  return useQuery({
    queryKey: ['school-subjects', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('school_id', schoolId)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching school subjects:', error);
        throw error;
      }

      return data as Subject[];
    },
    enabled: !!schoolId,
  });
};

/**
 * Créer une nouvelle matière pour une école
 */
export const useCreateSchoolSubject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSubjectData) => {
      const { data: result, error } = await supabase
        .from('subjects')
        .insert({
          name: data.name,
          code: data.code || null,
          description: data.description || null,
          color: data.color || '#3B82F6',
          school_id: data.school_id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['school-subjects', data.school_id] });
      toast.success('Matière créée avec succès');
    },
    onError: (error) => {
      console.error('Error creating subject:', error);
      toast.error('Erreur lors de la création de la matière');
    },
  });
};

/**
 * Modifier une matière existante
 */
export const useUpdateSchoolSubject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateSubjectData }) => {
      const { data: result, error } = await supabase
        .from('subjects')
        .update({
          name: data.name,
          code: data.code || null,
          description: data.description || null,
          color: data.color,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['school-subjects'] });
      toast.success('Matière modifiée avec succès');
    },
    onError: (error) => {
      console.error('Error updating subject:', error);
      toast.error('Erreur lors de la modification de la matière');
    },
  });
};

/**
 * Supprimer une matière
 */
export const useDeleteSubject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-subjects'] });
      toast.success('Matière supprimée avec succès');
    },
    onError: (error) => {
      console.error('Error deleting subject:', error);
      toast.error('Erreur lors de la suppression de la matière');
    },
  });
};
