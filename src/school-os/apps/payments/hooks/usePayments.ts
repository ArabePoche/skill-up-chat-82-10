// Hooks pour gérer les paiements scolaires
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useSchoolStudents = (schoolId?: string) => {
  return useQuery({
    queryKey: ['school-students-payments', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      const { data, error } = await supabase
        .from('students_school')
        .select(`
          *,
          classes:class_id(name),
          payment_progress:school_student_payment_progress(
            total_amount_due,
            total_amount_paid,
            remaining_amount,
            last_payment_date
          )
        `)
        .eq('school_id', schoolId)
        .order('last_name', { ascending: true });

      if (error) throw error;

      return data.map(student => ({
        ...student,
        total_amount_due: student.payment_progress?.[0]?.total_amount_due || 0,
        total_amount_paid: student.payment_progress?.[0]?.total_amount_paid || 0,
        remaining_amount: student.payment_progress?.[0]?.remaining_amount || 0,
        last_payment_date: student.payment_progress?.[0]?.last_payment_date || null,
      }));
    },
    enabled: !!schoolId,
  });
};

export const useStudentPayments = (studentId?: string) => {
  return useQuery({
    queryKey: ['student-payments', studentId],
    queryFn: async () => {
      if (!studentId) return [];

      const { data, error } = await supabase
        .from('school_students_payment')
        .select('*')
        .eq('student_id', studentId)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!studentId,
  });
};

export const useAddPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payment: {
      student_id: string;
      school_id: string;
      amount: number;
      payment_method: string;
      payment_type: string;
      payment_date: string;
      notes?: string;
      reference_number?: string;
      received_by?: string;
    }) => {
      const { data, error } = await supabase
        .from('school_students_payment')
        .insert(payment)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-students-payments'] });
      queryClient.invalidateQueries({ queryKey: ['student-payments'] });
      toast.success('Paiement ajouté avec succès');
    },
    onError: (error) => {
      console.error('Erreur lors de l\'ajout du paiement:', error);
      toast.error('Erreur lors de l\'ajout du paiement');
    },
  });
};
