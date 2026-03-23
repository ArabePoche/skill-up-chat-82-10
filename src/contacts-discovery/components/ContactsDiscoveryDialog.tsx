/**
 * Dialog pour découvrir des contacts inscrits sur la plateforme
 * parmi les contacts téléphoniques locaux de l'utilisateur.
 * Ne montre JAMAIS tous les utilisateurs de la plateforme.
 */
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Loader2, Search, MessageCircle, Smartphone, UserPlus } from 'lucide-react';
import { usePhoneContacts } from '../hooks/usePhoneContacts';
import { useMatchingUsers } from '../hooks/useMatchingUsers';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Capacitor } from '@capacitor/core';

interface ContactsDiscoveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ContactsDiscoveryDialog = ({ open, onOpenChange }: ContactsDiscoveryDialogProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSynced, setHasSynced] = useState(false);

  const { contacts, requestContacts, isLoading: isLoadingContacts } = usePhoneContacts();
  const { matchingUsers, isLoading: isLoadingMatches, findMatchingUsers } = useMatchingUsers();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const isNative = Capacitor.isNativePlatform();

  // Sur natif, synchroniser automatiquement à l'ouverture
  useEffect(() => {
    if (!open || !user?.id) return;
    if (isNative && !hasSynced) {
      handleSync();
    }
  }, [open, user?.id]);

  const handleSync = async () => {
    const phoneContacts = await requestContacts();
    // Même si aucun contact n'est trouvé, on marque comme synchronisé pour afficher le résultat vide
    // au lieu de proposer à nouveau la synchronisation en boucle
    if (phoneContacts) {
      if (phoneContacts.length > 0) {
        const allPhoneNumbers = phoneContacts.flatMap(c => c.phoneNumbers);
        if (allPhoneNumbers.length > 0) {
          await findMatchingUsers(allPhoneNumbers);
        }
      }
      setHasSynced(true);
    }
  };

  const handleStartConversation = (userId: string) => {
    navigate(`/conversations/${userId}`);
    onOpenChange(false);
    toast({
      title: "Conversation démarrée",
      description: "Vous pouvez maintenant discuter avec ce contact",
    });
  };

  // Reset à la fermeture
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setHasSynced(false);
    }
  }, [open]);

  const getUserDisplayName = (u: { first_name: string | null; last_name: string | null }) =>
    `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Utilisateur';

  const getUserInitials = (u: { first_name: string | null; last_name: string | null }) => {
    const name = getUserDisplayName(u);
    return name.substring(0, 2).toUpperCase();
  };

  // Filtrer les utilisateurs trouvés selon la recherche
  const filteredUsers = matchingUsers.filter((u) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const name = getUserDisplayName(u).toLowerCase();
    return name.includes(query);
  });

  const isLoading = isLoadingContacts || isLoadingMatches;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Contacts sur la plateforme
          </DialogTitle>
          <DialogDescription>
            Retrouvez vos contacts téléphoniques inscrits sur la plateforme
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 flex-1 overflow-hidden">
          {/* État initial : pas encore synchronisé (web uniquement, natif = auto) */}
          {!hasSynced && !isLoading && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="rounded-full bg-primary/10 p-4">
                <Smartphone className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-medium text-sm">Synchronisez vos contacts</p>
                <p className="text-xs text-muted-foreground max-w-[300px]">
                  Accédez à vos contacts téléphoniques pour retrouver ceux qui sont inscrits sur la plateforme
                </p>
              </div>
              <Button onClick={handleSync} className="gap-2">
                <UserPlus className="h-4 w-4" />
                Rechercher mes contacts
              </Button>
            </div>
          )}

          {/* Chargement */}
          {isLoading && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {isLoadingContacts ? 'Récupération des contacts...' : 'Recherche sur la plateforme...'}
              </p>
            </div>
          )}

          {/* Résultats */}
          {hasSynced && !isLoading && (
            <>
              {matchingUsers.length > 0 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher parmi vos contacts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    autoFocus
                  />
                </div>
              )}

              <div className="flex-1 overflow-y-auto space-y-0.5 min-h-0">
                {filteredUsers.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <p className="text-sm text-muted-foreground text-center">
                      {matchingUsers.length === 0
                        ? "Aucun de vos contacts n'est encore inscrit sur la plateforme"
                        : "Aucun résultat pour cette recherche"}
                    </p>
                    <Button variant="outline" size="sm" onClick={handleSync} className="gap-2">
                      <Smartphone className="h-4 w-4" />
                      Resynchroniser
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-medium text-muted-foreground px-1 mb-2 uppercase tracking-wide">
                      {filteredUsers.length} contact{filteredUsers.length > 1 ? 's' : ''} sur la plateforme
                    </p>
                    {filteredUsers.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => handleStartConversation(u.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {getUserInitials(u)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm flex items-center gap-1.5">
                              {getUserDisplayName(u)}
                              <span className="text-xs">📱</span>
                            </p>
                            {u.phone && (
                              <p className="text-xs text-muted-foreground">{u.phone}</p>
                            )}
                          </div>
                        </div>
                        <MessageCircle className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
