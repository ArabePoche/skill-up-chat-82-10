/**
 * Liste des évaluations existantes
 */
import React from 'react';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import { useEvaluations, useDeleteEvaluation } from '../hooks/useEvaluations';
import { useHasPermission } from '@/school-os/hooks/useSchoolUserRole';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
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
  const { data: evaluations = [], isLoading } = useEvaluations(
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
    return <div className="text-center py-12 text-muted-foreground">Chargement...</div>;
  }

  if (evaluations.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Aucune évaluation créée</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4">
        {evaluations.map((evaluation: any) => (
          <div
            key={evaluation.id}
            className="border border-border rounded-lg p-4 bg-card hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-foreground">{evaluation.name}</h3>
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {evaluation.evaluation_types?.name || 'Type inconnu'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {evaluation.evaluation_date
                      ? format(new Date(evaluation.evaluation_date), 'dd MMMM yyyy', { locale: fr })
                      : 'Date non définie'}
                  </div>
                  {evaluation.class_subjects && (
                    <div>
                      {evaluation.class_subjects.classes?.name} - {evaluation.class_subjects.subjects?.name}
                    </div>
                  )}
                </div>
                {evaluation.description && (
                  <p className="mt-2 text-sm text-muted-foreground">{evaluation.description}</p>
                )}
              </div>

              <div className="flex gap-2 ml-4">
                {canUpdate && (
                  <Button variant="outline" size="sm" onClick={() => onEdit(evaluation.id)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteId(evaluation.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette évaluation ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
