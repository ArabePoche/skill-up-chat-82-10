/**
 * Wrapper pour activer le tracking automatique du streak dans l'application
 * Ce composant doit être placé au niveau de l'App
 */
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useStreakTracker } from '../hooks/useStreakTracker';

export const StreakTrackerWrapper: React.FC = () => {
  const { user } = useAuth();
  
  // Active le tracking automatique du streak
  useStreakTracker(user?.id);
  
  // Ce composant n'affiche rien, il active juste le tracking
  return null;
};
