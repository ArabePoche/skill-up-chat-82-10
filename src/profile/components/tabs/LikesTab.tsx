import React, { useState } from 'react';
import { Heart, Video, FileText } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserLikedPosts } from '@/profile/hooks/useUserLikedPosts';
import { useUserLikedVideos } from '@/profile/hooks/useUserLikedVideos';
import PostCard from '@/components/PostCard';
import { useNavigate } from 'react-router-dom';

type LikeType = 'videos' | 'posts';

const LikesTab: React.FC = () => {
  const [likeType, setLikeType] = useState<LikeType>('posts');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: likedPosts, isLoading: isLoadingPosts } = useUserLikedPosts(user?.id);
  const { data: likedVideos, isLoading: isLoadingVideos } = useUserLikedVideos(user?.id);

  const renderContent = () => {
    if (likeType === 'videos') {
      if (isLoadingVideos) {
        return (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Chargement...</div>
          </div>
        );
      }

      if (!likedVideos || likedVideos.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/20 flex items-center justify-center mb-4">
              <Heart size={32} className="text-red-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Aucun like</h3>
            <p className="text-sm text-muted-foreground">
              Les vidéos que vous aimez apparaîtront ici
            </p>
          </div>
        );
      }

      return (
        <div className="grid grid-cols-2 gap-2 p-4">
          {likedVideos.map((lesson: any) => (
            <div
              key={lesson.id}
              onClick={() => navigate(`/formations/${lesson.levels.formation_id}/lessons/${lesson.id}`)}
              className="relative aspect-video rounded-lg overflow-hidden cursor-pointer group"
            >
              <img
                src={lesson.levels.formations.thumbnail_url || '/placeholder.svg'}
                alt={lesson.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
                <div className="text-white text-xs font-medium line-clamp-2">
                  {lesson.title}
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (isLoadingPosts) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Chargement...</div>
        </div>
      );
    }

    if (!likedPosts || likedPosts.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/20 flex items-center justify-center mb-4">
            <Heart size={32} className="text-red-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Aucun like</h3>
          <p className="text-sm text-muted-foreground">
            Les posts que vous aimez apparaîtront ici
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4 p-4">
        {likedPosts.map((post: any) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    );
  };

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex items-center border-b border-border">
        <button
          onClick={() => setLikeType('videos')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative ${
            likeType === 'videos' 
              ? 'text-foreground' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Video size={16} />
          <span>Vidéos</span>
          {likeType === 'videos' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
        <button
          onClick={() => setLikeType('posts')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative ${
            likeType === 'posts' 
              ? 'text-foreground' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText size={16} />
          <span>Posts</span>
          {likeType === 'posts' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
};

export default LikesTab;
