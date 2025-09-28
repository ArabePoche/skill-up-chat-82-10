
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlanLimits } from '@/plan-limits/hooks/usePlanLimits';
import { PlanLimitAlert } from '@/plan-limits/components/PlanLimitAlert';
import LessonVideoPlayer from '@/components/LessonVideoPlayer';

interface LessonVideoPlayerWithTimerProps {
  src: string;
  formationId: string;
  onUpgrade?: () => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
  className?: string;
}

export const LessonVideoPlayerWithTimer: React.FC<LessonVideoPlayerWithTimerProps> = ({
  src,
  formationId,
  onUpgrade,
  onPlayStateChange,
  className = ''
}) => {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [showLimitAlert, setShowLimitAlert] = useState(false);

  const {
    timeRemainingToday,
    dailyTimeLimit,
    isTimeReached,
    canUseTime,
    sessionTime,
    isTimerActive,
    startTimer,
    stopTimer
  } = usePlanLimits({ 
    formationId, 
    context: 'video', 
    isActive: isPlaying 
  });

  const timeCheck = canUseTime();
  const canPlay = timeCheck.allowed;

  // Gérer les changements d'état de lecture
  const handlePlayStateChange = (playing: boolean) => {
    if (!canPlay && playing) {
      setShowLimitAlert(true);
      return;
    }
    
    setIsPlaying(playing);
    onPlayStateChange?.(playing);

    // Gérer le timer
    if (playing) {
      startTimer();
    } else {
      stopTimer();
    }
  };

  // Arrêter la vidéo si la limite est atteinte
  useEffect(() => {
    if (isTimeReached && isPlaying) {
      setIsPlaying(false);
      onPlayStateChange?.(false);
      stopTimer();
    }
  }, [isTimeReached, isPlaying, onPlayStateChange, stopTimer]);

  if (isTimeReached) {
    return (
      <div className={`relative bg-black ${className}`}>
        <div className="aspect-video flex flex-col items-center justify-center text-white p-8">
          <Clock size={48} className="mb-4 opacity-60" />
          <h3 className="text-lg font-semibold mb-2">Limite de temps atteinte</h3>
          <p className="text-sm opacity-80 text-center mb-4">
            Vous avez utilisé tout votre temps quotidien pour cette formation.
          </p>
          <PlanLimitAlert
            message="Revenez demain ou passez à un plan supérieur pour continuer."
            onUpgrade={() => navigate(`/formation/${formationId}/pricing`)}
            restrictionType="time"
            variant="warning"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Timer en surimpression - repositionné pour éviter le header */}
      {timeRemainingToday !== null && dailyTimeLimit !== null && (
        <div className="absolute top-4 left-2 right-2 z-20 pointer-events-none">
          <div className="bg-black/80 backdrop-blur-sm rounded-lg p-2 shadow-lg border border-white/10">
            <div className="flex items-center justify-between text-white text-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3 text-blue-400" />
                <span className="font-medium">
                  Temps restant: <span className="text-blue-300">{timeRemainingToday}min</span>
                </span>
              </div>
              <div className="text-white/70">
                Session: {sessionTime}
              </div>
            </div>
            
            {/* Barre de progression du temps */}
            <div className="mt-1">
              <div className="w-full bg-white/20 rounded-full h-1">
                <div 
                  className={`h-1 rounded-full transition-all duration-300 ${
                    timeRemainingToday <= 5 ? 'bg-red-400' : 
                    timeRemainingToday <= 15 ? 'bg-orange-400' : 
                    'bg-blue-400'
                  }`}
                  style={{ 
                    width: `${Math.max(0, (timeRemainingToday / dailyTimeLimit) * 100)}%` 
                  }}
                />
              </div>
            </div>

            {/* Alerte de temps faible */}
            {timeRemainingToday <= 5 && timeRemainingToday > 0 && (
              <div className="flex items-center gap-1 mt-1 text-orange-300 text-xs animate-pulse">
                <span>⚠️</span>
                <span className="font-medium">Plus que {timeRemainingToday}min !</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Alerte de limitation */}
      {showLimitAlert && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-30">
          <div className="bg-card rounded-lg p-6 max-w-md mx-4">
            <PlanLimitAlert
              message="Vous avez atteint votre limite de temps quotidienne."
              onUpgrade={onUpgrade}
              onClose={() => setShowLimitAlert(false)}
              restrictionType="time"
              variant="error"
            />
          </div>
        </div>
      )}

      {/* Lecteur vidéo */}
      <LessonVideoPlayer 
        url={src}
        className="w-full"
        onPlayStateChange={handlePlayStateChange}
      />
    </div>
  );
};
