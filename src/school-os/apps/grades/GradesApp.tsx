// Application de gestion des notes - Unifiée pour tous les rôles
import React, { useState } from 'react';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import { useSchoolUserRole } from '@/school-os/hooks/useSchoolUserRole';
import { useTeacherClasses } from '@/school-os/hooks/useTeacherClasses';
import { useTeacherStudents } from '@/school-os/hooks/useTeacherStudents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Users, FileText, GraduationCap } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const GradesApp: React.FC = () => {
  const { school, activeSchoolYear } = useSchoolYear();
  const { data: roleData, isLoading: isLoadingRole } = useSchoolUserRole(school?.id);
  const isTeacher = roleData?.isTeacher ?? false;
  const isOwner = roleData?.isOwner ?? false;

  const { data: teacherClasses, isLoading: isLoadingClasses } = useTeacherClasses(school?.id, activeSchoolYear?.id);
  const { data: students } = useTeacherStudents(school?.id, activeSchoolYear?.id);
  
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  const selectedClass = teacherClasses?.find(c => c.id === selectedClassId);
  const availableSubjects = selectedClass?.subjects || [];
  const classStudents = students?.filter(s => s.class_id === selectedClassId) || [];

  if (!school?.id || !activeSchoolYear?.id) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <Card className="p-6">
          <p className="text-muted-foreground">
            Veuillez sélectionner une école avec une année scolaire active.
          </p>
        </Card>
      </div>
    );
  }

  if (isLoadingRole || isLoadingClasses) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  // Vue administrateur : tableau de bord des notes (TODO: implémenter)
  if (isOwner && !isTeacher) {
    return (
      <div className="p-6 h-full overflow-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">Gestion des Notes</h2>
            <p className="text-muted-foreground mt-1">
              Vue d'ensemble des notes et évaluations
            </p>
          </div>
        </div>
        
        <Card className="p-12 text-center">
          <GraduationCap className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Tableau de bord administrateur</h3>
          <p className="text-muted-foreground">
            La vue d'ensemble des notes sera disponible prochainement.
          </p>
        </Card>
      </div>
    );
  }

  // Vue enseignant : saisie des notes par classe et matière
  if (!teacherClasses || teacherClasses.length === 0) {
    return (
      <div className="p-6 h-full overflow-auto">
        <div className="text-center py-12">
          <GraduationCap className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucune classe assignée</h3>
          <p className="text-muted-foreground">
            Vous devez être assigné à des classes pour saisir des notes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden">
      <div className="mb-6 flex-shrink-0">
        <h2 className="text-2xl font-bold">
          {isTeacher ? 'Saisie des Notes' : 'Gestion des Notes'}
        </h2>
        <p className="text-muted-foreground mt-1">
          {isTeacher 
            ? 'Gérez les notes de vos élèves par classe et matière'
            : 'Consultez et gérez les notes de l\'école'
          }
        </p>
      </div>

      {/* Sélecteurs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 flex-shrink-0">
        <div>
          <label className="text-sm font-medium mb-2 block">Classe</label>
          <Select value={selectedClassId} onValueChange={(value) => {
            setSelectedClassId(value);
            setSelectedSubjectId('');
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une classe" />
            </SelectTrigger>
            <SelectContent>
              {teacherClasses.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Matière</label>
          <Select 
            value={selectedSubjectId} 
            onValueChange={setSelectedSubjectId}
            disabled={!selectedClassId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une matière" />
            </SelectTrigger>
            <SelectContent>
              {availableSubjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name} (coef. {subject.coefficient})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Contenu principal */}
      {!selectedClassId ? (
        <Card className="flex-1 flex items-center justify-center">
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Sélectionnez une classe pour commencer
            </p>
          </div>
        </Card>
      ) : !selectedSubjectId ? (
        <Card className="flex-1 flex items-center justify-center">
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Sélectionnez une matière pour saisir les notes
            </p>
          </div>
        </Card>
      ) : (
        <Tabs defaultValue="evaluations" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="flex-shrink-0">
            <TabsTrigger value="evaluations">Évaluations</TabsTrigger>
            <TabsTrigger value="grades">Saisie des notes</TabsTrigger>
          </TabsList>

          <TabsContent value="evaluations" className="flex-1 overflow-hidden mt-4">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Évaluations - {availableSubjects.find(s => s.id === selectedSubjectId)?.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Aucune évaluation créée pour cette matière
                  </p>
                  <p className="text-sm text-muted-foreground">
                    La création d'évaluations sera disponible prochainement
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="grades" className="flex-1 overflow-hidden mt-4">
            <Card className="h-full flex flex-col">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Élèves de {selectedClass?.name}
                  </div>
                  <Badge variant="outline">
                    {classStudents.length} élève{classStudents.length > 1 ? 's' : ''}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  {classStudents.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Aucun élève dans cette classe
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {classStudents.map((student, index) => (
                        <div 
                          key={student.id}
                          className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </span>
                          <div className="flex-1">
                            <p className="font-medium">
                              {student.last_name} {student.first_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {student.student_code}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Note</p>
                            <p className="font-semibold text-lg">--</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
