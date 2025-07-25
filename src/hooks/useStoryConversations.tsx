
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useStoryConversations = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['story-conversations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('story_conversations')
        .select(`
          id,
          story_id,
          participant1_id,
          participant2_id,
          last_message_at,
          user_stories:story_id (
            content_text,
            media_url,
            content_type
          ),
          participant1:participant1_id (
            first_name,
            last_name,
            username,
            avatar_url
          ),
          participant2:participant2_id (
            first_name,
            last_name,
            username,
            avatar_url
          )
        `)
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('Error fetching story conversations:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id,
  });
};

export const useStoryMessages = (conversationId: string) => {
  return useQuery({
    queryKey: ['story-messages', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('story_messages')
        .select(`
          *,
          sender:sender_id (
            first_name,
            last_name,
            username,
            avatar_url
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching story messages:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!conversationId,
  });
};

export const useSendStoryMessage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      conversationId, 
      content 
    }: { 
      conversationId: string; 
      content: string; 
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('story_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content
        })
        .select()
        .single();

      if (error) throw error;

      // Mettre à jour last_message_at
      await supabase
        .from('story_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['story-messages', variables.conversationId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['story-conversations'] 
      });
    },
  });
};
