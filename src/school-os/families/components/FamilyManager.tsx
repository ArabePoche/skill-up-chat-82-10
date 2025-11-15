// Gestionnaire principal des familles
import React, { useState } from 'react';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { FamilyForm } from './FamilyForm';
import { useFamilies, useCreateFamily, useUpdateFamily, useDeleteFamily, Family } from '../hooks/useFamilies';

interface FamilyManagerProps {
  schoolId: string;
}

export const FamilyManager: React.FC<FamilyManagerProps> = ({ schoolId }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFamily, setEditingFamily] = useState<Family | null>(null);
  const [deletingFamily, setDeletingFamily] = useState<Family | null>(null);

  const { data: families, isLoading } = useFamilies(schoolId);
  const createMutation = useCreateFamily();
  const updateMutation = useUpdateFamily();
  const deleteMutation = useDeleteFamily();

  const handleCreate = (data: any) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        setIsFormOpen(false);
      },
    });
  };

  const handleUpdate = (data: any) => {
    if (editingFamily) {
      updateMutation.mutate(
        { id: editingFamily.id, ...data },
        {
          onSuccess: () => {
            setEditingFamily(null);
          },
        }
      );
    }
  };

  const handleDelete = () => {
    if (deletingFamily) {
      deleteMutation.mutate(
        { id: deletingFamily.id, schoolId },
        {
          onSuccess: () => {
            setDeletingFamily(null);
          },
        }
      );
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Familles</h2>
          <p className="text-muted-foreground">
            Gérez les liens familiaux entre élèves
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle Famille
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {families?.map((family) => (
          <Card key={family.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">{family.family_name}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingFamily(family)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeletingFamily(family)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {family.primary_contact_name && (
                <CardDescription>{family.primary_contact_name}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {family.primary_contact_phone && (
                <p className="text-muted-foreground">📱 {family.primary_contact_phone}</p>
              )}
              {family.primary_contact_email && (
                <p className="text-muted-foreground">✉️ {family.primary_contact_email}</p>
              )}
              {family.address && (
                <p className="text-muted-foreground">📍 {family.address}</p>
              )}
              {family.notes && (
                <p className="text-muted-foreground italic">💬 {family.notes}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {families?.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Aucune famille enregistrée. Créez-en une pour commencer.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialog création */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle Famille</DialogTitle>
            <DialogDescription>
              Créez une nouvelle famille pour lier plusieurs élèves
            </DialogDescription>
          </DialogHeader>
          <FamilyForm
            schoolId={schoolId}
            onSubmit={handleCreate}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog édition */}
      <Dialog open={!!editingFamily} onOpenChange={() => setEditingFamily(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la Famille</DialogTitle>
            <DialogDescription>
              Mettez à jour les informations de la famille
            </DialogDescription>
          </DialogHeader>
          {editingFamily && (
            <FamilyForm
              schoolId={schoolId}
              family={editingFamily}
              onSubmit={handleUpdate}
              onCancel={() => setEditingFamily(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog suppression */}
      <AlertDialog open={!!deletingFamily} onOpenChange={() => setDeletingFamily(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la famille ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera la famille "{deletingFamily?.family_name}". 
              Les élèves ne seront plus liés à cette famille.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
