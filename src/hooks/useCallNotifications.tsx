
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CallNotification {
  id: string;
  caller_id: string;
  receiver_id: string;
  formation_id: string;
  lesson_id: string;
  call_type: string;
  status: string;
  created_at: string;
}

export const useCallNotifications = () => {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<CallNotification | null>(null);

  useEffect(() => {
    if (!user) return;

    console.log('Setting up call notifications for user:', user.id);

    const channel = supabase
      .channel('call_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_sessions',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload: any) => {
          console.log('New call notification received:', payload);
          
          if (payload.new && payload.new.status === 'calling') {
            setIncomingCall({
              id: payload.new.id,
              caller_id: payload.new.caller_id,
              receiver_id: payload.new.receiver_id,
              formation_id: payload.new.formation_id,
              lesson_id: payload.new.lesson_id,
              call_type: payload.new.call_type,
              status: payload.new.status,
              created_at: payload.new.created_at,
            });
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
        (payload: any) => {
          console.log('Call status updated:', payload);
          
          if (payload.new && (payload.new.status === 'ended' || payload.new.status === 'declined')) {
            setIncomingCall(null);
          }
        }
      )
      .subscribe((status) => {
        console.log('Call notifications subscription status:', status);
      });

    return () => {
      console.log('Cleaning up call notifications subscription');
      supabase.removeChannel(channel);
    };
  }, [user]);

  const dismissCall = () => {
    setIncomingCall(null);
  };

  return {
    incomingCall,
    dismissCall,
  };
};
