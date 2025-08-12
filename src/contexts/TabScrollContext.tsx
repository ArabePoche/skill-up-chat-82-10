// TabScrollContext: mémorise les positions de scroll par onglet (videos, posts, search)
// Utilisation: wrappez l'app avec <TabScrollProvider> et utilisez useTabScroll() dans les pages
import React, { createContext, useContext, useRef, useCallback } from 'react';

interface TabKey extends String {
  // Juste pour l'auto-complétion
}

type TabName = 'videos' | 'posts' | 'search';

interface TabScrollContextValue {
  getScroll: (tab: TabName) => number | undefined;
  setScroll: (tab: TabName, value: number) => void;
}

const TabScrollContext = createContext<TabScrollContextValue | undefined>(undefined);

export const TabScrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Map en mémoire pour garder le scroll par onglet (pas de persistance disque)
  const positionsRef = useRef<Record<TabName, number>>({ videos: 0, posts: 0, search: 0 });

  const getScroll = useCallback((tab: TabName) => positionsRef.current[tab], []);
  const setScroll = useCallback((tab: TabName, value: number) => {
    positionsRef.current[tab] = value;
  }, []);

  return (
    <TabScrollContext.Provider value={{ getScroll, setScroll }}>
      {children}
    </TabScrollContext.Provider>
  );
};

export const useTabScroll = () => {
  const ctx = useContext(TabScrollContext);
  if (!ctx) throw new Error('useTabScroll must be used within TabScrollProvider');
  return ctx;
};