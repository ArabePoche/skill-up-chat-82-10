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
        .select(`
          *,
          profiles(id, first_name, last_name, email, avatar_url)
        `)
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SchoolTeacher[];
    },
    enabled: !!schoolId,
  });
};
