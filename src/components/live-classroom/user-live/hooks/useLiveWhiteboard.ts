import { useCallback, useRef, useState } from 'react';
import type { WhiteboardHistoryMap } from '../utils/types';
import type { LiveScreen } from '@/live/types';

export const useLiveWhiteboard = (
  isHost: boolean,
  stableUserId: string,
  presenceChannelRef: React.MutableRefObject<any>
) => {
  const [whiteboardHistories, setWhiteboardHistories] = useState<WhiteboardHistoryMap>({});
  const whiteboardHistoriesRef = useRef<WhiteboardHistoryMap>({});
  const [remoteWhiteboardAction, setRemoteWhiteboardAction] = useState<any>(null);

  const updateWhiteboardHistories = useCallback((updater: WhiteboardHistoryMap | ((current: WhiteboardHistoryMap) => WhiteboardHistoryMap)) => {
    setWhiteboardHistories((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater;
      whiteboardHistoriesRef.current = next;
      return next;
    });
  }, []);

  const applyWhiteboardActionToHistories = useCallback((current: WhiteboardHistoryMap, action: any): WhiteboardHistoryMap => {
    const boardId = action?.boardId;
    if (!boardId || typeof boardId !== 'string') return current;

    const boardHistory = Array.isArray(current[boardId]) ? current[boardId] : [];

    if (action.type === 'clear') return { ...current, [boardId]: [] };

    if (action.type === 'sync_full' && Array.isArray(action.history)) {
      return { ...current, [boardId]: action.history };
    }

    if (action.type === 'item_transform' && action.payload?.targetId && action.payload?.targetType) {
      return {
        ...current,
        [boardId]: boardHistory.map((entry) => {
          if (entry.type !== action.payload.targetType || entry.payload?.id !== action.payload.targetId) {
            return entry;
          }
          return {
            ...entry,
            payload: { ...entry.payload, ...(action.payload.updates || {}) },
          };
        }),
      };
    }

    if (action.type === 'stroke' || action.type === 'text' || action.type === 'image') {
      return { ...current, [boardId]: [...boardHistory, action] };
    }

    return current;
  }, []);

  const requestWhiteboardState = useCallback((boardId: string, reason: string = 'viewer_board_sync') => {
    if (isHost || !presenceChannelRef.current || !boardId) return;

    void presenceChannelRef.current.send({
      type: 'broadcast',
      event: 'request_whiteboard_state',
      payload: { requesterUserId: stableUserId, boardId, reason },
    });
  }, [isHost, stableUserId, presenceChannelRef]);

  const getActiveWhiteboardBoardId = (screen: LiveScreen | null): string | null => {
    if (!screen || screen.type !== 'teaching_studio') return null;
    const activeScene = screen.studio.scenes.find((scene) => scene.id === screen.studio.activeSceneId) || screen.studio.scenes[0];
    const activeWhiteboard = activeScene?.elements.find((element) => element.type === 'whiteboard');
    if (!activeScene || !activeWhiteboard) return null;
    return `${activeScene.id}:${activeWhiteboard.id}`;
  };

  const handleWhiteboardAction = (boardId: string, action: any) => {
    if (!presenceChannelRef.current) return;
    presenceChannelRef.current.send({
      type: 'broadcast',
      event: 'whiteboard_update',
      payload: { boardId, action },
    });
    updateWhiteboardHistories(current => 
      applyWhiteboardActionToHistories(current, action)
    );
  };

  return {
    whiteboardHistories,
    whiteboardHistoriesRef,
    updateWhiteboardHistories,
    applyWhiteboardActionToHistories,
    requestWhiteboardState,
    getActiveWhiteboardBoardId,
    handleWhiteboardAction,
    remoteWhiteboardAction,
    setRemoteWhiteboardAction,
  };
};
