import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  extractPresenceEntries, 
  mergePresenceEntries, 
  removePresenceEntries, 
  syncPresenceEntries 
} from '../utils/presenceUtils';
import { isLiveScreen } from '@/live/types';
import type { LiveScreen } from '@/live/types';
import type { AcceptedParticipant, LiveMessage } from '../utils/types';

interface UseLivePresenceProps {
  stableStreamId?: string;
  stableHostId?: string;
  stableUserId: string;
  stableDisplayName: string;
  stableAvatarUrl: string | null;
  isHost: boolean;
  isAcceptedParticipant: boolean;
  agoraState: {
    localUid?: string | number | null;
    isMuted: boolean;
    isVideoEnabled: boolean;
  };
  hasPaidEntry: boolean | null;
  publicLiveScreenRef: React.MutableRefObject<LiveScreen | null>;
  setPublicLiveScreen: (screen: LiveScreen | null) => void;
  setAcceptedParticipants: React.Dispatch<React.SetStateAction<AcceptedParticipant[]>>;
  setMessages: React.Dispatch<React.SetStateAction<LiveMessage[]>>;
  onBroadcastMessage?: (payload: any) => void;
}

export const useLivePresence = ({
  stableStreamId,
  stableHostId,
  stableUserId,
  stableDisplayName,
  stableAvatarUrl,
  isHost,
  isAcceptedParticipant,
  agoraState,
  hasPaidEntry,
  publicLiveScreenRef,
  setPublicLiveScreen,
  setAcceptedParticipants,
  setMessages,
  onBroadcastMessage,
}: UseLivePresenceProps) => {
  const [viewersList, setViewersList] = useState<any[]>([]);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const syncLivePresence = useCallback((screenOverride?: LiveScreen | null) => {
    if (!presenceChannelRef.current) return;

    const role = isHost ? 'host' : isAcceptedParticipant ? 'participant' : 'viewer';
    const screen = screenOverride === undefined ? publicLiveScreenRef.current : screenOverride;

    void presenceChannelRef.current.track({
      user_id: stableUserId,
      user_name: stableDisplayName,
      avatar_url: stableAvatarUrl,
      role,
      public_live_screen: isHost ? screen : null,
      agora_uid: (isHost || isAcceptedParticipant) ? agoraState.localUid : null,
      mic_enabled: (isHost || isAcceptedParticipant) ? !agoraState.isMuted : null,
      camera_enabled: (isHost || isAcceptedParticipant) ? agoraState.isVideoEnabled : null,
      online_at: new Date().toISOString(),
    });
  }, [
    isAcceptedParticipant,
    isHost,
    stableAvatarUrl,
    stableDisplayName,
    stableUserId,
    agoraState.isMuted,
    agoraState.isVideoEnabled,
    agoraState.localUid,
    publicLiveScreenRef,
  ]);

  const requestLiveScreenState = useCallback((reason: string = 'viewer_resync') => {
    if (isHost || !presenceChannelRef.current) return;

    void presenceChannelRef.current.send({
      type: 'broadcast',
      event: 'request_live_screen_state',
      payload: { requesterUserId: stableUserId, reason },
    });
  }, [isHost, stableUserId]);

  useEffect(() => {
    if (!stableStreamId || hasPaidEntry !== true) return;

    const channelName = `live-room-${stableStreamId}`;
    const roomChannel = supabase.channel(channelName, {
      config: {
        presence: { key: stableUserId },
        broadcast: { self: true }
      }
    });

    presenceChannelRef.current = roomChannel;

    const updatePresenceState = () => {
      const currentViewers = syncPresenceEntries(roomChannel.presenceState());
      const reconstructedParticipants: AcceptedParticipant[] = [];

      if (!isHost) {
        const hostPresence = currentViewers.find(p => 
          (p.user_id || p.userId) === stableHostId && p.role === 'host'
        );

        if (isLiveScreen(hostPresence?.public_live_screen)) {
          setPublicLiveScreen(hostPresence.public_live_screen);
        } else if (!publicLiveScreenRef.current) {
          requestLiveScreenState('presence_sync_missing_screen');
        }
      }

      currentViewers.forEach(presence => {
        if (presence.role === 'participant') {
          reconstructedParticipants.push({
            userId: presence.user_id,
            userName: presence.user_name || 'Utilisateur',
            userAvatar: presence.avatar_url || null,
            agoraUid: presence.agora_uid ? String(presence.agora_uid) : undefined,
            isMicEnabled: presence.mic_enabled !== false,
            isCameraEnabled: presence.camera_enabled !== false,
          });
        }
      });

      setViewersList(currentViewers);
      setAcceptedParticipants(prev => reconstructedParticipants.map(rp => {
        const existing = prev.find(p => p.userId === rp.userId);
        return existing ? { ...existing, ...rp } : rp;
      }));
    };

    roomChannel
      .on('presence', { event: 'sync' }, updatePresenceState)
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        setViewersList(current => mergePresenceEntries(current, newPresences, key));
        extractPresenceEntries(newPresences).forEach((presence: any) => {
          const userId = presence?.user_id || presence?.userId || key;
          if (presence.user_name && userId !== stableUserId) {
            setMessages(prev => [...prev.slice(-49), {
              id: crypto.randomUUID(),
              userId: userId || 'system',
              userName: presence.user_name,
              userAvatar: presence.avatar_url,
              type: 'join',
              content: 'a rejoint le live',
              createdAt: new Date().toISOString(),
            }]);
          }
        });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        setViewersList(current => removePresenceEntries(current, leftPresences, key));
        const leavingIds = new Set(leftPresences.map((p: any) => p.user_id || p.userId || key));
        setAcceptedParticipants(current => current.filter(p => !leavingIds.has(p.userId)));
      })
      .on('broadcast', { event: 'live_action' }, (payload) => {
        onBroadcastMessage?.(payload);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          syncLivePresence();
          if (!isHost) requestLiveScreenState('initial_join');
        }
      });

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [
    stableStreamId,
    hasPaidEntry,
    stableUserId,
    stableHostId,
    isHost,
    setPublicLiveScreen,
    requestLiveScreenState,
    syncLivePresence,
    setAcceptedParticipants,
    setMessages,
    onBroadcastMessage,
  ]);

  return {
    viewersList,
    presenceChannelRef,
    syncLivePresence,
    requestLiveScreenState
  };
};
