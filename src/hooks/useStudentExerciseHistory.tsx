/**
 * Hook pour récupérer l'historique des exercices d'un élève dans une formation
 * Inclut les exercices envoyés, soumis et leur statut
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ExerciseSubmissionHistory {
  id: string;
  exercise_id: string;
  exercise_title: string;
  lesson_id: string;
  lesson_title: string;
  status: string | null; // 'approved', 'rejected', 'pending', null
  submitted_at: string;
  content: string;
  file_url?: string;
  file_type?: string;
}

export interface StudentExerciseHistory {
  studentId: string;
  formationId: string;
  submissions: ExerciseSubmissionHistory[];
  exercisesReceived: {
    id: string;
    exercise_id: string;
    exercise_title: string;
    lesson_id: string;
    lesson_title: string;
    sent_at: string;
  }[];
}

export const useStudentExerciseHistory = (
  formationId: string | undefined,
  studentId: string | undefined
) => {
  return useQuery({
    queryKey: ['student-exercise-history', formationId, studentId],
    queryFn: async (): Promise<StudentExerciseHistory | null> => {
      if (!formationId || !studentId) return null;

      // Récupérer les soumissions d'exercices de l'élève
      const { data: submissions, error: submissionsError } = await supabase
        .from('lesson_messages')
        .select(`
          id,
          exercise_id,
          exercise_status,
          created_at,
          content,
          file_url,
          file_type,
          lesson_id,
          exercises!lesson_messages_exercise_id_fkey (
            id,
            title,
            lesson_id
          ),
          lessons!lesson_messages_lesson_id_fkey (
            id,
            title
          )
        `)
        .eq('formation_id', formationId)
        .eq('sender_id', studentId)
        .eq('is_exercise_submission', true)
        .order('created_at', { ascending: false });

      if (submissionsError) {
        console.error('Error fetching exercise submissions:', submissionsError);
      }

      // Récupérer les exercices envoyés à l'élève (messages système avec exercise_id)
      const { data: receivedExercises, error: receivedError } = await supabase
        .from('lesson_messages')
        .select(`
          id,
          exercise_id,
          created_at,
          lesson_id,
          exercises!lesson_messages_exercise_id_fkey (
            id,
            title,
            lesson_id
          ),
          lessons!lesson_messages_lesson_id_fkey (
            id,
            title
          )
        `)
        .eq('formation_id', formationId)
        .eq('receiver_id', studentId)
        .eq('is_system_message', true)
        .not('exercise_id', 'is', null)
        .order('created_at', { ascending: false });

      if (receivedError) {
        console.error('Error fetching received exercises:', receivedError);
      }

      const formattedSubmissions: ExerciseSubmissionHistory[] = (submissions || [])
        .filter((s: any) => s.exercises)
        .map((s: any) => ({
          id: s.id,
          exercise_id: s.exercise_id,
          exercise_title: s.exercises?.title || 'Exercice',
          lesson_id: s.lesson_id,
          lesson_title: s.lessons?.title || 'Leçon',
          status: s.exercise_status,
          submitted_at: s.created_at,
          content: s.content,
          file_url: s.file_url,
          file_type: s.file_type,
        }));

      const formattedReceived = (receivedExercises || [])
        .filter((r: any) => r.exercises)
        .map((r: any) => ({
          id: r.id,
          exercise_id: r.exercise_id,
          exercise_title: r.exercises?.title || 'Exercice',
          lesson_id: r.lesson_id,
          lesson_title: r.lessons?.title || 'Leçon',
          sent_at: r.created_at,
        }));

      return {
        studentId,
        formationId,
        submissions: formattedSubmissions,
        exercisesReceived: formattedReceived,
      };
    },
    enabled: !!formationId && !!studentId,
  });
};
