
import React, { useState } from 'react';
import { Heart, MessageCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCommentLikes } from '@/hooks/useCommentLikes';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

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
    replies?: VideoCommentProps['comment'][];
  };
  onReply: (commentId: string, content: string) => Promise<boolean>;
  depth?: number;
}

const VideoComment: React.FC<VideoCommentProps> = ({ comment, onReply, depth = 0 }) => {
  const { user } = useAuth();
  const { isLiked, likesCount, toggleLike, isLoading } = useCommentLikes(comment.id, comment.likes_count);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const handleReplySubmit = async () => {
    if (!replyContent.trim()) return;
    
    setIsSubmittingReply(true);
    const success = await onReply(comment.id, replyContent);
    if (success) {
      setReplyContent('');
      setShowReplyForm(false);
    }
    setIsSubmittingReply(false);
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
    <div className={`flex flex-col space-y-3 ${depth > 0 ? 'ml-8 pl-4 border-l border-gray-600' : ''}`}>
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
              onClick={toggleLike}
              disabled={isLoading}
              className={`flex items-center space-x-1 transition-colors ${
                isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              <span className="text-xs">{likesCount}</span>
            </button>
            
            {depth < 2 && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="text-xs">Répondre</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Formulaire de réponse */}
      {showReplyForm && user && (
        <div className="flex items-start space-x-3 pl-11">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              {user.user_metadata?.first_name?.[0] || 'U'}
            </span>
          </div>
          <div className="flex-1 space-y-2">
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Écrivez votre réponse..."
              className="min-h-[60px] bg-gray-800 border-gray-600 text-white"
              maxLength={300}
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">{replyContent.length}/300</span>
              <div className="flex space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setShowReplyForm(false);
                    setReplyContent('');
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleReplySubmit}
                  disabled={!replyContent.trim() || isSubmittingReply}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmittingReply ? 'Envoi...' : 'Répondre'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Réponses */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-2">
          {comment.replies.map((reply) => (
            <VideoComment
              key={reply.id}
              comment={reply}
              onReply={onReply}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoComment;