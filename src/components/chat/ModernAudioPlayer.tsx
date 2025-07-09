
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ModernAudioPlayerProps {
  fileUrl: string;
  fileName: string;
  duration?: number;
  className?: string;
}

const ModernAudioPlayer: React.FC<ModernAudioPlayerProps> = ({
  fileUrl,
  fileName,
  duration,
  className = ""
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [isLoading, setIsLoading] = useState(true);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(fileUrl);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      setTotalDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, [fileUrl]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || totalDuration === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const seekTime = percentage * totalDuration;

    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className={`bg-gradient-to-r from-green-50 to-emerald-50 p-3 sm:p-4 rounded-2xl border border-green-200 shadow-sm max-w-xs sm:max-w-sm ${className}`}>
      {/* Header avec icône et nom */}
      <div className="flex items-center gap-2 sm:gap-3 mb-3">
        <div className="bg-green-500 p-2 rounded-full text-white flex-shrink-0">
          <Volume2 size={14} className="sm:w-4 sm:h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-medium text-xs sm:text-sm text-gray-800 block truncate">
            Message vocal
          </span>
          <span className="text-xs text-gray-500">
            {!isLoading ? formatTime(totalDuration) : 'Chargement...'}
          </span>
        </div>
      </div>
      
      {/* Contrôles de lecture */}
      <div className="flex items-center gap-2 sm:gap-3 mb-3">
        {/* Bouton play/pause moderne */}
        <Button
          onClick={togglePlayPause}
          disabled={isLoading}
          className="bg-green-500 hover:bg-green-600 w-10 h-10 sm:w-12 sm:h-12 rounded-full p-0 shadow-md transition-all duration-200 hover:scale-105 flex-shrink-0"
        >
          {isPlaying ? (
            <Pause size={16} className="sm:w-5 sm:h-5 text-white" />
          ) : (
            <Play size={16} className="sm:w-5 sm:h-5 text-white ml-0.5" />
          )}
        </Button>

        {/* Barre de progression cliquable */}
        <div className="flex-1 space-y-1">
          <div 
            className="bg-green-200 rounded-full h-2 cursor-pointer relative overflow-hidden"
            onClick={handleSeek}
          >
            <div 
              className="bg-green-500 h-full rounded-full transition-all duration-150 relative"
              style={{ width: `${progressPercentage}%` }}
            >
              {/* Animation de pulse pendant la lecture */}
              {isPlaying && (
                <div className="absolute inset-0 bg-green-400 rounded-full animate-pulse opacity-60"></div>
              )}
            </div>
          </div>
          
          {/* Temps */}
          <div className="flex justify-between text-xs text-gray-500">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(totalDuration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernAudioPlayer;
