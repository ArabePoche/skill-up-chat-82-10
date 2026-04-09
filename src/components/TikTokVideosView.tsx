
import React, { useState, useRef, useEffect, createContext, useContext, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import VideoCard from '@/components/video/VideoCard';
import { useInfiniteVideos } from '@/hooks/useInfiniteVideos';
import { useVideoById } from '@/hooks/useVideoById';
import ConfettiAnimation from '@/components/ConfettiAnimation';
import { Calendar, Loader2, Radio, Ticket, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import LiveScreenDisplay from '@/live/components/LiveScreenDisplay';
import type { LiveScreen } from '@/live/types';
import { isLiveScreen } from '@/live/types';

interface Video {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  likes_count: number;
  comments_count: number;
  author_id: string;
  video_type?: string;
  formation_id?: string;
  price?: number;
  profiles?: {
    first_name?: string;
    last_name?: string;
    username?: string;
    avatar_url?: string;
  };
}

interface LiveFeedItem {
  id: string;
  host_id: string;
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

const getHostDisplayName = (host: LiveFeedItem['host']) => {
  if (!host) return 'Createur';
  if (host.first_name && host.last_name) return `${host.first_name} ${host.last_name}`;
  return host.username || 'Createur';
};

const formatLiveDate = (value: string | null) => {
  if (!value) return null;

  const date = new Date(value);
  return {
    day: date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }),
    time: date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
};

// Contexte global pour le contrôle du son - SON ACTIVÉ PAR DÉFAUT
const GlobalSoundContext = createContext<{
  isMuted: boolean;
  toggleMute: () => void;
}>({
  isMuted: false, // Son activé par défaut
  toggleMute: () => {}
});

export const useGlobalSound = () => useContext(GlobalSoundContext);

const SOUND_PREFERENCE_KEY = 'tiktok-feed-muted';

const TikTokVideosView: React.FC<{
  targetVideoId?: string;
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
}> = ({ targetVideoId, scrollContainerRef }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    data: videos = [],
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingVideos,
    isError: isVideosError,
    refetch: refetchVideos,
    error: videosError,
  } = useInfiniteVideos();
  const {
    data: targetVideo,
    isLoading: isLoadingTargetVideo,
    isError: isTargetVideoError,
    refetch: refetchTargetVideo,
    error: targetVideoError,
  } = useVideoById(targetVideoId);
  // Initialiser l'index à 0; sera mis à jour par l'effet targetVideoId
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const hasInitializedTarget = useRef(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isLiveFeedOpen, setIsLiveFeedOpen] = useState(false);
  const [liveStreams, setLiveStreams] = useState<LiveFeedItem[]>([]);
  const [isLoadingLives, setIsLoadingLives] = useState(false);
  const [livesError, setLivesError] = useState<string | null>(null);
  const [livePreviews, setLivePreviews] = useState<Record<string, LivePreviewState>>({});
  const [globalMuted, setGlobalMuted] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.localStorage.getItem(SOUND_PREFERENCE_KEY) === 'true';
  });
  const videoRefs = useRef<(HTMLDivElement | null)[]>([]);
  const visibleRatiosRef = useRef<Map<number, number>>(new Map());
  const livePreviewChannelsRef = useRef<Map<string, ReturnType<typeof supabase.channel>>>(new Map());
  const livePreviewRequesterIdRef = useRef(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `live-preview-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  const syncLivePreviewFromPresence = (liveId: string, hostId: string, presenceState: Record<string, unknown>) => {
    const flattenedPresence = Object.values(presenceState).flatMap((entry) => Array.isArray(entry) ? entry : []);
    const hostPresence = flattenedPresence.find((presence) => {
      if (!presence || typeof presence !== 'object') {
        return false;
      }

      const typedPresence = presence as LivePresencePayload;
      const presenceUserId = typedPresence.user_id || typedPresence.userId;
      return typedPresence.role === 'host' && presenceUserId === hostId;
    }) as LivePresencePayload | undefined;

    const audienceCount = flattenedPresence.reduce((count, presence) => {
      if (!presence || typeof presence !== 'object') {
        return count;
      }

      const typedPresence = presence as LivePresencePayload;
      const presenceUserId = typedPresence.user_id || typedPresence.userId;

      if (!presenceUserId || presenceUserId === hostId) {
        return count;
      }

      return count + 1;
    }, 0);

    const nextScreen = isLiveScreen(hostPresence?.public_live_screen) ? hostPresence.public_live_screen : null;

    setLivePreviews((current) => ({
      ...current,
      [liveId]: {
        audienceCount,
        screen: nextScreen,
      },
    }));
  };

  const loadLiveViewerFallbackCounts = async (liveIds: string[]) => {
    if (liveIds.length === 0) {
      return;
    }

    const { data, error } = await supabase
      .from('live_viewers')
      .select('live_id, user_id, left_at')
      .in('live_id', liveIds)
      .is('left_at', null);

    if (error) {
      return;
    }

    const audienceByLive = (data as LiveViewerCountRow[] | null ?? []).reduce<Record<string, Set<string>>>((accumulator, row) => {
      if (!accumulator[row.live_id]) {
        accumulator[row.live_id] = new Set();
      }

      accumulator[row.live_id].add(row.user_id);
      return accumulator;
    }, {});

    setLivePreviews((current) => {
      const next = { ...current };

      liveIds.forEach((liveId) => {
        const fallbackCount = audienceByLive[liveId]?.size ?? 0;
        const currentState = next[liveId];

        next[liveId] = {
          audienceCount: Math.max(currentState?.audienceCount ?? 0, fallbackCount),
          screen: currentState?.screen ?? null,
        };
      });

      return next;
    });
  };

  useEffect(() => {
    return () => {
      livePreviewChannelsRef.current.forEach((channel) => {
        void supabase.removeChannel(channel);
      });
      livePreviewChannelsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!isLiveFeedOpen) {
      livePreviewChannelsRef.current.forEach((channel) => {
        void supabase.removeChannel(channel);
      });
      livePreviewChannelsRef.current.clear();
      setLivePreviews({});
      return;
    }

    const activeLives = liveStreams.filter((live) => live.status === 'active');
    const activeLiveIds = new Set(activeLives.map((live) => live.id));

    livePreviewChannelsRef.current.forEach((channel, liveId) => {
      if (activeLiveIds.has(liveId)) {
        return;
      }

      void supabase.removeChannel(channel);
      livePreviewChannelsRef.current.delete(liveId);
      setLivePreviews((current) => {
        if (!(liveId in current)) {
          return current;
        }

        const nextPreviews = { ...current };
        delete nextPreviews[liveId];
        return nextPreviews;
      });
    });

    activeLives.forEach((live) => {
      if (livePreviewChannelsRef.current.has(live.id)) {
        return;
      }

      const channel = supabase.channel(`live-room-${live.id}`, {
        config: {
          presence: {
            key: `${livePreviewRequesterIdRef.current}:${live.id}`,
          },
          broadcast: { self: false },
        },
      });

      const syncPreview = () => {
        syncLivePreviewFromPresence(live.id, live.host_id, channel.presenceState());
      };

      channel
        .on('presence', { event: 'sync' }, syncPreview)
        .on('presence', { event: 'join' }, syncPreview)
        .on('presence', { event: 'leave' }, syncPreview)
        .on('broadcast', { event: 'live_screen_update' }, (payload) => {
          const nextScreen = (payload.payload as { screen?: unknown } | null)?.screen;

          setLivePreviews((current) => ({
            ...current,
            [live.id]: {
              audienceCount: current[live.id]?.audienceCount ?? 0,
              screen: isLiveScreen(nextScreen) ? nextScreen : null,
            },
          }));
        })
        .on('broadcast', { event: 'live_screen_state' }, (payload) => {
          const nextScreen = (payload.payload as { screen?: unknown } | null)?.screen;

          setLivePreviews((current) => ({
            ...current,
            [live.id]: {
              audienceCount: current[live.id]?.audienceCount ?? 0,
              screen: isLiveScreen(nextScreen) ? nextScreen : current[live.id]?.screen ?? null,
            },
          }));
        })
        .subscribe((status) => {
          if (status !== 'SUBSCRIBED') {
            return;
          }

          void channel.track({
            user_id: `${livePreviewRequesterIdRef.current}:${live.id}`,
            role: 'preview_observer',
            online_at: new Date().toISOString(),
          });

          syncPreview();

          void channel.send({
            type: 'broadcast',
            event: 'request_live_screen_state',
            payload: {
              requesterUserId: livePreviewRequesterIdRef.current,
            },
          });
        });

      livePreviewChannelsRef.current.set(live.id, channel);
    });

    void loadLiveViewerFallbackCounts(activeLives.map((live) => live.id));
  }, [isLiveFeedOpen, liveStreams]);

  useEffect(() => {
    let isMounted = true;

    const loadLives = async () => {
      setIsLoadingLives(true);
      setLivesError(null);

      const { data: liveData, error } = await supabase
        .from('user_live_streams')
        .select('id, host_id, title, description, status, entry_price, scheduled_at, max_attendees')
        .eq('visibility', 'public')
        .in('status', ['active', 'scheduled'])
        .order('status', { ascending: true })
        .order('scheduled_at', { ascending: true, nullsFirst: false });

      if (error) {
        if (isMounted) {
          setLivesError("Impossible de charger les lives pour le moment.");
          setIsLoadingLives(false);
        }
        return;
      }

      const hostIds = Array.from(new Set((liveData ?? []).map((live) => live.host_id).filter(Boolean)));
      const { data: profilesData } = hostIds.length > 0
        ? await supabase
            .from('profiles')
            .select('id, first_name, last_name, username, avatar_url')
            .in('id', hostIds)
        : { data: [] };

      const profileMap = new Map((profilesData ?? []).map((profile) => [profile.id, profile]));

      if (isMounted) {
        setLiveStreams(
          (liveData ?? []).map((live) => ({
            ...live,
            status: live.status as 'active' | 'scheduled',
            host: profileMap.get(live.host_id) ?? null,
          }))
        );
        setIsLoadingLives(false);
      }
    };

    void loadLives();

    const refreshInterval = window.setInterval(() => {
      void loadLives();
    }, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(refreshInterval);
    };
  }, []);

  useEffect(() => {
    hasInitializedTarget.current = false;
  }, [targetVideoId]);

  // Fusionner la vidéo cible avec le flux si elle n'est pas déjà présente
  const displayedVideos = useMemo(() => {
    if (!targetVideoId || !targetVideo) return videos;
    
    // Vérifier si la vidéo cible est déjà dans le flux
    const isInFlow = videos.some(v => v.id === targetVideoId);
    if (isInFlow) return videos;
    
    // Insérer la vidéo cible au début du flux
    return [targetVideo, ...videos];
  }, [targetVideoId, targetVideo, videos]);

  // Contrôle global du son
  const toggleGlobalMute = () => {
    setGlobalMuted((previousMuted) => !previousMuted);
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(SOUND_PREFERENCE_KEY, String(globalMuted));
  }, [globalMuted]);

  // Garder l'URL synchronisée avec la vidéo réellement visible lors d'un deep link.
  useEffect(() => {
    if (!location.pathname.startsWith('/video/') && !location.pathname.startsWith('/videos/')) {
      return;
    }

    if (targetVideoId) {
      if (isLoadingTargetVideo || !hasInitializedTarget.current) {
        return;
      }
    }

    const currentVideo = displayedVideos[currentVideoIndex];
    if (!currentVideo) {
      return;
    }

    const pathPrefix = location.pathname.startsWith('/videos/') ? '/videos' : '/video';
    const expectedPath = `${pathPrefix}/${currentVideo.id}`;

    if (location.pathname !== expectedPath) {
      navigate(expectedPath, { replace: true });
    }
  }, [currentVideoIndex, displayedVideos, isLoadingTargetVideo, location.pathname, navigate, targetVideoId]);

  // Intersection Observer pour la lecture automatique
  // Ne dépend que de displayedVideos.length pour éviter les re-créations inutiles
  const videosLength = displayedVideos?.length ?? 0;
  useEffect(() => {
    if (videosLength === 0) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const videoIndex = parseInt(entry.target.getAttribute('data-video-index') || '0', 10);
          visibleRatiosRef.current.set(videoIndex, entry.intersectionRatio);
        });

        let bestIndex = currentVideoIndex;
        let bestRatio = 0;

        entries.forEach((entry) => {
          const videoIndex = parseInt(entry.target.getAttribute('data-video-index') || '0', 10);
          const ratio = visibleRatiosRef.current.get(videoIndex) || 0;

          if (entry.isIntersecting && ratio >= bestRatio && ratio >= 0.55) {
            bestRatio = ratio;
            bestIndex = videoIndex;
          }
        });

        if (bestIndex !== currentVideoIndex) {
          setCurrentVideoIndex(bestIndex);
        }
      },
      {
        root: scrollContainerRef?.current || null,
        threshold: [0.25, 0.55, 0.8],
      }
    );

    videoRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      visibleRatiosRef.current.clear();
      observer.disconnect();
    };
  }, [currentVideoIndex, videosLength, scrollContainerRef]);

  // Charger plus de vidéos quand on approche de la fin
  useEffect(() => {
    if (!displayedVideos || displayedVideos.length === 0) return;
    
    if (currentVideoIndex >= displayedVideos.length - 2 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [currentVideoIndex, displayedVideos, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Quand la vidéo cible est chargée, scroller vers elle et forcer l'index
  useEffect(() => {
    if (!targetVideoId || !displayedVideos || displayedVideos.length === 0) return;
    if (hasInitializedTarget.current) return; // Ne faire qu'une seule fois
    
    const index = displayedVideos.findIndex((v: any) => v.id === targetVideoId);
    if (index >= 0) {
      hasInitializedTarget.current = true;
      setCurrentVideoIndex(index);
      // Petit délai pour laisser le DOM se construire avant le scroll
      requestAnimationFrame(() => {
        const ref = videoRefs.current[index];
        if (ref) {
          ref.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
      });
    }
  }, [targetVideoId, displayedVideos]);

  const handleLikeWithConfetti = () => {
    setShowConfetti(true);
    // Ne pas refetch pour éviter de perdre la position
  };

  const handleCommentAdded = () => {
    // Ne pas refetch pour éviter de perdre la position
    // Les compteurs de commentaires seront mis à jour localement par le hook
  };

  const retryLoading = () => {
    refetchVideos();
    if (targetVideoId) {
      refetchTargetVideo();
    }
  };

  const retryLoadingLives = async () => {
    setIsLoadingLives(true);
    setLivesError(null);

    const { data: liveData, error } = await supabase
      .from('user_live_streams')
      .select('id, host_id, title, description, status, entry_price, scheduled_at, max_attendees')
      .eq('visibility', 'public')
      .in('status', ['active', 'scheduled'])
      .order('status', { ascending: true })
      .order('scheduled_at', { ascending: true, nullsFirst: false });

    if (error) {
      setLivesError("Impossible de charger les lives pour le moment.");
      setIsLoadingLives(false);
      return;
    }

    const hostIds = Array.from(new Set((liveData ?? []).map((live) => live.host_id).filter(Boolean)));
    const { data: profilesData } = hostIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id, first_name, last_name, username, avatar_url')
          .in('id', hostIds)
      : { data: [] };

    const profileMap = new Map((profilesData ?? []).map((profile) => [profile.id, profile]));

    setLiveStreams(
      (liveData ?? []).map((live) => ({
        ...live,
        status: live.status as 'active' | 'scheduled',
        host: profileMap.get(live.host_id) ?? null,
      }))
    );
    setIsLoadingLives(false);
  };

  const openLive = (live: LiveFeedItem) => {
    if (live.status === 'active') {
      navigate(`/live/${live.id}`);
      return;
    }

    if (live.entry_price && live.entry_price > 0) {
      navigate(`/live/${live.id}/ticket`);
      return;
    }

    navigate(`/live/${live.id}`);
  };

  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
  const shouldShowInitialSpinner = (isLoadingVideos && videos.length === 0) || (targetVideoId && isLoadingTargetVideo);
  const shouldShowErrorState = (videos.length === 0 && isVideosError) || (targetVideoId && isTargetVideoError);

  const errorMessage = isOffline
    ? "La connexion semble indisponible. Verifie Internet puis reessaie."
    : "Impossible de charger le flux video pour le moment.";

  if (shouldShowInitialSpinner) {
    return (
      <div className="h-full flex items-center justify-center text-white bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (shouldShowErrorState) {
    return (
      <div className="h-full flex items-center justify-center bg-black px-6 text-white">
        <div className="max-w-sm text-center">
          <h2 className="text-lg font-semibold">Chargement interrompu</h2>
          <p className="mt-2 text-sm text-white/70">{errorMessage}</p>
          <Button onClick={retryLoading} className="mt-4 bg-white text-black hover:bg-white/90">
            Reessayer
          </Button>
        </div>
      </div>
    );
  }

  if (targetVideoId && !isLoadingTargetVideo && !targetVideo && displayedVideos.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-black px-6 text-white">
        <div className="max-w-sm text-center">
          <h2 className="text-lg font-semibold">Video introuvable</h2>
          <p className="mt-2 text-sm text-white/70">Cette video n'est plus disponible ou a ete retiree.</p>
          <Button onClick={() => navigate('/video', { replace: true })} className="mt-4 bg-white text-black hover:bg-white/90">
            Retour au flux
          </Button>
        </div>
      </div>
    );
  }

  if (!displayedVideos || displayedVideos.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-black px-6 text-white">
        <div className="max-w-sm text-center">
          <h2 className="text-lg font-semibold">Aucune video disponible</h2>
          <p className="mt-2 text-sm text-white/70">Le flux est vide pour le moment. Reviens un peu plus tard.</p>
        </div>
      </div>
    );
  }

  return (
    <GlobalSoundContext.Provider value={{ isMuted: globalMuted, toggleMute: toggleGlobalMute }}>
      <div className="tiktok-feed relative h-full w-full bg-black">
        
        {/* Acces au rail Live */}
        <div className="fixed top-4 left-4 z-50">
          <Button
            variant="ghost"
            onClick={() => setIsLiveFeedOpen((current) => !current)}
            className={`h-12 rounded-full px-4 backdrop-blur-sm text-white border transition-colors ${isLiveFeedOpen ? 'bg-red-600/80 border-red-400/40 hover:bg-red-500/80' : 'bg-black/30 border-white/20 hover:bg-black/50'}`}
            aria-label={isLiveFeedOpen ? 'Revenir au flux videos' : 'Afficher les lives'}
          >
            <Radio size={18} className="mr-2" />
            <span className="text-sm font-semibold">Live</span>
            {liveStreams.length > 0 && (
              <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
                {liveStreams.length}
              </span>
            )}
          </Button>
        </div>

        {isLiveFeedOpen ? (
          <div className="h-full w-full overflow-y-auto snap-y snap-mandatory">
            {isLoadingLives ? (
              <div className="flex h-screen items-center justify-center text-white">
                <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/40 px-5 py-3 backdrop-blur-sm">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm text-white/80">Chargement des lives...</span>
                </div>
              </div>
            ) : livesError ? (
              <div className="flex h-screen items-center justify-center px-6 text-white">
                <div className="max-w-sm text-center">
                  <h2 className="text-lg font-semibold">Lives indisponibles</h2>
                  <p className="mt-2 text-sm text-white/70">{livesError}</p>
                  <Button onClick={retryLoadingLives} className="mt-4 bg-white text-black hover:bg-white/90">
                    Reessayer
                  </Button>
                </div>
              </div>
            ) : liveStreams.length === 0 ? (
              <div className="flex h-screen items-center justify-center px-6 text-white">
                <div className="max-w-sm text-center">
                  <h2 className="text-lg font-semibold">Aucun live pour le moment</h2>
                  <p className="mt-2 text-sm text-white/70">Reviens plus tard pour voir les directs et les lives programmes.</p>
                </div>
              </div>
            ) : (
              liveStreams.map((live) => {
                const liveDate = formatLiveDate(live.scheduled_at);
                const isPaid = !!live.entry_price && live.entry_price > 0;
                const livePreview = livePreviews[live.id];
                const audienceCount = livePreview?.audienceCount ?? 0;
                const hasLivePreview = live.status === 'active' && !!livePreview?.screen;

                return (
                  <section
                    key={live.id}
                    className="relative flex h-screen w-full snap-start snap-always overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(220,38,38,0.35),_rgba(0,0,0,0.92)_55%)] px-5 pb-6 pt-20 text-white"
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/45 to-black/90" />

                    <div className="relative z-10 mx-auto flex h-full w-full max-w-xl flex-col gap-4">
                      <div className="flex items-center gap-3">
                        <Badge className={live.status === 'active' ? 'border-0 bg-red-600 text-white animate-pulse' : 'border-0 bg-sky-600 text-white'}>
                          {live.status === 'active' ? 'EN DIRECT' : 'PROGRAMME'}
                        </Badge>
                        {isPaid && (
                          <Badge variant="secondary" className="border-0 bg-white/15 text-white">
                            Ticket requis
                          </Badge>
                        )}
                        {live.status === 'active' && audienceCount > 0 && (
                          <Badge variant="secondary" className="border-0 bg-black/45 text-white">
                            <Users className="mr-1 h-3.5 w-3.5" />
                            {audienceCount} en train de regarder
                          </Badge>
                        )}
                      </div>

                      <div className="flex min-h-0 flex-1 items-center">
                        <div className="w-full">
                          {hasLivePreview ? (
                            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/35 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-sm">
                              <LiveScreenDisplay
                                screen={livePreview.screen as LiveScreen}
                                className="w-full max-w-none border-0 bg-black/40 text-white shadow-none"
                              />
                            </div>
                          ) : live.status === 'active' ? (
                            <div className="relative overflow-hidden rounded-[2rem] border border-red-400/25 bg-[radial-gradient(circle_at_top,_rgba(248,113,113,0.32),_rgba(17,24,39,0.92)_65%)] px-6 py-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
                              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_36%,rgba(255,255,255,0.05)_70%,transparent)]" />
                              <div className="relative flex min-h-[20rem] flex-col justify-between gap-8">
                                <div className="flex items-center justify-between">
                                  <div className="rounded-full border border-red-400/40 bg-red-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-red-100">
                                    Live en cours
                                  </div>
                                  <div className="text-xs uppercase tracking-[0.22em] text-white/55">
                                    Apercu automatique en attente
                                  </div>
                                </div>

                                <div className="space-y-5">
                                  <Avatar className="h-20 w-20 border-2 border-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                                    <AvatarImage src={live.host?.avatar_url ?? undefined} />
                                    <AvatarFallback className="bg-white/15 text-2xl text-white">
                                      {getHostDisplayName(live.host).charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-xs uppercase tracking-[0.24em] text-white/55">Diffusion en direct</p>
                                    <h3 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">{live.title}</h3>
                                    <p className="mt-3 max-w-md text-sm leading-relaxed text-white/75">
                                      Le createur diffuse en ce moment. Ouvre le live pour voir la scene complete, le studio ou les produits presentes.
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-md">
                                  <div>
                                    <p className="text-xs uppercase tracking-[0.18em] text-white/55">Createur</p>
                                    <p className="mt-1 font-semibold text-white">{getHostDisplayName(live.host)}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs uppercase tracking-[0.18em] text-white/55">Audience</p>
                                    <p className="mt-1 font-semibold text-white">{audienceCount > 0 ? `${audienceCount} spectateurs` : 'Ouvert maintenant'}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.24),_rgba(15,23,42,0.95)_62%)] px-6 py-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
                              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_36%,rgba(255,255,255,0.05)_70%,transparent)]" />
                              <div className="relative flex min-h-[20rem] flex-col justify-between gap-8">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="space-y-2">
                                    <p className="text-xs uppercase tracking-[0.24em] text-sky-100/70">Programme a venir</p>
                                    <h3 className="max-w-md text-3xl font-black leading-tight sm:text-4xl">{live.title}</h3>
                                  </div>
                                  <Avatar className="h-16 w-16 border-2 border-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                                    <AvatarImage src={live.host?.avatar_url ?? undefined} />
                                    <AvatarFallback className="bg-white/15 text-xl text-white">
                                      {getHostDisplayName(live.host).charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div className="rounded-3xl border border-white/10 bg-white/8 p-4 backdrop-blur-md">
                                    <p className="text-xs uppercase tracking-[0.18em] text-white/55">Date</p>
                                    <p className="mt-3 text-lg font-semibold text-white">{liveDate?.day || 'Date a confirmer'}</p>
                                  </div>
                                  <div className="rounded-3xl border border-white/10 bg-white/8 p-4 backdrop-blur-md">
                                    <p className="text-xs uppercase tracking-[0.18em] text-white/55">Heure</p>
                                    <p className="mt-3 text-lg font-semibold text-white">{liveDate?.time || 'Horaire a confirmer'}</p>
                                  </div>
                                </div>

                                <div className="rounded-3xl border border-white/10 bg-black/20 p-4 backdrop-blur-md">
                                  <p className="text-xs uppercase tracking-[0.18em] text-white/55">Ce que les spectateurs verront</p>
                                  <p className="mt-3 text-sm leading-relaxed text-white/75">
                                    Une entree verticale dediee, puis l'acces direct au ticket ou au live au moment de l'ouverture.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h2 className="max-w-lg text-2xl font-black leading-tight sm:text-4xl">{live.title}</h2>
                        {live.description && (
                          <p className="max-w-lg text-sm leading-relaxed text-white/75 sm:text-base line-clamp-2">{live.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/10 p-3 backdrop-blur-md">
                        <Avatar className="h-12 w-12 border border-white/10">
                          <AvatarImage src={live.host?.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-white/15 text-white">
                            {getHostDisplayName(live.host).charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{getHostDisplayName(live.host)}</p>
                          <p className="text-xs uppercase tracking-[0.18em] text-white/55">Createur du live</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
                          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/55">
                            <Calendar className="h-4 w-4" />
                            Horaire
                          </div>
                          <p className="mt-3 text-base font-semibold">{liveDate?.day || (live.status === 'active' ? 'En cours maintenant' : 'Horaire a confirmer')}</p>
                          <p className="mt-1 text-sm text-white/70">{liveDate?.time || 'Ouverture immediate'}</p>
                        </div>

                        <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
                          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/55">
                            <Users className="h-4 w-4" />
                            Acces
                          </div>
                          <p className="mt-3 text-base font-semibold">
                            {isPaid ? `${live.entry_price?.toLocaleString('fr-FR')} FCFA` : 'Gratuit'}
                          </p>
                          <p className="mt-1 text-sm text-white/70">
                            {live.max_attendees ? `${live.max_attendees} places max` : 'Places ouvertes'}
                          </p>
                        </div>
                      </div>

                      <div className="sticky bottom-0 z-10 -mx-1 mt-auto rounded-[1.75rem] border border-white/10 bg-black/45 p-3 backdrop-blur-xl">
                        <div className="flex flex-col gap-3 sm:flex-row">
                        <Button
                          onClick={() => openLive(live)}
                          className="h-12 flex-1 rounded-full bg-white text-black hover:bg-white/90"
                        >
                          {live.status === 'active' ? (isPaid ? 'Acheter / rejoindre' : 'Rejoindre le live') : isPaid ? 'Voir le ticket' : 'Ouvrir le live'}
                        </Button>
                        {isPaid && (
                          <Button
                            onClick={() => navigate(`/live/${live.id}/ticket`)}
                            variant="outline"
                            className="h-12 rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                          >
                            <Ticket className="mr-2 h-4 w-4" />
                            {live.status === 'active' ? 'Ticket' : 'Page ticket'}
                          </Button>
                        )}
                        </div>
                      </div>
                    </div>
                  </section>
                );
              })
            )}
          </div>
        ) : (
          <>
        {/* Affichage de toutes les vidéos avec scroll fluide */}
        {displayedVideos.map((video, index) => {
          // Utiliser l'index comme clé de repli si l'ID n'est pas unique (ce qui ne devrait pas arriver)
          // Mais pour plus de robustesse, on combine ID et index si nécessaire
          const uniqueKey = `${video.id}-${index}`;
          
          // Optimisation : rendu "fenêtré" (virtualisation légère)
          // On ne rend que la vidéo active et ses voisines immédiates
          const shouldRender = Math.abs(index - currentVideoIndex) <= 2;
          
          return (
          <div
            key={uniqueKey}
            ref={(el) => (videoRefs.current[index] = el)}
            data-video-index={index}
            className="relative h-screen w-full snap-start snap-always flex-shrink-0"
          >
            {shouldRender ? (
              <VideoCard
                video={video}
                isActive={index === currentVideoIndex}
                onLikeWithConfetti={handleLikeWithConfetti}
                onCommentAdded={handleCommentAdded}
              />
            ) : (
               /* Placeholder léger pour les vidéos hors écran afin de libérer la mémoire */
              <div className="w-full h-full relative bg-black overflow-hidden">
                 {video.thumbnail_url && (
                    <img 
                        src={video.thumbnail_url} 
                        alt="" 
                        className="w-full h-full object-cover opacity-20 blur-md pointer-events-none"
                        loading="lazy" 
                    />
                 )}
              </div>
            )}
          </div>
        )})}


        {/* Chargement des vidéos suivantes */}
        {isFetchingNextPage && (
          <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-black/50 backdrop-blur-sm rounded-full p-3 border border-white/20">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            </div>
          </div>
        )}

          </>
        )}

        {/* Animation confetti */}
        <ConfettiAnimation
          isActive={showConfetti}
          onComplete={() => setShowConfetti(false)}
        />
      </div>
    </GlobalSoundContext.Provider>
  );
};

export default TikTokVideosView;