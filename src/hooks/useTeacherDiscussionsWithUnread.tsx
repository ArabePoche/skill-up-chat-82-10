
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface StudentDiscussion {
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

const SYSTEM_USER_ID = '4c32c988-3b19-4eca-87cb-0e0595fd7fbb';

export const useTeacherDiscussionsWithUnread = (formationId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['teacher-discussions-with-unread', formationId, user?.id],
    queryFn: async (): Promise<StudentDiscussion[]> => {
      if (!formationId || !user?.id) return [];

      console.log('Fetching teacher discussions with unread counts for formation:', formationId);

      // Vérifier que l'utilisateur est bien professeur via teacher_formations
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
        .single();

      if (!teacherCheck) {
        console.error('User is not a teacher for this formation');
        return [];
      }

      // Récupérer tous les étudiants inscrits dans cette formation
      // MÊME s'ils sont professeurs dans d'autres formations
      const { data: enrolledStudents } = await supabase
        .from('enrollment_requests')
        .select('user_id')
        .eq('formation_id', formationId)
        .eq('status', 'approved');

      if (!enrolledStudents || enrolledStudents.length === 0) {
        console.log('No enrolled students found');
        return [];
      }

      const studentIds = enrolledStudents.map(e => e.user_id);

      // Exclure les professeurs de CETTE formation spécifique des discussions
      const { data: currentFormationTeachers } = await supabase
        .from('teachers')
        .select('user_id')
        .eq('formation_id', formationId);

      const currentFormationTeacherIds = currentFormationTeachers?.map(t => t.user_id) || [];
      
      // Filtrer pour exclure uniquement les profs de la formation courante
      const validStudentIds = studentIds.filter(id => !currentFormationTeacherIds.includes(id));

      if (validStudentIds.length === 0) {
        console.log('No valid students found after filtering teachers');
        return [];
      }

      // Récupérer toutes les discussions (combinaison unique student + lesson)
      // EXCLURE les messages du système
      const { data: discussions, error } = await supabase
        .from('lesson_messages')
        .select(`
          sender_id,
          lesson_id,
          created_at,
          content
        `)
        .eq('formation_id', formationId)
        .neq('sender_id', SYSTEM_USER_ID) // Exclure les messages système
        .in('sender_id', validStudentIds) // Inclure seulement les étudiants valides
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching discussions:', error);
        return [];
      }

      // Récupérer les informations des leçons séparément
      const lessonIds = [...new Set(discussions?.map(msg => msg.lesson_id) || [])];
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id, title')
        .in('id', lessonIds);

      // Créer un map des leçons pour un accès rapide
      const lessonsMap = new Map(lessons?.map(lesson => [lesson.id, lesson]) || []);

      // Grouper par étudiant et leçon
      const discussionMap = new Map<string, {
        student_id: string;
        lesson_id: string;
        lesson_title: string;
        last_message_time: string;
        last_message_content: string;
      }>();

      discussions?.forEach(msg => {
        const key = `${msg.sender_id}-${msg.lesson_id}`;
        if (!discussionMap.has(key)) {
          const lesson = lessonsMap.get(msg.lesson_id);
          discussionMap.set(key, {
            student_id: msg.sender_id,
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

      // Récupérer les compteurs de messages non lus pour chaque discussion
      const discussionsWithUnread: StudentDiscussion[] = [];

      for (const discussion of discussionMap.values()) {
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

      // Trier par messages non lus (décroissant) puis par heure du dernier message (décroissant)
      const sortedDiscussions = discussionsWithUnread.sort((a, b) => {
        if (a.unread_count !== b.unread_count) {
          return b.unread_count - a.unread_count; // Messages non lus en priorité
        }
        return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
      });

      console.log('Final sorted discussions (including teacher-students from other formations):', sortedDiscussions);
      return sortedDiscussions;
    },
    enabled: !!formationId && !!user?.id,
    refetchInterval: 5000, // Actualiser toutes les 5 secondes
  });
};
