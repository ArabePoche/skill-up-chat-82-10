import React, { useRef, useEffect, useState } from 'react';

interface YouTubePlayerProps {
  videoId: string;
  isActive: boolean;
  shouldPlay: boolean;
  isMuted: boolean;
  onLoaded: () => void;
  onError: () => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoId,
  isActive,
  shouldPlay,
  isMuted,
  onLoaded,
  onError,
  onPlayStateChange
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);

  const postCommand = (command: 'playVideo' | 'pauseVideo' | 'mute' | 'unMute') => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({
        event: 'command',
        func: command,
        args: [],
      }),
      '*',
    );
  };

  useEffect(() => {
    if (!isReady) return;

    if (!isActive) {
      postCommand('pauseVideo');
      onPlayStateChange?.(false);
      return;
    }

    if (isMuted) {
      postCommand('mute');
    } else {
      postCommand('unMute');
    }

    if (shouldPlay) {
      postCommand('playVideo');
      onPlayStateChange?.(true);
    } else {
      postCommand('pauseVideo');
      onPlayStateChange?.(false);
    }
  }, [isActive, shouldPlay, isMuted, isReady, onPlayStateChange]);

  return (
    <iframe
      ref={iframeRef}
      src={`https://www.youtube.com/embed/${videoId}?autoplay=${isActive ? 1 : 0}&mute=${isMuted ? 1 : 0}&loop=1&controls=0&showinfo=0&rel=0&modestbranding=1&playlist=${videoId}&enablejsapi=1&playsinline=1`}
      className="absolute inset-0 w-full h-full object-cover"
      style={{ border: 'none' }}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      onLoad={() => {
        setIsReady(true);
        onLoaded();
      }}
      onError={onError}
    />
  );
};

export default YouTubePlayer;
