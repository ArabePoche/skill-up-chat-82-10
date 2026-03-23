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

      // Utiliser Promise.all pour paralléliser les requêtes par niveau
      const groupDiscussionsPromises = levels.map(async (level) => {
        if (!level.lessons || level.lessons.length === 0) return null;

        // Récupérer le dernier message du niveau
        const { data: latestMessages, error: latestError } = await supabase
          .from('lesson_messages')
          .select('created_at, content, promotion_id, sender_id')
          .eq('formation_id', formationId)
          .eq('level_id', level.id) // Utiliser level_id directement
          .not('promotion_id', 'is', null) // Messages de groupe uniquement
          .order('created_at', { ascending: false })
          .limit(1);

        if (latestError || !latestMessages || latestMessages.length === 0) return null;

        const lastMessage = latestMessages[0];

        // Compter les messages non lus pour ce niveau (une seule requête au lieu de boucle sur leçons)
        // Utiliser level_id pour compter directement
        const { count: unreadCount } = await supabase
            .from('lesson_messages')
            .select('*', { count: 'exact', head: true })
            .eq('formation_id', formationId)
            .eq('level_id', level.id)
            .not('promotion_id', 'is', null) // Messages de groupe
            .is('read_by_teachers', null) // Non lu par aucun prof
            .neq('sender_id', user.id) // Pas ses propres messages
            .eq('is_system_message', false);

        // Compter le nombre d'étudiants distincts (en récupérant que les IDs uniques)
        // Ici on filtre aussi par `studentIds` pour être sûr qu'ils sont inscrits
        const { data: participants } = await supabase
          .from('lesson_messages')
          .select('sender_id')
          .eq('formation_id', formationId)
          .eq('level_id', level.id)
          .not('promotion_id', 'is', null);
          
        const uniqueStudents = new Set(
          participants
            ?.filter(p => studentIds.includes(p.sender_id))
            .map(p => p.sender_id) 
            || []
        );
        
        return {
          level_id: level.id,
          level_title: level.title,
          level_order: level.order_index,
          unread_count: unreadCount || 0,
          last_message_time: lastMessage.created_at,
          last_message_content: lastMessage.content,
          students_count: uniqueStudents.size
        };
      });

      const results = await Promise.all(groupDiscussionsPromises);
      
      const groupDiscussions = results.filter((item): item is GroupDiscussion => item !== null);

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
    staleTime: 60000, 
  });
};