import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, User, Heart, MessageCircle, MoreVertical, Flag } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useVideoComments } from '@/hooks/useVideoComments';
import VideoCommentItem from '@/components/VideoCommentItem';

interface VideoCommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  videoTitle?: string;
}

const VideoCommentsModal: React.FC<VideoCommentsModalProps> = ({
  isOpen,
  onClose,
  videoId,
  videoTitle
}) => {
  const { user } = useAuth();
  const { comments, isLoading, isSubmitting, addComment } = useVideoComments(videoId);
  const [newComment, setNewComment] = useState('');

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const success = await addComment(newComment);
    if (success) {
      setNewComment('');
    }
  };

  const handleReply = async (parentCommentId: string, content: string) => {
    return await addComment(content, parentCommentId);
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col bg-white border-gray-200 shadow-2xl">
        <DialogHeader className="border-b border-gray-100 pb-4">
          <DialogTitle className="flex items-center gap-3 text-gray-900">
            <div className="p-2 bg-blue-50 rounded-lg">
              <MessageCircle size={20} className="text-blue-600" />
            </div>
            <div>
              <span className="text-lg font-semibold">Commentaires</span>
              {videoTitle && (
                <p className="text-sm text-gray-500 font-normal mt-1 line-clamp-1">{videoTitle}</p>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Zone de commentaires */}
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-sm text-gray-500">Chargement des commentaires...</p>
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <MessageCircle size={24} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun commentaire</h3>
                <p className="text-sm text-gray-500">Soyez le premier à partager votre avis !</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {comments.length} commentaire{comments.length > 1 ? 's' : ''}
                  </span>
                </div>
                
                {comments.map((comment) => (
                  <VideoCommentItem
                    key={comment.id}
                    comment={comment}
                    onReply={handleReply}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Formulaire de commentaire */}
          {user ? (
            <div className="border-t border-gray-100 pt-4 bg-gray-50/50">
              <form onSubmit={handleSubmitComment} className="space-y-4">
                <div className="flex space-x-3">
                  <Avatar className="w-10 h-10 ring-2 ring-white shadow-sm">
                    <AvatarImage src={user.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      <User size={16} />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Que pensez-vous de cette vidéo ?"
                      className="min-h-[80px] resize-none border-gray-200 focus:border-blue-300 focus:ring-blue-200 bg-white"
                      maxLength={500}
                    />
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-xs text-gray-400">
                        {newComment.length}/500 caractères
                      </span>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setNewComment('')}
                          disabled={!newComment.trim() || isSubmitting}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          Annuler
                        </Button>
                        <Button
                          type="submit"
                          disabled={!newComment.trim() || isSubmitting}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                        >
                          {isSubmitting ? (
                            <>
                              <div className="animate-spin rounded-full w-4 h-4 border-b-2 border-white mr-2"></div>
                              Envoi...
                            </>
                          ) : (
                            <>
                              <Send size={14} className="mr-2" />
                              Publier
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            <div className="text-center py-6 border-t border-gray-100 bg-gray-50/50">
              <div className="bg-white rounded-lg p-6 mx-4 shadow-sm border border-gray-200">
                <User size={32} className="mx-auto text-gray-400 mb-3" />
                <h3 className="font-medium text-gray-900 mb-2">Connectez-vous pour commenter</h3>
                <p className="text-sm text-gray-500">
                  Rejoignez la conversation et partagez votre avis sur cette vidéo
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoCommentsModal;