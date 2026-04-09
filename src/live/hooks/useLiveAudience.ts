// Hook pour centraliser les métriques d'audience d'un live à partir de la présence temps réel.
import { useEffect, useMemo, useState } from 'react';

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
  const connectedPeople = useMemo<ViewerPresenceRecord[]>(() => {
    const merged = new Map<string, ViewerPresenceRecord>();

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
  }, [acceptedParticipants, hostId, viewersList]);

  const audienceCount = useMemo(() => {
    return viewersList.filter((presence) => {
      const presenceUserId = presence.user_id || presence.userId;
      return Boolean(presenceUserId && presenceUserId !== hostId);
    }).length;
  }, [hostId, viewersList]);

  const [peakAudienceCount, setPeakAudienceCount] = useState(0);

  useEffect(() => {
    setPeakAudienceCount(0);
  }, [liveId]);

  useEffect(() => {
    setPeakAudienceCount((current) => (audienceCount > current ? audienceCount : current));
  }, [audienceCount]);

  return {
    connectedPeople,
    audienceCount,
    peakAudienceCount,
  };
};