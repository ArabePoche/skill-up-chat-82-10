/**
 * SchoolTab - Onglet École du profil
 * Design inspiré de Google avec 3 sections:
 * 1. Mes écoles (carousel)
 * 2. Recherche (style Google Search)
 * 3. Résultats (style Google Results)
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSchoolSearch } from '@/school/hooks/useSchoolSearch';
import {
  SchoolLogo,
  MySchoolsCarousel,
  SchoolSearchBar,
  SchoolSearchResults,
} from './school';

interface SchoolTabProps {
  userId?: string;
}

const SchoolTab: React.FC<SchoolTabProps> = ({ userId }) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: schools, isLoading } = useSchoolSearch(searchQuery);

  const showResults = searchQuery.trim().length >= 2;

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Section 1: Mes écoles - Carousel */}
      <MySchoolsCarousel />

      {/* Séparateur */}
      <div className="border-t border-border" />

      {/* Section 2: Recherche style Google */}
      <div className="py-4 space-y-6">
        {/* Logo stylisé */}
        <div className="flex justify-center">
          <SchoolLogo />
        </div>

        {/* Barre de recherche */}
        <SchoolSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          isLoading={isLoading && showResults}
        />
      </div>

      {/* Section 3: Résultats */}
      {showResults && schools && (
        <>
          <div className="border-t border-border" />
          <SchoolSearchResults
            schools={schools}
            searchQuery={searchQuery}
          />
        </>
      )}
    </div>
  );
};

export default SchoolTab;
