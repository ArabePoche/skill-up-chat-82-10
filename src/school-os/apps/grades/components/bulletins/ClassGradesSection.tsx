/**
 * Section Notes de Classe - Option facultative pour intégrer des notes de classe au bulletin
 * Deux méthodes: sélection d'une évaluation existante ou saisie manuelle
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, FileText, Edit3, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface ClassGradeEntry {
  subjectId: string;
  subjectName: string;
  score: number | null;
}

export interface ClassGradesConfig {
  enabled: boolean;
  method: 'evaluation' | 'manual';
  selectedEvaluationId?: string;
  manualGrades: ClassGradeEntry[];
}

interface Evaluation {
  id: string;
  title: string;
  evaluation_type_name: string;
  evaluation_date: string;
}

interface Subject {
  id: string;
  name: string;
  coefficient: number;
}

interface ClassGradesSectionProps {
  evaluations: Evaluation[];
  subjects: Subject[];
  config: ClassGradesConfig;
  onConfigChange: (config: ClassGradesConfig) => void;
  loadingEvaluations?: boolean;
}

export const ClassGradesSection: React.FC<ClassGradesSectionProps> = ({
  evaluations,
  subjects,
  config,
  onConfigChange,
  loadingEvaluations = false,
}) => {
  // Initialize manual grades when subjects change
  useEffect(() => {
    if (subjects.length > 0 && config.manualGrades.length === 0) {
      onConfigChange({
        ...config,
        manualGrades: subjects.map(s => ({
          subjectId: s.id,
          subjectName: s.name,
          score: null,
        })),
      });
    }
  }, [subjects]);

  const handleEnabledChange = (checked: boolean) => {
    onConfigChange({
      ...config,
      enabled: checked,
    });
  };

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

  const handleManualGradeChange = (subjectId: string, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    const updatedGrades = config.manualGrades.map(g => 
      g.subjectId === subjectId 
        ? { ...g, score: numValue !== null && !isNaN(numValue) ? Math.min(20, Math.max(0, numValue)) : null }
        : g
    );
    onConfigChange({
      ...config,
      manualGrades: updatedGrades,
    });
  };

  // Filter evaluations that could be class grades evaluations (same subjects)
  const compatibleEvaluations = useMemo(() => {
    // For now, show all evaluations - in a full implementation, 
    // we could filter by those containing the same subjects
    return evaluations;
  }, [evaluations]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="w-4 h-4" />
            Notes de Classe
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Option facultative. Les notes de classe sont généralement utilisées à partir du collège/second cycle.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Checkbox
              id="enable-class-grades"
              checked={config.enabled}
              onCheckedChange={handleEnabledChange}
            />
            <Label 
              htmlFor="enable-class-grades" 
              className="text-sm cursor-pointer"
            >
              Inclure les notes de classe
            </Label>
          </div>
        </div>
      </CardHeader>

      {config.enabled && (
        <CardContent className="pt-0 space-y-4">
          {/* Méthode de saisie */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Méthode de saisie</Label>
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
                    Sélectionner une évaluation existante
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Utiliser les notes d'une évaluation déjà créée (ex: "Notes de classe – 1er trimestre")
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="manual" id="method-manual" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="method-manual" className="cursor-pointer font-medium flex items-center gap-2">
                    <Edit3 className="w-4 h-4" />
                    Saisie manuelle
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Saisir les notes de classe manuellement, matière par matière
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Contenu selon la méthode */}
          {config.method === 'evaluation' && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Évaluation pour les notes de classe</Label>
              <Select
                value={config.selectedEvaluationId || ''}
                onValueChange={handleEvaluationSelect}
                disabled={loadingEvaluations}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une évaluation" />
                </SelectTrigger>
                <SelectContent>
                  {compatibleEvaluations.map((evaluation) => (
                    <SelectItem key={evaluation.id} value={evaluation.id}>
                      <div className="flex items-center gap-2">
                        {evaluation.title}
                        <Badge variant="secondary" className="ml-2">
                          {evaluation.evaluation_type_name}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {compatibleEvaluations.length === 0 && !loadingEvaluations && (
                <p className="text-sm text-muted-foreground">
                  Aucune évaluation disponible. Créez d'abord une évaluation "Notes de classe" dans le module Évaluations.
                </p>
              )}
            </div>
          )}

          {config.method === 'manual' && subjects.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Notes de classe par matière (sur 20)</Label>
              <ScrollArea className="h-[250px] pr-4">
                <div className="space-y-2">
                  {config.manualGrades.map((grade) => (
                    <div 
                      key={grade.subjectId} 
                      className="flex items-center gap-3 p-2 rounded-md bg-muted/30"
                    >
                      <span className="flex-1 text-sm font-medium">{grade.subjectName}</span>
                      <Input
                        type="number"
                        min={0}
                        max={20}
                        step={0.25}
                        placeholder="--"
                        className="w-20 text-center"
                        value={grade.score ?? ''}
                        onChange={(e) => handleManualGradeChange(grade.subjectId, e.target.value)}
                      />
                      <span className="text-sm text-muted-foreground">/20</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {config.method === 'manual' && subjects.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Sélectionnez d'abord une classe pour voir les matières disponibles.
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
};
