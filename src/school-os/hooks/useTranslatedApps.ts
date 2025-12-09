/**
 * Hook pour obtenir les noms traduits des applications School OS
 * Utilise les clés i18n définies dans les fichiers de traduction
 */
import { useTranslation } from 'react-i18next';
import { SchoolApp } from '../types';

// Mapping des IDs d'apps vers les clés i18n
const appTranslationKeys: Record<string, string> = {
  classes: 'schoolOS.apps.classes',
  subjects: 'schoolOS.apps.subjects',
  teachers: 'schoolOS.apps.teachers',
  students: 'schoolOS.apps.students',
  payments: 'schoolOS.apps.payments',
  accounting: 'schoolOS.apps.accounting',
  schedule: 'schoolOS.apps.schedule',
  grades: 'schoolOS.apps.grades',
  evaluations: 'schoolOS.apps.evaluations',
  reports: 'schoolOS.apps.reports',
  messages: 'schoolOS.apps.messages',
  personnel: 'schoolOS.apps.personnel',
  settings: 'schoolOS.apps.settings',
};

export const useTranslatedApps = () => {
  const { t } = useTranslation();

  /**
   * Retourne le nom traduit d'une application
   */
  const getAppName = (appId: string): string => {
    const key = appTranslationKeys[appId];
    if (key) {
      return t(key);
    }
    return appId;
  };

  /**
   * Clone une liste d'apps avec les noms traduits
   */
  const translateApps = (apps: SchoolApp[]): SchoolApp[] => {
    return apps.map(app => ({
      ...app,
      name: getAppName(app.id),
    }));
  };

  return { getAppName, translateApps };
};
