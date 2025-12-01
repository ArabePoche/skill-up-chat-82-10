/**
 * Liste des évaluations d'une classe avec filtrage par matière
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  Calendar, 
  Edit, 
  Users, 
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ClassEvaluation, useClassEvaluations } from '../hooks/useClassEvaluations';

interface EvaluationsListViewProps {
  classId: string;
  subjectId?: string;
  onSelectEvaluation: (evaluation: ClassEvaluation) => void;
}

export const EvaluationsListView: React.FC<EvaluationsListViewProps> = ({
  classId,
  subjectId,
  onSelectEvaluation,
}) => {
  const { data: evaluations, isLoading } = useClassEvaluations(classId, subjectId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (!evaluations || evaluations.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Aucune évaluation</h3>
        <p className="text-muted-foreground">
          {subjectId 
            ? 'Aucune évaluation pour cette matière'
            : 'Aucune évaluation pour cette classe'
          }
        </p>
      </div>
    );
  }

  // Grouper par matière si aucun filtre de matière
  const groupedBySubject = new Map<string, ClassEvaluation[]>();
  evaluations.forEach(evaluation => {
    const key = evaluation.subject.id;
    if (!groupedBySubject.has(key)) {
      groupedBySubject.set(key, []);
    }
    groupedBySubject.get(key)!.push(evaluation);
  });

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 pr-4">
        {subjectId ? (
          // Vue filtrée par matière - liste simple
          evaluations.map((evaluation) => (
            <EvaluationCard 
              key={evaluation.id} 
              evaluation={evaluation} 
              onClick={() => onSelectEvaluation(evaluation)}
              showSubject={false}
            />
          ))
        ) : (
          // Vue groupée par matière
          Array.from(groupedBySubject.entries()).map(([subjectId, evals]) => (
            <div key={subjectId} className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground sticky top-0 bg-background py-2">
                <BookOpen className="h-4 w-4" />
                {evals[0].subject.name}
                <Badge variant="outline" className="ml-auto">
                  {evals.length} évaluation{evals.length > 1 ? 's' : ''}
                </Badge>
              </div>
              {evals.map((evaluation) => (
                <EvaluationCard 
                  key={evaluation.id} 
                  evaluation={evaluation} 
                  onClick={() => onSelectEvaluation(evaluation)}
                  showSubject={false}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );
};

interface EvaluationCardProps {
  evaluation: ClassEvaluation;
  onClick: () => void;
  showSubject?: boolean;
}

const EvaluationCard: React.FC<EvaluationCardProps> = ({ 
  evaluation, 
  onClick,
  showSubject = true 
}) => {
  const hasGrades = evaluation.grades_count > 0;

  return (
    <Card 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-foreground">{evaluation.name}</h4>
              {evaluation.evaluation_type && (
                <Badge variant="secondary" className="text-xs">
                  {evaluation.evaluation_type.name}
                </Badge>
              )}
            </div>
            
            {showSubject && (
              <p className="text-sm text-muted-foreground mb-1">
                {evaluation.subject.name}
              </p>
            )}
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {evaluation.evaluation_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(evaluation.evaluation_date), 'dd MMM yyyy', { locale: fr })}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Edit className="h-3 w-3" />
                /{evaluation.max_score}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {evaluation.grades_count} note{evaluation.grades_count !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={hasGrades ? 'default' : 'outline'}>
              {hasGrades ? 'Saisie' : 'À saisir'}
            </Badge>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
