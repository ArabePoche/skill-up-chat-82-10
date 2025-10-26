import React from 'react';
import { User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePostLikesDetails } from '@/posts/hooks/usePostLikesDetails';
import { Skeleton } from '@/components/ui/skeleton';

interface PostLikesModalProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal affichant la liste des utilisateurs qui ont aimé un post
 */
const PostLikesModal: React.FC<PostLikesModalProps> = ({ postId, isOpen, onClose }) => {
  const { data: likes, isLoading } = usePostLikesDetails(postId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">
            J'aime ({likes?.length || 0})
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-96 overflow-y-auto space-y-3">
          {isLoading ? (
            // Skeleton loading
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <Skeleton className="w-10 h-10 rounded-full bg-gray-700" />
                <Skeleton className="h-4 w-32 bg-gray-700" />
              </div>
            ))
          ) : likes && likes.length > 0 ? (
            likes.map((like: any) => (
              <div
                key={like.id}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage src={like.profiles?.avatar_url} />
                  <AvatarFallback className="bg-gray-700 text-white">
                    <User size={20} />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-white">
                    {like.profiles?.first_name || like.profiles?.username || 'Utilisateur'}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-400">
              Aucun j'aime pour le moment
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PostLikesModal;
