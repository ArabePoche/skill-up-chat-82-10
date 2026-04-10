import React from 'react';
import { Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TiktokVideoProfileButtonProps {
  authorProfile?: {
    first_name?: string;
    avatar_url?: string;
  };
  activeLiveStream?: { id: string } | null;
  friendshipStatus: 'none' | 'pending_sent' | 'pending_received' | 'friends';
  isFollowLoading: boolean;
  onFollow: () => void;
  onProfileClick: () => void;
  isCurrentUser: boolean;
}

const TiktokVideoProfileButton: React.FC<TiktokVideoProfileButtonProps> = ({
  authorProfile,
  activeLiveStream,
  friendshipStatus,
  isFollowLoading,
  onFollow,
  onProfileClick,
  isCurrentUser,
}) => {
  return (
    <div className="relative flex flex-col items-center">
      <div 
        className={`relative rounded-full cursor-pointer hover:opacity-90 transition-opacity ${activeLiveStream ? 'p-0.5 bg-gradient-to-tr from-pink-500 via-red-500 to-orange-500 animate-pulse' : ''}`}
        onClick={onProfileClick}
      >
        <Avatar 
          className={`w-12 h-12 border-[1.5px] border-white ${activeLiveStream ? 'border-2 border-black/80' : ''}`}
        >
          <AvatarImage src={authorProfile?.avatar_url} />
          <AvatarFallback className="bg-gray-600 text-white text-sm">
            {authorProfile?.first_name?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
      </div>
      
      {activeLiveStream ? (
        <Badge 
          className="absolute -bottom-2 z-10 border border-black/50 bg-red-600 text-white px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider cursor-pointer hover:bg-red-700 pointer-events-auto"
          onClick={onProfileClick}
        >
          LIVE
        </Badge>
      ) : friendshipStatus === 'none' && !isCurrentUser && (
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onFollow();
          }}
          disabled={isFollowLoading}
          size="sm"
          className="absolute -bottom-2 z-10 w-5 h-5 p-0 rounded-full text-xs font-bold bg-red-500 text-white hover:bg-red-600 border border-white"
        >
          <Plus size={12} />
        </Button>
      )}
    </div>
  );
};

export default TiktokVideoProfileButton;
