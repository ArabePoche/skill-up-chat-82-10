// Provider global des appels prives entrants.
// Role: restaurer et afficher la modale d'appel meme si la discussion n'est pas deja ouverte.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TeacherCallModal from '@/components/live-classroom/TeacherCallModal';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineSync } from '@/offline/hooks/useOfflineSync';
import { supabase } from '@/integrations/supabase/client';
import { createCallLogContent, parseCallLogContent, StructuredCallLog } from '@/utils/conversationCallLog';

type PrivateCallType = 'audio' | 'video';

interface PrivateIncomingSession {
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

interface CallerProfile {
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

const normalizeCallType = (callType: string): PrivateCallType => {
  return callType === 'video' ? 'video' : 'audio';
};

const buildCallerName = (profile: CallerProfile | null, fallbackUserId?: string) => {
  if (!profile) {
    return fallbackUserId ? 'Utilisateur' : 'Utilisateur';
  }

  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
  return fullName || profile.username || 'Utilisateur';
};

const PrivateIncomingCallProvider: React.FC = () => {
  const { user } = useAuth();
  const { isOnline } = useOfflineSync();
  const navigate = useNavigate();
  const location = useLocation();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [incomingCall, setIncomingCall] = useState<PrivateIncomingSession | null>(null);
  const [callerProfile, setCallerProfile] = useState<CallerProfile | null>(null);
  const forceModalFromLaunch = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('incomingCall') === '1';
  }, [location.search]);

  const clearCallState = useCallback(() => {
    setIncomingCall(null);
    setCallerProfile(null);
  }, []);

  const loadCallerProfile = useCallback(async (callerId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('first_name, last_name, username, avatar_url')
      .eq('id', callerId)
      .maybeSingle();

    if (error) {
      console.error('Error loading private call caller profile:', error);
      setCallerProfile(null);
      return;
    }

    setCallerProfile((data || null) as CallerProfile | null);
  }, []);

  const openIncomingCall = useCallback(async (session: PrivateIncomingSession) => {
    setIncomingCall(session);
    await loadCallerProfile(session.caller_id);
  }, [loadCallerProfile]);

  const hydrateIncomingCall = useCallback(async () => {
    if (!user?.id || !isOnline) {
      clearCallState();
      return;
    }

    try {
      const { data, error } = await supabase
        .from('call_sessions')
        .select('id, caller_id, receiver_id, call_type, conversation_id, created_at, started_at, ended_at, status')
        .eq('receiver_id', user.id)
        .not('conversation_id', 'is', null)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        clearCallState();
        return;
      }

      await openIncomingCall(data as PrivateIncomingSession);
    } catch (error) {
      console.error('Error hydrating private incoming call:', error);
    }
  }, [clearCallState, isOnline, openIncomingCall, user?.id]);

  useEffect(() => {
    if (!user?.id || !isOnline) {
      clearCallState();
      return;
    }

    void hydrateIncomingCall();

    channelRef.current = supabase
      .channel(`global-private-incoming-call-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_sessions',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const session = payload.new as PrivateIncomingSession;
          if (session.conversation_id && session.status === 'pending') {
            void openIncomingCall(session);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'call_sessions',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const session = payload.new as PrivateIncomingSession;
          if (!session.conversation_id) {
            return;
          }

          if (session.status === 'pending') {
            void openIncomingCall(session);
            return;
          }

          const endedAtMs = session.ended_at ? new Date(session.ended_at).getTime() : NaN;
          const createdAtMs = session.created_at ? new Date(session.created_at).getTime() : NaN;
          const elapsedMs = Number.isFinite(endedAtMs) && Number.isFinite(createdAtMs)
            ? Math.max(0, endedAtMs - createdAtMs)
            : undefined;

          if (session.status === 'ended' && !session.started_at && session.receiver_id) {
            const fallbackOutcome = elapsedMs !== undefined && elapsedMs >= 29_000
              ? 'missed'
              : 'cancelled';

            void insertCallLog({
              version: 2,
              outcome: fallbackOutcome,
              callType: normalizeCallType(session.call_type),
              initiatedByUserId: session.caller_id,
              sessionId: session.id,
            }, session.caller_id, session.receiver_id).catch((error) => {
              console.error('Error inserting fallback global private call log:', error);
            });
          }

          setIncomingCall((current) => (current?.id === session.id ? null : current));
          if (incomingCall?.id === session.id) {
            setCallerProfile(null);
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      channelRef.current = null;
    };
  }, [clearCallState, hydrateIncomingCall, incomingCall?.id, isOnline, openIncomingCall, user?.id]);

  const isConversationAlreadyOpen = useMemo(() => {
    if (!incomingCall?.caller_id) {
      return false;
    }

    return !forceModalFromLaunch && location.pathname === `/conversations/${incomingCall.caller_id}`;
  }, [forceModalFromLaunch, incomingCall?.caller_id, location.pathname]);

  const insertCallLog = useCallback(async (payload: StructuredCallLog, senderId: string, receiverId: string) => {
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
  }, []);

  const handleAccept = useCallback(async () => {
    if (!incomingCall || !user?.id) {
      return;
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
        .select('caller_id, call_type')
        .single();

      if (error) {
        throw error;
      }

      clearCallState();
      navigate(`/conversations/${data.caller_id}`, { replace: true });
    } catch (error) {
      console.error('Error accepting global private call:', error);
    }
  }, [clearCallState, incomingCall, insertCallLog, navigate, user?.id]);

  const handleReject = useCallback(async () => {
    if (!incomingCall || !user?.id) {
      return;
    }

    try {
      const currentCallType = normalizeCallType(incomingCall.call_type);
      const { error } = await supabase
        .from('call_sessions')
        .update({
          status: 'rejected',
          receiver_id: user.id,
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', incomingCall.id);

      if (error) {
        throw error;
      }

      await insertCallLog({
        version: 2,
        outcome: 'rejected',
        callType: currentCallType,
        initiatedByUserId: incomingCall.caller_id,
        sessionId: incomingCall.id,
      }, incomingCall.caller_id, user.id);

      clearCallState();
    } catch (error) {
      console.error('Error rejecting global private call:', error);
    }
  }, [clearCallState, incomingCall, insertCallLog, user?.id]);

  if (!incomingCall || isConversationAlreadyOpen) {
    return null;
  }

  return (
    <TeacherCallModal
      isOpen
      onAccept={handleAccept}
      onReject={handleReject}
      studentName={buildCallerName(callerProfile, incomingCall.caller_id)}
      studentAvatar={callerProfile?.avatar_url || undefined}
      callType={normalizeCallType(incomingCall.call_type)}
      direction="incoming"
    />
  );
};

export default PrivateIncomingCallProvider;