// Hook pour gérer les absences des enseignants
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TeacherAbsence {
  id: string;
  school_id: string;
  teacher_id: string;
  absence_date: string;
  is_justified: boolean;
  reason?: string;
  created_at: string;
  school_teachers?: {
    first_name: string;
    last_name: string;
  };
}

export interface CreateTeacherAbsenceData {
  school_id: string;
  teacher_id: string;
  absence_date: string;
  is_justified: boolean;
  reason?: string;
}

// Récupérer toutes les absences
export const useTeacherAbsences = (schoolId?: string) => {
  return useQuery({
    queryKey: ['teacher-absences', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      const { data, error } = await (supabase as any)
        .from('school_teacher_absences')
        .select(`
          *,
          school_teachers!inner(
            first_name, last_name
          )
        `)
        .eq('school_id', schoolId)
        .order('absence_date', { ascending: false });

      if (error) throw error;
      return data as TeacherAbsence[];
    },
    enabled: !!schoolId,
  });
};

// Créer une absence
export const useCreateTeacherAbsence = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTeacherAbsenceData) => {
      const { data: result, error } = await (supabase as any)
        .from('school_teacher_absences')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-absences'] });
      toast.success('Absence enregistrée');
    },
    onError: (error) => {
      console.error('Error creating absence:', error);
      toast.error('Erreur lors de l\'enregistrement de l\'absence');
    },
  });
};

// Mettre à jour une absence
export const useUpdateTeacherAbsence = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateTeacherAbsenceData> }) => {
      const { data: result, error } = await (supabase as any)
        .from('school_teacher_absences')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-absences'] });
      toast.success('Absence modifiée');
    },
    onError: (error) => {
      console.error('Error updating absence:', error);
      toast.error('Erreur lors de la modification de l\'absence');
    },
  });
};

// Supprimer une absence
export const useDeleteTeacherAbsence = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('school_teacher_absences')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-absences'] });
      toast.success('Absence supprimée');
    },
    onError: (error) => {
      console.error('Error deleting absence:', error);
      toast.error('Erreur lors de la suppression de l\'absence');
    },
  });
};
