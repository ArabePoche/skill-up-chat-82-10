import { useState, useCallback, useMemo } from 'react';
import { useAgoraCall } from '@/call-system/hooks/useAgoraCall';
import type { AcceptedParticipant } from '../utils/types';

interface UseLiveAgoraSessionProps {
  stableHostId?: string;
  connectedPeople: any[];
}

export const useLiveAgoraSession = ({ stableHostId, connectedPeople }: UseLiveAgoraSessionProps) => {
  const agora = useAgoraCall();
  const [acceptedParticipants, setAcceptedParticipants] = useState<AcceptedParticipant[]>([]);
  const [isAcceptedParticipant, setIsAcceptedParticipant] = useState(false);

  const hostAgoraUid = useMemo(() => {
    const hostPresence = connectedPeople.find(p => 
      p.role === 'host' && (p.user_id || p.userId) === stableHostId
    );
    return hostPresence?.agora_uid ? String(hostPresence.agora_uid) : null;
  }, [stableHostId, connectedPeople]);

  const upsertAcceptedParticipant = useCallback((participant: AcceptedParticipant) => {
    setAcceptedParticipants(prev => {
      const index = prev.findIndex(item => item.userId === participant.userId);
      if (index === -1) return [...prev, participant];
      const next = [...prev];
      next[index] = { ...next[index], ...participant };
      return next;
    });
  }, []);

  return {
    ...agora,
    acceptedParticipants,
    setAcceptedParticipants,
    isAcceptedParticipant,
    setIsAcceptedParticipant,
    hostAgoraUid,
    upsertAcceptedParticipant,
  };
};
