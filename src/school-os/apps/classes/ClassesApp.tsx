// Application de gestion des classes - Unifiée pour tous les rôles
import React, { useState } from 'react';
import { CreateClassModal } from '@/school/components/CreateClassModal';
import { ClassesList } from '@/school/components/ClassesList';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import { useSchoolUserRole } from '@/school-os/hooks/useSchoolUserRole';
import { useTeacherClasses, TeacherClass } from '@/school-os/hooks/useTeacherClasses';
import { useTeacherStudents } from '@/school-os/hooks/useTeacherStudents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, BookOpen, ChevronRight, GraduationCap } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export const ClassesApp: React.FC = () => {
  const { school, activeSchoolYear } = useSchoolYear();
  const { data: roleData, isLoading: isLoadingRole } = useSchoolUserRole(school?.id);
  const isTeacher = roleData?.isTeacher ?? false;
  const isOwner = roleData?.isOwner ?? false;

  // Hooks pour les enseignants
  const { data: teacherClasses, isLoading: isLoadingTeacherClasses } = useTeacherClasses(school?.id, activeSchoolYear?.id);
  const { data: teacherStudents } = useTeacherStudents(school?.id, activeSchoolYear?.id);
  const [selectedClass, setSelectedClass] = useState<TeacherClass | null>(null);

  if (!school?.id || !activeSchoolYear?.id) {
    return (
      <div className="p-6 h-full overflow-auto">
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Veuillez créer une école et une année scolaire pour gérer les classes
          </p>
        </div>
      </div>
    );
  }

  if (isLoadingRole) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  // Vue enseignant : afficher uniquement ses classes avec les matières qu'il enseigne
  if (isTeacher) {
    if (isLoadingTeacherClasses) {
      return (
        <div className="p-6 h-full flex items-center justify-center">
          <p className="text-muted-foreground">Chargement de vos classes...</p>
        </div>
      );
    }

    if (!teacherClasses || teacherClasses.length === 0) {
      return (
        <div className="p-6 h-full overflow-auto">
          <div className="text-center py-12">
            <GraduationCap className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune classe assignée</h3>
            <p className="text-muted-foreground">
              Vous n'êtes assigné à aucune classe pour cette année scolaire.
            </p>
          </div>
        </div>
      );
    }

    const classStudents = selectedClass 
      ? teacherStudents?.filter(s => s.class_id === selectedClass.id) || []
      : [];

    return (
      <div className="p-6 h-full flex flex-col overflow-hidden">
        <div className="mb-6 flex-shrink-0">
          <h2 className="text-2xl font-bold">Mes Classes</h2>
          <p className="text-muted-foreground mt-1">
            {teacherClasses.length} classe{teacherClasses.length > 1 ? 's' : ''} assignée{teacherClasses.length > 1 ? 's' : ''}
          </p>
        </div>

        <ScrollArea className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teacherClasses.map((cls) => (
              <Card 
                key={cls.id} 
                className="hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => setSelectedClass(cls)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{cls.name}</CardTitle>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <Badge variant="outline" className="w-fit">{cls.cycle}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {cls.current_students}/{cls.max_students} élèves
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Mes matières:</p>
                    <div className="flex flex-wrap gap-1">
                      {cls.subjects.map((subject) => (
                        <Badge key={subject.id} variant="secondary" className="text-xs">
                          <BookOpen className="w-3 h-3 mr-1" />
                          {subject.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        {/* Modal pour voir les élèves de la classe */}
        <Dialog open={!!selectedClass} onOpenChange={() => setSelectedClass(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Élèves de {selectedClass?.name}
              </DialogTitle>
            </DialogHeader>
            
            <ScrollArea className="max-h-[60vh]">
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
                      <Badge variant={student.gender === 'male' ? 'default' : 'secondary'}>
                        {student.gender === 'male' ? 'M' : 'F'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Vue propriétaire/administrateur : gestion complète des classes
  return (
    <div className="p-6 h-full overflow-auto">
      <ClassesList schoolId={school.id} schoolYearId={activeSchoolYear.id} />
    </div>
  );
};
