import { useState, useEffect, useRef, useCallback } from 'react';
import { useSubscriptionLimits } from './useSubscriptionLimits';
import { useAuth } from './useAuth';

interface UseChatTimerProps {
  formationId: string;
  lessonId: string;
  isActive?: boolean;
}

export const useChatTimer = ({ formationId, lessonId, isActive = true }: UseChatTimerProps) => {
  const { user } = useAuth();
  const { timeRemainingToday, dailyTimeLimit, isLimitReached, updateTimeUsed } = useSubscriptionLimits(formationId);
  const [sessionTime, setSessionTime] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());

  // Démarrer le timer dès l'ouverture du chat
  useEffect(() => {
    if (isActive && !isLimitReached && timeRemainingToday !== null && timeRemainingToday > 0) {
      setIsTimerActive(true);
      lastUpdateRef.current = Date.now();
    } else {
      setIsTimerActive(false);
    }
  }, [isActive, isLimitReached, timeRemainingToday]);

  // Gérer le timer
  useEffect(() => {
    if (isTimerActive) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = (now - lastUpdateRef.current) / 1000; // en secondes
        
        setSessionTime(prev => {
          const newSessionTime = prev + elapsed;
          
          // Mettre à jour le localStorage toutes les 60 secondes
          if (Math.floor(newSessionTime) % 60 === 0 && Math.floor(newSessionTime) > 0) {
            updateTimeUsed(1); // 1 minute
          }
          
          return newSessionTime;
        });
        
        lastUpdateRef.current = now;
      }, 1000);
    } else {
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
  }, [isTimerActive, updateTimeUsed]);

  // Sauvegarder le temps de session quand le composant se démonte ou se ferme
  const saveSessionTime = useCallback(() => {
    if (sessionTime > 0) {
      const minutesUsed = Math.ceil(sessionTime / 60);
      updateTimeUsed(minutesUsed);
    }
  }, [sessionTime, updateTimeUsed]);

  useEffect(() => {
    // Sauvegarder avant de fermer
    const handleBeforeUnload = () => {
      saveSessionTime();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      saveSessionTime();
    };
  }, [saveSessionTime]);

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
    isTimerActive,
    canContinue: !isLimitReached && (timeRemainingToday === null || timeRemainingToday > 0)
  };
};