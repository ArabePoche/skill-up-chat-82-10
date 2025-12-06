/**
 * Modal de création/édition d'une composition ou examen officiel
 */
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import { useSchoolClasses } from '@/school/hooks/useClasses';
import { useCreateComposition, useUpdateComposition } from '../hooks/useCompositions';
import { useClassesWithSubjectsAndStudents } from '../hooks/useClassesWithSubjectsAndStudents';
import { CompositionClassesSelector } from './CompositionClassesSelector';
import { CompositionExcludedSubjects } from './CompositionExcludedSubjects';
import { CompositionExcludedStudents } from './CompositionExcludedStudents';
import type { CompositionType, CreateCompositionData, CompositionWithRelations } from '../types';

const COMPOSITION_TYPES: { value: CompositionType; label: string }[] = [
  { value: 'composition', label: 'Composition' },
  { value: 'trimestre', label: 'Trimestre' },
  { value: 'semestre', label: 'Semestre' },
  { value: 'examen', label: 'Examen' },
  { value: 'session', label: 'Session' },
];

interface CompositionModalProps {
  composition?: CompositionWithRelations | null;
  onClose: () => void;
}

export const CompositionModal: React.FC<CompositionModalProps> = ({
  composition,
  onClose,
}) => {
  const { school, activeSchoolYear } = useSchoolYear();
  const { data: allClasses = [] } = useSchoolClasses(school?.id, activeSchoolYear?.id);

  const createMutation = useCreateComposition();
  const updateMutation = useUpdateComposition();

  // Form state
  const [title, setTitle] = useState(composition?.title || '');
  const [type, setType] = useState<CompositionType>(composition?.type as CompositionType || 'composition');
  const [startDate, setStartDate] = useState(composition?.start_date || '');
  const [endDate, setEndDate] = useState(composition?.end_date || '');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [excludedSubjects, setExcludedSubjects] = useState<{ class_id: string; subject_id: string }[]>([]);
  const [excludedStudents, setExcludedStudents] = useState<string[]>([]);

  // Charger les détails des classes sélectionnées
  const { data: classesDetails = [] } = useClassesWithSubjectsAndStudents(
    school?.id,
    activeSchoolYear?.id,
    selectedClassIds
  );

  // Initialiser avec les données existantes
  useEffect(() => {
    if (composition) {
      const classIds = composition.school_composition_classes?.map(c => c.class_id) || [];
      setSelectedClassIds(classIds);

      const excludedSubjs = composition.school_composition_excluded_subjects?.map(s => ({
        class_id: s.class_id,
        subject_id: s.subject_id,
      })) || [];
      setExcludedSubjects(excludedSubjs);

      const excludedStuds = composition.school_composition_excluded_students?.map(s => s.student_id) || [];
      setExcludedStudents(excludedStuds);
    }
  }, [composition]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!school?.id || !activeSchoolYear?.id) return;
    if (!title.trim() || selectedClassIds.length === 0) return;

    const data: CreateCompositionData = {
      title: title.trim(),
      type,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      class_ids: selectedClassIds,
      excluded_subjects: excludedSubjects,
      excluded_students: excludedStudents,
    };

    try {
      if (composition) {
        await updateMutation.mutateAsync({ id: composition.id, data });
      } else {
        await createMutation.mutateAsync({
          schoolId: school.id,
          schoolYearId: activeSchoolYear.id,
          data,
        });
      }
      onClose();
    } catch (error) {
      console.error('Error saving composition:', error);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {composition ? 'Modifier la composition' : 'Nouvelle composition / examen'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informations générales */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Informations générales</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titre *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: 1er Trimestre, Composition Octobre..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select value={type} onValueChange={(v) => setType(v as CompositionType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPOSITION_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Date de début</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">Date de fin</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Sélection des classes */}
            <CompositionClassesSelector
              allClasses={allClasses}
              selectedClassIds={selectedClassIds}
              onSelectionChange={setSelectedClassIds}
            />

            {/* Exclusion de matières */}
            {classesDetails.length > 0 && (
              <CompositionExcludedSubjects
                classesDetails={classesDetails}
                excludedSubjects={excludedSubjects}
                onExcludedChange={setExcludedSubjects}
              />
            )}

            {/* Exclusion d'élèves */}
            {classesDetails.length > 0 && (
              <CompositionExcludedStudents
                classesDetails={classesDetails}
                excludedStudents={excludedStudents}
                onExcludedChange={setExcludedStudents}
              />
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border sticky bottom-0 bg-background pb-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" disabled={isLoading || !title.trim() || selectedClassIds.length === 0}>
                {composition ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
