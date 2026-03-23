import React, { useRef, useEffect, useState } from 'react';

interface NativeVideoPlayerProps {
  src: string;
  poster?: string;
  isActive: boolean; // Pour le preloading
  shouldPlay: boolean; // Pour la lecture
  isMuted: boolean;
  onLoaded: () => void;
  onError: () => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

const NativeVideoPlayer: React.FC<NativeVideoPlayerProps> = ({
  src,
  poster,
  isActive,
  shouldPlay,
  isMuted,
  onLoaded,
  onError,
  onPlayStateChange
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = isMuted;

    let cancelled = false;

    if (!isActive) {
      video.pause();
      if (onPlayStateChange) onPlayStateChange(false);
      return;
    }

    if (shouldPlay) {
      const tryPlay = () => {
        if (cancelled) return;
        const playPromise = video.play();
        if (playPromise) {
          playPromise
            .then(() => { 
                if (!cancelled && onPlayStateChange) onPlayStateChange(true); 
            })
            .catch((err) => {
              if (err.name !== 'AbortError') {
                console.error('Play error:', err);
                if (err.name === 'NotAllowedError') {
                  // Autoplay a été bloqué par le navigateur (souvent car le son est activé manuellement sans interaction)
                  if (!cancelled && onPlayStateChange) onPlayStateChange(false);
                }
              }
            });
        }
      };

      if (video.readyState >= 2) {
        tryPlay();
      } else {
        video.addEventListener('canplay', tryPlay, { once: true });
      }
    } else {
      video.pause();
      if (onPlayStateChange) onPlayStateChange(false);
      // Ne pas reset currentTime à 0 ici sinon pause impossible ?
      // L'implémentation originale resettait à 0 si !isActive.
      // Si on veut juste pauser, on ne reset pas.
    }

    return () => {
      cancelled = true;
    };
  }, [isActive, shouldPlay, isMuted, onPlayStateChange]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => onPlayStateChange?.(true)).catch(() => {});
    } else {
      video.pause();
      onPlayStateChange?.(false);
    }
  };

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      className="absolute inset-0 w-full h-full object-contain cursor-pointer"
      style={{
        width: '100vw',
        height: '100vh',
        objectFit: 'contain'
      }}
      muted={isMuted}
      loop
      playsInline
      preload={isActive ? 'auto' : 'metadata'}
      onClick={togglePlay}
      onLoadedData={onLoaded}
      onError={onError}
    />
  );
};

export default NativeVideoPlayer;
