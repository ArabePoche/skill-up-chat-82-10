import React, { useState } from 'react';
import { Building2, MapPin, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import SchoolJoinRequestModal from './SchoolJoinRequestModal';

/**
 * Résultat de recherche d'école
 * Affiche les infos publiques et permet de demander à rejoindre
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
  const [showJoinModal, setShowJoinModal] = useState(false);

  return (
    <>
      <div className="p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <Building2 className="h-5 w-5 text-primary mt-1" />
            <div className="flex-1 min-w-0">
              <p className="font-medium">{school.name}</p>
              {school.description && (
                <p className="text-sm text-muted-foreground mt-1">{school.description}</p>
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
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setShowJoinModal(true)}
          >
            {t('school.join', { defaultValue: 'Rejoindre' })}
          </Button>
        </div>
      </div>

      <SchoolJoinRequestModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        school={school}
      />
    </>
  );
};

export default SchoolSearchResult;
