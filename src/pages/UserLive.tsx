import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Copy,
  Crown,
  Globe,
  Hand,
  Loader2,
  Lock,
  Mic,
  MicOff,
  PhoneOff,
  Radio,
  Send,
  Share2,
  Gift,
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
import { useFollow } from '@/friends/hooks/useFollow';
import { motion } from 'framer-motion';
import type { IRemoteVideoTrack } from 'agora-rtc-sdk-ng';

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
  if (!profile) return 'Utilisateur';
  if (profile.first_name && profile.last_name) return `${profile.first_name} ${profile.last_name}`;
  return profile.username || 'Utilisateur';
};

interface LiveMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  type: 'comment' | 'gift' | 'join' | 'raise_hand';
  content: string;
  currency?: string;
  createdAt: string;
}

interface HandRaiseRequest {
  userId: string;
  userName: string;
  userAvatar?: string | null;
}

interface AcceptedParticipant extends HandRaiseRequest {
  agoraUid?: string;
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
}

interface ParticipantControlPayload {
  targetUserId: string;
  action: 'mic_on' | 'mic_off' | 'camera_on' | 'camera_off' | 'stop';
}

/** Bouton Suivre inline sans avatar, pour l'en-tête du live */
const FollowButtonInline: React.FC<{ hostId: string }> = ({ hostId }) => {
  const { friendshipStatus, sendRequest, cancelRequest, acceptRequest, removeFriend, isLoading } = useFollow(hostId);

  const label = friendshipStatus === 'friends' ? 'Abonné'
    : friendshipStatus === 'pending_sent' ? 'Envoyé'
    : 'Suivre';

  const colors = friendshipStatus === 'friends'
    ? 'bg-green-500/80 text-white'
    : friendshipStatus === 'pending_sent'
    ? 'bg-white/20 text-white'
    : 'bg-red-500 text-white';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (friendshipStatus === 'friends') removeFriend();
    else if (friendshipStatus === 'pending_sent') cancelRequest();
    else if (friendshipStatus === 'pending_received') acceptRequest();
    else sendRequest();
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`ml-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold backdrop-blur-sm transition-colors ${colors} disabled:opacity-50`}
    >
      {label}
    </button>
  );
};

/** Tuile vidéo pour un intervenant distant */
const VIDEO_TRACK_RETRY_DELAY_MS = 600;

