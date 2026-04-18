// Hook: gestion des appels audio/video dans une conversation privee
// Role: creer, recevoir, accepter, refuser et terminer un appel cible entre deux utilisateurs
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { sendPushNotification } from '@/utils/notificationHelpers';
import { createCallLogContent, parseCallLogContent, StructuredCallLog } from '@/utils/conversationCallLog';

type PrivateCallType = 'audio' | 'video';

interface PrivateCallSession {
  id: string;
  caller_id: string;
  receiver_id: string | null;
  call_type: string;
  conversation_id: string | null;
  created_at: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  status: string;
}

export interface PendingPrivateCall {
  id: string;
  callType: PrivateCallType;
  callerId: string;
  receiverId: string | null;
  createdAt: string | null;
}

export interface ActivePrivateCall {
  id: string;
  callType: PrivateCallType;
  channelName: string;
  remoteUserName: string;
  initiatedByUserId: string;
  startedAt: string | null;
}

const PENDING_CALL_TIMEOUT_MS = 30_000;

const normalizeCallType = (callType: string): PrivateCallType => {
  return callType === 'video' ? 'video' : 'audio';
};

const buildConversationId = (firstUserId: string, secondUserId: string) => {
  return [firstUserId, secondUserId].sort().join('_');
};

interface UsePrivateConversationCallOptions {
  otherUserId?: string;
  otherUserName: string;
  isOnline: boolean;
}

