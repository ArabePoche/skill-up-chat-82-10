/**
 * Hook pour regrouper les évaluations par classe avec statistiques
 * Fournit les données organisées pour l'affichage en cartes pliables
 */
import { useMemo } from 'react';
import { useEvaluations } from './useEvaluations';

export interface EvaluationWithStatus {
  id: string;
  name: string;
  description?: string;
  evaluation_date: string | null;
  max_score: number;
  coefficient: number;
  include_in_average: boolean;
  class_subject_id: string;
  evaluation_type_id: string | null;
  evaluation_type_name: string;
  subject_id: string;
  subject_name: string;
  class_id: string;
  class_name: string;
  status: 'ongoing' | 'upcoming' | 'past';
  daysUntil: number | null;
  // TODO: Ces champs seront ajoutés quand les tables seront disponibles
  room?: string;
  start_time?: string;
  end_time?: string;
  participants_count?: number;
  excluded_count?: number;
}

export interface ClassEvaluationGroup {
  class_id: string;
  class_name: string;
  evaluations: EvaluationWithStatus[];
  stats: {
    total: number;
    ongoing: number;
    upcoming: number;
    past: number;
    nextEvaluation: EvaluationWithStatus | null;
  };
}

const getEvaluationStatus = (evaluationDate: string | null): { status: 'ongoing' | 'upcoming' | 'past'; daysUntil: number | null } => {
  if (!evaluationDate) {
    return { status: 'upcoming', daysUntil: null };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const evalDate = new Date(evaluationDate);
  evalDate.setHours(0, 0, 0, 0);
  
  const diffTime = evalDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { status: 'past', daysUntil: diffDays };
  } else if (diffDays === 0) {
    return { status: 'ongoing', daysUntil: 0 };
  } else {
    return { status: 'upcoming', daysUntil: diffDays };
  }
};

export const useEvaluationsGroupedByClass = (schoolId?: string, schoolYearId?: string) => {
  const { data: evaluations = [], isLoading, error } = useEvaluations(schoolId, schoolYearId);

  const groupedEvaluations = useMemo(() => {
    if (!evaluations.length) return [];

    // Transformer les évaluations avec leur statut
    const evaluationsWithStatus: EvaluationWithStatus[] = evaluations.map((item: any) => {
      const { status, daysUntil } = getEvaluationStatus(item.evaluation_date);
      
      return {
        id: item.id,
        name: item.name,
        description: item.description,
        evaluation_date: item.evaluation_date,
        max_score: item.max_score,
        coefficient: item.coefficient,
        include_in_average: item.include_in_average,
        class_subject_id: item.class_subject_id,
        evaluation_type_id: item.evaluation_type_id,
        evaluation_type_name: item.school_evaluation_types?.name || 'Type inconnu',
        subject_id: item.class_subjects?.subjects?.id || '',
        subject_name: item.class_subjects?.subjects?.name || 'Matière inconnue',
        class_id: item.class_subjects?.classes?.id || '',
        class_name: item.class_subjects?.classes?.name || 'Classe inconnue',
        status,
        daysUntil,
      };
    });

    // Grouper par classe
    const groupedMap = new Map<string, EvaluationWithStatus[]>();
    
    evaluationsWithStatus.forEach((evaluation) => {
      const key = evaluation.class_id;
      if (!groupedMap.has(key)) {
        groupedMap.set(key, []);
      }
      groupedMap.get(key)!.push(evaluation);
    });

    // Créer les groupes avec statistiques
    const groups: ClassEvaluationGroup[] = Array.from(groupedMap.entries()).map(([classId, evals]) => {
      // Trier : en cours > à venir > passées
      const sortedEvals = [...evals].sort((a, b) => {
        const statusOrder = { ongoing: 0, upcoming: 1, past: 2 };
        if (statusOrder[a.status] !== statusOrder[b.status]) {
          return statusOrder[a.status] - statusOrder[b.status];
        }
        // Pour les évaluations du même statut, trier par date
        if (!a.evaluation_date && !b.evaluation_date) return 0;
        if (!a.evaluation_date) return 1;
        if (!b.evaluation_date) return -1;
        return new Date(a.evaluation_date).getTime() - new Date(b.evaluation_date).getTime();
      });

      const ongoing = evals.filter(e => e.status === 'ongoing').length;
      const upcoming = evals.filter(e => e.status === 'upcoming').length;
      const past = evals.filter(e => e.status === 'past').length;

      // Trouver la prochaine évaluation (à venir ou en cours)
      const nextEvaluation = sortedEvals.find(e => e.status === 'upcoming' || e.status === 'ongoing') || null;

      return {
        class_id: classId,
        class_name: evals[0]?.class_name || 'Classe inconnue',
        evaluations: sortedEvals,
        stats: {
          total: evals.length,
          ongoing,
          upcoming,
          past,
          nextEvaluation,
        },
      };
    });

    // Trier les groupes par nom de classe
    return groups.sort((a, b) => a.class_name.localeCompare(b.class_name));
  }, [evaluations]);

  return {
    groupedEvaluations,
    isLoading,
    error,
    totalEvaluations: evaluations.length,
  };
};
