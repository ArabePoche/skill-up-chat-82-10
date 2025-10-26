import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { NotificationTriggers } from '@/utils/notificationHelpers';

export const usePostLikes = (postId: string, initialLikesCount: number = 0) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Vérifie si l'utilisateur a liké le post
  const { data: userLike } = useQuery({
    queryKey: ['post-like', postId, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('post_likes')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Erreur récupération like utilisateur :', error);
        return null;
      }

      return data;
    },
    enabled: !!user?.id && !!postId,
  });

  // Compte dynamique des likes
  const { data: likesCount = initialLikesCount } = useQuery({
    queryKey: ['post-likes-count', postId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      if (error) {
        console.error('Erreur comptage likes :', error);
        return initialLikesCount;
      }

      return count ?? initialLikesCount;
    },
    enabled: !!postId,
    refetchInterval: 3000,
  });

  // Fonction de mutation like/unlike
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Utilisateur non authentifié');

      if (userLike) {
        // Unlike
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Like
        const { error } = await supabase
          .from('post_likes')
          .insert({ post_id: postId, user_id: user.id });

        if (error) throw error;

        // Récupérer l'auteur du post et créer la notification
        const { data: post } = await supabase
          .from('posts')
          .select('author_id, content')
          .eq('id', postId)
          .single();

        if (post && post.author_id !== user.id) {
          // Récupérer le nom du liker
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, username')
            .eq('id', user.id)
            .single();

          const likerName = profile?.first_name && profile?.last_name 
            ? `${profile.first_name} ${profile.last_name}`
            : profile?.username || 'Un utilisateur';

          const preview = post.content?.substring(0, 50) || '';

          // Créer la notification en base de données
          await supabase.from('notifications').insert({
            user_id: post.author_id,
            sender_id: user.id,
            title: '❤️ Nouveau like !',
            message: `${likerName} a aimé votre post${preview ? ` "${preview}..."` : ''}`,
            type: 'post_reaction',
            post_id: postId,
            reaction_type: 'like',
            is_read: false,
            is_for_all_admins: false
          });

          // Envoyer aussi la push notification
          try {
            await NotificationTriggers.onPostLiked(postId, user.id, likerName);
          } catch (notifError) {
            console.error('Erreur push notification:', notifError);
          }
        }
      }

      // Mise à jour du champ likes_count dans la table posts
      await updateLikesCount(postId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-like', postId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['post-likes-count', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error) => {
      console.error('Erreur lors du toggle like :', error);
    },
  });

  return {
    isLiked: !!userLike,
    likesCount,
    toggleLike: likeMutation.mutate,
    isLoading: likeMutation.isPending,
  };
};

// Fonction utilitaire pour synchroniser le champ likes_count
const updateLikesCount = async (postId: string) => {
  const { count, error: countError } = await supabase
    .from('post_likes')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId);

  if (countError) {
    console.error('Erreur lors du comptage des likes :', countError);
    return;
  }

  const { error: updateError } = await supabase
    .from('posts')
    .update({ likes_count: count })
    .eq('id', postId);

  if (updateError) {
    console.error('Erreur lors de la mise à jour de likes_count :', updateError);
  }
};
