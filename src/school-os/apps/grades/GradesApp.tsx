/**
 * Application de gestion des notes
 * Affiche les évaluations par classe avec saisie des notes et export Excel
 * Supporte les vues admin/enseignant et parent (lecture seule)
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import { useSchoolUserRole } from '@/school-os/hooks/useSchoolUserRole';
import { useTeacherClasses } from '@/school-os/hooks/useTeacherClasses';
import { useSchoolClasses } from '@/school/hooks/useClasses';
import { useParentChildren } from '../classes/hooks/useParentChildren';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Users, FileText, GraduationCap, Download, Filter, ClipboardList, BookMarked, ScrollText, BarChart3, FileCheck } from 'lucide-react';
import { EvaluationsListView } from './components/EvaluationsListView';
import { GradeEntryView } from './components/GradeEntryView';
import { SubjectEvaluationsListView } from './components/SubjectEvaluationsListView';
import { SubjectGradeEntryView } from './components/SubjectGradeEntryView';
import { BulletinsSection } from './components/BulletinsSection';
import { CompositionsGradeEntry } from './components/CompositionsGradesEntry';
import { ParentChildGrades } from './components/ParentChildGrades';
import { ParentBulletinsView } from './components/ParentBulletinsView';
import { ClassEvaluation, useClassEvaluations } from './hooks/useClassEvaluations';
import { SubjectEvaluation } from './hooks/useSubjectEvaluations';
import { useEvaluationGrades } from './hooks/useGrades';
import { exportClassGradesToExcel } from './utils/exportGrades';

export const GradesApp: React.FC = () => {
  const { t } = useTranslation();
  const [mainTab, setMainTab] = useState<'grades' | 'bulletins' | 'stats'>('grades');
  const [parentTab, setParentTab] = useState<'notes' | 'bulletins'>('notes');
  const [gradeSubTab, setGradeSubTab] = useState<'evaluations' | 'compositions'>('evaluations');
  const { school, activeSchoolYear } = useSchoolYear();
  const { data: roleData, isLoading: isLoadingRole } = useSchoolUserRole(school?.id);
  const isTeacher = roleData?.isTeacher ?? false;
  const isOwner = roleData?.isOwner ?? false;
  const isParent = roleData?.isParent ?? false;

  // Classes selon le rôle
  const { data: teacherClasses, isLoading: isLoadingTeacherClasses } = useTeacherClasses(
    school?.id, 
    activeSchoolYear?.id
  );
  const { data: allClasses, isLoading: isLoadingAllClasses } = useSchoolClasses(
    school?.id, 
    activeSchoolYear?.id
  );

  // Hook pour les parents
  const { data: parentChildren, isLoading: isLoadingParentChildren } = useParentChildren(school?.id, activeSchoolYear?.id);

  // Pour les admins, on utilise toutes les classes, pour les enseignants leurs classes assignées
  const availableClasses = isOwner && !isTeacher 
    ? allClasses?.map(c => ({
        id: c.id,
        name: c.name,
        cycle: c.cycle,
        current_students: c.current_students,
        max_students: c.max_students,
        subjects: [] // Les matières seront chargées séparément
      })) || []
    : teacherClasses || [];

  const isLoadingClasses = isOwner && !isTeacher ? isLoadingAllClasses : isLoadingTeacherClasses;

  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [selectedEvaluation, setSelectedEvaluation] = useState<ClassEvaluation | null>(null);
  const [entryMethod, setEntryMethod] = useState<'evaluation' | 'subject'>('evaluation');
  const [selectedSubjectForEntry, setSelectedSubjectForEntry] = useState<string>('');
  const [selectedSubjectEvaluation, setSelectedSubjectEvaluation] = useState<SubjectEvaluation | null>(null);

  // Récupérer les évaluations de la classe pour l'export
  const { data: classEvaluations } = useClassEvaluations(selectedClassId);

  const selectedClass = availableClasses.find(c => c.id === selectedClassId);
  
  // Pour les enseignants, on utilise leurs matières assignées
  const availableSubjects = isTeacher 
    ? teacherClasses?.find(c => c.id === selectedClassId)?.subjects || []
    : []; // Pour les admins, les matières viennent des évaluations

  // Extraire les matières uniques des évaluations pour les admins
  const subjectsFromEvaluations = React.useMemo(() => {
    if (!classEvaluations) return [];
    const uniqueSubjects = new Map();
    classEvaluations.forEach(e => {
      // Utiliser le tableau subjects qui contient toutes les matières de l'évaluation
      e.subjects.forEach(subject => {
        if (!uniqueSubjects.has(subject.id)) {
          uniqueSubjects.set(subject.id, subject);
        }
      });
    });
    return Array.from(uniqueSubjects.values());
  }, [classEvaluations]);

  const displaySubjects = isTeacher ? availableSubjects : subjectsFromEvaluations;

  const handleExportClass = async () => {
    if (!classEvaluations || !selectedClass) return;
    
    // On devrait charger les notes pour chaque évaluation
    // Pour simplifier, on exporte les évaluations avec leurs infos de base
    exportClassGradesToExcel({
      className: selectedClass.name,
      evaluations: classEvaluations.map(e => ({
        name: e.name,
        subjectName: e.subject.name,
        maxScore: e.max_score,
        grades: [], // Les notes seront chargées au clic sur chaque évaluation
      })),
    });
  };

  if (!school?.id || !activeSchoolYear?.id) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <Card className="p-6">
          <p className="text-muted-foreground">
            {t('schoolOS.common.noData')}
          </p>
        </Card>
      </div>
    );
  }

  if (isLoadingRole || isLoadingClasses || (isParent && isLoadingParentChildren)) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <p className="text-muted-foreground">{t('schoolOS.common.loading')}</p>
      </div>
    );
  }

  // Vue parent : afficher les notes de ses enfants (lecture seule)
  if (isParent && !isOwner && !roleData?.isAdmin) {
    if (!parentChildren || parentChildren.length === 0) {
      return (
        <div className="p-6 h-full overflow-auto">
          <div className="text-center py-12">
            <GraduationCap className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun enfant trouvé</h3>
            <p className="text-muted-foreground">
              Aucun enfant n'est associé à votre compte pour cette année scolaire.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-6 h-full flex flex-col overflow-hidden">
        <div className="mb-4 flex-shrink-0">
          <h2 className="text-2xl font-bold">Résultats scolaires</h2>
          <p className="text-muted-foreground mt-1">
            Consultez les notes et bulletins de vos enfants
          </p>
        </div>

        <Tabs value={parentTab} onValueChange={(v) => setParentTab(v as 'notes' | 'bulletins')} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 mb-4 flex-shrink-0">
            <TabsTrigger value="notes" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="bulletins" className="flex items-center gap-2">
              <ScrollText className="h-4 w-4" />
              Bulletins
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notes" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full">
              <div className="space-y-4">
                {parentChildren.map((child) => (
                  <Card key={child.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                          {child.first_name?.[0]}{child.last_name?.[0]}
                        </span>
                        <div>
                          <CardTitle className="text-lg">{child.last_name} {child.first_name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            {child.class_name && (
                              <Badge variant="outline">
                                <BookOpen className="w-3 h-3 mr-1" />
                                {child.class_name}
                              </Badge>
                            )}
                            {child.student_code && (
                              <span className="text-sm text-muted-foreground">{child.student_code}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ParentChildGrades studentId={child.id} classId={child.class_id} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="bulletins" className="flex-1 overflow-hidden m-0">
            <ParentBulletinsView
              children={parentChildren}
              schoolId={school!.id}
              schoolYearId={activeSchoolYear!.id}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Si aucune classe disponible
  if (availableClasses.length === 0) {
    return (
      <div className="p-6 h-full overflow-auto">
        <div className="text-center py-12">
          <GraduationCap className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {t('schoolOS.classes.noClasses')}
          </h3>
          <p className="text-muted-foreground">
            {t('schoolOS.classes.noClasses')}
          </p>
        </div>
      </div>
    );
  }

  // Vue de saisie des notes pour une évaluation (méthode 1)
  if (selectedEvaluation && selectedClass) {
    return (
      <div className="p-6 h-full overflow-hidden flex flex-col">
        <GradeEntryView
          evaluation={selectedEvaluation}
          className={selectedClass.name}
          onBack={() => setSelectedEvaluation(null)}
        />
      </div>
    );
  }

  // Vue de saisie des notes par matière (méthode 2)
  if (selectedSubjectEvaluation && selectedClass && selectedSubjectForEntry) {
    const selectedSubjectInfo = displaySubjects.find(s => s.id === selectedSubjectForEntry);
    return (
      <div className="p-6 h-full overflow-hidden flex flex-col">
        <SubjectGradeEntryView
          evaluationId={selectedSubjectEvaluation.id}
          evaluationName={selectedSubjectEvaluation.name}
          subjectId={selectedSubjectForEntry}
          subjectName={selectedSubjectInfo?.name || ''}
          className={selectedClass.name}
          maxScore={selectedSubjectEvaluation.max_score}
          onBack={() => setSelectedSubjectEvaluation(null)}
        />
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="mb-4 flex-shrink-0">
        <h2 className="text-2xl font-bold">Gestion des Notes & Bulletins</h2>
        <p className="text-muted-foreground mt-1">
          {isTeacher 
            ? 'Saisissez les notes et générez les bulletins'
            : 'Consultez et gérez les notes et bulletins de l\'école'
          }
        </p>
      </div>

      {/* Onglets principaux */}
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as 'grades' | 'bulletins' | 'stats')} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid w-full grid-cols-3 mb-4 flex-shrink-0">
          <TabsTrigger value="grades" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Saisie des Notes</span>
            <span className="sm:hidden">Notes</span>
          </TabsTrigger>
          <TabsTrigger value="bulletins" className="flex items-center gap-2">
            <ScrollText className="h-4 w-4" />
            <span className="hidden sm:inline">Bulletins</span>
            <span className="sm:hidden">Bulletins</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Statistiques</span>
            <span className="sm:hidden">Stats</span>
          </TabsTrigger>
        </TabsList>

        {/* Onglet Saisie des Notes */}
        <TabsContent value="grades" className="flex-1 overflow-hidden m-0 flex flex-col">
          {/* Sous-onglets pour Évaluations et Compositions */}
          <Tabs value={gradeSubTab} onValueChange={(v) => setGradeSubTab(v as 'evaluations' | 'compositions')} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2 mb-4 flex-shrink-0">
              <TabsTrigger value="evaluations" className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Évaluations</span>
                <span className="sm:hidden">Éval.</span>
              </TabsTrigger>
              <TabsTrigger value="compositions" className="flex items-center gap-2">
                <FileCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Compositions</span>
                <span className="sm:hidden">Compo.</span>
              </TabsTrigger>
            </TabsList>

            {/* Sous-onglet Évaluations */}
            <TabsContent value="evaluations" className="flex-1 overflow-hidden m-0 flex flex-col">
              {/* Filtres */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 flex-shrink-0">
                <div>
                  <label className="text-sm font-medium mb-2 block">Classe</label>
                  <Select 
                    value={selectedClassId} 
                    onValueChange={(value) => {
                      setSelectedClassId(value);
                      setSelectedSubjectId('all');
                      setSelectedEvaluation(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une classe" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableClasses.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            {cls.name}
                            <Badge variant="outline" className="ml-2">
                              {cls.current_students} élèves
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Matière (filtre)</label>
                  <Select 
                    value={selectedSubjectId} 
                    onValueChange={setSelectedSubjectId}
                    disabled={!selectedClassId || displaySubjects.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Toutes les matières" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <Filter className="h-4 w-4" />
                          Toutes les matières
                        </div>
                      </SelectItem>
                      {displaySubjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Bouton export */}
              {selectedClassId && classEvaluations && classEvaluations.length > 0 && (
                <div className="flex justify-end mb-4 flex-shrink-0">
                  <Button variant="outline" onClick={handleExportClass}>
                    <Download className="h-4 w-4 mr-2" />
                    Exporter la classe
                  </Button>
                </div>
              )}

              {/* Contenu principal notes */}
              {!selectedClassId ? (
                <Card className="flex-1 flex items-center justify-center">
                  <div className="text-center py-12">
                    <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Sélectionnez une classe</h3>
                    <p className="text-muted-foreground">
                      Choisissez une classe pour voir ses évaluations et saisir les notes
                    </p>
                  </div>
                </Card>
              ) : (
                <Card className="flex-1 overflow-hidden flex flex-col">
                  <CardHeader className="flex-shrink-0 pb-2">
                    <div className="flex items-center justify-between mb-4">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        {selectedClass?.name}
                      </CardTitle>
                      {classEvaluations && (
                        <Badge variant="outline">
                          {classEvaluations.length} évaluation{classEvaluations.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Onglets pour les deux méthodes */}
                    <Tabs value={entryMethod} onValueChange={(v) => setEntryMethod(v as 'evaluation' | 'subject')}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="evaluation" className="flex items-center gap-2">
                          <ClipboardList className="h-4 w-4" />
                          <span className="hidden sm:inline">Par évaluation</span>
                          <span className="sm:hidden">Évaluation</span>
                        </TabsTrigger>
                        <TabsTrigger value="subject" className="flex items-center gap-2">
                          <BookMarked className="h-4 w-4" />
                          <span className="hidden sm:inline">Par matière</span>
                          <span className="sm:hidden">Matière</span>
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </CardHeader>
                  
                  <CardContent className="flex-1 overflow-hidden pt-0">
                    {entryMethod === 'evaluation' ? (
                      <EvaluationsListView
                        classId={selectedClassId}
                        subjectId={selectedSubjectId === 'all' ? undefined : selectedSubjectId}
                        onSelectEvaluation={setSelectedEvaluation}
                      />
                    ) : (
                      <div className="h-full flex flex-col">
                        <div className="mb-4">
                          <label className="text-sm font-medium mb-2 block">Sélectionner une matière</label>
                          <Select 
                            value={selectedSubjectForEntry} 
                            onValueChange={setSelectedSubjectForEntry}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choisir une matière" />
                            </SelectTrigger>
                            <SelectContent>
                              {displaySubjects.map((subject) => (
                                <SelectItem key={subject.id} value={subject.id}>
                                  <div className="flex items-center gap-2">
                                    <BookMarked className="h-4 w-4" />
                                    {subject.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {selectedSubjectForEntry ? (
                          <div className="flex-1 overflow-hidden">
                            <SubjectEvaluationsListView
                              classId={selectedClassId}
                              subjectId={selectedSubjectForEntry}
                              subjectName={displaySubjects.find(s => s.id === selectedSubjectForEntry)?.name || ''}
                              onSelectEvaluation={setSelectedSubjectEvaluation}
                            />
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center justify-center">
                            <div className="text-center py-8">
                              <BookMarked className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                              <p className="text-muted-foreground">
                                Sélectionnez une matière pour voir ses évaluations
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Sous-onglet Compositions */}
            <TabsContent value="compositions" className="flex-1 overflow-hidden m-0">
              <CompositionsGradeEntry
                availableClasses={availableClasses}
                isTeacher={isTeacher}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Onglet Bulletins */}
        <TabsContent value="bulletins" className="overflow-auto m-0">
          <BulletinsSection 
            availableClasses={availableClasses}
            schoolId={school?.id || ''}
            schoolYearId={activeSchoolYear?.id || ''}
          />
        </TabsContent>

        {/* Onglet Statistiques */}
        <TabsContent value="stats" className="flex-1 overflow-hidden m-0">
          <Card className="h-full flex items-center justify-center">
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Statistiques</h3>
              <p className="text-muted-foreground">
                Les statistiques des notes seront bientôt disponibles
              </p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
