// Composant: dialogue de transfert de message prive vers un autre utilisateur.
// Role: rechercher un destinataire et confirmer le transfert d'un message existant.
import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, Share2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ConversationForwardRecipient {
  id: string;
  name: string;
  avatarUrl?: string | null;
  subtitle?: string | null;
}

interface ConversationForwardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recentRecipients: ConversationForwardRecipient[];
  excludedUserIds?: string[];
  isForwarding?: boolean;
  onConfirm: (recipient: ConversationForwardRecipient) => Promise<void> | void;
}

const ConversationForwardDialog: React.FC<ConversationForwardDialogProps> = ({
  open,
  onOpenChange,
  recentRecipients,
  excludedUserIds = [],
  isForwarding = false,
  onConfirm,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ConversationForwardRecipient[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<ConversationForwardRecipient | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const normalizedRecentRecipients = useMemo(() => {
    const excluded = new Set(excludedUserIds.filter(Boolean));
    const uniqueRecipients = new Map<string, ConversationForwardRecipient>();

    recentRecipients.forEach((recipient) => {
      if (!recipient?.id || excluded.has(recipient.id)) {
        return;
      }

      if (!uniqueRecipients.has(recipient.id)) {
        uniqueRecipients.set(recipient.id, recipient);
      }
    });

    return Array.from(uniqueRecipients.values());
  }, [excludedUserIds, recentRecipients]);

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedRecipient(null);
      setIsSearching(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    let isCancelled = false;

    const runSearch = async () => {
      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, username, avatar_url')
          .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,username.ilike.%${query}%`)
          .limit(12);

        if (error) {
          throw error;
        }

        if (isCancelled) {
          return;
        }

        const excluded = new Set(excludedUserIds.filter(Boolean));
        const mappedResults = (data || [])
          .filter((profile) => !excluded.has(profile.id))
          .map((profile) => ({
            id: profile.id,
            name:
              `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
              || profile.username
              || 'Utilisateur',
            avatarUrl: profile.avatar_url,
            subtitle: profile.username || null,
          }));

        setSearchResults(mappedResults);
      } catch (error) {
        if (!isCancelled) {
          console.error('Erreur recherche destinataires transfert:', error);
          toast.error('Erreur lors de la recherche des utilisateurs');
        }
      } finally {
        if (!isCancelled) {
          setIsSearching(false);
        }
      }
    };

    void runSearch();

    return () => {
      isCancelled = true;
    };
  }, [excludedUserIds, open, searchQuery]);

  const displayedRecipients = searchQuery.trim().length >= 2 ? searchResults : normalizedRecentRecipients;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-white/60 bg-white/95 p-0 backdrop-blur-2xl">
        <DialogHeader className="border-b border-slate-200/80 px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <Share2 className="h-5 w-5 text-violet-600" />
            Transferer le message
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            Choisissez un destinataire parmi vos conversations recentes ou recherchez un autre utilisateur.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Rechercher un utilisateur"
              className="h-11 rounded-2xl border-slate-200 pl-10"
            />
          </div>

          <div className="max-h-[18rem] space-y-2 overflow-y-auto pr-1">
            {isSearching ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Recherche en cours...
              </div>
            ) : displayedRecipients.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                {searchQuery.trim().length >= 2
                  ? 'Aucun utilisateur correspondant.'
                  : 'Aucun destinataire recent disponible.'}
              </div>
            ) : (
              displayedRecipients.map((recipient) => {
                const isSelected = selectedRecipient?.id === recipient.id;

                return (
                  <button
                    key={recipient.id}
                    type="button"
                    onClick={() => setSelectedRecipient(recipient)}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                      isSelected
                        ? 'border-violet-300 bg-violet-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Avatar className="h-11 w-11 border border-slate-200">
                      <AvatarImage src={recipient.avatarUrl || undefined} alt={recipient.name} />
                      <AvatarFallback className="bg-slate-100 text-slate-700">
                        {recipient.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-slate-900">{recipient.name}</div>
                      {recipient.subtitle && (
                        <div className="truncate text-xs text-slate-500">{recipient.subtitle}</div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200/80 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isForwarding}>
              Annuler
            </Button>
            <Button
              onClick={() => selectedRecipient && onConfirm(selectedRecipient)}
              disabled={!selectedRecipient || isForwarding}
              className="gap-2"
            >
              {isForwarding && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmer le transfert
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConversationForwardDialog;