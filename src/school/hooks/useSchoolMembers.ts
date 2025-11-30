/**
 * Hook pour récupérer le personnel d'une école (table school_staff)
 * avec leurs rôles depuis school_user_roles
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SchoolMemberWithRole {
  id: string;
  school_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  hire_date: string | null;
  salary: number | null;
  status: string;
  created_at: string;
  updated_at: string;
  // Pour compatibilité avec l'ancien code
  profiles: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
  school_roles: {
    id: string;
    name: string;
    description: string | null;
    is_system: boolean;
  } | null;
  role_id: string | null;
}

export const useSchoolMembers = (schoolId: string | undefined) => {
  return useQuery({
    queryKey: ['school-members', schoolId],
    queryFn: async (): Promise<SchoolMemberWithRole[]> => {
      if (!schoolId) return [];

      // Récupérer le staff
      const { data: staffData, error: staffError } = await supabase
        .from('school_staff')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (staffError) throw staffError;

      // Récupérer les user_ids du staff pour chercher leurs rôles
      const userIds = (staffData || [])
        .filter(s => s.user_id)
        .map(s => s.user_id);

      // Récupérer les rôles associés via school_user_roles
      let rolesMap: Record<string, { role_id: string; role_name: string; role_description: string | null; is_system: boolean }> = {};
      
      if (userIds.length > 0) {
        const { data: userRoles } = await supabase
          .from('school_user_roles')
          .select(`
            user_id,
            role_id,
            school_roles!inner (
              id,
              name,
              description,
              is_system
            )
          `)
          .eq('school_id', schoolId)
          .in('user_id', userIds);

        if (userRoles) {
          userRoles.forEach((ur: any) => {
            rolesMap[ur.user_id] = {
              role_id: ur.role_id,
              role_name: ur.school_roles.name,
              role_description: ur.school_roles.description,
              is_system: ur.school_roles.is_system,
            };
          });
        }
      }
      
      // Transformer les données pour la compatibilité avec l'ancien code
      return (staffData || []).map(staff => {
        const userRole = staff.user_id ? rolesMap[staff.user_id] : null;
        
        return {
          ...staff,
          profiles: {
            id: staff.user_id || staff.id,
            first_name: staff.first_name,
            last_name: staff.last_name,
            email: staff.email,
            username: null,
            avatar_url: null,
          },
          school_roles: userRole ? {
            id: userRole.role_id,
            name: userRole.role_name,
            description: userRole.role_description,
            is_system: userRole.is_system,
          } : null,
          role_id: userRole?.role_id || null,
        };
      });
    },
    enabled: !!schoolId,
  });
};
