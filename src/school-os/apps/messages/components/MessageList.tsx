/**
 * Liste de messages style Gmail avec toolbar d'actions
 */
import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Archive,
  Trash2,
  Tag,
  MoreVertical,
  RefreshCw,
  Search,
  ChevronDown,
  Mail,
  MailOpen,
  Star,
} from 'lucide-react';
import { MessageListItem } from './MessageListItem';
import { SchoolMessage, MessageLabel, MessageView } from '../types';

interface MessageListProps {
  messages: SchoolMessage[];
  labels: MessageLabel[];
  selectedIds: string[];
  onSelectAll: (checked: boolean) => void;
  onSelectMessage: (id: string, checked: boolean) => void;
  onMessageClick: (message: SchoolMessage) => void;
  onStarToggle: (id: string) => void;
  onArchive: (ids: string[]) => void;
  onDelete: (ids: string[]) => void;
  onMarkRead: (ids: string[], read: boolean) => void;
  onAddLabel: (ids: string[], labelId: string) => void;
  onRefresh: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  currentView: MessageView;
  isLoading?: boolean;
}

const viewTitles: Record<MessageView, string> = {
  inbox: 'Boîte de réception',
  sent: 'Messages envoyés',
  drafts: 'Brouillons',
  trash: 'Corbeille',
  starred: 'Favoris',
  label: 'Libellé',
};

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  labels,
  selectedIds,
  onSelectAll,
  onSelectMessage,
  onMessageClick,
  onStarToggle,
  onArchive,
  onDelete,
  onMarkRead,
  onAddLabel,
  onRefresh,
  searchQuery,
  onSearchChange,
  currentView,
  isLoading,
}) => {
  const allSelected = messages.length > 0 && selectedIds.length === messages.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < messages.length;
  const hasSelection = selectedIds.length > 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      {/* Barre de recherche */}
      <div className="p-4 border-b">
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher dans les messages..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-muted/50 border-0 focus-visible:ring-1"
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
        {/* Checkbox tout sélectionner */}
        <div className="flex items-center gap-1">
          <Checkbox
            checked={allSelected}
            // @ts-ignore - indeterminate n'est pas typé mais fonctionne
            indeterminate={someSelected}
            onCheckedChange={(checked) => onSelectAll(!!checked)}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => onSelectAll(true)}>
                Tout sélectionner
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSelectAll(false)}>
                Aucun
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Lus</DropdownMenuItem>
              <DropdownMenuItem>Non lus</DropdownMenuItem>
              <DropdownMenuItem>Favoris</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Actions de sélection */}
        {hasSelection ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => onArchive(selectedIds)}
            >
              <Archive className="h-4 w-4" />
              <span className="hidden sm:inline">Archiver</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => onDelete(selectedIds)}
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Supprimer</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1">
                  <Tag className="h-4 w-4" />
                  <span className="hidden sm:inline">Libellés</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {labels.map((label) => (
                  <DropdownMenuItem
                    key={label.id}
                    onClick={() => onAddLabel(selectedIds, label.id)}
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
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onMarkRead(selectedIds, true)}>
                  <MailOpen className="h-4 w-4 mr-2" />
                  Marquer comme lu
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onMarkRead(selectedIds, false)}>
                  <Mail className="h-4 w-4 mr-2" />
                  Marquer comme non lu
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Star className="h-4 w-4 mr-2" />
                  Ajouter aux favoris
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
            <span className="text-sm text-muted-foreground ml-2">
              {viewTitles[currentView]}
            </span>
          </>
        )}

        {/* Compteur de sélection */}
        {hasSelection && (
          <span className="ml-auto text-sm text-muted-foreground">
            {selectedIds.length} sélectionné{selectedIds.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Liste des messages */}
      <ScrollArea className="flex-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Mail className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">Aucun message</h3>
            <p className="text-sm text-muted-foreground">
              {currentView === 'inbox'
                ? 'Votre boîte de réception est vide'
                : `Aucun message dans ${viewTitles[currentView].toLowerCase()}`}
            </p>
          </div>
        ) : (
          <div>
            {messages.map((message) => (
              <MessageListItem
                key={message.id}
                message={message}
                labels={labels}
                isSelected={selectedIds.includes(message.id)}
                onSelect={onSelectMessage}
                onClick={() => onMessageClick(message)}
                onStarToggle={onStarToggle}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
