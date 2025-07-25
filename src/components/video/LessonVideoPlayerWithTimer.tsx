
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SubscriptionAlert } from '@/components/chat/SubscriptionAlert';
import { SubscriptionTimer } from '@/components/ui/subscription-timer';
import LessonVideoPlayer from '@/components/LessonVideoPlayer';

interface LessonVideoPlayerWithTimerProps {
  src: string;
  formationId: string;
  timeRemainingToday: number | null;
  dailyTimeLimit: number | null;
  isLimitReached: boolean;
  canPlay: boolean;
  sessionTime: string;
  onUpgrade?: () => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
  className?: string;
}

export const LessonVideoPlayerWithTimer: React.FC<LessonVideoPlayerWithTimerProps> = ({
  src,
  formationId,
  timeRemainingToday,
  dailyTimeLimit,
  isLimitReached,
  canPlay,
  sessionTime,
  onUpgrade,
  onPlayStateChange,
  className = ''
}) => {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [showLimitAlert, setShowLimitAlert] = useState(false);

  // Gérer les changements d'état de lecture
  const handlePlayStateChange = (playing: boolean) => {
    if (!canPlay && playing) {
      setShowLimitAlert(true);
      return;
    }
    
    setIsPlaying(playing);
    onPlayStateChange?.(playing);
  };

  // Arrêter la vidéo si la limite est atteinte
  useEffect(() => {
    if (isLimitReached && isPlaying) {
      setIsPlaying(false);
      onPlayStateChange?.(false);
    }
  }, [isLimitReached, isPlaying, onPlayStateChange]);

  if (isLimitReached) {
    return (
      <div className={`relative bg-black ${className}`}>
        <div className="aspect-video flex flex-col items-center justify-center text-white p-8">
          <Clock size={48} className="mb-4 opacity-60" />
          <h3 className="text-lg font-semibold mb-2">Limite de temps atteinte</h3>
          <p className="text-sm opacity-80 text-center mb-4">
            Vous avez utilisé tout votre temps quotidien pour cette formation.
          </p>
          <SubscriptionAlert
            message="Revenez demain ou passez à un plan supérieur pour continuer."
            onUpgrade={() => navigate(`/formation/${formationId}/pricing`)}
            variant="warning"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Timer en surimpression - amélioré pour être bien visible */}
      {timeRemainingToday !== null && dailyTimeLimit !== null && (
        <div className="absolute top-2 left-2 right-2 z-20 pointer-events-none">
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
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <SubscriptionAlert
              message="Vous avez atteint votre limite de temps quotidienne."
              onUpgrade={onUpgrade}
              variant="error"
            />
            <Button
              variant="ghost"
              onClick={() => setShowLimitAlert(false)}
              className="mt-4 w-full"
            >
              Fermer
            </Button>
          </div>
        </div>
      )}

      {/* Lecteur vidéo */}
      <LessonVideoPlayer 
        url={src}
        className="w-full"
      />
    </div>
  );
};
