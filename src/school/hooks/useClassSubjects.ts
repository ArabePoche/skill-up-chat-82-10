// Hook pour gérer les matières d'une classe
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ClassSubject {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string | null;
  coefficient: number | null;
  created_at: string;
  updated_at: string;
  subjects?: {
    name: string;
    code: string | null;
  };
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  };
}

export interface CreateClassSubjectData {
  class_id: string;
  subject_id: string;
  teacher_id?: string | null;
  coefficient?: number;
}

// Récupérer les matières d'une classe
export const useClassSubjects = (classId?: string) => {
  return useQuery({
    queryKey: ['class-subjects', classId],
    queryFn: async () => {
      if (!classId) return [];
      
      const { data, error } = await supabase
        .from('class_subjects')
        .select(`
          *,
          subjects(name, code),
          profiles:teacher_id(first_name, last_name)
        `)
        .eq('class_id', classId)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching class subjects:', error);
        throw error;
      }
      
      return data as unknown as ClassSubject[];
    },
    enabled: !!classId,
  });
};

// Ajouter une matière à une classe
export const useAddClassSubject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateClassSubjectData) => {
      const { data: result, error } = await supabase
        .from('class_subjects')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['class-subjects', data.class_id] 
      });
      toast.success('Matière ajoutée');
    },
    onError: (error) => {
      console.error('Error adding class subject:', error);
      toast.error('Erreur lors de l\'ajout de la matière');
    },
  });
};

// Mettre à jour une matière de classe
export const useUpdateClassSubject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      classId, 
      updates 
    }: { 
      id: string; 
      classId: string; 
      updates: Partial<CreateClassSubjectData> 
    }) => {
      const { data, error } = await supabase
        .from('class_subjects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return { data, classId };
    },
    onSuccess: ({ classId }) => {
      queryClient.invalidateQueries({ 
        queryKey: ['class-subjects', classId] 
      });
      toast.success('Matière mise à jour');
    },
    onError: (error) => {
      console.error('Error updating class subject:', error);
      toast.error('Erreur lors de la mise à jour');
    },
  });
};

// Supprimer une matière d'une classe
export const useDeleteClassSubject = () => {
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
      queryClient.invalidateQueries({ 
        queryKey: ['class-subjects', classId] 
      });
      toast.success('Matière supprimée');
    },
    onError: (error) => {
      console.error('Error deleting class subject:', error);
      toast.error('Erreur lors de la suppression');
    },
  });
};
