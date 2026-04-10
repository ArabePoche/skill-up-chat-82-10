import React from 'react';
import { useFollow } from '@/friends/hooks/useFollow';

interface FollowButtonInlineProps {
  hostId: string;
}

const FollowButtonInline: React.FC<FollowButtonInlineProps> = ({ hostId }) => {
  const { friendshipStatus, sendRequest, cancelRequest, acceptRequest, removeFriend, isLoading } = useFollow(hostId);

  const label = friendshipStatus === 'friends'
    ? 'Abonné'
    : friendshipStatus === 'pending_sent'
    ? 'Envoyé'
    : 'Suivre';

  const colors = friendshipStatus === 'friends'
    ? 'bg-green-500/80 text-white'
    : friendshipStatus === 'pending_sent'
    ? 'bg-white/20 text-white'
    : 'bg-red-500 text-white';

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (friendshipStatus === 'friends') removeFriend();
    else if (friendshipStatus === 'pending_sent') cancelRequest();
    else if (friendshipStatus === 'pending_received') acceptRequest();
    else sendRequest();
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`ml-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold backdrop-blur-sm transition-colors ${colors} disabled:opacity-50`}
    >
      {label}
    </button>
  );
};

export default FollowButtonInline;