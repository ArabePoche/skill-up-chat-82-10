/**
 * Application de gestion des notes
 * Affiche les évaluations par classe avec saisie des notes et export Excel
 */
import React, { useState } from 'react';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import { useSchoolUserRole } from '@/school-os/hooks/useSchoolUserRole';
import { useTeacherClasses } from '@/school-os/hooks/useTeacherClasses';
import { useSchoolClasses } from '@/school/hooks/useClasses';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Users, FileText, GraduationCap, Download, Filter } from 'lucide-react';
import { EvaluationsListView } from './components/EvaluationsListView';
import { GradeEntryView } from './components/GradeEntryView';
import { ClassEvaluation, useClassEvaluations } from './hooks/useClassEvaluations';
import { useEvaluationGrades } from './hooks/useGrades';
import { exportClassGradesToExcel } from './utils/exportGrades';

export const GradesApp: React.FC = () => {
  const { school, activeSchoolYear } = useSchoolYear();
  const { data: roleData, isLoading: isLoadingRole } = useSchoolUserRole(school?.id);
  const isTeacher = roleData?.isTeacher ?? false;
  const isOwner = roleData?.isOwner ?? false;

  // Classes selon le rôle
  const { data: teacherClasses, isLoading: isLoadingTeacherClasses } = useTeacherClasses(
    school?.id, 
    activeSchoolYear?.id
  );
  const { data: allClasses, isLoading: isLoadingAllClasses } = useSchoolClasses(
    school?.id, 
    activeSchoolYear?.id
  );

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
      if (!uniqueSubjects.has(e.subject.id)) {
        uniqueSubjects.set(e.subject.id, e.subject);
      }
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

  // Si aucune classe disponible
  if (availableClasses.length === 0) {
    return (
      <div className="p-6 h-full overflow-auto">
        <div className="text-center py-12">
          <GraduationCap className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {isTeacher ? 'Aucune classe assignée' : 'Aucune classe disponible'}
          </h3>
          <p className="text-muted-foreground">
            {isTeacher 
              ? 'Vous devez être assigné à des classes pour saisir des notes.'
              : 'Créez d\'abord des classes et des évaluations.'
            }
          </p>
        </div>
      </div>
    );
  }

  // Vue de saisie des notes pour une évaluation
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

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="mb-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Gestion des Notes</h2>
            <p className="text-muted-foreground mt-1">
              {isTeacher 
                ? 'Saisissez les notes de vos élèves par évaluation'
                : 'Consultez et gérez les notes de l\'école'
              }
            </p>
          </div>
          {selectedClassId && classEvaluations && classEvaluations.length > 0 && (
            <Button variant="outline" onClick={handleExportClass}>
              <Download className="h-4 w-4 mr-2" />
              Exporter la classe
            </Button>
          )}
        </div>
      </div>

      {/* Filtres */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 flex-shrink-0">
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

      {/* Contenu principal */}
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
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Évaluations - {selectedClass?.name}
              </div>
              {classEvaluations && (
                <Badge variant="outline">
                  {classEvaluations.length} évaluation{classEvaluations.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden pt-0">
            <EvaluationsListView
              classId={selectedClassId}
              subjectId={selectedSubjectId === 'all' ? undefined : selectedSubjectId}
              onSelectEvaluation={setSelectedEvaluation}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};
