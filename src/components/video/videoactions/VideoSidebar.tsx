import React from 'react';
import TiktokVideoProfileButton from './TiktokVideoProfileButton';
import TiktokVideoLikeButton from './TiktokVideoLikeButton';
import TiktokVideoCommentButton from './TiktokVideoCommentButton';
import TiktokVideoShareButton from './TiktokVideoShareButton';
import TiktokVideoGiftButton from './TiktokVideoGiftButton';
import TiktokVideoSeriesButton from './TiktokVideoSeriesButton';
import TiktokVideoFormationButton from './TiktokVideoFormationButton';

interface Video {
  id: string;
  author_id: string;
  video_type?: string;
  formation_id?: string;
  profiles?: {
    first_name?: string;
    avatar_url?: string;
  };
}

interface VideoSidebarProps {
  video: Video;
  user: any;
  activeLiveStream?: { id: string } | null;
  friendshipStatus: 'none' | 'pending_sent' | 'pending_received' | 'friends';
  isFollowLoading: boolean;
  isLiked: boolean;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  showLikeBurst: boolean;
  seriesData?: any;
  onFollow: () => void;
  onProfileClick: () => void;
  onLike: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onCommentClick: () => void;
  onShareClick: () => void;
  onGiftClick: () => void;
  onSeriesClick: () => void;
  onFormationRedirect: () => void;
  formatCount: (count: number) => string;
}

const VideoSidebar: React.FC<VideoSidebarProps> = ({
  video,
  user,
  activeLiveStream,
  friendshipStatus,
  isFollowLoading,
  isLiked,
  likesCount,
  commentsCount,
  sharesCount,
  showLikeBurst,
  seriesData,
  onFollow,
  onProfileClick,
  onLike,
  onCommentClick,
  onShareClick,
  onGiftClick,
  onSeriesClick,
  onFormationRedirect,
  formatCount,
}) => {
  return (
    <div className="absolute right-3 bottom-20 flex flex-col items-center space-y-5 z-10">
      <TiktokVideoProfileButton
        authorProfile={video.profiles}
        activeLiveStream={activeLiveStream}
        friendshipStatus={friendshipStatus}
        isFollowLoading={isFollowLoading}
        onFollow={onFollow}
        onProfileClick={onProfileClick}
        isCurrentUser={user?.id === video.author_id}
      />

      <TiktokVideoLikeButton
        isLiked={isLiked}
        likesCount={likesCount}
        onLike={onLike}
        showLikeBurst={showLikeBurst}
        formatCount={formatCount}
      />

      <TiktokVideoCommentButton
        commentsCount={commentsCount}
        onCommentClick={onCommentClick}
        formatCount={formatCount}
      />

      <TiktokVideoShareButton
        onShareClick={onShareClick}
        sharesCount={sharesCount}
        formatCount={formatCount}
      />

      {user && user.id !== video.author_id && (
        <TiktokVideoGiftButton onGiftClick={onGiftClick} />
      )}

      {seriesData && (
        <TiktokVideoSeriesButton onSeriesClick={onSeriesClick} />
      )}

      {video.video_type === 'promo' && video.formation_id && (
        <TiktokVideoFormationButton onFormationRedirect={onFormationRedirect} />
      )}
    </div>
  );
};

export default VideoSidebar;
