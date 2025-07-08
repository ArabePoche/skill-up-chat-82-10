// Hook de remplacement pour les notifications d'appel - nouveau système de notifications de session
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface LiveSessionNotification {
  id: string;
  teacherId: string;
  teacherName?: string;
  formationId: string;
  lessonId: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export const useLiveNotifications = (formationId: string) => {
  const { user } = useAuth();
  const [incomingNotifications, setIncomingNotifications] = useState<LiveSessionNotification[]>([]);
  const [isTeacher, setIsTeacher] = useState(false);

  useEffect(() => {
    if (!user?.id || !formationId) return;

    // Vérifier si l'utilisateur est professeur dans cette formation
    const checkTeacherStatus = async () => {
      const { data } = await supabase
        .from('teachers')
        .select(`
          id,
          teacher_formations!inner (
            formation_id
          )
        `)
        .eq('user_id', user.id)
        .eq('teacher_formations.formation_id', formationId)
        .maybeSingle();
      
      setIsTeacher(!!data);
    };

    checkTeacherStatus();

    // Écouter les notifications de session en direct
    const subscription = supabase
      .channel('live_session_notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        if (payload.new.type === 'live_session') {
          toast.info('📺 Cours en direct disponible !', {
            description: payload.new.message,
            duration: 8000
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user?.id, formationId]);

  // Fonctions de compatibilité avec l'ancien système
  const acceptCall = async (notificationId: string) => {
    try {
      // Logique pour rejoindre la session en direct
      toast.success('Rejoint la session en direct !');
      setIncomingNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error accepting session:', error);
      toast.error('Erreur lors de l\'acceptation de la session');
    }
  };

  const rejectCall = async (notificationId: string) => {
    try {
      setIncomingNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast.info('Session rejetée');
    } catch (error) {
      console.error('Error rejecting session:', error);
    }
  };

  // Simuler des appels entrants pour la compatibilité
  const incomingCalls = incomingNotifications.map(notif => ({
    id: notif.id,
    caller_id: notif.teacherId,
    formation_id: notif.formationId,
    lesson_id: notif.lessonId,
    call_type: 'video' as const,
    caller_name: notif.teacherName || 'Professeur',
    status: notif.status,
  }));

  return {
    incomingCalls,
    acceptCall,
    rejectCall,
    isTeacher,
    // Nouvelles fonctionnalités
    incomingNotifications,
  };
};