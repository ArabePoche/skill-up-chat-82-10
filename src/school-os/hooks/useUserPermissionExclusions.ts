/**
 * Hook pour gérer les exclusions de permissions pour un utilisateur spécifique
 * Permet de désactiver des permissions héritées du rôle
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PermissionExclusion {
  id: string;
  school_id: string;
  user_id: string;
  permission_code: string;
  excluded_by: string | null;
  excluded_at: string;
  created_at: string;
}

// Récupérer les exclusions de permissions d'un utilisateur
export const useUserPermissionExclusions = (schoolId?: string, userId?: string) => {
  return useQuery({
    queryKey: ['user-permission-exclusions', schoolId, userId],
    queryFn: async () => {
      if (!schoolId || !userId) return [];

      const { data, error } = await supabase
        .from('school_user_permission_exclusions')
        .select('*')
        .eq('school_id', schoolId)
        .eq('user_id', userId);

      if (error) throw error;
      return data as PermissionExclusion[];
    },
    enabled: !!schoolId && !!userId,
  });
};

// Ajouter une exclusion (désactiver une permission héritée)
export const useAddPermissionExclusion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      schoolId, 
      userId, 
      permissionCode 
    }: { 
      schoolId: string; 
      userId: string; 
      permissionCode: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { error } = await supabase
        .from('school_user_permission_exclusions')
        .insert({
          school_id: schoolId,
          user_id: userId,
          permission_code: permissionCode,
          excluded_by: user.id,
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-permission-exclusions', variables.schoolId, variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['school-user-role', variables.schoolId, variables.userId] });
      toast.success('Permission désactivée');
    },
    onError: (error: any) => {
      console.error('Error adding permission exclusion:', error);
      if (error.code === '23505') {
        toast.error('Cette permission est déjà désactivée');
      } else {
        toast.error(error.message || 'Erreur lors de la désactivation');
      }
    },
  });
};

// Supprimer une exclusion (réactiver une permission héritée)
export const useRemovePermissionExclusion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      schoolId, 
      userId, 
      permissionCode 
    }: { 
      schoolId: string; 
      userId: string; 
      permissionCode: string;
    }) => {
      const { error } = await supabase
        .from('school_user_permission_exclusions')
        .delete()
        .eq('school_id', schoolId)
        .eq('user_id', userId)
        .eq('permission_code', permissionCode);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-permission-exclusions', variables.schoolId, variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['school-user-role', variables.schoolId, variables.userId] });
      toast.success('Permission réactivée');
    },
    onError: (error: any) => {
      console.error('Error removing permission exclusion:', error);
      toast.error(error.message || 'Erreur lors de la réactivation');
    },
  });
};
