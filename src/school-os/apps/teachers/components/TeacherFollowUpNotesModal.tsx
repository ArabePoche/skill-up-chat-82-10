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
import { Loader2, Trash2 } from 'lucide-react';
import { useCreateTeacherNote, useUpdateTeacherNote, useTeacherNotes, useDeleteTeacherNote } from '../hooks/useTeacherNotes';
import { CreateTeacherNoteData, TeacherStudentNote } from '../types';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Types de notes prédéfinies
const NOTE_TYPES = [
  { value: 'behavior', label: 'Comportement' },
  { value: 'participation', label: 'Participation' },
  { value: 'progress', label: 'Progrès académique' },
  { value: 'homework', label: 'Travail personnel' },
  { value: 'attitude', label: 'Attitude en classe' },
  { value: 'other', label: 'Autre' },
];

// Options prédéfinies pour chaque type
const PREDEFINED_OPTIONS: Record<string, string[]> = {
  behavior: [
    'Excellent comportement, respectueux et attentif',
    'Bon comportement général',
    'Comportement satisfaisant avec quelques rappels nécessaires',
    'Comportement perturbateur, nécessite un suivi',
    'Comportement très problématique, entretien urgent requis',
  ],
  participation: [
    'Participation exemplaire et spontanée',
    'Bonne participation en classe',
    'Participation moyenne, peut faire mieux',
    'Participation faible, doit s\'impliquer davantage',
    'Ne participe pas, très passif en classe',
  ],
  progress: [
    'Excellents progrès, dépasse les attentes',
    'Bons progrès constants',
    'Progrès satisfaisants',
    'Progrès lents, nécessite plus de travail',
    'Aucun progrès visible, besoin d\'aide urgente',
  ],
  homework: [
    'Travail personnel exemplaire, toujours à jour',
    'Bon suivi du travail personnel',
    'Travail personnel irrégulier',
    'Travail personnel souvent non fait',
    'Ne fait jamais son travail personnel',
  ],
  attitude: [
    'Attitude positive et motivée',
    'Bonne attitude générale',
    'Attitude neutre',
    'Attitude négative, démotivé',
    'Attitude très problématique',
  ],
};

interface TeacherFollowUpNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  teacherId: string;
  schoolId: string;
}

