// Types pour la gestion des enseignants

export interface Teacher {
  id: string;
  user_id: string;
  school_id: string;
  type: 'generalist' | 'specialist';
  specialty?: string; // Pour les spécialistes
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
  class_id?: string; // Pour généraliste
  subject_id?: string; // Pour spécialiste
  created_at: string;
}

export interface TeacherFormData {
  user_id: string;
  type: 'generalist' | 'specialist';
  specialty?: string;
  class_id?: string; // Si généraliste
  subject_ids?: string[]; // Si spécialiste
}
