/**
 * Hook pour calculer les statistiques détaillées des paiements mensuels
 * Utilise directement les données de school_student_payment_progress
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
            remaining_amount
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

  const { data: schoolYear } = useQuery({
    queryKey: ['school-year', schoolYearId],
    queryFn: async () => {
      if (!schoolYearId) return null;
      
      const { data, error } = await supabase
        .from('school_years')
        .select('start_date, end_date')
        .eq('id', schoolYearId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!schoolYearId,
  });

  const stats = useMemo(() => {
    if (!statsData || !schoolYear) {
      return {
        totalExpectedMonthly: 0,
        totalPaid: 0,
        totalRemaining: 0,
        totalStudents: 0,
        classesList: [],
      } as GlobalMonthlyStats;
    }

    // Calculer le nombre de mois de l'année scolaire
    const yearStart = new Date(schoolYear.start_date);
    const yearEnd = new Date(schoolYear.end_date);
    const schoolMonths = (yearEnd.getFullYear() - yearStart.getFullYear()) * 12 + 
                         (yearEnd.getMonth() - yearStart.getMonth()) + 1;

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

      students.forEach((student: any) => {
        const progress = student.school_student_payment_progress;
        classTotalDue += Number(progress.total_amount_due || 0);
        classTotalPaid += Number(progress.total_amount_paid || 0);
        classTotalRemaining += Number(progress.remaining_amount || 0);
      });

      const classExpectedMonthly = classTotalDue / schoolMonths;

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
  }, [statsData, schoolYear]);

  return { stats, isLoading };
};
