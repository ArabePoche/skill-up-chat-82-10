// Application de gestion de l'emploi du temps
import React from 'react';
import { useTranslation } from 'react-i18next';

export const ScheduleApp: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <div className="p-6 h-full overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">{t('schoolOS.schedule.title')}</h2>
          <p className="text-muted-foreground mt-1">
            {t('schoolOS.schedule.title')}
          </p>
        </div>
      </div>
      {/* TODO: Implémenter l'interface de gestion des emplois du temps */}
    </div>
  );
};
