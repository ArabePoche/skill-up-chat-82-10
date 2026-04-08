import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Coins,
  Copy,
  Crown,
  Globe,
  Hand,
  Layers3,
  Loader2,
  Lock,
  Mic,
  MicOff,
  MessageCircle,
  PhoneOff,
  Radio,
  RefreshCw,
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
import LiveScreenDisplay from '@/live/components/LiveScreenDisplay';
import { LiveTeachingStudioRunner } from '@/live/components/LiveTeachingStudioRunner';
import LiveScreenManager, { buildScreenFromStudio } from '@/live/components/LiveScreenManager';
import { useLiveCreatorAssets } from '@/live/hooks/useLiveCreatorAssets';
import type { LiveScreen, LiveTeachingStudio } from '@/live/types';
import { isLiveScreen } from '@/live/types';
import { useEnrollmentWithProtection } from '@/hooks/useEnrollments';
import BuyWithScDialog from '@/marketplace/components/BuyWithScDialog';

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
  entry_price: number | null;
  host: HostProfile | null;
}

const getDisplayName = (profile?: HostProfile | { first_name?: string | null; last_name?: string | null; username?: string | null } | null) => {
  if (!profile) return 'Utilisateur';
  if (profile.first_name && profile.last_name) return `${profile.first_name} ${profile.last_name}`;
  return profile.username || 'Utilisateur';
};

const getActiveWhiteboardBoardId = (screen: LiveScreen | null): string | null => {
  if (!screen || screen.type !== 'teaching_studio') {
    return null;
  }

  const activeScene = screen.studio.scenes.find((scene) => scene.id === screen.studio.activeSceneId) || screen.studio.scenes[0];
  const activeWhiteboard = activeScene?.elements.find((element) => element.type === 'whiteboard');

  if (!activeScene || !activeWhiteboard) {
    return null;
  }

  return `${activeScene.id}:${activeWhiteboard.id}`;
};

interface LiveMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  type: 'comment' | 'gift' | 'join' | 'raise_hand';
  content: string;
  currency?: string;
  amount?: number;
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

interface GiftOverlayState {
  id: string;
  userName: string;
  currency?: string;
  content: string;
}

type WhiteboardHistoryMap = Record<string, any[]>;

interface LiveGiftTotals {
  soumboulah_cash: number;
  soumboulah_bonus: number;
  habbah: number;
}

const EMPTY_LIVE_GIFT_TOTALS: LiveGiftTotals = {
  soumboulah_cash: 0,
  soumboulah_bonus: 0,
  habbah: 0,
};

