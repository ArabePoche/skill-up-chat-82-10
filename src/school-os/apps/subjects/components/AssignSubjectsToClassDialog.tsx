// Dialog pour assigner des matières à une classe avec coefficients et professeur
import React, { useState } from 'react';
import { Plus, Trash2, BookOpen, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSchoolSubjects } from '../hooks/useSchoolSubjects';
import {
  useClassSubjectAssignments,
  useAssignSubjectToClass,
  useUpdateClassSubjectAssignment,
  useRemoveSubjectFromClass,
} from '../hooks/useClassSubjectAssignments';
import { useSchoolTeachers } from '@/school/hooks/useSchoolTeachers';
import type { Subject } from '../types';

interface AssignSubjectsToClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  className: string;
  schoolId: string;
}

export const AssignSubjectsToClassDialog: React.FC<AssignSubjectsToClassDialogProps> = ({
  open,
  onOpenChange,
  classId,
  className,
  schoolId,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [coefficient, setCoefficient] = useState('1');

  const { data: allSubjects } = useSchoolSubjects(schoolId);
  const { data: teachers } = useSchoolTeachers(schoolId);
  const { data: assignedSubjects, isLoading } = useClassSubjectAssignments(classId);
  const assignSubject = useAssignSubjectToClass();
  const updateAssignment = useUpdateClassSubjectAssignment();
  const removeSubject = useRemoveSubjectFromClass();

  // Matières non encore assignées
  const availableSubjects = allSubjects?.filter(
    (subject) => !assignedSubjects?.some((a) => a.subject_id === subject.id)
  ) || [];

  const handleAssign = async () => {
    if (!selectedSubjectId || !coefficient) return;

    await assignSubject.mutateAsync({
      class_id: classId,
      subject_id: selectedSubjectId,
      coefficient: parseFloat(coefficient),
      teacher_id: selectedTeacherId || null,
    });

    setSelectedSubjectId('');
    setSelectedTeacherId('');
    setCoefficient('1');
  };

  const handleUpdateCoefficient = async (assignmentId: string, newCoefficient: string) => {
    const value = parseFloat(newCoefficient);
    if (isNaN(value) || value <= 0) return;

    await updateAssignment.mutateAsync({
      id: assignmentId,
      classId,
      updates: { coefficient: value },
    });
  };

  const handleUpdateTeacher = async (assignmentId: string, teacherId: string) => {
    await updateAssignment.mutateAsync({
      id: assignmentId,
      classId,
      updates: { teacher_id: teacherId === 'none' ? null : teacherId },
    });
  };

  const getTeacherName = (teacherId: string | null) => {
    if (!teacherId) return null;
    const teacher = teachers?.find(t => t.id === teacherId);
    return teacher?.profiles ? `${teacher.profiles.first_name || ''} ${teacher.profiles.last_name || ''}`.trim() : null;
  };

  const handleRemove = async (assignmentId: string) => {
    if (confirm('Retirer cette matière de la classe ?')) {
      await removeSubject.mutateAsync({ id: assignmentId, classId });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Matières de la classe {className}</DialogTitle>
          <DialogDescription>
            Assignez des matières et définissez leurs coefficients
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Ajouter une matière */}
          <div className="space-y-3">
            <Label>Ajouter une matière</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Sélectionner une matière" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubjects.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        Toutes les matières sont déjà assignées
                      </div>
                    ) : (
                      availableSubjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: subject.color }}
                            />
                            {subject.name}
                            {subject.code && (
                              <span className="text-muted-foreground">({subject.code})</span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="0.5"
                  step="0.5"
                  placeholder="Coef."
                  value={coefficient}
                  onChange={(e) => setCoefficient(e.target.value)}
                  className="w-20"
                />
              </div>
              <div className="flex gap-2">
                <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Professeur (optionnel)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun professeur</SelectItem>
                    {teachers?.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          {teacher.profiles?.first_name} {teacher.profiles?.last_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAssign}
                  disabled={!selectedSubjectId || assignSubject.isPending}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Liste des matières assignées */}
          <div className="space-y-3">
            <Label>Matières assignées ({assignedSubjects?.length || 0})</Label>
            
            {isLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : assignedSubjects?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucune matière assignée</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {assignedSubjects?.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="p-3 rounded-lg border bg-card space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: (assignment.subjects as any)?.color || '#3B82F6' }}
                          />
                          <div>
                            <p className="font-medium">{(assignment.subjects as any)?.name}</p>
                            {(assignment.subjects as any)?.code && (
                              <Badge variant="outline" className="text-xs">
                                {(assignment.subjects as any)?.code}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemove(assignment.id)}
                          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 pl-6">
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground">Coef:</span>
                          <Input
                            type="number"
                            min="0.5"
                            step="0.5"
                            value={assignment.coefficient}
                            onChange={(e) => handleUpdateCoefficient(assignment.id, e.target.value)}
                            className="w-16 h-8 text-center"
                          />
                        </div>
                        <Select
                          value={assignment.teacher_id || 'none'}
                          onValueChange={(value) => handleUpdateTeacher(assignment.id, value)}
                        >
                          <SelectTrigger className="flex-1 h-8">
                            <SelectValue placeholder="Professeur" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Aucun professeur</SelectItem>
                            {teachers?.map((teacher) => (
                              <SelectItem key={teacher.id} value={teacher.id}>
                                {teacher.profiles?.first_name} {teacher.profiles?.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
