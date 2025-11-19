import React from 'react';
import { Building2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserSchools } from '../hooks/useUserSchools';
import { useTranslation } from 'react-i18next';

/**
 * Liste des écoles de l'utilisateur
 * Affiche les écoles dont il est créateur ou membre
 */
interface MySchoolsListProps {
  onClose: () => void;
}

const MySchoolsList: React.FC<MySchoolsListProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: schools, isLoading } = useUserSchools(user?.id);

  const handleSchoolClick = (schoolId: string) => {
    onClose();
    navigate(`/school?id=${schoolId}`);
  };

  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  if (!schools || schools.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>{t('school.noSchools', { defaultValue: 'Aucune école' })}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">
        {t('school.mySchools', { defaultValue: 'Mes Écoles' })}
      </h3>
      
      <div className="space-y-2">
        {schools.map((school) => (
          <button
            key={school.id}
            onClick={() => handleSchoolClick(school.id)}
            className="w-full p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors text-left flex items-center justify-between group"
          >
            <div className="flex items-center gap-3 flex-1">
              <Building2 className="h-5 w-5 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{school.name}</p>
                {school.description && (
                  <p className="text-sm text-muted-foreground truncate">{school.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {school.role === 'owner' 
                    ? t('school.roleOwner', { defaultValue: 'Créateur' })
                    : t(`school.role${school.role}`, { defaultValue: school.role })}
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default MySchoolsList;
