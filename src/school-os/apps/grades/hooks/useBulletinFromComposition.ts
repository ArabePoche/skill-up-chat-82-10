/**
 * Hook pour récupérer les données du bulletin depuis une Composition/Examen
 * - Notes de composition: obligatoires, proviennent de school_composition_notes.composition_note
 * - Notes de classe: optionnelles, proviennent de school_composition_notes.class_note
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CompositionNote {
  id: string;
  student_id: string;
  subject_id: string;
  composition_note: number | null;
  class_note: number | null;
  comment: string | null;
}

export interface StudentWithGrades {
  id: string;
  first_name: string;
  last_name: string;
  student_code?: string;
  photo_url?: string;
}

export interface ClassSubject {
  id: string;
  name: string;
  coefficient: number;
}

export interface CompositionBulletinData {
  compositionId: string;
  classId: string;
  includeClassNotes: boolean;
  students: StudentWithGrades[];
  subjects: ClassSubject[];
  notes: CompositionNote[];
  excludedStudentIds: string[];
  excludedSubjectIds: string[];
}

/**
 * Hook pour récupérer les compositions disponibles pour une classe
 */
export const useCompositionsForClass = (schoolId?: string, schoolYearId?: string, classId?: string) => {
  return useQuery({
    queryKey: ['compositions-for-class', schoolId, schoolYearId, classId],
    queryFn: async () => {
      if (!schoolId || !schoolYearId) return [];

      // Récupérer les compositions de l'école
      const query = supabase
        .from('school_compositions')
        .select(`
          id,
          title,
          type,
          start_date,
          end_date,
          include_class_notes,
          school_composition_classes!inner(class_id)
        `)
        .eq('school_id', schoolId)
        .eq('school_year_id', schoolYearId)
        .order('created_at', { ascending: false });

      // Si une classe est sélectionnée, filtrer
      if (classId) {
        query.eq('school_composition_classes.class_id', classId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching compositions for class:', error);
        throw error;
      }

      return (data || []).map((comp: any) => ({
        id: comp.id,
        title: comp.title,
        type: comp.type,
        start_date: comp.start_date,
        end_date: comp.end_date,
        include_class_notes: comp.include_class_notes,
      }));
    },
    enabled: !!schoolId && !!schoolYearId,
  });
};

/**
 * Hook pour récupérer les données complètes du bulletin pour une composition et une classe
 */
export const useBulletinFromComposition = (compositionId?: string, classId?: string) => {
  return useQuery({
    queryKey: ['bulletin-from-composition', compositionId, classId],
    queryFn: async (): Promise<CompositionBulletinData | null> => {
      if (!compositionId || !classId) return null;

      // 1. Récupérer la composition
      const { data: composition, error: compError } = await supabase
        .from('school_compositions')
        .select('id, include_class_notes')
        .eq('id', compositionId)
        .single();

      if (compError) throw compError;

      // 2. Récupérer les élèves exclus
      const { data: excludedStudents } = await supabase
        .from('school_composition_excluded_students')
        .select('student_id')
        .eq('composition_id', compositionId);

      const excludedStudentIds = (excludedStudents || []).map(e => e.student_id);

      // 3. Récupérer les matières exclues pour cette classe
      const { data: excludedSubjects } = await supabase
        .from('school_composition_excluded_subjects')
        .select('subject_id')
        .eq('composition_id', compositionId)
        .eq('class_id', classId);

      const excludedSubjectIds = (excludedSubjects || []).map(e => e.subject_id);

      // 4. Récupérer les élèves de la classe (non exclus)
      const { data: students, error: studentsError } = await supabase
        .from('students_school')
        .select('id, first_name, last_name, student_code, photo_url')
        .eq('class_id', classId)
        .order('last_name', { ascending: true });

      if (studentsError) throw studentsError;

      // Filtrer les élèves exclus
      const activeStudents = (students || []).filter(s => !excludedStudentIds.includes(s.id));

      // 5. Récupérer les matières de la classe (non exclues)
      const { data: classSubjects, error: subjectsError } = await supabase
        .from('class_subjects')
        .select(`
          subject_id,
          coefficient,
          subjects(id, name)
        `)
        .eq('class_id', classId);

      if (subjectsError) throw subjectsError;

      const subjects: ClassSubject[] = (classSubjects || [])
        .filter((cs: any) => !excludedSubjectIds.includes(cs.subject_id))
        .map((cs: any) => ({
          id: cs.subject_id,
          name: cs.subjects?.name || 'Matière inconnue',
          coefficient: cs.coefficient || 1,
        }));

      // 6. Récupérer les notes de composition
      const { data: notes, error: notesError } = await supabase
        .from('school_composition_notes')
        .select('id, student_id, subject_id, composition_note, class_note, comment')
        .eq('composition_id', compositionId)
        .eq('class_id', classId);

      if (notesError) throw notesError;

      return {
        compositionId,
        classId,
        includeClassNotes: composition.include_class_notes,
        students: activeStudents,
        subjects,
        notes: notes || [],
        excludedStudentIds,
        excludedSubjectIds,
      };
    },
    enabled: !!compositionId && !!classId,
  });
};

/**
 * Hook pour récupérer les évaluations disponibles pour alimenter les notes de classe
 * (si la méthode "évaluation" est choisie)
 */
export const useEvaluationsForClassNotes = (classId?: string, schoolYearId?: string) => {
  return useQuery({
    queryKey: ['evaluations-for-class-notes', classId, schoolYearId],
    queryFn: async () => {
      if (!classId || !schoolYearId) return [];

      // Get evaluations that have this class configured
      const { data: classConfigs, error: configError } = await supabase
        .from('school_evaluation_class_configs')
        .select('evaluation_id')
        .eq('class_id', classId);

      if (configError) throw configError;
      if (!classConfigs || classConfigs.length === 0) return [];

      const evaluationIds = classConfigs.map(c => c.evaluation_id);

      const { data, error } = await supabase
        .from('school_evaluations')
        .select(`
          id,
          title,
          evaluation_date,
          school_evaluation_types(name)
        `)
        .in('id', evaluationIds)
        .eq('school_year_id', schoolYearId)
        .order('evaluation_date', { ascending: false });

      if (error) throw error;

      return (data || []).map((e: any) => ({
        id: e.id,
        title: e.title,
        evaluation_type_name: e.school_evaluation_types?.name || 'Non défini',
        evaluation_date: e.evaluation_date,
      }));
    },
    enabled: !!classId && !!schoolYearId,
  });
};
