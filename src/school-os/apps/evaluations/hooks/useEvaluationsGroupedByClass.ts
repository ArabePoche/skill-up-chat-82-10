/**
 * Hook pour regrouper les évaluations par classe avec statistiques
 * Fournit les données organisées pour l'affichage en cartes pliables
 * 
 * IMPORTANT: Une évaluation peut contenir plusieurs matières.
 * Ce hook regroupe les enregistrements DB par (name + date + type + class) 
 * pour afficher une seule évaluation avec ses matières.
 */
import { useMemo } from 'react';
import { useEvaluations } from './useEvaluations';

export interface SubjectInfo {
  subject_id: string;
  subject_name: string;
  class_subject_id: string;
  evaluation_record_id: string; // ID de l'enregistrement DB pour cette matière
}

export interface EvaluationWithStatus {
  id: string; // ID du premier enregistrement (pour compatibilité)
  evaluation_ids: string[]; // Tous les IDs des enregistrements DB
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
  // Liste des matières incluses dans cette évaluation
  subjects: SubjectInfo[];
  // Champs legacy pour compatibilité
  class_subject_id: string;
  subject_id: string;
  subject_name: string;
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

/**
 * Génère une clé unique pour identifier une évaluation logique
 * basée sur: nom + date + type + classe
 */
const generateEvaluationKey = (item: any): string => {
  const classId = item.class_subjects?.classes?.id || '';
  const name = item.name || '';
  const date = item.evaluation_date || 'no-date';
  const typeId = item.evaluation_type_id || 'no-type';
  
  return `${classId}|${name}|${date}|${typeId}`;
};

export const useEvaluationsGroupedByClass = (schoolId?: string, schoolYearId?: string) => {
  const { data: evaluations = [], isLoading, error } = useEvaluations(schoolId, schoolYearId);

  const groupedEvaluations = useMemo(() => {
    if (!evaluations.length) return [];

    // Étape 1: Regrouper les enregistrements DB par évaluation logique
    const evaluationMap = new Map<string, any[]>();
    
    evaluations.forEach((item: any) => {
      const key = generateEvaluationKey(item);
      if (!evaluationMap.has(key)) {
        evaluationMap.set(key, []);
      }
      evaluationMap.get(key)!.push(item);
    });

    // Étape 2: Transformer chaque groupe en une seule évaluation avec ses matières
    const mergedEvaluations: EvaluationWithStatus[] = [];
    
    evaluationMap.forEach((records) => {
      if (records.length === 0) return;
      
      const firstRecord = records[0];
      const { status, daysUntil } = getEvaluationStatus(firstRecord.evaluation_date);
      
      // Collecter toutes les matières
      const subjects: SubjectInfo[] = records.map((record: any) => ({
        subject_id: record.class_subjects?.subjects?.id || '',
        subject_name: record.class_subjects?.subjects?.name || 'Matière inconnue',
        class_subject_id: record.class_subject_id,
        evaluation_record_id: record.id,
      }));
      
      // Collecter tous les IDs des enregistrements
      const evaluationIds = records.map((r: any) => r.id);
      
      mergedEvaluations.push({
        id: firstRecord.id,
        evaluation_ids: evaluationIds,
        name: firstRecord.name,
        description: firstRecord.description,
        evaluation_date: firstRecord.evaluation_date,
        max_score: firstRecord.max_score,
        coefficient: firstRecord.coefficient,
        include_in_average: firstRecord.include_in_average,
        evaluation_type_id: firstRecord.evaluation_type_id,
        evaluation_type_name: firstRecord.school_evaluation_types?.name || 'Type inconnu',
        class_id: firstRecord.class_subjects?.classes?.id || '',
        class_name: firstRecord.class_subjects?.classes?.name || 'Classe inconnue',
        status,
        daysUntil,
        subjects,
        // Champs legacy (premier enregistrement pour compatibilité)
        class_subject_id: firstRecord.class_subject_id,
        subject_id: firstRecord.class_subjects?.subjects?.id || '',
        subject_name: subjects.map(s => s.subject_name).join(', '),
      });
    });

    // Étape 3: Grouper par classe
    const groupedMap = new Map<string, EvaluationWithStatus[]>();
    
    mergedEvaluations.forEach((evaluation) => {
      const key = evaluation.class_id;
      if (!groupedMap.has(key)) {
        groupedMap.set(key, []);
      }
      groupedMap.get(key)!.push(evaluation);
    });

    // Étape 4: Créer les groupes avec statistiques
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

  // Compter le nombre total d'évaluations logiques (pas d'enregistrements DB)
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
