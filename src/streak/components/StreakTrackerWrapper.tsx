/**
 * Wrapper pour activer le tracking automatique du streak dans l'application
 * Ce composant doit être placé au niveau de l'App
 */
import React from 'react';
import { useStreakSessionTracker } from '../hooks/useStreakSessionTracker';

export const StreakTrackerWrapper: React.FC = () => {
  // Active le tracking automatique des sessions et des streaks
  useStreakSessionTracker();
  
  // Ce composant n'affiche rien, il active juste le tracking
  return null;
};
