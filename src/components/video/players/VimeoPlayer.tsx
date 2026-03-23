import React, { useRef, useEffect, useState } from 'react';

interface VimeoPlayerProps {
  videoId: string;
  isActive: boolean;
  shouldPlay: boolean;
  isMuted: boolean;
  onLoaded: () => void;
  onError: () => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
  uniqueId: string;
}

const VimeoPlayer: React.FC<VimeoPlayerProps> = ({
  videoId,
  isActive,
  shouldPlay,
  isMuted,
  onLoaded,
  onError,
  onPlayStateChange,
  uniqueId
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);

  const postCommand = (method: 'play' | 'pause' | 'setVolume', value?: number) => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        method,
        value,
      },
      '*',
    );
  };

  useEffect(() => {
    if (!isReady) return;

    if (!isActive) {
      postCommand('pause');
      onPlayStateChange?.(false);
      return;
    }

    if (isMuted) {
      postCommand('setVolume', 0);
    } else {
      postCommand('setVolume', 1);
    }

    if (shouldPlay) {
      postCommand('play');
      onPlayStateChange?.(true);
    } else {
      postCommand('pause');
      onPlayStateChange?.(false);
    }
  }, [isActive, shouldPlay, isMuted, isReady, onPlayStateChange]);

  return (
    <iframe
      ref={iframeRef}
      src={`https://player.vimeo.com/video/${videoId}?autoplay=${isActive ? 1 : 0}&loop=1&muted=${isMuted ? 1 : 0}&controls=0&background=1&api=1&player_id=${uniqueId}`}
      className="absolute inset-0 w-full h-full object-cover"
      style={{ border: 'none' }}
      allow="autoplay; fullscreen; picture-in-picture"
      allowFullScreen
      onLoad={() => {
        setIsReady(true);
        onLoaded();
      }}
      onError={onError}
    />
  );
};

export default VimeoPlayer;
