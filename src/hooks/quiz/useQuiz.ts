/**
 * Hooks pour la gestion des quiz (CRUD et tentatives)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// Récupérer le quiz d'une leçon avec ses questions et options
export const useQuiz = (lessonId: string) => {
  return useQuery({
    queryKey: ['quiz', lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quizzes')
        .select(`
          *,
          quiz_questions (
            *,
            quiz_question_options (*)
          )
        `)
        .eq('lesson_id', lessonId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!lessonId,
  });
};

// Mutations pour créer/modifier/supprimer un quiz
export const useQuizMutations = (lessonId: string) => {
  const queryClient = useQueryClient();

  const saveQuiz = useMutation({
    mutationFn: async (quizData: {
      title: string;
      passing_score: number;
      questions: {
        question_text: string;
        question_type: string;
        points: number;
        order_index: number;
        options: {
          option_text: string;
          is_correct: boolean;
          order_index: number;
        }[];
      }[];
    }) => {
      // Upsert quiz
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .upsert({
          lesson_id: lessonId,
          title: quizData.title,
          passing_score: quizData.passing_score,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'lesson_id' })
        .select()
        .single();

      if (quizError) throw quizError;

      // Delete existing questions (cascade deletes options)
      await supabase.from('quiz_questions').delete().eq('quiz_id', quiz.id);

      // Insert new questions with options
      for (const q of quizData.questions) {
        const { data: question, error: qError } = await supabase
          .from('quiz_questions')
          .insert({
            quiz_id: quiz.id,
            question_text: q.question_text,
            question_type: q.question_type,
            points: q.points,
            order_index: q.order_index,
          })
          .select()
          .single();

        if (qError) throw qError;

        if (q.options.length > 0) {
          const { error: oError } = await supabase
            .from('quiz_question_options')
            .insert(
              q.options.map(o => ({
                question_id: question.id,
                option_text: o.option_text,
                is_correct: o.is_correct,
                order_index: o.order_index,
              }))
            );
          if (oError) throw oError;
        }
      }

      return quiz;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz', lessonId] });
      toast.success('Quiz enregistré avec succès');
    },
    onError: (error) => {
      console.error('Error saving quiz:', error);
      toast.error('Erreur lors de l\'enregistrement du quiz');
    },
  });

  const deleteQuiz = useMutation({
    mutationFn: async (quizId: string) => {
      const { error } = await supabase.from('quizzes').delete().eq('id', quizId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz', lessonId] });
      toast.success('Quiz supprimé');
    },
    onError: () => toast.error('Erreur lors de la suppression du quiz'),
  });

  return { saveQuiz, deleteQuiz };
};

// Hook pour soumettre une tentative de quiz
export const useSubmitQuizAttempt = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      quizId,
      answers,
    }: {
      quizId: string;
      answers: { questionId: string; selectedOptionId?: string; textAnswer?: string }[];
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Fetch correct answers
      const { data: questions } = await supabase
        .from('quiz_questions')
        .select('id, points, quiz_question_options(id, is_correct)')
        .eq('quiz_id', quizId);

      if (!questions) throw new Error('No questions found');

      let score = 0;
      let maxScore = 0;
      const answerResults = answers.map(a => {
        const question = questions.find(q => q.id === a.questionId);
        if (!question) return { ...a, is_correct: false };

        maxScore += question.points;
        const correctOption = question.quiz_question_options?.find((o: any) => o.is_correct);
        const isCorrect = correctOption?.id === a.selectedOptionId;
        if (isCorrect) score += question.points;

        return { ...a, is_correct: isCorrect };
      });

      // Get quiz passing score
      const { data: quiz } = await supabase
        .from('quizzes')
        .select('passing_score')
        .eq('id', quizId)
        .single();

      const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
      const passed = percentage >= (quiz?.passing_score ?? 70);

      // Insert attempt
      const { data: attempt, error: attemptError } = await supabase
        .from('quiz_attempts')
        .insert({
          quiz_id: quizId,
          user_id: user.id,
          score,
          max_score: maxScore,
          passed,
        })
        .select()
        .single();

      if (attemptError) throw attemptError;

      // Insert answers
      const { error: answersError } = await supabase
        .from('quiz_attempt_answers')
        .insert(
          answerResults.map(a => ({
            attempt_id: attempt.id,
            question_id: a.questionId,
            selected_option_id: a.selectedOptionId || null,
            text_answer: a.textAnswer || null,
            is_correct: a.is_correct,
          }))
        );

      if (answersError) throw answersError;

      return { attempt, passed, score, maxScore, percentage };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quiz-attempts'] });
      queryClient.invalidateQueries({ queryKey: ['lesson-unlocking'] });
      if (data.passed) {
        toast.success(`Quiz réussi ! Score : ${data.percentage}%`);
      } else {
        toast.error(`Quiz échoué. Score : ${data.percentage}%. Réessayez !`);
      }
    },
    onError: () => toast.error('Erreur lors de la soumission du quiz'),
  });
};

// Hook pour vérifier si l'utilisateur a réussi un quiz
export const useQuizPassed = (quizId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['quiz-passed', quizId, user?.id],
    queryFn: async () => {
      if (!quizId || !user?.id) return false;

      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('passed')
        .eq('quiz_id', quizId)
        .eq('user_id', user.id)
        .eq('passed', true)
        .limit(1);

      if (error) throw error;
      return (data?.length ?? 0) > 0;
    },
    enabled: !!quizId && !!user?.id,
  });
};
