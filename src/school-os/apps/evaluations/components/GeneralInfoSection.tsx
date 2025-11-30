/**
 * Section des informations générales de l'évaluation
 */
import React, { useState } from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import { useEvaluationTypes, useCreateEvaluationType } from '../hooks/useEvaluationTypes';
import { Textarea } from '@/components/ui/textarea';

interface GeneralInfoSectionProps {
  form: UseFormReturn<any>;
}

export const GeneralInfoSection: React.FC<GeneralInfoSectionProps> = ({ form }) => {
  const { school } = useSchoolYear();
  const { data: evaluationTypes = [] } = useEvaluationTypes(school?.id);
  const createTypeMutation = useCreateEvaluationType();
  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDescription, setNewTypeDescription] = useState('');

  const handleAddType = async () => {
    if (!school?.id || !newTypeName.trim()) return;

    await createTypeMutation.mutateAsync({
      name: newTypeName,
      description: newTypeDescription || undefined,
      schoolId: school.id,
    });

    setShowAddTypeModal(false);
    setNewTypeName('');
    setNewTypeDescription('');
  };

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
      <h3 className="font-semibold text-lg text-foreground">Informations générales</h3>

      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Titre de l'évaluation *</FormLabel>
            <FormControl>
              <Input placeholder="Ex: Devoir de mathématiques - Chapitre 3" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-2">
        <FormField
          control={form.control}
          name="evaluation_type_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type d'évaluation *</FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un type" />
                  </SelectTrigger>
                  <SelectContent>
                    {evaluationTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setShowAddTypeModal(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un type d'évaluation spécifique à l'école
        </Button>
      </div>

      {/* Modal pour ajouter un type */}
      <Dialog open={showAddTypeModal} onOpenChange={setShowAddTypeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau type d'évaluation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nom du type *</label>
              <Input
                placeholder="Ex: Évaluation pratique"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optionnel)</label>
              <Textarea
                placeholder="Description du type d'évaluation"
                value={newTypeDescription}
                onChange={(e) => setNewTypeDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTypeModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddType} disabled={!newTypeName.trim()}>
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
