/**
 * Hook pour récupérer les bulletins d'un enfant par période
 * Utilisé dans la vue parent pour afficher les bulletins par grading period
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CompositionPeriod {
  id: string;
  title: string;
  type: string;
  start_date: string;
  end_date: string;
  include_class_notes: boolean | null;
}

export interface ParentReportCard {
  id: string;
  grading_period_id: string;
  general_average: number | null;
  rank: number | null;
  mention: string | null;
  teacher_appreciation: string | null;
  principal_appreciation: string | null;
  absences_count: number | null;
  late_count: number | null;
  conduct_grade: string | null;
  generated_at: string;
  pdf_url: string | null;
}

export interface ParentBulletinByPeriod {
  period: CompositionPeriod;
  reportCard: ParentReportCard | null;
}

/**
 * Récupère les compositions (périodes) de l'année scolaire depuis school_compositions
 */
export const useCompositionPeriods = (schoolId?: string, schoolYearId?: string) => {
  return useQuery({
    queryKey: ['composition-periods', schoolId, schoolYearId],
    queryFn: async (): Promise<CompositionPeriod[]> => {
      if (!schoolId || !schoolYearId) return [];

      const { data, error } = await supabase
        .from('school_compositions')
        .select('id, title, type, start_date, end_date, include_class_notes')
        .eq('school_id', schoolId)
        .eq('school_year_id', schoolYearId)
        .order('start_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId && !!schoolYearId,
  });
};

/**
 * Récupère les bulletins d'un élève pour toutes les périodes
 */
export const useParentBulletins = (
  schoolId?: string,
  schoolYearId?: string,
  studentId?: string
) => {
  const { data: periods, isLoading: isLoadingPeriods } = useCompositionPeriods(schoolId, schoolYearId);

  const { data: reportCards, isLoading: isLoadingReports } = useQuery({
    queryKey: ['parent-report-cards', schoolId, schoolYearId, studentId],
    queryFn: async (): Promise<ParentReportCard[]> => {
      if (!schoolId || !schoolYearId || !studentId) return [];

      const { data, error } = await supabase
        .from('school_report_card_history')
        .select(`
          id, grading_period_id, general_average, rank, mention,
          teacher_appreciation, principal_appreciation,
          absences_count, late_count, conduct_grade,
          generated_at, pdf_url
        `)
        .eq('school_id', schoolId)
        .eq('school_year_id', schoolYearId)
        .eq('student_id', studentId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId && !!schoolYearId && !!studentId,
  });

  // Combiner périodes + bulletins
  const bulletinsByPeriod: ParentBulletinByPeriod[] = (periods || []).map((period) => ({
    period,
    reportCard: reportCards?.find((rc) => rc.grading_period_id === period.id) || null,
  }));

  return {
    data: bulletinsByPeriod,
    isLoading: isLoadingPeriods || isLoadingReports,
    periods,
    reportCards,
  };
};
