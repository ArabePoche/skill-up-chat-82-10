// Hook pour gérer les paramètres du bureau (taille icônes, taskbar, etc.)
import { useState, useCallback } from 'react';

export type IconSize = 'small' | 'medium' | 'large';

export const useDesktopSettings = () => {
  const [taskbarVisible, setTaskbarVisible] = useState(true);
  const [iconSize, setIconSize] = useState<IconSize>('medium');
  const [pinnedApps, setPinnedApps] = useState<string[]>([]);

  const toggleTaskbar = useCallback(() => {
    setTaskbarVisible(prev => !prev);
  }, []);

  const changeIconSize = useCallback((size: IconSize) => {
    setIconSize(size);
  }, []);

  const togglePinApp = useCallback((appId: string) => {
    setPinnedApps(prev => {
      if (prev.includes(appId)) {
        return prev.filter(id => id !== appId);
      }
      return [...prev, appId];
    });
  }, []);

  const isAppPinned = useCallback((appId: string) => {
    return pinnedApps.includes(appId);
  }, [pinnedApps]);

  const getIconSizeClass = useCallback(() => {
    switch (iconSize) {
      case 'small':
        return 'w-16 h-20';
      case 'medium':
        return 'w-20 h-24';
      case 'large':
        return 'w-24 h-28';
      default:
        return 'w-20 h-24';
    }
  }, [iconSize]);

  return {
    taskbarVisible,
    toggleTaskbar,
    iconSize,
    changeIconSize,
    pinnedApps,
    togglePinApp,
    isAppPinned,
    getIconSizeClass,
  };
};
