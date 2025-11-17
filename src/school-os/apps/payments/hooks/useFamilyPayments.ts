/**
 * Hook pour gérer les paiements familiaux et les remises
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Réexporter la fonction de calcul de remise depuis le module utilitaire
export { calculateDiscountedAmount, formatDiscount, hasDiscount } from '../utils/discountCalculations';

export interface FamilyWithStudents {
  family_id: string;
  family_name: string;
  students: Array<{
    id: string;
    first_name: string;
    last_name: string;
    student_code: string;
    discount_percentage: number | null;
    discount_amount: number | null;
    class_name: string | null;
    annual_fee: number;
    total_amount_due: number;
    total_amount_paid: number;
    remaining_amount: number;
  }>;
  total_family_due: number;
  total_family_paid: number;
  total_family_remaining: number;
}

/**
 * Récupère toutes les familles avec leurs élèves et leurs informations de paiement
 */
export const useFamiliesWithPayments = (schoolId?: string) => {
  return useQuery({
    queryKey: ['families-with-payments', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      // Récupérer toutes les familles de l'école
      const { data: families, error: familiesError } = await supabase
        .from('school_student_families')
        .select('*')
        .eq('school_id', schoolId);

      if (familiesError) throw familiesError;
      if (!families || families.length === 0) return [];

      // Charger tous les progrès de paiement en une seule fois
      const { data: allPaymentProgress, error: progressError } = await supabase
        .from('school_student_payment_progress')
        .select('*')
        .eq('school_id', schoolId);

      if (progressError) throw progressError;

      // Créer un map des progrès de paiement par student_id
      const progressMap = new Map(
        (allPaymentProgress || []).map((p: any) => [p.student_id, p])
      );

      // Pour chaque famille, récupérer les élèves et leurs paiements
      const familiesWithStudents: FamilyWithStudents[] = await Promise.all(
        families.map(async (family) => {
          const { data: students, error: studentsError } = await supabase
            .from('students_school')
            .select(`
              id,
              first_name,
              last_name,
              student_code,
              discount_percentage,
              discount_amount,
              classes:class_id(name, annual_fee)
            `)
            .eq('family_id', family.id)
            .eq('status', 'active');

          if (studentsError) throw studentsError;

          const formattedStudents = (students || []).map(student => {
            const progress: any = progressMap.get(student.id);
            return {
              id: student.id,
              first_name: student.first_name,
              last_name: student.last_name,
              student_code: student.student_code || '',
              discount_percentage: student.discount_percentage,
              discount_amount: student.discount_amount,
              class_name: student.classes?.name || null,
              annual_fee: student.classes?.annual_fee || 0,
              total_amount_due: progress?.total_amount_due || 0,
              total_amount_paid: progress?.total_amount_paid || 0,
              remaining_amount: progress?.remaining_amount || 0,
            };
          });

          // Calculer les totaux familiaux
          const total_family_due = formattedStudents.reduce((sum, s) => sum + s.total_amount_due, 0);
          const total_family_paid = formattedStudents.reduce((sum, s) => sum + s.total_amount_paid, 0);
          const total_family_remaining = formattedStudents.reduce((sum, s) => sum + s.remaining_amount, 0);

          return {
            family_id: family.id,
            family_name: family.family_name,
            students: formattedStudents,
            total_family_due,
            total_family_paid,
            total_family_remaining,
          };
        })
      );

      return familiesWithStudents.filter(f => f.students.length > 0);
    },
    enabled: !!schoolId,
  });
};

/**
 * Créer un paiement familial qui sera réparti entre plusieurs élèves
 */
export const useAddFamilyPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payment: {
      school_id: string;
      family_id: string;
      students: Array<{
        student_id: string;
        amount: number;
      }>;
      payment_method: string;
      payment_date: string;
      notes?: string;
      reference_number?: string;
      received_by?: string;
    }) => {
      // Créer un paiement pour chaque élève de la famille
      const payments = payment.students.map(student => ({
        student_id: student.student_id,
        school_id: payment.school_id,
        amount: student.amount,
        payment_method: payment.payment_method,
        payment_type: 'tuition',
        payment_date: payment.payment_date,
        notes: payment.notes ? `${payment.notes} (Paiement familial)` : 'Paiement familial',
        reference_number: payment.reference_number,
        received_by: payment.received_by,
      }));

      const { data, error } = await supabase
        .from('school_students_payment')
        .insert(payments)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families-with-payments'] });
      queryClient.invalidateQueries({ queryKey: ['school-students-payments'] });
      queryClient.invalidateQueries({ queryKey: ['student-payments'] });
      toast.success('Paiement familial ajouté avec succès');
    },
    onError: (error) => {
      console.error('Erreur lors de l\'ajout du paiement familial:', error);
      toast.error('Erreur lors de l\'ajout du paiement familial');
    },
  });
};
