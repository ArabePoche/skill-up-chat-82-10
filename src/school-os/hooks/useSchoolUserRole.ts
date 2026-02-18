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

const ROLE_CACHE_PREFIX = 'school-user-role-';

const getDefaultRoleData = (): SchoolUserRoleData => ({
  isOwner: false,
  isAdmin: false,
  isTeacher: false,
  isSecretary: false,
  isParent: false,
  isStudent: false,
  isSupervisor: false,
  roles: [],
  permissions: [],
});

export const useSchoolUserRole = (schoolId: string | undefined) => {
  const { user } = useAuth();
  const cacheKey = schoolId && user?.id ? `${ROLE_CACHE_PREFIX}${schoolId}-${user.id}` : null;

  // Lire le cache localStorage pour initialData (offline-first)
  const cachedData = cacheKey ? (() => {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) return JSON.parse(raw) as SchoolUserRoleData;
    } catch { /* ignore */ }
    return undefined;
  })() : undefined;

  return useQuery({
    queryKey: ['school-user-role', schoolId, user?.id],
    queryFn: async (): Promise<SchoolUserRoleData> => {
      if (!schoolId || !user?.id) {
        return getDefaultRoleData();
      }

      try {
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

          const result: SchoolUserRoleData = {
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
          if (cacheKey) localStorage.setItem(cacheKey, JSON.stringify(result));
          return result;
        }

        // Vérifier si l'utilisateur est parent dans cette école
        const { data: parentAssoc } = await supabase
          .from('parent_family_associations')
          .select('id, school_student_families!inner(school_id)')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .eq('school_student_families.school_id', schoolId)
          .limit(1);

        const isParent = (parentAssoc && parentAssoc.length > 0) || false;

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
        if (isParent && !roles.includes('parent')) {
          roles.push('parent');
        }

        // Récupérer les permissions via les rôles
        const { data: permissions } = await supabase.rpc('get_user_school_permissions', {
          _user_id: user.id,
          _school_id: schoolId,
        });

        // Permissions par défaut pour les parents
        const parentPermissions = isParent ? [
          'app.classes',
          'app.grades',
          'app.schedule',
          'app.messages',
          'app.reports',
          'app.payments',
          'app.parent-enrollment',
        ] : [];

        const allPermissions = [
          ...(permissions?.map((p: any) => p.permission_code) || []),
          ...parentPermissions,
        ];
        const uniquePermissions = [...new Set(allPermissions)];

        const result: SchoolUserRoleData = {
          isOwner: false,
          isAdmin: roles.includes('admin'),
          isTeacher: roles.includes('teacher'),
          isSecretary: roles.includes('secretary'),
          isParent,
          isStudent: roles.includes('student'),
          isSupervisor: roles.includes('supervisor'),
          roles,
          permissions: uniquePermissions,
        };

        // Persister dans localStorage pour le mode offline
        if (cacheKey) localStorage.setItem(cacheKey, JSON.stringify(result));
        return result;
      } catch (error) {
        // En cas d'erreur réseau (offline), utiliser le cache
        if (cachedData) {
          console.log('[useSchoolUserRole] Offline - using cached role data');
          return cachedData;
        }
        throw error;
      }
    },
    enabled: !!schoolId && !!user?.id,
    initialData: cachedData,
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
