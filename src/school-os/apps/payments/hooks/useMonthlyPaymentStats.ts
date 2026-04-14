/**
 * Hook pour calculer les statistiques détaillées des paiements mensuels
 * Utilise directement les données de school_student_payment_progress
 * Prend en compte la proratisation par élève (billable_months, prorated_amount_due)
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClassMonthlyStats {
  classId: string;
  className: string;
  expectedMonthly: number;
  totalPaid: number;
  totalRemaining: number;
  studentCount: number;
}

export interface GlobalMonthlyStats {
  totalExpectedMonthly: number;
  totalPaid: number;
  totalRemaining: number;
  totalStudents: number;
  classesList: ClassMonthlyStats[];
}

/**
 * Charge les statistiques de paiement depuis la DB
 * Utilise prorated_amount_due et billable_months pour un calcul mensuel précis
 */
export const useMonthlyPaymentStats = (schoolId?: string, schoolYearId?: string) => {
  const { data: statsData, isLoading } = useQuery({
    queryKey: ['monthly-payment-stats', schoolId, schoolYearId],
    queryFn: async () => {
      if (!schoolId || !schoolYearId) return null;

      // Charger les élèves avec leurs progrès de paiement et classe
      const { data: students, error } = await supabase
        .from('students_school')
        .select(`
          id,
          class_id,
          classes:class_id(name),
          school_student_payment_progress!inner(
            total_amount_due,
            total_amount_paid,
            remaining_amount,
            billable_months,
            prorated_amount_due
          )
        `)
        .eq('school_id', schoolId)
        .eq('school_year_id', schoolYearId)
        .eq('status', 'active');

      if (error) throw error;
      return students || [];
    },
    enabled: !!schoolId && !!schoolYearId,
  });

  const stats = useMemo(() => {
    if (!statsData) {
      return {
        totalExpectedMonthly: 0,
        totalPaid: 0,
        totalRemaining: 0,
        totalStudents: 0,
        classesList: [],
      } as GlobalMonthlyStats;
    }

    // Grouper par classe
    const classesByClassId = new Map<string, {
      className: string;
      students: any[];
    }>();

    statsData.forEach((student: any) => {
      const classId = student.class_id || 'no-class';
      const className = student.classes?.name || 'Sans classe';
      
      if (!classesByClassId.has(classId)) {
        classesByClassId.set(classId, {
          className,
          students: []
        });
      }
      
      classesByClassId.get(classId)!.students.push(student);
    });

    // Calculer les stats par classe
    const classesList: ClassMonthlyStats[] = Array.from(classesByClassId.entries()).map(([classId, { className, students }]) => {
      let classTotalDue = 0;
      let classTotalPaid = 0;
      let classTotalRemaining = 0;
      let classExpectedMonthly = 0;

      students.forEach((student: any) => {
        const progress = student.school_student_payment_progress;
        const proratedDue = Number(progress.prorated_amount_due || progress.total_amount_due || 0);
        const billableMonths = Number(progress.billable_months || 1);
        
        classTotalDue += proratedDue;
        classTotalPaid += Number(progress.total_amount_paid || 0);
        classTotalRemaining += Number(progress.remaining_amount || 0);
        
        // Mensualité individuelle basée sur le prorata
        classExpectedMonthly += billableMonths > 0 ? proratedDue / billableMonths : 0;
      });

      return {
        classId,
        className,
        expectedMonthly: classExpectedMonthly,
        totalPaid: classTotalPaid,
        totalRemaining: classTotalRemaining,
        studentCount: students.length,
      };
    });

    const globalStats = classesList.reduce(
      (acc, classStats) => ({
        totalExpectedMonthly: acc.totalExpectedMonthly + classStats.expectedMonthly,
        totalPaid: acc.totalPaid + classStats.totalPaid,
        totalRemaining: acc.totalRemaining + classStats.totalRemaining,
        totalStudents: acc.totalStudents + classStats.studentCount,
        classesList: [...acc.classesList, classStats],
      }),
      {
        totalExpectedMonthly: 0,
        totalPaid: 0,
        totalRemaining: 0,
        totalStudents: 0,
        classesList: [] as ClassMonthlyStats[],
      }
    );

    return globalStats;
  }, [statsData]);

  return { stats, isLoading };
};
