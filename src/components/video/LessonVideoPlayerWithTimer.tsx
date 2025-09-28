
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
    isActive: true // Toujours actif pour la mesure du temps
  });

  const timeCheck = canUseTime();
  const canPlay = timeCheck.allowed;

  // Gérer les changements d'état de lecture
  const handlePlayStateChange = (playing: boolean) => {
    console.log('🎥 Play state change:', playing, 'canPlay:', canPlay, 'isTimerActive:', isTimerActive);
    
    if (!canPlay && playing) {
      console.log('❌ Cannot play - showing limit alert');
      setShowLimitAlert(true);
      return;
    }
    
    setIsPlaying(playing);
    onPlayStateChange?.(playing);

    // Démarrer/arrêter le timer selon l'état de lecture
    // Forcer l'arrêt/démarrage même si l'état semble déjà correct
    if (playing) {
      console.log('▶️ Starting timer...');
      startTimer();
    } else {
      console.log('⏸️ Stopping timer...');
      stopTimer();
    }
  };

  // Arrêter automatiquement le timer si on quitte la page
  useEffect(() => {
    return () => {
      if (isTimerActive) {
        stopTimer();
      }
    };
  }, [isTimerActive, stopTimer]);

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
      {/* Lecteur vidéo */}
      <LessonVideoPlayer 
        url={src}
        className="w-full"
        onPlayStateChange={handlePlayStateChange}
      />

      {/* Timer en bas de la vidéo */}
      {timeRemainingToday !== null && dailyTimeLimit !== null && (
        <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
          <div className="bg-gradient-to-t from-black/90 via-black/80 to-transparent backdrop-blur-sm p-3 pb-4 shadow-lg">
            <div className="flex items-center justify-between text-white text-sm mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="font-medium">
                  Temps restant: <span className="text-blue-300 font-bold">{timeRemainingToday}min</span>
                </span>
              </div>
              <div className="text-white/80">
                Session: {sessionTime}
              </div>
            </div>
            
            {/* Barre de progression du temps */}
            <div className="w-full bg-white/20 rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  timeRemainingToday <= 5 ? 'bg-red-400 animate-pulse' : 
                  timeRemainingToday <= 15 ? 'bg-orange-400' : 
                  'bg-blue-400'
                }`}
                style={{ 
                  width: `${Math.max(0, (timeRemainingToday / dailyTimeLimit) * 100)}%` 
                }}
              />
            </div>

            {/* Alerte de temps faible */}
            {timeRemainingToday <= 5 && timeRemainingToday > 0 && (
              <div className="flex items-center justify-center gap-1 mt-2 text-orange-300 text-xs animate-pulse">
                <span>⚠️</span>
                <span className="font-medium">Attention ! Plus que {timeRemainingToday} minute{timeRemainingToday > 1 ? 's' : ''} !</span>
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
    </div>
  );
};
