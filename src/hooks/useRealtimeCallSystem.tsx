// Hook pour gérer le système d'appel en temps réel
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface CallSession {
  id: string;
  caller_id: string;
  receiver_id?: string;
  formation_id: string;
  lesson_id: string;
  call_type: 'audio' | 'video';
  status: 'pending' | 'active' | 'accepted' | 'rejected' | 'ended';
  created_at: string;
  started_at?: string;
  ended_at?: string;
}

export interface StudentProfile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

export const useRealtimeCallSystem = (formationId: string, lessonId: string) => {
  const { user } = useAuth();
  const [currentCall, setCurrentCall] = useState<CallSession | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [isStudentCallActive, setIsStudentCallActive] = useState(false);
  const [isTeacherCallModalOpen, setIsTeacherCallModalOpen] = useState(false);

  // Vérifier si l'utilisateur est professeur de cette formation
  const [isTeacher, setIsTeacher] = useState(false);

  useEffect(() => {
    if (!user) return;

    const checkIfTeacher = async () => {
      try {
        const { data, error } = await supabase
          .from('teacher_formations')
          .select('teacher_id, teachers!inner(user_id)')
          .eq('formation_id', formationId)
          .eq('teachers.user_id', user.id)
          .single();

        setIsTeacher(!!data);
      } catch (error) {
        setIsTeacher(false);
      }
    };

    checkIfTeacher();
  }, [user, formationId]);

  // Écouter les changements de call_sessions en temps réel
  useEffect(() => {
    if (!user) return;

    console.log('🔄 Setting up realtime call listener for user:', user.id);

    const channel = supabase
      .channel('call_sessions_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_sessions',
          filter: `formation_id=eq.${formationId}`
        },
        async (payload) => {
          console.log('📞 New call session:', payload.new);
          const callSession = {
            ...payload.new,
            call_type: payload.new.call_type as 'audio' | 'video',
            status: payload.new.status as 'pending' | 'active' | 'accepted' | 'rejected' | 'ended'
          } as CallSession;
          
          // Si c'est un appel pour tous les professeurs et que je suis professeur
          if (callSession.status === 'pending' && !callSession.receiver_id && isTeacher) {
            console.log('🎓 Incoming call for teacher');
            setIncomingCall(callSession);
            
            // Récupérer le profil de l'étudiant
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, first_name, last_name, avatar_url')
              .eq('id', callSession.caller_id)
              .single();
            
            if (profile) {
              setStudentProfile(profile);
              setIsTeacherCallModalOpen(true);
            }
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
          console.log('🔄 Call session updated:', payload.new);
          const updatedCall = {
            ...payload.new,
            call_type: payload.new.call_type as 'audio' | 'video',
            status: payload.new.status as 'pending' | 'active' | 'accepted' | 'rejected' | 'ended'
          } as CallSession;
          
          // Si c'est mon appel en tant qu'étudiant
          if (updatedCall.caller_id === user.id) {
            setCurrentCall(updatedCall);
            
            if (updatedCall.status === 'accepted') {
              toast.success('Un professeur a accepté votre appel !');
              // Garder le modal ouvert pour afficher le feedback "accepté"
              // Il se fermera automatiquement via le timer dans StudentCallModal
            } else if (updatedCall.status === 'rejected') {
              toast.info('Appel refusé par le professeur');
              // Garder le modal ouvert pour afficher le feedback "refusé"
            } else if (updatedCall.status === 'ended') {
              toast.info('Appel terminé');
              setIsStudentCallActive(false);
              setCurrentCall(null);
            }
          }
          
          // Si c'est un appel que j'ai accepté en tant que professeur
          if (updatedCall.receiver_id === user.id) {
            if (updatedCall.status === 'ended') {
              toast.info('L\'appel a été terminé');
              setIncomingCall(null);
              setIsTeacherCallModalOpen(false);
              setStudentProfile(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 Removing call system channel');
      supabase.removeChannel(channel);
    };
  }, [user, formationId, isTeacher]);

  // Fonction pour initier un appel (côté étudiant)
  const initiateCall = useCallback(async (callType: 'audio' | 'video') => {
    if (!user) {
      toast.error('Vous devez être connecté pour passer un appel');
      return false;
    }

    try {
      // Normaliser le type d'appel en 'audio'
      const normalizedCallType = 'audio';
      console.log('📞 Initiating call:', { callType: normalizedCallType, formationId, lessonId });
      
      const { data: callSession, error } = await supabase
        .from('call_sessions')
        .insert({
          caller_id: user.id,
          receiver_id: null, // Pour tous les professeurs
          formation_id: formationId,
          lesson_id: lessonId,
          call_type: normalizedCallType,
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
        status: callSession.status as 'pending' | 'active' | 'accepted' | 'rejected' | 'ended'
      });
      setIsStudentCallActive(true);
      
      toast.success(`Appel ${callType === 'audio' ? 'audio' : 'vidéo'} lancé`);
      toast.info('En attente qu\'un professeur réponde...');
      
      return true;
    } catch (error) {
      console.error('❌ Error initiating call:', error);
      toast.error('Erreur lors de l\'appel');
      return false;
    }
  }, [user, formationId, lessonId]);

  // Fonction pour terminer un appel (côté étudiant)
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

      setIsStudentCallActive(false);
      setCurrentCall(null);
      toast.info('Appel terminé');
    } catch (error) {
      console.error('❌ Error ending call:', error);
    }
  }, [currentCall, user]);

  // Fonction pour accepter un appel (côté professeur)
  const acceptCall = useCallback(async () => {
    if (!incomingCall || !user) return;

    try {
      const { error } = await supabase
        .from('call_sessions')
        .update({ 
          status: 'accepted',
          receiver_id: user.id,
          started_at: new Date().toISOString()
        })
        .eq('id', incomingCall.id);

      if (error) throw error;

      toast.success('Appel accepté !');
      setIsTeacherCallModalOpen(false);
      
      // TODO: Démarrer la connexion WebRTC ou rediriger vers l'interface d'appel
      
    } catch (error) {
      console.error('❌ Error accepting call:', error);
      toast.error('Erreur lors de l\'acceptation de l\'appel');
    }
  }, [incomingCall, user]);

  // Fonction pour rejeter un appel (côté professeur)
  const rejectCall = useCallback(async () => {
    if (!incomingCall || !user) return;

    try {
      const { error } = await supabase
        .from('call_sessions')
        .update({ 
          status: 'rejected',
          receiver_id: user.id,
          ended_at: new Date().toISOString()
        })
        .eq('id', incomingCall.id);

      if (error) throw error;

      toast.info('Appel rejeté');
      setIsTeacherCallModalOpen(false);
      setIncomingCall(null);
      setStudentProfile(null);
    } catch (error) {
      console.error('❌ Error rejecting call:', error);
      toast.error('Erreur lors du rejet de l\'appel');
    }
  }, [incomingCall, user]);

  return {
    // États
    currentCall,
    incomingCall,
    studentProfile,
    isStudentCallActive,
    isTeacherCallModalOpen,
    isTeacher,
    
    // Actions côté étudiant
    initiateCall,
    endCall,
    
    // Actions côté professeur
    acceptCall,
    rejectCall,
    
    // Contrôles des modals
    setIsStudentCallActive,
    setIsTeacherCallModalOpen
  };
};