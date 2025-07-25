
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useUnreadMessagesBadge = (formationId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['unread-messages-badge', formationId, user?.id],
    queryFn: async () => {
      if (!user?.id || !formationId) return 0;

      // Vérifier si l'utilisateur est professeur via teacher_formations
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

      if (!teacherCheck) return 0;

      // Compter les messages non lus par ce professeur
      const { data: unreadMessages, error } = await supabase
        .from('lesson_messages')
        .select('id', { count: 'exact' })
        .eq('formation_id', formationId)
        .not('read_by_teachers', 'cs', `{${user.id}}`) // Messages non lus par ce prof
        .neq('sender_id', user.id); // Exclure ses propres messages

      if (error) {
        console.error('Error counting unread messages:', error);
        return 0;
      }

      return unreadMessages?.length || 0;
    },
    enabled: !!user?.id && !!formationId,
    refetchInterval: 10000, // Rafraîchir toutes les 10 secondes
  });
};
