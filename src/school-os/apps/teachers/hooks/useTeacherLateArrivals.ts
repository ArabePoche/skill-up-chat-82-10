// Hook pour gérer les retards des enseignants
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TeacherLateArrival {
  id: string;
  school_id: string;
  teacher_id: string;
  late_date: string;
  minutes_late: number;
  reason?: string;
  created_at: string;
  school_teachers?: {
    first_name: string;
    last_name: string;
  };
}

export interface CreateTeacherLateArrivalData {
  school_id: string;
  teacher_id: string;
  late_date: string;
  minutes_late: number;
  reason?: string;
}

// Récupérer tous les retards
export const useTeacherLateArrivals = (schoolId?: string) => {
  return useQuery({
    queryKey: ['teacher-late-arrivals', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      const { data, error } = await (supabase as any)
        .from('school_teacher_late_arrivals')
        .select(`
          *,
          school_teachers!inner(
            first_name, last_name
          )
        `)
        .eq('school_id', schoolId)
        .order('late_date', { ascending: false });

      if (error) throw error;
      return data as TeacherLateArrival[];
    },
    enabled: !!schoolId,
  });
};

// Créer un retard
export const useCreateTeacherLateArrival = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTeacherLateArrivalData) => {
      const { data: result, error } = await (supabase as any)
        .from('school_teacher_late_arrivals')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-late-arrivals'] });
      toast.success('Retard enregistré');
    },
    onError: (error) => {
      console.error('Error creating late arrival:', error);
      toast.error('Erreur lors de l\'enregistrement du retard');
    },
  });
};

// Mettre à jour un retard
export const useUpdateTeacherLateArrival = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateTeacherLateArrivalData> }) => {
      const { data: result, error } = await (supabase as any)
        .from('school_teacher_late_arrivals')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-late-arrivals'] });
      toast.success('Retard modifié');
    },
    onError: (error) => {
      console.error('Error updating late arrival:', error);
      toast.error('Erreur lors de la modification du retard');
    },
  });
};

// Supprimer un retard
export const useDeleteTeacherLateArrival = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('school_teacher_late_arrivals')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-late-arrivals'] });
      toast.success('Retard supprimé');
    },
    onError: (error) => {
      console.error('Error deleting late arrival:', error);
      toast.error('Erreur lors de la suppression du retard');
    },
  });
};
