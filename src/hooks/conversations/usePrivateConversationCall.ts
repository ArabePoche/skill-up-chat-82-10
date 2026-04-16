// Hook: gestion des appels audio/video dans une conversation privee
// Role: creer, recevoir, accepter, refuser et terminer un appel cible entre deux utilisateurs
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { sendPushNotification } from '@/utils/notificationHelpers';

type PrivateCallType = 'audio' | 'video';

interface PrivateCallSession {
  id: string;
  caller_id: string;
  receiver_id: string | null;
  call_type: string;
  conversation_id: string | null;
  status: string;
}

export interface PendingPrivateCall {
  id: string;
  callType: PrivateCallType;
}

export interface ActivePrivateCall {
  id: string;
  callType: PrivateCallType;
  channelName: string;
  remoteUserName: string;
}

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
  }, []);

  const openAcceptedCall = useCallback((session: PrivateCallSession) => {
    const nextActiveCall = {
      id: session.id,
      callType: normalizeCallType(session.call_type),
      channelName: `call_${session.id}`,
      remoteUserName: otherUserName,
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
        });
      } else if (session.receiver_id === user.id) {
        setIncomingCall({
          id: session.id,
          callType: normalizeCallType(session.call_type),
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
        .select('id, caller_id, receiver_id, call_type, conversation_id, status')
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
        .select('id, caller_id, receiver_id, call_type, conversation_id, status')
        .single();

      if (error) throw error;

      setOutgoingCall({
        id: data.id,
        callType: normalizeCallType(data.call_type),
      });

      toast.success(`Appel ${type === 'video' ? 'video' : 'audio'} lance`);
      toast.info(`En attente de la reponse de ${otherUserName}`);

      sendPushNotification({
        userIds: [otherUserId],
        title: user.user_metadata?.first_name || user.email?.split('@')[0] || 'Nouvel appel',
        message: `Appel ${type === 'video' ? 'video' : 'audio'} entrant`,
        type: 'private_chat',
        clickAction: '/messages',
        data: {
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
        .select('id, caller_id, receiver_id, call_type, conversation_id, status')
        .single();

      if (error) throw error;

      openAcceptedCall(data as PrivateCallSession);
      return true;
    } catch (error) {
      console.error('Error accepting private call:', error);
      toast.error('Impossible d\'accepter l\'appel');
      return false;
    }
  }, [incomingCall, openAcceptedCall, user?.id]);

  const rejectCall = useCallback(async () => {
    if (!incomingCall || !user?.id) {
      return false;
    }

    try {
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

      setIncomingCall(null);
      return true;
    } catch (error) {
      console.error('Error rejecting private call:', error);
      toast.error('Impossible de refuser l\'appel');
      return false;
    }
  }, [incomingCall, user?.id]);

  const endCall = useCallback(async () => {
    const sessionId = activeSessionRef.current;
    if (!sessionId) {
      setActiveCall(null);
      return;
    }

    try {
      const { error } = await supabase
        .from('call_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (error) throw error;
    } catch (error) {
      console.error('Error ending private call:', error);
    } finally {
      setActiveCall(null);
      activeSessionRef.current = null;
      clearPendingState(sessionId);
    }
  }, [clearPendingState]);

  return {
    activeCall,
    conversationId,
    incomingCall,
    isBusy: !!incomingCall || !!outgoingCall || !!activeCall,
    outgoingCall,
    acceptCall,
    endCall,
    rejectCall,
    startCall,
  };
};