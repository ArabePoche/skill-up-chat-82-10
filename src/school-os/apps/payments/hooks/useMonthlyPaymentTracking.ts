/**
 * Hook pour le suivi mensuel des paiements
 * Calcule automatiquement le statut de paiement par mois pour chaque élève
 * Les remises sont déjà appliquées dans total_amount_due
 */
import { useMemo } from 'react';
import { useSchoolStudents } from './usePayments';
import { useStudentPayments } from './usePayments';
import { useCurrentSchoolYear } from '@/school/hooks/useSchool';

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

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

/**
 * Calcule le nombre de mois entre deux dates
 */
const getMonthsBetweenDates = (startDate: Date, endDate: Date): number => {
  const years = endDate.getFullYear() - startDate.getFullYear();
  const months = endDate.getMonth() - startDate.getMonth();
  return years * 12 + months + 1; // +1 pour inclure le mois de début
};

/**
 * Calcule le suivi mensuel des paiements pour tous les élèves
 */
export const useMonthlyPaymentTracking = (schoolId?: string) => {
  const { data: students = [], isLoading } = useSchoolStudents(schoolId);
  const { data: schoolYear } = useCurrentSchoolYear(schoolId);

  const trackingData = useMemo(() => {
    if (!students.length || !schoolYear) return [];

    // Utiliser les dates de l'année scolaire
    const yearStart = new Date(schoolYear.start_date);
    const yearEnd = new Date(schoolYear.end_date);
    const currentDate = new Date();
    
    // Calculer le nombre de mois dans l'année scolaire
    const schoolMonths = getMonthsBetweenDates(yearStart, yearEnd);
    
    return students.map(student => {
      // Le montant total_amount_due contient déjà la remise appliquée côté serveur
      // grâce à la fonction calculate_amount_with_discount dans la DB
      const effectiveAnnualFee = student.total_amount_due || 0;

      const monthlyFee = effectiveAnnualFee / schoolMonths;

      // Générer les mois de l'année scolaire
      const months: MonthlyPaymentStatus[] = [];
      for (let i = 0; i < schoolMonths; i++) {
        const monthDate = new Date(yearStart);
        monthDate.setMonth(yearStart.getMonth() + i);
        
        const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = `${MONTH_NAMES[monthDate.getMonth()]} ${monthDate.getFullYear()}`;
        
        // Un mois est en retard si :
        // 1. La date du mois est passée
        // 2. ET ce n'est pas le mois en cours (on laisse jusqu'à la fin du mois)
        const monthEndDate = new Date(monthDate);
        monthEndDate.setMonth(monthEndDate.getMonth() + 1);
        monthEndDate.setDate(0); // Dernier jour du mois
        const isPastDue = monthEndDate < currentDate;
        
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
          // Un élève est en retard si le mois précédent n'est pas totalement payé
          const previousMonth = i > 0 ? months[i - 1] : null;
          if (previousMonth && previousMonth.status !== 'paid') {
            months[i].status = 'late';
            totalMonthsLate++;
          } else if (i === 0 || (previousMonth && previousMonth.status === 'paid')) {
            months[i].status = 'late';
            totalMonthsLate++;
          }
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
  }, [students, schoolYear]);

  return {
    trackingData,
    isLoading: isLoading || !schoolYear,
    yearStart: schoolYear ? new Date(schoolYear.start_date) : undefined,
    yearEnd: schoolYear ? new Date(schoolYear.end_date) : undefined,
    schoolMonths: schoolYear ? getMonthsBetweenDates(
      new Date(schoolYear.start_date),
      new Date(schoolYear.end_date)
    ) : 0,
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
    if (filters.month && filters.month !== 'all') {
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
