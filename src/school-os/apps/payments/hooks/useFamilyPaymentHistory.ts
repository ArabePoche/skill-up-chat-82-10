/**
 * Hook pour récupérer l'historique des paiements d'une famille
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useFamilyPaymentHistory = (familyId?: string) => {
  return useQuery({
    queryKey: ['family-payment-history', familyId],
    queryFn: async () => {
      if (!familyId) return [];

      // 1. Récupérer tous les élèves de la famille
      const { data: students, error: studentsError } = await supabase
        .from('students_school')
        .select('id')
        .eq('family_id', familyId);

      if (studentsError) throw studentsError;
      if (!students || students.length === 0) return [];

      const studentIds = students.map(s => s.id);

      // 2. Récupérer tous les paiements de ces élèves
      const { data: payments, error: paymentsError } = await supabase
        .from('school_students_payment')
        .select(`
          *,
          student:student_id(id, first_name, last_name, student_code)
        `)
        .in('student_id', studentIds)
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;
      if (!payments || payments.length === 0) return [];

      // 3. Récupérer les profils liés (received_by / updated_by)
      const profileIds = Array.from(
        new Set(
          payments.flatMap((p: any) => [p.received_by, p.updated_by]).filter(Boolean)
        )
      ) as string[];

      if (profileIds.length === 0) {
        return payments;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .in('id', profileIds);

      if (profilesError) {
        console.error('Erreur lors du chargement des profils:', profilesError);
        return payments;
      }

      const profilesMap = new Map(
        (profiles || []).map((p: any) => [p.id, p])
      );

      // 4. Enrichir les paiements avec les infos de profil
      return payments.map((payment: any) => ({
        ...payment,
        received_by_profile: payment.received_by
          ? profilesMap.get(payment.received_by) || null
          : null,
        updated_by_profile: payment.updated_by
          ? profilesMap.get(payment.updated_by) || null
          : null,
      }));
    },
    enabled: !!familyId,
  });
};
