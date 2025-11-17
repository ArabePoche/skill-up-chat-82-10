// Hooks pour gérer les paiements scolaires
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useSchoolStudents = (schoolId?: string) => {
  return useQuery({
    queryKey: ['school-students-payments', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      // Charger les étudiants
      const { data: students, error: studentsError } = await supabase
        .from('students_school')
        .select(`
          *,
          classes:class_id(name),
          school_student_families:family_id(family_name)
        `)
        .eq('school_id', schoolId)
        .order('last_name', { ascending: true });

      if (studentsError) throw studentsError;
      if (!students) return [];

      // Charger les progrès de paiement séparément
      const { data: paymentProgress, error: progressError } = await supabase
        .from('school_student_payment_progress')
        .select('*')
        .eq('school_id', schoolId);

      if (progressError) throw progressError;

      // Créer un map des progrès de paiement par student_id
      const progressMap = new Map(
        (paymentProgress || []).map((p: any) => [p.student_id, p])
      );

      return students.map(student => {
        const progress: any = progressMap.get(student.id);
        return {
          ...student,
          total_amount_due: progress?.total_amount_due || 0,
          total_amount_paid: progress?.total_amount_paid || 0,
          remaining_amount: progress?.remaining_amount || 0,
          last_payment_date: progress?.last_payment_date || null,
          has_discount: !!(student.discount_percentage || student.discount_amount),
          is_family_member: !!student.family_id,
          family_name: student.school_student_families?.family_name || null,
        };
      });
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

export const useUpdateStudentDiscount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      studentId,
      discountPercentage,
      discountAmount,
    }: {
      studentId: string;
      discountPercentage: number | null;
      discountAmount: number | null;
    }) => {
      const { data, error } = await supabase
        .from('students_school')
        .update({
          discount_percentage: discountPercentage,
          discount_amount: discountAmount,
        })
        .eq('id', studentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-students-payments'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-payment-tracking'] });
      queryClient.invalidateQueries({ queryKey: ['family-payments'] });
      toast.success('Remise mise à jour avec succès');
    },
    onError: (error) => {
      console.error('Erreur lors de la mise à jour de la remise:', error);
      toast.error('Erreur lors de la mise à jour de la remise');
    },
  });
};
