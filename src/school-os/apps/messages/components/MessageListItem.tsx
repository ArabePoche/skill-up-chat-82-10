/**
 * Item de liste de message style Gmail
 * Affiche : checkbox, étoile, expéditeur, sujet, aperçu, date, labels
 */
import React from 'react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, Paperclip } from 'lucide-react';
import { SchoolMessage, MessageLabel } from '../types';
import { formatDistanceToNow, format, isToday, isYesterday, isThisYear } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MessageListItemProps {
  message: SchoolMessage;
  labels: MessageLabel[];
  isSelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onClick: () => void;
  onStarToggle: (id: string) => void;
}

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'teacher':
      return '👨‍🏫';
    case 'parent':
      return '👪';
    case 'admin':
      return '🏫';
    case 'student':
      return '🎓';
    default:
      return '👤';
  }
};

const formatMessageDate = (dateStr: string) => {
  const date = new Date(dateStr);
  if (isToday(date)) {
    return format(date, 'HH:mm', { locale: fr });
  }
  if (isYesterday(date)) {
    return 'Hier';
  }
  if (isThisYear(date)) {
    return format(date, 'd MMM', { locale: fr });
  }
  return format(date, 'd MMM yyyy', { locale: fr });
};

const getLabelColor = (color: string) => {
  const colorMap: Record<string, string> = {
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    pink: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  };
  return colorMap[color] || 'bg-muted text-muted-foreground';
};

export const MessageListItem: React.FC<MessageListItemProps> = ({
  message,
  labels,
  isSelected,
  onSelect,
  onClick,
  onStarToggle,
}) => {
  const messageLabels = labels.filter((l) => message.labels.includes(l.id));

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-4 py-3 border-b cursor-pointer transition-colors',
        message.is_read
          ? 'bg-background hover:bg-muted/50'
          : 'bg-primary/5 hover:bg-primary/10 font-medium',
        isSelected && 'bg-primary/10'
      )}
    >
      {/* Checkbox */}
      <Checkbox
        checked={isSelected}
        onCheckedChange={(checked) => onSelect(message.id, !!checked)}
        onClick={(e) => e.stopPropagation()}
        className="flex-shrink-0"
      />

      {/* Star */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onStarToggle(message.id);
        }}
        className="flex-shrink-0 p-1 hover:bg-muted rounded"
      >
        <Star
          className={cn(
            'h-4 w-4 transition-colors',
            message.is_starred
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-muted-foreground hover:text-yellow-400'
          )}
        />
      </button>

      {/* Contenu cliquable */}
      <div
        className="flex-1 flex items-center gap-3 min-w-0"
        onClick={onClick}
      >
        {/* Avatar */}
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={message.sender.avatar_url} />
          <AvatarFallback className="text-xs">
            {getInitials(message.sender.name)}
          </AvatarFallback>
        </Avatar>

        {/* Expéditeur */}
        <div className="w-40 flex-shrink-0 truncate">
          <span className={cn('text-sm', !message.is_read && 'font-semibold')}>
            {message.sender.name}
          </span>
          <span className="ml-1 text-xs">{getRoleIcon(message.sender.role)}</span>
        </div>

        {/* Sujet et aperçu */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          {/* Labels */}
          {messageLabels.length > 0 && (
            <div className="flex gap-1 flex-shrink-0">
              {messageLabels.slice(0, 2).map((label) => (
                <span
                  key={label.id}
                  className={cn(
                    'px-2 py-0.5 rounded text-xs font-medium',
                    getLabelColor(label.color)
                  )}
                >
                  {label.name}
                </span>
              ))}
              {messageLabels.length > 2 && (
                <span className="px-1.5 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                  +{messageLabels.length - 2}
                </span>
              )}
            </div>
          )}

          {/* Sujet */}
          <span className={cn('truncate', !message.is_read && 'font-semibold')}>
            {message.subject}
          </span>

          {/* Séparateur */}
          <span className="text-muted-foreground flex-shrink-0">—</span>

          {/* Aperçu du contenu */}
          <span className="text-muted-foreground truncate text-sm">
            {message.content.substring(0, 100)}
          </span>
        </div>

        {/* Pièce jointe */}
        {message.has_attachments && (
          <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}

        {/* Date */}
        <span className="text-xs text-muted-foreground flex-shrink-0 w-16 text-right">
          {formatMessageDate(message.created_at)}
        </span>
      </div>
    </div>
  );
};
