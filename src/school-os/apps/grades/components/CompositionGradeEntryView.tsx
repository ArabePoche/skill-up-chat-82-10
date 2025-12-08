/**
 * Vue de saisie des notes pour une composition
 * Utilise school_composition_notes (composition_note et class_note)
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  Save, 
  Users, 
  Check,
  BookOpen
} from 'lucide-react';
import { useCompositionGrades, useSaveCompositionNotes, CompositionNoteInput } from '../hooks/useCompositionGrades';
import { toast } from 'sonner';

interface CompositionInfo {
  id: string;
  title: string;
  type: string;
  include_class_notes: boolean;
}

interface CompositionGradeEntryViewProps {
  composition: CompositionInfo;
  classId: string;
  className: string;
  onBack: () => void;
}

interface LocalNote {
  student_id: string;
  subject_id: string;
  composition_note: string;
  class_note: string;
  comment: string;
}

const getNoteKey = (studentId: string, subjectId: string) => `${studentId}_${subjectId}`;

export const CompositionGradeEntryView: React.FC<CompositionGradeEntryViewProps> = ({
  composition,
  classId,
  className,
  onBack,
}) => {
  const { data: gradesData, isLoading } = useCompositionGrades(composition.id, classId);
  const saveMutation = useSaveCompositionNotes();
  
  const [localNotes, setLocalNotes] = useState<Map<string, LocalNote>>(new Map());
  const [hasChanges, setHasChanges] = useState(false);

  const students = gradesData?.students || [];
  const subjects = gradesData?.subjects || [];
  const notesMap = gradesData?.notes || new Map();
  const includeClassNotes = gradesData?.includeClassNotes ?? false;

  // Initialiser les notes locales
  useEffect(() => {
    if (gradesData) {
      const map = new Map<string, LocalNote>();
      
      students.forEach(student => {
        const studentNotes = notesMap.get(student.id);
        
        subjects.forEach(subject => {
          const key = getNoteKey(student.id, subject.id);
          const existingNote = studentNotes?.get(subject.id);
          
          map.set(key, {
            student_id: student.id,
            subject_id: subject.id,
            composition_note: existingNote?.composition_note != null ? String(existingNote.composition_note) : '',
            class_note: existingNote?.class_note != null ? String(existingNote.class_note) : '',
            comment: existingNote?.comment || '',
          });
        });
      });
      
      setLocalNotes(map);
      setHasChanges(false);
    }
  }, [gradesData, students, subjects, notesMap]);

  const updateNote = (studentId: string, subjectId: string, field: keyof LocalNote, value: string) => {
    const key = getNoteKey(studentId, subjectId);
    
    setLocalNotes(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(key) || {
        student_id: studentId,
        subject_id: subjectId,
        composition_note: '',
        class_note: '',
        comment: '',
      };
      
      newMap.set(key, { ...existing, [field]: value });
      return newMap;
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    const notesToSave: CompositionNoteInput[] = [];

    localNotes.forEach((localNote) => {
      const compNote = localNote.composition_note === '' ? null : parseFloat(localNote.composition_note);
      const classNote = localNote.class_note === '' ? null : parseFloat(localNote.class_note);
      
      // Validation
      if (compNote !== null && (isNaN(compNote) || compNote < 0 || compNote > 20)) {
        toast.error('Note de composition invalide (0-20)');
        return;
      }
      if (classNote !== null && (isNaN(classNote) || classNote < 0 || classNote > 20)) {
        toast.error('Note de classe invalide (0-20)');
        return;
      }

      notesToSave.push({
        composition_id: composition.id,
        class_id: classId,
        subject_id: localNote.subject_id,
        student_id: localNote.student_id,
        composition_note: compNote,
        class_note: classNote,
        comment: localNote.comment || undefined,
      });
    });

    await saveMutation.mutateAsync(notesToSave);
    setHasChanges(false);
  };

  // Statistiques
  const stats = useMemo(() => {
    if (!students.length || !subjects.length) return null;
    
    const allScores: number[] = [];
    let enteredCount = 0;
    const totalExpected = students.length * subjects.length;
    
    localNotes.forEach(n => {
      if (n.composition_note !== '') {
        enteredCount++;
        const score = parseFloat(n.composition_note);
        if (!isNaN(score)) allScores.push(score);
      }
    });

    return {
      total: students.length,
      subjects: subjects.length,
      totalNotes: totalExpected,
      entered: enteredCount,
      average: allScores.length > 0 
        ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2)
        : '-',
      max: allScores.length > 0 ? Math.max(...allScores) : '-',
      min: allScores.length > 0 ? Math.min(...allScores) : '-',
    };
  }, [students, subjects, localNotes]);

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
            <h3 className="font-semibold text-base sm:text-lg truncate">{composition.title}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {className} • {subjects.length} matière{subjects.length !== 1 ? 's' : ''} • /20
              {includeClassNotes && ' • Notes de classe incluses'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
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
            <p className="text-xs text-muted-foreground">Matières</p>
            <p className="text-base sm:text-lg font-bold text-blue-500">{stats.subjects}</p>
          </Card>
          <Card className="p-2 sm:p-3 text-center">
            <p className="text-xs text-muted-foreground">Saisis</p>
            <p className="text-base sm:text-lg font-bold text-primary">{stats.entered}/{stats.totalNotes}</p>
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
              <Badge variant="secondary" className="ml-2">
                <BookOpen className="h-3 w-3 mr-1" />
                Notes par matière
              </Badge>
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
                const allGradesFilled = subjects.every(s => {
                  const key = getNoteKey(student.id, s.id);
                  const ln = localNotes.get(key);
                  return ln?.composition_note !== '';
                });
                
                return (
                  <div 
                    key={student.id}
                    className="p-3 hover:bg-muted/50"
                  >
                    {/* En-tête élève */}
                    <div className="flex items-center gap-3 mb-3">
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
                      {allGradesFilled && (
                        <Check className="h-5 w-5 text-green-500" />
                      )}
                    </div>

                    {/* Notes par matière */}
                    <div className="ml-11 grid gap-2">
                      {subjects.map(subject => {
                        const key = getNoteKey(student.id, subject.id);
                        const localNote = localNotes.get(key);
                        
                        return (
                          <div key={subject.id} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
                            <span className="text-sm font-medium min-w-[120px] truncate">
                              {subject.name}
                            </span>
                            
                            {/* Note de composition */}
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min="0"
                                max="20"
                                step="0.5"
                                placeholder="-"
                                value={localNote?.composition_note || ''}
                                onChange={(e) => updateNote(student.id, subject.id, 'composition_note', e.target.value)}
                                className="w-16 text-center"
                              />
                              <span className="text-xs text-muted-foreground">/20</span>
                            </div>

                            {/* Note de classe (optionnelle) */}
                            {includeClassNotes && (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground">Classe:</span>
                                <Input
                                  type="number"
                                  min="0"
                                  max="20"
                                  step="0.5"
                                  placeholder="-"
                                  value={localNote?.class_note || ''}
                                  onChange={(e) => updateNote(student.id, subject.id, 'class_note', e.target.value)}
                                  className="w-16 text-center"
                                />
                              </div>
                            )}

                            {localNote?.composition_note && (
                              <Check className="h-4 w-4 text-green-500 ml-auto" />
                            )}
                          </div>
                        );
                      })}
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
