/**
 * SchoolTab - Onglet École du profil
 * Design inspiré de Google avec 3 sections:
 * 1. Mes écoles (carousel)
 * 2. Recherche (style Google Search)
 * 3. Résultats ou Page école
 */
import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSchoolSearch, type SchoolResult } from '@/school/hooks/useSchoolSearch';
import {
  SchoolLogo,
  MySchoolsCarousel,
  SchoolSearchBar,
  SchoolSearchResults,
  SchoolWebPage,
} from './school';
import type { SchoolFilters } from './school/SchoolSearchBar';
import { AnimatePresence, motion } from 'framer-motion';

interface SchoolTabProps {
  userId?: string;
}

const SchoolTab: React.FC<SchoolTabProps> = ({ userId }) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SchoolFilters>({
    online: false,
    physical: false,
    country: '',
    level: '',
  });
  const [selectedSchool, setSelectedSchool] = useState<SchoolResult | null>(null);
  const scrollPositionRef = useRef<number>(0);
  
  // Passer les filtres au hook de recherche
  const { data: schools, isLoading } = useSchoolSearch(searchQuery, {
    online: filters.online,
    physical: filters.physical,
    country: filters.country,
    level: filters.level,
  });

  const showResults = searchQuery.trim().length >= 2;

  const handleSelectSchool = (school: SchoolResult) => {
    // Sauvegarder la position de scroll
    scrollPositionRef.current = window.scrollY;
    setSelectedSchool(school);
    // Scroll vers le haut pour afficher la page école
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseSchoolPage = () => {
    setSelectedSchool(null);
    // Restaurer la position de scroll
    setTimeout(() => {
      window.scrollTo({ top: scrollPositionRef.current, behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Section 1: Mes écoles - Carousel (toujours visible) */}
      <MySchoolsCarousel />

      {/* Section 2: Recherche style Google (toujours visible sauf page école) */}
      <AnimatePresence mode="wait">
        {!selectedSchool && (
          <motion.div 
            key="search"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Logo stylisé */}
            <div className="flex justify-center">
              <SchoolLogo />
            </div>

            {/* Barre de recherche avec filtres */}
            <SchoolSearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              isLoading={isLoading && showResults}
              filters={filters}
              onFiltersChange={setFilters}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Section 3: Résultats ou Page École */}
      <AnimatePresence mode="wait">
        {selectedSchool ? (
          <motion.div
            key="school-page"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <SchoolWebPage 
              school={selectedSchool} 
              onClose={handleCloseSchoolPage} 
            />
          </motion.div>
        ) : (
          showResults && schools && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="border-t border-border" />
              <SchoolSearchResults
                schools={schools}
                searchQuery={searchQuery}
                onSelectSchool={handleSelectSchool}
              />
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  );
};

export default SchoolTab;
