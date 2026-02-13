/**
 * Composant QuizPlayer pour les élèves
 * Affiche le quiz d'une leçon et permet de le passer pour débloquer la leçon suivante
 */
import React, { useState } from 'react';
import { useQuiz, useQuizPassed, useSubmitQuizAttempt } from '@/hooks/quiz/useQuiz';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Trophy, RotateCcw, HelpCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface QuizPlayerProps {
  lessonId: string;
}

const QuizPlayer: React.FC<QuizPlayerProps> = ({ lessonId }) => {
  const { data: quiz, isLoading } = useQuiz(lessonId);
  const { data: alreadyPassed } = useQuizPassed(quiz?.id);
  const submitAttempt = useSubmitQuizAttempt();

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{
    passed: boolean;
    score: number;
    maxScore: number;
    percentage: number;
  } | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);

  if (isLoading) return null;
  if (!quiz || !quiz.quiz_questions || quiz.quiz_questions.length === 0) return null;

  const questions = [...quiz.quiz_questions].sort((a: any, b: any) => a.order_index - b.order_index);
  const totalQuestions = questions.length;
  const question = questions[currentQuestion];
  const options = [...(question.quiz_question_options || [])].sort((a: any, b: any) => a.order_index - b.order_index);

  // Si déjà réussi, afficher un badge de succès
  if (alreadyPassed && !showQuiz) {
    return (
      <Card className="mx-2 my-3 border-green-200 bg-green-50">
        <CardContent className="flex items-center gap-3 py-3 px-4">
          <Trophy className="text-green-600 flex-shrink-0" size={24} />
          <div className="flex-1">
            <p className="font-semibold text-green-800 text-sm">Quiz réussi ✅</p>
            <p className="text-xs text-green-600">Vous avez déjà validé ce quiz</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-green-700 border-green-300"
            onClick={() => { setShowQuiz(true); setResult(null); setAnswers({}); setCurrentQuestion(0); }}
          >
            <RotateCcw size={14} className="mr-1" /> Refaire
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Bouton pour ouvrir le quiz
  if (!showQuiz && !alreadyPassed) {
    return (
      <Card className="mx-2 my-3 border-orange-200 bg-orange-50">
        <CardContent className="flex items-center gap-3 py-3 px-4">
          <HelpCircle className="text-orange-600 flex-shrink-0" size={24} />
          <div className="flex-1">
            <p className="font-semibold text-orange-800 text-sm">{quiz.title || 'Quiz de la leçon'}</p>
            <p className="text-xs text-orange-600">
              {totalQuestions} question{totalQuestions > 1 ? 's' : ''} • Score minimum : {quiz.passing_score}%
            </p>
          </div>
          <Button
            size="sm"
            className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={() => setShowQuiz(true)}
          >
            Passer le quiz
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Affichage du résultat
  if (result) {
    return (
      <Card className={`mx-2 my-3 ${result.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            {result.passed ? (
              <><CheckCircle className="text-green-600" size={20} /> Quiz réussi !</>
            ) : (
              <><XCircle className="text-red-600" size={20} /> Quiz échoué</>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Progress value={result.percentage} className="flex-1" />
            <span className="font-bold text-sm">{result.percentage}%</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Score : {result.score}/{result.maxScore} • Minimum requis : {quiz.passing_score}%
          </p>
          {!result.passed && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setResult(null); setAnswers({}); setCurrentQuestion(0); }}
            >
              <RotateCcw size={14} className="mr-1" /> Réessayer
            </Button>
          )}
          {result.passed && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowQuiz(false)}
            >
              Fermer
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Quiz en cours
  const handleSelectOption = (optionId: string) => {
    setAnswers(prev => ({ ...prev, [question.id]: optionId }));
  };

  const handleNext = () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    const formattedAnswers = questions.map((q: any) => ({
      questionId: q.id,
      selectedOptionId: answers[q.id] || undefined,
    }));

    submitAttempt.mutate(
      { quizId: quiz.id, lessonId, answers: formattedAnswers },
      {
        onSuccess: (data) => {
          setResult({
            passed: data.passed,
            score: data.score,
            maxScore: data.maxScore,
            percentage: data.percentage,
          });
        },
      }
    );
  };

  const allAnswered = questions.every((q: any) => answers[q.id]);

  return (
    <Card className="mx-2 my-3 border-blue-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{quiz.title || 'Quiz'}</CardTitle>
          <span className="text-xs text-muted-foreground">
            {currentQuestion + 1}/{totalQuestions}
          </span>
        </div>
        <Progress value={((currentQuestion + 1) / totalQuestions) * 100} className="h-1.5" />
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="font-medium text-sm">{question.question_text}</p>

        <RadioGroup
          value={answers[question.id] || ''}
          onValueChange={handleSelectOption}
          className="space-y-2"
        >
          {options.map((opt: any) => (
            <div
              key={opt.id}
              className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer
                ${answers[question.id] === opt.id ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}
              `}
              onClick={() => handleSelectOption(opt.id)}
            >
              <RadioGroupItem value={opt.id} id={opt.id} />
              <Label htmlFor={opt.id} className="cursor-pointer flex-1 text-sm">
                {opt.option_text}
              </Label>
            </div>
          ))}
        </RadioGroup>

        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrev}
            disabled={currentQuestion === 0}
          >
            Précédent
          </Button>

          {currentQuestion < totalQuestions - 1 ? (
            <Button
              size="sm"
              onClick={handleNext}
              disabled={!answers[question.id]}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              Suivant
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!allAnswered || submitAttempt.isPending}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {submitAttempt.isPending ? 'Envoi...' : 'Valider le quiz'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuizPlayer;
