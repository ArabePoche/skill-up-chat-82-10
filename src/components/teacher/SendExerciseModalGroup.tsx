/**
 * Modal pour envoyer un exercice à un élève dans le contexte du chat groupe
 * Affiche tous les exercices du niveau et l'historique des exercices de l'élève
 */
import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  BookOpen, 
  Send, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText,
  Loader2,
  User
} from 'lucide-react';
import { useLevelExercises } from '@/hooks/group-chat/useLevelExercises';
import { useStudentExerciseHistory, ExerciseSubmissionHistory } from '@/hooks/useStudentExerciseHistory';
import { useSendExerciseToStudent } from '@/hooks/useSendExerciseToStudent';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SendExerciseModalGroupProps {
  isOpen: boolean;
  onClose: () => void;
  formationId: string;
  levelId: string;
  studentId: string;
  studentName: string;
  studentAvatarUrl?: string;
}

const SendExerciseModalGroup: React.FC<SendExerciseModalGroupProps> = ({
  isOpen,
  onClose,
  formationId,
  levelId,
  studentId,
  studentName,
  studentAvatarUrl,
}) => {
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  // Récupérer les exercices du niveau (toutes les leçons)
  const { data: exercises = [], isLoading: exercisesLoading } = useLevelExercises(levelId);
  
  // Récupérer l'historique des exercices de l'élève
  const { data: history, isLoading: historyLoading } = useStudentExerciseHistory(formationId, studentId);
  
  // Mutation pour envoyer l'exercice
  const sendExerciseMutation = useSendExerciseToStudent();

  const handleSendExercise = async () => {
    if (!selectedExercise || !selectedLessonId) return;

    const exercise = exercises.find((e: any) => e.id === selectedExercise);
    if (!exercise) return;

    await sendExerciseMutation.mutateAsync({
      formationId,
      studentId,
      lessonId: selectedLessonId,
      exerciseId: selectedExercise,
      exerciseTitle: exercise.title,
      levelId, // Ajout du levelId pour le contexte groupe
    });

    setSelectedExercise(null);
    setSelectedLessonId(null);
    onClose();
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle size={12} className="mr-1" />
            Validé
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200">
            <XCircle size={12} className="mr-1" />
            Refusé
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
            <Clock size={12} className="mr-1" />
            En attente
          </Badge>
        );
    }
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "d MMM yyyy 'à' HH:mm", { locale: fr });
  };

  // Vérifier si un exercice a déjà été envoyé à cet élève
  const isExerciseAlreadySent = (exerciseId: string) => {
    return history?.exercisesReceived.some(r => r.exercise_id === exerciseId);
  };

  // Grouper les exercices par leçon
  const exercisesByLesson = exercises.reduce((acc: any, exercise: any) => {
    const lessonTitle = exercise.lessons?.title || 'Leçon inconnue';
    const lessonId = exercise.lesson_id;
    if (!acc[lessonId]) {
      acc[lessonId] = {
        title: lessonTitle,
        exercises: []
      };
    }
    acc[lessonId].exercises.push(exercise);
    return acc;
  }, {});

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-primary/20">
              <AvatarImage src={studentAvatarUrl} alt={studentName} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(studentName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="text-primary" size={18} />
                Exercices pour {studentName}
              </div>
              <p className="text-xs text-muted-foreground font-normal mt-0.5">
                Envoyez un exercice ou consultez l'historique
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="send" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="send">
              <Send size={14} className="mr-1.5" />
              Envoyer
            </TabsTrigger>
            <TabsTrigger value="history">
              <Clock size={14} className="mr-1.5" />
              Historique
              {history?.submissions.length ? (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {history.submissions.length}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>

          {/* Onglet Envoyer */}
          <TabsContent value="send" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              {exercisesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-primary" size={24} />
                </div>
              ) : Object.keys(exercisesByLesson).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText size={40} className="mx-auto mb-2 opacity-50" />
                  <p>Aucun exercice disponible pour ce niveau</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(exercisesByLesson).map(([lessonId, lessonData]: [string, any]) => (
                    <div key={lessonId} className="space-y-2">
                      <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        <BookOpen size={14} />
                        {lessonData.title}
                      </h4>
                      <div className="space-y-2 pl-4">
                        {lessonData.exercises.map((exercise: any) => {
                          const alreadySent = isExerciseAlreadySent(exercise.id);
                          const isSelected = selectedExercise === exercise.id;
                          
                          return (
                            <div
                              key={exercise.id}
                              onClick={() => {
                                if (!alreadySent) {
                                  setSelectedExercise(exercise.id);
                                  setSelectedLessonId(lessonId);
                                }
                              }}
                              className={`p-3 border rounded-lg cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                  : alreadySent
                                  ? 'border-muted bg-muted/30 cursor-not-allowed opacity-60'
                                  : 'border-border hover:border-primary/50 hover:bg-accent/50'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h5 className="font-medium text-foreground text-sm">
                                    {exercise.title}
                                  </h5>
                                  {exercise.description && (
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                      {exercise.description}
                                    </p>
                                  )}
                                </div>
                                {alreadySent && (
                                  <Badge variant="outline" className="ml-2 text-xs shrink-0">
                                    <CheckCircle size={10} className="mr-1" />
                                    Déjà envoyé
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button
                onClick={handleSendExercise}
                disabled={!selectedExercise || sendExerciseMutation.isPending}
              >
                {sendExerciseMutation.isPending ? (
                  <Loader2 className="animate-spin mr-2" size={16} />
                ) : (
                  <Send size={16} className="mr-2" />
                )}
                Envoyer l'exercice
              </Button>
            </div>
          </TabsContent>

          {/* Onglet Historique */}
          <TabsContent value="history" className="mt-4">
            <ScrollArea className="h-[450px] pr-4">
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-primary" size={24} />
                </div>
              ) : !history?.submissions.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock size={40} className="mx-auto mb-2 opacity-50" />
                  <p>Aucune soumission d'exercice pour cet élève</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.submissions.map((submission: ExerciseSubmissionHistory) => (
                    <div
                      key={submission.id}
                      className="p-4 border rounded-lg bg-card"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-foreground">
                            {submission.exercise_title}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Leçon : {submission.lesson_title}
                          </p>
                        </div>
                        {getStatusBadge(submission.status)}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {submission.content}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatDate(submission.submitted_at)}</span>
                        {submission.file_url && (
                          <Badge variant="outline" className="text-xs">
                            <FileText size={10} className="mr-1" />
                            Fichier joint
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SendExerciseModalGroup;
