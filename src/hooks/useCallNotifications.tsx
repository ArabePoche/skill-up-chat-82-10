
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface CallNotification {
  id: string;
  caller_id: string;
  receiver_id: string;
  formation_id: string;
  lesson_id: string;
  status: string;
  created_at: string;
  call_type: string;
}

export const useCallNotifications = () => {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<CallNotification | null>(null);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('call_notifications')
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_sessions',
          filter: `receiver_id=eq.${user.id}`
        } as any,
        (payload: any) => {
          console.log('New call received:', payload);
          if (payload.new.status === 'pending') {
            setIncomingCall(payload.new as CallNotification);
          }
        }
      )
      .on(
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'call_sessions',
          filter: `receiver_id=eq.${user.id}`
        } as any,
        (payload: any) => {
          console.log('Call updated:', payload);
          if (payload.new.status !== 'pending') {
            setIncomingCall(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const dismissCall = () => {
    setIncomingCall(null);
  };

  return {
    incomingCall,
    dismissCall
  };
};
