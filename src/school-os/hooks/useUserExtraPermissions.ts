/**
 * Hook pour gérer les permissions supplémentaires accordées à un utilisateur spécifique
 * Ces permissions s'ajoutent aux permissions héritées des rôles
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExtraPermission {
  id: string;
  school_id: string;
  user_id: string;
  permission_code: string;
  granted_by: string | null;
  granted_at: string;
  created_at: string;
}

// Récupérer les permissions supplémentaires d'un utilisateur
export const useUserExtraPermissions = (schoolId?: string, userId?: string) => {
  return useQuery({
    queryKey: ['user-extra-permissions', schoolId, userId],
    queryFn: async () => {
      if (!schoolId || !userId) return [];

      const { data, error } = await supabase
        .from('school_user_extra_permissions')
        .select('*')
        .eq('school_id', schoolId)
        .eq('user_id', userId);

      if (error) throw error;
      return data as ExtraPermission[];
    },
    enabled: !!schoolId && !!userId,
  });
};

// Ajouter une permission supplémentaire à un utilisateur
export const useAddUserExtraPermission = () => {
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
        .from('school_user_extra_permissions')
        .insert({
          school_id: schoolId,
          user_id: userId,
          permission_code: permissionCode,
          granted_by: user.id,
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-extra-permissions', variables.schoolId, variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['school-user-role', variables.schoolId, variables.userId] });
      toast.success('Permission ajoutée');
    },
    onError: (error: any) => {
      console.error('Error adding extra permission:', error);
      if (error.code === '23505') {
        toast.error('Cette permission est déjà accordée');
      } else {
        toast.error(error.message || 'Erreur lors de l\'ajout de la permission');
      }
    },
  });
};

// Supprimer une permission supplémentaire d'un utilisateur
export const useRemoveUserExtraPermission = () => {
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
        .from('school_user_extra_permissions')
        .delete()
        .eq('school_id', schoolId)
        .eq('user_id', userId)
        .eq('permission_code', permissionCode);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-extra-permissions', variables.schoolId, variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['school-user-role', variables.schoolId, variables.userId] });
      toast.success('Permission retirée');
    },
    onError: (error: any) => {
      console.error('Error removing extra permission:', error);
      toast.error(error.message || 'Erreur lors du retrait de la permission');
    },
  });
};

// Récupérer toutes les permissions supplémentaires d'une école (pour admin)
export const useSchoolExtraPermissions = (schoolId?: string) => {
  return useQuery({
    queryKey: ['school-extra-permissions', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      const { data, error } = await supabase
        .from('school_user_extra_permissions')
        .select(`
          *,
          user:profiles!school_user_extra_permissions_user_id_fkey(
            id,
            first_name,
            last_name,
            email,
            avatar_url
          ),
          permission:school_permissions!school_user_extra_permissions_permission_code_fkey(
            code,
            name,
            description,
            category
          )
        `)
        .eq('school_id', schoolId);

      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });
};
