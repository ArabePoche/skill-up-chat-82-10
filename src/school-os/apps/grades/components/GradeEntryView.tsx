/**
 * Vue de saisie des notes pour une évaluation
 * Permet la saisie en masse ou individuelle
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
  Calculator,
  MessageSquare,
  Check
} from 'lucide-react';
import { ClassEvaluation } from '../hooks/useClassEvaluations';
import { useEvaluationGrades, useSaveGrades, GradeInput } from '../hooks/useGrades';
import { exportGradesToExcel } from '../utils/exportGrades';
import { toast } from 'sonner';

interface GradeEntryViewProps {
  evaluation: ClassEvaluation;
  className: string;
  onBack: () => void;
}

interface LocalGrade {
  student_id: string;
  score: string;
  is_absent: boolean;
  is_excused: boolean;
  comment: string;
}

export const GradeEntryView: React.FC<GradeEntryViewProps> = ({
  evaluation,
  className,
  onBack,
}) => {
  const { data: grades, isLoading } = useEvaluationGrades(evaluation.id);
  const saveMutation = useSaveGrades();
  
  const [localGrades, setLocalGrades] = useState<Map<string, LocalGrade>>(new Map());
  const [hasChanges, setHasChanges] = useState(false);

  // Initialiser les notes locales quand les données arrivent
  useEffect(() => {
    if (grades) {
      const map = new Map<string, LocalGrade>();
      grades.forEach(grade => {
        map.set(grade.student_id, {
          student_id: grade.student_id,
          score: grade.score !== null ? String(grade.score) : '',
          is_absent: grade.is_absent,
          is_excused: grade.is_excused,
          comment: grade.comment || '',
        });
      });
      setLocalGrades(map);
      setHasChanges(false);
    }
  }, [grades]);

  const updateGrade = (studentId: string, field: keyof LocalGrade, value: any) => {
    setLocalGrades(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(studentId) || {
        student_id: studentId,
        score: '',
        is_absent: false,
        is_excused: false,
        comment: '',
      };
      
      // Si on coche absent, on efface la note
      if (field === 'is_absent' && value === true) {
        newMap.set(studentId, { ...existing, [field]: value, score: '' });
      } else {
        newMap.set(studentId, { ...existing, [field]: value });
      }
      
      return newMap;
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    const gradesToSave: GradeInput[] = [];

    localGrades.forEach((localGrade, studentId) => {
      const score = localGrade.score === '' ? null : parseFloat(localGrade.score);
      
      // Validation
      if (score !== null && (isNaN(score) || score < 0 || score > evaluation.max_score)) {
        toast.error(`Note invalide pour un élève (doit être entre 0 et ${evaluation.max_score})`);
        return;
      }

      gradesToSave.push({
        student_id: studentId,
        evaluation_id: evaluation.id,
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
    if (!grades) return;
    
    exportGradesToExcel({
      className,
      subjectName: evaluation.subject.name,
      evaluationName: evaluation.name,
      maxScore: evaluation.max_score,
      grades: grades.map(g => ({
        ...g,
        score: localGrades.get(g.student_id)?.score 
          ? parseFloat(localGrades.get(g.student_id)!.score)
          : g.score,
        is_absent: localGrades.get(g.student_id)?.is_absent ?? g.is_absent,
        is_excused: localGrades.get(g.student_id)?.is_excused ?? g.is_excused,
        comment: localGrades.get(g.student_id)?.comment ?? g.comment,
      })),
    });
  };

  // Statistiques
  const stats = useMemo(() => {
    if (!grades) return null;
    
    const validGrades = Array.from(localGrades.values())
      .filter(g => g.score !== '' && !g.is_absent)
      .map(g => parseFloat(g.score))
      .filter(n => !isNaN(n));

    const absentCount = Array.from(localGrades.values()).filter(g => g.is_absent).length;
    const enteredCount = Array.from(localGrades.values()).filter(g => g.score !== '' || g.is_absent).length;

    return {
      total: grades.length,
      entered: enteredCount,
      absent: absentCount,
      average: validGrades.length > 0 
        ? (validGrades.reduce((a, b) => a + b, 0) / validGrades.length).toFixed(2)
        : '-',
      max: validGrades.length > 0 ? Math.max(...validGrades) : '-',
      min: validGrades.length > 0 ? Math.min(...validGrades) : '-',
    };
  }, [grades, localGrades]);

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
              {evaluation.subject.name} • {className} • /{evaluation.max_score}
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4 flex-shrink-0">
          <Card className="p-2 sm:p-3 text-center">
            <p className="text-xs text-muted-foreground">Élèves</p>
            <p className="text-base sm:text-lg font-bold">{stats.total}</p>
          </Card>
          <Card className="p-2 sm:p-3 text-center">
            <p className="text-xs text-muted-foreground">Saisis</p>
            <p className="text-base sm:text-lg font-bold text-primary">{stats.entered}</p>
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
              {grades?.map((grade, index) => {
                const localGrade = localGrades.get(grade.student_id);
                
                return (
                  <div 
                    key={grade.student_id}
                    className="p-3 hover:bg-muted/50"
                  >
                    {/* Desktop: disposition horizontale */}
                    <div className="hidden lg:flex items-center gap-3">
                      {/* Numéro */}
                      <span className="w-8 text-center text-sm text-muted-foreground font-medium">
                        {index + 1}
                      </span>
                      
                      {/* Avatar */}
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={grade.student.photo_url || undefined} />
                        <AvatarFallback>
                          {grade.student.first_name[0]}{grade.student.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      
                      {/* Nom */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {grade.student.last_name} {grade.student.first_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {grade.student.student_code}
                        </p>
                      </div>
                      
                      {/* Note */}
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max={evaluation.max_score}
                          step="0.5"
                          placeholder="-"
                          value={localGrade?.score || ''}
                          onChange={(e) => updateGrade(grade.student_id, 'score', e.target.value)}
                          disabled={localGrade?.is_absent}
                          className="w-20 text-center"
                        />
                        <span className="text-sm text-muted-foreground">
                          /{evaluation.max_score}
                        </span>
                      </div>
                      
                      {/* Absent */}
                      <div className="flex items-center gap-1">
                        <Checkbox
                          checked={localGrade?.is_absent || false}
                          onCheckedChange={(checked) => 
                            updateGrade(grade.student_id, 'is_absent', checked)
                          }
                        />
                        <span className="text-xs text-muted-foreground">Abs</span>
                      </div>
                      
                      {/* Excusé */}
                      <div className="flex items-center gap-1">
                        <Checkbox
                          checked={localGrade?.is_excused || false}
                          onCheckedChange={(checked) => 
                            updateGrade(grade.student_id, 'is_excused', checked)
                          }
                          disabled={!localGrade?.is_absent}
                        />
                        <span className="text-xs text-muted-foreground">Exc</span>
                      </div>
                      
                      {/* Commentaire */}
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
                                updateGrade(grade.student_id, 'comment', e.target.value)
                              }
                              rows={3}
                            />
                          </div>
                        </PopoverContent>
                      </Popover>
                      
                      {/* Indicateur de saisie */}
                      {(localGrade?.score || localGrade?.is_absent) && (
                        <Check className="h-4 w-4 text-green-500" />
                      )}
                    </div>

                    {/* Mobile/Tablet: disposition verticale empilée */}
                    <div className="lg:hidden space-y-3">
                      {/* En-tête élève */}
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground font-medium">
                          #{index + 1}
                        </span>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={grade.student.photo_url || undefined} />
                          <AvatarFallback>
                            {grade.student.first_name[0]}{grade.student.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {grade.student.last_name} {grade.student.first_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {grade.student.student_code}
                          </p>
                        </div>
                        {(localGrade?.score || localGrade?.is_absent) && (
                          <Check className="h-5 w-5 text-green-500" />
                        )}
                      </div>

                      {/* Saisie note */}
                      <div className="flex items-center gap-3">
                        <label className="text-sm font-medium min-w-[60px]">Note:</label>
                        <Input
                          type="number"
                          min="0"
                          max={evaluation.max_score}
                          step="0.5"
                          placeholder="-"
                          value={localGrade?.score || ''}
                          onChange={(e) => updateGrade(grade.student_id, 'score', e.target.value)}
                          disabled={localGrade?.is_absent}
                          className="flex-1 text-center h-11 text-base"
                        />
                        <span className="text-sm text-muted-foreground min-w-[50px]">
                          / {evaluation.max_score}
                        </span>
                      </div>

                      {/* Options */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={localGrade?.is_absent || false}
                              onCheckedChange={(checked) => 
                                updateGrade(grade.student_id, 'is_absent', checked)
                              }
                              className="h-5 w-5"
                            />
                            <span className="text-sm">Absent</span>
                          </label>
                          
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={localGrade?.is_excused || false}
                              onCheckedChange={(checked) => 
                                updateGrade(grade.student_id, 'is_excused', checked)
                              }
                              disabled={!localGrade?.is_absent}
                              className="h-5 w-5"
                            />
                            <span className="text-sm">Excusé</span>
                          </label>
                        </div>

                        {/* Commentaire */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className={localGrade?.comment ? 'text-primary border-primary' : ''}
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Commentaire
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[calc(100vw-2rem)] sm:w-80" side="top">
                            <div className="space-y-2">
                              <h4 className="font-medium">Commentaire</h4>
                              <Textarea
                                placeholder="Ajouter un commentaire..."
                                value={localGrade?.comment || ''}
                                onChange={(e) => 
                                  updateGrade(grade.student_id, 'comment', e.target.value)
                                }
                                rows={3}
                              />
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
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
