import React from 'react';
import { Layers3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LiveScreenDisplay from '@/live/components/LiveScreenDisplay';
import type { LiveScreen } from '@/live/types';

interface LiveCameraZoneProps {
  isStudioMode: boolean;
  isHost: boolean;
  videoContainerRef: React.RefObject<HTMLDivElement>;
  publicLiveScreen: LiveScreen | null;
  privateLiveScreen: LiveScreen | null;
  onOpenScreenManager: () => void;
}

export const LiveCameraZone: React.FC<LiveCameraZoneProps> = ({
  isStudioMode,
  isHost,
  videoContainerRef,
  publicLiveScreen,
  privateLiveScreen,
  onOpenScreenManager,
}) => {
  if (isStudioMode) {
    return (
      <div className="flex-[1] md:flex-[1.5] relative bg-black border-l border-white/5 h-[40vh] md:h-full">
        <div className="absolute inset-0">
          <div ref={videoContainerRef} className="h-full w-full object-cover" />
        </div>
        <div className="absolute top-2 right-2 flex flex-col gap-2">
          {isHost && (
            <Button
              size="sm"
              variant="secondary"
              className="bg-zinc-800/80 hover:bg-zinc-700 text-white border-zinc-700"
              onClick={onOpenScreenManager}
            >
              <Layers3 className="h-4 w-4 mr-2" />
              Scènes
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-0">
      <div ref={videoContainerRef} className="h-full w-full object-cover" />
      <LiveScreenDisplay screen={publicLiveScreen} />
      {isHost && privateLiveScreen && (
        <div className="absolute bottom-20 left-4 z-20 w-72">
          <LiveScreenDisplay screen={privateLiveScreen} variant="private" isHost />
        </div>
      )}
    </div>
  );
};
