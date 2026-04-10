import React from 'react';
import { MessageCircle } from 'lucide-react';
import LiveMessageItem from '@/live/components/LiveMessageItem';
import type { LiveMessage } from '@/live/lib/userLiveShared';

interface LiveCommentsOverlayProps {
  messages: LiveMessage[];
  hostId: string;
  isCollapsed: boolean;
  onExpand: () => void;
  onTouchStart: (event: React.TouchEvent<HTMLDivElement>) => void;
  onTouchEnd: (event: React.TouchEvent<HTMLDivElement>) => void;
  commentsScrollRef: React.RefObject<HTMLDivElement | null>;
  hasParticipantPanel: boolean;
}

const LiveCommentsOverlay: React.FC<LiveCommentsOverlayProps> = ({
  messages,
  hostId,
  isCollapsed,
  onExpand,
  onTouchStart,
  onTouchEnd,
  commentsScrollRef,
  hasParticipantPanel,
}) => {
  if (isCollapsed) {
    return (
      <button
        type="button"
        onClick={onExpand}
        className="absolute bottom-24 left-4 z-10 pointer-events-auto flex h-11 min-w-11 items-center justify-center rounded-full bg-black/45 px-3 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/60"
        title="Rouvrir les commentaires"
      >
        <MessageCircle className="h-4 w-4" />
        <span className="ml-2 text-xs font-semibold">Commentaires</span>
      </button>
    );
  }

  return (
    <div
      className={`absolute bottom-20 left-4 z-10 pointer-events-auto ${hasParticipantPanel ? 'right-24' : 'right-16'}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div
        ref={commentsScrollRef}
        className="max-h-[160px] overflow-y-auto space-y-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overscroll-contain touch-pan-y"
      >
        {messages.map((message) => <LiveMessageItem key={message.id} message={message} hostId={hostId} />)}
      </div>
    </div>
  );
};

export default LiveCommentsOverlay;