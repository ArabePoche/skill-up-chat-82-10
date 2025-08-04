import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface CallSession {
  id: string;
  caller_id: string;
  receiver_id?: string;
  formation_id: string;
  lesson_id: string;
  call_type: 'audio' | 'video';
  status: 'pending' | 'accepted' | 'rejected' | 'ended';
  created_at: string;
  started_at?: string;
  ended_at?: string;
  caller_name?: string;
  caller_avatar?: string;
  lesson_title?: string;
}

export const useCallSystem = (formationId: string) => {
  const { user } = useAuth();
  const [incomingCalls, setIncomingCalls] = useState<CallSession[]>([]);
  const [currentCall, setCurrentCall] = useState<CallSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);

  // Vérifier si l'utilisateur est professeur
  useEffect(() => {
    if (!user || !formationId) return;

    const checkTeacherStatus = async () => {
      try {
        console.log('🎓 Checking teacher status for:', { userId: user.id, formationId });
        
        const { data, error } = await supabase
          .from('teachers')
          .select(`
            id,
            teacher_formations!inner(formation_id)
          `)
          .eq('user_id', user.id)
          .eq('teacher_formations.formation_id', formationId)
          .single();
        
        if (error) {
          console.log('🎓 Teacher check error:', error);
        }
        
        console.log('🎓 Teacher status check result:', { userId: user.id, formationId, isTeacher: !!data, data });
        setIsTeacher(!!data);
      } catch (error) {
        console.error('❌ Error checking teacher status:', error);
        setIsTeacher(false);
      }
    };

    checkTeacherStatus();
  }, [user, formationId]);

  // Récupérer les appels entrants pour les professeurs
  const fetchIncomingCalls = useCallback(async () => {
    if (!user || !isTeacher) {
      console.log('🚫 No user or not teacher, skipping fetch:', { user: !!user, isTeacher });
      return;
    }

    try {
      setIsLoading(true);
      console.log('📞 Fetching incoming calls for formation:', formationId);
      console.log('📞 User ID:', user.id);
      
      // D'abord, vérifions s'il y a des données dans call_sessions
      const { data: allCalls, error: allCallsError } = await supabase
        .from('call_sessions')
        .select('*')
        .eq('formation_id', formationId);
      
      console.log('📞 All calls in formation:', { formationId, allCalls, error: allCallsError });
      
      // Ensuite, récupérer les appels avec les informations détaillées
      const { data: callsData, error } = await supabase
        .from('call_sessions')
        .select(`
          *,
          profiles!call_sessions_caller_id_fkey(first_name, last_name, avatar_url),
          lessons(title)
        `)
        .eq('status', 'pending')
        .eq('formation_id', formationId)
        .is('receiver_id', null)
        .order('created_at', { ascending: false });

      console.log('📞 Query result:', { callsData, error });
      
      if (error) {
        console.error('❌ Error fetching calls:', error);
        toast.error(`Erreur lors de la récupération des appels: ${error.message}`);
        return;
      }

      console.log('📞 Raw calls data count:', callsData?.length || 0);
      console.log('📞 Raw calls data:', callsData);

      const formattedCalls: CallSession[] = (callsData || []).map(call => {
        // Extraire les informations du profil de manière sécurisée avec type assertion
        const profile = call.profiles as { first_name?: string; last_name?: string; avatar_url?: string } | null;
        const lesson = call.lessons as { title?: string } | null;
        
        return {
          id: call.id,
          caller_id: call.caller_id,
          receiver_id: call.receiver_id,
          formation_id: call.formation_id,
          lesson_id: call.lesson_id,
          call_type: call.call_type as 'audio' | 'video',
          status: call.status as 'pending' | 'accepted' | 'rejected' | 'ended',
          created_at: call.created_at,
          started_at: call.started_at,
          ended_at: call.ended_at,
          caller_name: profile
            ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Utilisateur'
            : 'Utilisateur',
          caller_avatar: profile?.avatar_url || undefined,
          lesson_title: lesson?.title || undefined
        };
      });

      console.log('📞 Formatted calls count:', formattedCalls.length);
      console.log('📞 Formatted calls:', formattedCalls);
      setIncomingCalls(formattedCalls);
    } catch (error) {
      console.error('❌ Error in fetchIncomingCalls:', error);
      toast.error('Erreur lors de la récupération des appels');
    } finally {
      setIsLoading(false);
    }
  }, [user, isTeacher, formationId]);

  // Écouter les changements en temps réel
  useEffect(() => {
    if (!user || !isTeacher) {
      console.log('🔄 Skipping realtime setup:', { user: !!user, isTeacher });
      return;
    }

    console.log('🔄 Setting up realtime listener for calls');
    fetchIncomingCalls();

    const channel = supabase
      .channel(`calls_${formationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_sessions',
          filter: `formation_id=eq.${formationId}`
        },
        (payload) => {
          console.log('📞 New call detected:', payload.new);
          if (payload.new.status === 'pending' && !payload.new.receiver_id) {
            fetchIncomingCalls();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'call_sessions',
          filter: `formation_id=eq.${formationId}`
        },
        (payload) => {
          console.log('📞 Call updated:', payload.new);
          if (payload.new.status !== 'pending') {
            setIncomingCalls(prev => prev.filter(call => call.id !== payload.new.id));
          }
        }
      )
      .subscribe((status) => {
        console.log('📞 Subscription status:', status);
      });

    return () => {
      console.log('🔄 Removing call system channel');
      supabase.removeChannel(channel);
    };
  }, [user, isTeacher, formationId, fetchIncomingCalls]);

  // Initier un appel (côté étudiant)
  const initiateCall = useCallback(async (callType: 'audio' | 'video', lessonId: string) => {
    if (!user) {
      toast.error('Vous devez être connecté pour passer un appel');
      return false;
    }

    try {
      console.log('📞 Initiating call:', { callType, formationId, lessonId });
      
      const { data: callSession, error } = await supabase
        .from('call_sessions')
        .insert({
          caller_id: user.id,
          receiver_id: null,
          formation_id: formationId,
          lesson_id: lessonId,
          call_type: callType,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating call session:', error);
        toast.error('Impossible d\'initier l\'appel');
        return false;
      }

      setCurrentCall({
        ...callSession,
        call_type: callSession.call_type as 'audio' | 'video',
        status: callSession.status as 'pending' | 'accepted' | 'rejected' | 'ended'
      });
      
      toast.success(`Appel ${callType === 'audio' ? 'audio' : 'vidéo'} lancé`);
      toast.info('En attente qu\'un professeur réponde...');
      
      return true;
    } catch (error) {
      console.error('❌ Error initiating call:', error);
      toast.error('Erreur lors de l\'appel');
      return false;
    }
  }, [user, formationId]);

  const acceptCall = useCallback(async (callId: string) => {
    if (!user) return false;

    try {
      console.log('✅ Accepting call:', callId);
      
      const { error } = await supabase
        .from('call_sessions')
        .update({ 
          status: 'accepted',
          receiver_id: user.id,
          started_at: new Date().toISOString()
        })
        .eq('id', callId);

      if (error) {
        console.error('❌ Error accepting call:', error);
        toast.error('Erreur lors de l\'acceptation de l\'appel');
        return false;
      }

      toast.success('Appel accepté !');
      
      // TODO: Démarrer WebRTC
      return true;
    } catch (error) {
      console.error('❌ Error in acceptCall:', error);
      return false;
    }
  }, [user]);

  const rejectCall = useCallback(async (callId: string) => {
    if (!user) return false;

    try {
      console.log('❌ Rejecting call:', callId);
      
      const { error } = await supabase
        .from('call_sessions')
        .update({ 
          status: 'rejected',
          receiver_id: user.id,
          ended_at: new Date().toISOString()
        })
        .eq('id', callId);

      if (error) {
        console.error('❌ Error rejecting call:', error);
        toast.error('Erreur lors du rejet de l\'appel');
        return false;
      }

      toast.info('Appel rejeté');
      return true;
    } catch (error) {
      console.error('❌ Error in rejectCall:', error);
      return false;
    }
  }, [user]);

  const endCall = useCallback(async () => {
    if (!currentCall || !user) return;

    try {
      await supabase
        .from('call_sessions')
        .update({ 
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('id', currentCall.id);

      setCurrentCall(null);
      toast.info('Appel terminé');
    } catch (error) {
      console.error('❌ Error ending call:', error);
    }
  }, [currentCall, user]);

  return {
    incomingCalls,
    currentCall,
    isLoading,
    isTeacher,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    refreshCalls: fetchIncomingCalls
  };
};