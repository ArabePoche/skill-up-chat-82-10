// Helpers locaux du flux de creation video pour les overlays et libelles derives.
import type { OverlayTransform } from '@/utils/videoComposer';
import { MAX_OVERLAY_SCALE, MIN_OVERLAY_SCALE } from './constants';

export const getDisplayName = (profile?: { first_name?: string | null; last_name?: string | null; username?: string | null } | null) => {
  if (profile?.first_name && profile?.last_name) {
    return `${profile.first_name} ${profile.last_name}`;
  }

  return profile?.username || 'Un utilisateur';
};

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const createOverlayId = () => `overlay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const clampOverlayTransform = (transform: OverlayTransform): OverlayTransform => {
  const safeScale = clamp(transform.scale, MIN_OVERLAY_SCALE, MAX_OVERLAY_SCALE);
  const padding = Math.min(0.3, 0.08 + (safeScale - 1) * 0.05);

  return {
    x: clamp(transform.x, padding, 1 - padding),
    y: clamp(transform.y, padding, 1 - padding),
    scale: safeScale,
  };
};