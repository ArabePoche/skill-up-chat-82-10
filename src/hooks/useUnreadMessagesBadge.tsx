
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useUnreadMessagesBadge = (formationId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['unread-messages-badge', formationId, user?.id],
    queryFn: async () => {
      if (!user?.id || !formationId) return 0;

      // Utiliser la RPC dédiée pour appliquer exactement la même logique
      // que les autres compteurs de non lus côté professeur.
      const { data: unreadCount, error } = await supabase.rpc('get_formation_unread_count', {
        p_formation_id: formationId,
        p_teacher_id: user.id,
      });

      if (error) {
        console.error('Error counting unread messages via RPC, falling back:', error);

        // Fallback défensif si la RPC n'est pas disponible dans l'environnement.
        const { data: fallbackTeacherCheck } = await supabase
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

        if (!fallbackTeacherCheck) return 0;

        const { count: fallbackCount, error: fallbackError } = await supabase
          .from('lesson_messages')
          .select('id', { count: 'exact', head: true })
          .eq('formation_id', formationId)
          .is('read_by_teachers', null)
          .neq('sender_id', user.id)
          .eq('is_system_message', false);

        if (fallbackError) {
          console.error('Error counting unread messages (fallback):', fallbackError);
          return 0;
        }

        return fallbackCount || 0;
      }

      return unreadCount || 0;
    },
    enabled: !!user?.id && !!formationId,
    refetchInterval: 10000, // Rafraîchir toutes les 10 secondes
  });
};
