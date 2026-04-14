/**
 * Hook pour le suivi mensuel des paiements
 * Calcule automatiquement le statut de paiement par mois pour chaque élève
 * Les remises sont déjà appliquées dans total_amount_due
 * Le suivi commence au first_due_month de l'élève (pas au début de l'année scolaire)
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
 * Calcule le premier mois dû pour un élève selon la règle du 10
 * Réplique la logique SQL de calculate_first_due_month
 */
const calculateFirstDueMonth = (enrollmentDate: Date, includeEnrollmentMonth: boolean): Date => {
  const day = enrollmentDate.getDate();
  const monthStart = new Date(enrollmentDate.getFullYear(), enrollmentDate.getMonth(), 1);
  
  // Si arrivée avant ou le 10 : le mois d'arrivée est dû
  if (day <= 10) {
    return monthStart;
  }
  
  // Si arrivée après le 10 : selon le choix utilisateur
  if (includeEnrollmentMonth) {
    return monthStart;
  } else {
    return new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
  }
};

/**
 * Calcule le suivi mensuel des paiements pour tous les élèves
 * Utilise enrollment_date et first_due_month pour ne générer que les mois réellement exigibles
 */
export const useMonthlyPaymentTracking = (schoolId?: string) => {
  const { data: students = [], isLoading } = useSchoolStudents(schoolId);
  const { data: schoolYear } = useCurrentSchoolYear(schoolId);

  const trackingData = useMemo(() => {
    if (!students.length || !schoolYear) return [];

    const yearStart = new Date(schoolYear.start_date);
    const yearEnd = new Date(schoolYear.end_date);
    const currentDate = new Date();
    
    // Nombre total de mois de l'année scolaire
    const totalSchoolMonths = getMonthsBetweenDates(yearStart, yearEnd);
    
    return students.map(student => {
      // Utiliser le montant proratisé (déjà calculé côté DB)
      const effectiveAnnualFee = student.total_amount_due || 0;
      
      // Déterminer le premier mois dû pour cet élève
      const enrollmentDate = student.enrollment_date 
        ? new Date(student.enrollment_date) 
        : new Date(student.created_at);
      const includeEnrollmentMonth = student.include_enrollment_month !== false;
      
      // Utiliser first_due_month de la DB si disponible, sinon calculer
      let firstDueMonth: Date;
      if (student.first_due_month) {
        firstDueMonth = new Date(student.first_due_month);
      } else {
        firstDueMonth = calculateFirstDueMonth(enrollmentDate, includeEnrollmentMonth);
      }
      
      // S'assurer que le premier mois dû n'est pas avant le début de l'année scolaire
      if (firstDueMonth < yearStart) {
        firstDueMonth = new Date(yearStart.getFullYear(), yearStart.getMonth(), 1);
      }
      
      // Nombre de mois exigibles pour cet élève
      const billableMonths = student.billable_months || getMonthsBetweenDates(firstDueMonth, yearEnd);
      
      // Mensualité calculée sur les mois exigibles
      const monthlyFee = billableMonths > 0 ? effectiveAnnualFee / billableMonths : 0;

      // Générer uniquement les mois exigibles (pas toute l'année scolaire)
      const months: MonthlyPaymentStatus[] = [];
      for (let i = 0; i < billableMonths; i++) {
        const monthDate = new Date(firstDueMonth.getFullYear(), firstDueMonth.getMonth() + i, 1);
        
        // Ne pas dépasser la fin de l'année scolaire
        if (monthDate > yearEnd) break;
        
        const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = `${MONTH_NAMES[monthDate.getMonth()]} ${monthDate.getFullYear()}`;
        
        // Un mois est en retard si la date limite est passée
        // Date limite : le 1er du mois suivant
        const deadlineDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
        const isPastDue = deadlineDate < currentDate;
        
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
      const monthsPaidCount = monthlyFee > 0 ? Math.floor(totalPaid / monthlyFee) : 0;
      const remainderAmount = monthlyFee > 0 ? totalPaid % monthlyFee : 0;

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
