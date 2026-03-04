// Hook pour gérer l'indicateur "est en train d'écrire/enregistrer" dans les conversations directes
// Combine l'émission (typing indicator) et l'écoute (typing listener) en un seul hook

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type ActivityType = 'typing' | 'recording';

export const useConversationTyping = (otherUserId?: string) => {
  const { user } = useAuth();
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [otherActivityType, setOtherActivityType] = useState<ActivityType>('typing');
  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const otherTypingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!user?.id || !otherUserId) return;

    const participants = [user.id, otherUserId].sort();
    const channelName = `conv-typing-${participants[0]}-${participants[1]}`;

    channelRef.current = supabase
      .channel(channelName)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const senderId = payload.payload?.user_id;
        if (senderId === otherUserId) {
          setIsOtherTyping(true);
          setOtherActivityType(payload.payload?.activity || 'typing');
          if (otherTypingTimeoutRef.current) clearTimeout(otherTypingTimeoutRef.current);
          otherTypingTimeoutRef.current = setTimeout(() => setIsOtherTyping(false), 3000);
        }
      })
      .on('broadcast', { event: 'stop_typing' }, (payload) => {
        if (payload.payload?.user_id === otherUserId) {
          setIsOtherTyping(false);
          if (otherTypingTimeoutRef.current) clearTimeout(otherTypingTimeoutRef.current);
        }
      })
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (otherTypingTimeoutRef.current) clearTimeout(otherTypingTimeoutRef.current);
      channelRef.current = null;
    };
  }, [user?.id, otherUserId]);

  const emitTyping = useCallback((activity: ActivityType = 'typing') => {
    if (!channelRef.current || !user?.id) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: user.id, activity },
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'stop_typing',
        payload: { user_id: user.id },
      });
    }, 3000);
  }, [user?.id]);

  const emitStopTyping = useCallback(() => {
    if (!channelRef.current || !user?.id) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    channelRef.current.send({
      type: 'broadcast',
      event: 'stop_typing',
      payload: { user_id: user.id },
    });
  }, [user?.id]);

  return { isOtherTyping, otherActivityType, emitTyping, emitStopTyping };
};
