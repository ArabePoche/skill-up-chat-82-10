// Hook pour gérer les matières
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Subject {
  id: string;
  name: string;
  code: string | null;
  created_at: string;
}

export interface CreateSubjectData {
  name: string;
  code?: string;
}

// Récupérer toutes les matières
export const useSubjects = () => {
  return useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Error fetching subjects:', error);
        throw error;
      }
      
      return data as Subject[];
    },
  });
};

// Créer une nouvelle matière
export const useCreateSubject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSubjectData) => {
      const { data: result, error } = await supabase
        .from('subjects')
        .insert({
          name: data.name,
          code: data.code || null,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast.success('Matière créée avec succès');
    },
    onError: (error) => {
      console.error('Error creating subject:', error);
      toast.error('Erreur lors de la création de la matière');
    },
  });
};

// Modifier une matière existante
export const useUpdateSubject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreateSubjectData }) => {
      const { data: result, error } = await supabase
        .from('subjects')
        .update({
          name: data.name,
          code: data.code || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast.success('Matière modifiée avec succès');
    },
    onError: (error) => {
      console.error('Error updating subject:', error);
      toast.error('Erreur lors de la modification de la matière');
    },
  });
};

// Supprimer une matière
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
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast.success('Matière supprimée avec succès');
    },
    onError: (error) => {
      console.error('Error deleting subject:', error);
      toast.error('Erreur lors de la suppression de la matière');
    },
  });
};
