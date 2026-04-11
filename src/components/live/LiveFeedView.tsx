// Vue immersive plein écran des lives, style TikTok (swipe vertical).
// Infos minimalistes superposées + bouton ticket/prix pour les lives payants.
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Loader2, Ticket, Users, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import LiveScreenDisplay from '@/live/components/LiveScreenDisplay';
import type { LiveScreen } from '@/live/types';
import { isLiveScreen } from '@/live/types';
import { useAgoraCall } from '@/call-system/hooks/useAgoraCall';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LiveFeedItem {
  id: string;
  host_id: string;
  agora_channel: string;
  title: string;
  description: string | null;
  status: 'active' | 'scheduled';
  entry_price: number | null;
  scheduled_at: string | null;
  max_attendees: number | null;
  host: {
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  } | null;
}

interface LivePreviewState {
  audienceCount: number;
  screen: LiveScreen | null;
}

interface LiveViewerCountRow {
  live_id: string;
  user_id: string;
  left_at: string | null;
}

interface LivePresencePayload {
  user_id?: string;
  userId?: string;
  role?: string;
  public_live_screen?: unknown;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getHostDisplayName = (host: LiveFeedItem['host']) => {
  if (!host) return 'Créateur';
  if (host.first_name && host.last_name) return `${host.first_name} ${host.last_name}`;
  return host.username || 'Créateur';
};

const formatLiveDate = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return {
    day: date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }),
    time: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  };
};

// ─── Aperçu Agora plein écran ────────────────────────────────────────────────

const LiveAgoraPreview: React.FC<{
  channelName: string;
  isActive: boolean;
  hostName: string;
  hostAvatarUrl?: string | null;
}> = ({ channelName, isActive, hostName, hostAvatarUrl }) => {
  const { state, joinCall, leaveCall, remoteVideoContainerRef } = useAgoraCall();

  useEffect(() => {
    if (!isActive || !channelName) { void leaveCall(); return; }
    void joinCall(channelName, 'video', { role: 'viewer', enableAudio: false, enableVideo: false });
    return () => { void leaveCall(); };
  }, [channelName, isActive, joinCall, leaveCall]);

  const hasRemoteVideo = state.remoteUsers.length > 0;

  return (
    <>
      <div ref={remoteVideoContainerRef} className="absolute inset-0 h-full w-full" />
      {!hasRemoteVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <Avatar className="h-20 w-20 border-2 border-white/20 shadow-lg">
            <AvatarImage src={hostAvatarUrl ?? undefined} />
            <AvatarFallback className="bg-white/15 text-2xl text-white">{hostName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <p className="text-sm text-white/60">Connexion au flux...</p>
        </div>
      )}
    </>
  );
};

// ─── Hook : chargement et souscription aux lives ─────────────────────────────

