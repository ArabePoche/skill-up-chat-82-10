/**
 * SchoolSearchBar - Barre de recherche style Google Search
 * Design minimaliste et moderne
 */
import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';

interface SchoolSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  isLoading?: boolean;
}

const SchoolSearchBar: React.FC<SchoolSearchBarProps> = ({
  value,
  onChange,
  isLoading,
}) => {
  const { t } = useTranslation();

  return (
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
        {value && (
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
  );
};

export default SchoolSearchBar;
