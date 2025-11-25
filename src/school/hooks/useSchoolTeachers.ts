// Hook pour récupérer les enseignants d'une école
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SchoolTeacher {
  id: string;
  school_id: string;
  user_id: string;
  is_active: boolean;
  created_at: string;
  profiles?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
  };
}

export const useSchoolTeachers = (schoolId?: string) => {
  return useQuery({
    queryKey: ['school-teachers', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      const { data, error } = await supabase
        .from('school_teachers')
        .select('*')
        .eq('school_id', schoolId)
        .eq('employment_status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(t => ({
        id: t.id,
        school_id: t.school_id,
        user_id: t.user_id,
        is_active: t.employment_status === 'active',
        created_at: t.created_at,
        profiles: {
          id: t.user_id,
          first_name: t.first_name,
          last_name: t.last_name,
          email: t.email,
          avatar_url: undefined,
        }
      })) as SchoolTeacher[];
    },
    enabled: !!schoolId,
  });
};
