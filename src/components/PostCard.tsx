
import React, { useState } from 'react';
import { Heart, MessageCircle, Share, MoreHorizontal, User, Briefcase, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import VideoShareModal from './video/VideoShareModal';

interface PostCardProps {
  post: {
    id: string;
    content: string;
    post_type: 'recruitment' | 'info' | 'general';
    author_id: string;
    created_at: string;
    likes_count: number;
    comments_count: number;
    image_url?: string;
    profiles: {
      first_name: string;
      last_name: string;
      username: string;
      avatar_url: string;
    };
  };
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [showShare, setShowShare] = useState(false);
  const { user } = useAuth();

  const getPostTypeIcon = (type: string) => {
    switch (type) {
      case 'recruitment':
        return <Briefcase size={16} className="text-blue-400" />;
      case 'info':
        return <Info size={16} className="text-green-400" />;
      default:
        return <MessageCircle size={16} className="text-gray-400" />;
    }
  };

  const getPostTypeLabel = (type: string) => {
    switch (type) {
      case 'recruitment':
        return 'Recrutement';
      case 'info':
        return 'Information';
      default:
        return 'Général';
    }
  };

  const getPostTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'recruitment':
        return 'bg-blue-900/50 text-blue-400 border-blue-700';
      case 'info':
        return 'bg-green-900/50 text-green-400 border-green-700';
      default:
        return 'bg-gray-900/50 text-gray-400 border-gray-700';
    }
  };

  const handleLike = () => {
    if (!user) return;
    
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
    
    // TODO: Implémenter l'API pour les likes des posts
  };

  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: fr
  });

  const authorName = `${post.profiles.first_name} ${post.profiles.last_name}`.trim() || post.profiles.username || 'Utilisateur';

  return (
    <div id={`post-${post.id}`} className="bg-gray-900 rounded-lg p-4 border border-gray-800">
      {/* Header du post */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
            {post.profiles.avatar_url ? (
              <img 
                src={post.profiles.avatar_url} 
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={20} className="text-gray-400" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-white font-medium text-sm">{authorName}</span>
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs border ${getPostTypeBadgeColor(post.post_type)}`}>
                {getPostTypeIcon(post.post_type)}
                <span>{getPostTypeLabel(post.post_type)}</span>
              </div>
            </div>
            <span className="text-gray-400 text-xs">{timeAgo}</span>
          </div>
        </div>
        
        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
          <MoreHorizontal size={16} />
        </Button>
      </div>

      {/* Contenu du post */}
      <div className="mb-3">
        <p className="text-white leading-relaxed whitespace-pre-wrap">{post.content}</p>
        
        {post.image_url && (
          <div className="mt-3 rounded-lg overflow-hidden">
            <img 
              src={post.image_url} 
              alt="Image du post"
              className="w-full h-auto object-cover max-h-96"
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-800">
        <div className="flex items-center space-x-6">
          <button 
            onClick={handleLike}
            className={`flex items-center space-x-2 transition-colors ${
              isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
            }`}
          >
            <Heart size={20} className={isLiked ? 'fill-current' : ''} />
            <span className="text-sm">{likesCount}</span>
          </button>
          
          <button className="flex items-center space-x-2 text-gray-400 hover:text-blue-500 transition-colors">
            <MessageCircle size={20} />
            <span className="text-sm">{post.comments_count}</span>
          </button>
          
          <button onClick={() => setShowShare(true)} className="flex items-center space-x-2 text-gray-400 hover:text-green-500 transition-colors">
            <Share size={20} />
            <span className="text-sm">Partager</span>
          </button>
        </div>
      </div>

      <VideoShareModal
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        url={`${window.location.origin}/post/${post.id}`}
        title={`Post de ${authorName}`}
        description={post.content.slice(0, 140)}
      />
    </div>
  );
};

export default PostCard;