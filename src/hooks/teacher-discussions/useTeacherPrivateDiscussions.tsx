import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface PrivateDiscussion {
  student_id: string;
  lesson_id: string;
  lesson_title: string;
  student_profile: {
    id: string;
    first_name?: string;
    last_name?: string;
    username?: string;
    avatar_url?: string;
  } | null;
  unread_count: number;
  last_message_time: string;
  last_message_content: string;
}

/**
 * Hook pour récupérer les discussions privées côté professeur
 * (reste organisé par leçon comme avant)
 */
export const useTeacherPrivateDiscussions = (formationId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['teacher-private-discussions', formationId, user?.id],
    queryFn: async (): Promise<PrivateDiscussion[]> => {
      if (!formationId || !user?.id) return [];

      console.log('Fetching teacher private discussions for formation:', formationId);

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

      // Récupérer tous les étudiants inscrits dans cette formation
      const { data: enrolledStudents, error: enrollmentError } = await supabase
        .from('enrollment_requests')
        .select('user_id')
        .eq('formation_id', formationId)
        .eq('status', 'approved');

      if (enrollmentError) {
        console.error('Error fetching enrollments:', enrollmentError);
        return [];
      }

      if (!enrolledStudents || enrolledStudents.length === 0) {
        console.log('No enrolled students found for formation:', formationId);
        return [];
      }

      const studentIds = enrolledStudents.map(e => e.user_id);

      // Récupérer les discussions PRIVÉES (receiver_id IS NOT NULL et pas les groupes)
      const { data: discussions, error } = await supabase
        .from('lesson_messages')
        .select(`
          sender_id,
          receiver_id,
          lesson_id,
          created_at,
          content,
          promotion_id
        `)
        .eq('formation_id', formationId)
        .not('receiver_id', 'is', null) // Discussions privées doivent avoir un receiver_id
        .or(`sender_id.in.(${studentIds.join(',')}),receiver_id.in.(${studentIds.join(',')})`) // Messages impliquant les étudiants
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching private discussions:', error);
        return [];
      }

      if (!discussions || discussions.length === 0) {
        console.log('No private discussions found');
        return [];
      }

      // Récupérer les informations des leçons
      const lessonIds = [...new Set(discussions.map(msg => msg.lesson_id))];
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id, title')
        .in('id', lessonIds);

      const lessonsMap = new Map(lessons?.map(lesson => [lesson.id, lesson]) || []);

      // Grouper par étudiant et leçon
      const discussionMap = new Map<string, {
        student_id: string;
        lesson_id: string;
        lesson_title: string;
        last_message_time: string;
        last_message_content: string;
      }>();

      discussions.forEach(msg => {
        const studentId = studentIds.includes(msg.sender_id) ? msg.sender_id : msg.receiver_id;
        if (!studentId) return;

        const key = `${studentId}-${msg.lesson_id}`;
        if (!discussionMap.has(key)) {
          const lesson = lessonsMap.get(msg.lesson_id);
          discussionMap.set(key, {
            student_id: studentId,
            lesson_id: msg.lesson_id,
            lesson_title: lesson?.title || 'Leçon inconnue',
            last_message_time: msg.created_at,
            last_message_content: msg.content
          });
        }
      });

      // Récupérer les profils des étudiants
      const studentProfileIds = Array.from(new Set(Array.from(discussionMap.values()).map(d => d.student_id)));
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, username, avatar_url')
        .in('id', studentProfileIds);

      // Créer les discussions avec compteurs de messages non lus
      const discussionsWithUnread: PrivateDiscussion[] = [];

      for (const discussion of discussionMap.values()) {
        // Compter les messages non lus pour cette discussion privée
        const { data: unreadCount } = await supabase.rpc('get_unread_messages_count', {
          p_formation_id: formationId,
          p_lesson_id: discussion.lesson_id,
          p_student_id: discussion.student_id,
          p_teacher_id: user.id
        });

        const studentProfile = profiles?.find(p => p.id === discussion.student_id);

        discussionsWithUnread.push({
          student_id: discussion.student_id,
          lesson_id: discussion.lesson_id,
          lesson_title: discussion.lesson_title,
          student_profile: studentProfile || null,
          unread_count: unreadCount || 0,
          last_message_time: discussion.last_message_time,
          last_message_content: discussion.last_message_content
        });
      }

      // Trier par messages non lus puis par heure du dernier message
      const sortedDiscussions = discussionsWithUnread.sort((a, b) => {
        if (a.unread_count !== b.unread_count) {
          return b.unread_count - a.unread_count;
        }
        return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
      });

      console.log('Private discussions found:', sortedDiscussions.length);
      return sortedDiscussions;
    },
    enabled: !!formationId && !!user?.id,
    refetchInterval: 3000,
  });
};