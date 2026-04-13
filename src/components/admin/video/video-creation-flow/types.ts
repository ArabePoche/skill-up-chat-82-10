// Types partages du flux de creation de video decoupe en sous-composants.
import type { OverlayTransform, StickerOverlayItem, TextOverlayItem } from '@/utils/videoComposer';
import type { LiveTeachingStudio } from '@/live/types';

export type CreationMethod = 'record' | 'upload' | 'url';
export type FlowStep = 'record' | 'finalize' | 'details' | 'live';
export type FinalizeOverlay = 'sticker' | 'text' | 'sound' | null;
export type LiveVisibility = 'public' | 'friends_followers';
export type EditableOverlayKind = 'sticker' | 'text';
export type OverlaySelection = { kind: EditableOverlayKind; id: string } | null;

export interface VideoCreationFlowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialStep?: FlowStep;
  initialMethod?: CreationMethod | null;
  initialSourceVideoFile?: File | null;
}

export interface VideoFormData {
  title: string;
  description: string;
  video_type: 'lesson' | 'promo' | 'classic';
  formation_id: string;
}

export interface LiveFormData {
  title: string;
  description: string;
  visibility: LiveVisibility;
  isPaid: boolean;
  entryPrice: string;
  isScheduled: boolean;
  scheduledDate: string;
  scheduledTime: string;
  maxAttendees: string;
}

export interface BaseSoundOption {
  id: string;
  label: string;
  path: string;
}

export interface FormationOption {
  id: string;
  title: string;
  author_id?: string | null;
}

export interface OverlayPointerInteraction {
  kind: EditableOverlayKind;
  overlayId: string;
  mode: 'drag' | 'resize';
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startTransform: OverlayTransform;
}

export interface OverlayTouchInteraction {
  kind: EditableOverlayKind;
  overlayId: string;
  mode: 'drag' | 'pinch';
  startTransform: OverlayTransform;
  startCenterX: number;
  startCenterY: number;
  startDistance: number;
}

export interface FinalizeStepOverlayHandlers {
  beginPointerInteraction: (event: React.PointerEvent<HTMLDivElement | HTMLButtonElement>, kind: EditableOverlayKind, overlayId: string, mode: 'drag' | 'resize') => void;
  handlePointerMove: (event: React.PointerEvent<HTMLDivElement>, kind: EditableOverlayKind, overlayId: string) => void;
  endPointerInteraction: (event: React.PointerEvent<HTMLDivElement>, kind: EditableOverlayKind, overlayId: string) => void;
  handleTouchStart: (event: React.TouchEvent<HTMLDivElement>, kind: EditableOverlayKind, overlayId: string) => void;
  handleTouchMove: (event: React.TouchEvent<HTMLDivElement>, kind: EditableOverlayKind, overlayId: string) => void;
  handleTouchEnd: (event: React.TouchEvent<HTMLDivElement>, kind: EditableOverlayKind, overlayId: string) => void;
}

export interface LiveStudioEditorState {
  preparedStudio: LiveTeachingStudio | null;
  isStudioEditorOpen: boolean;
  setIsStudioEditorOpen: (open: boolean) => void;
  setPreparedStudio: (studio: LiveTeachingStudio | null) => void;
}

export type StickerOverlayList = StickerOverlayItem[];
export type TextOverlayList = TextOverlayItem[];