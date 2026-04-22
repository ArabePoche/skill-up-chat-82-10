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
  
  // Essayer de récupérer l'école depuis le cache hors ligne si nécessaire
  const [cachedSchool, setCachedSchool] = useState<School | null>(null);
  
  useEffect(() => {
    // Si hors ligne et pas d'école disponible, essayer le cache
    if (!userSchool && !schoolIdFromUrl) {
      const cached = localStorage.getItem('cached_school');
      if (cached) {
        try {
          setCachedSchool(JSON.parse(cached));
        } catch (e) {
          console.error('Error parsing cached school:', e);
        }
      }
    }
  }, [userSchool, schoolIdFromUrl]);

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
      
      // Mettre en cache l'école pour usage hors ligne
      if (data) {
        localStorage.setItem('cached_school', JSON.stringify(data));
      }
      
      return data as School;
    },
    enabled: !!schoolIdFromUrl,
  });

  // Mettre en cache l'école de l'utilisateur quand elle est disponible
  useEffect(() => {
    if (userSchool) {
      localStorage.setItem('cached_school', JSON.stringify(userSchool));
    }
  }, [userSchool]);

  const school = schoolFromUrl || userSchool || cachedSchool;
  const { data: schoolYears = [], isLoading } = useSchoolYears(school?.id);
  const [activeSchoolYear, setActiveSchoolYear] = useState<SchoolYear | null>(null);

  useEffect(() => {
    // Toujours définir l'année active par défaut quand les années scolaires changent
    if (schoolYears.length > 0) {
      // Priorité: année active (is_active = true), sinon la plus récente
      const active = schoolYears.find(y => y.is_active) || schoolYears[0];
      setActiveSchoolYear(active);
    } else {
      setActiveSchoolYear(null);
    }
  }, [schoolYears, school?.id]);

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
