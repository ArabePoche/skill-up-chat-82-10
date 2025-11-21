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
import { Card, CardContent } from '@/components/ui/card';
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
  const [showFilters, setShowFilters] = useState(false);

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
    <div className="p-4 sm:p-6 h-full flex flex-col overflow-hidden">
      <Tabs defaultValue="students" className="w-full h-full flex flex-col overflow-hidden">
        <TabsList className="mb-4 sm:mb-6 flex-shrink-0">
          <TabsTrigger value="students">
            <Search className="w-4 h-4 mr-2" />
            Élèves
          </TabsTrigger>
          <TabsTrigger value="families">
            <Users className="w-4 h-4 mr-2" />
            Familles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="flex-1 flex flex-col overflow-hidden mt-0 data-[state=active]:flex">
          {/* Entête fixe */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 flex-shrink-0">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">Gestion des Élèves</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {filteredStudents.length} élève{filteredStudents.length > 1 ? 's' : ''} trouvé{filteredStudents.length > 1 ? 's' : ''}
              </p>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un élève
            </Button>
          </div>

      {/* Barre de recherche et bouton filtre - Compacte */}
      <div className="mb-3 flex-shrink-0 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un élève..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="h-9 px-3"
          >
            {showFilters ? <Filter className="w-4 h-4 mr-2" /> : <Filter className="w-4 h-4 mr-2" />}
            <span className="hidden sm:inline">{showFilters ? 'Masquer' : 'Filtres'}</span>
          </Button>
        </div>

        {/* Filtres avancés - Masquables */}
        {showFilters && (
          <Card className="relative z-20">
            <CardContent className="p-3 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Classe" />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    <SelectItem value="all">Toutes les classes</SelectItem>
                    {classes?.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedGender} onValueChange={setSelectedGender}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Genre" />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    <SelectItem value="all">Tous les genres</SelectItem>
                    <SelectItem value="male">Garçons</SelectItem>
                    <SelectItem value="female">Filles</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="active">Actifs</SelectItem>
                    <SelectItem value="inactive">Inactifs</SelectItem>
                    <SelectItem value="transferred">Transférés</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedClass('all');
                  setSelectedGender('all');
                  setSelectedStatus('all');
                  setSearchQuery('');
                }}
                className="w-full h-8 text-xs"
              >
                Réinitialiser les filtres
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Liste des élèves scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto">
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

        <TabsContent value="families" className="flex-1 flex flex-col overflow-hidden mt-0 data-[state=active]:flex">
          <Tabs defaultValue="list" className="w-full h-full flex flex-col overflow-hidden">
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
