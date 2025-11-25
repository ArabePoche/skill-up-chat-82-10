// Hook pour gérer les remarques sur les enseignants
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TeacherRemark {
  id: string;
  school_id: string;
  teacher_id: string;
  remark_type: 'positive' | 'negative' | 'neutral';
  content: string;
  created_at: string;
  school_teachers?: {
    first_name: string;
    last_name: string;
  };
}

export interface CreateTeacherRemarkData {
  school_id: string;
  teacher_id: string;
  remark_type: 'positive' | 'negative' | 'neutral';
  content: string;
}

// Récupérer toutes les remarques
export const useTeacherRemarks = (schoolId?: string) => {
  return useQuery({
    queryKey: ['teacher-remarks', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      const { data, error } = await (supabase as any)
        .from('school_teacher_remarks')
        .select(`
          *,
          school_teachers!inner(
            first_name, last_name
          )
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TeacherRemark[];
    },
    enabled: !!schoolId,
  });
};

// Créer une remarque
export const useCreateTeacherRemark = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTeacherRemarkData) => {
      const { data: result, error } = await (supabase as any)
        .from('school_teacher_remarks')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-remarks'] });
      toast.success('Remarque ajoutée');
    },
    onError: (error) => {
      console.error('Error creating remark:', error);
      toast.error('Erreur lors de l\'ajout de la remarque');
    },
  });
};
