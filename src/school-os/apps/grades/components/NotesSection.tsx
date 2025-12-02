/**
 * Section Notes - Saisie des notes avec deux méthodes
 * 1. Par évaluation complète
 * 2. Par matière directe
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, FileText, Download, Filter, ClipboardList, BookMarked } from 'lucide-react';
import { EvaluationsListView } from './EvaluationsListView';
import { GradeEntryView } from './GradeEntryView';
import { SubjectEvaluationsListView } from './SubjectEvaluationsListView';
import { SubjectGradeEntryView } from './SubjectGradeEntryView';
import { ClassEvaluation, useClassEvaluations } from '../hooks/useClassEvaluations';
import { SubjectEvaluation } from '../hooks/useSubjectEvaluations';
import { exportClassGradesToExcel } from '../utils/exportGrades';

interface NotesSectionProps {
  availableClasses: Array<{
    id: string;
    name: string;
    cycle: string;
    current_students: number;
    max_students: number;
    subjects: Array<{ id: string; name: string }>;
  }>;
  isTeacher: boolean;
}

export const NotesSection: React.FC<NotesSectionProps> = ({ availableClasses, isTeacher }) => {
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [selectedEvaluation, setSelectedEvaluation] = useState<ClassEvaluation | null>(null);
  const [entryMethod, setEntryMethod] = useState<'evaluation' | 'subject'>('evaluation');
  const [selectedSubjectForEntry, setSelectedSubjectForEntry] = useState<string>('');
  const [selectedSubjectEvaluation, setSelectedSubjectEvaluation] = useState<SubjectEvaluation | null>(null);

  const { data: classEvaluations } = useClassEvaluations(selectedClassId);
  const selectedClass = availableClasses.find(c => c.id === selectedClassId);

  // Pour les enseignants, on utilise leurs matières assignées
  const availableSubjects = isTeacher 
    ? availableClasses.find(c => c.id === selectedClassId)?.subjects || []
    : [];

  // Extraire les matières uniques des évaluations pour les admins
  const subjectsFromEvaluations = React.useMemo(() => {
    if (!classEvaluations) return [];
    const uniqueSubjects = new Map();
    classEvaluations.forEach(e => {
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
    exportClassGradesToExcel({
      className: selectedClass.name,
      evaluations: classEvaluations.map(e => ({
        name: e.name,
        subjectName: e.subject.name,
        maxScore: e.max_score,
        grades: [],
      })),
    });
  };

  // Vue de saisie des notes pour une évaluation (méthode 1)
  if (selectedEvaluation && selectedClass) {
    return (
      <GradeEntryView
        evaluation={selectedEvaluation}
        className={selectedClass.name}
        onBack={() => setSelectedEvaluation(null)}
      />
    );
  }

  // Vue de saisie des notes par matière (méthode 2)
  if (selectedSubjectEvaluation && selectedClass && selectedSubjectForEntry) {
    const selectedSubjectInfo = displaySubjects.find(s => s.id === selectedSubjectForEntry);
    return (
      <SubjectGradeEntryView
        evaluationId={selectedSubjectEvaluation.id}
        evaluationName={selectedSubjectEvaluation.name}
        subjectId={selectedSubjectForEntry}
        subjectName={selectedSubjectInfo?.name || ''}
        className={selectedClass.name}
        maxScore={selectedSubjectEvaluation.max_score}
        onBack={() => setSelectedSubjectEvaluation(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header avec export */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Saisie des Notes</h3>
          <p className="text-sm text-muted-foreground">
            {isTeacher 
              ? 'Saisissez les notes de vos élèves'
              : 'Consultez et gérez les notes'
            }
          </p>
        </div>
        {selectedClassId && classEvaluations && classEvaluations.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleExportClass}>
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        )}
      </div>

      {/* Filtres */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
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
    </div>
  );
};
