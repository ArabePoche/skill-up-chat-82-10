import React, { createContext, useContext, useState, ReactNode } from 'react';

export type NavigationView = 'home' | 'shop' | 'cours' | 'messages' | 'profil';

interface NavigationContextType {
  currentView: NavigationView;
  setCurrentView: (view: NavigationView) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

interface NavigationProviderProps {
  children: ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const [currentView, setCurrentView] = useState<NavigationView>('home');

  return (
    <NavigationContext.Provider value={{ currentView, setCurrentView }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};