// Hook pour gérer les paiements des enseignants
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TeacherPayment {
  id: string;
  school_id: string;
  teacher_id: string;
  amount: number;
  payment_date: string;
  payment_method: 'cash' | 'transfer' | 'check';
  notes?: string;
  created_at: string;
  school_teachers?: {
    profiles?: {
      first_name: string;
      last_name: string;
    };
  };
}

export interface CreateTeacherPaymentData {
  school_id: string;
  teacher_id: string;
  amount: number;
  payment_date: string;
  payment_method: 'cash' | 'transfer' | 'check';
  notes?: string;
}

// Récupérer tous les paiements
export const useTeacherPayments = (schoolId?: string) => {
  return useQuery({
    queryKey: ['teacher-payments', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      const { data, error } = await supabase
        .from('teacher_payments')
        .select(`
          *,
          school_teachers!inner(
            profiles(first_name, last_name)
          )
        `)
        .eq('school_id', schoolId)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return data as TeacherPayment[];
    },
    enabled: !!schoolId,
  });
};

// Créer un paiement
export const useCreateTeacherPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTeacherPaymentData) => {
      const { data: result, error } = await supabase
        .from('teacher_payments')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-payments'] });
      toast.success('Paiement enregistré');
    },
    onError: (error) => {
      console.error('Error creating payment:', error);
      toast.error('Erreur lors de l\'enregistrement du paiement');
    },
  });
};
