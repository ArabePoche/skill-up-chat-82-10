/**
 * SchoolSearchBar - Barre de recherche style Google Search
 * Design minimaliste et moderne avec filtres colorés dynamiques
 */
import React from 'react';
import { Search, X, Globe, Building2, MapPin, GraduationCap, ChevronDown, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSchoolFilters } from '@/school/hooks/useSchoolFilters';

export interface SchoolFilters {
  online: boolean;
  physical: boolean;
  country: string;
  level: string;
}

interface SchoolSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  isLoading?: boolean;
  filters?: SchoolFilters;
  onFiltersChange?: (filters: SchoolFilters) => void;
}

const SchoolSearchBar: React.FC<SchoolSearchBarProps> = ({
  value,
  onChange,
  isLoading,
  filters = { online: false, physical: false, country: '', level: '' },
  onFiltersChange,
}) => {
  const { t } = useTranslation();
  const { countries, levels } = useSchoolFilters();

  const toggleFilter = (key: 'online' | 'physical') => {
    if (onFiltersChange) {
      onFiltersChange({ ...filters, [key]: !filters[key] });
    }
  };

  const setCountry = (country: string) => {
    if (onFiltersChange) {
      onFiltersChange({ ...filters, country });
    }
  };

  const setLevel = (level: string) => {
    if (onFiltersChange) {
      onFiltersChange({ ...filters, level });
    }
  };

  const getCountryLabel = () => {
    const found = countries.find(c => c.code === filters.country);
    return found?.label || t('school.filters.country', { defaultValue: 'Pays' });
  };

  const getLevelLabel = () => {
    const found = levels.find(l => l.code === filters.level);
    return found?.label || t('school.filters.level', { defaultValue: 'Niveau' });
  };

  return (
    <div className="space-y-3">
      {/* Barre de recherche */}
      <div className="relative max-w-xl mx-auto">
        <div className="relative flex items-center">
          <Search 
            size={18} 
            className="absolute left-4 text-muted-foreground pointer-events-none" 
          />
          <Input
            type="text"
            placeholder={t('school.searchPlaceholder', { defaultValue: 'Rechercher une école...' })}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-12 pl-11 pr-11 rounded-full border-muted-foreground/20 shadow-sm hover:shadow-md focus:shadow-md transition-shadow bg-background"
          />
          {value && !isLoading && (
            <button
              onClick={() => onChange('')}
              className="absolute right-4 p-1 hover:bg-muted rounded-full transition-colors"
            >
              <X size={16} className="text-muted-foreground" />
            </button>
          )}
          {isLoading && (
            <div className="absolute right-4">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Filtres colorés */}
      <div className="flex flex-wrap justify-center gap-2">
        {/* Filtre En ligne */}
        <button
          onClick={() => toggleFilter('online')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            filters.online
              ? 'bg-blue-500 text-white shadow-md'
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50'
          }`}
        >
          <Globe size={14} />
          {t('school.filters.online', { defaultValue: 'En ligne' })}
        </button>

        {/* Filtre Physique */}
        <button
          onClick={() => toggleFilter('physical')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            filters.physical
              ? 'bg-green-500 text-white shadow-md'
              : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50'
          }`}
        >
          <Building2 size={14} />
          {t('school.filters.physical', { defaultValue: 'Physique' })}
        </button>

        {/* Dropdown Pays */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filters.country
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:hover:bg-orange-900/50'
              }`}
            >
              <MapPin size={14} />
              {filters.country ? getCountryLabel() : t('school.filters.country', { defaultValue: 'Pays' })}
              <ChevronDown size={12} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="min-w-[160px] bg-background border border-border shadow-lg z-50">
            {countries.map((country) => (
              <DropdownMenuItem
                key={country.code}
                onClick={() => setCountry(country.code)}
                className="flex items-center justify-between cursor-pointer"
              >
                {country.label}
                {filters.country === country.code && <Check size={14} className="text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Dropdown Niveau */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filters.level
                  ? 'bg-purple-500 text-white shadow-md'
                  : 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50'
              }`}
            >
              <GraduationCap size={14} />
              {filters.level ? getLevelLabel() : t('school.filters.level', { defaultValue: 'Niveau' })}
              <ChevronDown size={12} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="min-w-[160px] bg-background border border-border shadow-lg z-50">
            {levels.map((level) => (
              <DropdownMenuItem
                key={level.code}
                onClick={() => setLevel(level.code)}
                className="flex items-center justify-between cursor-pointer"
              >
                {level.label}
                {filters.level === level.code && <Check size={14} className="text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default SchoolSearchBar;
