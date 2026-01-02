/**
 * Dialog pour personnaliser les cycles scolaires
 * Permet de modifier le nom, le label et la base de notation de chaque cycle
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Plus, Trash2, Loader2, GripVertical } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  useSchoolCycles,
  useUpdateSchoolCycle,
  useCreateSchoolCycle,
  useDeleteSchoolCycle,
  SchoolCycle,
} from '@/school/hooks/useSchoolCycles';
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

interface CycleSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
}

interface EditableCycle {
  id: string;
  name: string;
  label: string;
  grade_base: number;
  isNew?: boolean;
}

export const CycleSettingsDialog: React.FC<CycleSettingsDialogProps> = ({
  open,
  onOpenChange,
  schoolId,
}) => {
  const { t } = useTranslation();
  const { data: cycles, isLoading } = useSchoolCycles(schoolId);
  const updateCycle = useUpdateSchoolCycle();
  const createCycle = useCreateSchoolCycle();
  const deleteCycle = useDeleteSchoolCycle();

  const [editableCycles, setEditableCycles] = useState<EditableCycle[]>([]);
  const [cycleToDelete, setCycleToDelete] = useState<EditableCycle | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync with fetched data
  useEffect(() => {
    if (cycles) {
      setEditableCycles(
        cycles.map((c) => ({
          id: c.id,
          name: c.name,
          label: c.label,
          grade_base: c.grade_base,
        }))
      );
    }
  }, [cycles]);

  const handleFieldChange = (id: string, field: keyof EditableCycle, value: string | number) => {
    setEditableCycles((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleAddCycle = () => {
    const newId = `new-${Date.now()}`;
    setEditableCycles((prev) => [
      ...prev,
      {
        id: newId,
        name: '',
        label: '',
        grade_base: 20,
        isNew: true,
      },
    ]);
  };

  const handleRemoveCycle = (cycle: EditableCycle) => {
    if (cycle.isNew) {
      setEditableCycles((prev) => prev.filter((c) => c.id !== cycle.id));
    } else {
      setCycleToDelete(cycle);
    }
  };

  const confirmDelete = async () => {
    if (!cycleToDelete) return;
    
    await deleteCycle.mutateAsync({ id: cycleToDelete.id, schoolId });
    setEditableCycles((prev) => prev.filter((c) => c.id !== cycleToDelete.id));
    setCycleToDelete(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      for (const cycle of editableCycles) {
        if (cycle.isNew) {
          // Create new cycle
          await createCycle.mutateAsync({
            school_id: schoolId,
            name: cycle.name,
            label: cycle.label,
            grade_base: cycle.grade_base,
            order_index: editableCycles.indexOf(cycle),
            is_active: true,
          });
        } else {
          // Update existing cycle
          const original = cycles?.find((c) => c.id === cycle.id);
          if (
            original &&
            (original.name !== cycle.name ||
              original.label !== cycle.label ||
              original.grade_base !== cycle.grade_base)
          ) {
            await updateCycle.mutateAsync({
              id: cycle.id,
              updates: {
                name: cycle.name,
                label: cycle.label,
                grade_base: cycle.grade_base,
              },
            });
          }
        }
      }
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Personnaliser les cycles
            </DialogTitle>
            <DialogDescription>
              Configurez les cycles scolaires et leurs bases de notation
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {editableCycles.map((cycle, index) => (
                  <Card key={cycle.id} className="relative">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-5 w-5 text-muted-foreground mt-2 cursor-grab" />
                        
                        <div className="flex-1 grid gap-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Identifiant</Label>
                              <Input
                                value={cycle.name}
                                onChange={(e) =>
                                  handleFieldChange(cycle.id, 'name', e.target.value.toLowerCase().replace(/\s+/g, '_'))
                                }
                                placeholder="ex: primaire"
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Nom affiché</Label>
                              <Input
                                value={cycle.label}
                                onChange={(e) =>
                                  handleFieldChange(cycle.id, 'label', e.target.value)
                                }
                                placeholder="ex: Primaire"
                                className="h-9"
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="space-y-1.5 flex-1">
                              <Label className="text-xs">Base de notation</Label>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">/</span>
                                <Input
                                  type="number"
                                  value={cycle.grade_base}
                                  onChange={(e) =>
                                    handleFieldChange(cycle.id, 'grade_base', parseInt(e.target.value) || 20)
                                  }
                                  min={1}
                                  max={100}
                                  className="h-9 w-20"
                                />
                                <Badge variant="outline" className="text-xs">
                                  Moyennes sur {cycle.grade_base}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveCycle(cycle)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleAddCycle}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un cycle
                </Button>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Enregistrement...
                </>
              ) : (
                'Enregistrer'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!cycleToDelete} onOpenChange={() => setCycleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce cycle ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le cycle "{cycleToDelete?.label}" sera désactivé. Les classes existantes de ce cycle ne seront pas affectées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
