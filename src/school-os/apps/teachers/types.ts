// Types pour la gestion des enseignants

export type TeacherType = 'generalist' | 'specialist';

export interface Teacher {
  id: string;
  user_id: string;
  school_id: string;
  type: TeacherType;
  specialty?: string; // Pour les spécialistes
  salary?: number; // Salaire mensuel
  phone_number?: string;
  gender?: 'male' | 'female' | 'other';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface TeacherAssignment {
  id: string;
  teacher_id: string;
  class_id?: string; // Pour generalist
  subject_id?: string; // Pour specialist
  created_at: string;
}

export interface TeacherFormData {
  user_id: string;
  type: TeacherType;
  specialty?: string;
  class_id?: string; // Si generalist
  subject_ids?: string[]; // Si specialist
}

export interface TeacherStudentNote {
  id: string;
  school_id: string;
  teacher_id: string;
  student_id: string;
  class_id: string;
  subject_id: string;
  academic_level?: string;
  behavior?: string;
  progress?: string;
  difficulties?: string;
  recommendations?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTeacherNoteData {
  school_id: string;
  teacher_id: string;
  student_id: string;
  class_id: string;
  subject_id: string | null;
  academic_level?: string;
  behavior?: string;
  progress?: string;
  difficulties?: string;
  recommendations?: string;
  custom_title?: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}
