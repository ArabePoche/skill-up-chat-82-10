/**
 * Hook pour récupérer les statistiques de notes par classe et par élève
 * Calcule les moyennes, progressions et classements
 */
import { useOfflineQuery } from '@/offline/hooks/useOfflineQuery';
import { supabase } from '@/integrations/supabase/client';

export interface StudentAverage {
  student_id: string;
  first_name: string;
  last_name: string;
  student_code: string;
  photo_url: string | null;
  average: number;
  grades_count: number;
  best_score: number;
  worst_score: number;
}

export interface ClassStats {
  class_id: string;
  class_name: string;
  student_count: number;
  class_average: number;
  highest_average: number;
  lowest_average: number;
  pass_rate: number; // % d'élèves >= 10/20
  students: StudentAverage[];
  subject_averages: SubjectAverage[];
}

export interface SubjectAverage {
  subject_id: string;
  subject_name: string;
  average: number;
  grades_count: number;
}

export const useGradesStats = (classId?: string) => {
  return useOfflineQuery({
    queryKey: ['grades-stats', classId],
    queryFn: async (): Promise<ClassStats | null> => {
      if (!classId) return null;

      // Get class info
      const { data: classData } = await supabase
        .from('classes')
        .select('id, name, current_students')
        .eq('id', classId)
        .single();

      if (!classData) return null;

      // Get all grades for this class via evaluations
      const { data: configs } = await supabase
        .from('school_evaluation_class_configs')
        .select('id, school_evaluations(id, max_score)')
        .eq('class_id', classId);

      if (!configs?.length) return {
        class_id: classId,
        class_name: classData.name,
        student_count: classData.current_students,
        class_average: 0,
        highest_average: 0,
        lowest_average: 0,
        pass_rate: 0,
        students: [],
        subject_averages: [],
      };

      const evaluationIds = configs
        .map((c: any) => c.school_evaluations?.id)
        .filter(Boolean);

      if (!evaluationIds.length) return {
        class_id: classId,
        class_name: classData.name,
        student_count: classData.current_students,
        class_average: 0,
        highest_average: 0,
        lowest_average: 0,
        pass_rate: 0,
        students: [],
        subject_averages: [],
      };

      // Get all grades
      const { data: grades } = await supabase
        .from('grades')
        .select(`
          id, score, is_absent, student_id, evaluation_id, subject_id,
          students(id, first_name, last_name, student_code, photo_url)
        `)
        .in('evaluation_id', evaluationIds)
        .eq('is_absent', false)
        .not('score', 'is', null);

      if (!grades?.length) return {
        class_id: classId,
        class_name: classData.name,
        student_count: classData.current_students,
        class_average: 0,
        highest_average: 0,
        lowest_average: 0,
        pass_rate: 0,
        students: [],
        subject_averages: [],
      };

      // Get subjects for names
      const subjectIds = [...new Set(grades.map((g: any) => g.subject_id).filter(Boolean))];
      const { data: subjects } = subjectIds.length > 0 
        ? await supabase.from('subjects').select('id, name').in('id', subjectIds)
        : { data: [] };

      const subjectsMap = new Map((subjects || []).map((s: any) => [s.id, s.name]));

      // Max scores map
      const maxScoresMap = new Map<string, number>();
      configs.forEach((c: any) => {
        if (c.school_evaluations) {
          maxScoresMap.set(c.school_evaluations.id, c.school_evaluations.max_score || 20);
        }
      });

      // Calculate student averages (normalized to /20)
      const studentGradesMap = new Map<string, { student: any; scores: number[] }>();

      grades.forEach((g: any) => {
        if (g.score === null || !g.students) return;
        const maxScore = maxScoresMap.get(g.evaluation_id) || 20;
        const normalizedScore = (g.score / maxScore) * 20;

        if (!studentGradesMap.has(g.student_id)) {
          studentGradesMap.set(g.student_id, {
            student: g.students,
            scores: [],
          });
        }
        studentGradesMap.get(g.student_id)!.scores.push(normalizedScore);
      });

      const students: StudentAverage[] = Array.from(studentGradesMap.entries())
        .map(([studentId, data]) => ({
          student_id: studentId,
          first_name: data.student.first_name,
          last_name: data.student.last_name,
          student_code: data.student.student_code || '',
          photo_url: data.student.photo_url,
          average: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
          grades_count: data.scores.length,
          best_score: Math.max(...data.scores),
          worst_score: Math.min(...data.scores),
        }))
        .sort((a, b) => b.average - a.average);

      // Subject averages
      const subjectScoresMap = new Map<string, number[]>();
      grades.forEach((g: any) => {
        if (g.score === null || !g.subject_id) return;
        const maxScore = maxScoresMap.get(g.evaluation_id) || 20;
        const normalized = (g.score / maxScore) * 20;
        if (!subjectScoresMap.has(g.subject_id)) {
          subjectScoresMap.set(g.subject_id, []);
        }
        subjectScoresMap.get(g.subject_id)!.push(normalized);
      });

      const subject_averages: SubjectAverage[] = Array.from(subjectScoresMap.entries())
        .map(([subjectId, scores]) => ({
          subject_id: subjectId,
          subject_name: subjectsMap.get(subjectId) || 'Matière',
          average: scores.reduce((a, b) => a + b, 0) / scores.length,
          grades_count: scores.length,
        }))
        .sort((a, b) => b.average - a.average);

      const averages = students.map(s => s.average);
      const classAverage = averages.length > 0 
        ? averages.reduce((a, b) => a + b, 0) / averages.length 
        : 0;

      return {
        class_id: classId,
        class_name: classData.name,
        student_count: classData.current_students,
        class_average: classAverage,
        highest_average: averages.length > 0 ? Math.max(...averages) : 0,
        lowest_average: averages.length > 0 ? Math.min(...averages) : 0,
        pass_rate: averages.length > 0 
          ? (averages.filter(a => a >= 10).length / averages.length) * 100 
          : 0,
        students,
        subject_averages,
      };
    },
    enabled: !!classId,
  });
};
