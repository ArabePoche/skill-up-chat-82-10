/**
 * Section Évaluations - Gestion des évaluations de la classe
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Plus, ClipboardList, Calendar, Users } from 'lucide-react';
import { useClassEvaluations } from '../hooks/useClassEvaluations';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface EvaluationsSectionProps {
  availableClasses: Array<{
    id: string;
    name: string;
    cycle: string;
    current_students: number;
    max_students: number;
    subjects: Array<{ id: string; name: string }>;
  }>;
  isTeacher: boolean;
  isOwner: boolean;
}

export const EvaluationsSection: React.FC<EvaluationsSectionProps> = ({ 
  availableClasses, 
  isTeacher,
  isOwner 
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const { data: classEvaluations, isLoading } = useClassEvaluations(selectedClassId);
  const selectedClass = availableClasses.find(c => c.id === selectedClassId);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Gestion des Évaluations</h3>
          <p className="text-sm text-muted-foreground">
            Créez et gérez les évaluations par classe
          </p>
        </div>
        {(isOwner || isTeacher) && selectedClassId && (
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle évaluation
          </Button>
        )}
      </div>

      {/* Sélecteur de classe */}
      <div className="mb-4">
        <label className="text-sm font-medium mb-2 block">Classe</label>
        <Select value={selectedClassId} onValueChange={setSelectedClassId}>
          <SelectTrigger className="w-full sm:w-64">
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
            <ClipboardList className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sélectionnez une classe</h3>
            <p className="text-muted-foreground">
              Choisissez une classe pour voir et gérer ses évaluations
            </p>
          </div>
        </Card>
      ) : isLoading ? (
        <Card className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Chargement des évaluations...</p>
        </Card>
      ) : !classEvaluations || classEvaluations.length === 0 ? (
        <Card className="flex-1 flex items-center justify-center">
          <div className="text-center py-12">
            <ClipboardList className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune évaluation</h3>
            <p className="text-muted-foreground mb-4">
              Cette classe n'a pas encore d'évaluations
            </p>
            {(isOwner || isTeacher) && (
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Créer la première évaluation
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card className="flex-1 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5" />
                Évaluations de {selectedClass?.name}
              </span>
              <Badge variant="secondary">
                {classEvaluations.length} évaluation{classEvaluations.length !== 1 ? 's' : ''}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-auto">
            <div className="space-y-3">
              {classEvaluations.map((evaluation) => (
                <div 
                  key={evaluation.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{evaluation.name}</h4>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline">
                          {evaluation.subject.name}
                        </Badge>
                        <Badge variant="secondary">
                          /{evaluation.max_score} pts
                        </Badge>
                        {evaluation.evaluation_type && (
                          <Badge variant="outline">
                            {evaluation.evaluation_type.name}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(evaluation.evaluation_date), 'dd MMM yyyy', { locale: fr })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {evaluation.subjects.length} matière{evaluation.subjects.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Modifier
                      </Button>
                    </div>
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
