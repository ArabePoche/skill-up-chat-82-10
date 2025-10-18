import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsTeacherInFormation } from '@/hooks/useIsTeacherInFormation';
import { getUsersProgressMap, getCurrentUserProgress } from '@/utils/progressionUtils';

/**
 * Hook unifié pour récupérer les messages d'une leçon
 * Gère à la fois les messages de promotion et individuels
 */
export const useLessonMessages = (lessonId: string | undefined, formationId: string | undefined) => {
  const { user } = useAuth();
  const { data: isTeacher = false } = useIsTeacherInFormation(formationId);

  return useQuery({
    queryKey: ['lesson-messages', lessonId, formationId, user?.id, isTeacher],
    queryFn: async () => {
      if (!lessonId || !formationId || !user?.id) return [];

      console.log('Fetching lesson messages for:', { lessonId, formationId, userId: user.id, isTeacher });

      // Les professeurs voient tous les messages
      if (isTeacher) {
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
      }

      // Pour les étudiants : vérifier d'abord leur promotion
      const { data: userPromotion, error: promotionError } = await supabase
        .rpc('get_user_promotion_in_formation', {
          p_user_id: user.id,
          p_formation_id: formationId
        });

      if (promotionError) {
        console.error('Error fetching user promotion:', promotionError);
        return [];
      }

      

      // Si pas de promotion : messages individuels uniquement
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
          console.error('Error fetching individual messages:', error);
          return [];
        }

        console.log('Individual messages found:', messages?.length || 0);
        return messages || [];
      }

      // Messages de promotion : logique de filtrage par niveau
      
      // 1. Récupérer la progression actuelle de l'utilisateur
      const currentUserProgress = await getCurrentUserProgress(user.id, formationId);
      
      // 2. Récupérer tous les messages de la promotion
      const { data: allMessages, error } = await supabase
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
        .or(`promotion_id.eq.${userPromotion},is_system_message.eq.true,sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching promotion messages:', error);
        return [];
      }

      if (!allMessages || allMessages.length === 0) {
        console.log('No messages found');
        return [];
      }

      // 3. Récupérer les progressions de tous les utilisateurs qui ont envoyé des messages
      const senderIds = [...new Set(allMessages.map(m => m.sender_id).filter(Boolean))] as string[];
      const userProgressMap = await getUsersProgressMap(senderIds);

      // 4. Filtrer les messages selon les règles
      const filteredMessages = allMessages.filter(message => {
        // Messages système : toujours visibles
        if (message.is_system_message) return true;
        
        // Ses propres messages : toujours visibles
        if (message.sender_id === user.id) return true;
        
        // Messages qui lui sont adressés : toujours visibles
        if (message.receiver_id === user.id) return true;
        
        // Messages dans lesquels on lui fait un reply : toujours visibles
        if (message.replied_to_message_id) {
          const replyTarget = allMessages.find(m => m.id === message.replied_to_message_id);
          if (replyTarget?.sender_id === user.id) return true;
        }
        
        // Messages des professeurs : toujours visibles pour les élèves
        if (message.profiles?.is_teacher) return true;
        
        // Messages des autres élèves : seulement si leur niveau est inférieur ou égal
        const senderProgress = userProgressMap.get(message.sender_id);
        if (senderProgress) {
          return senderProgress.levelOrder < currentUserProgress.levelOrder || 
                 (senderProgress.levelOrder === currentUserProgress.levelOrder && 
                  senderProgress.lessonOrder <= currentUserProgress.lessonOrder);
        }
        
        // Par défaut, ne pas afficher
        return false;
      });

      console.log('Filtered messages:', {
        total: allMessages.length,
        filtered: filteredMessages.length,
        currentUserProgress,
        senderCount: senderIds.length
      });

      return filteredMessages;
    },
    enabled: !!lessonId && !!formationId && !!user?.id,
    refetchInterval: 5000, // Rafraîchir toutes les 5 secondes
  });
};