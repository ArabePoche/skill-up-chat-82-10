/**
 * Sidebar Gmail-style pour l'application de messagerie école
 * Contient : Composer, dossiers (Réception, Envoyés, Brouillons, Corbeille) et labels
 */
import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Inbox,
  Send,
  FileText,
  Trash2,
  Star,
  Tag,
  Plus,
  PenSquare,
  ChevronDown,
  ChevronRight,
  Users,
  GraduationCap,
  UserPlus,
} from 'lucide-react';
import { MessageLabel, MessageView } from '../types';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface MessagesSidebarProps {
  currentView: MessageView;
  currentLabelId?: string;
  onViewChange: (view: MessageView, labelId?: string) => void;
  onCompose: () => void;
  labels: MessageLabel[];
  counts: {
    inbox: number;
    inboxUnread: number;
    sent: number;
    drafts: number;
    trash: number;
    starred: number;
    joinRequests: number;
  };
  collapsed?: boolean;
  onManageLabels?: () => void;
}

const folderIcons: Record<string, React.ElementType> = {
  inbox: Inbox,
  sent: Send,
  drafts: FileText,
  trash: Trash2,
  starred: Star,
  joinRequests: UserPlus,
};

export const MessagesSidebar: React.FC<MessagesSidebarProps> = ({
  currentView,
  currentLabelId,
  onViewChange,
  onCompose,
  labels,
  counts,
  collapsed = false,
  onManageLabels,
}) => {
  const [labelsOpen, setLabelsOpen] = React.useState(true);

  const folders = [
    { id: 'inbox', name: 'Boîte de réception', count: counts.inboxUnread, total: counts.inbox },
    { id: 'starred', name: 'Favoris', count: 0, total: counts.starred },
    { id: 'sent', name: 'Envoyés', count: 0, total: counts.sent },
    { id: 'drafts', name: 'Brouillons', count: counts.drafts, total: counts.drafts },
    { id: 'trash', name: 'Corbeille', count: 0, total: counts.trash },
  ];

  const getLabelColor = (color: string) => {
    const colorMap: Record<string, string> = {
      red: 'bg-red-500',
      orange: 'bg-orange-500',
      yellow: 'bg-yellow-500',
      green: 'bg-green-500',
      blue: 'bg-blue-500',
      purple: 'bg-purple-500',
      pink: 'bg-pink-500',
      gray: 'bg-gray-500',
    };
    return colorMap[color] || 'bg-primary';
  };

  if (collapsed) {
    return (
      <div className="w-16 border-r bg-card flex flex-col items-center py-4 gap-2">
        <Button
          size="icon"
          className="rounded-full mb-4"
          onClick={onCompose}
        >
          <PenSquare className="h-4 w-4" />
        </Button>
        {folders.map((folder) => {
          const Icon = folderIcons[folder.id];
          const isActive = currentView === folder.id;
          return (
            <Button
              key={folder.id}
              variant={isActive ? 'secondary' : 'ghost'}
              size="icon"
              className="relative"
              onClick={() => onViewChange(folder.id as MessageView)}
            >
              <Icon className="h-4 w-4" />
              {folder.count > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                  {folder.count > 9 ? '9+' : folder.count}
                </span>
              )}
            </Button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-64 border-r bg-card flex flex-col h-full">
      {/* Bouton Composer */}
      <div className="p-4">
        <Button
          className="w-full gap-2 rounded-2xl shadow-md"
          size="lg"
          onClick={onCompose}
        >
          <PenSquare className="h-4 w-4" />
          Nouveau message
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2">
          {/* Dossiers principaux */}
          <nav className="space-y-1">
            {folders.map((folder) => {
              const Icon = folderIcons[folder.id];
              const isActive = currentView === folder.id && !currentLabelId;
              return (
                <button
                  key={folder.id}
                  onClick={() => onViewChange(folder.id as MessageView)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1 text-left truncate">{folder.name}</span>
                  {folder.count > 0 && (
                    <Badge
                      variant={isActive ? 'default' : 'secondary'}
                      className="ml-auto text-xs"
                    >
                      {folder.count}
                    </Badge>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Demandes d'adhésion */}
          {counts.joinRequests > 0 && (
            <>
              <Separator className="my-3" />
              <button
                onClick={() => onViewChange('inbox')} // TODO: créer vue joinRequests
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  'text-foreground hover:bg-muted'
                )}
              >
                <UserPlus className="h-4 w-4 flex-shrink-0 text-orange-500" />
                <span className="flex-1 text-left truncate">Demandes d'adhésion</span>
                <Badge variant="destructive" className="ml-auto text-xs">
                  {counts.joinRequests}
                </Badge>
              </button>
            </>
          )}

          <Separator className="my-3" />

          {/* Labels */}
          <Collapsible open={labelsOpen} onOpenChange={setLabelsOpen}>
            <CollapsibleTrigger className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              {labelsOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Tag className="h-4 w-4" />
              <span>Libellés</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 mt-1">
              {labels.map((label) => {
                const isActive = currentView === 'label' && currentLabelId === label.id;
                return (
                  <button
                    key={label.id}
                    onClick={() => onViewChange('label', label.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    <span
                      className={cn(
                        'h-3 w-3 rounded-full flex-shrink-0',
                        getLabelColor(label.color)
                      )}
                    />
                    <span className="flex-1 text-left truncate">{label.name}</span>
                  </button>
                );
              })}
              {onManageLabels && (
                <button
                  onClick={onManageLabels}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <Plus className="h-4 w-4" />
                  <span>Gérer les libellés</span>
                </button>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  );
};
