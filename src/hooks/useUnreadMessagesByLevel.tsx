
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useUnreadMessagesByLevel = (formationId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['unread-messages-by-level', formationId, user?.id],
    queryFn: async () => {
      if (!user?.id || !formationId) return {};

      // Vérifier si l'utilisateur est professeur
      const { data: teacherCheck } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      // Vérifier si l'utilisateur est étudiant inscrit à cette formation
      const { data: studentCheck } = await supabase
        .from('enrollment_requests')
        .select('id')
        .eq('user_id', user.id)
        .eq('formation_id', formationId)
        .eq('status', 'approved')
        .maybeSingle();

      // Si l'utilisateur n'est ni prof ni étudiant inscrit, retourner vide
      if (!teacherCheck && !studentCheck) return {};

      // Récupérer tous les niveaux et leçons de la formation
      const { data: levels } = await supabase
        .from('levels')
        .select(`
          id,
          title,
          lessons (
            id,
            title
          )
        `)
        .eq('formation_id', formationId)
        .order('order_index', { ascending: true });

      if (!levels) return {};

      const unreadCounts: Record<string, { level: number; lessons: Record<string, number> }> = {};

      // Pour chaque niveau, compter les messages non lus
      for (const level of levels) {
        let levelUnreadCount = 0;
        const lessonCounts: Record<string, number> = {};

        if (level.lessons) {
          for (const lesson of level.lessons) {
            let lessonUnreadCount = 0;

            if (teacherCheck) {
              // Pour les professeurs : compter les messages non lus (où read_by_teacher est null)
              const { count } = await supabase
                .from('lesson_messages')
                .select('*', { count: 'exact', head: true })
                .eq('formation_id', formationId)
                .eq('lesson_id', lesson.id)
                .is('read_by_teacher', null) // Non lu par aucun prof
                .neq('sender_id', user.id)
                .eq('is_system_message', false); // Exclure les messages système

              lessonUnreadCount = count || 0;
            } else if (studentCheck) {
              // Pour les étudiants : compter les messages système non lus qui leur sont adressés
              const { count } = await supabase
                .from('lesson_messages')
                .select('*', { count: 'exact', head: true })
                .eq('formation_id', formationId)
                .eq('lesson_id', lesson.id)
                .eq('receiver_id', user.id)
                .eq('is_read', false)
                .eq('is_system_message', true);

              lessonUnreadCount = count || 0;
            }

            lessonCounts[lesson.id] = lessonUnreadCount;
            levelUnreadCount += lessonUnreadCount;
          }
        }

        unreadCounts[level.id] = {
          level: levelUnreadCount,
          lessons: lessonCounts
        };
      }

      return unreadCounts;
    },
    enabled: !!user?.id && !!formationId,
    refetchInterval: 10000, // Rafraîchir toutes les 10 secondes
  });
};
