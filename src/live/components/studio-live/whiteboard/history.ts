import type { WhiteboardHistoryAction, WhiteboardImage, WhiteboardText } from '@/live/lib/liveWhiteboard';

export const getWhiteboardHistorySignature = (items: WhiteboardHistoryAction[]) => JSON.stringify(items);

export const createWhiteboardActionId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const appendWhiteboardHistory = (
  history: WhiteboardHistoryAction[],
  action: WhiteboardHistoryAction,
) => [...history, action];

export const updateWhiteboardHistoryItem = (
  history: WhiteboardHistoryAction[],
  targetId: string,
  targetType: 'image' | 'text',
  updates: Partial<WhiteboardImage & WhiteboardText>,
): WhiteboardHistoryAction[] => {
  return history.map((action) => {
    if (action.type !== targetType || action.payload.id !== targetId) {
      return action;
    }

    return {
      ...action,
      payload: {
        ...action.payload,
        ...updates,
      },
    } as WhiteboardHistoryAction;
  });
};