// Modal pour gérer les notes de suivi des enseignants
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Users, TrendingUp, AlertCircle, Lightbulb, Loader2 } from 'lucide-react';
import { useCreateTeacherNote, useUpdateTeacherNote, useTeacherNotes } from '../hooks/useTeacherNotes';
import { CreateTeacherNoteData, TeacherStudentNote } from '../types';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TeacherFollowUpNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  teacherId: string;
  schoolId: string;
  subjects: any[];
}

export const TeacherFollowUpNotesModal: React.FC<TeacherFollowUpNotesModalProps> = ({
  isOpen,
  onClose,
  student,
  teacherId,
  schoolId,
  subjects,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [academicLevel, setAcademicLevel] = useState('');
  const [behavior, setBehavior] = useState('');
  const [progress, setProgress] = useState('');
  const [difficulties, setDifficulties] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [editingNote, setEditingNote] = useState<TeacherStudentNote | null>(null);

  const { data: existingNotes, isLoading: notesLoading } = useTeacherNotes(student?.id, teacherId);
  const createNote = useCreateTeacherNote();
  const updateNote = useUpdateTeacherNote();

  const resetForm = () => {
    setSelectedSubjectId('');
    setAcademicLevel('');
    setBehavior('');
    setProgress('');
    setDifficulties('');
    setRecommendations('');
    setEditingNote(null);
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!selectedSubjectId) {
      return;
    }

    const noteData: CreateTeacherNoteData = {
      school_id: schoolId,
      teacher_id: teacherId,
      student_id: student.id,
      class_id: student.class_id,
      subject_id: selectedSubjectId,
      academic_level: academicLevel || undefined,
      behavior: behavior || undefined,
      progress: progress || undefined,
      difficulties: difficulties || undefined,
      recommendations: recommendations || undefined,
    };

    if (editingNote) {
      await updateNote.mutateAsync({ id: editingNote.id, ...noteData });
    } else {
      await createNote.mutateAsync(noteData);
    }

    resetForm();
  };

  const loadNoteForEdit = (note: TeacherStudentNote) => {
    setEditingNote(note);
    setSelectedSubjectId(note.subject_id);
    setAcademicLevel(note.academic_level || '');
    setBehavior(note.behavior || '');
    setProgress(note.progress || '');
    setDifficulties(note.difficulties || '');
    setRecommendations(note.recommendations || '');
  };

  const isLoading = createNote.isPending || updateNote.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Notes de suivi - {student?.first_name} {student?.last_name}
          </DialogTitle>
          <DialogDescription>
            {student?.classes?.name && (
              <span className="text-sm text-muted-foreground">
                Classe : {student.classes.name}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="new" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new">
              {editingNote ? 'Modifier la note' : 'Nouvelle note'}
            </TabsTrigger>
            <TabsTrigger value="history">Historique</TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Matière *</Label>
                <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une matière" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <Label htmlFor="academic">Niveau académique</Label>
                  </div>
                  <Textarea
                    id="academic"
                    placeholder="Évaluation du niveau académique de l'élève dans cette matière..."
                    value={academicLevel}
                    onChange={(e) => setAcademicLevel(e.target.value)}
                    className="min-h-[80px] resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <Label htmlFor="behavior">Comportement</Label>
                  </div>
                  <Textarea
                    id="behavior"
                    placeholder="Observations sur le comportement en classe..."
                    value={behavior}
                    onChange={(e) => setBehavior(e.target.value)}
                    className="min-h-[80px] resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <Label htmlFor="progress">Progrès</Label>
                  </div>
                  <Textarea
                    id="progress"
                    placeholder="Évolution et progrès constatés..."
                    value={progress}
                    onChange={(e) => setProgress(e.target.value)}
                    className="min-h-[80px] resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <Label htmlFor="difficulties">Difficultés</Label>
                  </div>
                  <Textarea
                    id="difficulties"
                    placeholder="Difficultés rencontrées par l'élève..."
                    value={difficulties}
                    onChange={(e) => setDifficulties(e.target.value)}
                    className="min-h-[80px] resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    <Label htmlFor="recommendations">Recommandations</Label>
                  </div>
                  <Textarea
                    id="recommendations"
                    placeholder="Recommandations et pistes d'amélioration..."
                    value={recommendations}
                    onChange={(e) => setRecommendations(e.target.value)}
                    className="min-h-[80px] resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              {editingNote && (
                <Button variant="outline" onClick={resetForm}>
                  Annuler la modification
                </Button>
              )}
              <Button onClick={onClose} variant="outline">
                Fermer
              </Button>
              <Button onClick={handleSubmit} disabled={!selectedSubjectId || isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingNote ? 'Mettre à jour' : 'Enregistrer'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <ScrollArea className="h-[500px] pr-4">
              {notesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : existingNotes && existingNotes.length > 0 ? (
                <div className="space-y-4">
                  {existingNotes.map((note: any) => (
                    <div
                      key={note.id}
                      className="p-4 border rounded-lg space-y-3 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{note.subjects?.name}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(note.created_at), 'dd MMMM yyyy', { locale: fr })}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => loadNoteForEdit(note)}
                        >
                          Modifier
                        </Button>
                      </div>

                      {note.academic_level && (
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <BookOpen className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground">
                              Niveau académique
                            </span>
                          </div>
                          <p className="text-sm pl-5">{note.academic_level}</p>
                        </div>
                      )}

                      {note.behavior && (
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground">
                              Comportement
                            </span>
                          </div>
                          <p className="text-sm pl-5">{note.behavior}</p>
                        </div>
                      )}

                      {note.progress && (
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground">
                              Progrès
                            </span>
                          </div>
                          <p className="text-sm pl-5">{note.progress}</p>
                        </div>
                      )}

                      {note.difficulties && (
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <AlertCircle className="h-3 w-3 text-destructive" />
                            <span className="text-xs font-medium text-muted-foreground">
                              Difficultés
                            </span>
                          </div>
                          <p className="text-sm pl-5">{note.difficulties}</p>
                        </div>
                      )}

                      {note.recommendations && (
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Lightbulb className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground">
                              Recommandations
                            </span>
                          </div>
                          <p className="text-sm pl-5">{note.recommendations}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Aucune note de suivi pour cet élève
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
