// Hook pour déterminer le rôle et les permissions de l'utilisateur dans une école
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SchoolUserRoleData {
  isOwner: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  isSecretary: boolean;
  isParent: boolean;
  isStudent: boolean;
  isSupervisor: boolean;
  roles: string[];
  permissions: string[];
}

export const useSchoolUserRole = (schoolId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['school-user-role', schoolId, user?.id],
    queryFn: async (): Promise<SchoolUserRoleData> => {
      if (!schoolId || !user?.id) {
        return {
          isOwner: false,
          isAdmin: false,
          isTeacher: false,
          isSecretary: false,
          isParent: false,
          isStudent: false,
          isSupervisor: false,
          roles: [],
          permissions: [],
        };
      }

      // Vérifier si l'utilisateur est propriétaire de l'école
      const { data: schoolData } = await supabase
        .from('schools')
        .select('owner_id')
        .eq('id', schoolId)
        .single();

      const isOwner = schoolData?.owner_id === user.id;

      // Si propriétaire, il a toutes les permissions
      if (isOwner) {
        const { data: allPermissions } = await supabase
          .from('school_permissions')
          .select('code');

        return {
          isOwner: true,
          isAdmin: true,
          isTeacher: false,
          isSecretary: false,
          isParent: false,
          isStudent: false,
          isSupervisor: false,
          roles: ['owner'],
          permissions: allPermissions?.map(p => p.code) || [],
        };
      }

      // Récupérer les rôles de l'utilisateur dans cette école
      const { data: userRoles } = await supabase
        .from('school_user_roles')
        .select(`
          role_id,
          school_roles!inner (
            name,
            is_system
          )
        `)
        .eq('school_id', schoolId)
        .eq('user_id', user.id);

      const roles = userRoles?.map((ur: any) => ur.school_roles.name) || [];

      // Récupérer les permissions via les rôles
      const { data: permissions } = await supabase.rpc('get_user_school_permissions', {
        _user_id: user.id,
        _school_id: schoolId,
      });

      return {
        isOwner: false,
        isAdmin: roles.includes('admin'),
        isTeacher: roles.includes('teacher'),
        isSecretary: roles.includes('secretary'),
        isParent: roles.includes('parent'),
        isStudent: roles.includes('student'),
        isSupervisor: roles.includes('supervisor'),
        roles,
        permissions: permissions?.map((p: any) => p.permission_code) || [],
      };
    },
    enabled: !!schoolId && !!user?.id,
  });
};

// Hook pour vérifier une permission spécifique
export const useHasPermission = (schoolId: string | undefined, permissionCode: string) => {
  const { data, isLoading } = useSchoolUserRole(schoolId);
  
  return {
    hasPermission: data?.permissions.includes(permissionCode) || false,
    isLoading,
  };
};

// Hook pour vérifier plusieurs permissions
export const useHasAnyPermission = (schoolId: string | undefined, permissionCodes: string[]) => {
  const { data, isLoading } = useSchoolUserRole(schoolId);
  
  return {
    hasAnyPermission: permissionCodes.some(code => data?.permissions.includes(code)) || false,
    isLoading,
  };
};
