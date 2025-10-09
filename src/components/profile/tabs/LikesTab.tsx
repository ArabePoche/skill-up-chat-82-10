import React, { useState } from 'react';
import { Heart, Video, FileText } from 'lucide-react';

type LikeType = 'videos' | 'posts';

const LikesTab: React.FC = () => {
  const [likeType, setLikeType] = useState<LikeType>('videos');

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
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/20 flex items-center justify-center mb-4">
          <Heart size={32} className="text-red-500" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Aucun like</h3>
        <p className="text-sm text-muted-foreground">
          Les {likeType === 'videos' ? 'vidéos' : 'posts'} que vous aimez apparaîtront ici
        </p>
      </div>
    </div>
  );
};

export default LikesTab;
