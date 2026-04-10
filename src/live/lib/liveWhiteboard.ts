export type WhiteboardTool = 'pen' | 'eraser' | 'type' | 'move';

export interface WhiteboardPoint {
  x: number;
  y: number;
}

export interface WhiteboardStroke {
  id: string;
  tool: 'pen' | 'eraser';
  color: string;
  strokeWidth: number;
  points: WhiteboardPoint[];
}

export interface WhiteboardText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
}

export interface WhiteboardImage {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type WhiteboardHistoryAction =
  | { type: 'stroke'; payload: WhiteboardStroke }
  | { type: 'text'; payload: WhiteboardText }
  | { type: 'image'; payload: WhiteboardImage };

export type WhiteboardRuntimeAction =
  | WhiteboardHistoryAction
  | { type: 'stroke_update'; payload: WhiteboardStroke }
  | {
      type: 'item_transform';
      payload: {
        targetId: string;
        targetType: 'image' | 'text';
        updates: Partial<WhiteboardImage & WhiteboardText>;
      };
    }
  | { type: 'sync_full'; history: WhiteboardHistoryAction[] }
  | { type: 'clear' };

export type WhiteboardSyncedAction = WhiteboardRuntimeAction & {
  boardId: string;
};