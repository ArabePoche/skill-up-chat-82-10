/**
 * Hook pour récupérer les élèves des classes d'un enseignant
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface TeacherStudent {
  id: string;
  first_name: string;
  last_name: string;
  student_code: string;
  gender: string;
  class_id: string;
  class_name: string;
}

export const useTeacherStudents = (schoolId: string | undefined, schoolYearId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['teacher-students', schoolId, schoolYearId, user?.id],
    queryFn: async (): Promise<TeacherStudent[]> => {
      if (!schoolId || !schoolYearId || !user?.id) return [];

      // D'abord récupérer les IDs des classes de l'enseignant
      const { data: classSubjects, error: csError } = await supabase
        .from('class_subjects')
        .select(`
          class_id,
          classes!inner (
            id,
            name,
            school_id,
            school_year_id
          )
        `)
        .eq('teacher_id', user.id)
        .eq('classes.school_id', schoolId)
        .eq('classes.school_year_id', schoolYearId);

      if (csError) {
        console.error('Error fetching teacher class subjects:', csError);
        throw csError;
      }

      // Extraire les IDs de classes uniques
      const classIds = [...new Set(classSubjects?.map((cs: any) => cs.class_id) || [])];
      
      if (classIds.length === 0) return [];

      // Récupérer les élèves de ces classes depuis students_school
      const { data: students, error: studentsError } = await supabase
        .from('students_school')
        .select(`
          id,
          first_name,
          last_name,
          student_code,
          gender,
          class_id,
          classes (
            name
          )
        `)
        .in('class_id', classIds)
        .order('last_name');

      if (studentsError) {
        console.error('Error fetching students:', studentsError);
        throw studentsError;
      }

      return students?.map((s: any) => ({
        id: s.id,
        first_name: s.first_name,
        last_name: s.last_name,
        student_code: s.student_code,
        gender: s.gender,
        class_id: s.class_id,
        class_name: s.classes?.name || '',
      })) || [];
    },
    enabled: !!schoolId && !!schoolYearId && !!user?.id,
  });
};
