
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useRealtimeMessages = (lessonId?: string, formationId?: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const channelRef = useRef<any>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const cleanup = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (channelRef.current) {
      console.log('🧹 Cleaning up realtime channel');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setIsSubscribed(false);
    setConnectionStatus('disconnected');
  };

  const setupChannel = () => {
    if (!lessonId || !formationId || !user) {
      console.log('❌ Missing required data for realtime messages:', { lessonId, formationId, userId: user?.id });
      return;
    }

    cleanup();
    setConnectionStatus('connecting');

    const channelName = `lesson-messages-${lessonId}-${formationId}`;
    console.log('🔄 Setting up realtime subscription for:', channelName);

    channelRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lesson_messages',
          filter: `lesson_id=eq.${lessonId}`
        },
        (payload) => {
          console.log('📨 New message received via realtime:', payload);
          
          const queriesToUpdate = [
            ['student-messages', lessonId, formationId],
            ['teacher-messages', lessonId, formationId],
            ['teacher-discussions-with-unread', formationId],
            ['teacher-student-messages', formationId, payload.new.sender_id, lessonId],
            ['teacher-student-messages', formationId, payload.new.receiver_id, lessonId]
          ];

          queriesToUpdate.forEach(queryKey => {
            queryClient.invalidateQueries({ queryKey });
          });

          if (payload.new.sender_id !== user.id) {
            console.log('🔔 New message from another user');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lesson_messages',
          filter: `lesson_id=eq.${lessonId}`
        },
        (payload) => {
          console.log('📝 Message updated via realtime:', payload);
          
          const queriesToUpdate = [
            ['student-messages', lessonId, formationId],
            ['teacher-messages', lessonId, formationId],
            ['teacher-discussions-with-unread', formationId],
            ['teacher-student-messages', formationId, payload.new.sender_id, lessonId],
            ['teacher-student-messages', formationId, payload.new.receiver_id, lessonId]
          ];

          queriesToUpdate.forEach(queryKey => {
            queryClient.invalidateQueries({ queryKey });
          });
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status, 'for lesson:', lessonId);
        
        switch (status) {
          case 'SUBSCRIBED':
            setIsSubscribed(true);
            setConnectionStatus('connected');
            reconnectAttemptsRef.current = 0;
            console.log('✅ Realtime connection established for lesson:', lessonId);
            break;
          case 'CHANNEL_ERROR':
            setIsSubscribed(false);
            setConnectionStatus('error');
            console.error('❌ Realtime connection error for lesson:', lessonId);
            attemptReconnect();
            break;
          case 'TIMED_OUT':
            setIsSubscribed(false);
            setConnectionStatus('error');
            console.error('⏰ Realtime connection timed out for lesson:', lessonId);
            attemptReconnect();
            break;
          case 'CLOSED':
            setIsSubscribed(false);
            setConnectionStatus('disconnected');
            console.warn('🔒 Realtime connection closed for lesson:', lessonId);
            attemptReconnect();
            break;
          default:
            setConnectionStatus('connecting');
            break;
        }
      });
  };

  const attemptReconnect = () => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error('🚨 Max reconnection attempts reached for realtime');
      setConnectionStatus('error');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000); // Exponential backoff, max 30s
    reconnectAttemptsRef.current++;
    
    console.log(`🔄 Attempting to reconnect realtime (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}) in ${delay}ms`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      setupChannel();
    }, delay);
  };

  useEffect(() => {
    setupChannel();

    // Heartbeat to check connection
    const heartbeatInterval = setInterval(() => {
      if (channelRef.current && isSubscribed) {
        // Send a heartbeat ping
        channelRef.current.send({
          type: 'broadcast',
          event: 'heartbeat',
          payload: { timestamp: Date.now() }
        }).catch((error: any) => {
          console.error('💓 Heartbeat failed:', error);
          if (connectionStatus === 'connected') {
            setConnectionStatus('error');
            attemptReconnect();
          }
        });
      }
    }, 30000); // Every 30 seconds

    return () => {
      clearInterval(heartbeatInterval);
      cleanup();
    };
  }, [lessonId, formationId, user?.id, queryClient]);

  return { 
    isSubscribed, 
    connectionStatus,
    reconnectAttempts: reconnectAttemptsRef.current,
    maxReconnectAttempts
  };
};
