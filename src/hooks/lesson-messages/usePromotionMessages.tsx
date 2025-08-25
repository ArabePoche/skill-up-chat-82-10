
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getUsersProgressMap, getCurrentUserProgress } from '@/utils/progressionUtils';

/**
 * Hook pour récupérer les messages de promotion avec filtrage par niveau
 */
export const usePromotionMessages = (
  lessonId: string | undefined, 
  formationId: string | undefined, 
  promotionId: string
) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['promotion-messages', lessonId, formationId, user?.id, promotionId],
    queryFn: async () => {
      if (!lessonId || !formationId || !user?.id || !promotionId) return [];

      console.log('🔍 Fetching promotion messages:', { lessonId, formationId, userId: user.id, promotionId });

      // 1. Récupérer la progression actuelle de l'utilisateur
      const currentUserProgress = await getCurrentUserProgress(user.id, formationId);
      console.log('📊 Current user progress:', currentUserProgress);

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
        .or(`promotion_id.eq.${promotionId},is_system_message.eq.true,sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error fetching promotion messages:', error);
        return [];
      }

      if (!allMessages || allMessages.length === 0) {
        console.log('📭 No promotion messages found');
        return [];
      }

      console.log(`📬 Found ${allMessages.length} messages total`);

      // 3. Récupérer les progressions des utilisateurs qui ont envoyé des messages
      const senderIds = [...new Set(
        allMessages
          .map(m => m.sender_id)
          .filter(Boolean)
          .filter(id => id !== user.id) // Exclure l'utilisateur actuel
      )] as string[];

      console.log('👥 Sender IDs to check progress for:', senderIds);

      // Passer formationId à getUsersProgressMap pour filtrer correctement
      const userProgressMap = senderIds.length > 0 ? await getUsersProgressMap(senderIds) : new Map();
      console.log('🎯 User progress map:', Object.fromEntries(userProgressMap));

      // 4. Filtrer les messages selon les règles de promotion
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
            // Si on ne trouve pas de progression, on considère que l'élève est au niveau 0
            // et donc visible par tous
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

      return filteredMessages;
    },
    enabled: !!lessonId && !!formationId && !!user?.id && !!promotionId,
    refetchInterval: false,
  });
};
