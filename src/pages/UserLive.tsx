import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Copy,
  Gift,
  Globe,
  Loader2,
  Lock,
  Mic,
  MicOff,
  PhoneOff,
  Radio,
  Send,
  Users,
  Video,
  VideoOff,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAgoraCall } from '@/call-system/hooks/useAgoraCall';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

type LiveVisibility = 'public' | 'friends_followers';

interface HostProfile {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
}

interface LiveStreamRecord {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  visibility: LiveVisibility;
  status: 'active' | 'ended';
  agora_channel: string;
  started_at: string;
  ended_at: string | null;
  host: HostProfile | null;
}

const getDisplayName = (profile?: HostProfile | null) => {
  if (!profile) {
    return 'Utilisateur';
  }

  if (profile.first_name && profile.last_name) {
    return `${profile.first_name} ${profile.last_name}`;
  }

  return profile.username || 'Utilisateur';
};

const UserLive: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const requestedHostMode = searchParams.get('host') === '1';

  const [stream, setStream] = useState<LiveStreamRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const [isStopping, setIsStopping] = useState(false);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const {
    state,
    joinCall,
    leaveCall,
    toggleMute,
    toggleVideo,
    localVideoContainerRef,
    remoteVideoContainerRef,
  } = useAgoraCall();

  const isHost = !!user?.id && !!stream?.host_id && user.id === stream.host_id && requestedHostMode;
  const hostName = useMemo(() => getDisplayName(stream?.host), [stream?.host]);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const loadStream = async () => {
      setIsLoading(true);

      const { data: liveData, error: liveError } = await supabase
        .from('user_live_streams')
        .select('id, host_id, title, description, visibility, status, agora_channel, started_at, ended_at')
        .eq('id', id)
        .maybeSingle();

      if (liveError) {
        console.error('Erreur chargement live:', liveError);
      }

      if (!liveData) {
        if (isMounted) {
          setStream(null);
          setIsLoading(false);
        }
        return;
      }

      const { data: hostProfile } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, username, avatar_url')
        .eq('id', liveData.host_id)
        .maybeSingle();

      if (isMounted) {
        setStream({
          ...liveData,
          visibility: liveData.visibility as LiveVisibility,
          status: liveData.status as 'active' | 'ended',
          host: hostProfile || null,
        });
        setIsLoading(false);
      }
    };

    void loadStream();

    const liveSubscription = supabase
      .channel(`user-live-stream-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_live_streams',
          filter: `id=eq.${id}`,
        },
        async (payload) => {
          const updated = payload.new as Omit<LiveStreamRecord, 'host'>;
          const { data: hostProfile } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, username, avatar_url')
            .eq('id', updated.host_id)
            .maybeSingle();

          setStream({
            ...updated,
            visibility: updated.visibility as LiveVisibility,
            status: updated.status as 'active' | 'ended',
            host: hostProfile || null,
          });
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(liveSubscription);
    };
  }, [id]);

  useEffect(() => {
    if (!stream || !user?.id) {
      return;
    }

    const presenceChannel = supabase.channel(`live-presence-${stream.id}`);
    presenceChannelRef.current = presenceChannel;

    presenceChannel.on('presence', { event: 'sync' }, () => {
      const presenceState = presenceChannel.presenceState();
      setViewerCount(Object.keys(presenceState).length);
    });

    presenceChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({
          user_id: user.id,
          role: isHost ? 'host' : 'viewer',
          online_at: new Date().toISOString(),
        });
      }
    });

    return () => {
      presenceChannel.unsubscribe();
      presenceChannelRef.current = null;
    };
  }, [isHost, stream, user?.id]);

  useEffect(() => {
    if (!stream || stream.status !== 'active') {
      return;
    }

    void joinCall(stream.agora_channel, 'video', {
      role: isHost ? 'host' : 'viewer',
      enableAudio: isHost,
      enableVideo: isHost,
    });

    return () => {
      void leaveCall();
    };
  }, [isHost, joinCall, leaveCall, stream?.agora_channel, stream?.status]);

  useEffect(() => {
    if (stream?.status === 'ended' && state.isJoined) {
      void leaveCall();
    }
  }, [leaveCall, state.isJoined, stream?.status]);

  const handleStopLive = async () => {
    if (!stream || !isHost) {
      return;
    }

    setIsStopping(true);

    try {
      const { error } = await supabase
        .from('user_live_streams')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
        })
        .eq('id', stream.id)
        .eq('host_id', user?.id || '');

      if (error) {
        throw error;
      }

      await leaveCall();
      toast.success('Live terminé.');
      navigate('/profil');
    } catch (error) {
      console.error('Erreur arrêt live:', error);
      toast.error('Impossible de terminer ce live.');
    } finally {
      setIsStopping(false);
    }
  };

  const handleCopyLink = async () => {
    if (!stream) {
      return;
    }

    try {
      await navigator.clipboard.writeText(`${window.location.origin}/live/${stream.id}`);
      toast.success('Lien du live copié.');
    } catch (error) {
      console.error('Erreur copie lien live:', error);
      toast.error('Impossible de copier le lien.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="flex items-center gap-3 text-sm text-zinc-300">
          <Loader2 className="h-5 w-5 animate-spin" />
          Chargement du live...
        </div>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white">
        <Radio className="h-12 w-12 text-red-500" />
        <div>
          <h1 className="text-xl font-semibold">Live introuvable</h1>
          <p className="mt-2 text-sm text-zinc-400">Ce live n'existe pas, n'est plus accessible ou vous n'avez pas les droits pour le rejoindre.</p>
        </div>
        <Button onClick={() => navigate('/profil')} variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
          Retour au profil
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <div className="flex items-center justify-between border-b border-white/10 bg-black/75 px-4 py-3 backdrop-blur z-10">
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge className="border-0 bg-red-600 text-white hover:bg-red-600">
                <Radio className="mr-1 h-3.5 w-3.5" />
                EN DIRECT
              </Badge>
              <Badge variant="secondary" className="border border-white/10 bg-white/5 text-white">
                {stream.visibility === 'public' ? <Globe className="mr-1 h-3.5 w-3.5" /> : <Lock className="mr-1 h-3.5 w-3.5" />}
                {stream.visibility === 'public' ? 'Public' : 'Amis'}
              </Badge>
            </div>
            <h1 className="truncate text-lg font-semibold">{stream.title}</h1>
            <p className="truncate text-sm text-zinc-400">{hostName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-sm text-zinc-200">
            <Users className="h-4 w-4" />
            {viewerCount}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full text-white hover:bg-white/10 hover:text-red-500"
            onClick={isHost ? handleStopLive : () => navigate('/profil')}
            disabled={isStopping}
          >
            {isStopping ? <Loader2 className="h-5 w-5 animate-spin" /> : <X className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-black">
        {isHost ? (
          <div ref={localVideoContainerRef} className="absolute inset-0 bg-black" />
        ) : (
          <div ref={remoteVideoContainerRef} className="absolute inset-0 bg-black" />
        )}

        {((!isHost && state.remoteUsers.length === 0) || (isHost && !state.isJoined)) && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45">
            <div className="text-center text-zinc-200">
              <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin" />
              <p>{isHost ? 'Initialisation du live...' : 'En attente du flux du créateur...'}</p>
            </div>
          </div>
        )}

        {stream.description && (
          <div className="absolute bottom-28 left-4 right-4 rounded-2xl bg-black/45 p-4 text-sm text-zinc-100 backdrop-blur">
            {stream.description}
          </div>
        )}
      </div>

      <div className="border-t border-white/10 bg-black/80 px-4 py-4 backdrop-blur z-10">
        <div className="flex items-center gap-3">
          {/* Fake message input */}
          <div className="flex h-12 flex-1 items-center rounded-full bg-white/10 px-4 text-white">
            <input 
              type="text" 
              placeholder={isHost ? "Message aux spectateurs..." : "Ajouter un commentaire..."}
              className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-zinc-400"
            />
            <button 
              className="ml-2 flex items-center justify-center rounded-full bg-indigo-600 p-2 text-white hover:bg-indigo-700 transition-colors"
              onClick={() => toast.success('Fonctionnalité Messages bientôt disponible !')}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>

          {!isHost && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
              onClick={() => toast.success('Fonctionnalité Cadeaux bientôt disponible !')}
            >
              <Gift size={22} className="text-pink-500" />
            </Button>
          )}

          {isHost && (
            <>
              <Button
                type="button"
                onClick={toggleMute}
                variant={state.isMuted ? 'destructive' : 'outline'}
                size="icon"
                className="h-12 w-12 shrink-0 rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                {state.isMuted ? <MicOff size={22} /> : <Mic size={22} />}
              </Button>
              <Button
                type="button"
                onClick={toggleVideo}
                variant={!state.isVideoEnabled ? 'destructive' : 'outline'}
                size="icon"
                className="h-12 w-12 shrink-0 rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                {state.isVideoEnabled ? <Video size={22} /> : <VideoOff size={22} />}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserLive;