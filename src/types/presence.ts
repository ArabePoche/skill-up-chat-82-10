// Types pour le système de présence en temps réel

export type PresenceStatus = 'online' | 'idle' | 'offline';

export interface UserPresence {
  user_id: string;
  status: PresenceStatus;
  last_active: string;
  username?: string;
  avatar_url?: string;
}

export interface PresenceState {
  [key: string]: UserPresence[];
}