export const TeacherFollowUpNotesModal: React.FC<TeacherFollowUpNotesModalProps> = ({
  isOpen,
  onClose,
  student,
  teacherId,
  schoolId,
}) => {
  const [noteType, setNoteType] = useState<string>('');
  const [rating, setRating] = useState<number>(0);
  const [useCustomComment, setUseCustomComment] = useState(false);
  const [comment, setComment] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [sentiment, setSentiment] = useState<'positive' | 'negative' | 'neutral' | ''>('');
  const [editingNote, setEditingNote] = useState<TeacherStudentNote | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  const { data: existingNotes, isLoading: notesLoading } = useTeacherNotes(student?.id, teacherId);
  const createNote = useCreateTeacherNote();
  const updateNote = useUpdateTeacherNote();
  const deleteNote = useDeleteTeacherNote();

  const resetForm = () => {
    setNoteType('');
    setRating(0);
    setUseCustomComment(false);
    setComment('');
    setCustomTitle('');
    setSentiment('');
    setEditingNote(null);
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!noteType || rating === 0 || !sentiment) {
      return;
    }

    if (noteType === 'other' && !customTitle.trim()) {
      return;
    }

    // Construire le commentaire final
    let finalComment = comment;
    if (!useCustomComment && noteType !== 'other' && rating > 0) {
      finalComment = PREDEFINED_OPTIONS[noteType]?.[rating - 1] || comment;
    }

    const noteData: CreateTeacherNoteData = {
      school_id: schoolId,
      teacher_id: teacherId,
      student_id: student.id,
      class_id: student.class_id,
      subject_id: null,
      behavior: noteType === 'behavior' ? finalComment : undefined,
      progress: noteType === 'progress' ? finalComment : undefined,
      academic_level: noteType === 'progress' ? `Note: ${rating}/5` : undefined,
      difficulties: noteType === 'homework' || noteType === 'participation' ? finalComment : undefined,
      recommendations: noteType === 'attitude' || noteType === 'other' ? finalComment : undefined,
      custom_title: noteType === 'other' ? customTitle : undefined,
      sentiment: sentiment,
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
    
    // Déterminer le type de note basé sur les champs remplis
    if (note.behavior) {
      setNoteType('behavior');
      setComment(note.behavior);
    } else if (note.progress) {
      setNoteType('progress');
      setComment(note.progress);
    } else if (note.difficulties) {
      setNoteType(note.difficulties.includes('participation') ? 'participation' : 'homework');
      setComment(note.difficulties);
    } else if (note.recommendations) {
      setNoteType('other');
      setComment(note.recommendations);
      setCustomTitle((note as any).custom_title || '');
    }
    
    setSentiment((note as any).sentiment || 'neutral');
    setRating(3);
    setUseCustomComment(true);
  };

  const handleDeleteNote = async (noteId: string) => {
    await deleteNote.mutateAsync(noteId);
    setNoteToDelete(null);
  };

  const isLoading = createNote.isPending || updateNote.isPending || deleteNote.isPending;

  // Obtenir le label du type de note
  const getNoteTypeLabel = (note: TeacherStudentNote) => {
    if (note.behavior) return 'Comportement';
    if (note.progress) return 'Progrès';
    if (note.difficulties?.includes('participation')) return 'Participation';
    if (note.difficulties) return 'Travail personnel';
    if (note.recommendations) return (note as any).custom_title || 'Autre';
    return 'Note';
  };

  // Obtenir la couleur du sentiment
  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20';
      case 'negative':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'neutral':
        return 'bg-muted text-muted-foreground border-border';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  // Obtenir l'emoji du sentiment
  const getSentimentEmoji = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return '🙂';
      case 'negative':
        return '😔';
      case 'neutral':
        return '😑';
      default:
        return '😑';
    }
  };

  // Obtenir le contenu de la note
  const getNoteContent = (note: TeacherStudentNote) => {
    return note.behavior || note.progress || note.difficulties || note.recommendations || '';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-2xl font-bold">
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
            <TabsTrigger value="new" className="text-xs sm:text-sm">
              {editingNote ? 'Modifier' : 'Nouvelle note'}
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs sm:text-sm">Historique</TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="space-y-3 sm:space-y-4 mt-4">
            <ScrollArea className="h-[calc(90vh-280px)] sm:h-auto pr-4">
              <div className="space-y-4">
                {/* Type de note */}
                <div className="space-y-2">
                  <Label htmlFor="noteType">Type de note *</Label>
                  <Select value={noteType} onValueChange={setNoteType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un type de note" />
                    </SelectTrigger>
                    <SelectContent>
                      {NOTE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Titre personnalisé pour "Autre" */}
                {noteType === 'other' && (
                  <div className="space-y-2">
                    <Label htmlFor="customTitle">Titre de la note *</Label>
                    <input
                      id="customTitle"
                      type="text"
                      placeholder="Ex: Retard, Tenue, Attitude envers les autres..."
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background"
                    />
                  </div>
                )}

                {/* Échelle de notation */}
                {noteType && (
                  <div className="space-y-2">
                    <Label>Échelle de notation *</Label>
                    <div className="flex gap-2 flex-wrap">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <Button
                          key={value}
                          type="button"
                          variant={rating === value ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setRating(value)}
                          className="flex-1 min-w-[60px]"
                        >
                          {value}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      1 = Très insatisfaisant | 5 = Excellent
                    </p>
                  </div>
                )}

                {/* État émotionnel */}
                {noteType && rating > 0 && (
                  <div className="space-y-2">
                    <Label>État de l'élève *</Label>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        type="button"
                        variant={sentiment === 'positive' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSentiment('positive')}
                        className="flex-1 min-w-[100px]"
                      >
                        🙂 Positif
                      </Button>
                      <Button
                        type="button"
                        variant={sentiment === 'neutral' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSentiment('neutral')}
                        className="flex-1 min-w-[100px]"
                      >
                        😑 Neutre
                      </Button>
                      <Button
                        type="button"
                        variant={sentiment === 'negative' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSentiment('negative')}
                        className="flex-1 min-w-[100px]"
                      >
                        😔 Négatif
                      </Button>
                    </div>
                  </div>
                )}

                {/* Options prédéfinies ou personnalisées */}
                {noteType && rating > 0 && sentiment && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Commentaire</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setUseCustomComment(!useCustomComment)}
                      >
                        {useCustomComment ? 'Utiliser suggestion' : 'Personnaliser'}
                      </Button>
                    </div>

                    {useCustomComment || noteType === 'other' ? (
                      <Textarea
                        placeholder="Saisir un commentaire personnalisé..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="min-h-[100px] resize-none text-sm"
                      />
                    ) : (
                      <div className="p-3 rounded-md border bg-muted/50">
                        <p className="text-sm">
                          {PREDEFINED_OPTIONS[noteType]?.[rating - 1] || 'Pas de suggestion disponible'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
              {editingNote && (
                <Button 
                  variant="outline" 
                  onClick={resetForm}
                  className="w-full sm:w-auto"
                  size="sm"
                >
                  Annuler
                </Button>
              )}
              <Button 
                onClick={onClose} 
                variant="outline"
                className="w-full sm:w-auto"
                size="sm"
              >
                Fermer
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!noteType || rating === 0 || !sentiment || (noteType === 'other' && !customTitle.trim()) || isLoading}
                className="w-full sm:w-auto"
                size="sm"
              >
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
                <div className="space-y-3">
                  {existingNotes.map((note: any) => (
                    <div
                      key={note.id}
                      className="p-4 border rounded-lg space-y-2 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">{getNoteTypeLabel(note)}</Badge>
                          <Badge className={getSentimentColor(note.sentiment)}>
                            {getSentimentEmoji(note.sentiment)} {note.sentiment === 'positive' ? 'Positif' : note.sentiment === 'negative' ? 'Négatif' : 'Neutre'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(note.created_at), 'dd MMM yyyy', { locale: fr })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => loadNoteForEdit(note)}
                          >
                            Modifier
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setNoteToDelete(note.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      <p className="text-sm">{getNoteContent(note)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-muted-foreground">
                    Aucune note de suivi pour cet élève
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Dialog de confirmation de suppression */}
        <AlertDialog open={!!noteToDelete} onOpenChange={() => setNoteToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer cette note de suivi ? Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => noteToDelete && handleDeleteNote(noteToDelete)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};
