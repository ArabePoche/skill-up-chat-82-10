import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Copy,
  Share2,
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
import WalletGiftModal from '@/wallet/WalletGiftModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import iconSC from '@/assets/coin-soumboulah-cash.png';
import iconSB from '@/assets/coin-soumboulah-bonus.png';
import iconH from '@/assets/coin-habbah.png';
import VideoUserProfile from '@/components/video/VideoUserProfile';

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
  type: 'comment' | 'gift' | 'join';
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

  // Stabilize profile data to prevent constant re-subscription
  const stableDisplayName = useMemo(() => getDisplayName(profile), [profile?.first_name, profile?.last_name, profile?.username]);
  const stableAvatarUrl = profile?.avatar_url || null;

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
        
        const uniqueUserIds = new Set<string>();
        const currentViewers: any[] = [];
        
        Object.values(presenceState).flat().forEach((viewerState: any) => {
          const uid = viewerState.user_id || viewerState.presence_ref || Math.random().toString();
          if (!uniqueUserIds.has(uid)) {
            uniqueUserIds.add(uid);
            currentViewers.push(viewerState);
          }
        });

        setViewerCount(uniqueUserIds.size);
        setViewersList(currentViewers);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        newPresences.forEach((presence: any) => {
          if (presence.user_name) {
            const joinMsg: LiveMessage = {
              id: crypto.randomUUID(),
              userId: presence.user_id || 'system',
              userName: presence.user_name,
              userAvatar: presence.avatar_url,
              type: 'join',
              content: 'a rejoint le live',
              createdAt: new Date().toISOString(),
            };
            setMessages(prev => [...prev.slice(-49), joinMsg]);
          }
        });
      })
      .on('broadcast', { event: 'live_action' }, (payload) => {
        const newMsg = payload.payload as LiveMessage;
        setMessages(prev => [...prev.slice(-49), newMsg]);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await roomChannel.track({
            user_id: user.id,
            user_name: stableDisplayName || 'Utilisateur',
            avatar_url: stableAvatarUrl,
            role: isHost ? 'host' : 'viewer',
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(roomChannel);
      presenceChannelRef.current = null;
    };
  }, [stream?.id, user?.id, isHost]);

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
    <div className="relative flex h-[100dvh] min-h-screen w-full flex-col bg-black text-white overflow-hidden">
      {/* Background Video Layer */}
      <div className="absolute inset-0 z-0">
        {isHost ? (
          <div ref={localVideoContainerRef} className="h-full w-full object-cover" />
        ) : (
          <div ref={remoteVideoContainerRef} className="h-full w-full object-cover" />
        )}
      </div>

<div className="absolute top-0 left-0 w-full flex items-start justify-between bg-gradient-to-b from-black/60 via-black/20 to-transparent px-4 py-3 pb-12 z-30 pt-4">
        {/* TOP LEFT: Avatar, Host Name, Badges, Follow Button */}
        <div className="flex items-center gap-2 bg-black/30 rounded-full pr-2 p-1 backdrop-blur-sm self-start">
          <Avatar
            className="h-9 w-9 border border-white/20 cursor-pointer"
            onClick={() => navigate(`/profile/${stream.host?.id}`)}
          >
            <AvatarImage src={stream.host?.avatar_url || ''} />
            <AvatarFallback className="bg-zinc-800 text-xs">
              {hostName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0 mr-1 gap-0.5">
            <span className="truncate text-sm font-semibold leading-none text-white">{hostName}</span>
            <div className="flex items-center gap-1">
              <Badge className="border-0 bg-red-600 text-white hover:bg-red-600 text-[9px] py-0 px-1 leading-tight h-3">
                <Radio className="mr-0.5 h-2 w-2" />
                DIRECT
              </Badge>
              <Badge variant="secondary" className="border-0 bg-white/10 text-white text-[9px] py-0 px-1 leading-tight h-3">
                {stream.visibility === 'public' ? <Globe className="mr-0.5 h-2 w-2" /> : <Lock className="mr-0.5 h-2 w-2" />}
                {stream.visibility === 'public' ? 'Public' : 'Amis'}
              </Badge>
            </div>
          </div>
          {!isHost && stream.host_id && user && stream.host_id !== user.id && (
            <div className="ml-1 scale-[0.85] origin-right">
              <VideoUserProfile
                profile={stream.host as any}
                showFollowButton={true}
              />
            </div>
          )}
        </div>

        {/* TOP RIGHT: Title, Description, Viewers, Close */}
        <div className="flex flex-col items-end gap-2 max-w-[55%]">
          {/* Top Row: Viewers & Close */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              className="flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-xs font-semibold text-zinc-200 backdrop-blur-sm hover:bg-white/10 transition-colors"
              onClick={() => setShowViewersModal(true)}
            >
              <Users className="h-3.5 w-3.5" />
              {viewerCount}
            </button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-white bg-black/40 backdrop-blur-sm hover:bg-black/60 hover:text-red-500"
              onClick={isHost ? handleStopLive : () => navigate('/profil')}
              disabled={isStopping}
            >
              {isStopping ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-5 w-5" />}
            </Button>
          </div>

          {/* Title & Description */}
          <div className="flex flex-col items-end text-right mt-1 bg-black/20 backdrop-blur-sm rounded-xl p-2 w-full">
            <h1 className="text-sm font-bold text-white shadow-sm leading-tight line-clamp-2">{stream.title}</h1>
            {stream.description && (
              <p className="text-xs text-zinc-200 mt-1 line-clamp-2 shadow-sm font-medium">{stream.description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-end">
        {((!isHost && state.remoteUsers.length === 0) || (isHost && !state.isJoined)) && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45">
            <div className="text-center text-zinc-200">
              <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin" />
              <p>{isHost ? 'Initialisation du live...' : 'En attente du flux du créateur...'}</p>
            </div>
          </div>
        )}

        {/* Live Chat Overlay */}
        <div className="absolute bottom-20 left-4 right-16 flex flex-col justify-end gap-2 max-h-[140px] overflow-y-auto pointer-events-auto z-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-2 w-max max-w-[100%] rounded-xl px-1 py-1 text-sm ${
                msg.type === 'gift'
                  ? 'bg-gradient-to-r from-pink-500/80 to-purple-500/80 text-white animate-bounce shadow-lg px-3'
                  : msg.type === 'join'
                  ? 'bg-transparent text-white/80 drop-shadow-md'
                  : 'bg-transparent text-white drop-shadow-md'
              }`}
            >
              {msg.type !== 'join' && (
                <Avatar className="h-7 w-7 border-[1.5px] border-white/20 shrink-0 mt-0.5">
                  <AvatarImage src={msg.userAvatar || ''} />
                  <AvatarFallback className="bg-zinc-800 text-[10px]">
                    {msg.userName?.substring(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="flex flex-col leading-tight">
                {msg.type === 'join' ? (
                  <span className="break-words flex items-center gap-1 flex-wrap text-xs text-white/90">
                    <span className="font-bold text-white">{msg.userName}</span> {msg.content}
                  </span>
                ) : (
                  <>
                    <span className="font-bold text-white/[0.85] text-xs">{msg.userName}</span>
                    <span className="break-words flex items-center gap-1 flex-wrap font-medium">
                      {msg.content}
                      {msg.currency === 'soumboulah_cash' && <span className="inline-flex items-center bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded gap-1"><img src={iconSC} alt="SC" className="w-3 h-3 object-contain" /> SC</span>}
                      {msg.currency === 'habbah' && <span className="inline-flex items-center bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded gap-1"><img src={iconH} alt="H" className="w-3 h-3 object-contain" /> H</span>}
                      {msg.currency === 'soumboulah_bonus' && <span className="inline-flex items-center bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded gap-1"><img src={iconSB} alt="SB" className="w-3 h-3 object-contain" /> SB</span>}
                    </span>
                  </>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Bottom Bar: Input and Buttons - Floating on top of relative container */}
      <div className="absolute bottom-0 left-0 right-0 px-4 py-4 z-20 bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex items-center gap-3">
          {/* Real message input */}
          <div className="flex h-[42px] flex-1 items-center rounded-full bg-black/20 border border-white/10 px-4 text-white backdrop-blur-md">
            <input 
              type="text" 
              placeholder={isHost ? "Message aux spectateurs..." : "Ajouter un commentaire..."}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-zinc-400"
            />
            <button 
              className="ml-2 flex items-center justify-center rounded-full bg-indigo-600 p-2 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
              onClick={handleSendMessage}
              disabled={!messageInput.trim()}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>

          {!isHost && (
            <>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                onClick={handleSendGiftClick}
              >
                <Gift size={22} className="text-pink-500" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                onClick={() => {
                  try {
                    if (navigator.share) {
                      navigator.share({
                        title: 'Rejoignez mon live!',
                        url: window.location.href,
                      });
                    }
                  } catch (e) {
                     console.error(e)
                  }
                }}
              >
                <Share2 size={22} />
              </Button>
            </>
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