const isTrackedLiveGiftCurrency = (currency?: string | null): currency is keyof LiveGiftTotals => {
  return currency === 'soumboulah_cash' || currency === 'soumboulah_bonus' || currency === 'habbah';
};

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
  onRevealControls?: () => void;
}> = ({ uid, getRemoteVideoTrack, label, avatarUrl, remoteUsers, showMicOff, showCameraOff, children, onRevealControls }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tryPlay = () => {
      const track = getRemoteVideoTrack(uid);
      const el = containerRef.current;
      if (el && track) {
        el.innerHTML = '';
        track.play(el, { fit: 'contain' });
      }
    };
    tryPlay();
    // Retry once after a short delay in case the track wasn't ready yet
    const timer = setTimeout(tryPlay, VIDEO_TRACK_RETRY_DELAY_MS);
    return () => clearTimeout(timer);
  }, [uid, getRemoteVideoTrack, remoteUsers]);

  return (
    <div
      className="group relative w-full overflow-hidden rounded-xl bg-zinc-900 aspect-[9/16]"
      onClick={onRevealControls}
      onTouchStart={onRevealControls}
    >
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

const extractPresenceEntries = (value: unknown): Record<string, any>[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(item => extractPresenceEntries(item));
  if (typeof value !== 'object') return [];
  
  const record = value as Record<string, any>;
  if (Array.isArray(record.metas)) return record.metas.flatMap(item => extractPresenceEntries(item));
  
  if ('user_id' in record || 'userId' in record || 'role' in record) return [record];
  return Object.values(record).flatMap(item => extractPresenceEntries(item));
};

/** Format a SC amount to at most 2 decimal places */
const formatScAmount = (sc: number) =>
  sc.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** Convert a FCFA price to SC, rounded to 2 decimal places to avoid floating-point drift */
const fcfaToScRounded = (priceFcfa: number, rate: number): number => {
  if (!rate || rate <= 0) return 0;
  return Math.round((priceFcfa / rate) * 100) / 100;
};

const UserLive: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const requestedHostMode = searchParams.get('host') === '1';

  const [stream, setStream] = useState<LiveStreamRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewersList, setViewersList] = useState<any[]>([]);
  const [showViewersModal, setShowViewersModal] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [handRaiseRequests, setHandRaiseRequests] = useState<HandRaiseRequest[]>([]);
  const [hasRaisedHand, setHasRaisedHand] = useState(false);
  const [acceptedParticipants, setAcceptedParticipants] = useState<AcceptedParticipant[]>([]);
  const [isAcceptedParticipant, setIsAcceptedParticipant] = useState(false);
  const [activeGiftOverlay, setActiveGiftOverlay] = useState<GiftOverlayState | null>(null);
  const [expandedParticipantControlsId, setExpandedParticipantControlsId] = useState<string | null>(null);
  const [isDescriptionVisible, setIsDescriptionVisible] = useState(true);
  const [areCommentsCollapsed, setAreCommentsCollapsed] = useState(false);
  const [liveGiftTotals, setLiveGiftTotals] = useState<LiveGiftTotals>(EMPTY_LIVE_GIFT_TOTALS);
  const [publicLiveScreen, setPublicLiveScreen] = useState<LiveScreen | null>(null);
  const [privateLiveScreen, setPrivateLiveScreen] = useState<LiveScreen | null>(null);
  const [isScreenManagerOpen, setIsScreenManagerOpen] = useState(false);
  const [isBuyProductDialogOpen, setIsBuyProductDialogOpen] = useState(false);
  const [remoteWhiteboardAction, setRemoteWhiteboardAction] = useState<any>(null);
  const [whiteboardHistories, setWhiteboardHistories] = useState<WhiteboardHistoryMap>({});
  // Payment gate state: null = checking, true = access granted, false = payment required
  const [hasPaidEntry, setHasPaidEntry] = useState<boolean | null>(null);
  const [isPayingEntry, setIsPayingEntry] = useState(false);
  const [scToFcfaRate, setScToFcfaRate] = useState<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const commentsScrollRef = useRef<HTMLDivElement>(null);
  const commentsTouchStartXRef = useRef<number | null>(null);
  const publicLiveScreenRef = useRef<LiveScreen | null>(null);
  const whiteboardHistoriesRef = useRef<WhiteboardHistoryMap>({});
  const endedLiveHandledRef = useRef<string | null>(null);
  const pendingStudioBroadcastRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingStudioScreenRef = useRef<LiveScreen | null>(null);
  
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const {
    state,
    joinCall,
    leaveCall,
    toggleMute,
    toggleVideo,
    switchCamera,
    setMicrophoneEnabled,
    setCameraEnabled,
    setPrimaryRemoteUid,
    downgradeToAudience,
    localVideoContainerRef,
    remoteVideoContainerRef,
    getRemoteVideoTrack,
    upgradeToHost,
  } = useAgoraCall();

  const [visitorId] = useState(() => {
    const saved = sessionStorage.getItem('live_visitor_id');
    if (saved) return saved;
    const newId = crypto.randomUUID();
    sessionStorage.setItem('live_visitor_id', newId);
    return newId;
  });
  const stableUserId = user?.id || visitorId;
  const stableStreamId = stream?.id;
  const stableHostId = stream?.host_id;

  const isHost = !!user?.id && !!stream?.host_id && user.id === stream.host_id && requestedHostMode;

  useEffect(() => {
    const preparedStudio = location.state?.preparedStudio;
    if (preparedStudio && isHost && !publicLiveScreen) {
      const screen = buildScreenFromStudio(preparedStudio);
      setPublicLiveScreen(screen);
      publicLiveScreenRef.current = screen;
    }
  }, [isHost, location.state?.preparedStudio, publicLiveScreen]);

  const hostName = useMemo(() => getDisplayName(stream?.host), [stream?.host]);
  const compactHostName = useMemo(() => {
    if (hostName.length <= 14) return hostName;
    return `${hostName.slice(0, 12).trimEnd()}…`;
  }, [hostName]);
  const { data: creatorLiveAssets } = useLiveCreatorAssets(isHost ? stableUserId : null);
  const { enroll, isFormationPending } = useEnrollmentWithProtection();

  // Stabilize values for presence tracking
  const stableDisplayName = useMemo(() => {
    if (profile) return getDisplayName(profile);
    return `Spectateur ${stableUserId.substring(0, 4)}`;
  }, [profile, stableUserId]);

  const stableAvatarUrl = profile?.avatar_url || null;

  useEffect(() => {
    publicLiveScreenRef.current = publicLiveScreen;
  }, [publicLiveScreen]);

  useEffect(() => {
    whiteboardHistoriesRef.current = whiteboardHistories;
  }, [whiteboardHistories]);

  useEffect(() => {
    return () => {
      if (pendingStudioBroadcastRef.current) {
        clearTimeout(pendingStudioBroadcastRef.current);
      }
    };
  }, []);

  const syncLivePresence = useCallback((screenOverride?: LiveScreen | null) => {
    if (!presenceChannelRef.current) {
      return;
    }

    const role = isHost ? 'host' : isAcceptedParticipant ? 'participant' : 'viewer';
    const screen = screenOverride === undefined ? publicLiveScreenRef.current : screenOverride;

    void presenceChannelRef.current.track({
      user_id: stableUserId,
      user_name: stableDisplayName,
      avatar_url: stableAvatarUrl,
      role,
      public_live_screen: isHost ? screen : null,
      agora_uid: (isHost || isAcceptedParticipant) ? state.localUid : null,
      mic_enabled: (isHost || isAcceptedParticipant) ? !state.isMuted : null,
      camera_enabled: (isHost || isAcceptedParticipant) ? state.isVideoEnabled : null,
      online_at: new Date().toISOString(),
    });
  }, [
    isAcceptedParticipant,
    isHost,
    stableAvatarUrl,
    stableDisplayName,
    stableUserId,
    state.isMuted,
    state.isVideoEnabled,
    state.localUid,
  ]);

  const requestLiveScreenState = useCallback((reason: string = 'viewer_resync') => {
    if (isHost || !presenceChannelRef.current) {
      return;
    }

    void presenceChannelRef.current.send({
      type: 'broadcast',
      event: 'request_live_screen_state',
      payload: {
        requesterUserId: stableUserId,
        reason,
      },
    });
  }, [isHost, stableUserId]);

  const requestWhiteboardState = useCallback((boardId: string, reason: string = 'viewer_board_sync') => {
    if (isHost || !presenceChannelRef.current || !boardId) {
      return;
    }

    void presenceChannelRef.current.send({
      type: 'broadcast',
      event: 'request_whiteboard_state',
      payload: {
        requesterUserId: stableUserId,
        boardId,
        reason,
      },
    });
  }, [isHost, stableUserId]);

  const applyWhiteboardActionToHistories = useCallback((current: WhiteboardHistoryMap, action: any): WhiteboardHistoryMap => {
    const boardId = action?.boardId;
    if (!boardId || typeof boardId !== 'string') {
      return current;
    }

    const boardHistory = Array.isArray(current[boardId]) ? current[boardId] : [];

    if (action.type === 'clear') {
      return {
        ...current,
        [boardId]: [],
      };
    }

    if (action.type === 'sync_full' && Array.isArray(action.history)) {
      return {
        ...current,
        [boardId]: action.history,
      };
    }

    if (action.type === 'item_transform' && action.payload?.targetId && action.payload?.targetType) {
      return {
        ...current,
        [boardId]: boardHistory.map((entry) => {
          if (entry.type !== action.payload.targetType || entry.payload?.id !== action.payload.targetId) {
            return entry;
          }

          return {
            ...entry,
            payload: {
              ...entry.payload,
              ...(action.payload.updates || {}),
            },
          };
        }),
      };
    }

    if (action.type === 'stroke' || action.type === 'text' || action.type === 'image') {
      return {
        ...current,
        [boardId]: [...boardHistory, action],
      };
    }

    return current;
  }, []);

  const updateWhiteboardHistories = useCallback((updater: WhiteboardHistoryMap | ((current: WhiteboardHistoryMap) => WhiteboardHistoryMap)) => {
    setWhiteboardHistories((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater;
      whiteboardHistoriesRef.current = next;
      return next;
    });
  }, []);

  const broadcastPublicLiveScreen = useCallback((screen: LiveScreen | null) => {
    syncLivePresence(screen);

    if (!presenceChannelRef.current) {
      return;
    }

    void presenceChannelRef.current.send({
      type: 'broadcast',
      event: 'live_screen_update',
      payload: {
        screen,
        senderUserId: stableUserId,
      },
    });
  }, [stableUserId, syncLivePresence]);

  const scheduleStudioBroadcast = useCallback((screen: LiveScreen | null) => {
    pendingStudioScreenRef.current = screen;

    if (pendingStudioBroadcastRef.current) {
      return;
    }

    pendingStudioBroadcastRef.current = setTimeout(() => {
      pendingStudioBroadcastRef.current = null;
      const pendingScreen = pendingStudioScreenRef.current;
      pendingStudioScreenRef.current = null;
      broadcastPublicLiveScreen(pendingScreen);
    }, 120);
  }, [broadcastPublicLiveScreen]);

  const connectedPeople = useMemo(() => {
      const merged = new Map<string, any>();

      // Étape 1: Ajouter TOUTE la présence Supabase
      viewersList.forEach((v) => {
        const id = v.user_id || v.userId || v.presence_ref;
        if (!id) return;
        merged.set(id, v);
      });

      // Étape 2: Enrichir avec les données des intervenants acceptés
      acceptedParticipants.forEach((p) => {
        const id = p.userId;
        if (!id) return;

        const existing = merged.get(id);
        merged.set(id, {
          ...(existing || {}),
          user_id: id,
          user_name: p.userName,
          avatar_url: p.userAvatar,
          // Un participant accepté DOIT avoir un rôle participant (sauf si c'est le host)
          role: (existing?.role === 'host' || id === stableHostId) ? 'host' : 'participant',
          agora_uid: p.agoraUid
        });
      });

      return Array.from(merged.values());
    }, [acceptedParticipants, viewersList, stableHostId]);

  const hostAgoraUid = useMemo(() => {
    const hostPresence = connectedPeople.find(p => p.role === 'host' && (p.user_id || p.userId) === stableHostId);
    return hostPresence?.agora_uid ? String(hostPresence.agora_uid) : null;
  }, [stableHostId, connectedPeople]);

  const audienceCount = useMemo(() => {
    return viewersList.filter((presence) => {
      const presenceUserId = presence.user_id || presence.userId;
      return presenceUserId && presenceUserId !== stableHostId;
    }).length;
  }, [stableHostId, viewersList]);

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
        .select('id, host_id, title, description, visibility, status, agora_channel, started_at, ended_at, entry_price')
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

  // Check payment status and fetch SC rate when stream loads
  useEffect(() => {
    if (!stream) return;

    const entryPrice = stream.entry_price;

    // Host and free lives don't require payment
    if (isHost || !entryPrice || entryPrice <= 0) {
      setHasPaidEntry(true);
      return;
    }

    // Unauthenticated viewers need to log in first
    if (!user?.id) {
      setHasPaidEntry(false);
      return;
    }

    let isMounted = true;

    const checkPaymentAndRate = async () => {
      // Fetch conversion rate
      const { data: rateData } = await supabase
        .from('currency_conversion_settings')
        .select('sc_to_fcfa_rate')
        .single();

      if (isMounted && rateData) {
        setScToFcfaRate(rateData.sc_to_fcfa_rate ?? 0);
      }

      // Check if user already paid entry for this live (uses limit(1) to safely handle duplicates)
      const { data: existingTxList, error: txCheckError } = await supabase
        .from('wallet_transactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('reference_id', stream.id)
        .eq('transaction_type', 'live_entry')
        .limit(1);

      if (isMounted) {
        setHasPaidEntry(!txCheckError && Array.isArray(existingTxList) && existingTxList.length > 0);
      }
    };

    void checkPaymentAndRate();

    return () => {
      isMounted = false;
    };
  }, [isHost, stream, user?.id]);

  // Payment handler for live entry
  const handlePayLiveEntry = useCallback(async () => {
    if (!stream || !user?.id || !stream.entry_price || stream.entry_price <= 0) return;

    if (scToFcfaRate <= 0) {
      toast.error('Le taux de conversion SC n\'est pas configuré. Contactez un administrateur.');
      return;
    }

    const scAmount = fcfaToScRounded(stream.entry_price, scToFcfaRate);

    // Check wallet balance
    const { data: walletData, error: walletError } = await supabase
      .from('user_wallets')
      .select('soumboulah_cash')
      .eq('user_id', user.id)
      .maybeSingle();

    if (walletError || !walletData) {
      toast.error('Impossible de vérifier votre portefeuille.');
      return;
    }

    if ((walletData.soumboulah_cash || 0) < scAmount) {
      toast.error(`Solde insuffisant. Il vous faut ${formatScAmount(scAmount)} SC pour accéder à ce live.`);
      return;
    }

    setIsPayingEntry(true);

    try {
      const { data, error } = await supabase.rpc('transfer_soumboulah_cash', {
        p_recipient_id: stream.host_id,
        p_amount: scAmount,
        p_reason: `Accès au live payant : ${stream.title}`,
        p_reference_id: stream.id,
      });

      if (error) throw error;
      const result = data as any;
      if (result && !result.success) throw new Error(result.message || 'Paiement refusé');

      // Insert a zero-amount live_entry marker so we can detect on reload that the user has paid.
      // Amount is 0 because the actual debit was handled atomically by the RPC above.
      const { error: markerError } = await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        currency: 'soumboulah_cash',
        amount: 0,
        transaction_type: 'live_entry',
        description: `Accès au live : ${stream.title}`,
        reference_id: stream.id,
        reference_type: 'user_live_stream',
      });

      if (markerError) {
        // Non-fatal: the user has paid, just log the tracking failure
        console.error('Erreur enregistrement marqueur live_entry:', markerError);
      }

      toast.success('Paiement effectué ! Bienvenue dans le live.');
      setHasPaidEntry(true);
    } catch (err: any) {
      console.error('Erreur paiement live:', err);
      toast.error(err?.message || 'Erreur lors du paiement.');
    } finally {
      setIsPayingEntry(false);
    }
  }, [scToFcfaRate, stream, user?.id]);

  // Presence tracking - stabilized to prevent re-subscriptions
  useEffect(() => {
    if (!stableStreamId) return;
    // Wait until payment is confirmed before subscribing to presence
    if (hasPaidEntry !== true) return;

    const channelName = `live-room-${stableStreamId}`;
    const isHostRole = user?.id && stableUserId === stableHostId && requestedHostMode;
    
    const roomChannel = supabase.channel(channelName, {
      config: {
        presence: {
          key: stableUserId,
        },
        broadcast: {
          self: true, // Permet de recevoir ses propres événements pour confirmation
        }
      }
    });

    presenceChannelRef.current = roomChannel;

    const updatePresenceState = () => {
      const presenceState = roomChannel.presenceState();
      const uniqueUsers = new Map<string, any>();

      Object.entries(presenceState).forEach(([presenceKey, presences]) => {
        extractPresenceEntries(presences).forEach((presence: any) => {
          if (!presence || typeof presence !== 'object') return;

          const userId = presence.user_id || presence.userId || presenceKey;
          if (!userId) return;

          // On garde les infos les plus récentes ou les rôles les plus importants
          const existing = uniqueUsers.get(userId);
          const isMoreRecent = presence.online_at && (!existing?.online_at || presence.online_at > existing.online_at);
          const hasBetterRole = (presence.role === 'participant' || presence.role === 'host') && existing?.role === 'viewer';
          
          if (!existing || isMoreRecent || hasBetterRole) {
            uniqueUsers.set(userId, {
              ...presence,
              user_id: userId,
              presence_ref: presenceKey
            });
          }
        });
      });

      const currentViewers = Array.from(uniqueUsers.values());
      const reconstructedParticipants: AcceptedParticipant[] = [];

      if (!isHostRole) {
        const hostPresence = currentViewers.find((presence) => {
          const presenceUserId = presence.user_id || presence.userId;
          return presence.role === 'host' && presenceUserId === stableHostId;
        });

        if (isLiveScreen(hostPresence?.public_live_screen)) {
          setPublicLiveScreen(hostPresence.public_live_screen);
        } else if (!publicLiveScreenRef.current) {
          requestLiveScreenState('presence_sync_missing_screen');
        }
      }

      currentViewers.forEach((presence) => {
        if (presence.role === 'participant') {
          reconstructedParticipants.push({
            userId: presence.user_id,
            userName: presence.user_name || 'Utilisateur',
            userAvatar: presence.avatar_url || null,
            agoraUid: presence.agora_uid ? String(presence.agora_uid) : undefined,
            isMicEnabled: presence.mic_enabled !== false,
            isCameraEnabled: presence.camera_enabled !== false,
          });
        }
      });

      setViewersList(currentViewers);
      
      // SYNC: Nettoyer les participants qui ne sont plus connectés ou n'ont plus le rôle participant
      setAcceptedParticipants(prev => {
        // 1. On ne garde que ceux qui sont encore présents physiquement ET qui ont le rôle participant
        // (Sauf si c'est nous-même et qu'on vient d'accepter, on attend la sync)
        const next = reconstructedParticipants.map(rp => {
          const existing = prev.find(p => p.userId === rp.userId);
          return existing ? { ...existing, ...rp } : rp;
        });

        return next;
      });
    };

    roomChannel
      .on('presence', { event: 'sync' }, updatePresenceState)
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        extractPresenceEntries(newPresences).forEach((presence: any) => {
          const userId = presence?.user_id || presence?.userId || key;
          if (presence.user_name && userId !== stableUserId) {
            const joinMsg: LiveMessage = {
              id: crypto.randomUUID(),
              userId: userId || 'system',
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
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        // Optionnel: On pourrait ajouter un message de départ ou nettoyer ici, 
        // mais le 'sync' s'en occupe déjà de manière globale.
        updatePresenceState();
      })
      .on('broadcast', { event: 'live_action' }, (payload) => {
        const newMsg = payload.payload as LiveMessage;
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev.slice(-49), newMsg];
        });
        if (newMsg.type === 'gift') {
          if (isHost && isTrackedLiveGiftCurrency(newMsg.currency) && typeof newMsg.amount === 'number' && newMsg.amount > 0) {
            setLiveGiftTotals((current) => ({
              ...current,
              [newMsg.currency]: current[newMsg.currency] + newMsg.amount,
            }));
          }

          setActiveGiftOverlay({
            id: newMsg.id,
            userName: newMsg.userName,
            currency: newMsg.currency,
            content: newMsg.content,
          });
        }
      })
      .on('broadcast', { event: 'raise_hand' }, (payload) => {
        const { id, userId, userName, userAvatar } = payload.payload;
        if (isHostRole) {
          toast.info(`🖐️ ${userName} demande à intervenir`, { duration: 5000 });
        }
        setHandRaiseRequests(prev => {
          if (prev.some(r => r.userId === userId)) return prev;
          return [...prev, { userId, userName, userAvatar }];
        });

        // Show raise hand message in chat
        const raiseMsg: LiveMessage = {
          id: id || crypto.randomUUID(),
          userId,
          userName,
          userAvatar,
          type: 'raise_hand',
          content: '🖐️ demande à intervenir',
          createdAt: new Date().toISOString(),
        };
        setMessages(prev => {
          if (prev.some(m => m.id === raiseMsg.id)) return prev;
          return [...prev.slice(-49), raiseMsg];
        });
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
      .on('broadcast', { event: 'live_screen_update' }, (payload) => {
        const senderUserId = (payload.payload as { senderUserId?: string | null })?.senderUserId;
        if (senderUserId === stableUserId) {
          return;
        }

        const nextScreen = (payload.payload as { screen?: unknown })?.screen;
        const validScreen = isLiveScreen(nextScreen) ? nextScreen : null;
        setPublicLiveScreen(validScreen);

        if (!isHostRole) {
          const activeBoardId = getActiveWhiteboardBoardId(validScreen);
          if (activeBoardId) {
            requestWhiteboardState(activeBoardId, 'live_screen_update');
          }
        }
      })
      .on('broadcast', { event: 'request_live_screen_state' }, () => {
        if (!isHostRole) {
          return;
        }

        void roomChannel.send({
          type: 'broadcast',
          event: 'live_screen_state',
          payload: {
            screen: publicLiveScreenRef.current,
            whiteboard_histories: whiteboardHistoriesRef.current,
            senderUserId: stableUserId,
          },
        });
      })
      .on('broadcast', { event: 'request_whiteboard_state' }, (payload) => {
        if (!isHostRole) {
          return;
        }

        const boardId = (payload.payload as { boardId?: string | null })?.boardId;
        if (!boardId) {
          return;
        }

        void roomChannel.send({
          type: 'broadcast',
          event: 'whiteboard_state',
          payload: {
            boardId,
            history: whiteboardHistoriesRef.current[boardId] || [],
            senderUserId: stableUserId,
          },
        });
      })
      .on('broadcast', { event: 'live_screen_state' }, (payload) => {
        const senderUserId = (payload.payload as { senderUserId?: string | null })?.senderUserId;
        if (senderUserId === stableUserId) {
          return;
        }

        const nextScreen = (payload.payload as { screen?: unknown })?.screen;
        const validScreen = isLiveScreen(nextScreen) ? nextScreen : null;
        setPublicLiveScreen(validScreen);

        const receivedHistories = (payload.payload as any)?.whiteboard_histories;
        if (receivedHistories && typeof receivedHistories === 'object' && !Array.isArray(receivedHistories)) {
          updateWhiteboardHistories(receivedHistories as WhiteboardHistoryMap);
        } else {
          const legacyWhiteboardHistory = (payload.payload as any)?.whiteboard_history;
          if (Array.isArray(legacyWhiteboardHistory) && validScreen && validScreen.type === 'teaching_studio') {
            const activeScene = validScreen.studio.scenes.find((scene) => scene.id === validScreen.studio.activeSceneId) || validScreen.studio.scenes[0];
            const activeWhiteboard = activeScene?.elements.find((element) => element.type === 'whiteboard');

            if (activeScene && activeWhiteboard) {
              updateWhiteboardHistories((current) => ({
                ...current,
                [`${activeScene.id}:${activeWhiteboard.id}`]: legacyWhiteboardHistory,
              }));
            }
          }
        }

        if (!isHostRole) {
          const activeBoardId = getActiveWhiteboardBoardId(validScreen);
          if (activeBoardId) {
            requestWhiteboardState(activeBoardId, 'live_screen_state');
          }
        }

        setRemoteWhiteboardAction(null);
      })
      .on('broadcast', { event: 'whiteboard_state' }, (payload) => {
        const senderUserId = (payload.payload as { senderUserId?: string | null })?.senderUserId;
        if (senderUserId === stableUserId) {
          return;
        }

        const boardId = (payload.payload as { boardId?: string | null })?.boardId;
        const history = (payload.payload as { history?: any[] })?.history;

        if (!boardId || !Array.isArray(history)) {
          return;
        }

        updateWhiteboardHistories((current) => ({
          ...current,
          [boardId]: history,
        }));
        setRemoteWhiteboardAction(null);
      })
      .on('broadcast', { event: 'whiteboard_update' }, (payload) => {
        const action = (payload.payload as any)?.action;
        const senderUserId = (payload.payload as { senderUserId?: string | null })?.senderUserId;

        if (senderUserId === stableUserId) {
          return;
        }

        if (!action) {
          return;
        }

        if (action.type === 'stroke_update') {
          setRemoteWhiteboardAction(action);
          return;
        }

        updateWhiteboardHistories((current) => applyWhiteboardActionToHistories(current, action));
        setRemoteWhiteboardAction(null);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await roomChannel.track({
            user_id: stableUserId,
            user_name: stableDisplayName,
            avatar_url: stableAvatarUrl,
            role: isHostRole ? 'host' : 'viewer',
            public_live_screen: isHostRole ? publicLiveScreenRef.current : null,
            online_at: new Date().toISOString(),
          });

          if (!isHostRole) {
            await roomChannel.send({
              type: 'broadcast',
              event: 'request_live_screen_state',
              payload: {
                requesterUserId: stableUserId,
              },
            });
          }
        }
      });

    return () => {
      presenceChannelRef.current = null;
      supabase.removeChannel(roomChannel);
    };
  }, [
    applyWhiteboardActionToHistories,
    downgradeToAudience,
    requestLiveScreenState,
    requestWhiteboardState,
    requestedHostMode,
    setCameraEnabled,
    setMicrophoneEnabled,
    stableAvatarUrl,
    stableDisplayName,
    stableHostId,
    stableStreamId,
    stableUserId,
    updateWhiteboardHistories,
    upgradeToHost,
    upsertAcceptedParticipant,
    hasPaidEntry,
  ]);

  useEffect(() => {
    if (!stableStreamId || !stableHostId) {
      setLiveGiftTotals(EMPTY_LIVE_GIFT_TOTALS);
      return;
    }

    let isMounted = true;

    const mergeLiveGiftTransaction = (transaction: { currency?: string | null; amount?: number | null; transaction_type?: string | null }) => {
      if (!isTrackedLiveGiftCurrency(transaction.currency)) {
        return;
      }

      const rawAmount = Number(transaction.amount || 0);
      const delta = transaction.transaction_type === 'gift_received' || transaction.transaction_type === 'gift'
        ? Math.abs(rawAmount)
        : transaction.transaction_type === 'commission'
        ? Math.abs(rawAmount)
        : 0;

      if (delta === 0) {
        return;
      }

      setLiveGiftTotals((current) => ({
        ...current,
        [transaction.currency as keyof LiveGiftTotals]: current[transaction.currency as keyof LiveGiftTotals] + delta,
      }));
    };

    const loadLiveGiftTotals = async () => {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('currency, amount, transaction_type, reference_id, reference_type')
        .eq('user_id', stableHostId)
        .eq('reference_id', stableStreamId)
        .in('transaction_type', ['gift', 'gift_received', 'commission']);

      if (error) {
        console.error('Erreur chargement cumul cadeaux live:', error);
        return;
      }

      const nextTotals = (data || []).reduce<LiveGiftTotals>((totals, transaction: any) => {
        const currency = transaction.currency as keyof LiveGiftTotals;
        if (!isTrackedLiveGiftCurrency(currency)) {
          return totals;
        }

        if (transaction.transaction_type === 'gift_received' || transaction.transaction_type === 'gift') {
          totals[currency] += Math.abs(Number(transaction.amount || 0));
        }

        if (transaction.transaction_type === 'commission') {
          totals[currency] += Math.abs(Number(transaction.amount || 0));
        }

        return totals;
      }, {
        ...EMPTY_LIVE_GIFT_TOTALS,
      });

      if (isMounted) {
        setLiveGiftTotals(nextTotals);
      }
    };

    void loadLiveGiftTotals();

    const transactionChannel = supabase
      .channel(`live-gift-transactions-${stableStreamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wallet_transactions',
          filter: `user_id=eq.${stableHostId}`,
        },
        (payload) => {
          const transaction = payload.new as {
            currency?: string | null;
            amount?: number | null;
            transaction_type?: string | null;
            reference_id?: string | null;
            reference_type?: string | null;
          };

          if (transaction.reference_id !== stableStreamId) {
            return;
          }

          mergeLiveGiftTransaction(transaction);
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(transactionChannel);
    };
  }, [stableHostId, stableStreamId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (commentsScrollRef.current) {
      commentsScrollRef.current.scrollTop = commentsScrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!isAcceptedParticipant || !presenceChannelRef.current || !state.localUid) {
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

  useEffect(() => {
    syncLivePresence();
  }, [syncLivePresence]);

  const handleSelectPublicLiveScreen = useCallback((screen: LiveScreen | null) => {
    publicLiveScreenRef.current = screen;
    setPublicLiveScreen(screen);

    broadcastPublicLiveScreen(screen);
  }, [broadcastPublicLiveScreen]);

  const handleStudioSceneChange = useCallback((sceneId: string) => {
    if (!isHost || !publicLiveScreen || publicLiveScreen.type !== 'teaching_studio') return;
    
    const nextStudio = {
      ...publicLiveScreen.studio,
      activeSceneId: sceneId,
    };
    
    const nextScreen = {
      ...publicLiveScreen,
      studio: nextStudio
    };
    
    handleSelectPublicLiveScreen(nextScreen);
  }, [isHost, publicLiveScreen, handleSelectPublicLiveScreen]);

  const handleStudioUpdate = useCallback((nextStudio: LiveTeachingStudio) => {
    if (!isHost || !publicLiveScreen || publicLiveScreen.type !== 'teaching_studio') {
      return;
    }

    const nextScreen = {
      ...publicLiveScreen,
      studio: nextStudio,
    };

    publicLiveScreenRef.current = nextScreen;
    setPublicLiveScreen(nextScreen);
    scheduleStudioBroadcast(nextScreen);
  }, [isHost, publicLiveScreen, scheduleStudioBroadcast]);

  const handleWhiteboardAction = useCallback((action: any) => {
    if (!isHost || !presenceChannelRef.current) return;

    if (action.type !== 'stroke_update') {
      updateWhiteboardHistories((current) => applyWhiteboardActionToHistories(current, action));
    }

    void presenceChannelRef.current.send({
      type: 'broadcast',
      event: 'whiteboard_update',
      payload: {
        action,
        senderUserId: stableUserId,
      }
    });
  }, [applyWhiteboardActionToHistories, isHost, stableUserId, updateWhiteboardHistories]);

  useEffect(() => {
    if (isHost) {
      return;
    }

    const activeBoardId = getActiveWhiteboardBoardId(publicLiveScreen);
    if (activeBoardId) {
      requestWhiteboardState(activeBoardId, 'active_board_changed');
    }
  }, [isHost, publicLiveScreen, requestWhiteboardState]);

  useEffect(() => {
    if (isHost) {
      return;
    }

    const requestLatestWhiteboardState = () => {
      if (document.visibilityState === 'hidden' || !presenceChannelRef.current) {
        return;
      }

      requestLiveScreenState('viewer_resync');

      const activeBoardId = getActiveWhiteboardBoardId(publicLiveScreenRef.current);
      if (activeBoardId) {
        requestWhiteboardState(activeBoardId, 'viewer_resync');
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestLatestWhiteboardState();
      }
    };

    window.addEventListener('focus', requestLatestWhiteboardState);
    window.addEventListener('online', requestLatestWhiteboardState);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', requestLatestWhiteboardState);
      window.removeEventListener('online', requestLatestWhiteboardState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isHost, requestLiveScreenState, requestWhiteboardState]);

  const handleSelectPrivateLiveScreen = useCallback((screen: LiveScreen | null) => {
    setPrivateLiveScreen(screen);
  }, []);

  const handleOpenFormationFromScreen = useCallback((formationId: string) => {
    navigate(`/cours/formation/${formationId}`);
  }, [navigate]);

  const handleOpenLessonFromScreen = useCallback((lessonId: string) => {
    navigate(`/cours/lesson/${lessonId}`);
  }, [navigate]);

  const handleOpenBuyProductFromScreen = useCallback(() => {
    if (!user?.id) {
      navigate('/auth');
      return;
    }

    if (publicLiveScreen?.type !== 'shop_product') {
      return;
    }

    setIsBuyProductDialogOpen(true);
  }, [navigate, publicLiveScreen, user?.id]);

  const handleEnrollFromScreen = useCallback(async (
    screen: LiveScreen,
    planType: 'free' | 'standard' | 'premium' | 'groupe' = 'free'
  ) => {
    if (screen.type !== 'formation_enrollment') {
      return;
    }

    if (!user?.id) {
      navigate('/auth');
      return;
    }

    await enroll(screen.formation.id, user.id, planType);
  }, [enroll, navigate, user?.id]);

  useEffect(() => {
    if (isHost) {
      return;
    }

    setPrimaryRemoteUid(hostAgoraUid);
  }, [hostAgoraUid, isHost, setPrimaryRemoteUid]);

  useEffect(() => {
    if (!activeGiftOverlay) {
      return;
    }

    const timer = window.setTimeout(() => {
      setActiveGiftOverlay(current => current?.id === activeGiftOverlay.id ? null : current);
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [activeGiftOverlay]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !presenceChannelRef.current) return;

    const newMessage: LiveMessage = {
      id: crypto.randomUUID(),
      userId: stableUserId,
      userName: stableDisplayName,
      userAvatar: stableAvatarUrl,
      type: 'comment',
      content: messageInput.trim(),
      createdAt: new Date().toISOString(),
    };

    presenceChannelRef.current.send({
      type: 'broadcast',
      event: 'live_action',
      payload: newMessage,
    });

    setMessageInput('');
  };

  const handleRaiseHand = () => {
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
    if (isHost) return;
    setShowGiftModal(true);
  };

  const handleGiftSuccess = (amount: number, currency: string, giftLabel: string, isAnonymous: boolean) => {
    if (!presenceChannelRef.current) return;

    const senderName = isAnonymous ? 'Un utilisateur anonyme' : stableDisplayName;

    const newMessage: LiveMessage = {
      id: crypto.randomUUID(),
      userId: stableUserId,
      userName: senderName,
      userAvatar: isAnonymous ? null : stableAvatarUrl,
      type: 'gift',
      content: `a envoyé ${giftLabel}`,
      currency,
      amount,
      createdAt: new Date().toISOString(),
    };

    presenceChannelRef.current.send({
      type: 'broadcast',
      event: 'live_action',
      payload: newMessage,
    });
  };

  useEffect(() => {
    if (!stream || stream.status !== 'active') return;
    // Do not join until payment is confirmed
    if (hasPaidEntry !== true) return;

    void joinCall(stream.agora_channel, 'video', {
      role: isHost ? 'host' : 'viewer',
      enableAudio: isHost,
      enableVideo: isHost,
    });

    return () => {
      void leaveCall();
    };
  }, [hasPaidEntry, isHost, joinCall, leaveCall, stream?.agora_channel, stream?.status]);

  useEffect(() => {
    if (stream?.status === 'ended' && state.isJoined) {
      void leaveCall();
    }
  }, [leaveCall, state.isJoined, stream?.status]);

  useEffect(() => {
    if (!stream?.id || stream.status !== 'ended') {
      if (stream?.status === 'active') {
        endedLiveHandledRef.current = null;
      }
      return;
    }

    if (endedLiveHandledRef.current === stream.id) {
      return;
    }

    endedLiveHandledRef.current = stream.id;

    setHasRaisedHand(false);
    setIsAcceptedParticipant(false);
    setHandRaiseRequests([]);
    setAcceptedParticipants([]);
    setPublicLiveScreen(null);
    setPrivateLiveScreen(null);
    void leaveCall();

    if (!isHost) {
      toast.info('Le créateur a mis fin au live.');
      navigate('/video', { replace: true });
    }
  }, [isHost, leaveCall, navigate, stream?.id, stream?.status]);

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

  const handleCommentsTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    commentsTouchStartXRef.current = event.touches[0]?.clientX ?? null;
  };

  const handleCommentsTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const startX = commentsTouchStartXRef.current;
    const endX = event.changedTouches[0]?.clientX ?? null;
    commentsTouchStartXRef.current = null;

    if (startX === null || endX === null) {
      return;
    }

    if (startX - endX > 60) {
      setAreCommentsCollapsed(true);
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

  // Payment gate: show while checking or when payment is required
  if (!isHost && stream.entry_price && stream.entry_price > 0 && hasPaidEntry !== true) {
    const entryPriceFcfa = stream.entry_price;
    const entryPriceSc = fcfaToScRounded(entryPriceFcfa, scToFcfaRate);

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-black px-6 text-center text-white">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>

        {hasPaidEntry === null ? (
          <div className="flex items-center gap-3 text-sm text-zinc-300">
            <Loader2 className="h-5 w-5 animate-spin" />
            Vérification en cours...
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
                <Coins className="h-8 w-8 text-emerald-400" />
              </div>
              <h1 className="text-2xl font-bold">Live payant</h1>
              <p className="max-w-xs text-sm text-zinc-400">
                Ce live est réservé aux spectateurs ayant payé l'accès.
              </p>
            </div>

            <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
              <div className="flex flex-col items-center gap-1">
                <p className="text-xs uppercase tracking-widest text-zinc-500">Prix d'accès</p>
                <p className="text-3xl font-black text-emerald-400">
                  {scToFcfaRate > 0 ? `${formatScAmount(entryPriceSc)} SC` : '…'}
                </p>
                <p className="text-sm text-zinc-400">{entryPriceFcfa.toLocaleString('fr-FR')} FCFA</p>
                {scToFcfaRate > 0 && (
                  <p className="text-xs text-zinc-500">Taux : 1 SC = {scToFcfaRate.toLocaleString('fr-FR')} FCFA</p>
                )}
              </div>

              {!user?.id ? (
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => navigate('/auth', { state: { from: location.pathname + location.search } })}
                >
                  Se connecter pour accéder
                </Button>
              ) : (
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handlePayLiveEntry}
                  disabled={isPayingEntry || scToFcfaRate <= 0}
                >
                  {isPayingEntry ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Paiement en cours…
                    </>
                  ) : scToFcfaRate <= 0 ? (
                    'Taux non configuré'
                  ) : (
                    <>
                      <Coins className="mr-2 h-4 w-4" />
                      Payer {formatScAmount(entryPriceSc)} SC
                    </>
                  )}
                </Button>
              )}
            </div>

            <p className="text-xs text-zinc-600 max-w-xs">
              Le montant sera débité de votre portefeuille Soumboulah Cash et transféré au créateur du live.
            </p>
          </>
        )}
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
            ? 'bg-gradient-to-r from-pink-500/85 via-fuchsia-500/80 to-amber-500/80 text-white shadow-xl px-3 py-2 backdrop-blur-md'
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
              <span className="break-words flex items-center gap-1.5 flex-wrap font-medium">
                {msg.content}
                {msg.currency === 'soumboulah_cash' && <span className="inline-flex items-center bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full gap-1.5"><img src={iconSC} alt="SC" className="w-5 h-5 object-contain" /> SC</span>}
                {msg.currency === 'habbah' && <span className="inline-flex items-center bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full gap-1.5"><img src={iconH} alt="H" className="w-5 h-5 object-contain" /> H</span>}
                {msg.currency === 'soumboulah_bonus' && <span className="inline-flex items-center bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full gap-1.5"><img src={iconSB} alt="SB" className="w-5 h-5 object-contain" /> SB</span>}
              </span>
            </>
          )}
        </div>
      </motion.div>
    );
  };

  const isStudioMode = publicLiveScreen?.type === 'teaching_studio';
  const participantLookup = acceptedParticipants.filter((participant) => participant.userId !== stableUserId);
  const panelParticipants = participantLookup.filter((participant) => participant.agoraUid);
  const showParticipantPanel = panelParticipants.length > 0 || isAcceptedParticipant;

  return (
    <div className={`relative flex h-[100dvh] min-h-screen w-full bg-black text-white overflow-hidden ${isStudioMode ? 'flex-col md:flex-row' : 'flex-col'}`}>
      {/* Background Video Layer or Split Screen */}
      {isStudioMode ? (
        <>
          {/* Bloc de Gauche : Contenu Studio */}
            <div className="flex-[2] md:flex-[3] relative bg-zinc-950 border-b md:border-b-0 md:border-r border-white/10 flex flex-col items-center justify-center p-0">
              <LiveTeachingStudioRunner
                studio={publicLiveScreen.studio}
                isHost={isHost}
                onSceneChange={handleStudioSceneChange}
                onStudioChange={handleStudioUpdate}
                onWhiteboardAction={handleWhiteboardAction}
                remoteWhiteboardAction={remoteWhiteboardAction}
                remoteWhiteboardHistories={whiteboardHistories}
              />
            </div>
          {/* Bloc de Droite : Caméra + commentaires superposés */}
          <div className="flex-[1] md:flex-[1.5] relative bg-black border-l border-white/5 h-[40vh] md:h-full">
            {/* Vidéo plein bloc */}
            <div className="absolute inset-0">
              {isHost ? (
                <div ref={localVideoContainerRef} className="h-full w-full object-cover" />
              ) : (
                <div ref={remoteVideoContainerRef} className="h-full w-full object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
            </div>

            {isHost && privateLiveScreen && (
              <div className="absolute inset-x-2 top-12 z-20 pointer-events-auto md:hidden">
                <LiveScreenDisplay screen={privateLiveScreen} variant="private" isHost />
              </div>
            )}

            {showParticipantPanel && (
              <div className="absolute right-2 top-12 bottom-16 z-20 flex w-[76px] flex-col gap-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pointer-events-auto md:hidden">
                {isAcceptedParticipant && (
                  <div className="relative w-full overflow-hidden rounded-xl bg-zinc-900 aspect-[9/16] shrink-0">
                    <div ref={localVideoContainerRef} className="w-full h-full" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                    <div className="absolute bottom-1.5 left-1.5 right-1.5">
                      <span className="text-white text-[9px] font-semibold bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded-full truncate block text-center">
                        {getDisplayName(profile)}
                      </span>
                    </div>
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
                      onRevealControls={() => setExpandedParticipantControlsId((current) => current === participant.userId ? null : participant.userId)}
                    >
                      {isHost && participant && (
                        <div className={`absolute inset-x-1 top-1 flex flex-col gap-1 pointer-events-auto transition-all duration-200 ${expandedParticipantControlsId === participant.userId ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0'}`}>
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
            )}

            {handRaiseRequests.length > 0 && (
              <div className="absolute left-2 bottom-16 z-20 flex max-h-[60%] flex-col gap-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pointer-events-auto md:hidden">
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
              
            {/* Badge créateur en haut */}
            <div className="absolute top-3 left-3 z-20 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 flex items-center gap-2">
              <Avatar className="h-5 w-5 border border-white/20">
                <AvatarImage src={stream.host?.avatar_url || ''} />
                <AvatarFallback className="bg-zinc-800 text-[9px]">{hostName.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="text-xs font-bold text-white uppercase tracking-tight shadow-sm drop-shadow-md sm:hidden">{compactHostName}</span>
              <span className="hidden text-xs font-bold text-white uppercase tracking-tight shadow-sm drop-shadow-md sm:block">{hostName}</span>
              <Badge className="border-0 bg-red-600/90 text-white text-[8px] py-0 px-1 leading-tight h-3 h-3.5 flex items-center"><Radio className="mr-0.5 h-1.5 w-1.5" /> STUDIO</Badge>
            </div>

            <button
              type="button"
              className="absolute top-3 right-3 z-20 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-zinc-100 backdrop-blur-sm transition-colors hover:bg-white/10 md:hidden"
              onClick={() => setShowViewersModal(true)}
            >
              <Users className="h-3.5 w-3.5" />
              {audienceCount}
            </button>

            {/* Commentaires superposés sur la vidéo */}
            <div className="absolute bottom-16 left-2 right-2 z-20 pointer-events-auto">
              <div className="max-h-[140px] overflow-y-auto space-y-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overscroll-contain touch-pan-y">
                {messages.map((msg) => renderMessage(msg))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 z-0">
          {isHost ? (
            <div ref={localVideoContainerRef} className="h-full w-full object-cover" />
          ) : (
            <div ref={remoteVideoContainerRef} className="h-full w-full object-cover" />
          )}
        </div>
      )}

      {activeGiftOverlay && (
        <motion.div
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-gradient-to-br from-fuchsia-600/25 via-transparent to-amber-500/25"
        >
          <div className="flex flex-col items-center gap-4 rounded-[2rem] border border-white/20 bg-black/45 px-8 py-10 backdrop-blur-xl shadow-[0_0_80px_rgba(255,255,255,0.12)]">
            <motion.img
              initial={{ y: 20, scale: 0.7, rotate: -8 }}
              animate={{ y: 0, scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              src={activeGiftOverlay.currency === 'soumboulah_cash' ? iconSC : activeGiftOverlay.currency === 'soumboulah_bonus' ? iconSB : iconH}
              alt={activeGiftOverlay.currency || 'cadeau'}
              className="h-28 w-28 object-contain drop-shadow-[0_12px_30px_rgba(255,215,0,0.5)]"
            />
            <div className="text-center">
              <p className="text-lg font-black uppercase tracking-[0.25em] text-amber-300">Cadeau reçu</p>
              <p className="mt-2 text-2xl font-bold text-white">{activeGiftOverlay.userName}</p>
              <p className="mt-1 text-base font-semibold text-white/90">{activeGiftOverlay.content}</p>
            </div>
          </div>
        </motion.div>
      )}

      {publicLiveScreen && publicLiveScreen.type !== 'teaching_studio' && (
        <div className="pointer-events-auto absolute inset-x-4 bottom-24 z-30 flex justify-center sm:bottom-28">
          <LiveScreenDisplay
            screen={publicLiveScreen}
            variant="public"
            isHost={isHost}
            canEnroll={publicLiveScreen.type === 'formation_enrollment' && !isHost}
            isEnrollmentPending={publicLiveScreen.type === 'formation_enrollment' ? isFormationPending(publicLiveScreen.formation.id) : false}
            onBuyProduct={publicLiveScreen.type === 'shop_product' ? handleOpenBuyProductFromScreen : undefined}
            onOpenFormation={publicLiveScreen.type === 'formation_enrollment' ? () => handleOpenFormationFromScreen(publicLiveScreen.formation.id) : undefined}
            onOpenLesson={publicLiveScreen.type === 'teaching_lesson' ? () => handleOpenLessonFromScreen(publicLiveScreen.lesson.id) : undefined}
            onEnroll={publicLiveScreen.type === 'formation_enrollment' ? (planType) => handleEnrollFromScreen(publicLiveScreen, planType) : undefined}
          />
        </div>
      )}

      {isHost && privateLiveScreen && !isStudioMode && (
        <div className="pointer-events-auto absolute left-4 top-24 z-30 hidden max-w-sm md:block">
          <LiveScreenDisplay screen={privateLiveScreen} variant="private" isHost />
        </div>
      )}

      {/* Right panel: accepted participants displayed vertically */}
      {(() => {
        if (!showParticipantPanel) return null;

        return (
          <div className={`absolute right-2 top-16 bottom-24 z-20 w-[76px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pointer-events-auto ${isStudioMode ? 'hidden md:flex md:flex-col md:gap-2' : 'flex flex-col gap-2'}`}>
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
                  onRevealControls={() => setExpandedParticipantControlsId(current => current === participant.userId ? null : participant.userId)}
                >
                  {isHost && participant && (
                    <div className={`absolute inset-x-1 top-1 flex flex-col gap-1 pointer-events-auto transition-all duration-200 ${expandedParticipantControlsId === participant.userId ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0'}`}>
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
      <div className={`absolute top-0 left-0 w-full flex items-start justify-between bg-gradient-to-b from-black/60 via-black/20 to-transparent px-4 py-3 pb-12 z-40 pt-4 pointer-events-none`}>
        {/* TOP LEFT: Avatar, Host Name, Badges, Follow Button */}
        {publicLiveScreen?.type !== 'teaching_studio' ? (
          <div className="flex items-center gap-2 bg-black/30 rounded-full pr-2 p-1 backdrop-blur-sm self-start pointer-events-auto">
            <Avatar className="h-9 w-9 border border-white/20 cursor-pointer" onClick={() => navigate(`/profile/${stream.host?.id}`)}>
              <AvatarImage src={stream.host?.avatar_url || ''} />
              <AvatarFallback className="bg-zinc-800 text-xs">{hostName.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0 mr-1 gap-0.5">
              <span className="truncate text-sm font-semibold leading-none text-white sm:hidden">{compactHostName}</span>
              <span className="hidden truncate text-sm font-semibold leading-none text-white sm:block">{hostName}</span>
              <div className="flex items-center gap-1">
                <Badge className="border-0 bg-red-600 text-white hover:bg-red-600 text-[9px] py-0 px-1 leading-tight h-3"><Radio className="mr-0.5 h-2 w-2" />DIRECT</Badge>
                <Badge variant="secondary" className="border-0 bg-white/10 text-white text-[9px] py-0 px-1 leading-tight h-3">{stream.visibility === 'public' ? <Globe className="mr-0.5 h-2 w-2" /> : <Lock className="mr-0.5 h-2 w-2" />}{stream.visibility === 'public' ? 'Public' : 'Amis'}</Badge>
              </div>
            </div>
            {!isHost && stream.host_id && user && stream.host_id !== user.id && (
              <FollowButtonInline hostId={stream.host_id} />
            )}
          </div>
        ) : <div />}

        {/* TOP RIGHT: Title, Description, Viewers, Close */}
        <div className="flex flex-col items-end gap-2 max-w-[55%] pointer-events-auto">
          {/* Top Row: Viewers & Close */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              className={`items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-xs font-semibold text-zinc-200 backdrop-blur-sm hover:bg-white/10 transition-colors ${isStudioMode ? 'hidden md:flex' : 'flex'}`}
              onClick={() => setShowViewersModal(true)}
            >
              <Users className="h-3.5 w-3.5" />
              {audienceCount}
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
          {isDescriptionVisible && (
            <div className="relative flex flex-col items-end text-right mt-1 bg-black/20 backdrop-blur-sm rounded-xl p-2 w-full pr-8">
              {stream.description && (
                <button
                  type="button"
                  onClick={() => setIsDescriptionVisible(false)}
                  className="absolute right-2 top-2 rounded-full bg-black/35 p-1 text-white/80 transition-colors hover:bg-black/55 hover:text-white"
                  title="Masquer la description"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <h1 className="text-sm font-bold text-white shadow-sm leading-tight line-clamp-2">{stream.title}</h1>
              {stream.description && (
                <p className="text-xs text-zinc-200 mt-1 line-clamp-2 shadow-sm font-medium">{stream.description}</p>
              )}
            </div>
          )}

          {isHost && (
            <div className={`flex flex-wrap justify-end gap-2 w-full ${isStudioMode ? 'hidden md:flex' : 'flex'}`}>
              <div className="flex items-center gap-1 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                <img src={iconH} alt="H" className="h-4 w-4 object-contain" />
                {liveGiftTotals.habbah.toLocaleString('fr-FR')}
              </div>
              <div className="flex items-center gap-1 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                <img src={iconSB} alt="SB" className="h-4 w-4 object-contain" />
                {liveGiftTotals.soumboulah_bonus.toLocaleString('fr-FR')}
              </div>
              <div className="flex items-center gap-1 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                <img src={iconSC} alt="S" className="h-4 w-4 object-contain" />
                {liveGiftTotals.soumboulah_cash.toLocaleString('fr-FR')}
              </div>
            </div>
          )}

          {isHost && (
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-full border-white/15 bg-black/35 px-3 text-xs font-semibold text-white hover:bg-white/10 hover:text-white"
              onClick={() => setIsScreenManagerOpen(true)}
            >
              <Layers3 className="mr-2 h-4 w-4" />
              Écrans
            </Button>
          )}
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
        {publicLiveScreen?.type !== 'teaching_studio' && (
          !areCommentsCollapsed ? (
            <div
              className={`absolute bottom-20 left-4 z-10 pointer-events-auto ${
              acceptedParticipants.length > 0 || isAcceptedParticipant ? 'right-24' : 'right-16'
            }`}
            onTouchStart={handleCommentsTouchStart}
            onTouchEnd={handleCommentsTouchEnd}
          >
            <div
              ref={commentsScrollRef}
              className="max-h-[160px] overflow-y-auto space-y-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overscroll-contain touch-pan-y"
            >
              {messages.map((msg) => renderMessage(msg))}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAreCommentsCollapsed(false)}
            className="absolute bottom-24 left-4 z-10 pointer-events-auto flex h-11 min-w-11 items-center justify-center rounded-full bg-black/45 px-3 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/60"
            title="Rouvrir les commentaires"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="ml-2 text-xs font-semibold">Commentaires</span>
          </button>
        ))}
      </div>

      {/* Hand raise requests panel */}
      {handRaiseRequests.length > 0 && (
        <div className={`absolute left-2 bottom-24 z-20 pointer-events-auto max-h-[60vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${isStudioMode ? 'hidden md:flex md:flex-col md:gap-2' : 'flex flex-col gap-2'}`}>
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
      <div className={`absolute bottom-0 z-20 bg-gradient-to-t from-black/60 to-transparent px-4 py-4 ${publicLiveScreen?.type === 'teaching_studio' ? 'left-0 right-0 md:left-auto md:right-0 md:w-[min(36vw,34rem)]' : 'left-0 right-0'}`}>
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
              {isHost && (
                <Button
                  type="button"
                  onClick={() => setIsScreenManagerOpen(true)}
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  title="Piloter les écrans du live"
                >
                  <BookOpen size={18} />
                </Button>
              )}
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
              <Button
                type="button"
                onClick={switchCamera}
                variant="outline"
                size="icon"
                className="h-11 w-11 shrink-0 rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                title="Basculer entre caméra avant et arrière"
              >
                <RefreshCw size={18} />
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
          liveGiftContext={{
            liveStreamId: stream.id,
            liveTitle: stream.title,
          }}
          onGiftSent={handleGiftSuccess}
        />
      )}

      {publicLiveScreen?.type === 'shop_product' && (
        <BuyWithScDialog
          product={{
            ...publicLiveScreen.product,
            seller_id: publicLiveScreen.product.seller_id || undefined,
          }}
          isOpen={isBuyProductDialogOpen}
          onClose={() => setIsBuyProductDialogOpen(false)}
        />
      )}

      {isHost && (
        <LiveScreenManager
          open={isScreenManagerOpen}
          onOpenChange={setIsScreenManagerOpen}
          products={creatorLiveAssets?.products || []}
          formations={creatorLiveAssets?.formations || []}
          publicScreen={publicLiveScreen}
          privateScreen={privateLiveScreen}
          onSelectPublicScreen={handleSelectPublicLiveScreen}
          onSelectPrivateScreen={handleSelectPrivateLiveScreen}
        />
      )}

      {/* Viewers modal */}
      <Dialog open={showViewersModal} onOpenChange={setShowViewersModal}>
        <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800 text-white z-[9999]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Participants connectés ({audienceCount})
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-sm">
              Liste des personnes actuellement présentes dans ce live.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto pr-2 space-y-3">
            {connectedPeople.length === 0 ? (
              <p className="text-center text-zinc-400 py-4">Aucun spectateur pour le moment</p>
            ) : (
              connectedPeople.map((viewer, idx) => {
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
              {(role === 'host' || viewer.user_id === stream.host_id) && (
                <span className="inline-flex items-center gap-0.5 bg-amber-500/80 text-white text-[9px] font-bold px-1.5 py-[1px] rounded-full">
                  <Crown className="h-2.5 w-2.5" /> Créateur
                </span>
              )}
              {role === 'participant' && viewer.user_id !== stream.host_id && (
                <span className="inline-flex items-center gap-0.5 bg-blue-500/80 text-white text-[9px] font-bold px-1.5 py-[1px] rounded-full">
                  Intervenant
                </span>
              )}
            </span>
            <span className="text-xs text-zinc-500 capitalize">
              {(role === 'host' || viewer.user_id === stream.host_id) ? 'Créateur' : role === 'participant' ? 'Intervenant' : 'Spectateur'}
            </span>
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