export const usePrivateConversationCall = ({
  otherUserId,
  otherUserName,
  isOnline,
}: UsePrivateConversationCallOptions) => {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<PendingPrivateCall | null>(null);
  const [outgoingCall, setOutgoingCall] = useState<PendingPrivateCall | null>(null);
  const [activeCall, setActiveCall] = useState<ActivePrivateCall | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const activeSessionRef = useRef<string | null>(null);
  const pendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timedOutSessionIdsRef = useRef<Set<string>>(new Set());

  const conversationId = useMemo(() => {
    if (!user?.id || !otherUserId) return null;
    return buildConversationId(user.id, otherUserId);
  }, [otherUserId, user?.id]);

  const clearPendingState = useCallback((sessionId?: string) => {
    if (!sessionId || incomingCall?.id === sessionId) {
      setIncomingCall((current) => (sessionId ? (current?.id === sessionId ? null : current) : null));
    }
    if (!sessionId || outgoingCall?.id === sessionId) {
      setOutgoingCall((current) => (sessionId ? (current?.id === sessionId ? null : current) : null));
    }
  }, [incomingCall?.id, outgoingCall?.id]);

  const clearAllState = useCallback(() => {
    setIncomingCall(null);
    setOutgoingCall(null);
    setActiveCall(null);
    activeSessionRef.current = null;
    if (pendingTimeoutRef.current) {
      clearTimeout(pendingTimeoutRef.current);
      pendingTimeoutRef.current = null;
    }
  }, []);

  const insertCallLog = useCallback(async (
    payload: StructuredCallLog,
    senderId: string,
    receiverId: string,
  ) => {
    if (!conversationId || !senderId || !receiverId) {
      return;
    }

    if (payload.sessionId) {
      const { data: existingLogs, error: existingLogsError } = await supabase
        .from('conversation_messages')
        .select('content')
        .or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (existingLogsError) {
        throw existingLogsError;
      }

      const alreadyLogged = (existingLogs || []).some((message) => {
        const parsedLog = parseCallLogContent(message.content);
        return parsedLog?.version === 2 && parsedLog.sessionId === payload.sessionId;
      });

      if (alreadyLogged) {
        return;
      }
    }

    const { error } = await supabase
      .from('conversation_messages')
      .insert({
        story_id: null,
        sender_id: senderId,
        receiver_id: receiverId,
        content: createCallLogContent(payload),
        is_story_reply: false,
        replied_to_message_id: null,
      });

    if (error) {
      throw error;
    }
  }, [conversationId]);

  const openAcceptedCall = useCallback((session: PrivateCallSession) => {
    const nextActiveCall = {
      id: session.id,
      callType: normalizeCallType(session.call_type),
      channelName: `call_${session.id}`,
      remoteUserName: otherUserName,
      initiatedByUserId: session.caller_id,
      startedAt: session.started_at ?? null,
    } satisfies ActivePrivateCall;

    activeSessionRef.current = session.id;
    setActiveCall(nextActiveCall);
    clearPendingState(session.id);
  }, [clearPendingState, otherUserName]);

  const handleSessionChange = useCallback((session: PrivateCallSession, event: 'INSERT' | 'UPDATE') => {
    if (!user?.id || !conversationId || session.conversation_id !== conversationId) {
      return;
    }

    if (session.status === 'pending') {
      if (session.caller_id === user.id) {
        setOutgoingCall({
          id: session.id,
          callType: normalizeCallType(session.call_type),
          callerId: session.caller_id,
          receiverId: session.receiver_id,
          createdAt: session.created_at,
        });
      } else if (session.receiver_id === user.id) {
        setIncomingCall({
          id: session.id,
          callType: normalizeCallType(session.call_type),
          callerId: session.caller_id,
          receiverId: session.receiver_id,
          createdAt: session.created_at,
        });
      }
      return;
    }

    if (session.status === 'accepted') {
      openAcceptedCall(session);
      if (event === 'UPDATE' && session.caller_id === user.id) {
        toast.success(`${otherUserName} a accepte l'appel`);
      }
      return;
    }

    if (session.status === 'rejected') {
      if (event === 'UPDATE' && session.caller_id === user.id) {
        toast.info(`${otherUserName} a refuse l'appel`);
      }
      clearPendingState(session.id);
      if (activeSessionRef.current === session.id) {
        setActiveCall(null);
        activeSessionRef.current = null;
      }
      return;
    }

    if (session.status === 'ended') {
      clearPendingState(session.id);

      const endedAtMs = session.ended_at ? new Date(session.ended_at).getTime() : NaN;
      const createdAtMs = session.created_at ? new Date(session.created_at).getTime() : NaN;
      const elapsedMs = Number.isFinite(endedAtMs) && Number.isFinite(createdAtMs)
        ? Math.max(0, endedAtMs - createdAtMs)
        : undefined;

      if (!session.started_at && session.receiver_id) {
        const fallbackOutcome = elapsedMs !== undefined && elapsedMs >= PENDING_CALL_TIMEOUT_MS - 1000
          ? 'missed'
          : 'cancelled';

        void insertCallLog({
          version: 2,
          outcome: fallbackOutcome,
          callType: normalizeCallType(session.call_type),
          initiatedByUserId: session.caller_id,
          sessionId: session.id,
        }, session.caller_id, session.receiver_id).catch((error) => {
          console.error('Error inserting fallback private call log:', error);
        });
      }

      if (timedOutSessionIdsRef.current.has(session.id)) {
        timedOutSessionIdsRef.current.delete(session.id);
        if (activeSessionRef.current === session.id) {
          setActiveCall(null);
          activeSessionRef.current = null;
        }
        return;
      }
      if (event === 'UPDATE' && session.caller_id !== user.id && activeSessionRef.current !== session.id) {
        toast.info('L\'appel a ete annule');
      }
      if (activeSessionRef.current === session.id) {
        toast.info('Appel termine');
        setActiveCall(null);
        activeSessionRef.current = null;
      }
    }
  }, [clearPendingState, conversationId, openAcceptedCall, otherUserName, user?.id]);

  const hydrateCurrentSession = useCallback(async () => {
    if (!user?.id || !conversationId || !isOnline) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('call_sessions')
        .select('id, caller_id, receiver_id, call_type, conversation_id, created_at, started_at, ended_at, status')
        .eq('conversation_id', conversationId)
        .in('status', ['pending', 'accepted'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return;
      }

      handleSessionChange(data as PrivateCallSession, 'UPDATE');
    } catch (error) {
      console.error('Error hydrating private conversation call:', error);
    }
  }, [conversationId, handleSessionChange, isOnline, user?.id]);

  useEffect(() => {
    clearAllState();
  }, [clearAllState, conversationId]);

  useEffect(() => {
    if (!user?.id || !conversationId || !isOnline) {
      return;
    }

    void hydrateCurrentSession();

    channelRef.current = supabase
      .channel(`private-conversation-call-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_sessions',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          handleSessionChange(payload.new as PrivateCallSession, 'INSERT');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'call_sessions',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          handleSessionChange(payload.new as PrivateCallSession, 'UPDATE');
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      channelRef.current = null;
    };
  }, [conversationId, handleSessionChange, hydrateCurrentSession, isOnline, user?.id]);

  useEffect(() => {
    if (isOnline) return;
    clearAllState();
  }, [clearAllState, isOnline]);

  const expirePendingCall = useCallback(async (pendingCall: PendingPrivateCall) => {
    const receiverId = pendingCall.receiverId;
    if (!receiverId) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('call_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', pendingCall.id)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return;
      }

      timedOutSessionIdsRef.current.add(pendingCall.id);

      const isCaller = pendingCall.callerId === user?.id;
      await insertCallLog({
        version: 2,
        outcome: 'missed',
        callType: pendingCall.callType,
        initiatedByUserId: pendingCall.callerId,
        sessionId: pendingCall.id,
      }, pendingCall.callerId, receiverId);

      if (isCaller) {
        toast.info(`${otherUserName} n'a pas répondu`);
      }

      clearPendingState(pendingCall.id);
    } catch (error) {
      console.error('Error expiring pending private call:', error);
    }
  }, [clearPendingState, insertCallLog, otherUserName, user?.id]);

  useEffect(() => {
    if (pendingTimeoutRef.current) {
      clearTimeout(pendingTimeoutRef.current);
      pendingTimeoutRef.current = null;
    }

    if (!isOnline) {
      return;
    }

    const pendingCall = outgoingCall ?? incomingCall;
    if (!pendingCall) {
      return;
    }

    const createdAtMs = pendingCall.createdAt ? new Date(pendingCall.createdAt).getTime() : Date.now();
    const remainingMs = Math.max(PENDING_CALL_TIMEOUT_MS - (Date.now() - createdAtMs), 0);

    pendingTimeoutRef.current = setTimeout(() => {
      void expirePendingCall(pendingCall);
    }, remainingMs);

    return () => {
      if (pendingTimeoutRef.current) {
        clearTimeout(pendingTimeoutRef.current);
        pendingTimeoutRef.current = null;
      }
    };
  }, [expirePendingCall, incomingCall, isOnline, outgoingCall]);

  const startCall = useCallback(async (type: PrivateCallType) => {
    if (!user?.id || !otherUserId || !conversationId) {
      toast.error('Conversation invalide pour lancer un appel');
      return false;
    }

    if (!isOnline) {
      toast.error('Connexion internet requise pour passer un appel');
      return false;
    }

    if (incomingCall || outgoingCall || activeCall) {
      toast.info('Un appel est deja en cours pour cette conversation');
      return false;
    }

    try {
      const normalizedType = type === 'video' ? 'video' : 'voice';
      const { data, error } = await supabase
        .from('call_sessions')
        .insert({
          caller_id: user.id,
          receiver_id: otherUserId,
          conversation_id: conversationId,
          formation_id: null,
          lesson_id: null,
          call_type: normalizedType,
          status: 'pending',
        })
        .select('id, caller_id, receiver_id, call_type, conversation_id, created_at, status')
        .single();

      if (error) throw error;

      setOutgoingCall({
        id: data.id,
        callType: normalizeCallType(data.call_type),
        callerId: data.caller_id,
        receiverId: data.receiver_id,
        createdAt: data.created_at,
      });

      toast.success(`Appel ${type === 'video' ? 'video' : 'audio'} lance`);
      toast.info(`En attente de la reponse de ${otherUserName}`);

      sendPushNotification({
        userIds: [otherUserId],
        title: user.user_metadata?.first_name || user.email?.split('@')[0] || 'Nouvel appel',
        message: `Appel ${type === 'video' ? 'video' : 'audio'} entrant`,
        type: 'incoming_call',
        clickAction: `/conversations/${user.id}`,
        data: {
          // clickAction dupliqué dans data: l'edge function lit payload.data.clickAction
          // pour construire le deep link Android (cf. send-push-notification/index.ts L175)
          clickAction: `/conversations/${user.id}`,
          senderId: user.id,
          conversationId,
          isPrivateCall: true,
          callType: type,
        },
        playLocalSound: false,
      }).catch((notificationError) => {
        console.error('Private call push notification failed:', notificationError);
      });

      return true;
    } catch (error) {
      console.error('Error starting private call:', error);
      toast.error('Impossible de lancer l\'appel');
      return false;
    }
  }, [activeCall, conversationId, incomingCall, isOnline, otherUserId, otherUserName, outgoingCall, user?.email, user?.id, user?.user_metadata]);

  const acceptCall = useCallback(async () => {
    if (!incomingCall || !user?.id) {
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('call_sessions')
        .update({
          status: 'accepted',
          receiver_id: user.id,
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', incomingCall.id)
        .select('id, caller_id, receiver_id, call_type, conversation_id, created_at, started_at, ended_at, status')
        .single();

      if (error) throw error;

      openAcceptedCall(data as PrivateCallSession);
      return true;
    } catch (error) {
      console.error('Error accepting private call:', error);
      toast.error('Impossible d\'accepter l\'appel');
      return false;
    }
  }, [incomingCall, insertCallLog, openAcceptedCall, user?.id]);

  const rejectCall = useCallback(async () => {
    if (!incomingCall || !user?.id) {
      return false;
    }

    try {
      const currentCallType = incomingCall.callType;
      const { error } = await supabase
        .from('call_sessions')
        .update({
          status: 'rejected',
          receiver_id: user.id,
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', incomingCall.id);

      if (error) throw error;

      if (otherUserId) {
        await insertCallLog({
          version: 2,
          outcome: 'rejected',
          callType: currentCallType,
          initiatedByUserId: incomingCall.callerId,
          sessionId: incomingCall.id,
        }, incomingCall.callerId, user.id);
      }

      setIncomingCall(null);
      return true;
    } catch (error) {
      console.error('Error rejecting private call:', error);
      toast.error('Impossible de refuser l\'appel');
      return false;
    }
  }, [incomingCall, insertCallLog, otherUserId, user?.id]);

  const cancelOutgoingCall = useCallback(async () => {
    if (!outgoingCall || !user?.id || !otherUserId) {
      return false;
    }

    try {
      const { error } = await supabase
        .from('call_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', outgoingCall.id);

      if (error) throw error;

      await insertCallLog({
        version: 2,
        outcome: 'cancelled',
        callType: outgoingCall.callType,
        initiatedByUserId: user.id,
        sessionId: outgoingCall.id,
      }, user.id, otherUserId);

      setOutgoingCall(null);
      return true;
    } catch (error) {
      console.error('Error cancelling private call:', error);
      toast.error('Impossible d\'annuler l\'appel');
      return false;
    }
  }, [insertCallLog, otherUserId, outgoingCall, user?.id]);

  const endCall = useCallback(async () => {
    const sessionId = activeSessionRef.current;
    if (!sessionId) {
      setActiveCall(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('call_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .select('id, caller_id, receiver_id, call_type, started_at')
        .single();

      if (error) throw error;

      if (user?.id && otherUserId && activeCall) {
        const persistedStartedAt = data?.started_at ?? activeCall.startedAt;
        const startedAtMs = persistedStartedAt ? new Date(persistedStartedAt).getTime() : NaN;
        const durationSeconds = Number.isFinite(startedAtMs)
          ? Math.max(0, Math.round((Date.now() - startedAtMs) / 1000))
          : undefined;

        await insertCallLog({
          version: 2,
          outcome: 'completed',
          callType: activeCall.callType,
          initiatedByUserId: activeCall.initiatedByUserId,
          durationSeconds,
          sessionId,
        }, activeCall.initiatedByUserId, activeCall.initiatedByUserId === user.id ? otherUserId : user.id);
      }
    } catch (error) {
      console.error('Error ending private call:', error);
    } finally {
      setActiveCall(null);
      activeSessionRef.current = null;
      clearPendingState(sessionId);
    }
  }, [activeCall, clearPendingState, insertCallLog, otherUserId, user?.id]);

  const closeActiveCallLocally = useCallback(() => {
    const sessionId = activeSessionRef.current;
    setActiveCall(null);
    activeSessionRef.current = null;
    if (sessionId) {
      clearPendingState(sessionId);
    }
  }, [clearPendingState]);

  return {
    activeCall,
    closeActiveCallLocally,
    conversationId,
    incomingCall,
    isBusy: !!incomingCall || !!outgoingCall || !!activeCall,
    outgoingCall,
    acceptCall,
    cancelOutgoingCall,
    endCall,
    rejectCall,
    startCall,
  };
};