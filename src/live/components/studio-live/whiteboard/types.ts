import type { WhiteboardHistoryAction, WhiteboardImage, WhiteboardSyncedAction, WhiteboardText } from '@/live/lib/liveWhiteboard';

export interface WhiteboardProps {
  boardId: string;
  isHost: boolean;
  onWhiteboardAction?: (action: WhiteboardSyncedAction) => void;
  remoteWhiteboardAction?: WhiteboardSyncedAction | null;
  historySnapshot?: WhiteboardHistoryAction[];
}

export interface TextDraft {
  canvasX: number;
  canvasY: number;
  screenX: number;
  screenY: number;
  value: string;
}

export interface DragState {
  targetId: string;
  targetType: 'image' | 'text';
  mode: 'move' | 'resize';
  offsetX: number;
  offsetY: number;
  originX: number;
  originY: number;
  originWidth?: number;
  originHeight?: number;
}

export interface SelectionState {
  id: string;
  type: 'image' | 'text';
}

export interface PendingTransformPayload {
  targetId: string;
  targetType: 'image' | 'text';
  updates: Partial<WhiteboardImage & WhiteboardText>;
}