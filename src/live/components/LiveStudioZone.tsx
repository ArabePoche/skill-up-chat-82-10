/**
 * Zone d'affichage du studio d'enseignement dans le live
 */
import React from 'react';
import { LiveTeachingStudioRunner } from '@/live/components/LiveTeachingStudioRunner';
import type { LiveScreen, LiveTeachingStudio } from '@/live/types';
import type { WhiteboardSyncedAction, WhiteboardHistoryAction } from '@/live/lib/liveWhiteboard';

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
  if (publicLiveScreen.type !== 'teaching_studio') return null;

  const studio = publicLiveScreen.studio;

  return (
    <div className="flex-[2] md:flex-[3] relative bg-zinc-950 border-b md:border-b-0 md:border-r border-white/10 flex flex-col items-center justify-center p-0">
      <LiveTeachingStudioRunner
        studio={studio}
        isHost={isHost}
        onSceneChange={(sceneId) => {
          onScheduleStudioBroadcast({
            ...publicLiveScreen,
            studio: {
              ...studio,
              activeSceneId: sceneId,
            },
          } as LiveScreen);
        }}
        onStudioChange={(updatedStudio) => {
          onScheduleStudioBroadcast({
            ...publicLiveScreen,
            studio: updatedStudio,
          } as LiveScreen);
        }}
        onWhiteboardAction={(action) => {
          const boardId = studio.activeSceneId;
          onWhiteboardAction(boardId, action);
        }}
        remoteWhiteboardAction={remoteWhiteboardAction as WhiteboardSyncedAction | null}
        remoteWhiteboardHistories={remoteWhiteboardHistories as Record<string, WhiteboardHistoryAction[]>}
      />
    </div>
  );
};
