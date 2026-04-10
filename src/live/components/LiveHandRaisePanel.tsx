import React from 'react';
import { Hand } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { HandRaiseRequest } from '@/live/lib/userLiveShared';

interface LiveHandRaisePanelProps {
  requests: HandRaiseRequest[];
  isHost: boolean;
  isStudioMode: boolean;
  onAccept: (userId: string, userName: string, userAvatar?: string | null) => void;
  onDismiss: (userId: string) => void;
}

const LiveHandRaisePanel: React.FC<LiveHandRaisePanelProps> = ({
  requests,
  isHost,
  isStudioMode,
  onAccept,
  onDismiss,
}) => {
  if (requests.length === 0) {
    return null;
  }

  return (
    <div className={`absolute left-2 bottom-24 z-20 pointer-events-auto max-h-[60vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${isStudioMode ? 'hidden md:flex md:flex-col md:gap-2' : 'flex flex-col gap-2'}`}>
      {requests.map((request) => (
        <div key={request.userId} className="flex flex-col items-center gap-1 bg-black/60 backdrop-blur-sm rounded-xl p-2 w-14">
          <Avatar className="h-9 w-9 border-2 border-amber-400/70">
            <AvatarImage src={request.userAvatar || ''} />
            <AvatarFallback className="bg-zinc-800 text-[10px]">
              {request.userName?.substring(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <span className="text-[8px] text-white/90 text-center truncate w-full leading-tight">
            {request.userName}
          </span>
          {isHost ? (
            <div className="flex gap-1 mt-0.5">
              <button
                onClick={() => onAccept(request.userId, request.userName, request.userAvatar)}
                className="rounded-full bg-green-500/80 px-1.5 py-0.5 hover:bg-green-500 transition-colors text-[10px] text-white font-bold"
                title="Accepter"
              >
                ✓
              </button>
              <button
                onClick={() => onDismiss(request.userId)}
                className="rounded-full bg-red-500/80 px-1.5 py-0.5 hover:bg-red-500 transition-colors text-[10px] text-white font-bold"
                title="Refuser"
              >
                ✗
              </button>
            </div>
          ) : (
            <Hand className="h-3 w-3 text-amber-400 animate-pulse mt-0.5" />
          )}
        </div>
      ))}
    </div>
  );
};

export default LiveHandRaisePanel;