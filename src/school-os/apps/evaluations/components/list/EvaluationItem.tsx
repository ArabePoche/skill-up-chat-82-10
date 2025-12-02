/**
 * Item d'évaluation individuel pliable
 * Affiche les détails et permet de gérer les matières
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  UserMinus, 
  Settings, 
  BookOpen,
  Trash2,
  ChevronDown,
  ChevronUp,
  Edit,
  Replace,
  CalendarClock
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { EvaluationWithStatus } from '../../hooks/useEvaluationsGroupedByClass';

interface EvaluationItemProps {
  evaluation: EvaluationWithStatus;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onEditSubject?: (evaluationId: string, subjectId: string) => void;
  onReplaceSubject?: (evaluationId: string, subjectId: string) => void;
  onDeleteSubject?: (evaluationId: string, subjectId: string) => void;
  onEditSubjectDateTime?: (evaluationId: string, subjectId: string) => void;
  canUpdate?: boolean;
  canDelete?: boolean;
}

export const EvaluationItem: React.FC<EvaluationItemProps> = ({
  evaluation,
  onEdit,
  onDelete,
  onEditSubject,
  onReplaceSubject,
  onDeleteSubject,
  onEditSubjectDateTime,
  canUpdate = true,
  canDelete = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const getStatusConfig = (status: EvaluationWithStatus['status']) => {
    switch (status) {
      case 'ongoing':
        return {
          label: 'En cours',
          className: 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30',
        };
      case 'upcoming':
        return {
          label: 'À venir',
          className: 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30',
        };
      case 'past':
        return {
          label: 'Terminée',
          className: 'bg-muted text-muted-foreground border-muted',
        };
    }
  };

  const statusConfig = getStatusConfig(evaluation.status);

  const formatDate = (date: string | null): string => {
    if (!date) return 'Date non définie';
    return format(new Date(date), 'EEEE dd MMMM yyyy', { locale: fr });
  };

  const subjectsCount = evaluation.subjects?.length || 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div 
        className={`
          border rounded-lg transition-all duration-200
          ${evaluation.status === 'past' 
            ? 'bg-muted/30 border-muted' 
            : evaluation.status === 'ongoing'
              ? 'bg-amber-500/5 border-amber-500/20 shadow-sm'
              : 'bg-card border-border hover:shadow-sm'
          }
          ${isOpen ? 'shadow-md' : ''}
        `}
      >
        <CollapsibleTrigger className="w-full text-left">
          <div className="p-4">
            <div className="flex items-start justify-between gap-4">
              {/* Contenu principal */}
              <div className="flex-1 min-w-0 space-y-2">
                {/* Titre et statut */}
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-foreground">{evaluation.name}</h4>
                  <Badge variant="outline" className={statusConfig.className}>
                    {statusConfig.label}
                  </Badge>
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    {evaluation.evaluation_type_name}
                  </Badge>
                </div>

                {/* Résumé des matières */}
                <div className="flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">
                    {subjectsCount} matière{subjectsCount > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Informations */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formatDate(evaluation.evaluation_date)}</span>
                  </div>

                  {evaluation.start_time && evaluation.end_time && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{evaluation.start_time} - {evaluation.end_time}</span>
                    </div>
                  )}

                  {evaluation.room && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{evaluation.room}</span>
                    </div>
                  )}
                </div>

                {/* Note max et coefficient */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Note max: {evaluation.max_score}</span>
                  <span>•</span>
                  <span>Coefficient: {evaluation.coefficient}</span>
                  {!evaluation.include_in_average && (
                    <>
                      <span>•</span>
                      <span className="text-amber-600">Non comptée dans la moyenne</span>
                    </>
                  )}
                </div>
              </div>

              {/* Chevron */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-muted-foreground">
                  {isOpen ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0">
            <div className="border-t border-border pt-4 space-y-4">
              {/* Liste des matières */}
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Matières de l'évaluation
                </h5>
                
                {evaluation.subjects && evaluation.subjects.length > 0 ? (
                  <div className="space-y-2">
                    {evaluation.subjects.map((subject) => (
                      <div 
                        key={subject.subject_id}
                        className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <BookOpen className="h-4 w-4 text-primary" />
                          </div>
                          <p className="font-medium text-foreground text-sm">
                            {subject.subject_name}
                          </p>
                        </div>

                        {/* Actions pour chaque matière */}
                        {canUpdate && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditSubject?.(evaluation.id, subject.subject_id);
                              }}
                              title="Modifier"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditSubjectDateTime?.(evaluation.id, subject.subject_id);
                              }}
                              title="Modifier date/heure"
                            >
                              <CalendarClock className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                onReplaceSubject?.(evaluation.id, subject.subject_id);
                              }}
                              title="Remplacer"
                            >
                              <Replace className="h-3.5 w-3.5" />
                            </Button>
                            {canDelete && evaluation.subjects && evaluation.subjects.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteSubject?.(evaluation.id, subject.subject_id);
                                }}
                                title="Supprimer cette matière"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Aucune matière associée
                  </p>
                )}
              </div>

              {/* Description */}
              {evaluation.description && (
                <div className="space-y-1">
                  <h5 className="text-sm font-medium text-foreground">Description</h5>
                  <p className="text-sm text-muted-foreground">
                    {evaluation.description}
                  </p>
                </div>
              )}

              {/* Élèves exclus */}
              {evaluation.excluded_students && evaluation.excluded_students.length > 0 && (
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
                    <UserMinus className="h-4 w-4" />
                    <span>{evaluation.excluded_students.length} élève(s) exclu(s)</span>
                  </div>
                </div>
              )}

              {/* Actions globales */}
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                {canUpdate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(evaluation.id);
                    }}
                    className="gap-1.5"
                  >
                    <Settings className="h-4 w-4" />
                    Configurer l'évaluation
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(evaluation.id);
                    }}
                    className="text-destructive hover:text-destructive gap-1.5"
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
