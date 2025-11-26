/**
 * Dialog pour assigner des professeurs à une classe
 * Permet d'assigner des professeurs principaux et des professeurs par matière
 */
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, BookOpen, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useClassTeachers,
  useAddClassTeacher,
  useDeleteClassTeacher,
} from '../hooks/useClassTeachers';
import { useTeachers } from '@/school/hooks/useTeachers';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AssignTeachersToClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  className: string;
  schoolId: string;
}

export const AssignTeachersToClassDialog: React.FC<AssignTeachersToClassDialogProps> = ({
  open,
  onOpenChange,
  classId,
  className,
  schoolId,
}) => {
  const { id: currentSchoolId } = useParams();
  const effectiveSchoolId = schoolId || currentSchoolId || '';
  
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  // Récupérer les professeurs assignés à cette classe
  const { data: classTeachers = [], isLoading: isLoadingTeachers } = useClassTeachers(classId);
  
  // Récupérer tous les professeurs de l'école
  const { data: allTeachers = [], isLoading: isLoadingAllTeachers } = useTeachers(effectiveSchoolId);
  
  // Récupérer les matières de la classe
  const { data: classSubjects = [] } = useQuery({
    queryKey: ['class-subjects', classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_subjects')
        .select(`
          id,
          subject_id,
          subjects (
            id,
            name,
            abbreviation
          )
        `)
        .eq('class_id', classId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!classId,
  });

  const addTeacherMutation = useAddClassTeacher();
  const deleteTeacherMutation = useDeleteClassTeacher();

  // Professeurs principaux (sans matière)
  const mainTeachers = classTeachers.filter(ct => !ct.subject_id);
  
  // Professeurs par matière
  const subjectTeachers = classTeachers.filter(ct => ct.subject_id);

  const handleAddMainTeacher = () => {
    if (!selectedTeacherId) {
      toast.error('Veuillez sélectionner un professeur');
      return;
    }

    addTeacherMutation.mutate({
      class_id: classId,
      teacher_id: selectedTeacherId,
    });
    setSelectedTeacherId('');
  };

  const handleAddSubjectTeacher = () => {
    if (!selectedTeacherId || !selectedSubjectId) {
      toast.error('Veuillez sélectionner un professeur et une matière');
      return;
    }

    addTeacherMutation.mutate({
      class_id: classId,
      teacher_id: selectedTeacherId,
      subject_id: selectedSubjectId,
    });
    setSelectedTeacherId('');
    setSelectedSubjectId('');
  };

  const handleRemoveTeacher = (teacherId: string) => {
    deleteTeacherMutation.mutate({ id: teacherId, classId });
  };

  // Filtrer les professeurs déjà assignés comme professeurs principaux
  const availableMainTeachers = allTeachers.filter(
    teacher => !mainTeachers.some(ct => ct.teacher_id === teacher.id)
  );

  // Filtrer les professeurs disponibles pour une matière
  const getAvailableTeachersForSubject = (subjectId: string) => {
    return allTeachers.filter(
      teacher => !subjectTeachers.some(
        ct => ct.teacher_id === teacher.id && ct.subject_id === subjectId
      )
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assigner des professeurs - {className}</DialogTitle>
          <DialogDescription>
            Gérez les professeurs principaux et les professeurs par matière
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="main" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="main">
              <Users className="h-4 w-4 mr-2" />
              Professeurs principaux
            </TabsTrigger>
            <TabsTrigger value="subjects">
              <BookOpen className="h-4 w-4 mr-2" />
              Professeurs par matière
            </TabsTrigger>
          </TabsList>

          {/* Tab: Professeurs principaux */}
          <TabsContent value="main" className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Ajouter un professeur principal</Label>
                  <div className="flex gap-2">
                    <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Sélectionner un professeur" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMainTeachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.first_name} {teacher.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={handleAddMainTeacher}
                      disabled={!selectedTeacherId || addTeacherMutation.isPending}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Ajouter
                    </Button>
                  </div>
                </div>

                {/* Liste des professeurs principaux */}
                <div className="space-y-2">
                  <Label>Professeurs principaux assignés</Label>
                  {isLoadingTeachers ? (
                    <div className="text-sm text-muted-foreground">Chargement...</div>
                  ) : mainTeachers.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      Aucun professeur principal assigné
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {mainTeachers.map((ct) => (
                        <div
                          key={ct.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {ct.school_teachers?.first_name} {ct.school_teachers?.last_name}
                            </span>
                            <Badge variant="secondary">Principal</Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveTeacher(ct.id)}
                            disabled={deleteTeacherMutation.isPending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Professeurs par matière */}
          <TabsContent value="subjects" className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Assigner un professeur à une matière</Label>
                  <div className="flex flex-col gap-2">
                    <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une matière" />
                      </SelectTrigger>
                      <SelectContent>
                        {classSubjects.map((cs: any) => (
                          <SelectItem key={cs.id} value={cs.subject_id}>
                            {cs.subjects?.name || 'Matière inconnue'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <div className="flex gap-2">
                      <Select 
                        value={selectedTeacherId} 
                        onValueChange={setSelectedTeacherId}
                        disabled={!selectedSubjectId}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Sélectionner un professeur" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedSubjectId && 
                            getAvailableTeachersForSubject(selectedSubjectId).map((teacher) => (
                              <SelectItem key={teacher.id} value={teacher.id}>
                                {teacher.first_name} {teacher.last_name}
                              </SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                      <Button 
                        onClick={handleAddSubjectTeacher}
                        disabled={!selectedTeacherId || !selectedSubjectId || addTeacherMutation.isPending}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Assigner
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Liste des professeurs par matière */}
                <div className="space-y-2">
                  <Label>Professeurs assignés aux matières</Label>
                  {isLoadingTeachers ? (
                    <div className="text-sm text-muted-foreground">Chargement...</div>
                  ) : subjectTeachers.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      Aucun professeur assigné aux matières
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {classSubjects.map((cs: any) => {
                        const teachers = subjectTeachers.filter(ct => ct.subject_id === cs.subject_id);
                        if (teachers.length === 0) return null;
                        
                        return (
                          <div key={cs.id} className="border rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-2 mb-2">
                              <BookOpen className="h-4 w-4 text-primary" />
                              <span className="font-medium">{cs.subjects?.name}</span>
                            </div>
                            {teachers.map((ct) => (
                              <div
                                key={ct.id}
                                className="flex items-center justify-between pl-6 p-2 bg-muted/50 rounded"
                              >
                                <span className="text-sm">
                                  {ct.school_teachers?.first_name} {ct.school_teachers?.last_name}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleRemoveTeacher(ct.id)}
                                  disabled={deleteTeacherMutation.isPending}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
