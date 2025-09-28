import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Lock, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePlanLimits } from '@/plan-limits/hooks/usePlanLimits';
import { PlanLimitAlert } from '@/plan-limits/components/PlanLimitAlert';
import LessonVideoPlayer from '@/components/LessonVideoPlayer';

interface RestrictedVideoPlayerProps {
  src: string;
  formationId: string;
  onUpgrade?: () => void;
  poster?: string;
  className?: string;
}

export const RestrictedVideoPlayer: React.FC<RestrictedVideoPlayerProps> = ({
  src,
  formationId,
  onUpgrade,
  poster,
  className = ''
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const {
    sessionTime,
    timeRemainingToday,
    dailyTimeLimit,
    isTimeReached,
    canUseTime,
    startTimer,
    stopTimer
  } = usePlanLimits({ 
    formationId, 
    context: 'video', 
    isActive: isPlaying 
  });

  const timeCheck = canUseTime();
  const canPlay = timeCheck.allowed;

  const handlePlayPause = () => {
    if (!canPlay) {
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
      stopTimer();
    } else {
      video.play();
      setIsPlaying(true);
      startTimer();
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video) {
      setCurrentTime(video.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video) {
      setDuration(video.duration);
    }
  };

  // Arrêter la vidéo quand la limite est atteinte
  useEffect(() => {
    if (isTimeReached && isPlaying) {
      const video = videoRef.current;
      if (video) {
        video.pause();
        setIsPlaying(false);
        stopTimer();
      }
    }
  }, [isTimeReached, isPlaying, stopTimer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (isTimeReached) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <Lock size={48} className="text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Limite de temps atteinte</h3>
          <p className="text-muted-foreground mb-4">
            Vous avez utilisé tout votre temps quotidien pour cette formation.
          </p>
          <PlanLimitAlert
            message="Revenez demain ou passez à un plan supérieur pour continuer à regarder les vidéos."
            onUpgrade={onUpgrade}
            restrictionType="time"
            variant="warning"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <LessonVideoPlayer 
        url={src}
        className="w-full h-auto"
      />
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        className="w-full h-auto absolute inset-0 opacity-0"
        onClick={handlePlayPause}
      />

      {/* Overlay de contrôles */}
      <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
        <Button
          variant="secondary"
          size="lg"
          onClick={handlePlayPause}
          disabled={!canPlay}
          className="bg-white/20 backdrop-blur-sm hover:bg-white/30"
        >
          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </Button>
      </div>

      {/* Barre de progression */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
        <div className="flex items-center space-x-2 text-white text-sm">
          <span>{formatTime(currentTime)}</span>
          <div className="flex-1 bg-white/20 rounded-full h-1">
            <div
              className="bg-white h-full rounded-full transition-all duration-200"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Informations de session et limites */}
        <div className="flex justify-between items-center mt-1 text-xs text-white/80">
          <span>Session: {sessionTime}</span>
          {timeRemainingToday !== null && dailyTimeLimit !== null && (
            <span className="flex items-center space-x-1">
              <Clock size={12} />
              <span>Reste: {timeRemainingToday}min/{dailyTimeLimit}min</span>
            </span>
          )}
        </div>
      </div>

      {/* Alerte de temps faible */}
      {timeRemainingToday !== null && timeRemainingToday <= 5 && timeRemainingToday > 0 && (
        <div className="absolute top-4 left-4 right-4">
          <PlanLimitAlert
            message={`Plus que ${timeRemainingToday} minute${timeRemainingToday > 1 ? 's' : ''} restante${timeRemainingToday > 1 ? 's' : ''} aujourd'hui !`}
            onUpgrade={onUpgrade}
            restrictionType="time"
            variant="warning"
          />
        </div>
      )}
    </div>
  );
};