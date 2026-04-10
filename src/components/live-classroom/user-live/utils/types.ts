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
