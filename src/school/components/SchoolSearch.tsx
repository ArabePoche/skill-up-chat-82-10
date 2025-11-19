import React, { useState } from 'react';
import { Search, Building2, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useSchoolSearch } from '../hooks/useSchoolSearch';
import { useTranslation } from 'react-i18next';
import SchoolSearchResult from './SchoolSearchResult';

/**
 * Composant de recherche d'école
 * Permet de trouver et consulter les écoles
 */
const SchoolSearch: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: schools, isLoading } = useSchoolSearch(searchQuery);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        {t('school.searchSchool', { defaultValue: 'Rechercher une école' })}
      </h3>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={t('school.searchPlaceholder', { defaultValue: 'Nom, ville, niveau...' })}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading && (
        <div className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      )}

      {!isLoading && searchQuery && schools && schools.length === 0 && (
        <div className="py-8 text-center text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>{t('school.noResults', { defaultValue: 'Aucune école trouvée' })}</p>
        </div>
      )}

      {!isLoading && schools && schools.length > 0 && (
        <div className="space-y-2">
          {schools.map((school) => (
            <SchoolSearchResult key={school.id} school={school} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SchoolSearch;
