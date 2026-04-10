import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { LiveStreamRecord, LiveRegistrant, LiveVisibility } from '../utils/types';

export const useLiveStreamData = (id: string | undefined, isHost: boolean) => {
  const [stream, setStream] = useState<LiveStreamRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [registrants, setRegistrants] = useState<LiveRegistrant[]>([]);
  const [registrantsLoading, setRegistrantsLoading] = useState(false);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const loadStream = async () => {
      setIsLoading(true);
      const { data: liveDataRaw, error: liveError } = await supabase
        .from('user_live_streams')
        .select('id, host_id, title, description, visibility, status, agora_channel, started_at, ended_at, entry_price, scheduled_at, max_attendees')
        .eq('id', id)
        .maybeSingle();

      if (liveError || !liveDataRaw) {
        if (isMounted) {
          setStream(null);
          setIsLoading(false);
        }
        return;
      }

      const liveData = liveDataRaw as any;
      const { data: hostProfile } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, username, avatar_url')
        .eq('id', liveData.host_id)
        .maybeSingle();

      if (isMounted) {
        setStream({
          ...liveData,
          visibility: liveData.visibility as LiveVisibility,
          status: liveData.status as any,
          host: hostProfile || null,
        });
        setIsLoading(false);
      }
    };

    void loadStream();

    const liveSubscription = supabase
      .channel(`user-live-stream-${id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_live_streams',
        filter: `id=eq.${id}`,
      }, async (payload) => {
        const updated = payload.new as any;
        const { data: hostProfile } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, username, avatar_url')
          .eq('id', updated.host_id)
          .maybeSingle();

        setStream({
          ...updated,
          visibility: updated.visibility as LiveVisibility,
          status: updated.status as any,
          host: hostProfile || null,
        });
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(liveSubscription);
    };
  }, [id]);

  const loadRegistrants = useCallback(async () => {
    if (!stream || !isHost) return;
    setRegistrantsLoading(true);
    try {
      const { data } = await supabase
        .from('live_payments')
        .select('buyer_id, amount, creator_amount, status')
        .eq('live_id', stream.id)
        .in('status', ['pending', 'released', 'disputed'])
        .order('created_at', { ascending: false });

      if (!data) return;

      const buyerIds = data.map(p => p.buyer_id);
      const { data: profiles } = buyerIds.length > 0
        ? await supabase
            .from('profiles')
            .select('id, first_name, last_name, username, avatar_url')
            .in('id', buyerIds)
        : { data: [] };

      const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));
      setRegistrants(data.map(p => ({
        ...p,
        profiles: profileMap.get(p.buyer_id) ?? null,
      })));
    } finally {
      setRegistrantsLoading(false);
    }
  }, [isHost, stream]);

  return {
    stream,
    isLoading,
    registrants,
    registrantsLoading,
    loadRegistrants,
  };
};
