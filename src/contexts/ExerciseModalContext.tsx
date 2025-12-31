/**
 * Contexte pour gérer l'état du modal d'exercice globalement
 * Permet de désactiver l'input bar quand le modal est ouvert
 */
import React, { createContext, useContext, useState, useCallback } from 'react';

interface ExerciseModalContextType {
  isExerciseModalOpen: boolean;
  setExerciseModalOpen: (open: boolean) => void;
}

const ExerciseModalContext = createContext<ExerciseModalContextType | undefined>(undefined);

export const ExerciseModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);

  const setExerciseModalOpen = useCallback((open: boolean) => {
    setIsExerciseModalOpen(open);
  }, []);

  return (
    <ExerciseModalContext.Provider value={{ isExerciseModalOpen, setExerciseModalOpen }}>
      {children}
    </ExerciseModalContext.Provider>
  );
};

export const useExerciseModal = () => {
  const context = useContext(ExerciseModalContext);
  if (!context) {
    // Retourner des valeurs par défaut si pas de provider
    return { isExerciseModalOpen: false, setExerciseModalOpen: () => {} };
  }
  return context;
};
