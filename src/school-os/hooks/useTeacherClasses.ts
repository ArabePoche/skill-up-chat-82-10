/**
 * Hook pour récupérer les classes assignées à un enseignant
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface TeacherSubject {
  id: string;
  name: string;
  coefficient: number | null;
}

export interface TeacherClass {
  id: string;
  name: string;
  cycle: string;
  current_students: number;
  max_students: number;
  subjects: TeacherSubject[];
}

export const useTeacherClasses = (schoolId: string | undefined, schoolYearId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['teacher-classes', schoolId, schoolYearId, user?.id],
    queryFn: async (): Promise<TeacherClass[]> => {
      if (!schoolId || !schoolYearId || !user?.id) return [];

      // Récupérer les class_subjects où l'enseignant est assigné
      const { data: classSubjects, error } = await supabase
        .from('class_subjects')
        .select(`
          id,
          coefficient,
          class_id,
          classes!inner (
            id,
            name,
            cycle,
            current_students,
            max_students,
            school_id,
            school_year_id
          ),
          subjects!inner (
            id,
            name
          )
        `)
        .eq('teacher_id', user.id)
        .eq('classes.school_id', schoolId)
        .eq('classes.school_year_id', schoolYearId);

      if (error) {
        console.error('Error fetching teacher classes:', error);
        throw error;
      }

      // Grouper par classe
      const classesMap = new Map<string, TeacherClass>();

      classSubjects?.forEach((cs: any) => {
        const classData = cs.classes;
        const subjectData = cs.subjects;

        if (!classesMap.has(classData.id)) {
          classesMap.set(classData.id, {
            id: classData.id,
            name: classData.name,
            cycle: classData.cycle,
            current_students: classData.current_students,
            max_students: classData.max_students,
            subjects: [],
          });
        }

        classesMap.get(classData.id)?.subjects.push({
          id: subjectData.id,
          name: subjectData.name,
          coefficient: cs.coefficient,
        });
      });

      return Array.from(classesMap.values());
    },
    enabled: !!schoolId && !!schoolYearId && !!user?.id,
  });
};
