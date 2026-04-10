import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Loader2, Radio, Clock, Coins, ArrowLeft, Users, Share2, Gift, Hand, BookOpen, Mic, MicOff, Video, VideoOff, RefreshCw, Layers3, X, BarChart2, ThumbsUp, ThumbsDown, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';

// Extracted Hooks
import { useLiveStreamData } from '../components/live-classroom/user-live/hooks/useLiveStreamData';
import { useLivePayment } from '../components/live-classroom/user-live/hooks/useLivePayment';
import { useLivePresence } from '../components/live-classroom/user-live/hooks/useLivePresence';
import { useLiveChat } from '../components/live-classroom/user-live/hooks/useLiveChat';
import { useLiveInteractions } from '../components/live-classroom/user-live/hooks/useLiveInteractions';
import { useLiveAgoraSession } from '../components/live-classroom/user-live/hooks/useLiveAgoraSession';
import { useLiveWhiteboard } from '../components/live-classroom/user-live/hooks/useLiveWhiteboard';
import { useLiveScreenControl } from '../components/live-classroom/user-live/hooks/useLiveScreenControl';

// Extracted Components
import { LiveHeader } from '../components/live-classroom/user-live/components/LiveHeader';
import { LiveVideoGrid } from '../components/live-classroom/user-live/components/LiveVideoGrid';
import { LiveChatPanel } from '../components/live-classroom/user-live/components/LiveChatPanel';
import { LiveModals } from '../components/live-classroom/user-live/components/LiveModals';

// Other Live components
import LiveScreenDisplay from '@/live/components/LiveScreenDisplay';
import { LiveTeachingStudioRunner } from '@/live/components/LiveTeachingStudioRunner';
import LiveScreenManager from '@/live/components/LiveScreenManager';
import { useLiveAudience } from '@/live/hooks/useLiveAudience';
import { useLiveCreatorAssets } from '@/live/hooks/useLiveCreatorAssets';

// Utils
import { formatScAmount, fcfaToScRounded } from '../components/live-classroom/user-live/utils/paymentUtils';
import type { LiveScreen, LiveTeachingStudio } from '@/live/types';

