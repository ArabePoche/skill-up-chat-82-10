
import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, MoreHorizontal } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VideoCommentProps {
  comment: {
    id: string;
    content: string;
    likes_count: number;
    created_at: string;
    profiles?: {
      first_name?: string;
      last_name?: string;
      username?: string;
      avatar_url?: string;
    };
  };
  onReply: (commentId: string) => void;
}

const VideoComment: React.FC<VideoCommentProps> = ({ comment, onReply }) => {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(comment.likes_count);
  const [isLiking, setIsLiking] = useState(false);

  // Vérifier si l'utilisateur a déjà liké ce commentaire
  useEffect(() => {
    const checkIfLiked = async () => {
      if (!user) return;

      try {
        const { data } = await supabase
          .from('video_comment_likes')
          .select('id')
          .eq('comment_id', comment.id)
          .eq('user_id', user.id)
          .maybeSingle();

        setIsLiked(!!data);
      } catch (error) {
        console.error('Error checking like status:', error);
      }
    };

    checkIfLiked();
  }, [user, comment.id]);

  const handleLike = async () => {
    if (!user) {
      toast.error('Connectez-vous pour liker ce commentaire');
      return;
    }

    if (isLiking) return;
    setIsLiking(true);

    try {
      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('video_comment_likes')
          .delete()
          .eq('comment_id', comment.id)
          .eq('user_id', user.id);

        if (error) throw error;
        
        setLikesCount(prev => Math.max(0, prev - 1));
        setIsLiked(false);
        toast.success('Like retiré');
      } else {
        // Like
        const { error } = await supabase
          .from('video_comment_likes')
          .insert({ 
            comment_id: comment.id, 
            user_id: user.id 
          });

        if (error) throw error;
        
        setLikesCount(prev => prev + 1);
        setIsLiked(true);
        toast.success('Commentaire liké !');
      }
    } catch (error) {
      console.error('Error liking comment:', error);
      toast.error('Erreur lors du like');
    } finally {
      setIsLiking(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'À l\'instant';
    if (diffInHours < 24) return `${diffInHours}h`;
    return `${Math.floor(diffInHours / 24)}j`;
  };

  return (
    <div className="flex items-start space-x-3 py-3">
      {/* Avatar */}
      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
        {comment.profiles?.avatar_url ? (
          <img 
            src={comment.profiles.avatar_url} 
            alt="Avatar" 
            className="w-8 h-8 rounded-full object-cover" 
          />
        ) : (
          <span className="text-white text-xs font-bold">
            {comment.profiles?.first_name?.[0] || comment.profiles?.username?.[0] || 'U'}
          </span>
        )}
      </div>

      {/* Contenu du commentaire */}
      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-white font-medium text-sm">
            {comment.profiles?.first_name || comment.profiles?.username || 'Utilisateur'}
          </span>
          <span className="text-gray-400 text-xs">{formatTime(comment.created_at)}</span>
        </div>
        
        <p className="text-white text-sm mb-2">{comment.content}</p>
        
        {/* Actions */}
        <div className="flex items-center space-x-4">
          <button
            onClick={handleLike}
            disabled={isLiking}
            className={`flex items-center space-x-1 transition-colors ${
              isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
            } ${isLiking ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            <span className="text-xs">{likesCount}</span>
          </button>
          
          <button
            onClick={() => onReply(comment.id)}
            className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-xs">Répondre</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoComment;
