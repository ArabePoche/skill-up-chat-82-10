import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface UserProfileData {
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
  const [isFollowing, setIsFollowing] = React.useState(false);

  const handleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFollowing(!isFollowing);
    toast.success(isFollowing ? 'Désabonné' : 'Abonné !');
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
        {showFollowButton && (
          <Button
            onClick={handleFollow}
            size="sm"
            className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full text-xs font-bold ${
              isFollowing 
                ? 'bg-gray-500 text-white' 
                : 'bg-red-500 text-white hover:bg-red-600'
            }`}
          >
            {isFollowing ? '✓' : <Plus size={12} />}
          </Button>
        )}
      </div>
    </div>
  );
};

export default VideoUserProfile;