const UserLive: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();

  // Basic IDs & State
  const [visitorId] = useState(() => {
    const saved = sessionStorage.getItem('live_visitor_id');
    if (saved) return saved;
    const newId = crypto.randomUUID();
    sessionStorage.setItem('live_visitor_id', newId);
    return newId;
  });

  const stableUserId = user?.id || visitorId;
  const stableStreamId = id;
  const isHost = !!user?.id && !!id;

  // 1. Data Loading
  const { stream, isLoading, registrants, registrantsLoading, loadRegistrants } = useLiveStreamData(id, isHost);
  const stableHostId = stream?.host_id;
  const isActuallyHost = !!user?.id && !!stableHostId && user.id === stableHostId;

  // 2. State management for sync between hooks
  const [messages, setMessages] = useState<any[]>([]);
  const [acceptedParticipants, setAcceptedParticipants] = useState<any[]>([]);
  const [activeGiftOverlay, setActiveGiftOverlay] = useState<any | null>(null);
  
  // 3. Agora & Session
  const agoraSession = useLiveAgoraSession({
    stableHostId,
    connectedPeople: [], // Will be updated below
  });

  // 4. Whiteboard & Interactions
  const presenceChannelRef = useRef<any>(null);
  const whiteboard = useLiveWhiteboard(isActuallyHost, stableUserId, presenceChannelRef);
  
  // 5. Screen Control
  const [isScreenManagerOpen, setIsScreenManagerOpen] = useState(false);
  const [privateLiveScreen, setPrivateLiveScreen] = useState<LiveScreen | null>(null);
  const screens = useLiveScreenControl(isActuallyHost, stableUserId, presenceChannelRef, () => presence.syncLivePresence());
  const { data: creatorAssets } = useLiveCreatorAssets(stableHostId);

  // 7. Payment & Permissions
  const { hasPaidEntry, isPayingEntry, scToFcfaRate, handlePayLiveEntry } = useLivePayment({
    stream,
    user,
    isHost: isActuallyHost,
  });

  // 6. Presence
  const presence = useLivePresence({
    stableStreamId,
    stableHostId,
    stableUserId,
    stableDisplayName: profile ? `${profile.first_name} ${profile.last_name}` : `Spectateur ${stableUserId.substring(0, 4)}`,
    stableAvatarUrl: profile?.avatar_url || null,
    isHost: isActuallyHost,
    isAcceptedParticipant: agoraSession.isAcceptedParticipant,
    agoraState: { 
      localUid: agoraSession.state.localUid, 
      isMuted: agoraSession.state.isMuted, 
      isVideoEnabled: agoraSession.state.isVideoEnabled 
    },
    hasPaidEntry: !!hasPaidEntry,
    publicLiveScreenRef: screens.publicLiveScreenRef,
    setPublicLiveScreen: (s) => screens.setPublicLiveScreen(s),
    setAcceptedParticipants,
    setMessages,
    onBroadcastMessage: (payload) => {
      if (payload.event === 'live_action') {
        const newMsg = payload.payload;
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev.slice(-49), newMsg];
        });
        if (newMsg.type === 'gift') {
          setActiveGiftOverlay({
            id: newMsg.id,
            userName: newMsg.userName,
            currency: newMsg.currency,
            content: newMsg.content,
          });
        }
      } else if (payload.event === 'whiteboard_update') {
        whiteboard.setRemoteWhiteboardAction(payload.payload.action);
        whiteboard.updateWhiteboardHistories(current => 
          whiteboard.applyWhiteboardActionToHistories(current, payload.payload.action)
        );
      } else if (payload.event === 'hand_accepted' && payload.payload.userId === stableUserId) {
        agoraSession.setIsAcceptedParticipant(true);
        toast.success('Vous pouvez maintenant intervenir !');
      } else if (payload.event === 'participant_control' && payload.payload.targetUserId === stableUserId) {
        const { action } = payload.payload;
        if (action === 'mic_on') agoraSession.setMicrophoneEnabled(true);
        else if (action === 'mic_off') agoraSession.setMicrophoneEnabled(false);
        else if (action === 'camera_on') agoraSession.setCameraEnabled(true);
        else if (action === 'camera_off') agoraSession.setCameraEnabled(false);
        else if (action === 'stop') {
          agoraSession.setIsAcceptedParticipant(false);
          toast.info('Le créateur a mis fin à votre intervention.');
        }
      }
    }
  });

  presenceChannelRef.current = presence.presenceChannelRef.current;

  const { audiencePeople, audienceCount } = useLiveAudience({
    liveId: stableStreamId,
    hostId: stableHostId,
    viewersList: presence.viewersList,
    acceptedParticipants,
  });

  const chat = useLiveChat({
    stableStreamId,
    stableHostId,
    stableUserId,
    stableDisplayName: profile ? `${profile.first_name} ${profile.last_name}` : `Spectateur ${stableUserId.substring(0, 4)}`,
    stableAvatarUrl: profile?.avatar_url || null,
    isHost: isActuallyHost,
    presenceChannelRef,
  });

  const interactions = useLiveInteractions({
    stableUserId,
    stableDisplayName: profile ? `${profile.first_name} ${profile.last_name}` : `Spectateur ${stableUserId.substring(0, 4)}`,
    stableAvatarUrl: profile?.avatar_url || null,
    isHost: isActuallyHost,
    presenceChannelRef,
    setAcceptedParticipants,
  });

  // 8. UI State
  const [showViewersModal, setShowViewersModal] = useState(false);
  const [showRegistrantsPanel, setShowRegistrantsPanel] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [isBuyProductDialogOpen, setIsBuyProductDialogOpen] = useState(false);
  const [showSatisfactionSurvey, setShowSatisfactionSurvey] = useState(false);
  const [satisfactionStep, setSatisfactionStep] = useState<'rating' | 'reason'>('rating');
  const [satisfactionReason, setSatisfactionReason] = useState('');
  const [isSubmittingSatisfaction, setIsSubmittingSatisfaction] = useState(false);
  const [areCommentsCollapsed, setAreCommentsCollapsed] = useState(false);

  const handleSatisfactionSubmit = async (rating: boolean, refund: boolean) => {
    if (!user || !stream) return;
    setIsSubmittingSatisfaction(true);
    try {
      const { error } = await supabase.from('live_satisfaction').insert({
        live_id: stream.id,
        user_id: user.id,
        is_satisfied: rating,
        reason: satisfactionReason,
        wants_refund: refund,
      });
      if (error) throw error;
      toast.success('Merci pour votre retour !');
      setShowSatisfactionSurvey(false);
    } catch (err) {
      toast.error('Erreur lors de l\'envoi du retour.');
    } finally {
      setIsSubmittingSatisfaction(false);
    }
  };

  // Auto-scroll to bottom on new messages
  const commentsScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (commentsScrollRef.current) {
      commentsScrollRef.current.scrollTop = commentsScrollRef.current.scrollHeight;
    }
  }, [messages]);

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
          <p className="mt-2 text-sm text-zinc-400">Ce live n'existe pas ou vous n'avez pas les droits pour le rejoindre.</p>
        </div>
        <Button onClick={() => navigate('/profil')} variant="outline">Retour au profil</Button>
      </div>
    );
  }

  // Waiting Room for Scheduled
  if (!isActuallyHost && stream.status === 'scheduled') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-black px-6 text-center text-white">
        <Clock className="h-12 w-12 text-sky-400" />
        <h1 className="text-xl font-semibold">Live programmé</h1>
        <p className="text-sm text-zinc-400">{stream.title}</p>
        {hasPaidEntry ? (
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">✅ Ticket confirmé</Badge>
        ) : (
          <Button onClick={() => navigate(`/live/${stream.id}/ticket`)}>Acheter un ticket</Button>
        )}
      </div>
    );
  }

  // Payment Gate
  if (!isActuallyHost && stream.entry_price && stream.entry_price > 0 && hasPaidEntry !== true) {
    const entryPriceSc = scToFcfaRate > 0 ? fcfaToScRounded(stream.entry_price, scToFcfaRate) : 0;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-black px-6 text-center text-white">
        <Coins className="h-12 w-12 text-emerald-400" />
        <h1 className="text-2xl font-bold">Live payant</h1>
        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 w-full max-w-xs space-y-4">
          <p className="font-bold">{stream.title}</p>
          <div className="flex flex-col items-center">
            <p className="text-3xl font-black text-emerald-400">{formatScAmount(entryPriceSc)} SC</p>
            <p className="text-xs text-zinc-500">{stream.entry_price.toLocaleString()} FCFA</p>
          </div>
          <Button className="w-full bg-emerald-600" onClick={handlePayLiveEntry} disabled={isPayingEntry}>
            {isPayingEntry ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Coins className="mr-2 h-4 w-4" />}
            Payer l'accès
          </Button>
        </div>
      </div>
    );
  }

  const isStudioMode = screens.publicLiveScreen?.type === 'teaching_studio';

  return (
    <div className={`relative flex h-[100dvh] min-h-screen w-full bg-black text-white overflow-hidden ${isStudioMode ? 'flex-col md:flex-row' : 'flex-col'}`}>
      <LiveHeader
        stream={stream}
        isHost={isActuallyHost}
        audienceCount={audienceCount}
        liveGiftTotals={chat.liveGiftTotals}
        onBack={() => navigate(-1)}
        onShowViewers={() => setShowViewersModal(true)}
        onShowRegistrants={() => {
          loadRegistrants();
          setShowRegistrantsPanel(true);
        }}
        formatScAmount={formatScAmount}
      />

      {isStudioMode ? (
        <>
          <div className="flex-[2] md:flex-[3] relative bg-zinc-950 border-b md:border-b-0 md:border-r border-white/10 flex flex-col items-center justify-center p-0">
            <LiveTeachingStudioRunner
              studio={screens.publicLiveScreen!.studio}
              isHost={isActuallyHost}
              onSceneChange={(sceneId) => {
                const nextScreen = {
                  ...screens.publicLiveScreen!,
                  studio: {
                    ...screens.publicLiveScreen!.studio,
                    activeSceneId: sceneId,
                  }
                } as LiveScreen;
                screens.scheduleStudioBroadcast(nextScreen);
              }}
              onStudioChange={screens.scheduleStudioBroadcast}
              onWhiteboardAction={whiteboard.handleWhiteboardAction}
              remoteWhiteboardAction={whiteboard.remoteWhiteboardAction}
              remoteWhiteboardHistories={whiteboard.whiteboardHistories}
            />
          </div>
          <div className="flex-[1] md:flex-[1.5] relative bg-black border-l border-white/5 h-[40vh] md:h-full">
            <div className="absolute inset-0">
              <div ref={isActuallyHost ? agoraSession.localVideoContainerRef : agoraSession.remoteVideoContainerRef} className="h-full w-full object-cover" />
            </div>
            
            <div className="absolute top-2 right-2 flex flex-col gap-2">
              {isActuallyHost && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-zinc-800/80 hover:bg-zinc-700 text-white border-zinc-700"
                  onClick={() => setIsScreenManagerOpen(true)}
                >
                  <Layers3 className="h-4 w-4 mr-2" />
                  Scènes
                </Button>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 z-0">
          <div ref={isActuallyHost ? agoraSession.localVideoContainerRef : agoraSession.remoteVideoContainerRef} className="h-full w-full object-cover" />
          <LiveScreenDisplay screen={screens.publicLiveScreen} />
          {isActuallyHost && privateLiveScreen && (
            <div className="absolute bottom-20 left-4 z-20 w-72">
              <LiveScreenDisplay screen={privateLiveScreen} variant="private" isHost />
            </div>
          )}
        </div>
      )}

      {isActuallyHost && (
        <LiveScreenManager
          open={isScreenManagerOpen}
          onOpenChange={(open) => setIsScreenManagerOpen(open)}
          products={creatorAssets?.products ?? []}
          formations={creatorAssets?.formations ?? []}
          publicScreen={screens.publicLiveScreen}
          privateScreen={privateLiveScreen}
          onSelectPublicScreen={(s) => {
            screens.broadcastPublicLiveScreen(s);
            setIsScreenManagerOpen(false);
          }}
          onSelectPrivateScreen={(s) => {
            setPrivateLiveScreen(s);
          }}
        />
      )}

      <LiveVideoGrid
        isHost={isActuallyHost}
        acceptedParticipants={acceptedParticipants}
        localVideoContainerRef={agoraSession.localVideoContainerRef}
        getRemoteVideoTrack={agoraSession.getRemoteVideoTrack}
        state={agoraSession.state}
        expandedParticipantControlsId={null}
        setExpandedParticipantControlsId={() => {}}
        handleParticipantControl={interactions.handleParticipantControl}
      />

      <LiveChatPanel
        messages={messages}
        messageInput={chat.messageInput}
        setMessageInput={chat.setMessageInput}
        onSendMessage={chat.handleSendMessage}
        onGiftClick={() => setShowGiftModal(true)}
        onRaiseHand={interactions.handleRaiseHand}
        hasRaisedHand={interactions.hasRaisedHand}
        isHost={isActuallyHost}
        isAcceptedParticipant={agoraSession.isAcceptedParticipant}
        messagesEndRef={chat.messagesEndRef}
        commentsScrollRef={commentsScrollRef}
        areCommentsCollapsed={areCommentsCollapsed}
        setAreCommentsCollapsed={setAreCommentsCollapsed}
      />

      <LiveModals
        stream={stream}
        isHost={isActuallyHost}
        viewersList={presence.viewersList}
        showViewersModal={showViewersModal}
        setShowViewersModal={setShowViewersModal}
        showRegistrantsPanel={showRegistrantsPanel}
        setShowRegistrantsPanel={setShowRegistrantsPanel}
        registrants={registrants}
        registrantsLoading={registrantsLoading}
        showGiftModal={showGiftModal}
        setShowGiftModal={setShowGiftModal}
        onGiftSuccess={chat.handleGiftSuccess}
        isBuyProductDialogOpen={isBuyProductDialogOpen}
        setIsBuyProductDialogOpen={setIsBuyProductDialogOpen}
        showSatisfactionSurvey={showSatisfactionSurvey}
        setShowSatisfactionSurvey={setShowSatisfactionSurvey}
        satisfactionStep={satisfactionStep}
        setSatisfactionStep={setSatisfactionStep}
        satisfactionReason={satisfactionReason}
        setSatisfactionReason={setSatisfactionReason}
        isSubmittingSatisfaction={isSubmittingSatisfaction}
        onSatisfactionSubmit={handleSatisfactionSubmit}
      />
    </div>
  );
};

export default UserLive;
