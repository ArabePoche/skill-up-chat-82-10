
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Story {
  id: string;
  user_id: string;
  content_type: 'text' | 'image' | 'video';
  content_text?: string;
  media_url?: string;
  background_color?: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
  profiles?: {
    id: string;
    first_name?: string;
    last_name?: string;
    username?: string;
    avatar_url?: string;
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
            avatar_url
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
      background_color = '#25d366'
    }: {
      content_type: 'text' | 'image' | 'video';
      content_text?: string;
      media_url?: string;
      background_color?: string;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_stories')
        .insert({
          user_id: user.id,
          content_type,
          content_text,
          media_url,
          background_color
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
    mutationFn: async (storyId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('story_views')
        .insert({
          story_id: storyId,
          viewer_id: user.id
        });

      if (error && !error.message.includes('duplicate key')) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });
};
