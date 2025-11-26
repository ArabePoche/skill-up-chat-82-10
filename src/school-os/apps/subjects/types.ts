// Types pour la gestion des matières

export interface Subject {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  color: string;
  school_id: string | null;
  created_at: string;
}

export interface CreateSubjectData {
  name: string;
  code?: string;
  description?: string;
  color?: string;
  school_id: string;
}

export interface UpdateSubjectData {
  name?: string;
  code?: string;
  description?: string;
  color?: string;
}

export interface ClassSubjectAssignment {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string | null;
  coefficient: number;
  created_at: string;
  updated_at: string;
  subjects?: Subject;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  };
}

export interface AssignSubjectToClassData {
  class_id: string;
  subject_id: string;
  coefficient: number;
  teacher_id?: string | null;
}
