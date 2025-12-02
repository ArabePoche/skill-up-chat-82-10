/**
 * Liste des évaluations pour une matière spécifique
 * Utilisé dans la méthode 2 (saisie par matière)
 */
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { FileText, Calendar, Users, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useSubjectEvaluations, SubjectEvaluation } from '../hooks/useSubjectEvaluations';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SubjectEvaluationsListViewProps {
  classId: string;
  subjectId: string;
  subjectName: string;
  onSelectEvaluation: (evaluation: SubjectEvaluation) => void;
}

export const SubjectEvaluationsListView: React.FC<SubjectEvaluationsListViewProps> = ({
  classId,
  subjectId,
  subjectName,
  onSelectEvaluation,
}) => {
  const { data: evaluations, isLoading, error } = useSubjectEvaluations(classId, subjectId);

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Erreur lors du chargement des évaluations
      </div>
    );
  }

  if (!evaluations || evaluations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Aucune évaluation</h3>
        <p className="text-muted-foreground max-w-md">
          Aucune évaluation n'a été créée pour {subjectName} dans cette classe.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3 p-4">
        {evaluations.map((evaluation) => {
          const progress = evaluation.students_count > 0
            ? (evaluation.grades_entered / evaluation.students_count) * 100
            : 0;
          const isComplete = progress === 100;

          return (
            <Card
              key={evaluation.id}
              className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => onSelectEvaluation(evaluation)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold truncate">{evaluation.name}</h4>
                    {isComplete && (
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mb-3">
                    {evaluation.evaluation_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(evaluation.evaluation_date), 'dd MMM yyyy', { locale: fr })}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {evaluation.grades_entered}/{evaluation.students_count} notes
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <Progress value={progress} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground w-12 text-right">
                      {Math.round(progress)}%
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <Badge variant="outline">/{evaluation.max_score}</Badge>
                  <Badge variant="secondary">Coef. {evaluation.coefficient}</Badge>
                  <Button variant="ghost" size="icon" className="mt-2">
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
};
