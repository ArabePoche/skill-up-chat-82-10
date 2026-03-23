

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

      if (teacherCheck) {
        // Optimisation Professeurs : Récupérer tous les messages non lus en une seule requête
        const { data: unreadMessages } = await supabase
          .from('lesson_messages')
          .select('id, level_id, lesson_id')
          .eq('formation_id', formationId)
          .is('read_by_teachers', null)
          .neq('sender_id', user.id)
          .eq('is_system_message', false);

        if (unreadMessages) {
          // Initialiser la structure pour tous les niveaux
          levels.forEach(level => {
            unreadCounts[level.id] = { level: 0, lessons: {} };
            level.lessons?.forEach(lesson => {
              unreadCounts[level.id].lessons[lesson.id] = 0;
            });
          });

          // Agréger les résultats
          unreadMessages.forEach(msg => {
            if (!msg.level_id) return;
            
            if (!unreadCounts[msg.level_id]) {
              unreadCounts[msg.level_id] = { level: 0, lessons: {} };
            }
            
            unreadCounts[msg.level_id].level++;
            
            if (msg.lesson_id) {
               unreadCounts[msg.level_id].lessons[msg.lesson_id] = (unreadCounts[msg.level_id].lessons[msg.lesson_id] || 0) + 1;
            }
          });
        }
      } else if (studentCheck) {
        // Optimisation Étudiants : Récupérer tous les messages non lus en une seule requête
        const { data: unreadMessages } = await supabase
          .from('lesson_messages')
          .select('id, level_id, lesson_id')
          .eq('formation_id', formationId)
          .eq('receiver_id', user.id)
          .eq('is_read', false)
          .eq('is_system_message', true);

         if (unreadMessages) {
          // Initialiser la structure
          levels.forEach(level => {
             unreadCounts[level.id] = { level: 0, lessons: {} };
              level.lessons?.forEach(lesson => {
                unreadCounts[level.id].lessons[lesson.id] = 0;
             });
          });

          // Agréger
          unreadMessages.forEach(msg => {
             if (!msg.level_id) return;

             if (!unreadCounts[msg.level_id]) {
               unreadCounts[msg.level_id] = { level: 0, lessons: {} };
             }
             
             unreadCounts[msg.level_id].level++;
             
             if (msg.lesson_id) {
                unreadCounts[msg.level_id].lessons[msg.lesson_id] = (unreadCounts[msg.level_id].lessons[msg.lesson_id] || 0) + 1;
             }
          });
        }
      }

      return unreadCounts;
    },
    enabled: !!user?.id && !!formationId,
    staleTime: 30000, 
    refetchInterval: 60000, // Rafraîchir toutes les minutes c'est suffisant (le realtime gère l'immédiat)
  });
};
