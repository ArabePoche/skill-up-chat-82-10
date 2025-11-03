/**
 * Wrapper pour activer le tracking d'activité utilisateur dans l'application
 * Ce composant doit être placé au niveau de l'App, après le PresenceProvider
 */
import React from 'react';
import { useActivityTracker } from '@/hooks/useActivityTracker';

export const ActivityTrackerWrapper: React.FC = () => {
  // Active le tracking automatique des activités utilisateur
  useActivityTracker();
  
  // Ce composant n'affiche rien, il active juste le tracking
  return null;
};
