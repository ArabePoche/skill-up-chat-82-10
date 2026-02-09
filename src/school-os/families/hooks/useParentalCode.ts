// Hook pour gérer le système de code parental (association parent ↔ élèves)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types pour les associations parent-famille
export interface ParentFamilyAssociation {
  id: string;
  user_id: string;
  family_id: string;
  status: string;
  associated_at: string;
  created_at: string;
  updated_at: string;
}

export interface ParentAssociationRequest {
  id: string;
  requester_id: string;
  family_id: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Associer un parent via un code parental (appelle la RPC associate_parent_with_code)
 * - Premier parent : association automatique
 * - Parents suivants : demande d'association en attente
 */
export const useAssociateParentWithCode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (parentalCode: string) => {
      const { data, error } = await supabase.rpc('associate_parent_with_code', {
        p_parental_code: parentalCode,
      });

      if (error) throw error;
      return data as { status: string; message: string; family_id?: string };
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['parent-associations'] });
      queryClient.invalidateQueries({ queryKey: ['parent-association-requests'] });

      if (data?.status === 'associated') {
        toast.success('Association réussie ! Vous avez accès aux élèves de cette famille.');
      } else if (data?.status === 'pending') {
        toast.info('Demande envoyée. Un parent existant doit approuver votre accès.');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de l\'association');
    },
  });
};

/**
 * Récupérer les associations parent-famille pour l'utilisateur connecté
 */
export const useMyParentAssociations = () => {
  return useQuery({
    queryKey: ['parent-associations', 'mine'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('parent_family_associations')
        .select('*, school_student_families(family_name, parental_code, school_id)')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) throw error;
      return data;
    },
  });
};

/**
 * Récupérer les demandes d'association en attente pour une famille
 */
export const usePendingAssociationRequests = (familyId?: string) => {
  return useQuery({
    queryKey: ['parent-association-requests', familyId],
    queryFn: async () => {
      if (!familyId) return [];

      const { data, error } = await supabase
        .from('parent_association_requests')
        .select('*, profiles:requester_id(first_name, last_name, avatar_url)')
        .eq('family_id', familyId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!familyId,
  });
};

/**
 * Récupérer toutes les demandes en attente pour les familles associées au parent connecté
 */
export const useMyFamilyPendingRequests = () => {
  return useQuery({
    queryKey: ['parent-association-requests', 'my-families'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // D'abord récupérer mes familles
      const { data: myAssociations } = await supabase
        .from('parent_family_associations')
        .select('family_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (!myAssociations?.length) return [];

      const familyIds = myAssociations.map(a => a.family_id);

      const { data, error } = await supabase
        .from('parent_association_requests')
        .select('*, school_student_families(family_name), profiles:requester_id(first_name, last_name, avatar_url)')
        .in('family_id', familyIds)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

/**
 * Accepter ou refuser une demande d'association (appelle handle_parent_association_request)
 */
export const useHandleAssociationRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, action }: { requestId: string; action: 'approve' | 'reject' }) => {
      const { data, error } = await supabase.rpc('handle_parent_association_request', {
        p_request_id: requestId,
        p_action: action,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['parent-association-requests'] });
      queryClient.invalidateQueries({ queryKey: ['parent-associations'] });

      if (variables.action === 'approve') {
        toast.success('Demande approuvée. Le parent a maintenant accès aux élèves.');
      } else {
        toast.info('Demande refusée.');
      }
    },
    onError: () => {
      toast.error('Erreur lors du traitement de la demande');
    },
  });
};

/**
 * Récupérer les parents associés à une famille
 */
export const useFamilyParents = (familyId?: string) => {
  return useQuery({
    queryKey: ['family-parents', familyId],
    queryFn: async () => {
      if (!familyId) return [];

      const { data, error } = await supabase
        .from('parent_family_associations')
        .select('*, profiles:user_id(first_name, last_name, avatar_url)')
        .eq('family_id', familyId)
        .eq('status', 'active');

      if (error) throw error;
      return data;
    },
    enabled: !!familyId,
  });
};

/**
 * Récupérer les enfants du parent connecté via ses associations
 */
export const useMyChildren = () => {
  return useQuery({
    queryKey: ['my-children'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Récupérer les familles associées
      const { data: associations } = await supabase
        .from('parent_family_associations')
        .select('family_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (!associations?.length) return [];

      const familyIds = associations.map(a => a.family_id);

      // Récupérer les élèves de ces familles
      const { data, error } = await supabase
        .from('students_school')
        .select('*, classes(name, cycle), school_student_families(family_name, parental_code)')
        .in('family_id', familyIds)
        .order('first_name');

      if (error) throw error;
      return data;
    },
  });
};
