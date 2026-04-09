// Hook pour centraliser les métriques d'audience d'un live à partir de la présence temps réel.
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ViewerPresenceRecord {
  user_id?: string;
  userId?: string;
  presence_ref?: string;
  role?: string;
  user_name?: string;
  avatar_url?: string | null;
  agora_uid?: string;
  [key: string]: any;
}

interface AcceptedAudienceParticipant {
  userId: string;
  userName: string;
  userAvatar?: string | null;
  agoraUid?: string;
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
}

interface UseLiveAudienceParams {
  liveId?: string | null;
  hostId?: string | null;
  viewersList: ViewerPresenceRecord[];
  acceptedParticipants: AcceptedAudienceParticipant[];
}

export const useLiveAudience = ({
  liveId,
  hostId,
  viewersList,
  acceptedParticipants,
}: UseLiveAudienceParams) => {
  const [persistedViewers, setPersistedViewers] = useState<ViewerPresenceRecord[]>([]);

  useEffect(() => {
    if (!liveId) {
      setPersistedViewers([]);
      return;
    }

    let isMounted = true;

    const loadPersistedViewers = async () => {
      const { data: viewerRows, error } = await supabase
        .from('live_viewers')
        .select('user_id, joined_at, left_at')
        .eq('live_id', liveId)
        .is('left_at', null);

      if (error || !isMounted) {
        return;
      }

      const userIds = Array.from(new Set((viewerRows ?? []).map((viewer) => viewer.user_id).filter(Boolean)));
      const { data: profiles } = userIds.length > 0
        ? await supabase
            .from('profiles')
            .select('id, first_name, last_name, username, avatar_url')
            .in('id', userIds)
        : { data: [] };

      if (!isMounted) {
        return;
      }

      const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

      setPersistedViewers(
        (viewerRows ?? []).map((viewer) => {
          const profile = profileById.get(viewer.user_id);
          const name = profile
            ? [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() || profile.username || 'Spectateur'
            : 'Spectateur';

          return {
            user_id: viewer.user_id,
            user_name: name,
            avatar_url: profile?.avatar_url ?? null,
            role: viewer.user_id === hostId ? 'host' : 'viewer',
            joined_at: viewer.joined_at,
          };
        })
      );
    };

    void loadPersistedViewers();

    const channel = supabase
      .channel(`live-viewers-${liveId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_viewers',
          filter: `live_id=eq.${liveId}`,
        },
        () => {
          void loadPersistedViewers();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [hostId, liveId]);

  const connectedPeople = useMemo<ViewerPresenceRecord[]>(() => {
    const merged = new Map<string, ViewerPresenceRecord>();

    persistedViewers.forEach((viewer) => {
      const id = viewer.user_id || viewer.userId || viewer.presence_ref;
      if (!id) return;
      merged.set(id, viewer);
    });

    viewersList.forEach((viewer) => {
      const id = viewer.user_id || viewer.userId || viewer.presence_ref;
      if (!id) return;
      merged.set(id, viewer);
    });

    acceptedParticipants.forEach((participant) => {
      const id = participant.userId;
      if (!id) return;

      const existing = merged.get(id);
      merged.set(id, {
        ...(existing || {}),
        user_id: id,
        user_name: participant.userName,
        avatar_url: participant.userAvatar,
        role: (existing?.role === 'host' || id === hostId) ? 'host' : 'participant',
        agora_uid: participant.agoraUid,
      });
    });

    return Array.from(merged.values());
  }, [acceptedParticipants, hostId, persistedViewers, viewersList]);

  const audienceCount = useMemo(() => {
    return connectedPeople.filter((presence) => {
      const presenceUserId = presence.user_id || presence.userId || presence.presence_ref;
      return Boolean(
        presenceUserId &&
        presenceUserId !== hostId &&
        presence.role !== 'preview_observer'
      );
    }).length;
  }, [connectedPeople, hostId]);

  const audiencePeople = useMemo(() => {
    return connectedPeople.filter((presence) => {
      const presenceUserId = presence.user_id || presence.userId || presence.presence_ref;
      return Boolean(
        presenceUserId &&
        presenceUserId !== hostId &&
        presence.role !== 'preview_observer'
      );
    });
  }, [connectedPeople, hostId]);

  const [peakAudienceCount, setPeakAudienceCount] = useState(0);

  useEffect(() => {
    setPeakAudienceCount(0);
  }, [liveId]);

  useEffect(() => {
    setPeakAudienceCount((current) => (audienceCount > current ? audienceCount : current));
  }, [audienceCount]);

  return {
    connectedPeople,
    audiencePeople,
    audienceCount,
    peakAudienceCount,
  };
};