// Hook pour gérer les requêtes des élèves
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Student {
  id: string;
  school_id: string;
  class_id: string | null;
  school_year_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: 'male' | 'female';
  student_code: string | null;
  photo_url: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  parent_email: string | null;
  address: string | null;
  city: string | null;
  medical_notes: string | null;
  status: 'active' | 'inactive' | 'transferred';
  created_at: string;
  updated_at: string;
}

export interface NewStudent {
  school_id: string;
  class_id?: string | null;
  school_year_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: 'male' | 'female';
  student_code?: string;
  photo_url?: string;
  parent_name?: string;
  parent_phone?: string;
  parent_email?: string;
  address?: string;
  city?: string;
  medical_notes?: string;
  status?: 'active' | 'inactive' | 'transferred';
}

export const useStudents = (schoolId?: string) => {
  return useQuery<any[]>({
    queryKey: ['students', schoolId],
    queryFn: async () => {
      let query = supabase
        .from('students_school')
        .select('*, classes(name, cycle), school_years(name)')
        .order('created_at', { ascending: false });

      if (schoolId) {
        query = query.eq('school_id', schoolId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId,
  });
};

export const useAddStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newStudent: NewStudent) => {
      const { data, error } = await supabase
        .from('students_school')
        .insert(newStudent)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Élève ajouté avec succès');
    },
    onError: (error: any) => {
      toast.error('Erreur lors de l\'ajout de l\'élève: ' + error.message);
    },
  });
};

export const useUpdateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Student> }) => {
      const { data, error } = await supabase
        .from('students_school')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Élève modifié avec succès');
    },
    onError: (error: any) => {
      toast.error('Erreur lors de la modification: ' + error.message);
    },
  });
};

export const useDeleteStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('students_school')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Élève supprimé avec succès');
    },
    onError: (error: any) => {
      toast.error('Erreur lors de la suppression: ' + error.message);
    },
  });
};
