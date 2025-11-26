// Hook pour gérer les notes de suivi des enseignants
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TeacherStudentNote, CreateTeacherNoteData } from '../types';

export const useTeacherNotes = (studentId?: string, teacherId?: string) => {
  return useQuery({
    queryKey: ['teacher-notes', studentId, teacherId],
    queryFn: async () => {
      if (!studentId) return [];

      let query = supabase
        .from('school_teacher_student_notes')
        .select(`
          *,
          profiles!school_teacher_student_notes_teacher_id_fkey(first_name, last_name),
          subjects(name)
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (teacherId) {
        query = query.eq('teacher_id', teacherId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as TeacherStudentNote[];
    },
    enabled: !!studentId,
  });
};

export const useCreateTeacherNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteData: CreateTeacherNoteData) => {
      const { data, error } = await supabase
        .from('school_teacher_student_notes')
        .insert(noteData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['teacher-notes'] });
      toast.success('Note de suivi créée avec succès');
    },
    onError: (error: any) => {
      toast.error('Erreur lors de la création de la note');
      console.error(error);
    },
  });
};

export const useUpdateTeacherNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TeacherStudentNote> & { id: string }) => {
      const { data, error } = await supabase
        .from('school_teacher_student_notes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-notes'] });
      toast.success('Note mise à jour avec succès');
    },
    onError: (error: any) => {
      toast.error('Erreur lors de la mise à jour');
      console.error(error);
    },
  });
};

export const useDeleteTeacherNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('school_teacher_student_notes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-notes'] });
      toast.success('Note supprimée');
    },
    onError: (error: any) => {
      toast.error('Erreur lors de la suppression');
      console.error(error);
    },
  });
};
