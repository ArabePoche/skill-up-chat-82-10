/**
 * Vue de saisie des notes par matière directe (Méthode 2)
 * Permet à un professeur de saisir les notes pour sa matière uniquement
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
import { 
  ArrowLeft, 
  Save, 
  Download, 
  Users, 
  Check,
  BookOpen
} from 'lucide-react';
import { useSubjectGrades } from '../hooks/useSubjectEvaluations';
import { useSaveGrades, GradeInput } from '../hooks/useGrades';
import { exportGradesToExcel } from '../utils/exportGrades';
import { toast } from 'sonner';

interface SubjectGradeEntryViewProps {
  evaluationId: string;
  evaluationName: string;
  subjectId: string;
  subjectName: string;
  className: string;
  maxScore: number;
  onBack: () => void;
}

interface LocalGrade {
  score: string;
  is_absent: boolean;
  is_excused: boolean;
  comment: string;
}

export const SubjectGradeEntryView: React.FC<SubjectGradeEntryViewProps> = ({
  evaluationId,
  evaluationName,
  subjectId,
  subjectName,
  className,
  maxScore,
  onBack,
}) => {
  const { data, isLoading } = useSubjectGrades(evaluationId, subjectId);
  const saveMutation = useSaveGrades();
  
  const [localGrades, setLocalGrades] = useState<Map<string, LocalGrade>>(new Map());
  const [hasChanges, setHasChanges] = useState(false);

  const students = data?.students || [];
  const gradesMap = data?.gradesMap || new Map();

  // Initialiser les notes locales
  useEffect(() => {
    if (data) {
      const map = new Map<string, LocalGrade>();
      
      students.forEach(student => {
        const existingGrade = gradesMap.get(student.id);
        
        map.set(student.id, {
          score: existingGrade?.score != null ? String(existingGrade.score) : '',
          is_absent: existingGrade?.is_absent ?? false,
          is_excused: existingGrade?.is_excused ?? false,
          comment: existingGrade?.comment || '',
        });
      });
      
      setLocalGrades(map);
      setHasChanges(false);
    }
  }, [data, students, gradesMap]);

  const updateGrade = (studentId: string, field: keyof LocalGrade, value: any) => {
    setLocalGrades(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(studentId) || {
        score: '',
        is_absent: false,
        is_excused: false,
        comment: '',
      };
      
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
      
      if (score !== null && (isNaN(score) || score < 0 || score > maxScore)) {
        toast.error(`Note invalide (doit être entre 0 et ${maxScore})`);
        return;
      }

      gradesToSave.push({
        student_id: studentId,
        evaluation_id: evaluationId,
        subject_id: subjectId,
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
    
    const gradesForExport = students.map(student => {
      const localGrade = localGrades.get(student.id);
      
      return {
        id: '',
        student_id: student.id,
        evaluation_id: evaluationId,
        subject_id: subjectId,
        entered_at: null,
        entered_by: null,
        student: {
          id: student.id,
          first_name: student.first_name,
          last_name: student.last_name,
          student_code: student.student_code,
          photo_url: student.photo_url,
        },
        score: localGrade?.score ? parseFloat(localGrade.score) : null,
        is_absent: localGrade?.is_absent ?? false,
        is_excused: localGrade?.is_excused ?? false,
        comment: localGrade?.comment ?? null,
      };
    });

    exportGradesToExcel({
      className,
      subjectName,
      evaluationName,
      maxScore,
      grades: gradesForExport,
    });
  };

  // Statistiques
  const stats = useMemo(() => {
    if (!students.length) return null;
    
    const scores: number[] = [];
    let absentCount = 0;
    let enteredCount = 0;
    
    localGrades.forEach(g => {
      if (g.is_absent) absentCount++;
      if (g.score !== '' || g.is_absent) enteredCount++;
      if (g.score !== '' && !g.is_absent) {
        const score = parseFloat(g.score);
        if (!isNaN(score)) scores.push(score);
      }
    });

    return {
      total: students.length,
      entered: enteredCount,
      absent: absentCount,
      average: scores.length > 0 
        ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)
        : '-',
      max: scores.length > 0 ? Math.max(...scores) : '-',
      min: scores.length > 0 ? Math.min(...scores) : '-',
    };
  }, [students, localGrades]);

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
            <h3 className="font-semibold text-base sm:text-lg truncate">{evaluationName}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              <Badge variant="secondary" className="mr-2">
                <BookOpen className="h-3 w-3 mr-1" />
                {subjectName}
              </Badge>
              {className} • /{maxScore}
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
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 mb-4 flex-shrink-0">
          <Card className="p-2 sm:p-3 text-center">
            <p className="text-xs text-muted-foreground">Élèves</p>
            <p className="text-base sm:text-lg font-bold">{stats.total}</p>
          </Card>
          <Card className="p-2 sm:p-3 text-center">
            <p className="text-xs text-muted-foreground">Saisis</p>
            <p className="text-base sm:text-lg font-bold text-primary">{stats.entered}/{stats.total}</p>
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
              {students.map((student, index) => {
                const localGrade = localGrades.get(student.id);
                const isFilled = localGrade?.score !== '' || localGrade?.is_absent;
                
                return (
                  <div 
                    key={student.id}
                    className="p-3 hover:bg-muted/50 flex items-center gap-3"
                  >
                    <span className="w-8 text-center text-sm text-muted-foreground font-medium">
                      {index + 1}
                    </span>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={student.photo_url || undefined} />
                      <AvatarFallback>
                        {student.first_name[0]}{student.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {student.last_name} {student.first_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {student.student_code}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        min="0"
                        max={maxScore}
                        step="0.5"
                        placeholder="-"
                        value={localGrade?.score || ''}
                        onChange={(e) => updateGrade(student.id, 'score', e.target.value)}
                        disabled={localGrade?.is_absent}
                        className="w-20 text-center"
                      />
                      <span className="text-sm text-muted-foreground">
                        /{maxScore}
                      </span>
                      <div className="flex items-center gap-1">
                        <Checkbox
                          checked={localGrade?.is_absent || false}
                          onCheckedChange={(checked) => updateGrade(student.id, 'is_absent', checked)}
                        />
                        <span className="text-xs text-muted-foreground">Absent</span>
                      </div>
                      {isFilled && (
                        <Check className="h-5 w-5 text-green-500" />
                      )}
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
