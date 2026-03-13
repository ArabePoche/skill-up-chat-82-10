/**
 * Hook pour détecter un appui long (long press) sur un élément
 * Utilisé pour ouvrir le modal de téléchargement de vidéo
 */

import { useRef, useCallback } from 'react';

interface UseLongPressOptions {
  /** Durée de l'appui long en ms (défaut: 500ms) */
  duration?: number;
  /** Callback déclenché lors de l'appui long */
  onLongPress: () => void;
}

export const useLongPress = ({ duration = 500, onLongPress }: UseLongPressOptions) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);

  const start = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    isLongPressRef.current = false;
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      // Vibration haptique si disponible
      if (navigator.vibrate) navigator.vibrate(50);
      onLongPress();
    }, duration);
  }, [duration, onLongPress]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchMove: cancel,
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
    /** Permet de vérifier si le dernier événement était un long press (pour bloquer le click) */
    isLongPress: isLongPressRef,
  };
};
