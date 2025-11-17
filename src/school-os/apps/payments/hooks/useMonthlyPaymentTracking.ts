/**
 * Hook pour le suivi mensuel des paiements
 * Calcule automatiquement le statut de paiement par mois pour chaque élève
 */
import { useMemo } from 'react';
import { useSchoolStudents } from './usePayments';
import { useStudentPayments } from './usePayments';
import { calculateDiscountedAmount } from './useFamilyPayments';

export interface MonthlyPaymentStatus {
  month: string; // Format: "2025-01" pour janvier 2025
  monthLabel: string; // Format: "Janvier 2025"
  expectedAmount: number;
  paidAmount: number;
  status: 'paid' | 'partial' | 'unpaid' | 'late';
  isPastDue: boolean;
}

export interface StudentMonthlyTracking {
  student: any;
  monthlyFee: number;
  months: MonthlyPaymentStatus[];
  totalMonthsPaid: number;
  totalMonthsLate: number;
  overallStatus: 'up_to_date' | 'partial' | 'late';
}

const SCHOOL_MONTHS = 9; // 9 mois d'année scolaire
const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

/**
 * Calcule le suivi mensuel des paiements pour tous les élèves
 */
export const useMonthlyPaymentTracking = (schoolId?: string, schoolYearStart?: Date) => {
  const { data: students = [], isLoading } = useSchoolStudents(schoolId);

  // Date de début d'année scolaire (par défaut septembre de l'année en cours)
  const yearStart = schoolYearStart || new Date(new Date().getFullYear(), 8, 1); // Septembre

  const trackingData = useMemo(() => {
    if (!students.length) return [];

    const currentDate = new Date();
    
    return students.map(student => {
      // Calculer le frais annuel effectif (après remise)
      // Utiliser total_amount_due qui contient déjà le frais annuel avec remise appliquée
      const effectiveAnnualFee = student.total_amount_due || 0;

      const monthlyFee = effectiveAnnualFee / SCHOOL_MONTHS;

      // Générer les 9 mois de l'année scolaire
      const months: MonthlyPaymentStatus[] = [];
      for (let i = 0; i < SCHOOL_MONTHS; i++) {
        const monthDate = new Date(yearStart);
        monthDate.setMonth(yearStart.getMonth() + i);
        
        const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = `${MONTH_NAMES[monthDate.getMonth()]} ${monthDate.getFullYear()}`;
        
        // Déterminer si ce mois est passé
        const isPastDue = monthDate < currentDate;
        
        months.push({
          month: monthKey,
          monthLabel,
          expectedAmount: monthlyFee,
          paidAmount: 0,
          status: 'unpaid',
          isPastDue
        });
      }

      // Calculer combien de mois ont été payés en fonction du total payé
      const totalPaid = student.total_amount_paid || 0;
      const monthsPaidCount = Math.floor(totalPaid / monthlyFee);
      const remainderAmount = totalPaid % monthlyFee;

      // Marquer les mois comme payés
      let totalMonthsPaid = 0;
      let totalMonthsLate = 0;

      for (let i = 0; i < months.length; i++) {
        if (i < monthsPaidCount) {
          months[i].paidAmount = monthlyFee;
          months[i].status = 'paid';
          totalMonthsPaid++;
        } else if (i === monthsPaidCount && remainderAmount > 0) {
          months[i].paidAmount = remainderAmount;
          months[i].status = 'partial';
        } else if (months[i].isPastDue) {
          months[i].status = 'late';
          totalMonthsLate++;
        }
      }

      // Déterminer le statut global
      let overallStatus: 'up_to_date' | 'partial' | 'late' = 'up_to_date';
      if (totalMonthsLate > 0) {
        overallStatus = 'late';
      } else if (months.some(m => m.status === 'partial')) {
        overallStatus = 'partial';
      }

      return {
        student,
        monthlyFee,
        months,
        totalMonthsPaid,
        totalMonthsLate,
        overallStatus
      };
    });
  }, [students, yearStart]);

  return {
    trackingData,
    isLoading,
    yearStart
  };
};

/**
 * Filtre les données de suivi selon différents critères
 */
export const useFilteredTracking = (
  trackingData: StudentMonthlyTracking[],
  filters: {
    status?: 'all' | 'up_to_date' | 'partial' | 'late';
    classId?: string;
    month?: string;
    searchQuery?: string;
  }
) => {
  return useMemo(() => {
    let filtered = [...trackingData];

    // Filtre par statut
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(item => item.overallStatus === filters.status);
    }

    // Filtre par classe
    if (filters.classId) {
      filtered = filtered.filter(item => item.student.class_id === filters.classId);
    }

    // Filtre par mois (élèves en retard pour ce mois)
    if (filters.month) {
      filtered = filtered.filter(item => {
        const monthData = item.months.find(m => m.month === filters.month);
        return monthData && (monthData.status === 'late' || monthData.status === 'partial');
      });
    }

    // Recherche par nom
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        `${item.student.first_name} ${item.student.last_name}`.toLowerCase().includes(query) ||
        item.student.student_code?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [trackingData, filters]);
};
