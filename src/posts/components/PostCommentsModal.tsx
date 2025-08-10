
import React, { useState, useRef } from 'react';
import { X, Send, User, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { usePostComments } from '../hooks/usePostComments';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import EmojiPicker from '@/components/EmojiPicker';

interface PostCommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  postTitle: string;
}

const PostCommentsModal: React.FC<PostCommentsModalProps> = ({
  isOpen,
  onClose,
  postId,
  postTitle
}) => {
  const [newComment, setNewComment] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { user } = useAuth();
  const { comments, isLoading, addComment, isSubmitting } = usePostComments(postId);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const success = await addComment(newComment);
    if (success) {
      setNewComment('');
      setShowEmojiPicker(false);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = newComment.slice(0, start) + emoji + newComment.slice(end);
      setNewComment(newText);
      
      // Restaurer le focus et la position du curseur
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      setNewComment(prev => prev + emoji);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-white text-lg font-semibold">Commentaires</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Liste des commentaires */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="text-center text-gray-400">Chargement...</div>
          ) : !Array.isArray(comments) || comments.length === 0 ? (
            <div className="text-center text-gray-400">Aucun commentaire pour le moment</div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="space-y-3">
                <div className="flex space-x-3">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={comment.profiles?.avatar_url} />
                    <AvatarFallback className="bg-gray-700 text-white">
                      <User size={16} />
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="bg-gray-800 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-1">
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
                      <p className="text-white text-sm">{comment.content}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Formulaire d'ajout de commentaire */}
        {user && (
          <form onSubmit={handleAddComment} className="p-4 border-t border-gray-800">
            <div className="flex space-x-3">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarImage src={user.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-gray-700 text-white">
                  <User size={16} />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Écrivez un commentaire..."
                  className="min-h-[80px] bg-gray-800 border-gray-600 text-white resize-none"
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
                      <Smile size={20} />
                    </Button>
                    <span className="text-xs text-gray-400">{newComment.length}/500</span>
                  </div>
                  <Button
                    type="submit"
                    disabled={!newComment.trim() || isSubmitting}
                    size="sm"
                    className="bg-edu-primary hover:bg-edu-primary/90"
                  >
                    <Send size={16} className="mr-2" />
                    {isSubmitting ? 'Envoi...' : 'Commenter'}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default PostCommentsModal;