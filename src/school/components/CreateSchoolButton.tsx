import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import CreateSchoolModal from './CreateSchoolModal';

/**
 * Bouton pour créer une nouvelle école
 * Visible uniquement pour les utilisateurs vérifiés
 */
const CreateSchoolButton: React.FC = () => {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Button 
        onClick={() => setShowModal(true)}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        {t('school.createSchool', { defaultValue: 'Créer une école' })}
      </Button>
      
      <CreateSchoolModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
};

export default CreateSchoolButton;
