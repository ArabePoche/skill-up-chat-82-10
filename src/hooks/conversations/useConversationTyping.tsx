// Hook pour gérer l'indicateur "est en train d'écrire" dans les conversations directes
// Combine l'émission (typing indicator) et l'écoute (typing listener) en un seul hook

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useConversationTyping = (otherUserId?: string) => {
  const { user } = useAuth();
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const otherTypingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!user?.id || !otherUserId) return;

    // Canal unique entre les deux utilisateurs (trié pour cohérence)
    const participants = [user.id, otherUserId].sort();
    const channelName = `conv-typing-${participants[0]}-${participants[1]}`;

    channelRef.current = supabase
      .channel(channelName)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const senderId = payload.payload?.user_id;
        if (senderId === otherUserId) {
          setIsOtherTyping(true);
          // Auto-reset après 3s sans nouveau signal
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

  const emitTyping = useCallback(() => {
    if (!channelRef.current || !user?.id) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: user.id },
    });

    // Auto-stop après 3s d'inactivité
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

  return { isOtherTyping, emitTyping, emitStopTyping };
};
