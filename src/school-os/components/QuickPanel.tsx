// Composant panneau d'accès rapide aux applications - filtré par permissions
import React, { useState } from 'react';
import { X, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { SchoolApp } from '../types';
import { useTranslation } from 'react-i18next';
import { useTranslatedApps } from '../hooks/useTranslatedApps';

interface QuickPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenApp: (appId: string) => void;
  apps: SchoolApp[]; // Apps filtrées par permissions
}

export const QuickPanel: React.FC<QuickPanelProps> = ({
  isOpen,
  onClose,
  onOpenApp,
  apps,
}) => {
  const { t } = useTranslation();
  const { getAppName } = useTranslatedApps();
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredApps = apps.filter(app => {
    const translatedName = getAppName(app.id);
    return translatedName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleAppClick = (appId: string) => {
    onOpenApp(appId);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] flex items-end md:items-center justify-center p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">{t('schoolOS.common.applications', 'Applications')}</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg hover:bg-accent flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Recherche */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder={t('schoolOS.common.searchApp', 'Rechercher une application...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Grille d'apps */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-3 md:grid-cols-4 gap-6">
            {filteredApps.map((app) => (
              <button
                key={app.id}
                onClick={() => handleAppClick(app.id)}
                className="flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-accent transition-colors"
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: app.color }}
                >
                  {React.createElement(app.icon, { className: "w-8 h-8 text-white" })}
                </div>
                <span className="text-sm font-medium text-center">
                  {getAppName(app.id)}
                </span>
              </button>
            ))}
          </div>

          {filteredApps.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              {t('schoolOS.common.noAppFound', 'Aucune application trouvée')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
