// Hook pour filtrer les applications en fonction des permissions de l'utilisateur
import { useMemo } from 'react';
import { schoolApps } from '../apps';
import { useSchoolUserRole } from './useSchoolUserRole';
import { SchoolApp } from '../types';

// Mapping des apps vers leurs permissions requises
const APP_PERMISSION_MAP: Record<string, string> = {
  classes: 'app.classes',
  students: 'app.students',
  teachers: 'app.teachers',
  grades: 'app.grades',
  payments: 'app.payments',
  accounting: 'app.accounting',
  schedule: 'app.schedule',
  subjects: 'app.subjects',
  reports: 'app.reports',
  messages: 'app.messages',
  personnel: 'app.personnel',
  settings: 'app.settings',
};

export const useFilteredApps = (schoolId: string | undefined): {
  apps: SchoolApp[];
  isLoading: boolean;
} => {
  const { data: roleData, isLoading } = useSchoolUserRole(schoolId);

  const filteredApps = useMemo(() => {
    if (!roleData || isLoading) {
      return [];
    }

    // Si l'utilisateur est owner ou admin, afficher toutes les apps
    if (roleData.isOwner || roleData.isAdmin) {
      return schoolApps;
    }

    // Filtrer les apps en fonction des permissions
    return schoolApps.filter(app => {
      const requiredPermission = APP_PERMISSION_MAP[app.id];
      if (!requiredPermission) {
        return false; // App non configurée, ne pas afficher
      }
      return roleData.permissions.includes(requiredPermission);
    });
  }, [roleData, isLoading]);

  return {
    apps: filteredApps,
    isLoading,
  };
};
