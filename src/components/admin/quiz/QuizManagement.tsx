/**
 * Composant de gestion des quiz pour une leçon
 * Permet de créer/modifier un quiz avec ses questions et options
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Trash2, Save, GripVertical } from 'lucide-react';
import { useQuiz, useQuizMutations } from '@/hooks/quiz/useQuiz';
import { toast } from 'sonner';

interface QuizManagementProps {
  lessonId: string;
  lessonTitle: string;
  onBack: () => void;
}

interface QuestionForm {
  id?: string;
  question_text: string;
  question_type: 'mcq' | 'true_false' | 'short_answer';
  points: number;
  options: OptionForm[];
}

interface OptionForm {
  id?: string;
  option_text: string;
  is_correct: boolean;
}

const QuizManagement: React.FC<QuizManagementProps> = ({ lessonId, lessonTitle, onBack }) => {
  const { data: quizData, isLoading } = useQuiz(lessonId);
  const { saveQuiz, deleteQuiz } = useQuizMutations(lessonId);

  const [passingScore, setPassingScore] = useState(quizData?.passing_score ?? 70);
  const [title, setTitle] = useState(quizData?.title ?? 'Quiz');
  const [questions, setQuestions] = useState<QuestionForm[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Initialize from data once loaded
  React.useEffect(() => {
    if (quizData && !initialized) {
      setTitle(quizData.title);
      setPassingScore(quizData.passing_score);
      setQuestions(
        (quizData.quiz_questions || [])
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map((q: any) => ({
            id: q.id,
            question_text: q.question_text,
            question_type: q.question_type,
            points: q.points,
            options: (q.quiz_question_options || [])
              .sort((a: any, b: any) => a.order_index - b.order_index)
              .map((o: any) => ({
                id: o.id,
                option_text: o.option_text,
                is_correct: o.is_correct,
              })),
          }))
      );
      setInitialized(true);
    } else if (!quizData && !initialized && !isLoading) {
      setInitialized(true);
    }
  }, [quizData, initialized, isLoading]);

  const addQuestion = () => {
    setQuestions(prev => [...prev, {
      question_text: '',
      question_type: 'mcq',
      points: 1,
      options: [
        { option_text: '', is_correct: true },
        { option_text: '', is_correct: false },
      ],
    }]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: keyof QuestionForm, value: any) => {
    setQuestions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      // Auto-generate options for true_false
      if (field === 'question_type' && value === 'true_false') {
        updated[index].options = [
          { option_text: 'Vrai', is_correct: true },
          { option_text: 'Faux', is_correct: false },
        ];
      } else if (field === 'question_type' && value === 'short_answer') {
        updated[index].options = [];
      }

      return updated;
    });
  };

  const addOption = (qIndex: number) => {
    setQuestions(prev => {
      const updated = [...prev];
      updated[qIndex].options = [...updated[qIndex].options, { option_text: '', is_correct: false }];
      return updated;
    });
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    setQuestions(prev => {
      const updated = [...prev];
      updated[qIndex].options = updated[qIndex].options.filter((_, i) => i !== oIndex);
      return updated;
    });
  };

  const updateOption = (qIndex: number, oIndex: number, field: keyof OptionForm, value: any) => {
    setQuestions(prev => {
      const updated = [...prev];
      const opts = [...updated[qIndex].options];
      opts[oIndex] = { ...opts[oIndex], [field]: value };

      // If setting is_correct to true for MCQ, unset others
      if (field === 'is_correct' && value === true && updated[qIndex].question_type !== 'short_answer') {
        opts.forEach((o, i) => {
          if (i !== oIndex) o.is_correct = false;
        });
      }

      updated[qIndex].options = opts;
      return updated;
    });
  };

  const handleSave = () => {
    if (questions.length === 0) {
      toast.error('Ajoutez au moins une question');
      return;
    }

    for (const q of questions) {
      if (!q.question_text.trim()) {
        toast.error('Toutes les questions doivent avoir un texte');
        return;
      }
      if (q.question_type !== 'short_answer' && q.options.length < 2) {
        toast.error('Les QCM et Vrai/Faux doivent avoir au moins 2 options');
        return;
      }
      if (q.question_type !== 'short_answer' && !q.options.some(o => o.is_correct)) {
        toast.error('Chaque question doit avoir au moins une bonne réponse');
        return;
      }
    }

    saveQuiz.mutate({
      title,
      passing_score: passingScore,
      questions: questions.map((q, i) => ({
        ...q,
        order_index: i,
        options: q.options.map((o, j) => ({ ...o, order_index: j })),
      })),
    });
  };

  const handleDelete = () => {
    if (quizData && confirm('Supprimer ce quiz ?')) {
      deleteQuiz.mutate(quizData.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft size={16} />
        </Button>
        <div>
          <h2 className="text-lg font-semibold">Quiz : {lessonTitle}</h2>
          <p className="text-sm text-muted-foreground">Configurez le quiz de déblocage</p>
        </div>
      </div>

      {/* Quiz settings */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Titre du quiz</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div>
              <Label>Score minimum pour réussir (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={passingScore}
                onChange={e => setPassingScore(Number(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      {questions.map((q, qIndex) => (
        <Card key={qIndex} className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Question {qIndex + 1}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => removeQuestion(qIndex)}>
                <Trash2 size={14} className="text-destructive" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Texte de la question..."
              value={q.question_text}
              onChange={e => updateQuestion(qIndex, 'question_text', e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select
                  value={q.question_type}
                  onValueChange={v => updateQuestion(qIndex, 'question_type', v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mcq">QCM</SelectItem>
                    <SelectItem value="true_false">Vrai / Faux</SelectItem>
                    <SelectItem value="short_answer">Réponse courte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Points</Label>
                <Input
                  type="number"
                  min={1}
                  value={q.points}
                  onChange={e => updateQuestion(qIndex, 'points', Number(e.target.value))}
                />
              </div>
            </div>

            {/* Options for MCQ / True-False */}
            {q.question_type !== 'short_answer' && (
              <div className="space-y-2">
                <Label>Options</Label>
                {q.options.map((opt, oIndex) => (
                  <div key={oIndex} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${qIndex}`}
                      checked={opt.is_correct}
                      onChange={() => updateOption(qIndex, oIndex, 'is_correct', true)}
                      className="accent-primary"
                    />
                    <Input
                      className="flex-1"
                      placeholder={`Option ${oIndex + 1}`}
                      value={opt.option_text}
                      onChange={e => updateOption(qIndex, oIndex, 'option_text', e.target.value)}
                      disabled={q.question_type === 'true_false'}
                    />
                    {q.question_type === 'mcq' && q.options.length > 2 && (
                      <Button variant="ghost" size="sm" onClick={() => removeOption(qIndex, oIndex)}>
                        <Trash2 size={12} />
                      </Button>
                    )}
                  </div>
                ))}
                {q.question_type === 'mcq' && (
                  <Button variant="outline" size="sm" onClick={() => addOption(qIndex)}>
                    <Plus size={12} className="mr-1" /> Option
                  </Button>
                )}
              </div>
            )}

            {q.question_type === 'short_answer' && (
              <p className="text-xs text-muted-foreground">
                Les réponses courtes seront évaluées manuellement ou par correspondance exacte.
              </p>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={addQuestion}>
          <Plus size={14} className="mr-1" /> Ajouter une question
        </Button>
        <Button onClick={handleSave} disabled={saveQuiz.isPending}>
          <Save size={14} className="mr-1" />
          {saveQuiz.isPending ? 'Enregistrement...' : 'Enregistrer le quiz'}
        </Button>
        {quizData && (
          <Button variant="destructive" onClick={handleDelete} disabled={deleteQuiz.isPending}>
            <Trash2 size={14} className="mr-1" /> Supprimer
          </Button>
        )}
      </div>
    </div>
  );
};

export default QuizManagement;
