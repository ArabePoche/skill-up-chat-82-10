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
    first_name: string;
    last_name: string;
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

      const { data, error } = await (supabase as any)
        .from('school_teacher_payments')
        .select(`
          *,
          school_teachers!inner(
            first_name, last_name
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
      // Créer le paiement
      const { data: payment, error: paymentError } = await (supabase as any)
        .from('school_teacher_payments')
        .insert(data)
        .select(`
          *,
          school_teachers!inner(first_name, last_name)
        `)
        .single();

      if (paymentError) throw paymentError;

      // Créer la transaction correspondante dans school_transactions
      const paymentMethodMap: Record<string, string> = {
        cash: 'Espèces',
        transfer: 'Virement',
        check: 'Chèque'
      };

      const teacherName = `${payment.school_teachers.first_name} ${payment.school_teachers.last_name}`;
      const description = `Paiement enseignant: ${teacherName}${data.notes ? ` - ${data.notes}` : ''}`;

      const { error: transactionError } = await supabase
        .from('school_transactions')
        .insert({
          school_id: data.school_id,
          type: 'expense',
          category: 'Salaires Personnel',
          amount: data.amount,
          transaction_date: data.payment_date,
          description: description,
          payment_method: paymentMethodMap[data.payment_method] || data.payment_method,
        });

      if (transactionError) {
        console.error('Error creating transaction:', transactionError);
        // On ne bloque pas si la transaction échoue, mais on log l'erreur
      }

      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-payments'] });
      queryClient.invalidateQueries({ queryKey: ['school-transactions'] });
      toast.success('Paiement enregistré et ajouté aux dépenses');
    },
    onError: (error) => {
      console.error('Error creating payment:', error);
      toast.error('Erreur lors de l\'enregistrement du paiement');
    },
  });
};
