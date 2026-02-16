/**
 * Wrapper pour tracker les visiteurs anonymes (sans compte).
 * Ce composant doit être placé au niveau de l'App.
 */
import React from 'react';
import { useVisitorTracker } from '@/hooks/useVisitorTracker';

export const VisitorTrackerWrapper: React.FC = () => {
  useVisitorTracker();
  return null;
};
