/**
 * Hook pour gérer les notes des compositions
 * Utilise school_composition_notes au lieu de grades
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CompositionNoteInput {
  composition_id: string;
  class_id: string;
  subject_id: string;
  student_id: string;
  composition_note: number | null;
  class_note?: number | null;
  comment?: string;
}

export interface CompositionGradeData {
  students: Array<{
    id: string;
    first_name: string;
    last_name: string;
    student_code?: string;
    photo_url?: string;
  }>;
  subjects: Array<{
    id: string;
    name: string;
    coefficient: number;
  }>;
  notes: Map<string, Map<string, {
    id?: string;
    composition_note: number | null;
    class_note: number | null;
    comment: string | null;
  }>>;
  includeClassNotes: boolean;
}

/**
 * Hook pour récupérer les données de notes d'une composition pour une classe
 */
export const useCompositionGrades = (compositionId?: string, classId?: string) => {
  return useQuery({
    queryKey: ['composition-grades', compositionId, classId],
    queryFn: async (): Promise<CompositionGradeData | null> => {
      if (!compositionId || !classId) return null;

      // 1. Récupérer la composition pour savoir si on inclut les notes de classe
      const { data: composition, error: compError } = await supabase
        .from('school_compositions')
        .select('include_class_notes')
        .eq('id', compositionId)
        .single();

      if (compError) throw compError;

      // 2. Récupérer les élèves exclus
      const { data: excludedStudents } = await supabase
        .from('school_composition_excluded_students')
        .select('student_id')
        .eq('composition_id', compositionId);

      const excludedStudentIds = (excludedStudents || []).map(e => e.student_id);

      // 3. Récupérer les matières exclues
      const { data: excludedSubjects } = await supabase
        .from('school_composition_excluded_subjects')
        .select('subject_id')
        .eq('composition_id', compositionId)
        .eq('class_id', classId);

      const excludedSubjectIds = (excludedSubjects || []).map(e => e.subject_id);

      // 4. Récupérer les élèves de la classe
      const { data: students, error: studentsError } = await supabase
        .from('students_school')
        .select('id, first_name, last_name, student_code, photo_url')
        .eq('class_id', classId)
        .order('last_name', { ascending: true });

      if (studentsError) throw studentsError;

      const activeStudents = (students || []).filter(s => !excludedStudentIds.includes(s.id));

      // 5. Récupérer les matières de la classe
      const { data: classSubjects, error: subjectsError } = await supabase
        .from('class_subjects')
        .select(`
          subject_id,
          coefficient,
          subjects(id, name)
        `)
        .eq('class_id', classId);

      if (subjectsError) throw subjectsError;

      const subjects = (classSubjects || [])
        .filter((cs: any) => !excludedSubjectIds.includes(cs.subject_id))
        .map((cs: any) => ({
          id: cs.subject_id,
          name: cs.subjects?.name || 'Matière inconnue',
          coefficient: cs.coefficient || 1,
        }));

      // 6. Récupérer les notes existantes
      const { data: existingNotes, error: notesError } = await supabase
        .from('school_composition_notes')
        .select('id, student_id, subject_id, composition_note, class_note, comment')
        .eq('composition_id', compositionId)
        .eq('class_id', classId);

      if (notesError) throw notesError;

      // Construire la map des notes (student_id -> subject_id -> note)
      const notesMap = new Map<string, Map<string, {
        id?: string;
        composition_note: number | null;
        class_note: number | null;
        comment: string | null;
      }>>();

      (existingNotes || []).forEach(note => {
        if (!notesMap.has(note.student_id)) {
          notesMap.set(note.student_id, new Map());
        }
        notesMap.get(note.student_id)!.set(note.subject_id, {
          id: note.id,
          composition_note: note.composition_note,
          class_note: note.class_note,
          comment: note.comment,
        });
      });

      return {
        students: activeStudents,
        subjects,
        notes: notesMap,
        includeClassNotes: composition.include_class_notes,
      };
    },
    enabled: !!compositionId && !!classId,
  });
};

/**
 * Hook pour sauvegarder les notes de composition
 */
export const useSaveCompositionNotes = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notes: CompositionNoteInput[]) => {
      if (notes.length === 0) return;

      const { data: { user } } = await supabase.auth.getUser();

      // Upsert les notes
      const { error } = await supabase
        .from('school_composition_notes')
        .upsert(
          notes.map(note => ({
            composition_id: note.composition_id,
            class_id: note.class_id,
            subject_id: note.subject_id,
            student_id: note.student_id,
            composition_note: note.composition_note,
            class_note: note.class_note ?? null,
            comment: note.comment || null,
            entered_by: user?.id,
          })),
          { 
            onConflict: 'composition_id,class_id,subject_id,student_id',
            ignoreDuplicates: false 
          }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Notes enregistrées');
      queryClient.invalidateQueries({ queryKey: ['composition-grades'] });
      queryClient.invalidateQueries({ queryKey: ['bulletin-from-composition'] });
    },
    onError: (error) => {
      console.error('Error saving composition notes:', error);
      toast.error('Erreur lors de l\'enregistrement');
    },
  });
};
