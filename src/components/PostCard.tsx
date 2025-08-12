
import React, { useState } from 'react';
import { Heart, MessageCircle, Share, MoreHorizontal, User, Edit, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { useDeletePost } from '@/hooks/usePosts';
import PostComments from '@/components/PostComments';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PostCardProps {
  post: any;
  onEdit?: (post: any) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onEdit }) => {
  const { user } = useAuth();
  const deletePost = useDeletePost();
  const [localCommentsCount, setLocalCommentsCount] = useState(post.comments_count || 0);

  const isAuthor = user?.id === post.author_id;

  const handleDelete = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce post ?')) {
      await deletePost.mutateAsync(post.id);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(post);
    }
  };

  const renderPostType = (type: string) => {
    const types = {
      recruitment: { label: 'Recrutement', color: 'bg-blue-600' },
      info: { label: 'Info', color: 'bg-green-600' },
      annonce: { label: 'Annonce', color: 'bg-yellow-600' },
      formation: { label: 'Formation', color: 'bg-purple-600' },
      religion: { label: 'Religion', color: 'bg-orange-600' },
      general: { label: 'Général', color: 'bg-gray-600' }
    };
    
    const typeInfo = types[type as keyof typeof types] || types.general;
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${typeInfo.color}`}>
        {typeInfo.label}
      </span>
    );
  };

  const renderMedia = () => {
    if (post.media && post.media.length > 0) {
      return (
        <div className="mt-3 grid gap-2 rounded-lg overflow-hidden">
          {post.media.length === 1 ? (
            <img
              src={post.media[0].file_url}
              alt="Post media"
              className="w-full h-auto max-h-96 object-cover"
            />
          ) : (
            <div className={`grid gap-2 ${post.media.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
              {post.media.slice(0, 4).map((media: any, index: number) => (
                <div key={media.id} className="relative">
                  <img
                    src={media.file_url}
                    alt={`Media ${index + 1}`}
                    className="w-full h-32 object-cover"
                  />
                  {index === 3 && post.media.length > 4 && (
                    <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                      <span className="text-white font-semibold">+{post.media.length - 4}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (post.image_url) {
      return (
        <div className="mt-3">
          <img
            src={post.image_url}
            alt="Post image"
            className="w-full h-auto max-h-96 object-cover rounded-lg"
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4 mb-4 border border-gray-800">
      {/* En-tête du post */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={post.profiles?.avatar_url} />
            <AvatarFallback className="bg-gray-700 text-white">
              <User size={20} />
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-white">
                {post.profiles?.first_name || post.profiles?.username || 'Utilisateur'}
              </span>
              {renderPostType(post.post_type)}
            </div>
            <span className="text-sm text-gray-400">
              {formatDistanceToNow(new Date(post.created_at), {
                addSuffix: true,
                locale: fr
              })}
            </span>
          </div>
        </div>

        {/* Menu d'options pour l'auteur */}
        {isAuthor && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                <MoreHorizontal size={20} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-gray-800 border-gray-700">
              <DropdownMenuItem onClick={handleEdit} className="text-white hover:bg-gray-700">
                <Edit size={16} className="mr-2" />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-red-400 hover:bg-gray-700">
                <Trash2 size={16} className="mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Contenu du post */}
      <div className="text-white mb-3">
        <p className="whitespace-pre-wrap">{post.content}</p>
      </div>

      {/* Médias */}
      {renderMedia()}

      {/* Actions du post */}
      <div className="flex items-center space-x-6 mt-4 pt-3 border-t border-gray-800">
        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-red-400">
          <Heart size={18} className="mr-2" />
          {post.likes_count || 0}
        </Button>
        
        <div className="text-gray-400 flex items-center">
          <MessageCircle size={18} className="mr-2" />
          {localCommentsCount}
        </div>
        
        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-blue-400">
          <Share size={18} className="mr-2" />
          Partager
        </Button>
      </div>

      {/* Section des commentaires intégrée */}
      <PostComments 
        postId={post.id} 
        commentsCount={localCommentsCount}
        onCommentsCountChange={setLocalCommentsCount}
      />
    </div>
  );
};

export default PostCard;
