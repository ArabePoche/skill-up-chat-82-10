/**
 * Section Notes de Classe pour le bulletin
 * Affiche les options de configuration des notes de classe:
 * - Depuis une évaluation existante
 * - Saisie manuelle directe dans le tableau du bulletin
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Info, FileText, Edit3 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Evaluation {
  id: string;
  title: string;
  evaluation_type_name: string;
  evaluation_date: string;
}

export interface ClassNotesConfig {
  method: 'evaluation' | 'manual';
  selectedEvaluationId?: string;
}

interface ClassNotesSectionProps {
  evaluations: Evaluation[];
  config: ClassNotesConfig;
  onConfigChange: (config: ClassNotesConfig) => void;
  isLoading?: boolean;
}

export const ClassNotesSection: React.FC<ClassNotesSectionProps> = ({
  evaluations,
  config,
  onConfigChange,
  isLoading = false,
}) => {
  const handleMethodChange = (method: 'evaluation' | 'manual') => {
    onConfigChange({
      ...config,
      method,
      selectedEvaluationId: method === 'manual' ? undefined : config.selectedEvaluationId,
    });
  };

  const handleEvaluationSelect = (evaluationId: string) => {
    onConfigChange({
      ...config,
      selectedEvaluationId: evaluationId,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Edit3 className="w-4 h-4" />
          Configuration des Notes de Classe
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Les notes de classe sont optionnelles et s'affichent à côté des notes de composition.
                  Vous pouvez les récupérer depuis une évaluation existante ou les saisir manuellement.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Méthode de saisie */}
        <RadioGroup
          value={config.method}
          onValueChange={(v) => handleMethodChange(v as 'evaluation' | 'manual')}
          className="flex flex-col gap-3"
        >
          <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
            <RadioGroupItem value="evaluation" id="method-evaluation" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="method-evaluation" className="cursor-pointer font-medium flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Depuis une évaluation existante
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Récupère automatiquement les notes depuis une évaluation (ex: "Notes de classe 1er trimestre")
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
            <RadioGroupItem value="manual" id="method-manual" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="method-manual" className="cursor-pointer font-medium flex items-center gap-2">
                <Edit3 className="w-4 h-4" />
                Saisie manuelle dans le tableau
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Les notes de classe seront saisies directement dans la colonne "Note de classe" du bulletin
              </p>
            </div>
          </div>
        </RadioGroup>

        {/* Sélection d'évaluation */}
        {config.method === 'evaluation' && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Évaluation source</Label>
            <Select
              value={config.selectedEvaluationId || ''}
              onValueChange={handleEvaluationSelect}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une évaluation" />
              </SelectTrigger>
              <SelectContent>
                {evaluations.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Aucune évaluation disponible.
                    <br />
                    Créez d'abord une évaluation dans le module Évaluations.
                  </div>
                ) : (
                  evaluations.map((evaluation) => (
                    <SelectItem key={evaluation.id} value={evaluation.id}>
                      <div className="flex items-center gap-2">
                        {evaluation.title}
                        <Badge variant="secondary" className="ml-2">
                          {evaluation.evaluation_type_name}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        {config.method === 'manual' && (
          <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
            Les notes de classe seront affichées dans une colonne éditable du tableau des bulletins.
            Vous pourrez saisir les notes directement pour chaque élève et chaque matière.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
