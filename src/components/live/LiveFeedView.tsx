// Vue complète du rail des lives : chargement, aperçu Agora, navigation vers le live.
// Extraite de TikTokVideosView pour alléger ce dernier.
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Loader2, Ticket, Users } from 'lucide-react';
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
    day: date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
    time: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  };
};

// ─── Sous-composant : aperçu Agora d'un live actif ──────────────────────────

const LiveAgoraPreview: React.FC<{
  channelName: string;
  isActive: boolean;
  hostName: string;
  hostAvatarUrl?: string | null;
}> = ({ channelName, isActive, hostName, hostAvatarUrl }) => {
  const { state, joinCall, leaveCall, remoteVideoContainerRef } = useAgoraCall();

  useEffect(() => {
    if (!isActive || !channelName) {
      void leaveCall();
      return;
    }
    void joinCall(channelName, 'video', { role: 'viewer', enableAudio: false, enableVideo: false });
    return () => { void leaveCall(); };
  }, [channelName, isActive, joinCall, leaveCall]);

  const hasRemoteVideo = state.remoteUsers.length > 0;

  return (
    <div className="relative min-h-[24rem] overflow-hidden rounded-[2rem] border border-white/10 bg-black shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
      <div ref={remoteVideoContainerRef} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/20" />
      {!hasRemoteVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_top,_rgba(248,113,113,0.28),_rgba(0,0,0,0.96)_68%)] px-6 text-center">
          <Avatar className="h-20 w-20 border-2 border-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
            <AvatarImage src={hostAvatarUrl ?? undefined} />
            <AvatarFallback className="bg-white/15 text-2xl text-white">{hostName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/55">Live en cours</p>
            <p className="mt-2 text-lg font-semibold text-white">Connexion au flux vidéo...</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Hook interne : chargement et souscription aux lives ─────────────────────

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
      if (isMounted) { setLivesError("Impossible de charger les lives pour le moment."); setIsLoadingLives(false); }
      return;
    }

    const hostIds = Array.from(new Set((liveData ?? []).map((live: any) => live.host_id).filter(Boolean)));
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

// ─── Composant principal ─────────────────────────────────────────────────────

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
    if (live.status === 'active') { navigate(`/live/${live.id}`); return; }
    if (live.entry_price && live.entry_price > 0) { navigate(`/live/${live.id}/ticket`); return; }
    navigate(`/live/${live.id}`);
  };

  // ── Rendu ──

  if (isLoadingLives) {
    return (
      <div className="flex h-screen items-center justify-center text-white">
        <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/40 px-5 py-3 backdrop-blur-sm">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm text-white/80">Chargement des lives...</span>
        </div>
      </div>
    );
  }

  if (livesError) {
    return (
      <div className="flex h-screen items-center justify-center px-6 text-white">
        <div className="max-w-sm text-center">
          <h2 className="text-lg font-semibold">Lives indisponibles</h2>
          <p className="mt-2 text-sm text-white/70">{livesError}</p>
          <Button onClick={retryLoadingLives} className="mt-4 bg-white text-black hover:bg-white/90">Réessayer</Button>
        </div>
      </div>
    );
  }

  if (liveStreams.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center px-6 text-white">
        <div className="max-w-sm text-center">
          <h2 className="text-lg font-semibold">Aucun live pour le moment</h2>
          <p className="mt-2 text-sm text-white/70">Reviens plus tard pour voir les directs et les lives programmés.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto snap-y snap-mandatory">
      {liveStreams.map((live, idx) => {
        const liveDate = formatLiveDate(live.scheduled_at);
        const isPaid = !!live.entry_price && live.entry_price > 0;
        const livePreview = livePreviews[live.id];
        const audienceCount = livePreview?.audienceCount ?? 0;
        const hasLivePreview = live.status === 'active' && !!livePreview?.screen;
        const hostName = getHostDisplayName(live.host);
        const shouldUseAgoraPreview = live.status === 'active' && !isPaid && !!live.agora_channel;

        return (
          <section
            key={live.id}
            ref={(el) => { liveCardRefs.current[idx] = el; }}
            data-live-index={idx}
            className="relative flex h-screen w-full snap-start snap-always overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(220,38,38,0.35),_rgba(0,0,0,0.92)_55%)] px-5 pb-6 pt-20 text-white"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/45 to-black/90" />

            <div className="relative z-10 mx-auto flex h-full w-full max-w-xl flex-col gap-4">
              {/* Badges */}
              <div className="flex items-center gap-3">
                <Badge className={live.status === 'active' ? 'border-0 bg-red-600 text-white animate-pulse' : 'border-0 bg-sky-600 text-white'}>
                  {live.status === 'active' ? 'EN DIRECT' : 'PROGRAMMÉ'}
                </Badge>
                {isPaid && <Badge variant="secondary" className="border-0 bg-white/15 text-white">Ticket requis</Badge>}
                {live.status === 'active' && audienceCount > 0 && (
                  <Badge variant="secondary" className="border-0 bg-black/45 text-white">
                    <Users className="mr-1 h-3.5 w-3.5" />{audienceCount} en train de regarder
                  </Badge>
                )}
              </div>

              {/* Zone centrale : aperçu */}
              <div className="flex min-h-0 flex-1 items-center">
                <div className="w-full">
                  {shouldUseAgoraPreview ? (
                    <LiveAgoraPreview channelName={live.agora_channel} isActive={idx === currentLiveIndex} hostName={hostName} hostAvatarUrl={live.host?.avatar_url} />
                  ) : hasLivePreview ? (
                    <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/35 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-sm">
                      <LiveScreenDisplay screen={livePreview.screen as LiveScreen} className="w-full max-w-none border-0 bg-black/40 text-white shadow-none" />
                    </div>
                  ) : live.status === 'active' ? (
                    <ActiveLivePlaceholder live={live} hostName={hostName} audienceCount={audienceCount} />
                  ) : (
                    <ScheduledLivePlaceholder live={live} hostName={hostName} liveDate={liveDate} />
                  )}
                </div>
              </div>

              {/* Infos */}
              <div className={`space-y-2 ${shouldUseAgoraPreview ? 'rounded-[1.75rem] border border-white/10 bg-black/45 p-4 backdrop-blur-xl' : ''}`}>
                <h2 className="max-w-lg text-2xl font-black leading-tight sm:text-4xl">{live.title}</h2>
                {live.description && <p className="max-w-lg text-sm leading-relaxed text-white/75 sm:text-base line-clamp-2">{live.description}</p>}
                {shouldUseAgoraPreview && <p className="text-sm font-semibold text-white/90">{audienceCount} spectateur{audienceCount > 1 ? 's' : ''}</p>}
              </div>

              {!shouldUseAgoraPreview && (
                <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/10 p-3 backdrop-blur-md">
                  <Avatar className="h-12 w-12 border border-white/10">
                    <AvatarImage src={live.host?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-white/15 text-white">{hostName.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{hostName}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/55">Créateur du live</p>
                  </div>
                </div>
              )}

              {!shouldUseAgoraPreview && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/55"><Calendar className="h-4 w-4" />Horaire</div>
                    <p className="mt-3 text-base font-semibold">{liveDate?.day || (live.status === 'active' ? 'En cours maintenant' : 'Horaire à confirmer')}</p>
                    <p className="mt-1 text-sm text-white/70">{liveDate?.time || 'Ouverture immédiate'}</p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/55"><Users className="h-4 w-4" />Accès</div>
                    <p className="mt-3 text-base font-semibold">{isPaid ? `${live.entry_price?.toLocaleString('fr-FR')} FCFA` : 'Gratuit'}</p>
                    <p className="mt-1 text-sm text-white/70">{live.max_attendees ? `${live.max_attendees} places max` : 'Places ouvertes'}</p>
                  </div>
                </div>
              )}

              {/* CTA */}
              <div className="sticky bottom-0 z-10 -mx-1 mt-auto rounded-[1.75rem] border border-white/10 bg-black/45 p-3 backdrop-blur-xl">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button onClick={() => openLive(live)} className="h-12 flex-1 rounded-full bg-white text-black hover:bg-white/90">
                    {live.status === 'active' ? (isPaid ? 'Acheter / rejoindre' : 'Rejoindre le live') : isPaid ? 'Voir le ticket' : 'Ouvrir le live'}
                  </Button>
                  {isPaid && (
                    <Button onClick={() => navigate(`/live/${live.id}/ticket`)} variant="outline" className="h-12 rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                      <Ticket className="mr-2 h-4 w-4" />{live.status === 'active' ? 'Ticket' : 'Page ticket'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
};

// ─── Placeholders internes ───────────────────────────────────────────────────

const ActiveLivePlaceholder: React.FC<{ live: LiveFeedItem; hostName: string; audienceCount: number }> = ({ live, hostName, audienceCount }) => (
  <div className="relative overflow-hidden rounded-[2rem] border border-red-400/25 bg-[radial-gradient(circle_at_top,_rgba(248,113,113,0.32),_rgba(17,24,39,0.92)_65%)] px-6 py-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
    <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_36%,rgba(255,255,255,0.05)_70%,transparent)]" />
    <div className="relative flex min-h-[20rem] flex-col justify-between gap-8">
      <div className="flex items-center justify-between">
        <div className="rounded-full border border-red-400/40 bg-red-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-red-100">Live en cours</div>
        <div className="text-xs uppercase tracking-[0.22em] text-white/55">Aperçu automatique en attente</div>
      </div>
      <div className="space-y-5">
        <Avatar className="h-20 w-20 border-2 border-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
          <AvatarImage src={live.host?.avatar_url ?? undefined} />
          <AvatarFallback className="bg-white/15 text-2xl text-white">{hostName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-white/55">Diffusion en direct</p>
          <h3 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">{live.title}</h3>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/75">Le créateur diffuse en ce moment. Ouvre le live pour voir la scène complète.</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-md">
        <div><p className="text-xs uppercase tracking-[0.18em] text-white/55">Créateur</p><p className="mt-1 font-semibold text-white">{hostName}</p></div>
        <div className="text-right"><p className="text-xs uppercase tracking-[0.18em] text-white/55">Audience</p><p className="mt-1 font-semibold text-white">{audienceCount > 0 ? `${audienceCount} spectateurs` : 'Ouvert maintenant'}</p></div>
      </div>
    </div>
  </div>
);

const ScheduledLivePlaceholder: React.FC<{ live: LiveFeedItem; hostName: string; liveDate: { day: string; time: string } | null }> = ({ live, hostName, liveDate }) => (
  <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.24),_rgba(15,23,42,0.95)_62%)] px-6 py-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
    <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_36%,rgba(255,255,255,0.05)_70%,transparent)]" />
    <div className="relative flex min-h-[20rem] flex-col justify-between gap-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.24em] text-sky-100/70">Programmé à venir</p>
          <h3 className="max-w-md text-3xl font-black leading-tight sm:text-4xl">{live.title}</h3>
        </div>
        <Avatar className="h-16 w-16 border-2 border-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
          <AvatarImage src={live.host?.avatar_url ?? undefined} />
          <AvatarFallback className="bg-white/15 text-xl text-white">{hostName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/8 p-4 backdrop-blur-md">
          <p className="text-xs uppercase tracking-[0.18em] text-white/55">Date</p>
          <p className="mt-3 text-lg font-semibold text-white">{liveDate?.day || 'Date à confirmer'}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/8 p-4 backdrop-blur-md">
          <p className="text-xs uppercase tracking-[0.18em] text-white/55">Heure</p>
          <p className="mt-3 text-lg font-semibold text-white">{liveDate?.time || 'Horaire à confirmer'}</p>
        </div>
      </div>
      <div className="rounded-3xl border border-white/10 bg-black/20 p-4 backdrop-blur-md">
        <p className="text-xs uppercase tracking-[0.18em] text-white/55">Ce que les spectateurs verront</p>
        <p className="mt-3 text-sm leading-relaxed text-white/75">Une entrée verticale dédiée, puis l'accès direct au ticket ou au live au moment de l'ouverture.</p>
      </div>
    </div>
  </div>
);

export default LiveFeedView;
