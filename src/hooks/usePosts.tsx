
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PostMedia {
  id: string;
  post_id: string;
  file_url: string;
  file_type: string;
  order_index: number;
  created_at: string;
}

interface Post {
  id: string;
  content: string;
  post_type: 'recruitment' | 'info' | 'annonce' | 'formation' | 'religion' | 'general';
  author_id: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  image_url?: string;
  media?: PostMedia[];
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

// Combiner les données (profils)
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

// Charger les médias associés aux posts
const postIds = posts.map(p => p.id);
const { data: media, error: mediaError } = await supabase
  .from('post_media')
  .select('id, post_id, file_url, file_type, order_index, created_at')
  .in('post_id', postIds)
  .order('order_index', { ascending: true });

if (mediaError) {
  console.error('Error fetching post media:', mediaError);
}

const mediaByPost = (media || []).reduce((acc: Record<string, PostMedia[]>, m) => {
  (acc[m.post_id] ||= []).push(m as PostMedia);
  return acc;
}, {} as Record<string, PostMedia[]>);

const postsWithProfilesAndMedia = postsWithProfiles.map((p: any) => ({
  ...p,
  media: mediaByPost[p.id] || []
}));


return postsWithProfilesAndMedia;
    },
  });
};

export const useCreatePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
mutationFn: async ({ 
      content, 
      postType, 
      imageFiles, 
      authorId 
    }: {
      content: string;
      postType: 'recruitment' | 'info' | 'annonce' | 'formation' | 'religion' | 'general';
      imageFiles?: File[] | null;
      authorId: string;
    }) => {
      console.log('Creating post with data:', { content, postType, authorId });
      
const uploadedUrls: string[] = [];
const uploadedTypes: string[] = [];

// Upload des images si présentes (multi-fichiers)
if (imageFiles && imageFiles.length > 0) {
  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    const fileExt = file.name.split('.').pop();
    const fileName = `${authorId}/${Date.now()}-${i}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('post-images')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      throw new Error("Erreur lors de l'upload d'une image");
    }

    const { data: { publicUrl } } = supabase.storage
      .from('post-images')
      .getPublicUrl(fileName);

    uploadedUrls.push(publicUrl);
    uploadedTypes.push(file.type || 'image');
  }
}

const firstImageUrl = uploadedUrls[0] || null;

// Création du post avec tous les champs requis
      const postData = {
        content: content.trim(),
        post_type: postType,
        author_id: authorId,
        image_url: firstImageUrl,
        is_active: true,
        likes_count: 0,
        comments_count: 0
      };

      

      const { data, error } = await supabase
        .from('posts')
        .insert([postData])
        .select()
        .single();

      if (error) {
        console.error('Error creating post:', error);
        throw error;
      }

      // Insérer les médias liés si présents
      if (data && uploadedUrls.length > 0) {
        const rows = uploadedUrls.map((url, idx) => ({
          post_id: data.id,
          file_url: url,
          file_type: uploadedTypes[idx] || 'image',
          order_index: idx
        }));
        const { error: mediaInsertError } = await supabase
          .from('post_media')
          .insert(rows);
        if (mediaInsertError) {
          
          // On ne bloque pas la création du post si l'insertion des médias échoue
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Post créé avec succès !');
    },
    onError: (error: any) => {
      console.error('Error creating post:', error);
      toast.error(`Erreur lors de la création du post: ${error?.message || 'Action non autorisée ou session expirée'}`);
    }
  });
};

export const useUpdatePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      postId, 
      content, 
      postType,
      imageFile,
      imageFiles,
      removedMediaIds,
      removeImage
    }: {
      postId: string;
      content: string;
      postType: 'recruitment' | 'info' | 'annonce' | 'formation' | 'religion' | 'general';
      imageFile?: File | null;
      imageFiles?: File[] | null;
      removedMediaIds?: string[];
      removeImage?: boolean;
    }) => {
      // Gestion des uploads (single ou multiple)
      const uploadedUrls: string[] = [];
      const uploadedTypes: string[] = [];

      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData.user?.id || '';

      if (Array.isArray(imageFiles) && imageFiles.length > 0) {
        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          const fileExt = file.name.split('.').pop();
          const fileName = `${currentUserId || 'user'}/${Date.now()}-${i}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from('post-images')
            .upload(fileName, file);
          if (uploadError) {
            console.error('Error uploading image:', uploadError);
            throw new Error("Erreur lors de l'upload d'une image");
          }
          const { data: { publicUrl } } = supabase.storage
            .from('post-images')
            .getPublicUrl(fileName);
          uploadedUrls.push(publicUrl);
          uploadedTypes.push(file.type || 'image');
        }
      } else if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${currentUserId || 'user'}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(fileName, imageFile);
        if (uploadError) {
          console.error('Error uploading new image:', uploadError);
          throw new Error("Erreur lors de l'upload de la nouvelle image");
        }
        const { data: { publicUrl } } = supabase.storage
          .from('post-images')
          .getPublicUrl(fileName);
        uploadedUrls.push(publicUrl);
        uploadedTypes.push(imageFile.type || 'image');
      }

      // Suppression des médias sélectionnés
      if (removedMediaIds && removedMediaIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('post_media')
          .delete()
          .in('id', removedMediaIds);
        if (deleteError) {
          console.error('Error deleting selected media:', deleteError);
        }
      }

      // Déterminer la mise à jour de l'image principale (fallback)
      let imageUrlUpdate: string | null | undefined = undefined;
      if (uploadedUrls.length > 0) {
        imageUrlUpdate = uploadedUrls[0];
      } else if (removeImage) {
        imageUrlUpdate = null;
      }

      const updateData: any = {
        content: content.trim(),
        post_type: postType,
        updated_at: new Date().toISOString(),
      };
      if (imageUrlUpdate !== undefined) {
        updateData.image_url = imageUrlUpdate;
      }

      const { data, error } = await supabase
        .from('posts')
        .update(updateData)
        .eq('id', postId)
        .select()
        .single();

      if (error) {
        console.error('Error updating post:', error);
        throw error;
      }

      // Insérer les nouveaux médias si présents (en respectant l'ordre)
      if (uploadedUrls.length > 0) {
        const { data: existingMax } = await supabase
          .from('post_media')
          .select('order_index')
          .eq('post_id', postId)
          .order('order_index', { ascending: false })
          .limit(1);

        const startIndex = (existingMax && existingMax[0]?.order_index + 1) || 0;

        const rows = uploadedUrls.map((url, idx) => ({
          post_id: postId,
          file_url: url,
          file_type: uploadedTypes[idx] || 'image',
          order_index: startIndex + idx
        }));

        const { error: mediaInsertError } = await supabase
          .from('post_media')
          .insert(rows);
        if (mediaInsertError) {
          console.error('Error inserting post media:', mediaInsertError);
          // Ne pas bloquer la mise à jour du post si l'insertion échoue
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Post modifié avec succès !');
    },
    onError: (error: any) => {
      console.error('Error updating post:', error);
      toast.error(`Erreur lors de la modification du post: ${error?.message || 'Action non autorisée'}`);
    }
  });
};

export const useDeletePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      // Renforce RLS: l'auteur doit être le propriétaire
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData.user?.id;

      const { error } = await supabase
        .from('posts')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', postId)
        .eq('author_id', currentUserId || '');

      if (error) {
        console.error('Error deleting post:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Post supprimé avec succès !');
    },
    onError: (error: any) => {
      console.error('Error deleting post:', error);
      toast.error(`Erreur lors de la suppression du post: ${error?.message || 'Action non autorisée'}`);
    }
  });
};