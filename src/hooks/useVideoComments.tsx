import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useEffect } from 'react';
import { NotificationTriggers } from '@/utils/notificationHelpers';

// Fonction pour mettre à jour le champ comments_count dans la table `videos` (compte tous les commentaires + réponses)
const updateCommentsCount = async (videoId: string) => {
  const { count, error: countError } = await supabase
    .from('video_comments')
    .select('*', { count: 'exact', head: true })
    .eq('video_id', videoId); // Compte TOUS les commentaires (principaux + réponses)

  if (countError) {
    console.error('Erreur comptage commentaires :', countError);
    return;
  }

  const { error: updateError } = await supabase
    .from('videos')
    .update({ comments_count: count })
    .eq('id', videoId);

  if (updateError) {
    console.error('Erreur mise à jour comments_count :', updateError);
  }
};

export const useVideoComments = (videoId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 🔁 Récupère tous les commentaires (avec profils et réponses)
  const { data: comments = [], isLoading: isCommentsLoading } = useQuery({
    queryKey: ['video-comments', videoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('video_comments')
        .select(`
          *,
          profiles!video_comments_user_id_fkey(
            id,
            username,
            first_name,
            last_name,
            avatar_url
          ),
          replies:video_comments!parent_comment_id(
            *,
            profiles!video_comments_user_id_fkey(
              id,
              username,
              first_name,
              last_name,
              avatar_url
            )
          )
        `)
        .eq('video_id', videoId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur récupération commentaires :', error);
        return [];
      }

      return data || [];
    },
    enabled: !!videoId,
  });

  // 🔢 Récupère dynamiquement le compteur de commentaires (tous les commentaires + réponses)
  const {
    data: commentsCount = 0,
    isLoading: isCountLoading,
  } = useQuery({
    queryKey: ['video-comments-count', videoId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('video_comments')
        .select('*', { count: 'exact' })
        .eq('video_id', videoId); // Compte TOUS les commentaires (principaux + réponses)

      if (error) {
        console.error('Erreur comptage commentaires :', error);
        return 0;
      }

      return count ?? 0;
    },
    enabled: !!videoId,
  });

  // ✍️ Mutation pour ajouter un commentaire
  const addCommentMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      if (!user?.id) throw new Error('Utilisateur non connecté');

      const { data, error } = await supabase
        .from('video_comments')
        .insert({
          video_id: videoId,
          user_id: user.id,
          content,
          parent_comment_id: parentId || null,
        })
        .select(`
          *,
          profiles!video_comments_user_id_fkey(
            id,
            username,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      // Récupérer l'auteur de la vidéo et créer la notification
      const { data: video } = await supabase
        .from('videos')
        .select('author_id, title')
        .eq('id', videoId)
        .single();

      if (video && video.author_id !== user.id) {
        // Récupérer le nom du commentateur
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, username')
          .eq('id', user.id)
          .single();

        const commenterName = profile?.first_name && profile?.last_name 
          ? `${profile.first_name} ${profile.last_name}`
          : profile?.username || 'Un utilisateur';

        // Créer la notification en base de données
        await supabase.from('notifications').insert({
          user_id: video.author_id,
          sender_id: user.id,
          title: '💬 Nouveau commentaire !',
          message: `${commenterName} a commenté votre vidéo${video.title ? ` "${video.title}"` : ''}`,
          type: 'video_reaction',
          video_id: videoId,
          reaction_type: 'comment',
          is_read: false,
          is_for_all_admins: false
        });

        // Envoyer aussi la push notification
        try {
          await NotificationTriggers.onVideoCommented(videoId, user.id, commenterName);
        } catch (notifError) {
          console.error('Erreur push notification:', notifError);
        }
      }

      // Met à jour le champ comments_count (pour tous les commentaires, y compris les réponses)
      await updateCommentsCount(videoId);

      return data;
    },
    onSuccess: () => {
      // ✅ Invalide ET refetch manuellement pour affichage immédiat
      queryClient.invalidateQueries({ queryKey: ['video-comments', videoId] });
      queryClient.invalidateQueries({ queryKey: ['video-comments-count', videoId] });
      queryClient.refetchQueries({ queryKey: ['video-comments-count', videoId] });
    },
    onError: (error) => {
      console.error('Erreur ajout commentaire :', error);
    },
  });

  // Fonction utilisable depuis les composants
  const addComment = async (content: string, parentId?: string): Promise<boolean> => {
    try {
      await addCommentMutation.mutateAsync({ content, parentId });
      return true;
    } catch (error) {
      console.error('Échec ajout commentaire :', error);
      return false;
    }
  };

 

  return {
    comments,
    commentsCount,
    isLoading: isCommentsLoading || isCountLoading,
    addComment,
    isSubmitting: addCommentMutation.isPending,
  };
};
