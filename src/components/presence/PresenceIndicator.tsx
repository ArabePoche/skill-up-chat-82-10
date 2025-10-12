/**
 * Composant pour afficher un indicateur de présence (badge coloré)
 */
import React from 'react';
import { useUserOnlineStatus } from '@/hooks/useUserOnlineStatus';
import type { PresenceStatus } from '@/types/presence';

interface PresenceIndicatorProps {
  userId: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const statusColors: Record<PresenceStatus, string> = {
  online: 'bg-green-500',
  idle: 'bg-yellow-500',
  offline: 'bg-gray-400',
};

const statusLabels: Record<PresenceStatus, string> = {
  online: 'En ligne',
  idle: 'Inactif',
  offline: 'Hors ligne',
};

const sizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

export const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  userId,
  size = 'md',
  showLabel = false,
  className = '',
}) => {
  const status = useUserOnlineStatus(userId);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`rounded-full ${sizeClasses[size]} ${statusColors[status]} ring-2 ring-background`}
        title={statusLabels[status]}
      />
      {showLabel && (
        <span className="text-xs text-muted-foreground">
          {statusLabels[status]}
        </span>
      )}
    </div>
  );
};
