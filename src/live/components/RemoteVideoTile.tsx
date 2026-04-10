import React, { useEffect, useRef } from 'react';
import { MicOff, VideoOff } from 'lucide-react';
import type { IRemoteVideoTrack } from 'agora-rtc-sdk-ng';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const VIDEO_TRACK_RETRY_DELAY_MS = 600;

interface RemoteVideoTileProps {
  uid: string;
  getRemoteVideoTrack: (uid: string) => IRemoteVideoTrack | undefined;
  label?: string;
  avatarUrl?: string;
  remoteUsers: string[];
  showMicOff?: boolean;
  showCameraOff?: boolean;
  children?: React.ReactNode;
  onRevealControls?: () => void;
}

const RemoteVideoTile: React.FC<RemoteVideoTileProps> = ({
  uid,
  getRemoteVideoTrack,
  label,
  avatarUrl,
  remoteUsers,
  showMicOff,
  showCameraOff,
  children,
  onRevealControls,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tryPlay = () => {
      const track = getRemoteVideoTrack(uid);
      const element = containerRef.current;
      if (element && track) {
        element.innerHTML = '';
        track.play(element, { fit: 'contain' });
      }
    };

    tryPlay();
    const timer = window.setTimeout(tryPlay, VIDEO_TRACK_RETRY_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [uid, getRemoteVideoTrack, remoteUsers]);

  return (
    <div
      className="group relative w-full overflow-hidden rounded-xl bg-zinc-900 aspect-[9/16]"
      onClick={onRevealControls}
      onTouchStart={onRevealControls}
    >
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {!getRemoteVideoTrack(uid) && (
          <Avatar className="h-12 w-12 border-2 border-white/20">
            <AvatarImage src={avatarUrl || ''} />
            <AvatarFallback className="bg-zinc-700 text-sm">
              {label ? label.substring(0, 2).toUpperCase() : '?'}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
      {label && (
        <div className="absolute bottom-1.5 left-1.5 right-1.5">
          <span className="text-white text-[9px] font-semibold bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded-full truncate block text-center">
            {label}
          </span>
        </div>
      )}
      <div className="absolute top-1 right-1 flex flex-col gap-0.5 pointer-events-none">
        {showMicOff && (
          <div className="bg-red-500/85 rounded-full p-0.5">
            <MicOff className="h-2.5 w-2.5 text-white" />
          </div>
        )}
        {showCameraOff && (
          <div className="bg-red-500/85 rounded-full p-0.5">
            <VideoOff className="h-2.5 w-2.5 text-white" />
          </div>
        )}
      </div>
      {children}
    </div>
  );
};

export default RemoteVideoTile;