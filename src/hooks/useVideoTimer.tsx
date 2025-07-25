import { useState, useEffect, useRef, useCallback } from 'react';
import { useSubscriptionLimits } from './useSubscriptionLimits';

interface UseVideoTimerProps {
  formationId: string;
  isPlaying?: boolean;
}

export const useVideoTimer = ({ formationId, isPlaying = false }: UseVideoTimerProps) => {
  const { timeRemainingToday, dailyTimeLimit, isLimitReached } = useSubscriptionLimits(formationId);
  const [sessionTime, setSessionTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());

  // Mettre à jour le temps utilisé dans localStorage
  const updateTimeUsed = useCallback((minutesUsed: number) => {
    if (!formationId) return;

    const storageKey = `timeUsed_${formationId}_${new Date().toDateString()}`;
    const currentUsed = parseInt(localStorage.getItem(storageKey) || '0');
    const newUsed = currentUsed + minutesUsed;
    localStorage.setItem(storageKey, newUsed.toString());
  }, [formationId]);

  // Démarrer/arrêter le timer selon l'état de lecture
  useEffect(() => {
    if (isPlaying && !isLimitReached && timeRemainingToday !== null && timeRemainingToday > 0) {
      // Démarrer le timer
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = (now - lastUpdateRef.current) / 1000; // en secondes
        
        setSessionTime(prev => {
          const newSessionTime = prev + elapsed;
          
          // Mettre à jour le localStorage toutes les 30 secondes
          if (Math.floor(newSessionTime) % 30 === 0) {
            updateTimeUsed(0.5); // 30 secondes = 0.5 minute
          }
          
          return newSessionTime;
        });
        
        lastUpdateRef.current = now;
      }, 1000);
    } else {
      // Arrêter le timer
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, isLimitReached, timeRemainingToday, updateTimeUsed]);

  // Sauvegarder le temps de session quand le composant se démonte
  useEffect(() => {
    return () => {
      if (sessionTime > 0) {
        const minutesUsed = Math.ceil(sessionTime / 60);
        updateTimeUsed(minutesUsed);
      }
    };
  }, [sessionTime, updateTimeUsed]);

  // Formater le temps en minutes:secondes
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    sessionTime: formatTime(sessionTime),
    timeRemainingToday,
    dailyTimeLimit,
    isLimitReached,
    canPlay: !isLimitReached && (timeRemainingToday === null || timeRemainingToday > 0)
  };
};