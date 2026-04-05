import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Check } from 'lucide-react';
import { useFollow } from '@/friends/hooks/useFollow';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import VerifiedBadge from '@/components/VerifiedBadge';

interface UserProfileData {
  id?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  avatar_url?: string;
  is_verified?: boolean;
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
  const navigate = useNavigate();
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

  // Poll for active live
  const { data: activeLiveStream } = useQuery({
    queryKey: ['active-live-stream', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_live_streams')
        .select('id')
        .eq('host_id', profile?.id!)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!profile?.id && !isOwnProfile, // Do not show for myself strictly needed
    refetchInterval: 30000, // Check every 30 seconds
  });

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
      return 'Abonné';
    } else if (friendshipStatus === 'pending_sent') {
      return 'En attente';
    } else if (friendshipStatus === 'pending_received') {
      return 'Suivre';
    } else {
      return 'Suivre';
    }
  };

  const getButtonColor = () => {
    if (friendshipStatus === 'friends') {
      return 'bg-green-500 text-white hover:bg-green-600';
    } else if (friendshipStatus === 'pending_sent') {
      return 'bg-yellow-500 text-white hover:bg-yellow-600';
    } else if (friendshipStatus === 'pending_received') {
      return 'bg-red-500 text-white hover:bg-red-600';
    } else {
      return 'bg-red-500 text-white hover:bg-red-600';
    }
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative flex flex-col items-center">
        <div 
          className={`relative rounded-full cursor-pointer hover:opacity-90 transition-opacity ${activeLiveStream ? 'p-0.5 bg-gradient-to-tr from-pink-500 via-red-500 to-orange-500 animate-pulse' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (activeLiveStream) {
              navigate(`/live/${activeLiveStream.id}`);
            } else if (profile?.id) {
              navigate(`/profile/${profile.id}`);
            }
          }}
        >
          <Avatar 
            className={`w-12 h-12 border-[1.5px] border-white ${activeLiveStream ? 'border-2 border-black/80' : ''}`}
          >
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm">
              {profile?.first_name?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
        </div>

        {profile?.is_verified && !activeLiveStream && (
          <div className="absolute -bottom-1 -right-1 z-10">
            <VerifiedBadge size={16} showTooltip={false} />
          </div>
        )}
        
        {activeLiveStream ? (
          <Badge 
            className="absolute -bottom-2 z-10 border border-black/50 bg-red-600 text-white px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider cursor-pointer hover:bg-red-700 pointer-events-auto"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/live/${activeLiveStream.id}`);
            }}
          >
            LIVE
          </Badge>
        ) : showFollowButton && !isOwnProfile ? (
          <Button
            onClick={handleClick}
            disabled={isLoading}
            size="sm"
            className={`absolute -bottom-2 z-10 px-3 py-1 h-auto rounded-md text-xs font-medium border border-black/10 shadow-sm ${getButtonColor()}`}
          >
            {getButtonContent()}
          </Button>
        ) : null}
      </div>
    </div>
  );
};

export default VideoUserProfile;
