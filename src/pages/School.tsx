/**
 * Page principale du School OS
 * Affiche le bureau avec toutes les applications scolaires
 */
import React from 'react';
import { Desktop } from '@/school-os/components/Desktop';
import { SchoolYearProvider } from '@/school/context/SchoolYearContext';

const School: React.FC = () => {
  return (
    <SchoolYearProvider>
      <Desktop />
    </SchoolYearProvider>
  );
};

export default School;