const RemoteVideoTile: React.FC<{
  uid: string;
  getRemoteVideoTrack: (uid: string) => IRemoteVideoTrack | undefined;
  label?: string;
  avatarUrl?: string;
  remoteUsers: string[];
  showMicOff?: boolean;
  showCameraOff?: boolean;
  children?: React.ReactNode;
}> = ({ uid, getRemoteVideoTrack, label, avatarUrl, remoteUsers, showMicOff, showCameraOff, children }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tryPlay = () => {
      const track = getRemoteVideoTrack(uid);
      const el = containerRef.current;
      if (el && track) {
        el.innerHTML = '';
        track.play(el, { fit: 'cover' });
      }
    };
    tryPlay();
    // Retry once after a short delay in case the track wasn't ready yet
    const timer = setTimeout(tryPlay, VIDEO_TRACK_RETRY_DELAY_MS);
    return () => clearTimeout(timer);
  }, [uid, getRemoteVideoTrack, remoteUsers]);

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-zinc-900 aspect-[9/16]">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
      {/* Avatar fallback when no video */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {!getRemoteVideoTrack(uid) && (
          <Avatar className="h-12 w-12 border-2 border-white/20">
            <AvatarImage src={avatarUrl || ''} />
            <AvatarFallback className="bg-zinc-700 text-sm">
              {label ? label.substring(0, 2).toUpperCase() : '?'}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
      {label && (
        <div className="absolute bottom-1.5 left-1.5 right-1.5">
          <span className="text-white text-[9px] font-semibold bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded-full truncate block text-center">
            {label}
          </span>
        </div>
      )}
      <div className="absolute top-1 right-1 flex flex-col gap-0.5 pointer-events-none">
        {showMicOff && (
          <div className="bg-red-500/85 rounded-full p-0.5">
            <MicOff className="h-2.5 w-2.5 text-white" />
          </div>
        )}
        {showCameraOff && (
          <div className="bg-red-500/85 rounded-full p-0.5">
            <VideoOff className="h-2.5 w-2.5 text-white" />
          </div>
        )}
      </div>
      {children}
    </div>
  );
};

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
  const [handRaiseRequests, setHandRaiseRequests] = useState<HandRaiseRequest[]>([]);
  const [hasRaisedHand, setHasRaisedHand] = useState(false);
  const [acceptedParticipants, setAcceptedParticipants] = useState<AcceptedParticipant[]>([]);
  const [isAcceptedParticipant, setIsAcceptedParticipant] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const commentsScrollRef = useRef<HTMLDivElement>(null);
  
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const {
    state,
    joinCall,
    leaveCall,
    toggleMute,
    toggleVideo,
    setMicrophoneEnabled,
    setCameraEnabled,
    downgradeToAudience,
    localVideoContainerRef,
    remoteVideoContainerRef,
    getRemoteVideoTrack,
    upgradeToHost,
  } = useAgoraCall();

  const isHost = !!user?.id && !!stream?.host_id && user.id === stream.host_id && requestedHostMode;
  const hostName = useMemo(() => getDisplayName(stream?.host), [stream?.host]);

  // Stabilize values for presence tracking
  const stableDisplayName = useMemo(() => getDisplayName(profile), [profile?.first_name, profile?.last_name, profile?.username]);
  const stableAvatarUrl = profile?.avatar_url || null;
  const stableUserId = user?.id;
  const stableStreamId = stream?.id;
  const stableHostId = stream?.host_id;

  const upsertAcceptedParticipant = useCallback((participant: AcceptedParticipant) => {
    setAcceptedParticipants(prev => {
      const index = prev.findIndex(item => item.userId === participant.userId);
      if (index === -1) {
        return [...prev, participant];
      }

      const next = [...prev];
      next[index] = {
        ...next[index],
        ...participant,
      };
      return next;
    });
  }, []);

  // Load stream data
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

  // Presence tracking - stabilized to prevent re-subscriptions
  useEffect(() => {
    if (!stableStreamId || !stableUserId) return;

    const channelName = `live-room-${stableStreamId}`;
    const isHostRole = stableUserId === stableHostId && requestedHostMode;
    
    const roomChannel = supabase.channel(channelName, {
      config: {
        presence: {
          key: stableUserId,
        }
      }
    });

    presenceChannelRef.current = roomChannel;

    roomChannel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = roomChannel.presenceState();
        const currentViewers: any[] = [];

        Object.values(presenceState).forEach((presences) => {
          const presence = (presences as any[])[0];
          if (presence) currentViewers.push(presence);
        });

        setViewerCount(currentViewers.length);
        setViewersList(currentViewers);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        newPresences.forEach((presence: any) => {
          if (presence.user_name && presence.user_id !== stableUserId) {
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
      .on('broadcast', { event: 'raise_hand' }, (payload) => {
        const { userId, userName, userAvatar } = payload.payload;
        if (isHostRole) {
          toast.info(`🖐️ ${userName} demande à intervenir`, { duration: 5000 });
        }
        setHandRaiseRequests(prev => {
          if (prev.some(r => r.userId === userId)) return prev;
          return [...prev, { userId, userName, userAvatar }];
        });

        // Show raise hand message in chat
        const raiseMsg: LiveMessage = {
          id: crypto.randomUUID(),
          userId,
          userName,
          userAvatar,
          type: 'raise_hand',
          content: '🖐️ demande à intervenir',
          createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev.slice(-49), raiseMsg]);
      })
      .on('broadcast', { event: 'hand_accepted' }, (payload) => {
        const { userId, userName, userAvatar } = payload.payload;
        if (userId === stableUserId) {
          toast.success('Le créateur a accepté votre demande ! Vous pouvez maintenant parler.');
          setHasRaisedHand(false);
          setIsAcceptedParticipant(true);
          void upgradeToHost({ enableAudio: true, enableVideo: true });
        }
        setHandRaiseRequests(prev => prev.filter(r => r.userId !== userId));
        upsertAcceptedParticipant({
          userId,
          userName,
          userAvatar,
          isMicEnabled: true,
          isCameraEnabled: true,
        });
      })
      .on('broadcast', { event: 'participant_ready' }, (payload) => {
        const { userId, userName, userAvatar, agoraUid } = payload.payload as HandRaiseRequest & { agoraUid?: string | number };
        upsertAcceptedParticipant({
          userId,
          userName,
          userAvatar,
          agoraUid: agoraUid ? String(agoraUid) : undefined,
          isMicEnabled: true,
          isCameraEnabled: true,
        });
      })
      .on('broadcast', { event: 'participant_control' }, (payload) => {
        const { targetUserId, action } = payload.payload as ParticipantControlPayload;

        if (targetUserId === stableUserId) {
          if (action === 'mic_on') {
            void setMicrophoneEnabled(true, { notify: true });
          }
          if (action === 'mic_off') {
            void setMicrophoneEnabled(false, { notify: true });
          }
          if (action === 'camera_on') {
            void setCameraEnabled(true, { notify: true });
          }
          if (action === 'camera_off') {
            void setCameraEnabled(false, { notify: true });
          }
          if (action === 'stop') {
            void downgradeToAudience({ notify: true });
            setIsAcceptedParticipant(false);
            void roomChannel.send({
              type: 'broadcast',
              event: 'participant_stopped',
              payload: { userId: stableUserId },
            });
          }
        }

        if (isHostRole) {
          setAcceptedParticipants(prev => prev.map(participant => {
            if (participant.userId !== targetUserId) {
              return participant;
            }

            if (action === 'stop') {
              return {
                ...participant,
                isMicEnabled: false,
                isCameraEnabled: false,
              };
            }

            if (action === 'mic_on' || action === 'mic_off') {
              return {
                ...participant,
                isMicEnabled: action === 'mic_on',
              };
            }

            if (action === 'camera_on' || action === 'camera_off') {
              return {
                ...participant,
                isCameraEnabled: action === 'camera_on',
              };
            }

            return participant;
          }));
        }
      })
      .on('broadcast', { event: 'participant_stopped' }, (payload) => {
        const { userId } = payload.payload as { userId: string };
        setAcceptedParticipants(prev => prev.filter(participant => participant.userId !== userId));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await roomChannel.track({
            user_id: stableUserId,
            user_name: stableDisplayName,
            avatar_url: stableAvatarUrl,
            role: isHostRole ? 'host' : 'viewer',
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      presenceChannelRef.current = null;
      supabase.removeChannel(roomChannel);
    };
  }, [
    downgradeToAudience,
    requestedHostMode,
    setCameraEnabled,
    setMicrophoneEnabled,
    stableAvatarUrl,
    stableDisplayName,
    stableHostId,
    stableStreamId,
    stableUserId,
    upgradeToHost,
    upsertAcceptedParticipant,
  ]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (commentsScrollRef.current) {
      commentsScrollRef.current.scrollTop = commentsScrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!isAcceptedParticipant || !presenceChannelRef.current || !stableUserId || !state.localUid) {
      return;
    }

    presenceChannelRef.current.send({
      type: 'broadcast',
      event: 'participant_ready',
      payload: {
        userId: stableUserId,
        userName: stableDisplayName,
        userAvatar: stableAvatarUrl,
        agoraUid: state.localUid,
      },
    });
  }, [isAcceptedParticipant, stableAvatarUrl, stableDisplayName, stableUserId, state.localUid]);

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

  const handleRaiseHand = () => {
    if (!user || !profile || !presenceChannelRef.current || hasRaisedHand) return;

    presenceChannelRef.current.send({
      type: 'broadcast',
      event: 'raise_hand',
      payload: {
        userId: user.id,
        userName: getDisplayName(profile),
        userAvatar: profile.avatar_url,
      },
    });

    setHasRaisedHand(true);
    toast.info('Demande envoyée au créateur');
  };

  const handleAcceptHand = (userId: string, userName: string, userAvatar?: string | null) => {
    if (!presenceChannelRef.current) return;
    presenceChannelRef.current.send({
      type: 'broadcast',
      event: 'hand_accepted',
      payload: { userId, userName, userAvatar },
    });
    toast.success(`${userName} peut maintenant intervenir`);
    setHandRaiseRequests(prev => prev.filter(r => r.userId !== userId));
  };

  const handleParticipantControl = (participant: AcceptedParticipant, action: ParticipantControlPayload['action']) => {
    if (!presenceChannelRef.current) {
      return;
    }

    presenceChannelRef.current.send({
      type: 'broadcast',
      event: 'participant_control',
      payload: {
        targetUserId: participant.userId,
        action,
      } satisfies ParticipantControlPayload,
    });

    const actionLabels: Record<ParticipantControlPayload['action'], string> = {
      mic_on: 'Micro activé',
      mic_off: 'Micro coupé',
      camera_on: 'Caméra activée',
      camera_off: 'Caméra désactivée',
      stop: 'Intervention arrêtée',
    };

    toast.success(`${actionLabels[action]} pour ${participant.userName}`);

    if (action === 'stop') {
      setAcceptedParticipants(prev => prev.filter(item => item.userId !== participant.userId));
      return;
    }

    setAcceptedParticipants(prev => prev.map(item => {
      if (item.userId !== participant.userId) {
        return item;
      }

      return {
        ...item,
        isMicEnabled: action === 'mic_on' ? true : action === 'mic_off' ? false : item.isMicEnabled,
        isCameraEnabled: action === 'camera_on' ? true : action === 'camera_off' ? false : item.isCameraEnabled,
      };
    }));
  };

  const dismissHandRaise = (userId: string) => {
    setHandRaiseRequests(prev => prev.filter(r => r.userId !== userId));
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
    if (!stream || stream.status !== 'active') return;

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
    if (!stream || !isHost) return;

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

      if (error) throw error;

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
    if (!stream) return;

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

  /** Render a single comment message */
  const renderMessage = (msg: LiveMessage) => {
    const isCreator = msg.userId === stream.host_id;

    return (
      <motion.div
        key={msg.id}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={`flex items-start gap-2 w-max max-w-[100%] rounded-xl px-1.5 py-1 text-sm ${
          msg.type === 'gift'
            ? 'bg-gradient-to-r from-pink-500/80 to-purple-500/80 text-white shadow-lg px-3'
            : msg.type === 'raise_hand'
            ? 'bg-amber-500/20 text-amber-200 backdrop-blur-sm rounded-lg px-3'
            : msg.type === 'join'
            ? 'bg-transparent text-white/80 drop-shadow-md'
            : 'bg-transparent text-white drop-shadow-md'
        }`}
      >
        {msg.type !== 'join' && (
          <div className="relative shrink-0">
            <Avatar className="h-7 w-7 border-[1.5px] border-white/20 mt-0.5">
              <AvatarImage src={msg.userAvatar || ''} />
              <AvatarFallback className="bg-zinc-800 text-[10px]">
                {msg.userName?.substring(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            {isCreator && (
              <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-[2px]">
                <Crown className="h-2.5 w-2.5 text-white" />
              </div>
            )}
          </div>
        )}
        <div className="flex flex-col leading-tight">
          {msg.type === 'join' ? (
            <span className="break-words flex items-center gap-1 flex-wrap text-xs text-white/90">
              <span className="font-bold text-white">{msg.userName}</span> {msg.content}
            </span>
          ) : (
            <>
              <span className="font-bold text-white/[0.85] text-xs flex items-center gap-1">
                {msg.userName}
                {isCreator && (
                  <span className="inline-flex items-center gap-0.5 bg-amber-500/80 text-white text-[8px] font-bold px-1 py-[1px] rounded-full">
                    <Crown className="h-2 w-2" />
                    Créateur
                  </span>
                )}
              </span>
              <span className="break-words flex items-center gap-1 flex-wrap font-medium">
                {msg.content}
                {msg.currency === 'soumboulah_cash' && <span className="inline-flex items-center bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded gap-1"><img src={iconSC} alt="SC" className="w-3 h-3 object-contain" /> SC</span>}
                {msg.currency === 'habbah' && <span className="inline-flex items-center bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded gap-1"><img src={iconH} alt="H" className="w-3 h-3 object-contain" /> H</span>}
                {msg.currency === 'soumboulah_bonus' && <span className="inline-flex items-center bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded gap-1"><img src={iconSB} alt="SB" className="w-3 h-3 object-contain" /> SB</span>}
              </span>
            </>
          )}
        </div>
      </motion.div>
    );
  };

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

      {/* Right panel: accepted participants displayed vertically */}
      {(() => {
        const participantLookup = acceptedParticipants.filter(participant => participant.userId !== stableUserId);
        const panelParticipants = participantLookup.filter(participant => participant.agoraUid);
        const showPanel = panelParticipants.length > 0 || isAcceptedParticipant;
        if (!showPanel) return null;

        return (
          <div className="absolute right-2 top-16 bottom-24 z-20 flex flex-col gap-2 w-[76px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pointer-events-auto">
            {/* Own local video preview for accepted participant */}
            {isAcceptedParticipant && (
              <div className="relative w-full overflow-hidden rounded-xl bg-zinc-900 aspect-[9/16] shrink-0">
                <div ref={localVideoContainerRef} className="w-full h-full" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                <div className="absolute bottom-1.5 left-1.5 right-1.5">
                  <span className="text-white text-[9px] font-semibold bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded-full truncate block text-center">
                    {getDisplayName(profile)}
                  </span>
                </div>
                {/* Mic/camera status for own tile */}
                <div className="absolute top-1 right-1 flex flex-col gap-0.5">
                  {state.isMuted && (
                    <div className="bg-red-500/80 rounded-full p-0.5">
                      <MicOff className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                  {!state.isVideoEnabled && (
                    <div className="bg-red-500/80 rounded-full p-0.5">
                      <VideoOff className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Remote participant tiles */}
            {panelParticipants.map((participant, index) => {
              const uid = participant.agoraUid;
              if (!uid) {
                return null;
              }

              return (
                <RemoteVideoTile
                  key={`${uid}-${participant?.userId ?? index}`}
                  uid={uid}
                  getRemoteVideoTrack={getRemoteVideoTrack}
                  label={participant?.userName}
                  avatarUrl={participant?.userAvatar ?? undefined}
                  remoteUsers={state.remoteUsers}
                  showMicOff={participant ? !participant.isMicEnabled : false}
                  showCameraOff={participant ? !participant.isCameraEnabled : false}
                >
                  {isHost && participant && (
                    <div className="absolute inset-x-1 top-1 flex flex-col gap-1 pointer-events-auto">
                      <button
                        type="button"
                        className={`flex h-5 items-center justify-center rounded-full backdrop-blur-sm text-white ${participant.isMicEnabled ? 'bg-black/55 hover:bg-red-500/80' : 'bg-red-500/80 hover:bg-red-500'}`}
                        onClick={() => handleParticipantControl(participant, participant.isMicEnabled ? 'mic_off' : 'mic_on')}
                        title={participant.isMicEnabled ? 'Couper le micro' : 'Activer le micro'}
                      >
                        {participant.isMicEnabled ? <Mic className="h-2.5 w-2.5" /> : <MicOff className="h-2.5 w-2.5" />}
                      </button>
                      <button
                        type="button"
                        className={`flex h-5 items-center justify-center rounded-full backdrop-blur-sm text-white ${participant.isCameraEnabled ? 'bg-black/55 hover:bg-red-500/80' : 'bg-red-500/80 hover:bg-red-500'}`}
                        onClick={() => handleParticipantControl(participant, participant.isCameraEnabled ? 'camera_off' : 'camera_on')}
                        title={participant.isCameraEnabled ? 'Couper la caméra' : 'Activer la caméra'}
                      >
                        {participant.isCameraEnabled ? <Video className="h-2.5 w-2.5" /> : <VideoOff className="h-2.5 w-2.5" />}
                      </button>
                      <button
                        type="button"
                        className="flex h-5 items-center justify-center rounded-full bg-red-600/85 text-white backdrop-blur-sm hover:bg-red-600"
                        onClick={() => handleParticipantControl(participant, 'stop')}
                        title="Arrêter l'intervention"
                      >
                        <PhoneOff className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  )}
                </RemoteVideoTile>
              );
            })}
          </div>
        );
      })()}

      {/* Top overlay */}
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
            <FollowButtonInline hostId={stream.host_id} />
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

      {/* Main overlay content */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-end">
        {((!isHost && state.remoteUsers.length === 0) || (isHost && !state.isJoined)) && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45">
            <div className="text-center text-zinc-200">
              <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin" />
              <p>{isHost ? 'Initialisation du live...' : 'En attente du flux du créateur...'}</p>
            </div>
          </div>
        )}

        {/* Live Chat Overlay - scrollable, ~3 messages visible, scroll up for older ones */}
        {/* right offset increases when participants panel is visible */}
        <div className={`absolute bottom-20 left-4 z-10 pointer-events-auto ${
          acceptedParticipants.length > 0 || isAcceptedParticipant ? 'right-24' : 'right-16'
        }`}>
          <div
            ref={commentsScrollRef}
            className="max-h-[160px] overflow-y-auto space-y-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overscroll-contain touch-pan-y"
          >
            {messages.map((msg) => renderMessage(msg))}
          </div>
        </div>
      </div>

      {/* Hand raise requests panel – shown to the host on the left side to avoid conflict with participants panel */}
      {handRaiseRequests.length > 0 && (
        <div className="absolute left-2 bottom-24 flex flex-col gap-2 z-20 pointer-events-auto max-h-[60vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {handRaiseRequests.map((req) => (
            <div key={req.userId} className="flex flex-col items-center gap-1 bg-black/60 backdrop-blur-sm rounded-xl p-2 w-14">
              <Avatar className="h-9 w-9 border-2 border-amber-400/70">
                <AvatarImage src={req.userAvatar || ''} />
                <AvatarFallback className="bg-zinc-800 text-[10px]">
                  {req.userName?.substring(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-[8px] text-white/90 text-center truncate w-full leading-tight">
                {req.userName}
              </span>
              {isHost ? (
                <div className="flex gap-1 mt-0.5">
                  <button
                    onClick={() => handleAcceptHand(req.userId, req.userName, req.userAvatar)}
                    className="rounded-full bg-green-500/80 px-1.5 py-0.5 hover:bg-green-500 transition-colors text-[10px] text-white font-bold"
                    title="Accepter"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => dismissHandRaise(req.userId)}
                    className="rounded-full bg-red-500/80 px-1.5 py-0.5 hover:bg-red-500 transition-colors text-[10px] text-white font-bold"
                    title="Refuser"
                  >
                    ✗
                  </button>
                </div>
              ) : (
                <Hand className="h-3 w-3 text-amber-400 animate-pulse mt-0.5" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bottom Bar: Input and Buttons */}
      <div className="absolute bottom-0 left-0 right-0 px-4 py-4 z-20 bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex items-center gap-2">
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
              {/* Raise Hand Button - hidden once accepted as participant */}
              {!isAcceptedParticipant && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className={`h-11 w-11 rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white transition-all ${
                    hasRaisedHand ? 'bg-amber-500/30 border-amber-400/50 animate-pulse' : ''
                  }`}
                  onClick={handleRaiseHand}
                  disabled={hasRaisedHand}
                  title="Demander à intervenir"
                >
                  <Hand size={20} className={hasRaisedHand ? 'text-amber-400' : ''} />
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                onClick={handleSendGiftClick}
              >
                <Gift size={20} className="text-pink-500" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
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
                <Share2 size={20} />
              </Button>
            </>
          )}

          {(isHost || isAcceptedParticipant) && (
            <>
              <Button
                type="button"
                onClick={toggleMute}
                variant={state.isMuted ? 'destructive' : 'outline'}
                size="icon"
                className="h-11 w-11 shrink-0 rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                {state.isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </Button>
              <Button
                type="button"
                onClick={toggleVideo}
                variant={!state.isVideoEnabled ? 'destructive' : 'outline'}
                size="icon"
                className="h-11 w-11 shrink-0 rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                {state.isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
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
              <p className="text-center text-zinc-400 py-4">Aucun spectateur pour le moment</p>
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
                    <span className="font-medium text-sm flex items-center gap-1.5">
                      {name}
                      {role === 'host' && (
                        <span className="inline-flex items-center gap-0.5 bg-amber-500/80 text-white text-[9px] font-bold px-1.5 py-[1px] rounded-full">
                          <Crown className="h-2.5 w-2.5" /> Créateur
                        </span>
                      )}
                    </span>
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
