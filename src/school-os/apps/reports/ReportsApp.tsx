// Application de génération de rapports
import React from 'react';
import { useTranslation } from 'react-i18next';

export const ReportsApp: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <div className="p-6 h-full overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">{t('schoolOS.reports.title')}</h2>
          <p className="text-muted-foreground mt-1">
            {t('schoolOS.reports.generateReport')}
          </p>
        </div>
      </div>
      {/* TODO: Implémenter l'interface de génération de rapports */}
    </div>
  );
};
