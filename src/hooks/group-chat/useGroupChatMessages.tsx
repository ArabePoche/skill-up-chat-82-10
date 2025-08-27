
/**
 * Hook pour récupérer les messages en mode groupe avec logique de niveau
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getCurrentUserProgress, getUsersProgressMap } from '@/utils/progressionUtils';

export interface GroupMessage {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  message_type: string;
  file_url?: string;
  file_type?: string;
  file_name?: string;
  is_system_message?: boolean;
  exercise_id?: string;
  exercise_status?: string;
  is_exercise_submission?: boolean;
  replied_to_message_id?: string;
  promotion_id?: string;
  lesson_id?: string;
  formation_id: string;
  profiles?: {
    id: string;
    first_name?: string;
    last_name?: string;
    username?: string;
    avatar_url?: string;
    is_teacher?: boolean;
  };
  replied_to_message?: any;
}

export const useGroupChatMessages = (
  levelId: string | undefined,
  formationId: string | undefined,
  promotionId: string | undefined
) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['group-chat-messages', levelId, formationId, promotionId, user?.id],
    queryFn: async (): Promise<GroupMessage[]> => {
      if (!levelId || !formationId || !promotionId || !user?.id) return [];

      console.log('🔍 Fetching group chat messages:', { levelId, formationId, promotionId, userId: user.id });

      // 1. Récupérer la progression actuelle de l'utilisateur
      const currentUserProgress = await getCurrentUserProgress(user.id, formationId);
      console.log('📊 Current user progress:', currentUserProgress);

      // 2. Récupérer toutes les leçons du niveau pour construire les lesson_ids
      const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('id')
        .eq('level_id', levelId)
        .order('order_index', { ascending: true });

      if (lessonsError) {
        console.error('Error fetching lessons:', lessonsError);
        return [];
      }

      const lessonIds = lessons?.map(l => l.id) || [];
      console.log('📚 Lessons in level:', lessonIds);

      if (lessonIds.length === 0) return [];

      // 3. Récupérer tous les messages liés aux leçons de ce niveau
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
        .eq('formation_id', formationId)
        .in('lesson_id', lessonIds)
        .or(`promotion_id.eq.${promotionId},is_system_message.eq.true,sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching group messages:', error);
        return [];
      }

      if (!allMessages || allMessages.length === 0) {
        console.log('📭 No messages found for this level');
        return [];
      }

      console.log(`📬 Found ${allMessages.length} messages total`);

      // 4. Récupérer les progressions des utilisateurs qui ont envoyé des messages
      const senderIds = [...new Set(
        allMessages
          .map(m => m.sender_id)
          .filter(Boolean)
          .filter(id => id !== user.id) // Exclure l'utilisateur actuel
      )] as string[];

      console.log('👥 Sender IDs to check progress for:', senderIds);

      const userProgressMap = senderIds.length > 0 ? await getUsersProgressMap(senderIds) : new Map();
      console.log('🎯 User progress map:', Object.fromEntries(userProgressMap));

      // 5. Filtrer les messages selon les règles de groupe
      const filteredMessages = allMessages.filter(message => {
        console.log(`\n🔍 Analyzing message ${message.id}:`);
        console.log(`   - Sender: ${message.sender_id}`);
        console.log(`   - Is system: ${message.is_system_message}`);
        console.log(`   - Receiver: ${message.receiver_id}`);
        console.log(`   - Promotion ID: ${message.promotion_id}`);
        console.log(`   - Is teacher: ${message.profiles?.is_teacher}`);

        // Messages système : toujours visibles
        if (message.is_system_message) {
          console.log('✅ System message -> VISIBLE');
          return true;
        }
        
        // Ses propres messages : toujours visibles
        if (message.sender_id === user.id) {
          console.log('✅ Own message -> VISIBLE');
          return true;
        }
        
        // Messages qui lui sont adressés : toujours visibles
        if (message.receiver_id === user.id) {
          console.log('✅ Message addressed to user -> VISIBLE');
          return true;
        }
        
        // Messages dans lesquels on lui fait un reply : toujours visibles
        if (message.replied_to_message_id) {
          const replyTarget = allMessages.find(m => m.id === message.replied_to_message_id);
          if (replyTarget?.sender_id === user.id) {
            console.log('✅ Reply to user message -> VISIBLE');
            return true;
          }
        }
        
        // Messages des professeurs : toujours visibles pour les élèves
        if (message.profiles?.is_teacher) {
          console.log('✅ Teacher message -> VISIBLE');
          return true;
        }
        
        // Messages des autres élèves de la même promotion
        if (message.promotion_id === promotionId && message.sender_id !== user.id) {
          console.log(`🎓 Classmate message from promotion ${promotionId}`);
          
          // Vérifier la progression de l'expéditeur
          const senderProgress = userProgressMap.get(message.sender_id);
          
          if (!senderProgress) {
            console.log('⚠️ No progress found for sender -> Assuming level 0 -> VISIBLE');
            return true;
          }
          
          const isVisible = senderProgress.levelOrder < currentUserProgress.levelOrder || 
                 (senderProgress.levelOrder === currentUserProgress.levelOrder && 
                  senderProgress.lessonOrder <= currentUserProgress.lessonOrder);
          
          console.log(`📈 Progress comparison:`, {
            senderProgress,
            currentUserProgress,
            isVisible: isVisible ? '✅ VISIBLE' : '❌ HIDDEN'
          });
          
          return isVisible;
        }
        
        console.log('❌ Message filtered out (no matching criteria)');
        return false;
      });

      console.log(`\n📊 Final result:`, {
        totalMessages: allMessages.length,
        filteredMessages: filteredMessages.length,
        currentUserProgress,
        senderCount: senderIds.length,
        promotionId
      });

      return filteredMessages as GroupMessage[];
    },
    enabled: !!levelId && !!formationId && !!promotionId && !!user?.id,
    refetchInterval: false,
  });
};
