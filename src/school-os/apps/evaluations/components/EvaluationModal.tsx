/**
 * Modal de création/édition d'évaluation
 * Formulaire complet avec sections pliables
 */
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import { GeneralInfoSection } from './GeneralInfoSection';
import { ClassesSection } from './ClassesSection';
import { useCreateEvaluation, useUpdateEvaluation, type EvaluationData, type ClassConfig } from '../hooks/useEvaluations';

const evaluationSchema = z.object({
  title: z.string().min(1, 'Le titre est requis'),
  evaluation_type_id: z.string().min(1, 'Le type est requis'),
  selected_classes: z.array(z.string()).min(1, 'Sélectionnez au moins une classe'),
});

type EvaluationFormData = z.infer<typeof evaluationSchema>;

interface EvaluationModalProps {
  evaluationId?: string | null;
  onClose: () => void;
}

export const EvaluationModal: React.FC<EvaluationModalProps> = ({
  evaluationId,
  onClose,
}) => {
  const { school, activeSchoolYear } = useSchoolYear();
  const [classesConfig, setClassesConfig] = useState<Record<string, ClassConfig>>({});
  
  const createMutation = useCreateEvaluation();
  const updateMutation = useUpdateEvaluation();

  const form = useForm<EvaluationFormData>({
    resolver: zodResolver(evaluationSchema),
    defaultValues: {
      title: '',
      evaluation_type_id: '',
      selected_classes: [],
    },
  });

  const handleSubmit = async (data: EvaluationFormData) => {
    if (!school?.id || !activeSchoolYear?.id) return;

    // Vérifier qu'on a une config pour chaque classe
    const missingConfig = data.selected_classes.find(classId => !classesConfig[classId]);
    if (missingConfig) {
      form.setError('selected_classes', {
        message: 'Veuillez configurer toutes les classes sélectionnées',
      });
      return;
    }

    const evaluationData: EvaluationData = {
      title: data.title,
      evaluation_type_id: data.evaluation_type_id,
      school_id: school.id,
      school_year_id: activeSchoolYear.id,
      classes_config: Object.values(classesConfig),
    };

    try {
      if (evaluationId) {
        await updateMutation.mutateAsync({ id: evaluationId, data: evaluationData });
      } else {
        await createMutation.mutateAsync(evaluationData);
      }
      onClose();
    } catch (error) {
      console.error('Error submitting evaluation:', error);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {evaluationId ? 'Modifier l\'évaluation' : 'Nouvelle évaluation'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Section 1 : Informations générales */}
            <GeneralInfoSection form={form} />

            {/* Section 2 : Classes et leur configuration */}
            <ClassesSection
              form={form}
              classesConfig={classesConfig}
              onConfigChange={setClassesConfig}
            />

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {evaluationId ? 'Mettre à jour' : 'Créer l\'évaluation'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
