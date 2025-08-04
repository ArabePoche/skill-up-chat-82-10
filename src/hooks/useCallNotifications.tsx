
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
          filter: `status=eq.pending`
        } as any,
        (payload: any) => {
          console.log('New call received:', payload);
          const call = payload.new as CallNotification;
          
          // Vérifier si cet appel concerne l'utilisateur actuel
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
          filter: `status=neq.pending`
        } as any,
        (payload: any) => {
          console.log('Call updated:', payload);
          const call = payload.new as CallNotification;
          
          // Nettoyer la notification si l'appel n'est plus en attente
          if (call.status !== 'pending') {
            setIncomingCall(null);
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
      // Si receiver_id est null, c'est un appel à tous les profs
      if (!call.receiver_id) {
        // Vérifier si l'utilisateur est professeur de cette formation via teacher_formations
        const { data: teacherFormation, error } = await supabase
          .from('teacher_formations')
          .select('teacher_id')
          .eq('formation_id', call.formation_id)
          .eq('teacher_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Erreur lors de la vérification de la formation:', error);
          return;
        }

        // Si l'utilisateur est le professeur de cette formation, afficher la notification
        if (teacherFormation) {
          console.log('Appel reçu pour le professeur:', call);
          setIncomingCall(call);
        }
      } else {
        // Si receiver_id n'est pas vide, vérifier si c'est pour cet utilisateur
        if (call.receiver_id === user.id) {
          console.log('Appel reçu pour l\'utilisateur:', call);
          setIncomingCall(call);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'appel:', error);
    }
  };

  const dismissCall = () => {
    setIncomingCall(null);
  };

  const acceptCall = async (callId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('call_sessions')
        .update({ 
          status: 'accepted',
          receiver_id: user.id,  // Ajout du receiver_id pour identifier le professeur qui répond
          updated_at: new Date().toISOString()
        })
        .eq('id', callId);

      if (error) {
        console.error('Erreur lors de l\'acceptation de l\'appel:', error);
      } else {
        setIncomingCall(null);
        // TODO: Démarrer la connexion WebRTC
      }
    } catch (error) {
      console.error('Erreur lors de l\'acceptation de l\'appel:', error);
    }
  };

  const rejectCall = async (callId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('call_sessions')
        .update({ 
          status: 'rejected',
          receiver_id: user.id,  // Ajout du receiver_id pour identifier le professeur qui rejette
          updated_at: new Date().toISOString()
        })
        .eq('id', callId);

      if (error) {
        console.error('Erreur lors du rejet de l\'appel:', error);
      } else {
        setIncomingCall(null);
      }
    } catch (error) {
      console.error('Erreur lors du rejet de l\'appel:', error);
    }
  };

  return {
    incomingCall,
    dismissCall,
    acceptCall,
    rejectCall
  };
};
