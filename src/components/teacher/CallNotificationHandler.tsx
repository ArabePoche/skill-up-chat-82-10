
import React, { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CallNotificationHandlerProps {
  onIncomingCall?: (callData: any) => void;
}

export const CallNotificationHandler: React.FC<CallNotificationHandlerProps> = ({
  onIncomingCall
}) => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Écouter les nouveaux appels entrants
    const channel = supabase
      .channel('call_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_sessions',
          filter: `receiver_id=eq.${user.id}`
        },
        (payload) => {
          const callData = payload.new;
          
          // Notifier l'utilisateur de l'appel entrant
          toast.info(
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-green-500 animate-bounce" />
              <div>
                <p className="font-semibold">Appel entrant</p>
                <p className="text-sm text-gray-600">Un professeur souhaite vous contacter</p>
              </div>
            </div>,
            {
              duration: 10000,
              action: {
                label: "Répondre",
                onClick: () => {
                  if (onIncomingCall) {
                    onIncomingCall(callData);
                  }
                }
              }
            }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, onIncomingCall]);

  return null;
};
