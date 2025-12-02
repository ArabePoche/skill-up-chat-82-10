/**
 * Carte pliable pour une classe avec ses évaluations
 * Affiche les statistiques en résumé et la liste au clic
 */
import React, { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronUp, GraduationCap } from 'lucide-react';
import { ClassEvaluationStats } from './ClassEvaluationStats';
import { EvaluationItem } from './EvaluationItem';
import type { ClassEvaluationGroup } from '../../hooks/useEvaluationsGroupedByClass';

interface ClassEvaluationCardProps {
  group: ClassEvaluationGroup;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onConfigureSubject?: (
    evaluationId: string,
    subjectId: string,
    subjectName: string,
    classId: string,
    evaluationDate?: string | null
  ) => void;
  canUpdate?: boolean;
  canDelete?: boolean;
  defaultOpen?: boolean;
}

export const ClassEvaluationCard: React.FC<ClassEvaluationCardProps> = ({
  group,
  onEdit,
  onDelete,
  onConfigureSubject,
  canUpdate = true,
  canDelete = true,
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const hasOngoing = group.stats.ongoing > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card 
        className={`
          transition-all duration-200
          ${hasOngoing ? 'ring-2 ring-amber-500/30 bg-amber-500/5' : ''}
          ${isOpen ? 'shadow-md' : 'hover:shadow-sm'}
        `}
      >
        <CollapsibleTrigger className="w-full text-left">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4">
              {/* Nom de la classe */}
              <div className="flex items-center gap-3">
                <div className={`
                  p-2 rounded-lg 
                  ${hasOngoing 
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400' 
                    : 'bg-primary/10 text-primary'
                  }
                `}>
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground">
                    {group.class_name}
                  </h3>
                </div>
              </div>

              {/* Chevron */}
              <div className="text-muted-foreground">
                {isOpen ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </div>

            {/* Statistiques */}
            <div className="mt-3">
              <ClassEvaluationStats stats={group.stats} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-3 pt-3 border-t border-border">
              {/* Liste des évaluations triées */}
              {group.evaluations.length > 0 ? (
                <>
                  {/* Section en cours */}
                  {group.stats.ongoing > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                        En cours ({group.stats.ongoing})
                      </h4>
                      {group.evaluations
                        .filter(e => e.status === 'ongoing')
                        .map(evaluation => (
                          <EvaluationItem
                            key={evaluation.id}
                            evaluation={evaluation}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onConfigureSubject={onConfigureSubject}
                            canUpdate={canUpdate}
                            canDelete={canDelete}
                          />
                        ))}
                    </div>
                  )}

                  {/* Section à venir */}
                  {group.stats.upcoming > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-blue-700 dark:text-blue-400 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        À venir ({group.stats.upcoming})
                      </h4>
                      {group.evaluations
                        .filter(e => e.status === 'upcoming')
                        .map(evaluation => (
                          <EvaluationItem
                            key={evaluation.id}
                            evaluation={evaluation}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onConfigureSubject={onConfigureSubject}
                            canUpdate={canUpdate}
                            canDelete={canDelete}
                          />
                        ))}
                    </div>
                  )}

                  {/* Section passées */}
                  {group.stats.past > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                        Terminées ({group.stats.past})
                      </h4>
                      {group.evaluations
                        .filter(e => e.status === 'past')
                        .map(evaluation => (
                          <EvaluationItem
                            key={evaluation.id}
                            evaluation={evaluation}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onConfigureSubject={onConfigureSubject}
                            canUpdate={canUpdate}
                            canDelete={canDelete}
                          />
                        ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune évaluation pour cette classe
                </p>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
