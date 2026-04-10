import { useCallback, useRef, useState, useEffect } from 'react';
import type { LiveScreen } from '@/live/types';

export const useLiveScreenControl = (
  isHost: boolean,
  stableUserId: string,
  presenceChannelRef: React.MutableRefObject<any>,
  syncLivePresence: (screen?: LiveScreen | null) => void
) => {
  const [publicLiveScreen, setPublicLiveScreen] = useState<LiveScreen | null>(null);
  const publicLiveScreenRef = useRef<LiveScreen | null>(null);
  const pendingStudioBroadcastRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingStudioScreenRef = useRef<LiveScreen | null>(null);

  useEffect(() => {
    publicLiveScreenRef.current = publicLiveScreen;
  }, [publicLiveScreen]);

  const broadcastPublicLiveScreen = useCallback((screen: LiveScreen | null) => {
    syncLivePresence(screen);

    if (!presenceChannelRef.current) return;

    void presenceChannelRef.current.send({
      type: 'broadcast',
      event: 'live_screen_update',
      payload: { screen, senderUserId: stableUserId },
    });
  }, [stableUserId, syncLivePresence, presenceChannelRef]);

  const scheduleStudioBroadcast = useCallback((screen: LiveScreen | null) => {
    pendingStudioScreenRef.current = screen;

    if (pendingStudioBroadcastRef.current) return;

    pendingStudioBroadcastRef.current = setTimeout(() => {
      pendingStudioBroadcastRef.current = null;
      const pendingScreen = pendingStudioScreenRef.current;
      pendingStudioScreenRef.current = null;
      broadcastPublicLiveScreen(pendingScreen);
    }, 120);
  }, [broadcastPublicLiveScreen]);

  useEffect(() => {
    return () => {
      if (pendingStudioBroadcastRef.current) {
        clearTimeout(pendingStudioBroadcastRef.current);
      }
    };
  }, []);

  return {
    publicLiveScreen,
    setPublicLiveScreen,
    publicLiveScreenRef,
    broadcastPublicLiveScreen,
    scheduleStudioBroadcast,
  };
};
