// Application de gestion des élèves - Unifiée pour tous les rôles
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Filter, Users, User, Archive } from 'lucide-react';
import { useStudents, useDeleteStudent } from './hooks/useStudents';
import { StudentCard } from './components/StudentCard';
import { AddStudentDialog } from './components/AddStudentDialog';
import { StudentDetailModal } from './components/StudentDetailModal';
import { EditStudentDialog } from './components/EditStudentDialog';
import { ArchivedStudentsTab } from './components/ArchivedStudentsTab';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSchoolClasses } from '@/school/hooks/useClasses';
import { FamilyManager, FamilyStudentsManager } from '@/school-os/families';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import { useAuth } from '@/hooks/useAuth';
import { useSubjects } from '@/school/hooks/useSubjects';
import { useSchoolUserRole } from '@/school-os/hooks/useSchoolUserRole';
import { useTeacherStudents } from '@/school-os/hooks/useTeacherStudents';
import { useTeacherClasses } from '@/school-os/hooks/useTeacherClasses';
import { ScrollArea } from '@/components/ui/scroll-area';

export const StudentsApp: React.FC = () => {
  const { t } = useTranslation();
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
  const { user, profile } = useAuth();
  const { school, activeSchoolYear: schoolYear } = useSchoolYear();
  
  // Détecter le rôle de l'utilisateur
  const { data: roleData, isLoading: isLoadingRole } = useSchoolUserRole(school?.id);
  const isTeacher = roleData?.isTeacher ?? false;
  const isOwner = roleData?.isOwner ?? false;
  const canManageStudents = isOwner; // Seul le propriétaire peut gérer les élèves

  // Récupérer les classes selon le rôle
  const { data: allClasses } = useSchoolClasses(school?.id, schoolYear?.id);
  const { data: teacherClasses } = useTeacherClasses(school?.id, schoolYear?.id);
  const classes = isTeacher ? teacherClasses : allClasses;
  
  // Récupérer les matières
  const { data: subjects } = useSubjects();

  // Récupérer les élèves selon le rôle
  const { data: allStudents, isLoading: isLoadingAllStudents } = useStudents(school?.id);
  const { data: teacherStudents, isLoading: isLoadingTeacherStudents } = useTeacherStudents(school?.id, schoolYear?.id);
  
  const students = isTeacher ? teacherStudents : allStudents;
  const isLoading = isTeacher ? isLoadingTeacherStudents : isLoadingAllStudents;

  // Vérifier si l'utilisateur peut voir les notes de suivi
  const canViewTeacherNotes = profile?.is_teacher || profile?.role === 'admin' || isOwner;

  const filteredStudents = useMemo(() => {
    if (!students) return [];

    return students.filter((student: any) => {
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

      return matchesSearch && matchesClass && matchesGender && (isTeacher || matchesStatus);
    });
  }, [students, searchQuery, selectedClass, selectedGender, selectedStatus, isTeacher]);

  // Calculer le nombre de filles et garçons
  const genderStats = useMemo(() => {
    if (!filteredStudents) return { girls: 0, boys: 0, total: 0 };
    
    const girls = filteredStudents.filter((s: any) => s.gender === 'female').length;
    const boys = filteredStudents.filter((s: any) => s.gender === 'male').length;
    
    return { girls, boys, total: filteredStudents.length };
  }, [filteredStudents]);

  if (!school || !schoolYear) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <Card className="p-6">
          <p className="text-muted-foreground">
            {t('schoolOS.students.noSchoolYear')}
          </p>
        </Card>
      </div>
    );
  }

  if (isLoadingRole) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <p className="text-muted-foreground">{t('schoolOS.common.loading')}</p>
      </div>
    );
  }

  // Version enseignant simplifiée (sans onglet Familles, sans ajout/modification)
  if (isTeacher) {
    return (
      <div className="p-4 sm:p-6 h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 flex-shrink-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">{t('schoolOS.students.myStudents')}</h2>
            <div className="flex items-center gap-4 mt-1">
              <p className="text-sm text-muted-foreground">
                {t('schoolOS.students.studentCount', { count: genderStats.total })}
              </p>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-pink-600 dark:text-pink-400 font-medium">
                  {t('schoolOS.students.girlCount', { count: genderStats.girls })}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  {t('schoolOS.students.boyCount', { count: genderStats.boys })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className={`mb-3 flex-shrink-0 ${showFilters ? "space-y-2" : ""}`}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('schoolOS.students.searchStudents')}
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
              <Filter className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{showFilters ? t('schoolOS.students.hide') : t('schoolOS.students.filters')}</span>
            </Button>
          </div>

          {showFilters && (
            <Card className="relative z-20">
              <CardContent className="p-3 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={t('schoolOS.students.class')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('schoolOS.students.myClasses')}</SelectItem>
                      {classes?.map((cls: any) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedGender} onValueChange={setSelectedGender}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={t('schoolOS.students.gender')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('schoolOS.students.allGenders')}</SelectItem>
                      <SelectItem value="male">{t('schoolOS.students.boys')}</SelectItem>
                      <SelectItem value="female">{t('schoolOS.students.girls')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="ghost"
                  onClick={() => {
                    setSelectedClass('all');
                    setSelectedGender('all');
                    setSearchQuery('');
                  }}
                  className="w-full h-8 text-xs"
                >
                  {t('schoolOS.students.resetFilters')}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Student List */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              {t('schoolOS.students.loadingStudents')}
            </div>
          ) : filteredStudents.length === 0 ? (
            <Card className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {t('schoolOS.students.noStudentFound')}
              </p>
              {(searchQuery || selectedClass !== 'all' || selectedGender !== 'all') && (
                <p className="text-sm text-muted-foreground">
                  {t('schoolOS.students.tryModifyFilters')}
                </p>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {filteredStudents.map((student: any) => (
                <Card 
                  key={student.id} 
                  className="hover:shadow-md transition-all cursor-pointer"
                  onClick={() => {
                    setSelectedStudent(student);
                    setIsDetailModalOpen(true);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        {student.photo_url ? (
                          <img 
                            src={student.photo_url} 
                            alt={student.first_name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-6 h-6 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">
                          {student.last_name} {student.first_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {student.student_code}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                          <Badge variant="outline" className="text-xs">
                            {student.class_name || t('schoolOS.students.notAssigned')}
                          </Badge>
                          <Badge 
                            variant={student.gender === 'male' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {student.gender === 'male' ? 'M' : 'F'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Student Detail Modal (lecture seule pour les profs) */}
        {selectedStudent && (
          <StudentDetailModal
            student={selectedStudent}
            isOpen={isDetailModalOpen}
            onClose={() => {
              setIsDetailModalOpen(false);
              setSelectedStudent(null);
            }}
            onEdit={() => {}} // Pas d'édition pour les profs
            onDelete={() => {}} // Pas de suppression pour les profs
            readOnly={true}
          />
        )}
      </div>
    );
  }

  // Version complète pour administrateurs/propriétaires
  return (
    <div className="p-4 sm:p-6 h-full flex flex-col overflow-hidden">
      <Tabs defaultValue="students" className="w-full h-full flex flex-col overflow-hidden">
        <TabsList className="mb-4 sm:mb-6 flex-shrink-0">
          <TabsTrigger value="students">
            <Search className="w-4 h-4 mr-2" />
            {t('schoolOS.students.studentsTab')}
          </TabsTrigger>
          <TabsTrigger value="families">
            <Users className="w-4 h-4 mr-2" />
            {t('schoolOS.students.familiesTab')}
          </TabsTrigger>
          {canManageStudents && (
            <TabsTrigger value="archives">
              <Archive className="w-4 h-4 mr-2" />
              Archives
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="students" className="flex-1 flex-col overflow-hidden mt-0 hidden data-[state=active]:flex">
          {/* Entête fixe */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 flex-shrink-0">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">{t('schoolOS.students.title')}</h2>
              <div className="flex items-center gap-4 mt-1">
                <p className="text-sm text-muted-foreground">
                  {t('schoolOS.students.studentFound', { count: genderStats.total })}
                </p>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-pink-600 dark:text-pink-400 font-medium">
                    {t('schoolOS.students.girlCount', { count: genderStats.girls })}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    {t('schoolOS.students.boyCount', { count: genderStats.boys })}
                  </span>
                </div>
              </div>
            </div>
            {canManageStudents && (
              <Button onClick={() => setIsAddDialogOpen(true)} size="sm" className="w-full sm:w-auto h-8 px-3">
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('schoolOS.common.add')}</span>
              </Button>
            )}
          </div>

          {/* Barre de recherche et bouton filtre */}
          <div className={`mb-3 flex-shrink-0 ${showFilters ? "space-y-2" : ""}`}>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t('schoolOS.students.searchStudents')}
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
                <Filter className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">{showFilters ? t('schoolOS.students.hide') : t('schoolOS.students.filters')}</span>
              </Button>
            </div>

            {/* Filtres avancés */}
            {showFilters && (
              <Card className="relative z-20">
                <CardContent className="p-3 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={t('schoolOS.students.class')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('schoolOS.students.allClasses')}</SelectItem>
                        {classes?.map((cls: any) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={selectedGender} onValueChange={setSelectedGender}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={t('schoolOS.students.gender')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('schoolOS.students.allGenders')}</SelectItem>
                        <SelectItem value="male">{t('schoolOS.students.boys')}</SelectItem>
                        <SelectItem value="female">{t('schoolOS.students.girls')}</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={t('schoolOS.students.status')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('schoolOS.students.allStatuses')}</SelectItem>
                        <SelectItem value="active">{t('schoolOS.students.actives')}</SelectItem>
                        <SelectItem value="inactive">{t('schoolOS.students.inactives')}</SelectItem>
                        <SelectItem value="transferred">{t('schoolOS.students.transferred')}</SelectItem>
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
                    {t('schoolOS.students.resetFilters')}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Liste des élèves scrollable */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                {t('schoolOS.students.loadingStudents')}
              </div>
            ) : filteredStudents.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground mb-4">
                  {t('schoolOS.students.noStudentFound')}
                </p>
                {searchQuery || selectedClass !== 'all' || selectedGender !== 'all' || selectedStatus !== 'all' ? (
                  <p className="text-sm text-muted-foreground">
                    {t('schoolOS.students.tryModifyFilters')}
                  </p>
                ) : canManageStudents ? (
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('schoolOS.students.addFirstStudent')}
                  </Button>
                ) : null}
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredStudents.map((student: any) => (
                  <StudentCard
                    key={student.id}
                    student={student}
                    onClick={(student) => {
                      setSelectedStudent(student);
                      setIsDetailModalOpen(true);
                    }}
                    onEdit={canManageStudents ? (student) => {
                      setSelectedStudent(student);
                      setIsEditDialogOpen(true);
                    } : undefined}
                    showTeacherNotes={canViewTeacherNotes}
                    currentTeacherId={user?.id}
                    schoolId={school?.id}
                    showDecisionOption={canManageStudents}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Dialog d'ajout */}
          {canManageStudents && (
            <AddStudentDialog
              isOpen={isAddDialogOpen}
              onClose={() => setIsAddDialogOpen(false)}
              schoolId={school.id}
              schoolYearId={schoolYear.id}
              classes={classes || []}
            />
          )}

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
                onEdit={canManageStudents ? (student) => {
                  setIsDetailModalOpen(false);
                  setIsEditDialogOpen(true);
                } : () => {}}
                onDelete={canManageStudents ? (studentId) => {
                  deleteStudent.mutateAsync(studentId);
                } : () => {}}
                readOnly={!canManageStudents}
              />

              {canManageStudents && (
                <EditStudentDialog
                  isOpen={isEditDialogOpen}
                  onClose={() => {
                    setIsEditDialogOpen(false);
                    setSelectedStudent(null);
                  }}
                  student={selectedStudent}
                  classes={classes || []}
                />
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="families" className="flex-1 flex-col overflow-hidden mt-0 hidden data-[state=active]:flex">
          <Tabs defaultValue="list" className="w-full h-full flex flex-col overflow-hidden">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-4 flex-shrink-0">
              <TabsTrigger value="list">{t('schoolOS.students.familyList')}</TabsTrigger>
              <TabsTrigger value="students">{t('schoolOS.students.studentsByFamily')}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="list" className="flex-1 overflow-y-auto mt-0 pt-0">
              <FamilyManager schoolId={school.id} />
            </TabsContent>
            
            <TabsContent value="students" className="flex-1 overflow-y-auto mt-0 pt-0">
              <FamilyStudentsManager schoolId={school.id} />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Onglet Archives - visible uniquement pour les administrateurs */}
        {canManageStudents && (
          <TabsContent value="archives" className="flex-1 flex-col overflow-hidden mt-0 hidden data-[state=active]:flex">
            <ArchivedStudentsTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
