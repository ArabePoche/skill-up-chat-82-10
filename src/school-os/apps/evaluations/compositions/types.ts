/**
 * Types pour les compositions et examens officiels
 * Ces évaluations sont utilisées exclusivement pour générer les bulletins
 */

export type CompositionType = 'composition' | 'trimestre' | 'semestre' | 'examen' | 'session';

export interface Composition {
  id: string;
  school_id: string;
  school_year_id: string;
  title: string;
  type: CompositionType;
  start_date: string | null;
  end_date: string | null;
  include_class_notes: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompositionClass {
  id: string;
  composition_id?: string;
  class_id: string;
  created_at?: string;
  classes?: { id: string; name: string };
}

export interface CompositionExcludedStudent {
  id: string;
  composition_id?: string;
  student_id: string;
  created_at?: string;
}

export interface CompositionExcludedSubject {
  id: string;
  composition_id?: string;
  class_id: string;
  subject_id: string;
  created_at?: string;
}

export interface CreateCompositionData {
  title: string;
  type: CompositionType;
  start_date?: string;
  end_date?: string;
  include_class_notes?: boolean;
  class_ids: string[];
  excluded_subjects: { class_id: string; subject_id: string }[];
  excluded_students: string[];
}

export interface CompositionWithRelations extends Composition {
  school_composition_classes?: CompositionClass[];
  school_composition_excluded_students?: CompositionExcludedStudent[];
  school_composition_excluded_subjects?: CompositionExcludedSubject[];
}
