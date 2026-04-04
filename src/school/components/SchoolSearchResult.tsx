import React from 'react';
import { Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/**
 * Résultat de recherche d'école
 * Affiche les infos publiques et redirige vers la page du site de l'école
 */
interface SchoolSearchResultProps {
  school: {
    id: string;
    name: string;
    description: string | null;
    school_type: string;
  };
}

const SchoolSearchResult: React.FC<SchoolSearchResultProps> = ({ school }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <button
      className="w-full p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors text-left"
      onClick={() => navigate(`/school-site?id=${school.id}`)}
    >
      <div className="flex items-start gap-3">
        <Building2 className="h-5 w-5 text-primary mt-1 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium">{school.name}</p>
          {school.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{school.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span className="px-2 py-1 bg-background rounded">
              {school.school_type === 'virtual' && t('school.virtual', { defaultValue: 'Virtuel' })}
              {school.school_type === 'physical' && t('school.physical', { defaultValue: 'Physique' })}
              {school.school_type === 'both' && t('school.both', { defaultValue: 'Virtuel et Physique' })}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
};

export default SchoolSearchResult;
