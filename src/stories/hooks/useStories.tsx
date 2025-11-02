
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Story {
  id: string;
  user_id: string;
  content_type: 'text' | 'image' | 'video' | 'audio';
  content_text?: string;
  media_url?: string;
  background_color?: string;
  description?: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
  profiles?: {
    id: string;
    first_name?: string;
    last_name?: string;
    username?: string;
    avatar_url?: string;
    is_verified?: boolean;
  };
  story_views?: Array<{
    viewer_id: string;
    viewed_at: string;
  }>;
}

export const useStories = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['stories'],
    queryFn: async () => {
      
      
      const { data, error } = await supabase
        .from('user_stories')
        .select(`
          *,
          profiles!user_stories_user_id_fkey (
            id,
            first_name,
            last_name,
            username,
            avatar_url,
            is_verified
          ),
          story_views (
            viewer_id,
            viewed_at
          )
        `)
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching stories:', error);
        return [];
      }

      console.log('Stories fetched successfully:', data);

      // Filtrer et typer correctement les données
      return (data || []).filter(story => story.profiles).map(story => ({
        ...story,
        profiles: story.profiles
      })) as Story[];
    },
    enabled: !!user,
  });
};

export const useCreateStory = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      content_type,
      content_text,
      media_url,
      background_color = '#25d366',
      description
    }: {
      content_type: 'text' | 'image' | 'video' | 'audio';
      content_text?: string;
      media_url?: string;
      background_color?: string;
      description?: string;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_stories')
        .insert({
          user_id: user.id,
          content_type,
          content_text,
          media_url,
          background_color,
          description
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });
};

export const useMarkStoryAsViewed = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ storyId, storyUserId }: { storyId: string; storyUserId: string }) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Ne pas comptabiliser la vue de sa propre story
      if (user.id === storyUserId) {
        console.log('⏭️ Skipping view recording: own story');
        return null;
      }

      console.log('📝 Recording view for story:', storyId, 'by user:', user.id);

      const { data, error } = await supabase
        .from('story_views')
        .insert({
          story_id: storyId,
          viewer_id: user.id
        })
        .select();

      if (error) {
        if (error.message.includes('duplicate key')) {
          console.log('ℹ️ View already recorded for this story');
          return null;
        }
        console.error('❌ Error recording view:', error);
        throw error;
      }

      console.log('✅ View recorded successfully:', data);
      return data;
    },
    onSuccess: (data) => {
      // Ne rafraîchir que si une vue a réellement été enregistrée
      if (data) {
        console.log('🔄 Refreshing stories after view recorded');
        queryClient.invalidateQueries({ queryKey: ['stories'] });
      }
    },
  });
};

export const useUpdateStory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      storyId,
      content_text,
      background_color,
      description
    }: {
      storyId: string;
      content_text?: string;
      background_color?: string;
      description?: string;
    }) => {
      const { data, error } = await supabase
        .from('user_stories')
        .update({
          content_text,
          background_color,
          description
        })
        .eq('id', storyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });
};

export const useDeleteStory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (storyId: string) => {
      const { error } = await supabase
        .from('user_stories')
        .delete()
        .eq('id', storyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });
};
