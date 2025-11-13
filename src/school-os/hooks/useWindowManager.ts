// Hook pour la gestion des fenêtres du système d'exploitation scolaire
import { useState, useCallback } from 'react';
import { WindowState } from '../types';

export const useWindowManager = () => {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [nextZIndex, setNextZIndex] = useState(100);

  const openWindow = useCallback((appId: string) => {
    const existingWindow = windows.find(w => w.appId === appId);
    
    if (existingWindow) {
      // Si la fenêtre existe déjà, la mettre au premier plan
      setWindows(prev =>
        prev.map(w =>
          w.id === existingWindow.id
            ? { ...w, isMinimized: false, zIndex: nextZIndex }
            : w
        )
      );
      setNextZIndex(prev => prev + 1);
      return;
    }

    // Créer une nouvelle fenêtre
    const newWindow: WindowState = {
      id: `window-${Date.now()}`,
      appId,
      isMinimized: false,
      position: 'full',
      zIndex: nextZIndex,
    };

    setWindows(prev => [...prev, newWindow]);
    setNextZIndex(prev => prev + 1);
  }, [windows, nextZIndex]);

  const closeWindow = useCallback((windowId: string) => {
    setWindows(prev => prev.filter(w => w.id !== windowId));
  }, []);

  const minimizeWindow = useCallback((windowId: string) => {
    setWindows(prev =>
      prev.map(w =>
        w.id === windowId ? { ...w, isMinimized: true } : w
      )
    );
  }, []);

  const restoreWindow = useCallback((windowId: string) => {
    setWindows(prev =>
      prev.map(w =>
        w.id === windowId
          ? { ...w, isMinimized: false, zIndex: nextZIndex }
          : w
      )
    );
    setNextZIndex(prev => prev + 1);
  }, [nextZIndex]);

  const splitWindow = useCallback((windowId: string) => {
    setWindows(prev =>
      prev.map(w => {
        if (w.id === windowId) {
          // Toggle entre full, left et right
          const nextPosition = w.position === 'full' ? 'left' : w.position === 'left' ? 'right' : 'full';
          return { ...w, position: nextPosition };
        }
        return w;
      })
    );
  }, []);

  const focusWindow = useCallback((windowId: string) => {
    setWindows(prev =>
      prev.map(w =>
        w.id === windowId ? { ...w, zIndex: nextZIndex } : w
      )
    );
    setNextZIndex(prev => prev + 1);
  }, [nextZIndex]);

  return {
    windows,
    openWindow,
    closeWindow,
    minimizeWindow,
    restoreWindow,
    splitWindow,
    focusWindow,
  };
};
