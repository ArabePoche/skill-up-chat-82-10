/**
 * Vue de saisie des notes pour une évaluation
 * Supporte la notation par matière (une note par matière par élève)
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  ArrowLeft, 
  Save, 
  Download, 
  Users, 
  MessageSquare,
  Check,
  BookOpen
} from 'lucide-react';
import { ClassEvaluation } from '../hooks/useClassEvaluations';
import { useEvaluationGrades, useSaveGrades, GradeInput, SubjectInfo } from '../hooks/useGrades';
import { exportGradesToExcel } from '../utils/exportGrades';
import { toast } from 'sonner';

interface GradeEntryViewProps {
  evaluation: ClassEvaluation;
  className: string;
  onBack: () => void;
}

interface LocalGrade {
  student_id: string;
  subject_id: string | null;
  score: string;
  is_absent: boolean;
  is_excused: boolean;
  comment: string;
}

// Clé unique pour une note (student + subject)
const getGradeKey = (studentId: string, subjectId: string | null) => 
  `${studentId}_${subjectId || 'default'}`;

export const GradeEntryView: React.FC<GradeEntryViewProps> = ({
  evaluation,
  className,
  onBack,
}) => {
  const { data: gradesData, isLoading } = useEvaluationGrades(evaluation.id);
  const saveMutation = useSaveGrades();
  
  const [localGrades, setLocalGrades] = useState<Map<string, LocalGrade>>(new Map());
  const [hasChanges, setHasChanges] = useState(false);

  // Récupérer les étudiants et matières
  const students = gradesData?.students || [];
  const subjects = gradesData?.subjects || [];
  const gradesMap = gradesData?.gradesMap || new Map();

  // Initialiser les notes locales quand les données arrivent
  useEffect(() => {
    if (gradesData) {
      const map = new Map<string, LocalGrade>();
      
      // Pour chaque étudiant
      students.forEach(student => {
        const studentGrades = gradesMap.get(student.student_id);
        
        // Si l'évaluation a des matières
        if (subjects.length > 0) {
          subjects.forEach(subject => {
            const key = getGradeKey(student.student_id, subject.id);
            const existingGrade = studentGrades?.get(subject.id);
            
            map.set(key, {
              student_id: student.student_id,
              subject_id: subject.id,
              score: existingGrade?.score != null ? String(existingGrade.score) : '',
              is_absent: existingGrade?.is_absent ?? false,
              is_excused: existingGrade?.is_excused ?? false,
              comment: existingGrade?.comment || '',
            });
          });
        } else {
          // Pas de matière spécifique (évaluation simple)
          const key = getGradeKey(student.student_id, null);
          const existingGrade = studentGrades?.get('default');
          
          map.set(key, {
            student_id: student.student_id,
            subject_id: null,
            score: existingGrade?.score != null ? String(existingGrade.score) : '',
            is_absent: existingGrade?.is_absent ?? false,
            is_excused: existingGrade?.is_excused ?? false,
            comment: existingGrade?.comment || '',
          });
        }
      });
      
      setLocalGrades(map);
      setHasChanges(false);
    }
  }, [gradesData, students, subjects, gradesMap]);

  const updateGrade = (studentId: string, subjectId: string | null, field: keyof LocalGrade, value: any) => {
    const key = getGradeKey(studentId, subjectId);
    
    setLocalGrades(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(key) || {
        student_id: studentId,
        subject_id: subjectId,
        score: '',
        is_absent: false,
        is_excused: false,
        comment: '',
      };
      
      // Si on coche absent, on efface la note
      if (field === 'is_absent' && value === true) {
        newMap.set(key, { ...existing, [field]: value, score: '' });
      } else {
        newMap.set(key, { ...existing, [field]: value });
      }
      
      return newMap;
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    const gradesToSave: GradeInput[] = [];

    localGrades.forEach((localGrade) => {
      const score = localGrade.score === '' ? null : parseFloat(localGrade.score);
      
      // Validation
      if (score !== null && (isNaN(score) || score < 0 || score > evaluation.max_score)) {
        toast.error(`Note invalide (doit être entre 0 et ${evaluation.max_score})`);
        return;
      }

      gradesToSave.push({
        student_id: localGrade.student_id,
        evaluation_id: evaluation.id,
        subject_id: localGrade.subject_id,
        score,
        is_absent: localGrade.is_absent,
        is_excused: localGrade.is_excused,
        comment: localGrade.comment || undefined,
      });
    });

    await saveMutation.mutateAsync(gradesToSave);
    setHasChanges(false);
  };

  const handleExport = () => {
    if (!students.length) return;
    
    // Adapter l'export pour le nouveau format
    const gradesForExport = students.map(student => {
      const key = getGradeKey(student.student_id, subjects[0]?.id || null);
      const localGrade = localGrades.get(key);
      
      return {
        ...student,
        score: localGrade?.score ? parseFloat(localGrade.score) : null,
        is_absent: localGrade?.is_absent ?? false,
        is_excused: localGrade?.is_excused ?? false,
        comment: localGrade?.comment ?? null,
      };
    });

    exportGradesToExcel({
      className,
      subjectName: subjects.length > 0 ? subjects.map(s => s.name).join(', ') : evaluation.subject.name,
      evaluationName: evaluation.name,
      maxScore: evaluation.max_score,
      grades: gradesForExport,
    });
  };

  // Statistiques
  const stats = useMemo(() => {
    if (!students.length) return null;
    
    const allScores: number[] = [];
    let absentCount = 0;
    let enteredCount = 0;
    
    localGrades.forEach(g => {
      if (g.is_absent) absentCount++;
      if (g.score !== '' || g.is_absent) enteredCount++;
      if (g.score !== '' && !g.is_absent) {
        const score = parseFloat(g.score);
        if (!isNaN(score)) allScores.push(score);
      }
    });

    const totalExpected = subjects.length > 0 
      ? students.length * subjects.length 
      : students.length;

    return {
      total: students.length,
      subjects: subjects.length,
      totalNotes: totalExpected,
      entered: enteredCount,
      absent: absentCount,
      average: allScores.length > 0 
        ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2)
        : '-',
      max: allScores.length > 0 ? Math.max(...allScores) : '-',
      min: allScores.length > 0 ? Math.min(...allScores) : '-',
    };
  }, [students, subjects, localGrades]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  const hasMultipleSubjects = subjects.length > 1;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-base sm:text-lg truncate">{evaluation.name}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {hasMultipleSubjects 
                ? `${subjects.length} matières • ${className} • /${evaluation.max_score}`
                : `${evaluation.subject.name} • ${className} • /${evaluation.max_score}`
              }
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="flex-1 sm:flex-initial">
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Excel</span>
          </Button>
          <Button 
            size="sm" 
            onClick={handleSave}
            disabled={!hasChanges || saveMutation.isPending}
            className="flex-1 sm:flex-initial"
          >
            <Save className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}</span>
            <span className="sm:hidden">Sauver</span>
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 mb-4 flex-shrink-0">
          <Card className="p-2 sm:p-3 text-center">
            <p className="text-xs text-muted-foreground">Élèves</p>
            <p className="text-base sm:text-lg font-bold">{stats.total}</p>
          </Card>
          {hasMultipleSubjects && (
            <Card className="p-2 sm:p-3 text-center">
              <p className="text-xs text-muted-foreground">Matières</p>
              <p className="text-base sm:text-lg font-bold text-blue-500">{stats.subjects}</p>
            </Card>
          )}
          <Card className="p-2 sm:p-3 text-center">
            <p className="text-xs text-muted-foreground">Saisis</p>
            <p className="text-base sm:text-lg font-bold text-primary">{stats.entered}/{stats.totalNotes}</p>
          </Card>
          <Card className="p-2 sm:p-3 text-center">
            <p className="text-xs text-muted-foreground">Absents</p>
            <p className="text-base sm:text-lg font-bold text-orange-500">{stats.absent}</p>
          </Card>
          <Card className="p-2 sm:p-3 text-center">
            <p className="text-xs text-muted-foreground">Moyenne</p>
            <p className="text-base sm:text-lg font-bold">{stats.average}</p>
          </Card>
          <Card className="p-2 sm:p-3 text-center">
            <p className="text-xs text-muted-foreground">Max</p>
            <p className="text-base sm:text-lg font-bold text-green-500">{stats.max}</p>
          </Card>
          <Card className="p-2 sm:p-3 text-center">
            <p className="text-xs text-muted-foreground">Min</p>
            <p className="text-base sm:text-lg font-bold text-red-500">{stats.min}</p>
          </Card>
        </div>
      )}

      {/* Liste des élèves */}
      <Card className="flex-1 overflow-hidden">
        <CardHeader className="py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Liste des élèves
              {hasMultipleSubjects && (
                <Badge variant="secondary" className="ml-2">
                  <BookOpen className="h-3 w-3 mr-1" />
                  Notes par matière
                </Badge>
              )}
            </CardTitle>
            {hasChanges && (
              <Badge variant="outline" className="text-orange-500 border-orange-500">
                Modifications non enregistrées
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-hidden">
          <ScrollArea className="h-[calc(100vh-400px)]">
            <div className="divide-y divide-border">
              {students.map((student, index) => {
                // Vérifier si toutes les notes sont saisies pour cet élève
                const allGradesFilled = subjects.length > 0
                  ? subjects.every(s => {
                      const key = getGradeKey(student.student_id, s.id);
                      const lg = localGrades.get(key);
                      return lg?.score !== '' || lg?.is_absent;
                    })
                  : (() => {
                      const key = getGradeKey(student.student_id, null);
                      const lg = localGrades.get(key);
                      return lg?.score !== '' || lg?.is_absent;
                    })();
                
                return (
                  <div 
                    key={student.student_id}
                    className="p-3 hover:bg-muted/50"
                  >
                    {/* En-tête élève */}
                    <div className="flex items-center gap-3 mb-3">
                      <span className="w-8 text-center text-sm text-muted-foreground font-medium">
                        {index + 1}
                      </span>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={student.student.photo_url || undefined} />
                        <AvatarFallback>
                          {student.student.first_name[0]}{student.student.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {student.student.last_name} {student.student.first_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {student.student.student_code}
                        </p>
                      </div>
                      {allGradesFilled && (
                        <Check className="h-5 w-5 text-green-500" />
                      )}
                    </div>

                    {/* Grille des notes par matière */}
                    {hasMultipleSubjects ? (
                      <div className="ml-11 grid gap-2">
                        {subjects.map(subject => {
                          const key = getGradeKey(student.student_id, subject.id);
                          const localGrade = localGrades.get(key);
                          
                          return (
                            <div key={subject.id} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
                              <span className="text-sm font-medium min-w-[100px] truncate">
                                {subject.name}
                              </span>
                              <Input
                                type="number"
                                min="0"
                                max={evaluation.max_score}
                                step="0.5"
                                placeholder="-"
                                value={localGrade?.score || ''}
                                onChange={(e) => updateGrade(student.student_id, subject.id, 'score', e.target.value)}
                                disabled={localGrade?.is_absent}
                                className="w-20 text-center"
                              />
                              <span className="text-sm text-muted-foreground">
                                /{evaluation.max_score}
                              </span>
                              <div className="flex items-center gap-1">
                                <Checkbox
                                  checked={localGrade?.is_absent || false}
                                  onCheckedChange={(checked) => 
                                    updateGrade(student.student_id, subject.id, 'is_absent', checked)
                                  }
                                />
                                <span className="text-xs text-muted-foreground">Abs</span>
                              </div>
                              {(localGrade?.score || localGrade?.is_absent) && (
                                <Check className="h-4 w-4 text-green-500" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      // Une seule matière - affichage simplifié
                      <div className="ml-11 flex items-center gap-3">
                        {(() => {
                          const key = getGradeKey(student.student_id, subjects[0]?.id || null);
                          const localGrade = localGrades.get(key);
                          
                          return (
                            <>
                              <Input
                                type="number"
                                min="0"
                                max={evaluation.max_score}
                                step="0.5"
                                placeholder="-"
                                value={localGrade?.score || ''}
                                onChange={(e) => updateGrade(student.student_id, subjects[0]?.id || null, 'score', e.target.value)}
                                disabled={localGrade?.is_absent}
                                className="w-20 text-center"
                              />
                              <span className="text-sm text-muted-foreground">
                                /{evaluation.max_score}
                              </span>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={localGrade?.is_absent || false}
                                  onCheckedChange={(checked) => 
                                    updateGrade(student.student_id, subjects[0]?.id || null, 'is_absent', checked)
                                  }
                                />
                                <span className="text-xs text-muted-foreground">Absent</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={localGrade?.is_excused || false}
                                  onCheckedChange={(checked) => 
                                    updateGrade(student.student_id, subjects[0]?.id || null, 'is_excused', checked)
                                  }
                                  disabled={!localGrade?.is_absent}
                                />
                                <span className="text-xs text-muted-foreground">Excusé</span>
                              </div>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className={localGrade?.comment ? 'text-primary' : ''}
                                  >
                                    <MessageSquare className="h-4 w-4" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80">
                                  <div className="space-y-2">
                                    <h4 className="font-medium">Commentaire</h4>
                                    <Textarea
                                      placeholder="Ajouter un commentaire..."
                                      value={localGrade?.comment || ''}
                                      onChange={(e) => 
                                        updateGrade(student.student_id, subjects[0]?.id || null, 'comment', e.target.value)
                                      }
                                      rows={3}
                                    />
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
