/**
 * Composant de saisie des notes pour les compositions/examens
 * Utilise les vraies données de school_compositions
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BookOpen, FileCheck, Calendar, ChevronRight } from 'lucide-react';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import { useCompositionsForClass } from '../hooks/useBulletinFromComposition';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CompositionGradeEntryView } from './CompositionGradeEntryView';

interface CompositionsGradeEntryProps {
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

interface SelectedComposition {
  id: string;
  title: string;
  type: string;
  include_class_notes: boolean;
}

export const CompositionsGradeEntry: React.FC<CompositionsGradeEntryProps> = ({
  availableClasses,
  isTeacher
}) => {
  const { school, activeSchoolYear } = useSchoolYear();
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedComposition, setSelectedComposition] = useState<SelectedComposition | null>(null);

  const selectedClass = availableClasses.find(c => c.id === selectedClassId);

  // Récupérer les compositions pour la classe sélectionnée
  const { data: compositions, isLoading } = useCompositionsForClass(
    school?.id,
    activeSchoolYear?.id,
    selectedClassId
  );

  // Vue de saisie des notes pour une composition
  if (selectedComposition && selectedClass) {
    return (
      <CompositionGradeEntryView
        composition={selectedComposition}
        classId={selectedClassId}
        className={selectedClass.name}
        onBack={() => setSelectedComposition(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Filtre par classe */}
      <div className="mb-3 flex-shrink-0">
        <label className="text-sm font-medium mb-2 block">Classe</label>
        <Select 
          value={selectedClassId} 
          onValueChange={(value) => {
            setSelectedClassId(value);
            setSelectedComposition(null);
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

      {/* Contenu */}
      {!selectedClassId ? (
        <Card className="flex-1 flex items-center justify-center">
          <div className="text-center py-12">
            <FileCheck className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sélectionnez une classe</h3>
            <p className="text-muted-foreground">
              Choisissez une classe pour voir ses compositions et saisir les notes
            </p>
          </div>
        </Card>
      ) : isLoading ? (
        <Card className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Chargement...</p>
        </Card>
      ) : !compositions?.length ? (
        <Card className="flex-1 flex items-center justify-center">
          <div className="text-center py-12">
            <FileCheck className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune composition</h3>
            <p className="text-muted-foreground">
              Aucune composition ou examen n'a été créé pour cette classe.
              <br />
              Créez-en dans l'application Compositions.
            </p>
          </div>
        </Card>
      ) : (
        <Card className="flex-1 overflow-hidden flex flex-col min-h-0">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="w-5 h-5" />
              {selectedClass?.name}
              <Badge variant="outline" className="ml-2">
                {compositions.length} composition{compositions.length !== 1 ? 's' : ''}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-auto flex-1 min-h-0">
            <div className="space-y-3">
              {compositions.map((comp) => (
                <div
                  key={comp.id}
                  onClick={() => setSelectedComposition({
                    id: comp.id,
                    title: comp.title,
                    type: comp.type,
                    include_class_notes: comp.include_class_notes,
                  })}
                  className="p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{comp.title}</h4>
                        <Badge variant={comp.type === 'examen' ? 'destructive' : 'default'}>
                          {comp.type}
                        </Badge>
                        {comp.include_class_notes && (
                          <Badge variant="secondary">Notes de classe</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {comp.start_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(comp.start_date), 'dd MMMM yyyy', { locale: fr })}
                            {comp.end_date && comp.end_date !== comp.start_date && (
                              <> - {format(new Date(comp.end_date), 'dd MMMM yyyy', { locale: fr })}</>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
