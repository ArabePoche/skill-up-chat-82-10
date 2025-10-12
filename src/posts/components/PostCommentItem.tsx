import React, { useState } from 'react';
import { MessageCircle, Trash2, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CommentProfile {
  id: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  replies_count?: number;
  profiles?: CommentProfile;
  replies?: Comment[];
}

interface PostCommentItemProps {
  comment: Comment;
  currentUserId?: string;
  onDelete: (commentId: string) => void;
  onReply: (content: string, parentCommentId: string) => Promise<boolean>;
  replies?: Comment[];
  level?: number;
}

const PostCommentItem: React.FC<PostCommentItemProps> = ({
  comment,
  currentUserId,
  onDelete,
  onReply,
  replies = [],
  level = 0,
}) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReplies, setShowReplies] = useState(false);

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    setIsSubmitting(true);
    const success = await onReply(replyContent, comment.id);
    if (success) {
      setReplyContent('');
      setShowReplyForm(false);
      setShowReplies(true);
    }
    setIsSubmitting(false);
  };

  const maxLevel = 3; // Limite la profondeur des réponses

  return (
    <div className={`flex space-x-3 group ${level > 0 ? 'ml-8 mt-3' : ''}`}>
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarImage src={comment.profiles?.avatar_url} />
        <AvatarFallback className="bg-gray-700 text-white">
          <User size={14} />
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1">
        <div className="bg-gray-800 rounded-lg p-3 relative">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-white text-sm">
                {comment.profiles?.first_name || comment.profiles?.username || 'Utilisateur'}
              </span>
              <span className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(comment.created_at), {
                  addSuffix: true,
                  locale: fr
                })}
              </span>
            </div>
            {currentUserId === comment.user_id && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(comment.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto text-red-400 hover:text-red-300"
              >
                <Trash2 size={14} />
              </Button>
            )}
          </div>
          <p className="text-white text-sm">{comment.content}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-4 mt-1 ml-2">
          {level < maxLevel && currentUserId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="text-gray-400 hover:text-white hover:bg-gray-800/50 p-0 h-auto text-xs"
            >
              <MessageCircle size={12} className="mr-1" />
              Répondre
            </Button>
          )}
          {replies.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReplies(!showReplies)}
              className="text-gray-400 hover:text-white hover:bg-gray-800/50 p-0 h-auto text-xs"
            >
              {showReplies ? 'Masquer' : 'Voir'} {replies.length} réponse{replies.length > 1 ? 's' : ''}
            </Button>
          )}
        </div>

        {/* Formulaire de réponse */}
        {showReplyForm && (
          <form onSubmit={handleReplySubmit} className="mt-3">
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Écrire une réponse..."
              className="min-h-[60px] bg-gray-800 border-gray-600 text-white resize-none text-sm"
              maxLength={500}
              autoFocus
            />
            <div className="flex justify-end space-x-2 mt-2">
              <Button
                type="button"
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
                type="submit"
                disabled={!replyContent.trim() || isSubmitting}
                size="sm"
                className="bg-edu-primary hover:bg-edu-primary/90"
              >
                {isSubmitting ? 'Envoi...' : 'Répondre'}
              </Button>
            </div>
          </form>
        )}

        {/* Réponses imbriquées */}
        {showReplies && replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {replies.map((reply) => (
              <PostCommentItem
                key={reply.id}
                comment={reply}
                currentUserId={currentUserId}
                onDelete={onDelete}
                onReply={onReply}
                replies={reply.replies || []}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PostCommentItem;
