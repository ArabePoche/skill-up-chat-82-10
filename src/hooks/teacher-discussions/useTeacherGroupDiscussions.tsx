import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface GroupDiscussion {
  level_id: string;
  level_title: string;
  level_order: number;
  unread_count: number;
  last_message_time: string;
  last_message_content: string;
  students_count: number;
}

/**
 * Hook pour récupérer les discussions de groupe côté professeur
 * (organisé par niveau au lieu de par leçon)
 */
export const useTeacherGroupDiscussions = (formationId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['teacher-group-discussions', formationId, user?.id],
    queryFn: async (): Promise<GroupDiscussion[]> => {
      if (!formationId || !user?.id) return [];

      console.log('Fetching teacher group discussions for formation:', formationId);

      // Vérifier si l'utilisateur est professeur de cette formation
      const { data: teacherCheck } = await supabase
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

      if (!teacherCheck) {
        console.error('User is not a teacher in this formation');
        return [];
      }

      // Récupérer tous les niveaux de la formation avec leurs leçons
      const { data: levels, error: levelsError } = await supabase
        .from('levels')
        .select(`
          id,
          title,
          order_index,
          lessons (
            id,
            title
          )
        `)
        .eq('formation_id', formationId)
        .order('order_index', { ascending: true });

      if (levelsError) {
        console.error('Error fetching levels:', levelsError);
        return [];
      }

      if (!levels || levels.length === 0) {
        console.log('No levels found for formation:', formationId);
        return [];
      }

      // Récupérer tous les étudiants inscrits
      const { data: enrolledStudents } = await supabase
        .from('enrollment_requests')
        .select('user_id')
        .eq('formation_id', formationId)
        .eq('status', 'approved');

      const studentIds = enrolledStudents?.map(e => e.user_id) || [];

      const groupDiscussions: GroupDiscussion[] = [];

      // Pour chaque niveau, chercher les messages de groupe
      for (const level of levels) {
        if (!level.lessons || level.lessons.length === 0) continue;

        const lessonIds = level.lessons.map(l => l.id);

        // Récupérer les messages de groupe pour ce niveau (promotion_id NOT NULL)
        const { data: groupMessages, error } = await supabase
          .from('lesson_messages')
          .select(`
            created_at,
            content,
            promotion_id,
            sender_id
          `)
          .eq('formation_id', formationId)
          .in('lesson_id', lessonIds)
          .not('promotion_id', 'is', null) // Messages de groupe uniquement
          .order('created_at', { ascending: false })
          .limit(1); // On veut juste le dernier message pour l'affichage

        if (error) {
          console.error('Error fetching group messages for level:', level.id, error);
          continue;
        }

        if (!groupMessages || groupMessages.length === 0) continue;

        // Compter les messages non lus pour ce niveau
        let unreadCount = 0;
        for (const lesson of level.lessons) {
          const { count } = await supabase
            .from('lesson_messages')
            .select('*', { count: 'exact', head: true })
            .eq('formation_id', formationId)
            .eq('lesson_id', lesson.id)
            .not('promotion_id', 'is', null) // Messages de groupe
            .is('read_by_teacher', null) // Non lu par aucun prof
            .neq('sender_id', user.id) // Pas ses propres messages
            .eq('is_system_message', false);

          unreadCount += count || 0;
        }

        // Compter le nombre d'étudiants qui participent aux discussions de ce niveau
        const { data: participatingStudents } = await supabase
          .from('lesson_messages')
          .select('sender_id', { count: 'exact' })
          .eq('formation_id', formationId)
          .in('lesson_id', lessonIds)
          .not('promotion_id', 'is', null)
          .in('sender_id', studentIds);

        const uniqueStudents = new Set(participatingStudents?.map(m => m.sender_id) || []);

        const lastMessage = groupMessages[0];
        
        groupDiscussions.push({
          level_id: level.id,
          level_title: level.title,
          level_order: level.order_index,
          unread_count: unreadCount,
          last_message_time: lastMessage.created_at,
          last_message_content: lastMessage.content,
          students_count: uniqueStudents.size
        });
      }

      // Trier par messages non lus puis par ordre de niveau
      const sortedDiscussions = groupDiscussions.sort((a, b) => {
        if (a.unread_count !== b.unread_count) {
          return b.unread_count - a.unread_count;
        }
        return a.level_order - b.level_order;
      });

      console.log('Group discussions found:', sortedDiscussions.length);
      return sortedDiscussions;
    },
    enabled: !!formationId && !!user?.id,
    refetchInterval: 3000,
  });
};