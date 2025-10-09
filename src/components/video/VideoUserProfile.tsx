import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Plus, Check } from 'lucide-react';
import { useFollow } from '@/hooks/useFollow';
import { useAuth } from '@/hooks/useAuth';

interface UserProfileData {
  id?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  avatar_url?: string;
}

interface VideoUserProfileProps {
  profile?: UserProfileData;
  showFollowButton?: boolean;
  className?: string;
}

const VideoUserProfile: React.FC<VideoUserProfileProps> = ({ 
  profile, 
  showFollowButton = false,
  className = ""
}) => {
  const { user } = useAuth();
  const isOwnProfile = user?.id === profile?.id;
  
  const { 
    friendshipStatus, 
    sendRequest, 
    acceptRequest, 
    cancelRequest, 
    removeFriend, 
    isLoading 
  } = useFollow(profile?.id);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (friendshipStatus === 'friends') {
      removeFriend();
    } else if (friendshipStatus === 'pending_sent') {
      cancelRequest();
    } else if (friendshipStatus === 'pending_received') {
      acceptRequest();
    } else {
      sendRequest();
    }
  };

  const getButtonContent = () => {
    if (friendshipStatus === 'friends') {
      return <Check size={12} />;
    } else if (friendshipStatus === 'pending_sent') {
      return '...';
    } else if (friendshipStatus === 'pending_received') {
      return '✓';
    } else {
      return <Plus size={12} />;
    }
  };

  const getButtonColor = () => {
    if (friendshipStatus === 'friends') {
      return 'bg-green-500 text-white';
    } else if (friendshipStatus === 'pending_sent') {
      return 'bg-yellow-500 text-white';
    } else {
      return 'bg-red-500 text-white hover:bg-red-600';
    }
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative">
        <Avatar className="w-12 h-12 border-2 border-white">
          <AvatarImage src={profile?.avatar_url} />
          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm">
            {profile?.first_name?.[0] || 'U'}
          </AvatarFallback>
        </Avatar>
        {showFollowButton && !isOwnProfile && (
          <Button
            onClick={handleClick}
            disabled={isLoading}
            size="sm"
            className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full text-xs font-bold ${getButtonColor()}`}
          >
            {getButtonContent()}
          </Button>
        )}
      </div>
    </div>
  );
};

export default VideoUserProfile;
