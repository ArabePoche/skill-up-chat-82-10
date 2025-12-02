/**
 * Section de sélection et configuration des classes
 */
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { UseFormReturn } from 'react-hook-form';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import { useSchoolClasses } from '@/school/hooks/useClasses';
import { ClassConfigBlock } from './ClassConfigBlock';
import type { ClassConfig } from '../hooks/useEvaluations';

interface ClassesSectionProps {
  form: UseFormReturn<any>;
  classesConfig: Record<string, ClassConfig>;
  onConfigChange: (config: Record<string, ClassConfig>) => void;
}

export const ClassesSection: React.FC<ClassesSectionProps> = ({
  form,
  classesConfig,
  onConfigChange,
}) => {
  const { school, activeSchoolYear } = useSchoolYear();
  const { data: classes = [] } = useSchoolClasses(school?.id, activeSchoolYear?.id);

  const selectedClasses = form.watch('selected_classes') || [];

  const handleClassToggle = (classId: string, checked: boolean) => {
    const current = selectedClasses;
    const updated = checked
      ? [...current, classId]
      : current.filter((id: string) => id !== classId);

    form.setValue('selected_classes', updated);

    if (checked) {
      // Initialiser une config par défaut quand une classe est cochée
      if (!classesConfig[classId]) {
        onConfigChange({
          ...classesConfig,
          [classId]: {
            class_id: classId,
            subjects: [],
            subject_schedules: [],
            excluded_students: [],
            supervisors: [],
            room: '',
            location_type: 'room',
            date: '',
            start_time: '',
            end_time: '',
            questionnaires: [],
          },
        });
      }
    } else {
      // Supprimer la config si la classe est décochée
      if (classesConfig[classId]) {
        const newConfig = { ...classesConfig };
        delete newConfig[classId];
        onConfigChange(newConfig);
      }
    }
  };

  const handleClassConfigChange = (classId: string, config: ClassConfig) => {
    onConfigChange({
      ...classesConfig,
      [classId]: config,
    });
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-muted/30 rounded-lg border border-border">
        <h3 className="font-semibold text-lg text-foreground mb-3">Classes concernées</h3>

        <FormField
          control={form.control}
          name="selected_classes"
          render={() => (
            <FormItem>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {classes.map((classe) => (
                  <FormField
                    key={classe.id}
                    control={form.control}
                    name="selected_classes"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={selectedClasses.includes(classe.id)}
                            onCheckedChange={(checked) =>
                              handleClassToggle(classe.id, checked as boolean)
                            }
                          />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          {classe.name}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Configuration par classe */}
      {selectedClasses.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg text-foreground">Configuration par classe</h3>
          {selectedClasses.map((classId: string) => {
            const classe = classes.find((c) => c.id === classId);
            if (!classe) return null;

            return (
              <ClassConfigBlock
                key={classId}
                classData={classe}
                config={classesConfig[classId]}
                onConfigChange={(config) => handleClassConfigChange(classId, config)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