export const useLiveFeed = () => {
  const [liveStreams, setLiveStreams] = useState<LiveFeedItem[]>([]);
  const [isLoadingLives, setIsLoadingLives] = useState(false);
  const [livesError, setLivesError] = useState<string | null>(null);

  const loadLives = async (isMounted = true) => {
    setIsLoadingLives(true);
    setLivesError(null);

    const { data: liveData, error } = await supabase
      .from('user_live_streams')
      .select('id, host_id, agora_channel, title, description, status, entry_price, scheduled_at, max_attendees')
      .eq('visibility', 'public')
      .in('status', ['active', 'scheduled'])
      .order('status', { ascending: true })
      .order('scheduled_at', { ascending: true, nullsFirst: false });

    if (error) {
      if (isMounted) { setLivesError("Impossible de charger les lives."); setIsLoadingLives(false); }
      return;
    }

    const hostIds = Array.from(new Set((liveData ?? []).map((l: any) => l.host_id).filter(Boolean)));
    const { data: profilesData } = hostIds.length > 0
      ? await supabase.from('profiles').select('id, first_name, last_name, username, avatar_url').in('id', hostIds)
      : { data: [] };

    const profileMap = new Map((profilesData ?? []).map((p) => [p.id, p]));

    if (isMounted) {
      setLiveStreams(
        (liveData ?? []).map((live: any) => ({
          ...live,
          status: live.status as 'active' | 'scheduled',
          host: profileMap.get(live.host_id) ?? null,
        }))
      );
      setIsLoadingLives(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    void loadLives(mounted);
    const interval = window.setInterval(() => { void loadLives(mounted); }, 30_000);
    return () => { mounted = false; window.clearInterval(interval); };
  }, []);

  return { liveStreams, isLoadingLives, livesError, retryLoadingLives: () => loadLives(true) };
};

// ─── Composant principal : feed plein écran ──────────────────────────────────

interface LiveFeedViewProps {
  liveStreams: LiveFeedItem[];
  isLoadingLives: boolean;
  livesError: string | null;
  retryLoadingLives: () => void;
}

const LiveFeedView: React.FC<LiveFeedViewProps> = ({ liveStreams, isLoadingLives, livesError, retryLoadingLives }) => {
  const navigate = useNavigate();
  const [currentLiveIndex, setCurrentLiveIndex] = useState(0);
  const [livePreviews, setLivePreviews] = useState<Record<string, LivePreviewState>>({});
  const liveCardRefs = useRef<(HTMLElement | null)[]>([]);
  const liveVisibleRatiosRef = useRef<Map<number, number>>(new Map());
  const livePreviewChannelsRef = useRef<Map<string, ReturnType<typeof supabase.channel>>>(new Map());
  const livePreviewRequesterIdRef = useRef(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `live-preview-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  // ── Presence sync ──

  const syncLivePreviewFromPresence = (liveId: string, hostId: string, presenceState: Record<string, unknown>) => {
    const flattenedPresence = Object.values(presenceState).flatMap((e) => (Array.isArray(e) ? e : []));
    const hostPresence = flattenedPresence.find((p) => {
      if (!p || typeof p !== 'object') return false;
      const tp = p as LivePresencePayload;
      return tp.role === 'host' && (tp.user_id || tp.userId) === hostId;
    }) as LivePresencePayload | undefined;

    const audienceCount = flattenedPresence.reduce((count, p) => {
      if (!p || typeof p !== 'object') return count;
      const tp = p as LivePresencePayload;
      const uid = tp.user_id || tp.userId;
      return !uid || uid === hostId ? count : count + 1;
    }, 0);

    const nextScreen = isLiveScreen(hostPresence?.public_live_screen) ? hostPresence!.public_live_screen : null;
    setLivePreviews((c) => ({ ...c, [liveId]: { audienceCount, screen: nextScreen } }));
  };

  const loadLiveViewerFallbackCounts = async (liveIds: string[]) => {
    if (liveIds.length === 0) return;
    const { data, error } = await supabase.from('live_viewers').select('live_id, user_id, left_at').in('live_id', liveIds).is('left_at', null);
    if (error) return;

    const audienceByLive = (data as LiveViewerCountRow[] | null ?? []).reduce<Record<string, Set<string>>>((acc, row) => {
      if (!acc[row.live_id]) acc[row.live_id] = new Set();
      acc[row.live_id].add(row.user_id);
      return acc;
    }, {});

    setLivePreviews((current) => {
      const next = { ...current };
      liveIds.forEach((id) => {
        const fb = audienceByLive[id]?.size ?? 0;
        const cs = next[id];
        next[id] = { audienceCount: Math.max(cs?.audienceCount ?? 0, fb), screen: cs?.screen ?? null };
      });
      return next;
    });
  };

  // ── Channel management ──

  useEffect(() => {
    return () => {
      livePreviewChannelsRef.current.forEach((ch) => void supabase.removeChannel(ch));
      livePreviewChannelsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const activeLives = liveStreams.filter((l) => l.status === 'active');
    const activeIds = new Set(activeLives.map((l) => l.id));

    livePreviewChannelsRef.current.forEach((ch, id) => {
      if (activeIds.has(id)) return;
      void supabase.removeChannel(ch);
      livePreviewChannelsRef.current.delete(id);
      setLivePreviews((c) => { if (!(id in c)) return c; const n = { ...c }; delete n[id]; return n; });
    });

    activeLives.forEach((live) => {
      if (livePreviewChannelsRef.current.has(live.id)) return;

      const channel = supabase.channel(`live-room-${live.id}`, {
        config: { presence: { key: `${livePreviewRequesterIdRef.current}:${live.id}` }, broadcast: { self: false } },
      });

      const syncPreview = () => syncLivePreviewFromPresence(live.id, live.host_id, channel.presenceState());

      channel
        .on('presence', { event: 'sync' }, syncPreview)
        .on('presence', { event: 'join' }, syncPreview)
        .on('presence', { event: 'leave' }, syncPreview)
        .on('broadcast', { event: 'live_screen_update' }, (payload) => {
          const ns = (payload.payload as { screen?: unknown } | null)?.screen;
          setLivePreviews((c) => ({ ...c, [live.id]: { audienceCount: c[live.id]?.audienceCount ?? 0, screen: isLiveScreen(ns) ? ns : null } }));
        })
        .on('broadcast', { event: 'live_screen_state' }, (payload) => {
          const ns = (payload.payload as { screen?: unknown } | null)?.screen;
          setLivePreviews((c) => ({ ...c, [live.id]: { audienceCount: c[live.id]?.audienceCount ?? 0, screen: isLiveScreen(ns) ? ns : c[live.id]?.screen ?? null } }));
        })
        .subscribe((status) => {
          if (status !== 'SUBSCRIBED') return;
          void channel.track({ user_id: `${livePreviewRequesterIdRef.current}:${live.id}`, role: 'preview_observer', online_at: new Date().toISOString() });
          syncPreview();
          void channel.send({ type: 'broadcast', event: 'request_live_screen_state', payload: { requesterUserId: livePreviewRequesterIdRef.current } });
        });

      livePreviewChannelsRef.current.set(live.id, channel);
    });

    void loadLiveViewerFallbackCounts(activeLives.map((l) => l.id));
  }, [liveStreams]);

  // ── Intersection observer ──

  useEffect(() => {
    if (liveStreams.length === 0) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => { liveVisibleRatiosRef.current.set(Number(e.target.getAttribute('data-live-index') || '0'), e.intersectionRatio); });
      let bestIdx = 0, bestR = 0;
      entries.forEach((e) => { const i = Number(e.target.getAttribute('data-live-index') || '0'); const r = liveVisibleRatiosRef.current.get(i) || 0; if (e.isIntersecting && r >= bestR && r >= 0.55) { bestR = r; bestIdx = i; } });
      setCurrentLiveIndex(bestIdx);
    }, { threshold: [0.25, 0.55, 0.8] });
    liveCardRefs.current.forEach((ref) => { if (ref) observer.observe(ref); });
    return () => { liveVisibleRatiosRef.current.clear(); observer.disconnect(); };
  }, [liveStreams.length]);

  // ── Navigation ──

  const openLive = (live: LiveFeedItem) => {
    if (live.entry_price && live.entry_price > 0) { navigate(`/live/${live.id}/ticket`); return; }
    navigate(`/live/${live.id}`);
  };

  // ── Rendu ──

  if (isLoadingLives) {
    return (
      <div className="flex h-full items-center justify-center text-white">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (livesError) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-white">
        <div className="text-center">
          <p className="text-sm text-white/70">{livesError}</p>
          <Button onClick={retryLoadingLives} size="sm" className="mt-3 bg-white text-black hover:bg-white/90">Réessayer</Button>
        </div>
      </div>
    );
  }

  if (liveStreams.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-white">
        <div className="text-center">
          <p className="text-lg font-semibold">Aucun live</p>
          <p className="mt-1 text-sm text-white/60">Reviens plus tard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto snap-y snap-mandatory">
      {liveStreams.map((live, idx) => {
        const isPaid = !!live.entry_price && live.entry_price > 0;
        const livePreview = livePreviews[live.id];
        const audienceCount = livePreview?.audienceCount ?? 0;
        const hostName = getHostDisplayName(live.host);
        const shouldUseAgora = live.status === 'active' && !isPaid && !!live.agora_channel && !livePreview?.screen;
        const liveDate = formatLiveDate(live.scheduled_at);
        const isActive = idx === currentLiveIndex;

        return (
          <section
            key={live.id}
            ref={(el) => { liveCardRefs.current[idx] = el; }}
            data-live-index={idx}
            className="relative h-screen w-full snap-start snap-always flex-shrink-0 bg-black overflow-hidden"
          >
            {/* Fond plein écran */}
            {live.status === 'active' ? (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(220,38,38,0.25),_rgba(0,0,0,0.97)_70%)]" />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_rgba(0,0,0,0.97)_65%)]" />
            )}

            {/* Aperçu Agora ou avatar centré */}
            {livePreview?.screen ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <LiveScreenDisplay screen={livePreview.screen} className="w-full max-w-none border-0 bg-transparent text-white shadow-none" />
              </div>
            ) : shouldUseAgora ? (
              <LiveAgoraPreview channelName={live.agora_channel} isActive={isActive} hostName={hostName} hostAvatarUrl={live.host?.avatar_url} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Avatar className="h-28 w-28 border-2 border-white/15 shadow-2xl">
                  <AvatarImage src={live.host?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-white/10 text-4xl text-white">{hostName.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              </div>
            )}

            {/* Gradient bas pour lisibilité */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

            {/* Badge statut en haut */}
            <div className="absolute top-5 left-5 z-10 flex items-center gap-2">
              {live.status === 'active' ? (
                <Badge className="border-0 bg-red-600 text-white text-xs animate-pulse gap-1">
                  <Radio className="h-3 w-3" /> EN DIRECT
                </Badge>
              ) : (
                <Badge className="border-0 bg-sky-600 text-white text-xs gap-1">
                  <Calendar className="h-3 w-3" /> {liveDate?.day || 'Programmé'}
                  {liveDate?.time && ` · ${liveDate.time}`}
                </Badge>
              )}
              {live.status === 'active' && audienceCount > 0 && (
                <Badge variant="secondary" className="border-0 bg-black/50 text-white text-xs gap-1">
                  <Users className="h-3 w-3" /> {audienceCount}
                </Badge>
              )}
            </div>

            {/* Infos bas – minimalistes */}
            <div className="absolute bottom-6 left-0 right-0 z-10 px-5 space-y-3">
              {/* Hôte */}
              <div className="flex items-center gap-2.5">
                <Avatar className="h-9 w-9 border border-white/20">
                  <AvatarImage src={live.host?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-white/15 text-sm text-white">{hostName.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-semibold text-white">{hostName}</span>
              </div>

              {/* Titre + description */}
              <div>
                <h2 className="text-lg font-bold text-white leading-tight line-clamp-2">{live.title}</h2>
                {live.description && <p className="text-xs text-white/60 mt-0.5 line-clamp-1">{live.description}</p>}
              </div>

              {/* CTA */}
              <div className="flex gap-2">
                <Button
                  onClick={() => openLive(live)}
                  className="flex-1 h-11 rounded-full bg-white text-black font-semibold hover:bg-white/90"
                >
                  {live.status === 'active'
                    ? (isPaid ? 'Acheter le ticket' : 'Rejoindre')
                    : (isPaid ? 'Voir le ticket' : 'Ouvrir')}
                </Button>
                {isPaid && (
                  <Button
                    onClick={() => navigate(`/live/${live.id}/ticket`)}
                    className="h-11 rounded-full bg-amber-500/90 text-black font-semibold hover:bg-amber-500 gap-1.5 px-5"
                  >
                    <Ticket className="h-4 w-4" />
                    {live.entry_price?.toLocaleString('fr-FR')} SC
                  </Button>
                )}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default LiveFeedView;
