import type { LiveScreen } from '@/live/types';
import { generateShareableLink } from '@/hooks/useDeeplinks';

export type LiveVisibility = 'public' | 'friends_followers';

export interface HostProfile {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
}

export interface LiveStreamRecord {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  visibility: LiveVisibility;
  status: 'active' | 'ended' | 'scheduled';
  agora_channel: string;
  started_at: string;
  ended_at: string | null;
  entry_price: number | null;
  scheduled_at: string | null;
  max_attendees: number | null;
  host: HostProfile | null;
}

export interface LiveRegistrant {
  buyer_id: string;
  amount: number;
  creator_amount: number;
  status: string;
  profiles: {
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  } | null;
}

export interface LiveMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  type: 'comment' | 'gift' | 'join' | 'raise_hand';
  content: string;
  currency?: string;
  amount?: number;
  createdAt: string;
}

export interface HandRaiseRequest {
  userId: string;
  userName: string;
  userAvatar?: string | null;
}

export interface AcceptedParticipant extends HandRaiseRequest {
  agoraUid?: string;
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
}

export interface ParticipantControlPayload {
  targetUserId: string;
  action: 'mic_on' | 'mic_off' | 'camera_on' | 'camera_off' | 'stop';
}

export interface GiftOverlayState {
  id: string;
  userName: string;
  currency?: string;
  content: string;
}

export type WhiteboardHistoryMap = Record<string, any[]>;

export interface LiveGiftTotals {
  soumboulah_cash: number;
  soumboulah_bonus: number;
  habbah: number;
}

export const EMPTY_LIVE_GIFT_TOTALS: LiveGiftTotals = {
  soumboulah_cash: 0,
  soumboulah_bonus: 0,
  habbah: 0,
};

export const getTicketPageUrl = (liveId: string) =>
  generateShareableLink(`/live/${liveId}/ticket`);

export const getLivePageUrl = (liveId: string) =>
  generateShareableLink(`/live/${liveId}`);

export const getDisplayName = (
  profile?: HostProfile | { first_name?: string | null; last_name?: string | null; username?: string | null } | null,
) => {
  if (!profile) return 'Utilisateur';
  if (profile.first_name && profile.last_name) return `${profile.first_name} ${profile.last_name}`;
  return profile.username || 'Utilisateur';
};

export const getActiveWhiteboardBoardId = (screen: LiveScreen | null): string | null => {
  if (!screen || screen.type !== 'teaching_studio') {
    return null;
  }

  const activeScene = screen.studio.scenes.find((scene) => scene.id === screen.studio.activeSceneId) || screen.studio.scenes[0];
  const activeWhiteboard = activeScene?.elements.find((element) => element.type === 'whiteboard');

  if (!activeScene || !activeWhiteboard) {
    return null;
  }

  return `${activeScene.id}:${activeWhiteboard.id}`;
};

export const isTrackedLiveGiftCurrency = (currency?: string | null): currency is keyof LiveGiftTotals => {
  return currency === 'soumboulah_cash' || currency === 'soumboulah_bonus' || currency === 'habbah';
};

export const extractPresenceEntries = (value: unknown): Record<string, any>[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(item => extractPresenceEntries(item));
  if (typeof value !== 'object') return [];

  const record = value as Record<string, any>;
  if (Array.isArray(record.metas)) return record.metas.flatMap(item => extractPresenceEntries(item));

  if ('user_id' in record || 'userId' in record || 'role' in record) return [record];
  return Object.values(record).flatMap(item => extractPresenceEntries(item));
};

export const resolvePresenceUserId = (presence: Record<string, any> | null | undefined, fallbackKey?: string): string | null => {
  if (!presence) return fallbackKey || null;

  const userId = presence.user_id || presence.userId || fallbackKey;
  return typeof userId === 'string' && userId.length > 0 ? userId : null;
};

export const mergePresenceEntries = (
  currentEntries: Record<string, any>[],
  incomingEntries: unknown,
  fallbackKey?: string,
): Record<string, any>[] => {
  const merged = new Map<string, Record<string, any>>();

  currentEntries.forEach((presence) => {
    const userId = resolvePresenceUserId(presence);
    if (!userId) return;
    merged.set(userId, presence);
  });

  extractPresenceEntries(incomingEntries).forEach((presence) => {
    const userId = resolvePresenceUserId(presence, fallbackKey);
    if (!userId) return;

    const existing = merged.get(userId);
    const isMoreRecent = presence.online_at && (!existing?.online_at || presence.online_at > existing.online_at);
    const hasBetterRole = (presence.role === 'participant' || presence.role === 'host') && existing?.role === 'viewer';

    if (!existing || isMoreRecent || hasBetterRole) {
      merged.set(userId, {
        ...existing,
        ...presence,
        user_id: userId,
        presence_ref: fallbackKey ?? existing?.presence_ref,
      });
    }
  });

  return Array.from(merged.values());
};

export const extractPresenceUserIds = (entries: unknown, fallbackKey?: string): string[] => {
  const ids = new Set<string>();

  if (fallbackKey) {
    ids.add(fallbackKey);
  }

  extractPresenceEntries(entries).forEach((presence) => {
    const userId = resolvePresenceUserId(presence, fallbackKey);
    if (userId) {
      ids.add(userId);
    }
  });

  return Array.from(ids);
};

export const removePresenceEntries = (
  currentEntries: Record<string, any>[],
  leavingEntries: unknown,
  fallbackKey?: string,
): Record<string, any>[] => {
  const leavingIds = new Set(extractPresenceUserIds(leavingEntries, fallbackKey));

  return currentEntries.filter((presence) => {
    const userId = resolvePresenceUserId(presence);
    return Boolean(userId && !leavingIds.has(userId));
  });
};

export const syncPresenceEntries = (presenceState: Record<string, unknown>): Record<string, any>[] => {
  return Object.entries(presenceState).reduce<Record<string, any>[]>((currentEntries, [presenceKey, presences]) => {
    return mergePresenceEntries(currentEntries, presences, presenceKey);
  }, []);
};

export const formatScAmount = (sc: number) =>
  sc.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export const fcfaToScRounded = (priceFcfa: number, rate: number): number => {
  if (!rate || rate <= 0) return 0;
  return Math.round((priceFcfa / rate) * 100) / 100;
};