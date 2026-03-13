/**
 * Interface professeur pour une formation
 */
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TeacherView from '@/components/TeacherView';
import { useTranslation } from 'react-i18next';
import { useFormationById } from '@/hooks/useFormations';

const TeacherInterface = () => {
  const { formationId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: formation, isLoading, error } = useFormationById(formationId);

  if (!formationId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('formation.notFound')}</h1>
          <p className="text-gray-600">{t('formation.missingId')}</p>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    navigate('/cours');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('common.loading')}</h1>
          <p className="text-gray-600">{t('formation.loadingFormations')}</p>
        </div>
      </div>
    );
  }

  if (error || !formation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('formation.notFound')}</h1>
          <p className="text-gray-600">{t('formation.missingId')}</p>
        </div>
      </div>
    );
  }

  return (
    <TeacherView
      formation={{
        id: String(formation.id),
        title: formation.title,
        author: formation.profiles
          ? `${formation.profiles.first_name || ''} ${formation.profiles.last_name || ''}`.trim() ||
            formation.profiles.username ||
            t('formation.teacher')
          : t('formation.teacher'),
      }}
      onBack={handleBack}
    />
  );
};

export default TeacherInterface;
