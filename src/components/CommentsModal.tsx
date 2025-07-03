
import React, { useState, useEffect } from 'react';
import { X, Heart, Send, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  likes_count: number;
  profiles: {
    first_name?: string;
    last_name?: string;
    username?: string;
    avatar_url?: string;
  };
}

interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
}

const CommentsModal: React.FC<CommentsModalProps> = ({ isOpen, onClose, videoId }) => {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Charger les commentaires
  useEffect(() => {
    const loadComments = async () => {
      if (!isOpen || !videoId) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('video_comments')
          .select(`
            id,
            content,
            created_at,
            likes_count,
            profiles (
              first_name,
              last_name,
              username,
              avatar_url
            )
          `)
          .eq('video_id', videoId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setComments(data || []);
      } catch (error) {
        console.error('Error loading comments:', error);
        toast.error('Erreur lors du chargement des commentaires');
      } finally {
        setIsLoading(false);
      }
    };

    loadComments();
  }, [isOpen, videoId]);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user) return;
    
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('video_comments')
        .insert({
          video_id: videoId,
          user_id: user.id,
          content: newComment.trim()
        })
        .select(`
          id,
          content,
          created_at,
          likes_count,
          profiles (
            first_name,
            last_name,
            username,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;
      
      // Ajouter le nouveau commentaire en haut de la liste
      setComments(prev => [data, ...prev]);
      setNewComment('');
      toast.success('Commentaire publié');
    } catch (error) {
      console.error('Error submitting comment:', error);
      toast.error('Erreur lors de la publication du commentaire');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (dateString: string) => {
    const now = new Date();
    const commentDate = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - commentDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'À l\'instant';
    if (diffInHours < 24) return `${diffInHours}h`;
    return `${Math.floor(diffInHours / 24)}j`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md h-[80vh] p-0 bg-white text-gray-900 border-gray-200 sm:rounded-t-2xl sm:rounded-b-none">
        {/* En-tête */}
        <DialogHeader className="p-4 border-b border-gray-200 flex flex-row items-center justify-between">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <DialogTitle className="text-center flex-1 font-semibold">
            {comments.length} commentaire{comments.length !== 1 ? 's' : ''}
          </DialogTitle>
          <div className="w-9"></div> {/* Espaceur pour centrer le titre */}
        </DialogHeader>
        
        {/* Liste des commentaires */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucun commentaire pour le moment.
              <br />
              Soyez le premier à commenter !
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                    {comment.profiles?.avatar_url ? (
                      <img 
                        src={comment.profiles.avatar_url} 
                        alt="Avatar" 
                        className="w-8 h-8 rounded-full object-cover" 
                      />
                    ) : (
                      <span className="text-xs font-bold text-white">
                        {comment.profiles?.first_name?.[0] || comment.profiles?.username?.[0] || 'U'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-sm text-gray-900">
                        {comment.profiles?.first_name || comment.profiles?.username || 'Utilisateur'}
                      </span>
                      <span className="text-xs text-gray-500">{formatTime(comment.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-800 mb-2 break-words">{comment.content}</p>
                    <div className="flex items-center space-x-4">
                      <button className="flex items-center space-x-1 text-xs text-gray-500 hover:text-red-500 transition-colors">
                        <Heart className="w-3 h-3" />
                        <span>{comment.likes_count || 0}</span>
                      </button>
                      <button className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
                        Répondre
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Zone de saisie */}
        <div className="p-4 border-t border-gray-200 bg-white">
          {user ? (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-white">
                  {user.user_metadata?.first_name?.[0] || 'U'}
                </span>
              </div>
              <div className="flex-1 flex items-center space-x-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Ajouter un commentaire..."
                  className="flex-1 bg-gray-100 text-gray-900 px-4 py-2 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  onKeyPress={(e) => e.key === 'Enter' && !isSubmitting && handleSubmitComment()}
                  disabled={isSubmitting}
                />
                <Button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isSubmitting}
                  size="sm"
                  className="bg-blue-500 hover:bg-blue-600 rounded-full p-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500 mb-2">Connectez-vous pour commenter</p>
              <Button onClick={onClose} variant="outline" size="sm">
                Se connecter
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommentsModal;
