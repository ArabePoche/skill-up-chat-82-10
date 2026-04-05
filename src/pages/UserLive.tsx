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
  Share2,
  Users,
  Video,
  VideoOff,
  X,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAgoraCall } from '@/call-system/hooks/useAgoraCall';
import { useAuth } from '@/hooks/useAuth';
import { useFollow } from '@/friends/hooks/useFollow';
import { supabase } from '@/integrations/supabase/client';
import VideoShareModal from '@/components/video/VideoShareModal';
import WalletGiftModal from '@/wallet/WalletGiftModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import iconSC from '@/assets/coin-soumboulah-cash.png';
import iconSB from '@/assets/coin-soumboulah-bonus.png';
import iconH from '@/assets/coin-habbah.png';

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

const getDisplayName = (profile?: HostProfile | { first_name?: string | null; last_name?: string | null; username?: string | null } | null) => {
  if (!profile) {
    return 'Utilisateur';
  }

  if (profile.first_name && profile.last_name) {
    return `${profile.first_name} ${profile.last_name}`;
  }

  return profile.username || 'Utilisateur';
};

interface LiveMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  type: 'comment' | 'gift';
  content: string;
  currency?: string;
  createdAt: string;
}

const UserLive: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const requestedHostMode = searchParams.get('host') === '1';

  const [stream, setStream] = useState<LiveStreamRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const [viewersList, setViewersList] = useState<any[]>([]);
  const [showViewersModal, setShowViewersModal] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
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
  const hostName = useMemo(() => stream?.host ? (stream.host.first_name ? `${stream.host.first_name} ${stream.host.last_name || ''}` : stream.host.username || 'Utilisateur') : 'Utilisateur', [stream?.host]);

  const { friendshipStatus, sendRequest, isLoading: isFollowLoading } = useFollow(stream?.host_id);
  const [showShareModal, setShowShareModal] = useState(false);

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

    const roomChannel = supabase.channel(`live-room-${stream.id}`, {
      config: {
        presence: {
          key: user.id,
        }
      }
    });

    presenceChannelRef.current = roomChannel;

    roomChannel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = roomChannel.presenceState();
        console.log('Presence sync state:', presenceState);
        
        let uniqueUsersCount = Object.keys(presenceState).length;
        setViewerCount(uniqueUsersCount);

        const currentViewers: any[] = [];
        
        // Nouvelle approche super robuste : on aplatit puis filtre
        const allStreams = Object.values(presenceState).flat();
        
        // Dédupliquer ! On ne garde qu'une seule instance par `user_id` 
        // ou par `presence_ref` si inconnu
        const uniqueSet = new Map();
        allStreams.forEach((viewerState: any) => {
          const identifierKey = viewerState.user_id || viewerState.presence_ref || Math.random().toString();
          if (!uniqueSet.has(identifierKey)) {
            uniqueSet.set(identifierKey, viewerState);
            currentViewers.push(viewerState);
          }
        });

        console.log('Parsed viewers list:', currentViewers);
        setViewersList(currentViewers);
      })
      .on('broadcast', { event: 'live_action' }, (payload) => {
        const newMsg = payload.payload as LiveMessage;
        setMessages(prev => [...prev.slice(-49), newMsg]);
      })
      .subscribe(async (status) => {
        console.log('Realtime channel status:', status);
        if (status === 'SUBSCRIBED') {
          const trackStatus = await roomChannel.track({
            user_id: user.id,
            user_name: getDisplayName(profile) || 'Utilisateur',
            avatar_url: profile?.avatar_url || null,
            role: isHost ? 'host' : 'viewer',
            online_at: new Date().toISOString(),
          });
          console.log('Track status:', trackStatus);
        }
      });

    return () => {
      console.log('Removing channel:', roomChannel.topic);
      supabase.removeChannel(roomChannel);
      presenceChannelRef.current = null;
    };
  }, [isHost, stream?.id, user?.id, profile?.first_name, profile?.last_name, profile?.username, profile?.avatar_url]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !user || !profile || !presenceChannelRef.current) return;

    const newMessage: LiveMessage = {
      id: crypto.randomUUID(),
      userId: user.id,
      userName: getDisplayName(profile) || 'Utilisateur',
      userAvatar: profile.avatar_url,
      type: 'comment',
      content: messageInput.trim(),
      createdAt: new Date().toISOString(),
    };

    presenceChannelRef.current.send({
      type: 'broadcast',
      event: 'live_action',
      payload: newMessage,
    });

    setMessages(prev => [...prev.slice(-49), newMessage]);
    setMessageInput('');
  };

  const [showGiftModal, setShowGiftModal] = useState(false);

  const handleSendGiftClick = () => {
    if (!user || isHost) return;
    setShowGiftModal(true);
  };

  const handleGiftSuccess = (amount: number, currency: string, giftLabel: string, isAnonymous: boolean) => {
    if (!user || !profile || !presenceChannelRef.current) return;

    const senderName = isAnonymous ? 'Un utilisateur anonyme' : (getDisplayName(profile) || 'Utilisateur');

    const newMessage: LiveMessage = {
      id: crypto.randomUUID(),
      userId: user.id,
      userName: senderName,
      userAvatar: isAnonymous ? null : profile.avatar_url,
      type: 'gift',
      content: `a envoyé ${giftLabel}`,
      currency,
      createdAt: new Date().toISOString(),
    };

    presenceChannelRef.current.send({
      type: 'broadcast',
      event: 'live_action',
      payload: newMessage,
    });

    setMessages(prev => [...prev.slice(-49), newMessage]);
  };

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
    <div className="relative flex h-[100dvh] w-full flex-col bg-black overflow-hidden text-white">
      {/* Container de la vidéo plein écran */}
      <div className="absolute inset-0 z-0">
        {isHost ? (
          <div ref={localVideoContainerRef} className="absolute inset-0 bg-black [&>div]:!object-cover" />
        ) : (
          <div ref={remoteVideoContainerRef} className="absolute inset-0 bg-black [&>div]:!object-cover [&>div>video]:!object-cover" />
        )}
      </div>

      {/* Overlay de chargement */}
      {((!isHost && state.remoteUsers.length === 0) || (isHost && !state.isJoined)) && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/60">
          <div className="text-center text-zinc-200">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin" />
            <p>{isHost ? 'Initialisation du live...' : 'En attente du flux du créateur...'}</p>
          </div>
        </div>
      )}

      {/* Header superposé */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-start justify-between bg-gradient-to-b from-black/70 to-transparent p-4 pt-12 pb-16">
        <div className="flex flex-col gap-2 max-w-[65%]">
          {/* Hôte profil */}
          <div className="flex items-center gap-2 rounded-full bg-black/40 backdrop-blur-md p-1 pr-3 border border-white/10 w-max cursor-pointer" onClick={() => stream.host_id && navigate(`/profile/${stream.host_id}`)}>
            <Avatar className="h-9 w-9 border-2 border-white/20">
              <AvatarImage src={stream.host?.avatar_url || ''} />
              <AvatarFallback className="bg-zinc-800 text-xs">
                {(stream.host?.first_name || stream.host?.username || 'U').substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-[80px]">
              <span className="text-sm font-semibold truncate leading-tight">{hostName}</span>
              <span className="text-[10px] text-zinc-300 leading-tight">Créateur</span>
            </div>
            {!isHost && friendshipStatus === 'none' && (
              <Button 
                onClick={(e) => { e.stopPropagation(); sendRequest(); }} 
                disabled={isFollowLoading}
                className="ml-1 h-7 rounded-full bg-red-600 px-3 text-xs font-semibold hover:bg-red-700 h-auto py-1"
              >
                Suivre
              </Button>
            )}
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="border-0 bg-red-600/90 backdrop-blur-md text-white hover:bg-red-600 px-1.5 py-0 text-[10px]">
              <Radio className="mr-1 h-3 w-3 animate-pulse" />
              EN DIRECT
            </Badge>
            <Badge variant="secondary" className="border-0 bg-black/40 backdrop-blur-md text-white px-1.5 py-0 text-[10px]">
              {stream.visibility === 'public' ? <Globe className="mr-1 h-3 w-3" /> : <Lock className="mr-1 h-3 w-3" />}
              {stream.visibility === 'public' ? 'Public' : 'Amis'}
            </Badge>
            <button 
              className="flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-md px-2 py-0.5 text-[10px] font-medium text-white transition-colors"
              onClick={() => setShowViewersModal(true)}
            >
              <Users className="h-3 w-3 text-pink-400" />
              {viewerCount}
            </button>
          </div>
          
          <h1 className="text-sm font-semibold text-white drop-shadow-md truncate">{stream.title}</h1>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 hover:text-red-500 h-10 w-10 shrink-0"
          onClick={isHost ? handleStopLive : () => navigate('/profil')}
          disabled={isStopping}
        >
          {isStopping ? <Loader2 className="h-5 w-5 animate-spin" /> : <X className="h-5 w-5" />}
        </Button>
      </div>

      {stream.description && (
        <div className="absolute top-36 left-4 right-4 z-20 rounded-2xl bg-black/45 p-3 text-xs text-zinc-100 backdrop-blur">
          {stream.description}
        </div>
      )}

        {/* Live Chat Overlay */}
        <div className="absolute bottom-20 left-4 right-4 flex max-h-64 flex-col justify-end gap-2 overflow-y-auto pointer-events-none z-10 [mask-image:linear-gradient(to_bottom,transparent,black_15%,black_100%)]">
          {messages.slice(-3).map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-2 w-max max-w-[85%] rounded-2xl px-2 py-1 text-sm ${
                msg.type === 'gift'
                  ? 'bg-gradient-to-r from-pink-500/80 to-purple-500/80 text-white animate-bounce backdrop-blur'
                  : 'bg-transparent text-white drop-shadow-md'
              }`}
            >
              <Avatar className="h-7 w-7 border border-white/20 mt-0.5 shadow-sm">
                <AvatarImage src={msg.userAvatar || ''} />
                <AvatarFallback className="bg-zinc-800 text-[10px]">
                  {msg.userName?.substring(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-semibold text-zinc-300 opacity-90 text-[13px]">{msg.userName}</span>
                <span className="break-words flex items-center gap-1 flex-wrap font-medium">
                  {msg.content}
                  {msg.currency === 'soumboulah_cash' && <span className="inline-flex items-center bg-emerald-500/20 text-emerald-100 text-[10px] font-bold px-1.5 py-0.5 rounded gap-1"><img src={iconSC} alt="SC" className="w-3 h-3 object-contain" /> SC</span>}
                  {msg.currency === 'habbah' && <span className="inline-flex items-center bg-amber-500/20 text-amber-100 text-[10px] font-bold px-1.5 py-0.5 rounded gap-1"><img src={iconH} alt="H" className="w-3 h-3 object-contain" /> H</span>}
                  {msg.currency === 'soumboulah_bonus' && <span className="inline-flex items-center bg-blue-500/20 text-blue-100 text-[10px] font-bold px-1.5 py-0.5 rounded gap-1"><img src={iconSB} alt="SB" className="w-3 h-3 object-contain" /> SB</span>}
                </span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 bg-gradient-to-t from-black/80 to-transparent pt-8 pb-4 px-4 z-20 pointer-events-auto">
        <div className="flex items-center gap-3">
          {/* Real message input */}
          <div className="flex h-11 flex-1 items-center rounded-full bg-black/40 border border-white/20 px-4 text-white backdrop-blur-md">
            <input 
              type="text" 
              placeholder={isHost ? "Ajouter un commentaire..." : "Ajouter un commentaire..."}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-zinc-300"
            />
          </div>

          {!isHost && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-11 w-11 shrink-0 rounded-full bg-black/40 border border-white/20 text-white hover:bg-white/20 hover:text-white backdrop-blur-md"
                onClick={async () => {
                  try {
                    await navigator.share({
                      title: `Rejoignez mon live: ${stream.title}`,
                      text: `Je suis en direct ! Venez me rejoindre sur SkillUp.`,
                      url: window.location.href,
                    });
                  } catch (err) {
                    console.error("Erreur de partage:", err);
                  }
                }}
              >
                <Share2 className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-11 w-11 shrink-0 rounded-full bg-amber-500/30 border border-amber-500/50 text-amber-400 hover:bg-amber-500/40 hover:text-amber-300 backdrop-blur-md"
                onClick={handleSendGiftClick}
              >
                <Gift className="h-5 w-5 fill-amber-500/20" />
              </Button>
            </>
          )}

          {isHost && (
            <>
              <Button
                type="button"
                onClick={toggleMute}
                variant={state.isMuted ? 'destructive' : 'ghost'}
                size="icon"
                className="h-11 w-11 shrink-0 rounded-full bg-black/40 border border-white/20 text-white hover:bg-white/20 hover:text-white backdrop-blur-md"
              >
                {state.isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>
              <Button
                type="button"
                onClick={toggleVideo}
                variant={!state.isVideoEnabled ? 'destructive' : 'ghost'}
                size="icon"
                className="h-11 w-11 shrink-0 rounded-full bg-black/40 border border-white/20 text-white hover:bg-white/20 hover:text-white backdrop-blur-md"
              >
                {state.isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </Button>
            </>
          )} 
        </div>
      </div>

      {showGiftModal && stream?.host && (
        <WalletGiftModal
          isOpen={showGiftModal}
          onClose={() => setShowGiftModal(false)}
          initialSelectedUser={stream.host as any}
          onGiftSent={handleGiftSuccess}
        />
      )}

      {/* Viewers modal */}
      <Dialog open={showViewersModal} onOpenChange={setShowViewersModal}>
        <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800 text-white z-[9999]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Spectateurs ({viewerCount})
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-sm">
              Liste des spectateurs connectés à ce live.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto pr-2 space-y-3">
            {viewersList.length === 0 ? (
              <p className="text-center text-zinc-400 py-4">Aucun spectateur pour le moment (En attente de synchronisation...)</p>
            ) : (
              viewersList.map((viewer, idx) => {
                const name = viewer.user_name || viewer.userName || viewer.name || 'Utilisateur';
                const avatar = viewer.avatar_url || viewer.avatarUrl || viewer.avatar || '';
                const role = viewer.role || 'viewer';
                
                return (
                <div key={viewer.user_id || viewer.presence_ref || idx} className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-zinc-800">
                    <AvatarImage src={avatar} alt={name} />
                    <AvatarFallback className="bg-zinc-800 text-sm">
                      {name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{name}</span>
                    <span className="text-xs text-zinc-500 capitalize">{role === 'host' ? 'Créateur' : 'Spectateur'}</span>
                  </div>
                </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserLive;