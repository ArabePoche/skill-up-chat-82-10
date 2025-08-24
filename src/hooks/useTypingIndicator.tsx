
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useTypingIndicator = (lessonId: string, formationId: string) => {
  const { user } = useAuth();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const channelRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;

  const cleanup = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    isSubscribedRef.current = false;
  };

  const setupChannel = () => {
    if (!user || !lessonId || !formationId) {
      console.log('Missing required data for typing indicator:', { user: !!user, lessonId, formationId });
      return;
    }

    cleanup();

    const channelName = `typing-${lessonId}-${formationId}`;
    

    channelRef.current = supabase.channel(channelName);
    
    channelRef.current.subscribe((status: string) => {
      
      
      switch (status) {
        case 'SUBSCRIBED':
          isSubscribedRef.current = true;
          reconnectAttemptsRef.current = 0;
          
          break;
        case 'CHANNEL_ERROR':
        case 'TIMED_OUT':
        case 'CLOSED':
          isSubscribedRef.current = false;
          
          attemptReconnect();
          break;
      }
    });
  };

  const attemptReconnect = () => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      
      return;
    }

    const delay = 1000 * Math.pow(2, reconnectAttemptsRef.current);
    reconnectAttemptsRef.current++;
    
    
    
    reconnectTimeoutRef.current = setTimeout(setupChannel, delay);
  };

  useEffect(() => {
    setupChannel();
    return cleanup;
  }, [user?.id, lessonId, formationId]);

  const sendTypingStatus = async (isTyping: boolean) => {
    if (!user || !lessonId || !formationId || !channelRef.current || !isSubscribedRef.current) {
      return;
    }

    try {
      const payload = {
        user_id: user.id,
        user_name: user.user_metadata?.first_name || user.email?.split('@')[0] || 'Utilisateur',
        is_teacher: user.user_metadata?.is_teacher || false,
        lesson_id: lessonId,
        formation_id: formationId
      };

      const eventType = isTyping ? 'typing_start' : 'typing_stop';
      
      await channelRef.current.send({
        type: 'broadcast',
        event: eventType,
        payload
      });
      
    } catch (error) {
      console.error('Error sending typing status:', error);
      if (isSubscribedRef.current) {
        attemptReconnect();
      }
    }
  };

  const startTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    sendTypingStatus(true);

    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(false);
    }, 3000);
  };

  const stopTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    sendTypingStatus(false);
  };

  return { startTyping, stopTyping, isSubscribed: isSubscribedRef.current };
};
