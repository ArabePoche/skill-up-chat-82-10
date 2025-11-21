// Application de gestion des élèves
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Filter, Users } from 'lucide-react';
import { useStudents, useDeleteStudent } from './hooks/useStudents';
import { StudentCard } from './components/StudentCard';
import { AddStudentDialog } from './components/AddStudentDialog';
import { StudentDetailModal } from './components/StudentDetailModal';
import { EditStudentDialog } from './components/EditStudentDialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { useUserSchool, useCurrentSchoolYear } from '@/school/hooks/useSchool';
import { useSchoolClasses } from '@/school/hooks/useClasses';
import { FamilyManager, FamilyStudentsManager } from '@/school-os/families';

export const StudentsApp: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const deleteStudent = useDeleteStudent();

  // Récupérer l'utilisateur connecté
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Récupérer l'école de l'utilisateur
  const { data: school } = useUserSchool(user?.id);

  // Récupérer l'année scolaire courante
  const { data: schoolYear } = useCurrentSchoolYear(school?.id);

  // Récupérer les classes
  const { data: classes } = useSchoolClasses(school?.id, schoolYear?.id);

  const { data: students, isLoading } = useStudents(school?.id);

  const filteredStudents = useMemo(() => {
    if (!students) return [];

    return students.filter((student) => {
      const matchesSearch =
        student.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.student_code?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesClass =
        selectedClass === 'all' || student.class_id === selectedClass;

      const matchesGender =
        selectedGender === 'all' || student.gender === selectedGender;

      const matchesStatus =
        selectedStatus === 'all' || student.status === selectedStatus;

      return matchesSearch && matchesClass && matchesGender && matchesStatus;
    });
  }, [students, searchQuery, selectedClass, selectedGender, selectedStatus]);

  if (!school || !schoolYear) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <Card className="p-6">
          <p className="text-muted-foreground">
            Veuillez d'abord créer une école et une année scolaire active.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden relative">
      <Tabs defaultValue="students" className="w-full flex flex-col flex-1 overflow-hidden">
        <TabsList className="mb-6 flex-shrink-0 relative z-10">
          <TabsTrigger value="students">
            <Search className="w-4 h-4 mr-2" />
            Élèves
          </TabsTrigger>
          <TabsTrigger value="families">
            <Users className="w-4 h-4 mr-2" />
            Familles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="flex flex-col flex-1 overflow-hidden mt-0">
          {/* Entête fixe */}
          <div className="flex justify-between items-center mb-6 flex-shrink-0 relative z-10">
            <div>
              <h2 className="text-2xl font-bold">Gestion des Élèves</h2>
              <p className="text-muted-foreground mt-1">
                {filteredStudents.length} élève{filteredStudents.length > 1 ? 's' : ''} trouvé{filteredStudents.length > 1 ? 's' : ''}
              </p>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un élève
            </Button>
          </div>

      {/* Filtres fixes */}
      <Card className="p-4 mb-6 flex-shrink-0 relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4" />
          <span className="font-medium">Filtres</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un élève..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger>
              <SelectValue placeholder="Toutes les classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les classes</SelectItem>
              {classes?.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name} ({cls.cycle})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedGender} onValueChange={setSelectedGender}>
            <SelectTrigger>
              <SelectValue placeholder="Tous les genres" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les genres</SelectItem>
              <SelectItem value="male">Garçons</SelectItem>
              <SelectItem value="female">Filles</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="active">Actifs</SelectItem>
              <SelectItem value="inactive">Inactifs</SelectItem>
              <SelectItem value="transferred">Transférés</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Liste des élèves scrollable */}
      <div className="flex-1 overflow-y-auto relative">
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          Chargement des élèves...
        </div>
      ) : filteredStudents.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">
            Aucun élève trouvé
          </p>
          {searchQuery || selectedClass !== 'all' || selectedGender !== 'all' || selectedStatus !== 'all' ? (
            <p className="text-sm text-muted-foreground">
              Essayez de modifier vos filtres
            </p>
          ) : (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter votre premier élève
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredStudents.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              onClick={(student) => {
                setSelectedStudent(student);
                setIsDetailModalOpen(true);
              }}
            />
          ))}
        </div>
      )}
      </div>

      {/* Dialog d'ajout */}
      <AddStudentDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        schoolId={school.id}
        schoolYearId={schoolYear.id}
        classes={classes || []}
      />

      {/* Dialog de confirmation de suppression - géré dans StudentDetailModal */}

      {/* Modal de détails de l'élève */}
      {selectedStudent && (
        <>
          <StudentDetailModal
            student={selectedStudent}
            isOpen={isDetailModalOpen}
            onClose={() => {
              setIsDetailModalOpen(false);
              setSelectedStudent(null);
            }}
            onEdit={(student) => {
              setIsDetailModalOpen(false);
              setIsEditDialogOpen(true);
            }}
            onDelete={(studentId) => {
              deleteStudent.mutateAsync(studentId);
            }}
          />

          <EditStudentDialog
            isOpen={isEditDialogOpen}
            onClose={() => {
              setIsEditDialogOpen(false);
              setSelectedStudent(null);
            }}
            student={selectedStudent}
            classes={classes || []}
          />
        </>
      )}
        </TabsContent>

        <TabsContent value="families" className="flex flex-col flex-1 overflow-hidden mt-0 pt-0">
          <Tabs defaultValue="list" className="w-full flex flex-col flex-1 overflow-hidden">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-4 flex-shrink-0">
              <TabsTrigger value="list">Liste des Familles</TabsTrigger>
              <TabsTrigger value="students">Élèves par Famille</TabsTrigger>
            </TabsList>
            
            <TabsContent value="list" className="flex-1 overflow-y-auto mt-0 pt-0">
              <FamilyManager schoolId={school.id} />
            </TabsContent>
            
            <TabsContent value="students" className="flex-1 overflow-y-auto mt-0 pt-0">
              <FamilyStudentsManager schoolId={school.id} />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
};
