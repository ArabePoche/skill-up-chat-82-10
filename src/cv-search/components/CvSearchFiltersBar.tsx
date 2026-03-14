/**
 * Filtres de recherche pour les CV publics
 * Compétences, localisation, expérience, formation
 */
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { CvSearchFilters } from '../hooks/useSearchCvs';

interface CvSearchFiltersBarProps {
  filters: CvSearchFilters;
  onFiltersChange: (filters: CvSearchFilters) => void;
  onSearch: () => void;
  onReset: () => void;
}

export const CvSearchFiltersBar: React.FC<CvSearchFiltersBarProps> = ({
  filters,
  onFiltersChange,
  onSearch,
  onReset,
}) => {
  const updateFilter = (key: keyof CvSearchFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onSearch();
  };

  return (
    <div className="space-y-3 p-4 bg-card rounded-lg border">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Compétences / Mots-clés</Label>
          <Input
            placeholder="Ex: vendeur, marketing, comptable..."
            value={filters.query}
            onChange={(e) => updateFilter('query', e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Localisation</Label>
          <Input
            placeholder="Ex: Dakar, Abidjan..."
            value={filters.location}
            onChange={(e) => updateFilter('location', e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Expérience</Label>
          <Input
            placeholder="Ex: vente, gestion, caisse..."
            value={filters.experience}
            onChange={(e) => updateFilter('experience', e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Formation / Diplôme</Label>
          <Input
            placeholder="Ex: BTS, licence, commerce..."
            value={filters.education}
            onChange={(e) => updateFilter('education', e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={onSearch} className="flex-1">
          <Search size={14} className="mr-1" />
          Rechercher
        </Button>
        <Button variant="outline" onClick={onReset}>
          <X size={14} className="mr-1" />
          Réinitialiser
        </Button>
      </div>
    </div>
  );
};
