
import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Heart, Reply, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCommentLikes } from '@/hooks/useCommentLikes';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import VideoCommentReplies from '@/components/video/VideoCommentReplies';

interface VideoCommentItemProps {
  comment: any;
  onReply: (parentCommentId: string, content: string) => Promise<boolean>;
  level?: number;
}

const VideoCommentItem: React.FC<VideoCommentItemProps> = ({ comment, onReply, level = 0 }) => {
  const { user } = useAuth();
  const { isLiked, likesCount, toggleLike } = useCommentLikes(comment.id, comment.likes_count);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  const displayName = comment.profiles?.first_name 
    ? `${comment.profiles.first_name} ${comment.profiles.last_name || ''}`.trim()
    : comment.profiles?.username || 'Utilisateur';

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    setIsReplying(true);
    const success = await onReply(comment.id, replyContent);
    if (success) {
      setReplyContent('');
      setShowReplyForm(false);
    }
    setIsReplying(false);
  };

  const timeAgo = formatDistanceToNow(new Date(comment.created_at), {
    addSuffix: true,
    locale: fr
  });

  const isTopLevel = level === 0;

  return (
    <div className="space-y-3">
      <div className="flex space-x-3">
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={comment.profiles?.avatar_url} />
          <AvatarFallback className="bg-gray-700 text-white">
            <User size={16} />
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="bg-gray-800 rounded-2xl p-3">
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-medium text-white text-sm truncate">{displayName}</span>
              <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo}</span>
            </div>
            <p className="text-white text-sm leading-relaxed break-words">{comment.content}</p>
          </div>
          
          <div className="flex items-center space-x-4 mt-2">
            <button
              onClick={toggleLike}
              className={`flex items-center space-x-1 text-xs transition-colors ${
                isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
              }`}
            >
              <Heart size={14} className={isLiked ? 'fill-current' : ''} />
              <span>{likesCount > 0 ? likesCount : ''}</span>
            </button>
            
            {user && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="flex items-center space-x-1 text-xs text-gray-400 hover:text-blue-500 transition-colors"
              >
                <Reply size={14} />
                <span>Répondre</span>
              </button>
            )}
          </div>

          {showReplyForm && (
            <form onSubmit={handleReply} className="mt-3">
              <div className="flex space-x-2">
                <Avatar className="w-6 h-6 flex-shrink-0">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-gray-700 text-white">
                    <User size={12} />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <Textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Écrivez votre réponse..."
                    className="min-h-[60px] text-sm bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 resize-none"
                    maxLength={300}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-400">{replyContent.length}/300</span>
                    <div className="space-x-2 flex-shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowReplyForm(false)}
                        className="text-xs h-7 px-2 text-gray-400 hover:text-white"
                      >
                        Annuler
                      </Button>
                      <Button
                        type="submit"
                        disabled={!replyContent.trim() || isReplying}
                        size="sm"
                        className="text-xs h-7 px-2 bg-blue-600 hover:bg-blue-700"
                      >
                        {isReplying ? 'Envoi...' : 'Répondre'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Affichage des réponses pour les commentaires de niveau supérieur uniquement */}
      {isTopLevel && comment.replies && comment.replies.length > 0 && (
        <VideoCommentReplies
          replies={comment.replies}
          onReply={onReply}
          parentCommentId={comment.id}
          rootCommentId={comment.id}
        />
      )}
    </div>
  );
};

export default VideoCommentItem;