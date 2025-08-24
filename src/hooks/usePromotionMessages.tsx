
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsTeacherInFormation } from '@/hooks/useIsTeacherInFormation';

/**
 * Hook pour récupérer les messages d'une promotion spécifique
 * Les étudiants voient tous les messages de leur promotion
 */
export const usePromotionMessages = (lessonId: string | undefined, formationId: string | undefined) => {
  const { user } = useAuth();
  const { data: isTeacher = false } = useIsTeacherInFormation(formationId);

  return useQuery({
    queryKey: ['promotion-messages', lessonId, formationId, user?.id, isTeacher],
    queryFn: async () => {
      if (!lessonId || !formationId || !user?.id) return [];

      console.log('Fetching promotion messages for lesson:', lessonId, 'formation:', formationId, 'user:', user.id, 'isTeacher:', isTeacher);

      if (isTeacher) {
        // Si c'est un professeur dans cette formation, il voit tous les messages
        const { data: messages, error } = await supabase
          .from('lesson_messages')
          .select(`
            *,
            profiles!sender_id(
              id,
              first_name,
              last_name,
              username,
              avatar_url,
              is_teacher
            ),
            replied_to_message:replied_to_message_id(
              id,
              content,
              sender_id,
              profiles!sender_id(
                id,
                first_name,
                last_name,
                username
              )
            )
          `)
          .eq('lesson_id', lessonId)
          .eq('formation_id', formationId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching teacher messages:', error);
          return [];
        }

        console.log('Teacher messages found:', messages?.length || 0);
        return messages || [];
      } else {
        // Pour les étudiants : récupérer d'abord leur promotion
        const { data: userPromotion, error: promotionError } = await supabase
          .rpc('get_user_promotion_in_formation', {
            p_user_id: user.id,
            p_formation_id: formationId
          });

        if (promotionError) {
          console.error('Error fetching user promotion:', promotionError);
          return [];
        }

        console.log('User promotion:', userPromotion);

        // Si l'utilisateur n'a pas de promotion, utiliser l'ancienne logique (messages individuels)
        if (!userPromotion) {
          const { data: messages, error } = await supabase
            .from('lesson_messages')
            .select(`
              *,
              profiles!sender_id(
                id,
                first_name,
                last_name,
                username,
                avatar_url,
                is_teacher
              ),
              replied_to_message:replied_to_message_id(
                id,
                content,
                sender_id,
                profiles!sender_id(
                  id,
                  first_name,
                  last_name,
                  username
                )
              )
            `)
            .eq('lesson_id', lessonId)
            .eq('formation_id', formationId)
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id},is_system_message.eq.true`)
            .order('created_at', { ascending: true });

          if (error) {
            console.error('Error fetching individual student messages:', error);
            return [];
          }

          console.log('Individual student messages found:', messages?.length || 0);
          return messages || [];
        }

        // Si l'utilisateur a une promotion, récupérer tous les messages de sa promotion
        const { data: messages, error } = await supabase
          .from('lesson_messages')
          .select(`
            *,
            profiles!sender_id(
              id,
              first_name,
              last_name,
              username,
              avatar_url,
              is_teacher
            ),
            replied_to_message:replied_to_message_id(
              id,
              content,
              sender_id,
              profiles!sender_id(
                id,
                first_name,
                last_name,
                username
              )
            )
          `)
          .eq('lesson_id', lessonId)
          .eq('formation_id', formationId)
          .or(`promotion_id.eq.${userPromotion},sender_id.eq.${user.id},receiver_id.eq.${user.id},is_system_message.eq.true`)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching promotion messages:', error);
          return [];
        }

        console.log('Promotion messages found:', messages?.length || 0, 'for promotion:', userPromotion);
        return messages || [];
      }
    },
    enabled: !!lessonId && !!formationId && !!user?.id,
    refetchInterval: false,
  });
};
