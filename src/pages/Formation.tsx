import React from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import FormationDetail from './FormationDetail';

const Formation = () => {
  const { formationId } = useParams();
  const { t } = useTranslation();
  
  if (!formationId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('courses.courseDetails')}</h1>
          <p className="text-gray-600">{t('common.error')}</p>
        </div>
      </div>
    );
  }

  return <FormationDetail />;
};

export default Formation;