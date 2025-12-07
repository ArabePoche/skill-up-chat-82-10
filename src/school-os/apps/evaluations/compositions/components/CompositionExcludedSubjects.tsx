/**
 * Gestion des matières exclues par classe (collapsible)
 */
import React, { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ClassWithDetails } from '../hooks/useClassesWithSubjectsAndStudents';

interface CompositionExcludedSubjectsProps {
  classesDetails: ClassWithDetails[];
  excludedSubjects: { class_id: string; subject_id: string }[];
  onExcludedChange: (excluded: { class_id: string; subject_id: string }[]) => void;
}

export const CompositionExcludedSubjects: React.FC<CompositionExcludedSubjectsProps> = ({
  classesDetails,
  excludedSubjects,
  onExcludedChange,
}) => {
  const [openClasses, setOpenClasses] = useState<Record<string, boolean>>({});

  const isExcluded = (classId: string, subjectId: string) => {
    return excludedSubjects.some(e => e.class_id === classId && e.subject_id === subjectId);
  };

  const toggleSubject = (classId: string, subjectId: string) => {
    if (isExcluded(classId, subjectId)) {
      onExcludedChange(excludedSubjects.filter(
        e => !(e.class_id === classId && e.subject_id === subjectId)
      ));
    } else {
      onExcludedChange([...excludedSubjects, { class_id: classId, subject_id: subjectId }]);
    }
  };

  const toggleAllForClass = (classId: string, subjects: { subject_id: string }[]) => {
    const allExcluded = subjects.every(s => isExcluded(classId, s.subject_id));
    
    if (allExcluded) {
      // Réintégrer toutes les matières de cette classe
      onExcludedChange(excludedSubjects.filter(e => e.class_id !== classId));
    } else {
      // Exclure toutes les matières de cette classe
      const newExcluded = excludedSubjects.filter(e => e.class_id !== classId);
      subjects.forEach(s => {
        newExcluded.push({ class_id: classId, subject_id: s.subject_id });
      });
      onExcludedChange(newExcluded);
    }
  };

  const toggleClass = (classId: string) => {
    setOpenClasses(prev => ({ ...prev, [classId]: !prev[classId] }));
  };

  const getExcludedCountForClass = (classId: string, subjects: { subject_id: string }[]) => {
    return subjects.filter(s => isExcluded(classId, s.subject_id)).length;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Exclusion de matières</CardTitle>
        <p className="text-sm text-muted-foreground">
          Décochez les matières à exclure du bulletin pour chaque classe
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {classesDetails.map(cls => {
          const excludedCount = getExcludedCountForClass(cls.id, cls.subjects);
          const isOpen = openClasses[cls.id] ?? false;
          const allExcluded = cls.subjects.length > 0 && excludedCount === cls.subjects.length;

          return (
            <Collapsible key={cls.id} open={isOpen} onOpenChange={() => toggleClass(cls.id)}>
              <div className="border rounded-lg">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <span className="font-medium">{cls.name}</span>
                      <span className="text-sm text-muted-foreground">
                        ({cls.subjects.length - excludedCount}/{cls.subjects.length} matières incluses)
                      </span>
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-3 pb-3 space-y-2">
                    <div className="flex gap-2 mb-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAllForClass(cls.id, cls.subjects)}
                      >
                        {allExcluded ? 'Tout inclure' : 'Tout exclure'}
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {cls.subjects.map(subject => {
                        const excluded = isExcluded(cls.id, subject.subject_id);
                        return (
                          <label
                            key={subject.id}
                            className={`
                              flex items-center gap-2 p-2 rounded border cursor-pointer text-sm
                              ${excluded
                                ? 'border-destructive/50 bg-destructive/5 text-muted-foreground line-through'
                                : 'border-border hover:border-primary'
                              }
                            `}
                          >
                            <Checkbox
                              checked={!excluded}
                              onCheckedChange={() => toggleSubject(cls.id, subject.subject_id)}
                            />
                            <span className="truncate">{subject.subject_name}</span>
                          </label>
                        );
                      })}
                    </div>

                    {cls.subjects.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">
                        Aucune matière assignée à cette classe
                      </p>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
};
