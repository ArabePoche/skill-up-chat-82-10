// Hook de remplacement pour les fonctionnalités d'appel - nouveau système de session en direct
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface LiveSession {
  id: string;
  teacherId: string;
  formationId: string;
  lessonId: string;
  status: 'pending' | 'active' | 'ended';
  startedAt?: Date;
  endedAt?: Date;
}

export const useLiveSession = (formationId: string) => {
  const { user } = useAuth();
  const [currentSession, setCurrentSession] = useState<LiveSession | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);

  const startLiveSession = useCallback(async (lessonId: string) => {
    if (!user) {
      toast.error('Vous devez être connecté pour démarrer une session');
      return false;
    }

    try {
      // Créer une nouvelle session en direct en utilisant call_sessions
      const { data: session, error } = await supabase
        .from('call_sessions')
        .insert({
          caller_id: user.id,
          receiver_id: null, // NULL au lieu de chaîne vide pour un champ UUID
          formation_id: formationId,
          lesson_id: lessonId,
          call_type: 'video',
          status: 'active',
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Erreur lors de la création de la session:', error);
        toast.error('Impossible de démarrer la session en direct');
        return false;
      }

      setCurrentSession({
        id: session.id,
        teacherId: session.caller_id,
        formationId: session.formation_id,
        lessonId: session.lesson_id,
        status: session.status as 'pending' | 'active' | 'ended',
        startedAt: session.started_at ? new Date(session.started_at) : undefined
      });
      setIsSessionActive(true);
      
      // Notifier tous les élèves inscrits à cette formation
      await notifyStudentsOfLiveSession(session.id, formationId, lessonId);
      
      toast.success('Session en direct démarrée !');
      return true;
    } catch (error) {
      console.error('Erreur lors du démarrage de la session:', error);
      toast.error('Erreur lors du démarrage de la session');
      return false;
    }
  }, [user, formationId]);

  const notifyStudentsOfLiveSession = async (sessionId: string, formationId: string, lessonId: string) => {
    try {
      // Récupérer tous les élèves inscrits à cette formation
      const { data: enrolledStudents, error } = await supabase
        .from('enrollment_requests')
        .select(`
          user_id,
          profiles!inner(
            id,
            first_name,
            last_name,
            username
          )
        `)
        .eq('formation_id', formationId)
        .eq('status', 'approved');

      if (error) {
        console.error('Erreur récupération élèves:', error);
        return;
      }

      // Créer des notifications pour chaque élève
      if (enrolledStudents && enrolledStudents.length > 0) {
        const notifications = enrolledStudents.map(student => ({
          title: 'Cours en direct disponible',
          message: `Votre professeur a commencé une session en direct. Rejoignez maintenant !`,
          type: 'live_session',
          user_id: student.user_id,
          created_at: new Date().toISOString()
        }));

        await supabase
          .from('notifications')
          .insert(notifications);
      }
    } catch (error) {
      console.error('Erreur lors de la notification des élèves:', error);
    }
  };

  const endLiveSession = useCallback(async () => {
    if (!currentSession) return;

    try {
      await supabase
        .from('call_sessions')
        .update({ 
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('id', currentSession.id);

      setIsSessionActive(false);
      setCurrentSession(null);
      toast.info('Session en direct terminée');
    } catch (error) {
      console.error('Erreur lors de la fin de la session:', error);
    }
  }, [currentSession]);

  // Fonctions de compatibilité avec l'ancien système d'appels
  const initiateCall = useCallback(async (type: 'audio' | 'video', receiverId: string, lessonId: string) => {
    // Rediriger vers le nouveau système de session en direct
    if (type === 'video') {
      return await startLiveSession(lessonId);
    }
    // Pour les appels audio, on peut implémenter une logique différente ou rediriger aussi
    toast.info('Fonctionnalité d\'appel audio à implémenter avec le nouveau système');
    return false;
  }, [startLiveSession]);

  const endCall = useCallback(async () => {
    await endLiveSession();
  }, [endLiveSession]);

  return {
    // Nouvelle API
    currentSession,
    isSessionActive,
    startLiveSession,
    endLiveSession,
    
    // Compatibilité avec l'ancien système
    initiateCall,
    isCallActive: isSessionActive,
    currentCall: currentSession,
    endCall,
  };
};