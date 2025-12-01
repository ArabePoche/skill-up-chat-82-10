/**
 * Statistiques résumées d'une classe pour la carte pliable
 * Affiche : total, prochaine évaluation, en cours, à venir, passées
 */
import React from 'react';
import { Calendar, Clock, CheckCircle2, AlertCircle, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ClassEvaluationGroup } from '../../hooks/useEvaluationsGroupedByClass';

interface ClassEvaluationStatsProps {
  stats: ClassEvaluationGroup['stats'];
}

export const ClassEvaluationStats: React.FC<ClassEvaluationStatsProps> = ({ stats }) => {
  const { total, ongoing, upcoming, past, nextEvaluation } = stats;

  const formatDaysUntil = (days: number | null): string => {
    if (days === null) return 'Date non définie';
    if (days === 0) return "Aujourd'hui";
    if (days === 1) return 'J-1';
    if (days > 0) return `J-${days}`;
    return 'Passée';
  };

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      {/* Total */}
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <BookOpen className="h-4 w-4" />
        <span className="font-medium">{total}</span>
        <span>évaluation{total > 1 ? 's' : ''}</span>
      </div>

      {/* Séparateur */}
      <div className="h-4 w-px bg-border" />

      {/* Prochaine évaluation */}
      {nextEvaluation && (
        <div className="flex items-center gap-2">
          <Badge 
            variant={nextEvaluation.status === 'ongoing' ? 'default' : 'secondary'}
            className={nextEvaluation.status === 'ongoing' 
              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30' 
              : 'bg-primary/10 text-primary border-primary/20'}
          >
            <Calendar className="h-3 w-3 mr-1" />
            {formatDaysUntil(nextEvaluation.daysUntil)}
          </Badge>
          <span className="text-foreground font-medium truncate max-w-[150px]">
            {nextEvaluation.name}
          </span>
        </div>
      )}

      {/* Séparateur */}
      <div className="h-4 w-px bg-border hidden sm:block" />

      {/* Statuts rapides */}
      <div className="flex items-center gap-2 hidden sm:flex">
        {ongoing > 0 && (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
            <AlertCircle className="h-3 w-3 mr-1" />
            {ongoing} en cours
          </Badge>
        )}
        {upcoming > 0 && (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30">
            <Clock className="h-3 w-3 mr-1" />
            {upcoming} à venir
          </Badge>
        )}
        {past > 0 && (
          <Badge variant="outline" className="bg-muted text-muted-foreground">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {past} terminée{past > 1 ? 's' : ''}
          </Badge>
        )}
      </div>
    </div>
  );
};
