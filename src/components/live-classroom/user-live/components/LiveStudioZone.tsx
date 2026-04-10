import React from 'react';
import { LiveTeachingStudioRunner } from '@/live/components/LiveTeachingStudioRunner';
import type { LiveScreen } from '@/live/types';

interface LiveStudioZoneProps {
  publicLiveScreen: LiveScreen;
  isHost: boolean;
  onScheduleStudioBroadcast: (screen: LiveScreen) => void;
  onWhiteboardAction: (boardId: string, action: unknown) => void;
  remoteWhiteboardAction: unknown;
  remoteWhiteboardHistories: Record<string, unknown[]>;
}

export const LiveStudioZone: React.FC<LiveStudioZoneProps> = ({
  publicLiveScreen,
  isHost,
  onScheduleStudioBroadcast,
  onWhiteboardAction,
  remoteWhiteboardAction,
  remoteWhiteboardHistories,
}) => {
  return (
    <div className="flex-[2] md:flex-[3] relative bg-zinc-950 border-b md:border-b-0 md:border-r border-white/10 flex flex-col items-center justify-center p-0">
      <LiveTeachingStudioRunner
        studio={publicLiveScreen.studio}
        isHost={isHost}
        onSceneChange={(sceneId) => {
          onScheduleStudioBroadcast({
            ...publicLiveScreen,
            studio: {
              ...publicLiveScreen.studio,
              activeSceneId: sceneId,
            },
          } as LiveScreen);
        }}
        onStudioChange={onScheduleStudioBroadcast}
        onWhiteboardAction={onWhiteboardAction}
        remoteWhiteboardAction={remoteWhiteboardAction}
        remoteWhiteboardHistories={remoteWhiteboardHistories}
      />
    </div>
  );
};
