
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Post {
  id: string;
  content: string;
  post_type: 'recruitment' | 'info' | 'annonce' | 'formation' | 'religion' | 'general';
  author_id: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  image_url?: string;
  profiles: {
    first_name: string;
    last_name: string;
    username: string;
    avatar_url: string;
  };
}

export const usePosts = (filter: 'all' | 'recruitment' | 'info' | 'annonce' | 'formation' | 'religion' = 'all') => {
  return useQuery({
    queryKey: ['posts', filter],
    queryFn: async () => {
      console.log('Fetching posts with filter:', filter);
      
      // Récupération des posts sans JOIN direct
      let query = supabase
        .from('posts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('post_type', filter);
      }

      const { data: posts, error: postsError } = await query;

      if (postsError) {
        console.error('Error fetching posts:', postsError);
        return [];
      }

      if (!posts || posts.length === 0) {
        console.log('No posts found');
        return [];
      }

      console.log('Posts fetched:', posts);

      // Récupération des profils séparément
      const authorIds = [...new Set(posts.map(post => post.author_id))];
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, username, avatar_url')
        .in('id', authorIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        // Retourner les posts sans les données de profil
        return posts.map(post => ({
          ...post,
          profiles: {
            first_name: 'Utilisateur',
            last_name: '',
            username: 'user',
            avatar_url: ''
          }
        }));
      }

      // Combiner les données
      const postsWithProfiles = posts.map(post => {
        const profile = profiles?.find(p => p.id === post.author_id);
        return {
          ...post,
          profiles: profile ? {
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            username: profile.username || '',
            avatar_url: profile.avatar_url || ''
          } : {
            first_name: 'Utilisateur',
            last_name: '',
            username: 'user',
            avatar_url: ''
          }
        };
      });

      console.log('Posts with profiles:', postsWithProfiles);
      return postsWithProfiles;
    },
  });
};

export const useCreatePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      content, 
      postType, 
      imageFile, 
      authorId 
    }: {
      content: string;
      postType: 'recruitment' | 'info' | 'annonce' | 'formation' | 'religion' | 'general';
      imageFile?: File | null;
      authorId: string;
    }) => {
      console.log('Creating post with data:', { content, postType, authorId });
      
      let imageUrl = null;

      // Upload de l'image si présente
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(fileName, imageFile);

        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          throw new Error('Erreur lors de l\'upload de l\'image');
        }

        const { data: { publicUrl } } = supabase.storage
          .from('post-images')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      // Création du post avec tous les champs requis
      const postData = {
        content: content.trim(),
        post_type: postType,
        author_id: authorId,
        image_url: imageUrl,
        is_active: true,
        likes_count: 0,
        comments_count: 0
      };

      console.log('Inserting post data:', postData);

      const { data, error } = await supabase
        .from('posts')
        .insert([postData])
        .select()
        .single();

      if (error) {
        console.error('Error creating post:', error);
        throw error;
      }

      console.log('Post created successfully:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Post créé avec succès !');
    },
    onError: (error) => {
      console.error('Error creating post:', error);
      toast.error('Erreur lors de la création du post');
    }
  });
};

export const useUpdatePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      postId, 
      content, 
      postType 
    }: {
      postId: string;
      content: string;
      postType: 'recruitment' | 'info' | 'annonce' | 'formation' | 'religion' | 'general';
    }) => {
      const { data, error } = await supabase
        .from('posts')
        .update({
          content: content.trim(),
          post_type: postType,
        })
        .eq('id', postId)
        .select()
        .single();

      if (error) {
        console.error('Error updating post:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Post modifié avec succès !');
    },
    onError: (error) => {
      console.error('Error updating post:', error);
      toast.error('Erreur lors de la modification du post');
    }
  });
};

export const useDeletePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('posts')
        .update({ is_active: false })
        .eq('id', postId);

      if (error) {
        console.error('Error deleting post:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Post supprimé avec succès !');
    },
    onError: (error) => {
      console.error('Error deleting post:', error);
      toast.error('Erreur lors de la suppression du post');
    }
  });
};