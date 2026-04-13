// Constantes UI et medias reutilisees par les etapes du flux de creation video.
import type { BaseSoundOption, CreationMethod, FlowStep } from './types';

export const STICKERS = ['🔥', '✨', '🎯', '❤️', '🚀', '🎉'];
export const DEFAULT_THUMBNAIL_RATIO = 0.08;
export const MIN_OVERLAY_SCALE = 0.6;
export const MAX_OVERLAY_SCALE = 2.6;
export const BASE_SOUNDS: BaseSoundOption[] = [
  { id: 'notification-default', label: 'Pulse', path: '/sounds/notification-default.mp3' },
  { id: 'notification-friend', label: 'Echo', path: '/sounds/notification-friend.mp3' },
  { id: 'notification-order', label: 'Drive', path: '/sounds/notification-order.mp3' },
  { id: 'ringtone-call', label: 'Wave', path: '/sounds/ringtone-call.mp3' },
];

export const getDefaultCreationState = () => ({
  step: 'details' as FlowStep,
  method: 'url' as CreationMethod,
});