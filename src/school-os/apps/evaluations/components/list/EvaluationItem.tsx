/**
 * Item d'évaluation individuel dans la liste
 * Affiche les détails : titre, matière, date, salle, statut, actions
 */
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  UserMinus, 
  Settings, 
  BookOpen,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { EvaluationWithStatus } from '../../hooks/useEvaluationsGroupedByClass';

interface EvaluationItemProps {
  evaluation: EvaluationWithStatus;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  canUpdate?: boolean;
  canDelete?: boolean;
}

export const EvaluationItem: React.FC<EvaluationItemProps> = ({
  evaluation,
  onEdit,
  onDelete,
  canUpdate = true,
  canDelete = true,
}) => {
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

  return (
    <div 
      className={`
        border rounded-lg p-4 transition-all duration-200
        ${evaluation.status === 'past' 
          ? 'bg-muted/30 border-muted' 
          : evaluation.status === 'ongoing'
            ? 'bg-amber-500/5 border-amber-500/20 shadow-sm'
            : 'bg-card border-border hover:shadow-sm'
        }
      `}
    >
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

          {/* Informations */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {/* Matière */}
            <div className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              <span>{evaluation.subject_name}</span>
            </div>

            {/* Date */}
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDate(evaluation.evaluation_date)}</span>
            </div>

            {/* Horaires (si disponibles) */}
            {evaluation.start_time && evaluation.end_time && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>{evaluation.start_time} - {evaluation.end_time}</span>
              </div>
            )}

            {/* Salle (si disponible) */}
            {evaluation.room && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                <span>{evaluation.room}</span>
              </div>
            )}
          </div>

          {/* Participants (si disponibles) */}
          {(evaluation.participants_count !== undefined || evaluation.excluded_count !== undefined) && (
            <div className="flex items-center gap-3 text-sm">
              {evaluation.participants_count !== undefined && (
                <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                  <Users className="h-3.5 w-3.5" />
                  <span>{evaluation.participants_count} participants</span>
                </div>
              )}
              {evaluation.excluded_count !== undefined && evaluation.excluded_count > 0 && (
                <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
                  <UserMinus className="h-3.5 w-3.5" />
                  <span>{evaluation.excluded_count} exclus</span>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {evaluation.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {evaluation.description}
            </p>
          )}

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

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {canUpdate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(evaluation.id)}
              className="gap-1.5"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Configurer</span>
            </Button>
          )}
          {canDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(evaluation.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
