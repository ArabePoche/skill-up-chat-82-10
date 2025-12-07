/**
 * Liste des compositions et examens officiels
 */
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Edit, Trash2, Calendar, Users, BookOpen } from 'lucide-react';
import { useCompositions, useDeleteComposition } from '../hooks/useCompositions';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import type { CompositionWithRelations } from '../types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface CompositionsListProps {
  onEdit: (composition: CompositionWithRelations) => void;
}

const TYPE_COLORS: Record<string, string> = {
  'Composition': 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  'Trimestre': 'bg-purple-500/10 text-purple-700 border-purple-500/30',
  'Semestre': 'bg-orange-500/10 text-orange-700 border-orange-500/30',
  'Examen': 'bg-red-500/10 text-red-700 border-red-500/30',
  'Session': 'bg-green-500/10 text-green-700 border-green-500/30',
};

export const CompositionsList: React.FC<CompositionsListProps> = ({ onEdit }) => {
  const { school, activeSchoolYear } = useSchoolYear();
  const { data: compositions = [], isLoading } = useCompositions(school?.id, activeSchoolYear?.id);
  const deleteMutation = useDeleteComposition();

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (compositions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Aucune composition créée
          </h3>
          <p className="text-sm text-muted-foreground">
            Créez votre première composition ou examen pour générer des bulletins
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {compositions.map(composition => {
        const classCount = composition.school_composition_classes?.length || 0;
        const excludedStudentsCount = composition.school_composition_excluded_students?.length || 0;
        const excludedSubjectsCount = composition.school_composition_excluded_subjects?.length || 0;

        return (
          <Card key={composition.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg truncate">{composition.title}</h3>
                    <Badge className={TYPE_COLORS[composition.type] || 'bg-muted'}>
                      {composition.type}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    {composition.start_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(new Date(composition.start_date), 'dd MMM yyyy', { locale: fr })}
                          {composition.end_date && ` - ${format(new Date(composition.end_date), 'dd MMM yyyy', { locale: fr })}`}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{classCount} classe(s)</span>
                    </div>

                    {excludedStudentsCount > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {excludedStudentsCount} élève(s) exclu(s)
                      </Badge>
                    )}

                    {excludedSubjectsCount > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {excludedSubjectsCount} matière(s) exclue(s)
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(composition)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer cette composition ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action est irréversible. Les notes associées seront également supprimées.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(composition.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
