/**
 * Hook pour regrouper les évaluations par classe avec statistiques
 * Fournit les données organisées pour l'affichage en cartes pliables
 * 
 * IMPORTANT: Une évaluation peut contenir plusieurs classes et matières.
 * Ce hook transforme les données de school_evaluations + school_evaluation_class_configs
 * pour afficher les évaluations groupées par classe.
 */
import { useMemo } from 'react';
import { useEvaluations } from './useEvaluations';
import { useSchoolSubjects } from '../../subjects/hooks/useSchoolSubjects';

export interface SubjectInfo {
  subject_id: string;
  subject_name: string;
}

export interface EvaluationWithStatus {
  id: string;
  name: string;
  description?: string;
  evaluation_date: string | null;
  max_score: number;
  coefficient: number;
  include_in_average: boolean;
  evaluation_type_id: string | null;
  evaluation_type_name: string;
  class_id: string;
  class_name: string;
  status: 'ongoing' | 'upcoming' | 'past';
  daysUntil: number | null;
  subjects: SubjectInfo[];
  // Config spécifique à la classe
  room?: string;
  start_time?: string;
  end_time?: string;
  excluded_students?: string[];
  supervisors?: string[];
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
  const { data: schoolSubjects = [] } = useSchoolSubjects(schoolId);

  // Créer un map pour accéder rapidement aux noms des matières
  const subjectsMap = useMemo(() => {
    const map = new Map<string, string>();
    schoolSubjects.forEach((s: any) => {
      map.set(s.id, s.name);
    });
    return map;
  }, [schoolSubjects]);

  const groupedEvaluations = useMemo(() => {
    if (!evaluations.length) return [];

    // Transformer chaque évaluation en une ou plusieurs entrées par classe
    const evaluationsByClass: EvaluationWithStatus[] = [];

    evaluations.forEach((evaluation: any) => {
      const classConfigs = evaluation.school_evaluation_class_configs || [];
      
      classConfigs.forEach((config: any) => {
        const classData = config.classes;
        if (!classData) return;

        // Récupérer les matières depuis school_evaluation_class_subjects
        // Utiliser le subjectsMap pour obtenir les noms
        const subjects: SubjectInfo[] = (config.school_evaluation_class_subjects || [])
          .map((cs: any) => ({
            subject_id: cs.subject_id,
            subject_name: subjectsMap.get(cs.subject_id) || 'Matière inconnue',
          }))
          .filter((s: SubjectInfo) => s.subject_id);

        // Date de l'évaluation (priorité: config > evaluation)
        const evalDate = config.evaluation_date || evaluation.evaluation_date;
        const { status, daysUntil } = getEvaluationStatus(evalDate);

        // Récupérer les élèves exclus
        const excludedStudents = (config.school_evaluation_excluded_students || [])
          .map((e: any) => e.student_id);

        // Récupérer les surveillants
        const supervisors = (config.school_evaluation_supervisors || [])
          .map((s: any) => s.supervisor_id);

        evaluationsByClass.push({
          id: evaluation.id,
          name: evaluation.title,
          description: evaluation.description,
          evaluation_date: evalDate,
          max_score: evaluation.max_score || 20,
          coefficient: evaluation.coefficient || 1,
          include_in_average: evaluation.include_in_average ?? true,
          evaluation_type_id: evaluation.evaluation_type_id,
          evaluation_type_name: evaluation.school_evaluation_types?.name || 'Type inconnu',
          class_id: classData.id,
          class_name: classData.name || 'Classe inconnue',
          status,
          daysUntil,
          subjects,
          room: config.room,
          start_time: config.start_time,
          end_time: config.end_time,
          excluded_students: excludedStudents,
          supervisors,
        });
      });
    });

    // Grouper par classe
    const groupedMap = new Map<string, EvaluationWithStatus[]>();
    
    evaluationsByClass.forEach((evaluation) => {
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
  }, [evaluations, subjectsMap]);

  // Compter le nombre total d'évaluations
  const totalLogicalEvaluations = groupedEvaluations.reduce(
    (sum, group) => sum + group.evaluations.length, 
    0
  );

  return {
    groupedEvaluations,
    isLoading,
    error,
    totalEvaluations: totalLogicalEvaluations,
  };
};
