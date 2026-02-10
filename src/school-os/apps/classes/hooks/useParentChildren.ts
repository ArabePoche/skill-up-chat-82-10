// Hook pour récupérer les enfants d'un parent avec leurs classes
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ParentChild {
  id: string;
  first_name: string;
  last_name: string;
  student_code: string | null;
  gender: string;
  photo_url: string | null;
  class_id: string | null;
  class_name: string | null;
  class_cycle: string | null;
}

export const useParentChildren = (schoolId: string | undefined, schoolYearId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['parent-children', schoolId, schoolYearId, user?.id],
    queryFn: async (): Promise<ParentChild[]> => {
      if (!schoolId || !schoolYearId || !user?.id) return [];

      // 1. Get family IDs for this parent in this school
      const { data: associations } = await supabase
        .from('parent_family_associations')
        .select('family_id, school_student_families!inner(school_id)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .eq('school_student_families.school_id', schoolId);

      if (!associations || associations.length === 0) return [];

      const familyIds = associations.map(a => a.family_id);

      // 2. Get students in those families for the active school year
      const { data: students, error } = await supabase
        .from('students_school')
        .select('id, first_name, last_name, student_code, gender, photo_url, class_id, classes(name, cycle)')
        .in('family_id', familyIds)
        .eq('school_id', schoolId)
        .eq('school_year_id', schoolYearId)
        .order('last_name');

      if (error) throw error;

      return (students || []).map((s: any) => ({
        id: s.id,
        first_name: s.first_name,
        last_name: s.last_name,
        student_code: s.student_code,
        gender: s.gender,
        photo_url: s.photo_url,
        class_id: s.class_id,
        class_name: s.classes?.name || null,
        class_cycle: s.classes?.cycle || null,
      }));
    },
    enabled: !!schoolId && !!schoolYearId && !!user?.id,
  });
};
