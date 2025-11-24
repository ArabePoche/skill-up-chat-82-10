// Dialog pour assigner un enseignant à une classe ou des matières
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAssignTeacherToClass, useAssignTeacherToSubjects } from '../hooks';
import { useSchoolClasses } from '@/school/hooks/useClasses';
import { useClassSubjects } from '../../grades/hooks';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { Teacher } from '../types';

interface AssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher: Teacher;
}

export const AssignmentDialog: React.FC<AssignmentDialogProps> = ({
  open,
  onOpenChange,
  teacher,
}) => {
  const { id: schoolId } = useParams();
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

  const { data: classes = [] } = useSchoolClasses(schoolId);
  const { data: classSubjects = [] } = useClassSubjects(selectedClassId);
  const { mutate: assignToClass, isPending: isAssigningClass } = useAssignTeacherToClass();
  const { mutate: assignToSubjects, isPending: isAssigningSubjects } = useAssignTeacherToSubjects();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (teacher.type === 'generalist' && selectedClassId) {
      assignToClass(
        { teacherId: teacher.id, classId: selectedClassId, userId: teacher.user_id },
        { onSuccess: () => onOpenChange(false) }
      );
    } else if (teacher.type === 'specialist' && selectedSubjectIds.length > 0) {
      assignToSubjects(
        { userId: teacher.user_id, classSubjectIds: selectedSubjectIds },
        { onSuccess: () => onOpenChange(false) }
      );
    }
  };

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Assigner {teacher.profiles?.first_name} {teacher.profiles?.last_name}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {teacher.type === 'generalist' ? (
            <div>
              <Label htmlFor="class">Classe *</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger id="class">
                  <SelectValue placeholder="Sélectionner une classe" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                L'enseignant sera le professeur principal de cette classe
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="classForSubjects">Classe</Label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger id="classForSubjects">
                    <SelectValue placeholder="Sélectionner une classe" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedClassId && classSubjects.length > 0 && (
                <div>
                  <Label>Matières à enseigner *</Label>
                  <div className="space-y-2 mt-2 border rounded-md p-3 max-h-60 overflow-y-auto">
                    {classSubjects.map((cs) => (
                      <div key={cs.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={cs.id}
                          checked={selectedSubjectIds.includes(cs.id)}
                          onCheckedChange={() => toggleSubject(cs.id)}
                        />
                        <label
                          htmlFor={cs.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {cs.subjects?.name}
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sélectionnez les matières que cet enseignant enseignera dans cette classe
                  </p>
                </div>
              )}

              {selectedClassId && classSubjects.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Aucune matière disponible pour cette classe. Veuillez d'abord créer des matières.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={
                isAssigningClass ||
                isAssigningSubjects ||
                (teacher.type === 'generalist' && !selectedClassId) ||
                (teacher.type === 'specialist' && selectedSubjectIds.length === 0)
              }
            >
              Assigner
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
