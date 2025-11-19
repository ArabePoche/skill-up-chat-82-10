import React from 'react';
import { X, School } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from 'react-i18next';
import CreateSchoolButton from './CreateSchoolButton';
import MySchoolsList from './MySchoolsList';
import SchoolSearch from './SchoolSearch';

/**
 * Modal de gestion des écoles
 * Permet de créer, consulter et rejoindre des écoles
 */
interface SchoolManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SchoolManagementModal: React.FC<SchoolManagementModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const isVerified = (profile as any)?.is_verified;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] bg-background rounded-lg shadow-xl z-50">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <School className="h-6 w-6" />
            <h2 className="text-2xl font-bold">
              {t('school.title', { defaultValue: 'École' })}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <ScrollArea className="max-h-[calc(90vh-80px)]">
          <div className="p-6 space-y-6">
            {/* 1. Bouton Créer une école (uniquement pour utilisateurs vérifiés) */}
            {isVerified && (
              <>
                <CreateSchoolButton />
                <Separator />
              </>
            )}

            {/* 2. Mes Écoles */}
            <MySchoolsList onClose={onClose} />
            
            <Separator />

            {/* 3. Rechercher une école */}
            <SchoolSearch />
          </div>
        </ScrollArea>
      </div>
    </>
  );
};

export default SchoolManagementModal;
