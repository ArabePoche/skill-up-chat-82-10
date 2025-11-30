/**
 * Section des questionnaires par matière
 */
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Trash2, Upload } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { QuestionnaireData } from '../hooks/useEvaluations';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface QuestionnaireSectionProps {
  subjects: string[];
  questionnaires: QuestionnaireData[];
  onQuestionnairesChange: (questionnaires: QuestionnaireData[]) => void;
}

export const QuestionnaireSection: React.FC<QuestionnaireSectionProps> = ({
  subjects,
  questionnaires,
  onQuestionnairesChange,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  // Récupérer les infos des matières
  const { data: subjectsData = [] } = useQuery({
    queryKey: ['class-subjects-data', subjects],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_subjects')
        .select('id, subjects(name)')
        .in('id', subjects);

      if (error) throw error;
      return data || [];
    },
    enabled: subjects.length > 0,
  });

  const updateQuestionnaire = (subjectId: string, updates: Partial<QuestionnaireData>) => {
    const existing = questionnaires.find((q) => q.subject_id === subjectId);
    if (existing) {
      onQuestionnairesChange(
        questionnaires.map((q) =>
          q.subject_id === subjectId ? { ...q, ...updates } : q
        )
      );
    } else {
      onQuestionnairesChange([
        ...questionnaires,
        { subject_id: subjectId, total_points: 20, ...updates } as QuestionnaireData,
      ]);
    }
  };

  const removeQuestionnaire = (subjectId: string) => {
    onQuestionnairesChange(questionnaires.filter((q) => q.subject_id !== subjectId));
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-foreground">Sujets / Questionnaires (optionnel)</h4>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            {isOpen ? 'Masquer' : 'Afficher'}
          </Button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent>
        <div className="space-y-4">
          {subjectsData.map((subject: any) => {
            const questionnaire = questionnaires.find((q) => q.subject_id === subject.id);
            return (
              <div
                key={subject.id}
                className="border border-border rounded-lg p-4 bg-muted/30 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h5 className="font-medium">{subject.subjects?.name}</h5>
                  {questionnaire && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeQuestionnaire(subject.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Titre du sujet (optionnel)</Label>
                    <Input
                      placeholder="Ex: Chapitre 3 - Les équations"
                      value={questionnaire?.title || ''}
                      onChange={(e) => updateQuestionnaire(subject.id, { title: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Instructions (optionnel)</Label>
                    <Textarea
                      placeholder="Consignes pour les élèves..."
                      value={questionnaire?.instructions || ''}
                      onChange={(e) =>
                        updateQuestionnaire(subject.id, { instructions: e.target.value })
                      }
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Points total *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="20"
                      value={questionnaire?.total_points || ''}
                      onChange={(e) =>
                        updateQuestionnaire(subject.id, {
                          total_points: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Fichier sujet (optionnel)</Label>
                    <Button type="button" variant="outline" size="sm" className="w-full">
                      <Upload className="h-4 w-4 mr-2" />
                      Télécharger un fichier
                    </Button>
                    {questionnaire?.file_url && (
                      <p className="text-xs text-muted-foreground">Fichier uploadé</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
