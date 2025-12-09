// Application de gestion des enseignants
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { TeachersView } from './components/TeachersView';

export const TeachersApp: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const schoolId = searchParams.get('id') || undefined;

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 shrink-0">
        <h2 className="text-2xl font-bold">{t('schoolOS.teachers.title')}</h2>
        <p className="text-muted-foreground mt-1">
          {t('schoolOS.teachers.title')}
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <TeachersView schoolId={schoolId} />
      </div>
    </div>
  );
};
