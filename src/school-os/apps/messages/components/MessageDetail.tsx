/**
 * Vue détaillée d'un message style Gmail
 */
import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  Archive,
  Trash2,
  Star,
  Reply,
  ReplyAll,
  Forward,
  MoreVertical,
  Printer,
  Download,
  Tag,
  Paperclip,
  ChevronDown,
} from 'lucide-react';
import { SchoolMessage, MessageLabel } from '../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MessageDetailProps {
  message: SchoolMessage;
  labels: MessageLabel[];
  onBack: () => void;
  onReply: () => void;
  onReplyAll: () => void;
  onForward: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onStarToggle: () => void;
  onAddLabel: (labelId: string) => void;
}

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

export const MessageDetail: React.FC<MessageDetailProps> = ({
  message,
  labels,
  onBack,
  onReply,
  onReplyAll,
  onForward,
  onArchive,
  onDelete,
  onStarToggle,
  onAddLabel,
}) => {
  const messageLabels = labels.filter((l) => message.labels.includes(l.id));
  const [expanded, setExpanded] = React.useState(true);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <Button variant="ghost" size="icon" onClick={onArchive}>
          <Archive className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Tag className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {labels.map((label) => (
              <DropdownMenuItem
                key={label.id}
                onClick={() => onAddLabel(label.id)}
              >
                <span
                  className={cn(
                    'h-3 w-3 rounded-full mr-2',
                    `bg-${label.color}-500`
                  )}
                />
                {label.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              <Printer className="h-4 w-4 mr-2" />
              Imprimer
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Download className="h-4 w-4 mr-2" />
              Télécharger
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Contenu */}
      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto p-6">
          {/* Sujet */}
          <div className="flex items-start gap-4 mb-6">
            <h1 className="text-2xl font-semibold flex-1">{message.subject}</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={onStarToggle}
              className="flex-shrink-0"
            >
              <Star
                className={cn(
                  'h-5 w-5',
                  message.is_starred
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-muted-foreground'
                )}
              />
            </Button>
          </div>

          {/* Labels */}
          {messageLabels.length > 0 && (
            <div className="flex gap-2 mb-4">
              {messageLabels.map((label) => (
                <Badge
                  key={label.id}
                  className={getLabelColor(label.color)}
                >
                  {label.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Message card */}
          <div className="border rounded-lg bg-card">
            {/* Header expéditeur */}
            <div
              className="flex items-start gap-4 p-4 cursor-pointer"
              onClick={() => setExpanded(!expanded)}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={message.sender.avatar_url} />
                <AvatarFallback>
                  {getInitials(message.sender.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{message.sender.name}</span>
                  <span className="text-sm text-muted-foreground">
                    &lt;{message.sender.email}&gt;
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>à moi</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpanded(!expanded);
                    }}
                  >
                    <ChevronDown
                      className={cn(
                        'h-3 w-3 transition-transform',
                        expanded && 'rotate-180'
                      )}
                    />
                  </Button>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {format(new Date(message.created_at), 'dd MMM yyyy à HH:mm', {
                  locale: fr,
                })}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={onReply}>
                  <Reply className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onReply}>
                      <Reply className="h-4 w-4 mr-2" />
                      Répondre
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onReplyAll}>
                      <ReplyAll className="h-4 w-4 mr-2" />
                      Répondre à tous
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onForward}>
                      <Forward className="h-4 w-4 mr-2" />
                      Transférer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Contenu du message */}
            {expanded && (
              <>
                <Separator />
                <div className="p-6">
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: message.content }}
                  />
                </div>

                {/* Pièces jointes */}
                {message.has_attachments && message.attachments && (
                  <>
                    <Separator />
                    <div className="p-4">
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Paperclip className="h-4 w-4" />
                        {message.attachments.length} pièce
                        {message.attachments.length > 1 ? 's' : ''} jointe
                        {message.attachments.length > 1 ? 's' : ''}
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {message.attachments.map((attachment) => (
                          <a
                            key={attachment.id}
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted transition-colors"
                          >
                            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                              <Paperclip className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {attachment.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {(attachment.size / 1024).toFixed(1)} Ko
                              </p>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Actions de réponse */}
          <div className="flex items-center gap-3 mt-6">
            <Button variant="outline" className="gap-2" onClick={onReply}>
              <Reply className="h-4 w-4" />
              Répondre
            </Button>
            <Button variant="outline" className="gap-2" onClick={onForward}>
              <Forward className="h-4 w-4" />
              Transférer
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
