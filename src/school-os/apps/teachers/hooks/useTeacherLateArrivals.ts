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
    profiles?: {
      first_name: string;
      last_name: string;
    };
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

      const { data, error } = await supabase
        .from('teacher_late_arrivals')
        .select(`
          *,
          school_teachers!inner(
            profiles(first_name, last_name)
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
      const { data: result, error } = await supabase
        .from('teacher_late_arrivals')
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
