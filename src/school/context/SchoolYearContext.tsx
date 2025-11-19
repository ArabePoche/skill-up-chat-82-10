import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUserSchool, useSchoolYears, SchoolYear, School } from '../hooks/useSchool';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SchoolYearContextType {
  school: School | null;
  activeSchoolYear: SchoolYear | null;
  schoolYears: SchoolYear[];
  setActiveSchoolYear: (year: SchoolYear) => void;
  isLoading: boolean;
}

const SchoolYearContext = createContext<SchoolYearContextType | undefined>(undefined);

export const SchoolYearProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const schoolIdFromUrl = searchParams.get('id');
  
  // Récupérer l'école depuis l'URL ou l'école de l'utilisateur
  const { data: userSchool } = useUserSchool(user?.id);
  const { data: schoolFromUrl } = useQuery({
    queryKey: ['school', schoolIdFromUrl],
    queryFn: async () => {
      if (!schoolIdFromUrl) return null;
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', schoolIdFromUrl)
        .single();
      
      if (error) {
        console.error('Error fetching school:', error);
        return null;
      }
      return data as School;
    },
    enabled: !!schoolIdFromUrl,
  });

  const school = schoolFromUrl || userSchool;
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
        school,
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
