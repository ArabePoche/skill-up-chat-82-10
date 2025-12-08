/**
 * SchoolSearchResults - Résultats de recherche style Google
 * Affiche les écoles trouvées avec un design épuré
 */
import React from 'react';
import { Building2, Globe, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface School {
  id: string;
  name: string;
  description: string | null;
  school_type: string;
  country?: string | null;
  city?: string | null;
}

interface SchoolSearchResultsProps {
  schools: School[];
  searchQuery: string;
  onSelectSchool: (school: School) => void;
}

const SchoolSearchResults: React.FC<SchoolSearchResultsProps> = ({
  schools,
  searchQuery,
  onSelectSchool,
}) => {
  const { t } = useTranslation();

  const getSchoolTypeLabel = (type: string) => {
    switch (type) {
      case 'virtual':
        return t('school.virtual', { defaultValue: 'Virtuel' });
      case 'physical':
        return t('school.physical', { defaultValue: 'Physique' });
      case 'both':
        return t('school.both', { defaultValue: 'Hybride' });
      default:
        return type;
    }
  };

  const getSchoolTypeIcon = (type: string) => {
    switch (type) {
      case 'virtual':
        return <Globe size={12} />;
      case 'physical':
        return <Building2 size={12} />;
      default:
        return <Building2 size={12} />;
    }
  };

  if (schools.length === 0) {
    return (
      <div className="text-center py-8">
        <Building2 size={48} className="mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-muted-foreground">
          {t('school.noResults', { defaultValue: 'Aucune école trouvée pour' })} "{searchQuery}"
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1 max-w-xl mx-auto">
      <p className="text-xs text-muted-foreground px-1 mb-3">
        {schools.length} {t('school.resultsFound', { defaultValue: 'résultat(s) trouvé(s)' })}
      </p>
      
      {schools.map((school) => (
        <button
          key={school.id}
          onClick={() => onSelectSchool(school)}
          className="w-full text-left p-4 rounded-lg hover:bg-muted/50 transition-colors group"
        >
          {/* URL style breadcrumb */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <Building2 size={12} />
            <span>school</span>
            <span>›</span>
            <span className="text-green-600 dark:text-green-400">
              {school.id.slice(0, 8)}...
            </span>
          </div>
          
          {/* Titre - style lien Google */}
          <h4 className="text-lg text-blue-600 dark:text-blue-400 group-hover:underline font-normal mb-1">
            {school.name}
          </h4>
          
          {/* Description */}
          {school.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {school.description}
            </p>
          )}
          
          {/* Badges */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1 px-2 py-0.5 bg-muted rounded-full">
              {getSchoolTypeIcon(school.school_type)}
              {getSchoolTypeLabel(school.school_type)}
            </span>
            {school.city && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-muted rounded-full">
                <MapPin size={10} />
                {school.city}
              </span>
            )}
            {school.country && (
              <span className="px-2 py-0.5 bg-muted rounded-full">
                {school.country}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
};

export default SchoolSearchResults;
