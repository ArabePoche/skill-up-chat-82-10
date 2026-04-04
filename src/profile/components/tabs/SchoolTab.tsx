/**
 * SchoolTab - Onglet École du profil
 * Design inspiré de Google avec 3 sections:
 * 1. Mes écoles (carousel)
 * 2. Recherche (style Google Search)
 * 3. Résultats
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSchoolSearch, type SchoolResult } from '@/school/hooks/useSchoolSearch';
import {
  SchoolLogo,
  MySchoolsCarousel,
  SchoolSearchBar,
  SchoolSearchResults,
} from './school';
import type { SchoolFilters } from './school/SchoolSearchBar';
import { motion } from 'framer-motion';

interface SchoolTabProps {
  userId?: string;
}

const SchoolTab: React.FC<SchoolTabProps> = ({ userId }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SchoolFilters>({
    online: false,
    physical: false,
    country: '',
    level: '',
  });

  const { data: schools, isLoading } = useSchoolSearch(searchQuery, {
    online: filters.online,
    physical: filters.physical,
    country: filters.country,
    level: filters.level,
  });

  const showResults = searchQuery.trim().length >= 2;

  const handleSelectSchool = (school: SchoolResult) => {
    navigate(`/school-site?id=${encodeURIComponent(school.id)}`);
  };

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Section 1: Mes écoles - Carousel (toujours visible) */}
      <MySchoolsCarousel />

      {/* Section 2: Recherche style Google */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-4"
      >
        <div className="flex justify-center">
          <SchoolLogo />
        </div>
        <SchoolSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          isLoading={isLoading && showResults}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </motion.div>

      {/* Section 3: Résultats */}
      {showResults && schools && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="border-t border-border" />
          <SchoolSearchResults
            schools={schools}
            searchQuery={searchQuery}
            onSelectSchool={handleSelectSchool}
          />
        </motion.div>
      )}
    </div>
  );
};

export default SchoolTab;
