// Hook pour gérer les confirmations de code parental lors de l'approbation des parents
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Récupérer les confirmations en attente pour le parent connecté
 */
export const useMyPendingConfirmations = () => {
  return useQuery({
    queryKey: ['parent-join-confirmations', 'mine'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await (supabase as any)
        .from('parent_join_confirmations')
        .select('*, school_student_families(family_name, parental_code), schools(name)')
        .eq('parent_user_id', user.id)
        .is('confirmed_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
};

/**
 * Récupérer les élèves liés à un family_id
 */
export const useStudentsByFamily = (familyId?: string) => {
  return useQuery({
    queryKey: ['family-students', familyId],
    queryFn: async () => {
      if (!familyId) return [];
      const { data, error } = await supabase
        .from('students_school')
        .select('id, first_name, last_name, class_id, classes(name)')
        .eq('family_id', familyId)
        .order('first_name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!familyId,
  });
};

/**
 * Rechercher des élèves par nom dans une école
 */
export const useSearchStudents = (schoolId: string, searchTerm: string) => {
  return useQuery({
    queryKey: ['search-students', schoolId, searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];

      const { data, error } = await supabase
        .from('students_school')
        .select('id, first_name, last_name, family_id, class_id, classes(name), school_student_families(id, family_name, parental_code)')
        .eq('school_id', schoolId)
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
        .order('first_name')
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: searchTerm.length >= 2,
  });
};

/**
 * Créer une confirmation de code parental (côté admin)
 */
export const useCreateParentConfirmation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      joinRequestId: string;
      schoolId: string;
      parentUserId: string;
      familyId: string;
      parentalCode: string;
      studentIds: string[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { data, error } = await (supabase as any)
        .from('parent_join_confirmations')
        .insert({
          join_request_id: params.joinRequestId,
          school_id: params.schoolId,
          parent_user_id: params.parentUserId,
          family_id: params.familyId,
          parental_code: params.parentalCode,
          student_ids: params.studentIds,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent-join-confirmations'] });
      queryClient.invalidateQueries({ queryKey: ['school-join-requests-as-messages'] });
      toast.success('Confirmation envoyée au parent. Il doit saisir le code parental.');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la création de la confirmation');
    },
  });
};

/**
 * Confirmer le code parental (côté parent)
 */
export const useConfirmParentalCode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ confirmationId, code }: { confirmationId: string; code: string }) => {
      // Vérifier le code
      const { data: confirmation, error: fetchError } = await (supabase as any)
        .from('parent_join_confirmations')
        .select('*')
        .eq('id', confirmationId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!confirmation) throw new Error('Confirmation introuvable');
      if (confirmation.parental_code !== code) throw new Error('Code parental incorrect');

      // Mettre à jour confirmed_at
      const { error: updateError } = await (supabase as any)
        .from('parent_join_confirmations')
        .update({ confirmed_at: new Date().toISOString() })
        .eq('id', confirmationId);

      if (updateError) throw updateError;

      // Approuver la demande d'adhésion
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.rpc('approve_school_join_request' as any, {
          p_request_id: confirmation.join_request_id,
          p_reviewer_id: user.id,
        });
      }

      // Associer le parent à la famille via le code
      await supabase.rpc('associate_parent_with_code' as any, {
        p_parental_code: code,
      });

      return confirmation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent-join-confirmations'] });
      queryClient.invalidateQueries({ queryKey: ['parent-associations'] });
      queryClient.invalidateQueries({ queryKey: ['my-children'] });
      toast.success('Code confirmé ! Vous avez maintenant accès aux élèves.');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la confirmation');
    },
  });
};
