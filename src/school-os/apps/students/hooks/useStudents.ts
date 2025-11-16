// Hook pour gérer les requêtes des élèves
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Student {
  id: string;
  school_id: string;
  class_id: string | null;
  school_year_id: string;
  family_id: string | null;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: 'male' | 'female';
  student_code: string | null;
  photo_url: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  parent_email: string | null;
  address: string | null;
  city: string | null;
  medical_notes: string | null;
  status: 'active' | 'inactive' | 'transferred';
  discount_percentage: number | null;
  discount_amount: number | null;
  created_at: string;
  updated_at: string;
  classes?: {
    name: string;
    cycle: string;
  };
  school_student_families?: {
    family_name: string;
  };
}

export interface NewStudent {
  school_id: string;
  class_id?: string | null;
  school_year_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: 'male' | 'female';
  student_code?: string;
  photo_url?: string;
  parent_name?: string;
  parent_phone?: string;
  parent_email?: string;
  address?: string;
  city?: string;
  medical_notes?: string;
  status?: 'active' | 'inactive' | 'transferred';
  discount_percentage?: number;
  discount_amount?: number;
}

export const useStudents = (schoolId?: string) => {
  return useQuery<any[]>({
    queryKey: ['students', schoolId],
    queryFn: async () => {
      let query = supabase
        .from('students_school')
        .select('*, classes(name, cycle), school_years(year_label), school_student_families(family_name)')
        .order('created_at', { ascending: false });

      if (schoolId) {
        query = query.eq('school_id', schoolId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId,
  });
};

// Fonction pour générer un UID alphanumérique aléatoire sécurisé
const generateSecureUID = (length: number = 6): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let uid = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  
  for (let i = 0; i < length; i++) {
    uid += chars[array[i] % chars.length];
  }
  
  return uid;
};

// Fonction pour générer l'identifiant étudiant unique globalement sur toute la plateforme
// Format: AAAA-M/F-PXXXXXXN
// AAAA = année, M/F = sexe, P = première lettre prénom, XXXXXX = UID aléatoire, N = première lettre nom
const generateStudentCode = async (
  schoolId: string,
  firstName: string,
  lastName: string,
  gender: 'male' | 'female'
): Promise<string> => {
  const year = new Date().getFullYear();
  const genderCode = gender === 'male' ? 'M' : 'F';
  const firstLetterFirstName = firstName.charAt(0).toUpperCase();
  const firstLetterLastName = lastName.charAt(0).toUpperCase();

  // Générer un matricule unique avec vérification dans la base
  let studentCode = '';
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 100; // Sécurité pour éviter une boucle infinie

  while (!isUnique && attempts < maxAttempts) {
    // Générer un UID aléatoire sécurisé
    const uid = generateSecureUID(6);
    
    // Construire le matricule : AAAA-M/F-PXXXXXXN
    studentCode = `${year}-${genderCode}-${firstLetterFirstName}${uid}${firstLetterLastName}`;
    
    // Vérifier l'unicité dans toute la plateforme
    const { data: existing } = await supabase
      .from('students_school')
      .select('id')
      .eq('student_code', studentCode)
      .maybeSingle();
    
    isUnique = !existing;
    attempts++;
  }

  if (!isUnique) {
    throw new Error('Impossible de générer un matricule unique après plusieurs tentatives');
  }

  return studentCode;
};

export const useAddStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newStudent: NewStudent) => {
      // Générer automatiquement le code étudiant
      const studentCode = await generateStudentCode(
        newStudent.school_id,
        newStudent.first_name,
        newStudent.last_name,
        newStudent.gender
      );

      const { data, error } = await supabase
        .from('students_school')
        .insert({
          ...newStudent,
          student_code: studentCode,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Élève ajouté avec succès');
    },
    onError: (error: any) => {
      toast.error('Erreur lors de l\'ajout de l\'élève: ' + error.message);
    },
  });
};

export const useUpdateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Student> }) => {
      const { data, error } = await supabase
        .from('students_school')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Élève modifié avec succès');
    },
    onError: (error: any) => {
      toast.error('Erreur lors de la modification: ' + error.message);
    },
  });
};

// Hook pour créer plusieurs élèves à la fois
export const useAddStudents = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newStudents: NewStudent[]) => {
      const studentsWithCodes = await Promise.all(
        newStudents.map(async (student) => {
          const studentCode = await generateStudentCode(
            student.school_id,
            student.first_name,
            student.last_name,
            student.gender
          );
          return { ...student, student_code: studentCode };
        })
      );

      const { data, error } = await supabase
        .from('students_school')
        .insert(studentsWithCodes)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success(`${data?.length || 0} élève(s) ajouté(s) avec succès`);
    },
    onError: (error: any) => {
      toast.error('Erreur lors de l\'ajout des élèves: ' + error.message);
    },
  });
};

export const useDeleteStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('students_school')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Élève supprimé avec succès');
    },
    onError: (error: any) => {
      toast.error('Erreur lors de la suppression: ' + error.message);
    },
  });
};
