/**
 * Liste des évaluations organisée par classes
 * Utilise des cartes pliables avec statistiques et tri intelligent
 */
import React from 'react';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import { useEvaluationsGroupedByClass } from '../hooks/useEvaluationsGroupedByClass';
import { useDeleteEvaluation } from '../hooks/useEvaluations';
import { useHasPermission } from '@/school-os/hooks/useSchoolUserRole';
import { ClassEvaluationCard } from './list/ClassEvaluationCard';
import { FileText, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EvaluationsListProps {
  onEdit: (id: string) => void;
}

export const EvaluationsList: React.FC<EvaluationsListProps> = ({ onEdit }) => {
  const { school, activeSchoolYear } = useSchoolYear();
  const { groupedEvaluations, isLoading, totalEvaluations } = useEvaluationsGroupedByClass(
    school?.id,
    activeSchoolYear?.id
  );
  const { hasPermission: canUpdate } = useHasPermission(school?.id, 'evaluation.update');
  const { hasPermission: canDelete } = useHasPermission(school?.id, 'evaluation.delete');
  const deleteMutation = useDeleteEvaluation();
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteMutation.mutateAsync(deleteId);
    setDeleteId(null);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Chargement des évaluations...</p>
      </div>
    );
  }

  if (totalEvaluations === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="p-4 rounded-full bg-muted/50 mb-4">
          <FileText className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">
          Aucune évaluation
        </h3>
        <p className="text-muted-foreground text-center max-w-md">
          Créez votre première évaluation pour commencer à gérer les devoirs, 
          interrogations et examens de vos classes.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Résumé global */}
      <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="font-medium text-foreground">
            {totalEvaluations} évaluation{totalEvaluations > 1 ? 's' : ''}
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">
            {groupedEvaluations.length} classe{groupedEvaluations.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Liste des classes avec leurs évaluations */}
      <div className="space-y-4">
        {groupedEvaluations.map((group) => (
          <ClassEvaluationCard
            key={group.class_id}
            group={group}
            onEdit={onEdit}
            onDelete={setDeleteId}
            canUpdate={canUpdate}
            canDelete={canDelete}
            defaultOpen={group.stats.ongoing > 0}
          />
        ))}
      </div>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette évaluation ? 
              Cette action est irréversible et supprimera également toutes les notes associées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
