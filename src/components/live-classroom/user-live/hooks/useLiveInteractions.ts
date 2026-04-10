import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { HandRaiseRequest, AcceptedParticipant, ParticipantControlPayload } from '../utils/types';

interface UseLiveInteractionsProps {
  stableUserId: string;
  stableDisplayName: string;
  stableAvatarUrl: string | null;
  isHost: boolean;
  presenceChannelRef: React.MutableRefObject<any>;
  setAcceptedParticipants: React.Dispatch<React.SetStateAction<AcceptedParticipant[]>>;
}

export const useLiveInteractions = ({
  stableUserId,
  stableDisplayName,
  stableAvatarUrl,
  isHost,
  presenceChannelRef,
  setAcceptedParticipants,
}: UseLiveInteractionsProps) => {
  const [handRaiseRequests, setHandRaiseRequests] = useState<HandRaiseRequest[]>([]);
  const [hasRaisedHand, setHasRaisedHand] = useState(false);

  const handleRaiseHand = useCallback(() => {
    if (!presenceChannelRef.current || hasRaisedHand) return;

    const raiseId = crypto.randomUUID();

    presenceChannelRef.current.send({
      type: 'broadcast',
      event: 'raise_hand',
      payload: {
        id: raiseId,
        userId: stableUserId,
        userName: stableDisplayName,
        userAvatar: stableAvatarUrl,
      },
    });

    setHasRaisedHand(true);
    toast.info('Demande envoyée au créateur');
  }, [presenceChannelRef, hasRaisedHand, stableUserId, stableDisplayName, stableAvatarUrl]);

  const handleAcceptHandRaise = useCallback((request: HandRaiseRequest) => {
    if (!presenceChannelRef.current) return;

    presenceChannelRef.current.send({
      type: 'broadcast',
      event: 'hand_accepted',
      payload: {
        userId: request.userId,
        userName: request.userName,
        userAvatar: request.userAvatar,
      },
    });

    setHandRaiseRequests(prev => prev.filter(r => r.userId !== request.userId));
  }, [presenceChannelRef]);

  const handleRejectHandRaise = useCallback((userId: string) => {
    setHandRaiseRequests(prev => prev.filter(r => r.userId !== userId));
  }, []);

  const handleParticipantControl = useCallback((participant: AcceptedParticipant, action: ParticipantControlPayload['action']) => {
    if (!presenceChannelRef.current) return;

    presenceChannelRef.current.send({
      type: 'broadcast',
      event: 'participant_control',
      payload: {
        targetUserId: participant.userId,
        action,
      },
    });

    if (action === 'stop') {
      setAcceptedParticipants(prev => prev.filter(p => p.userId !== participant.userId));
    } else {
      setAcceptedParticipants(prev => prev.map(p => {
        if (p.userId !== participant.userId) return p;
        return {
          ...p,
          isMicEnabled: action === 'mic_on' ? true : action === 'mic_off' ? false : p.isMicEnabled,
          isCameraEnabled: action === 'camera_on' ? true : action === 'camera_off' ? false : p.isCameraEnabled,
        };
      }));
    }
  }, [presenceChannelRef, setAcceptedParticipants]);

  return {
    handRaiseRequests,
    setHandRaiseRequests,
    hasRaisedHand,
    setHasRaisedHand,
    handleRaiseHand,
    handleAcceptHandRaise,
    handleRejectHandRaise,
    handleParticipantControl,
  };
};
