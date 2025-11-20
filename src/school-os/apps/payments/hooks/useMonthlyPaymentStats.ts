/**
 * Hook pour calculer les statistiques détaillées des paiements mensuels
 * Calcule les montants par classe et globaux
 */
import { useMemo } from 'react';
import { StudentMonthlyTracking } from './useMonthlyPaymentTracking';

export interface ClassMonthlyStats {
  classId: string;
  className: string;
  expectedMonthly: number;
  totalPaid: number;
  totalRemaining: number;
  currentMonthExpected: number;
  currentMonthPaid: number;
  currentMonthRemaining: number;
  studentCount: number;
}

export interface GlobalMonthlyStats {
  totalExpectedMonthly: number;
  totalPaid: number;
  totalRemaining: number;
  currentMonthExpected: number;
  currentMonthPaid: number;
  currentMonthRemaining: number;
  totalStudents: number;
  classesList: ClassMonthlyStats[];
}

/**
 * Calcule les statistiques mensuelles détaillées
 */
export const useMonthlyPaymentStats = (
  trackingData: StudentMonthlyTracking[],
  schoolMonths: number
) => {
  const stats = useMemo(() => {
    if (!trackingData.length || !schoolMonths) {
      return {
        totalExpectedMonthly: 0,
        totalPaid: 0,
        totalRemaining: 0,
        currentMonthExpected: 0,
        currentMonthPaid: 0,
        currentMonthRemaining: 0,
        totalStudents: 0,
        classesList: [],
      } as GlobalMonthlyStats;
    }

    // Obtenir le mois actuel au format YYYY-MM
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    // Grouper par classe
    const classesByClassId = new Map<string, {
      className: string;
      students: StudentMonthlyTracking[];
    }>();

    trackingData.forEach(tracking => {
      const classId = tracking.student.class_id || 'no-class';
      const className = tracking.student.class?.name || 'Sans classe';
      
      if (!classesByClassId.has(classId)) {
        classesByClassId.set(classId, {
          className,
          students: []
        });
      }
      
      classesByClassId.get(classId)!.students.push(tracking);
    });

    // Calculer les stats par classe
    const classesList: ClassMonthlyStats[] = Array.from(classesByClassId.entries()).map(([classId, { className, students }]) => {
      let classExpectedMonthly = 0;
      let classTotalPaid = 0;
      let classCurrentMonthExpected = 0;
      let classCurrentMonthPaid = 0;

      students.forEach(tracking => {
        const monthlyFee = tracking.monthlyFee;
        const totalPaid = tracking.student.total_amount_paid || 0;
        
        // Montant attendu par mois
        classExpectedMonthly += monthlyFee;
        classTotalPaid += totalPaid;

        // Pour le mois actuel
        const currentMonthData = tracking.months.find(m => m.month === currentMonth);
        if (currentMonthData) {
          classCurrentMonthExpected += currentMonthData.expectedAmount;
          classCurrentMonthPaid += currentMonthData.paidAmount;
        }
      });

      return {
        classId,
        className,
        expectedMonthly: classExpectedMonthly,
        totalPaid: classTotalPaid,
        totalRemaining: (classExpectedMonthly * schoolMonths) - classTotalPaid,
        currentMonthExpected: classCurrentMonthExpected,
        currentMonthPaid: classCurrentMonthPaid,
        currentMonthRemaining: classCurrentMonthExpected - classCurrentMonthPaid,
        studentCount: students.length,
      };
    });

    // Calculer les stats globales
    const globalStats = classesList.reduce(
      (acc, classStats) => ({
        totalExpectedMonthly: acc.totalExpectedMonthly + classStats.expectedMonthly,
        totalPaid: acc.totalPaid + classStats.totalPaid,
        totalRemaining: acc.totalRemaining + classStats.totalRemaining,
        currentMonthExpected: acc.currentMonthExpected + classStats.currentMonthExpected,
        currentMonthPaid: acc.currentMonthPaid + classStats.currentMonthPaid,
        currentMonthRemaining: acc.currentMonthRemaining + classStats.currentMonthRemaining,
        totalStudents: acc.totalStudents + classStats.studentCount,
        classesList: [...acc.classesList, classStats],
      }),
      {
        totalExpectedMonthly: 0,
        totalPaid: 0,
        totalRemaining: 0,
        currentMonthExpected: 0,
        currentMonthPaid: 0,
        currentMonthRemaining: 0,
        totalStudents: 0,
        classesList: [] as ClassMonthlyStats[],
      }
    );

    return globalStats;
  }, [trackingData, schoolMonths]);

  return stats;
};
