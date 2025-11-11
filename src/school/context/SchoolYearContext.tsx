import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUserSchool, useSchoolYears, SchoolYear } from '../hooks/useSchool';
import { useAuth } from '@/hooks/useAuth';

interface SchoolYearContextType {
  activeSchoolYear: SchoolYear | null;
  schoolYears: SchoolYear[];
  setActiveSchoolYear: (year: SchoolYear) => void;
  isLoading: boolean;
}

const SchoolYearContext = createContext<SchoolYearContextType | undefined>(undefined);

export const SchoolYearProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { data: school } = useUserSchool(user?.id);
  const { data: schoolYears = [], isLoading } = useSchoolYears(school?.id);
  const [activeSchoolYear, setActiveSchoolYear] = useState<SchoolYear | null>(null);

  useEffect(() => {
    // Définir l'année active par défaut (la plus récente avec is_active = true)
    if (schoolYears.length > 0 && !activeSchoolYear) {
      const active = schoolYears.find(y => y.is_active) || schoolYears[0];
      setActiveSchoolYear(active);
    }
  }, [schoolYears, activeSchoolYear]);

  return (
    <SchoolYearContext.Provider
      value={{
        activeSchoolYear,
        schoolYears,
        setActiveSchoolYear,
        isLoading,
      }}
    >
      {children}
    </SchoolYearContext.Provider>
  );
};

export const useSchoolYear = () => {
  const context = useContext(SchoolYearContext);
  if (context === undefined) {
    throw new Error('useSchoolYear must be used within a SchoolYearProvider');
  }
  return context;
};
