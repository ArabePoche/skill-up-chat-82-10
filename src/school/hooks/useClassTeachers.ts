// Hook pour gérer les professeurs assignés à une classe
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ClassTeacher {
  id: string;
  class_id: string;
  teacher_id: string;
  subject: string | null;
  subject_id: string | null;
  hours_per_week: number | null;
  created_at: string | null;
  school_teachers?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

// Récupérer les professeurs d'une classe
export const useClassTeachers = (classId: string) => {
  return useQuery({
    queryKey: ['class-teachers', classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_teacher_classes')
        .select(`
          *,
          school_teachers (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('class_id', classId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching class teachers:', error);
        throw error;
      }

      return data as ClassTeacher[];
    },
  });
};

// Ajouter un professeur à une classe
export const useAddClassTeacher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      class_id: string;
      teacher_id: string;
      subject?: string;
      subject_id?: string;
      hours_per_week?: number;
    }) => {
      const { data: result, error } = await supabase
        .from('school_teacher_classes')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['class-teachers', data.class_id] });
      toast.success('Professeur assigné à la classe');
    },
    onError: (error) => {
      console.error('Error adding teacher to class:', error);
      toast.error("Erreur lors de l'assignation du professeur");
    },
  });
};

// Modifier l'assignation d'un professeur
export const useUpdateClassTeacher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      classId,
      updates,
    }: {
      id: string;
      classId: string;
      updates: { subject?: string; hours_per_week?: number };
    }) => {
      const { data, error } = await supabase
        .from('school_teacher_classes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, classId };
    },
    onSuccess: ({ classId }) => {
      queryClient.invalidateQueries({ queryKey: ['class-teachers', classId] });
      toast.success('Assignation mise à jour');
    },
    onError: (error) => {
      console.error('Error updating class teacher:', error);
      toast.error('Erreur lors de la mise à jour');
    },
  });
};

// Retirer un professeur d'une classe
export const useDeleteClassTeacher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, classId }: { id: string; classId: string }) => {
      const { error } = await supabase
        .from('school_teacher_classes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return classId;
    },
    onSuccess: (classId) => {
      queryClient.invalidateQueries({ queryKey: ['class-teachers', classId] });
      toast.success('Professeur retiré de la classe');
    },
    onError: (error) => {
      console.error('Error removing teacher from class:', error);
      toast.error('Erreur lors de la suppression');
    },
  });
};
