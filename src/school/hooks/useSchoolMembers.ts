/**
 * Hook pour récupérer le personnel d'une école (table school_staff)
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
  role_id: string;
}

export const useSchoolMembers = (schoolId: string | undefined) => {
  return useQuery({
    queryKey: ['school-members', schoolId],
    queryFn: async (): Promise<SchoolMemberWithRole[]> => {
      if (!schoolId) return [];

      const { data, error } = await supabase
        .from('school_staff')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transformer les données pour la compatibilité avec l'ancien code
      return (data || []).map(staff => ({
        ...staff,
        profiles: {
          id: staff.user_id || staff.id,
          first_name: staff.first_name,
          last_name: staff.last_name,
          email: staff.email,
          username: null,
          avatar_url: null,
        },
        school_roles: staff.position ? {
          id: staff.id,
          name: staff.position,
          description: null,
          is_system: false,
        } : null,
        role_id: staff.id,
      }));
    },
    enabled: !!schoolId,
  });
};
