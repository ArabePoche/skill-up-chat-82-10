/**
 * Section de sélection des matières pour une classe
 */
import React, { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { useClassSubjects } from '@/school/hooks/useClassSubjects';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface SubjectsSectionProps {
  classId: string;
  selectedSubjects: string[];
  onSubjectsChange: (subjects: string[]) => void;
}

export const SubjectsSection: React.FC<SubjectsSectionProps> = ({
  classId,
  selectedSubjects,
  onSubjectsChange,
}) => {
  const { data: classSubjects = [] } = useClassSubjects(classId);
  const [isOpen, setIsOpen] = useState(false);

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      // Utiliser subject_id (ID de la matière réelle) et non l'ID de la relation
      onSubjectsChange(classSubjects.map((cs: any) => cs.subject_id));
    } else {
      onSubjectsChange([]);
    }
  };

  const handleToggleSubject = (subjectId: string, checked: boolean) => {
    if (checked) {
      onSubjectsChange([...selectedSubjects, subjectId]);
    } else {
      onSubjectsChange(selectedSubjects.filter((id) => id !== subjectId));
    }
  };

  const allSelected = classSubjects.length > 0 && 
    classSubjects.every((cs: any) => selectedSubjects.includes(cs.subject_id));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-foreground">Matières</h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleToggleAll(!allSelected)}
        >
          {allSelected ? (
            <>
              <X className="h-4 w-4 mr-2" />
              Tout décocher
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Tout cocher
            </>
          )}
        </Button>
      </div>

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {selectedSubjects.length > 0 && !isOpen && (
          <div className="text-sm text-muted-foreground mb-2">
            {selectedSubjects.length} matière(s) sélectionnée(s)
          </div>
        )}
        
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="w-full">
            {isOpen ? 'Masquer la liste' : 'Afficher la liste'}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-3">
          <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto p-2 border border-border rounded-md">
            {classSubjects.map((classSubject: any) => (
              <div key={classSubject.id} className="flex items-center space-x-2">
                <Checkbox
                  checked={selectedSubjects.includes(classSubject.subject_id)}
                  onCheckedChange={(checked) =>
                    handleToggleSubject(classSubject.subject_id, checked as boolean)
                  }
                />
                <label className="text-sm cursor-pointer">
                  {classSubject.subjects?.name || 'Matière inconnue'}
                </label>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
