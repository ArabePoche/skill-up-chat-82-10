
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, User, Smile, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { usePostComments } from '../posts/hooks/usePostComments';
import EmojiPicker from '@/components/EmojiPicker';
import PostCommentItem from '../posts/components/PostCommentItem';

interface PostCommentsProps {
  postId: string;
  commentsCount: number;
  openTrigger?: number;
}

const PostComments: React.FC<PostCommentsProps> = ({
  postId,
  commentsCount,
  openTrigger,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { user } = useAuth();
  const { comments, isLoading, addComment, deleteComment, isSubmitting } = usePostComments(postId);

  // Ouvre la section quand un déclencheur externe change (clic sur "Commenter")
  useEffect(() => {
    if (openTrigger && openTrigger > 0) {
      setIsExpanded(true);
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [openTrigger]);

  // Organiser les commentaires hiérarchiquement de manière récursive
  const organizedComments = useMemo(() => {
    if (!Array.isArray(comments)) return [];
    
    const repliesMap = new Map<string, any[]>();
    
    // Grouper tous les commentaires par parent_comment_id
    comments.forEach(comment => {
      if (comment.parent_comment_id) {
        if (!repliesMap.has(comment.parent_comment_id)) {
          repliesMap.set(comment.parent_comment_id, []);
        }
        repliesMap.get(comment.parent_comment_id)?.push(comment);
      }
    });
    
    // Fonction récursive pour attacher les réponses
    const attachReplies = (comment: any): any => ({
      ...comment,
      replies: (repliesMap.get(comment.id) || []).map(attachReplies)
    });
    
    // Récupérer les commentaires de premier niveau et attacher récursivement leurs réponses
    const topLevelComments = comments.filter(c => !c.parent_comment_id);
    return topLevelComments.map(attachReplies);
  }, [comments]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const success = await addComment(newComment);
    if (success) {
      setNewComment('');
      setShowEmojiPicker(false);
    }
  };

  const handleReply = async (
    content: string, 
    parentCommentId: string,
    repliedToUserId?: string
  ): Promise<boolean> => {
    return await addComment(content, parentCommentId, repliedToUserId);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (window.confirm('Supprimer ce commentaire ?')) {
      await deleteComment(commentId);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = newComment.slice(0, start) + emoji + newComment.slice(end);
      setNewComment(newText);
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      setNewComment(prev => prev + emoji);
    }
  };

  return (
    <div className="border-t border-gray-800 mt-4">
      {/* Bouton pour afficher/masquer les commentaires */}
      <Button
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-gray-400 hover:text-white hover:bg-gray-800 active:bg-gray-700 py-3 justify-start"
      >
        <MessageCircle size={16} className="mr-2" />
        {commentsCount > 0 ? (
          isExpanded ? 'Masquer les commentaires' : `Voir les ${commentsCount} commentaires`
        ) : (
          'Commenter'
        )}
      </Button>

      {/* Section des commentaires dépliable */}
      {isExpanded && (
        <div className="px-4 pb-4">
          {/* Liste des commentaires */}
          <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="text-center text-gray-400 py-4">Chargement...</div>
            ) : organizedComments.length === 0 ? (
              <div className="text-center text-gray-400 py-4">Aucun commentaire pour le moment</div>
            ) : (
              organizedComments.map((comment) => (
                <PostCommentItem
                  key={comment.id}
                  comment={comment}
                  currentUserId={user?.id}
                  onDelete={handleDeleteComment}
                  onReply={handleReply}
                  replies={comment.replies}
                />
              ))
            )}
          </div>

          {/* Formulaire d'ajout de commentaire */}
          {user && (
            <form onSubmit={handleAddComment} className="mt-4">
              <div className="flex space-x-3">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={user.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-gray-700 text-white">
                    <User size={14} />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 relative">
                  <Textarea
                    ref={textareaRef}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Écrivez un commentaire..."
                    className="min-h-[60px] bg-gray-800 border-gray-600 text-white resize-none text-sm"
                    maxLength={500}
                  />
                  
                  {/* EmojiPicker */}
                  {showEmojiPicker && (
                    <div className="absolute bottom-full left-0 mb-2 z-10">
                      <EmojiPicker
                        onEmojiSelect={handleEmojiSelect}
                        isOpen={showEmojiPicker}
                        onToggle={() => setShowEmojiPicker(!showEmojiPicker)}
                      />
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center mt-2">
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="text-gray-400 hover:text-white p-1"
                      >
                        <Smile size={16} />
                      </Button>
                      <span className="text-xs text-gray-400">{newComment.length}/500</span>
                    </div>
                    <Button
                      type="submit"
                      disabled={!newComment.trim() || isSubmitting}
                      size="sm"
                      className="bg-edu-primary hover:bg-edu-primary/90"
                    >
                      <Send size={14} className="mr-1" />
                      {isSubmitting ? 'Envoi...' : 'Publier'}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default PostComments;