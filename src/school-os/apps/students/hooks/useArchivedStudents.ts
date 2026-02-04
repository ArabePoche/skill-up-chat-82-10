// Hook pour gérer les élèves archivés (exclus ou transférés)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ArchiveReason = 'exclusion' | 'transfer' | 'other';

export interface ArchivedStudent {
  id: string;
  original_student_id: string;
  school_id: string;
  class_id: string | null;
  school_year_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  student_code: string | null;
  photo_url: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  parent_email: string | null;
  address: string | null;
  city: string | null;
  medical_notes: string | null;
  family_id: string | null;
  discount_percentage: number | null;
  discount_amount: number | null;
  father_name: string | null;
  mother_name: string | null;
  mother_occupation: string | null;
  father_occupation: string | null;
  birth_place: string | null;
  observations: string | null;
  archive_reason: ArchiveReason;
  archive_comment: string | null;
  target_school_id: string | null;
  target_school_name: string | null;
  archived_at: string;
  archived_by: string | null;
  is_restored: boolean;
  restored_at: string | null;
  restored_by: string | null;
  restored_to_class_id: string | null;
  created_at: string;
  updated_at: string;
  // Relations jointes
  classes?: { name: string; cycle: string } | null;
  target_school?: { name: string } | null;
}

// Récupérer les élèves archivés d'une école
export const useArchivedStudents = (schoolId?: string) => {
  return useQuery({
    queryKey: ['archived-students', schoolId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('archived_students' as any)
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_restored', false)
        .order('archived_at', { ascending: false }) as any);

      if (error) throw error;
      return (data || []) as ArchivedStudent[];
    },
    enabled: !!schoolId,
  });
};

// Archiver un élève
export interface ArchiveStudentInput {
  student: any; // Données complètes de l'élève
  archive_reason: ArchiveReason;
  archive_comment?: string;
  target_school_id?: string | null;
  target_school_name?: string | null;
  archived_by: string;
}

export const useArchiveStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ArchiveStudentInput) => {
      const { student, archive_reason, archive_comment, target_school_id, target_school_name, archived_by } = input;

      // 1. Créer l'entrée dans archived_students
      const { data: archivedData, error: archiveError } = await (supabase
        .from('archived_students' as any)
        .insert({
          original_student_id: student.id,
          school_id: student.school_id,
          class_id: student.class_id,
          school_year_id: student.school_year_id,
          first_name: student.first_name,
          last_name: student.last_name,
          date_of_birth: student.date_of_birth,
          gender: student.gender,
          student_code: student.student_code,
          photo_url: student.photo_url,
          parent_name: student.parent_name,
          parent_phone: student.parent_phone,
          parent_email: student.parent_email,
          address: student.address,
          city: student.city,
          medical_notes: student.medical_notes,
          family_id: student.family_id,
          discount_percentage: student.discount_percentage,
          discount_amount: student.discount_amount,
          father_name: student.father_name,
          mother_name: student.mother_name,
          mother_occupation: student.mother_occupation,
          father_occupation: student.father_occupation,
          birth_place: student.birth_place,
          observations: student.observations,
          archive_reason,
          archive_comment,
          target_school_id,
          target_school_name,
          archived_by,
        })
        .select()
        .single() as any);

      if (archiveError) throw archiveError;

      // 2. Supprimer l'élève de la table students_school
      const { error: deleteError } = await supabase
        .from('students_school')
        .delete()
        .eq('id', student.id);

      if (deleteError) {
        // Rollback: supprimer l'archive créée
        await (supabase
          .from('archived_students' as any)
          .delete()
          .eq('id', archivedData.id) as any);
        throw deleteError;
      }

      return archivedData;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['archived-students'] });
      
      const message = variables.archive_reason === 'exclusion' 
        ? 'Élève exclu et archivé avec succès'
        : variables.archive_reason === 'transfer'
        ? 'Élève transféré et archivé avec succès'
        : 'Élève archivé avec succès';
      
      toast.success(message);
    },
    onError: (error: any) => {
      console.error('Error archiving student:', error);
      toast.error('Erreur lors de l\'archivage: ' + error.message);
    },
  });
};

// Restaurer un élève archivé
export interface RestoreStudentInput {
  archivedStudentId: string;
  targetClassId: string;
  restoredBy: string;
}

export const useRestoreStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RestoreStudentInput) => {
      const { archivedStudentId, targetClassId, restoredBy } = input;

      // 1. Récupérer les données archivées
      const { data: archivedStudent, error: fetchError } = await (supabase
        .from('archived_students' as any)
        .select('*')
        .eq('id', archivedStudentId)
        .single() as any);

      if (fetchError) throw fetchError;

      // 2. Réinsérer l'élève dans students_school
      const { data: restoredStudent, error: insertError } = await supabase
        .from('students_school')
        .insert({
          school_id: archivedStudent.school_id,
          class_id: targetClassId,
          school_year_id: archivedStudent.school_year_id,
          first_name: archivedStudent.first_name,
          last_name: archivedStudent.last_name,
          date_of_birth: archivedStudent.date_of_birth,
          gender: archivedStudent.gender,
          student_code: archivedStudent.student_code,
          photo_url: archivedStudent.photo_url,
          parent_name: archivedStudent.parent_name,
          parent_phone: archivedStudent.parent_phone,
          parent_email: archivedStudent.parent_email,
          address: archivedStudent.address,
          city: archivedStudent.city,
          medical_notes: archivedStudent.medical_notes,
          family_id: archivedStudent.family_id,
          discount_percentage: archivedStudent.discount_percentage,
          discount_amount: archivedStudent.discount_amount,
          father_name: archivedStudent.father_name,
          mother_name: archivedStudent.mother_name,
          mother_occupation: archivedStudent.mother_occupation,
          father_occupation: archivedStudent.father_occupation,
          birth_place: archivedStudent.birth_place,
          observations: archivedStudent.observations,
          status: 'active',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 3. Marquer l'archive comme restaurée
      const { error: updateError } = await (supabase
        .from('archived_students' as any)
        .update({
          is_restored: true,
          restored_at: new Date().toISOString(),
          restored_by: restoredBy,
          restored_to_class_id: targetClassId,
        })
        .eq('id', archivedStudentId) as any);

      if (updateError) {
        // Rollback: supprimer l'élève restauré
        await supabase
          .from('students_school')
          .delete()
          .eq('id', restoredStudent.id);
        throw updateError;
      }

      return restoredStudent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['archived-students'] });
      toast.success('Élève restauré avec succès');
    },
    onError: (error: any) => {
      console.error('Error restoring student:', error);
      toast.error('Erreur lors de la restauration: ' + error.message);
    },
  });
};

// Supprimer définitivement un élève archivé
export const useDeleteArchivedStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (archivedStudentId: string) => {
      const { error } = await (supabase
        .from('archived_students' as any)
        .delete()
        .eq('id', archivedStudentId) as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archived-students'] });
      toast.success('Élève supprimé définitivement');
    },
    onError: (error: any) => {
      console.error('Error deleting archived student:', error);
      toast.error('Erreur lors de la suppression: ' + error.message);
    },
  });
};
