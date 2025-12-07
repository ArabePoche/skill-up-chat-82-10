/**
 * Hook pour charger les classes avec leurs matières et élèves
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClassSubject {
  id: string;
  subject_id: string;
  subject_name: string;
}

export interface ClassStudent {
  id: string;
  first_name: string;
  last_name: string;
  student_code: string | null;
}

export interface ClassWithDetails {
  id: string;
  name: string;
  subjects: ClassSubject[];
  students: ClassStudent[];
}

export const useClassesWithSubjectsAndStudents = (
  schoolId?: string,
  schoolYearId?: string,
  selectedClassIds?: string[]
) => {
  return useQuery({
    queryKey: ['classes-with-details', schoolId, schoolYearId, selectedClassIds],
    queryFn: async () => {
      if (!schoolId || !selectedClassIds || selectedClassIds.length === 0) {
        return [];
      }

      // Récupérer les classes avec leurs matières
      const { data: classes, error: classesError } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          class_subjects(
            id,
            subject_id,
            subjects(id, name)
          )
        `)
        .eq('school_id', schoolId)
        .eq('school_year_id', schoolYearId || '')
        .in('id', selectedClassIds);

      if (classesError) {
        console.error('Error fetching classes:', classesError);
        throw classesError;
      }

      // Récupérer les élèves pour chaque classe
      const classesWithStudents: ClassWithDetails[] = [];

      for (const cls of classes || []) {
        const { data: students, error: studentsError } = await supabase
          .from('students_school')
          .select('id, first_name, last_name, student_code')
          .eq('school_id', schoolId)
          .eq('class_id', cls.id)
          .eq('status', 'active');

        if (studentsError) {
          console.error('Error fetching students:', studentsError);
        }

        classesWithStudents.push({
          id: cls.id,
          name: cls.name,
          subjects: (cls.class_subjects || []).map((cs: any) => ({
            id: cs.id,
            subject_id: cs.subject_id,
            subject_name: cs.subjects?.name || 'Matière inconnue',
          })),
          students: (students || []).map((s: any) => ({
            id: s.id,
            first_name: s.first_name || '',
            last_name: s.last_name || '',
            student_code: s.student_code,
          })),
        });
      }

      return classesWithStudents;
    },
    enabled: !!schoolId && !!selectedClassIds && selectedClassIds.length > 0,
  });
};
