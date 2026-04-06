/**
 * Hook pour recevoir les notifications d'appel entrant côté professeur
 * Joue une sonnerie et affiche la notification en temps réel
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { NotificationSoundService } from '@/services/NotificationSoundService';

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

  // Jouer / arrêter la sonnerie selon l'état
  useEffect(() => {
    if (incomingCall) {
      NotificationSoundService.startRingtone();
    } else {
      NotificationSoundService.stopRingtone();
    }
    
    // Nettoyage au démontage pour être sûr d'arrêter le son
    return () => {
      NotificationSoundService.stopRingtone();
    };
  }, [incomingCall]);

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
          filter: `status=eq.pending`
        } as any,
        (payload: any) => {
          console.log('📞 New call received:', payload);
          const call = payload.new as CallNotification;

          if (call.status === 'pending') {
            checkIfCallConcernsUser(call);
          }
        }
      )
      .on(
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'call_sessions',
        } as any,
        (payload: any) => {
          console.log('📞 Call updated:', payload);
          const call = payload.new as CallNotification;

          if (call.status !== 'pending') {
            setIncomingCall(prev => (prev?.id === call.id ? null : prev));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const checkIfCallConcernsUser = async (call: CallNotification) => {
    if (!user) return;

    try {
      if (!call.receiver_id) {
        // Vérifier si l'utilisateur est professeur de cette formation
        // teacher_formations.teacher_id → teachers.id, donc on passe par teachers.user_id
        const { data: teacherData, error } = await supabase
          .from('teachers')
          .select(`
            id,
            teacher_formations!inner(formation_id)
          `)
          .eq('user_id', user.id)
          .eq('teacher_formations.formation_id', call.formation_id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Erreur vérification professeur:', error);
          return;
        }

        if (teacherData) {
          console.log('📞 Appel entrant pour le professeur:', call);
          setIncomingCall(call);
        }
      } else {
        if (call.receiver_id === user.id) {
          console.log('📞 Appel entrant pour l\'utilisateur:', call);
          setIncomingCall(call);
        }
      }
    } catch (error) {
      console.error('Erreur vérification appel:', error);
    }
  };

  const dismissCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  const acceptCall = async (callId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('call_sessions')
        .update({
          status: 'accepted',
          receiver_id: user.id,
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', callId);

      if (error) {
        console.error('Erreur acceptation appel:', error);
      } else {
        setIncomingCall(null);
      }
    } catch (error) {
      console.error('Erreur acceptation appel:', error);
    }
  };

  const rejectCall = async (callId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('call_sessions')
        .update({
          status: 'rejected',
          receiver_id: user.id,
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', callId);

      if (error) {
        console.error('Erreur rejet appel:', error);
      } else {
        setIncomingCall(null);
      }
    } catch (error) {
      console.error('Erreur rejet appel:', error);
    }
  };

  return {
    incomingCall,
    dismissCall,
    acceptCall,
    rejectCall
  };
};
