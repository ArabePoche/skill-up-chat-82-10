/**
 * Composant pour gérer les années scolaires
 */
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSchoolYears, useCreateSchoolYear, useUpdateSchoolYear, useDeleteSchoolYear } from '@/school/hooks/useSchool';
import { Calendar, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SchoolYearsSettingsProps {
  schoolId: string;
}

export const SchoolYearsSettings: React.FC<SchoolYearsSettingsProps> = ({ schoolId }) => {
  const { data: schoolYears, isLoading } = useSchoolYears(schoolId);
  const createSchoolYear = useCreateSchoolYear();
  const updateSchoolYear = useUpdateSchoolYear();
  const deleteSchoolYear = useDeleteSchoolYear();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteYearId, setDeleteYearId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    year_label: '',
    start_date: '',
    end_date: '',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createSchoolYear.mutateAsync({
      school_id: schoolId,
      ...formData,
    });
    setShowCreateDialog(false);
    setFormData({ year_label: '', start_date: '', end_date: '' });
  };

  const handleSetActive = async (yearId: string) => {
    // Désactiver toutes les autres années
    if (schoolYears) {
      for (const year of schoolYears) {
        if (year.id !== yearId && year.is_active) {
          await updateSchoolYear.mutateAsync({
            id: year.id,
            school_id: schoolId,
            is_active: false,
          });
        }
      }
    }
    // Activer l'année sélectionnée
    await updateSchoolYear.mutateAsync({
      id: yearId,
      school_id: schoolId,
      is_active: true,
    });
  };

  const handleDelete = async () => {
    if (deleteYearId) {
      await deleteSchoolYear.mutateAsync({
        id: deleteYearId,
        school_id: schoolId,
      });
      setDeleteYearId(null);
    }
  };

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <CardTitle>Années scolaires</CardTitle>
              </div>
              <CardDescription className="mt-2">
                Gérez les années scolaires de votre établissement
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle année
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {schoolYears && schoolYears.length > 0 ? (
            <div className="space-y-3">
              {schoolYears.map((year) => (
                <div
                  key={year.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{year.year_label}</h3>
                      {year.is_active && (
                        <Badge variant="default" className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Du {format(new Date(year.start_date), 'dd MMMM yyyy', { locale: fr })} au{' '}
                      {format(new Date(year.end_date), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!year.is_active && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetActive(year.id)}
                      >
                        Définir comme active
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteYearId(year.id)}
                      disabled={year.is_active}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune année scolaire</h3>
              <p className="text-muted-foreground mb-4">
                Commencez par créer votre première année scolaire
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer une année scolaire
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de création */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle année scolaire</DialogTitle>
            <DialogDescription>
              Créez une nouvelle année scolaire pour votre établissement
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="year_label">Nom de l'année *</Label>
                <Input
                  id="year_label"
                  value={formData.year_label}
                  onChange={(e) => setFormData({ ...formData, year_label: e.target.value })}
                  placeholder="Ex: 2024-2025"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Date de début *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">Date de fin *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={createSchoolYear.isPending}>
                {createSchoolYear.isPending ? 'Création...' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={!!deleteYearId} onOpenChange={() => setDeleteYearId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'année scolaire ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les données associées à cette année seront conservées
              mais ne seront plus liées à une année spécifique.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};