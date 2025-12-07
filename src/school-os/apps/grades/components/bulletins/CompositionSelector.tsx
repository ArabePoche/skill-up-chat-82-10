/**
 * Sélecteur de Composition/Examen pour la génération de bulletins
 * Affiche uniquement les compositions liées à la classe sélectionnée
 */
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Loader2 } from 'lucide-react';

interface Composition {
  id: string;
  title: string;
  type: string;
  start_date: string | null;
  end_date: string | null;
  include_class_notes: boolean;
}

interface CompositionSelectorProps {
  compositions: Composition[];
  selectedCompositionId: string;
  onSelect: (compositionId: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    composition: 'Composition',
    trimestre: 'Trimestre',
    semestre: 'Semestre',
    examen: 'Examen',
    session: 'Session',
  };
  return labels[type] || type;
};

const getTypeBadgeVariant = (type: string): 'default' | 'secondary' | 'outline' => {
  const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
    examen: 'default',
    composition: 'secondary',
    trimestre: 'outline',
    semestre: 'outline',
    session: 'secondary',
  };
  return variants[type] || 'outline';
};

export const CompositionSelector: React.FC<CompositionSelectorProps> = ({
  compositions,
  selectedCompositionId,
  onSelect,
  isLoading = false,
  disabled = false,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 h-10 px-3 border border-input rounded-md bg-muted/50">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Chargement...</span>
      </div>
    );
  }

  return (
    <Select
      value={selectedCompositionId}
      onValueChange={onSelect}
      disabled={disabled || compositions.length === 0}
    >
      <SelectTrigger>
        <SelectValue placeholder="Sélectionner une composition/examen" />
      </SelectTrigger>
      <SelectContent>
        {compositions.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Aucune composition trouvée pour cette classe.
            <br />
            Créez d'abord une composition dans le module Évaluations.
          </div>
        ) : (
          compositions.map((comp) => (
            <SelectItem key={comp.id} value={comp.id}>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span>{comp.title}</span>
                <Badge variant={getTypeBadgeVariant(comp.type)} className="ml-2">
                  {getTypeLabel(comp.type)}
                </Badge>
                {comp.include_class_notes && (
                  <Badge variant="outline" className="ml-1 text-xs">
                    + Notes classe
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
};
