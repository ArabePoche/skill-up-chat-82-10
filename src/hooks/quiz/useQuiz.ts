/**
 * Hooks pour la gestion des quiz (lecture, soumission, mutations admin)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ─── Lecture du quiz d'une leçon ───
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

// ─── Vérifier si l'utilisateur a déjà réussi le quiz ───
export const useQuizPassed = (quizId: string | undefined) => {
  return useQuery({
    queryKey: ['quiz-passed', quizId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !quizId) return false;

      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('id')
        .eq('quiz_id', quizId)
        .eq('user_id', user.id)
        .eq('passed', true)
        .limit(1);

      if (error) throw error;
      return data && data.length > 0;
    },
    enabled: !!quizId,
  });
};

// ─── Soumettre une tentative de quiz ───
export const useSubmitQuizAttempt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ quizId, lessonId, answers }: {
      quizId: string;
      lessonId: string;
      answers: { questionId: string; selectedOptionId?: string }[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Récupérer les questions avec les bonnes réponses
      const { data: questions, error: qError } = await supabase
        .from('quiz_questions')
        .select('id, points, quiz_question_options(id, is_correct)')
        .eq('quiz_id', quizId);

      if (qError) throw qError;

      let score = 0;
      let maxScore = 0;

      for (const q of questions || []) {
        maxScore += q.points;
        const answer = answers.find(a => a.questionId === q.id);
        if (answer?.selectedOptionId) {
          const correctOption = (q.quiz_question_options || []).find(
            (o: any) => o.id === answer.selectedOptionId && o.is_correct
          );
          if (correctOption) score += q.points;
        }
      }

      // Récupérer le passing_score
      const { data: quiz } = await supabase
        .from('quizzes')
        .select('passing_score')
        .eq('id', quizId)
        .single();

      const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
      const passed = percentage >= (quiz?.passing_score ?? 70);

      // Enregistrer la tentative
      const { error: insertError } = await supabase
        .from('quiz_attempts')
        .insert({
          quiz_id: quizId,
          user_id: user.id,
          score,
          max_score: maxScore,
          passed,
        });

      if (insertError) throw insertError;

      // Si quiz réussi, déclencher la progression (débloquer leçon suivante)
      let progressionResult = null;
      if (passed) {
        const { data: progData, error: progError } = await supabase.rpc(
          'handle_quiz_passed_progression',
          {
            p_user_id: user.id,
            p_lesson_id: lessonId,
          }
        );

        if (progError) {
          console.error('Erreur progression quiz:', progError);
        } else {
          progressionResult = progData;
          console.log('✅ Progression quiz:', progData);
        }
      }

      return { passed, score, maxScore, percentage, progressionResult };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quiz-passed'] });
      queryClient.invalidateQueries({ queryKey: ['lesson-unlocking'] });
      queryClient.invalidateQueries({ queryKey: ['user-lesson-progress'] });
      queryClient.invalidateQueries({ queryKey: ['student-progression'] });
      queryClient.invalidateQueries({ queryKey: ['group-chat-messages'] });

      if (data.passed) {
        const result = data.progressionResult as any;
        if (result?.formation_completed) {
          toast.success('🏆 Formation terminée ! Félicitations !');
        } else if (result?.level_completed) {
          toast.success('🎖️ Quiz réussi ! Niveau suivant débloqué !');
        } else if (result?.next_lesson_unlocked) {
          toast.success('🎉 Quiz réussi ! Leçon suivante débloquée !');
        } else {
          toast.success('Quiz réussi ! 🎉');
        }
      } else {
        toast.error(`Score insuffisant : ${data.percentage}%`);
      }
    },
    onError: () => {
      toast.error('Erreur lors de la soumission du quiz');
    },
  });
};

// ─── Mutations admin (créer/modifier/supprimer un quiz) ───
export const useQuizMutations = (lessonId: string) => {
  const queryClient = useQueryClient();

  const saveQuiz = useMutation({
    mutationFn: async (payload: {
      title: string;
      passing_score: number;
      questions: {
        id?: string;
        question_text: string;
        question_type: string;
        points: number;
        order_index: number;
        options: {
          id?: string;
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
          title: payload.title,
          passing_score: payload.passing_score,
        }, { onConflict: 'lesson_id' })
        .select()
        .single();

      if (quizError) throw quizError;

      // Supprimer les anciennes questions
      await supabase
        .from('quiz_questions')
        .delete()
        .eq('quiz_id', quiz.id);

      // Insérer les nouvelles questions
      for (const q of payload.questions) {
        const { data: question, error: questionError } = await supabase
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

        if (questionError) throw questionError;

        // Insérer les options
        if (q.options.length > 0) {
          const { error: optError } = await supabase
            .from('quiz_question_options')
            .insert(
              q.options.map(o => ({
                question_id: question.id,
                option_text: o.option_text,
                is_correct: o.is_correct,
                order_index: o.order_index,
              }))
            );
          if (optError) throw optError;
        }
      }

      return quiz;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz', lessonId] });
      toast.success('Quiz enregistré avec succès');
    },
    onError: () => {
      toast.error("Erreur lors de l'enregistrement du quiz");
    },
  });

  const deleteQuiz = useMutation({
    mutationFn: async (quizId: string) => {
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', quizId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz', lessonId] });
      toast.success('Quiz supprimé');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });

  return { saveQuiz, deleteQuiz };
};
