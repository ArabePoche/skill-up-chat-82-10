// Composant pour sélectionner des élèves lors de l'approbation d'un parent
import React, { useState, useMemo } from 'react';
import { Search, UserPlus, Users, Key, Check, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSearchStudents, useCreateParentConfirmation } from '../hooks/useParentJoinConfirmation';

interface StudentResult {
  id: string;
  first_name: string;
  last_name: string;
  family_id: string | null;
  class_id: string | null;
  classes: { name: string } | null;
  school_student_families: { id: string; family_name: string; parental_code: string | null } | null;
}

interface ParentApprovalStudentSelectorProps {
  schoolId: string;
  joinRequestId: string;
  parentUserId: string;
  onComplete: () => void;
  onCancel: () => void;
}

const ParentApprovalStudentSelector: React.FC<ParentApprovalStudentSelectorProps> = ({
  schoolId, joinRequestId, parentUserId, onComplete, onCancel,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<StudentResult[]>([]);
  const { data: searchResults = [], isLoading: searching } = useSearchStudents(schoolId, searchTerm);
  const createConfirmation = useCreateParentConfirmation();

  // Détecter automatiquement la famille et le code parental à partir des élèves sélectionnés
  const detectedFamily = useMemo(() => {
    if (selectedStudents.length === 0) return null;
    const first = selectedStudents[0];
    return first.school_student_families;
  }, [selectedStudents]);

  const toggleStudent = (student: StudentResult) => {
    const exists = selectedStudents.find(s => s.id === student.id);
    if (exists) {
      setSelectedStudents(prev => prev.filter(s => s.id !== student.id));
    } else {
      // Si on ajoute un élève d'une autre famille, vider la sélection
      if (selectedStudents.length > 0 && student.family_id !== selectedStudents[0].family_id) {
        setSelectedStudents([student]);
      } else {
        setSelectedStudents(prev => [...prev, student]);
      }
    }
  };

  const handleSubmit = async () => {
    if (!detectedFamily || !detectedFamily.parental_code) {
      return;
    }
    await createConfirmation.mutateAsync({
      joinRequestId,
      schoolId,
      parentUserId,
      familyId: detectedFamily.id,
      parentalCode: detectedFamily.parental_code,
      studentIds: selectedStudents.map(s => s.id),
    });
    onComplete();
  };

  const isSelected = (id: string) => selectedStudents.some(s => s.id === id);

  return (
    <div className="space-y-4">
      <div>
        <Label className="flex items-center gap-2 mb-2">
          <Search className="w-4 h-4" />
          Rechercher un élève par nom
        </Label>
        <Input
          placeholder="Tapez le nom de l'élève..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autoFocus
        />
      </div>

      {/* Résultats de recherche */}
      {searchTerm.length >= 2 && (
        <ScrollArea className="max-h-48">
          {searching ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : searchResults.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun élève trouvé
            </p>
          ) : (
            <div className="space-y-1">
              {(searchResults as StudentResult[]).map((student) => (
                <button
                  key={student.id}
                  onClick={() => toggleStudent(student)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                    isSelected(student.id) 
                      ? 'bg-primary/10 border border-primary/30' 
                      : 'hover:bg-muted border border-transparent'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {student.first_name} {student.last_name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {student.classes && <span>{student.classes.name}</span>}
                      {student.school_student_families && (
                        <Badge variant="outline" className="text-xs">
                          {student.school_student_families.family_name}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {isSelected(student.id) && (
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      )}

      {/* Élèves sélectionnés */}
      {selectedStudents.length > 0 && (
        <div className="rounded-lg bg-muted/50 p-3 space-y-2">
          <Label className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4" />
            Élèves sélectionnés ({selectedStudents.length})
          </Label>
          <div className="flex flex-wrap gap-1">
            {selectedStudents.map(s => (
              <Badge key={s.id} variant="secondary" className="gap-1">
                {s.first_name} {s.last_name}
                <button onClick={() => toggleStudent(s)} className="ml-1 hover:text-destructive">×</button>
              </Badge>
            ))}
          </div>

          {/* Code parental détecté */}
          {detectedFamily && (
            <div className="mt-2 p-2 rounded bg-background border">
              <div className="flex items-center gap-2 text-sm">
                <Key className="w-4 h-4 text-primary" />
                <span className="font-medium">Code parental détecté :</span>
                {detectedFamily.parental_code ? (
                  <Badge variant="outline" className="font-mono">{detectedFamily.parental_code}</Badge>
                ) : (
                  <span className="text-destructive text-xs">Aucun code parental pour cette famille</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Famille : {detectedFamily.family_name}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={
            selectedStudents.length === 0 || 
            !detectedFamily?.parental_code || 
            createConfirmation.isPending
          }
          className="gap-2"
        >
          {createConfirmation.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Envoi...</>
          ) : (
            <><UserPlus className="w-4 h-4" /> Envoyer la confirmation au parent</>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ParentApprovalStudentSelector;
