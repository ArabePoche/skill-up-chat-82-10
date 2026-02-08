// Hook pour gérer les élèves archivés (exclus ou transférés)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
 
 // Fonction pour créer une demande de transfert
 const createTransferRequestInDb = async (input: {
   archived_student_id: string;
   source_school_id: string;
   target_school_id: string;
   source_school_name?: string | null;
   target_school_name?: string | null;
   student_first_name: string;
   student_last_name: string;
   student_date_of_birth: string;
   student_gender: string;
   student_photo_url?: string | null;
   student_code?: string | null;
   parent_name?: string | null;
   parent_phone?: string | null;
   parent_email?: string | null;
   requested_by: string;
 }) => {
  const insertData: Record<string, any> = {
      archived_student_id: input.archived_student_id,
      source_school_id: input.source_school_id,
      target_school_id: input.target_school_id,
      student_first_name: input.student_first_name,
      student_last_name: input.student_last_name,
      student_date_of_birth: input.student_date_of_birth,
      student_gender: input.student_gender,
      student_photo_url: input.student_photo_url || null,
      student_code: input.student_code || null,
      parent_name: input.parent_name || null,
      parent_phone: input.parent_phone || null,
      parent_email: input.parent_email || null,
      requested_by: input.requested_by,
      status: 'pending',
    };
    // N'ajouter les noms d'écoles que s'ils sont définis (colonnes nullable)
    if (input.source_school_name) insertData.source_school_name = input.source_school_name;
    if (input.target_school_name) insertData.target_school_name = input.target_school_name;
 
   const { error } = await (supabase
     .from('student_transfer_requests' as any)
     .insert(insertData) as any);
   
   if (error) throw error;
   return true;
 };

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
   source_school_name?: string | null;
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

      // 2. Supprimer manuellement les paiements AVANT l'élève
      // (les triggers sur school_students_payment tentent de réinsérer dans
      //  school_student_payment_progress, ce qui échoue si l'élève est déjà supprimé)
      const { error: paymentDeleteError } = await (supabase
        .from('school_students_payment' as any)
        .delete()
        .eq('student_id', student.id) as any);

      if (paymentDeleteError) {
        console.warn('Error deleting payments (non-blocking):', paymentDeleteError);
      }

      // 3. Supprimer la progression de paiement (créée/mise à jour par le trigger ci-dessus)
      const { error: progressDeleteError } = await (supabase
        .from('school_student_payment_progress' as any)
        .delete()
        .eq('student_id', student.id) as any);

      if (progressDeleteError) {
        console.warn('Error deleting payment progress (non-blocking):', progressDeleteError);
      }

      // 4. Supprimer l'élève de la table students_school
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

      // 5. Si c'est un transfert vers une école connue, créer la demande de transfert
      if (archive_reason === 'transfer' && target_school_id) {
        try {
          await createTransferRequestInDb({
            archived_student_id: archivedData.id,
            source_school_id: student.school_id,
            target_school_id: target_school_id,
            source_school_name: input.source_school_name || null,
            target_school_name: target_school_name || null,
            student_first_name: student.first_name,
            student_last_name: student.last_name,
            student_date_of_birth: student.date_of_birth,
            student_gender: student.gender,
            student_photo_url: student.photo_url || null,
            student_code: student.student_code || null,
            parent_name: student.parent_name || null,
            parent_phone: student.parent_phone || null,
            parent_email: student.parent_email || null,
            requested_by: archived_by,
          });
        } catch (transferError: any) {
          console.error('Error creating transfer request:', transferError?.message || transferError);
          // Ne pas bloquer l'archivage, mais signaler l'erreur
          toast.error('Archivage réussi mais erreur lors de la demande de transfert: ' + (transferError?.message || 'Erreur inconnue'));
        }
      }

      return archivedData;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['archived-students'] });
      queryClient.invalidateQueries({ queryKey: ['transfer-requests'] });
      
      const message = variables.archive_reason === 'exclusion' 
        ? 'Élève exclu et archivé avec succès'
        : variables.archive_reason === 'transfer'
         ? variables.target_school_id 
           ? 'Élève transféré - Demande envoyée à l\'école cible'
           : 'Élève transféré et archivé avec succès'
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
