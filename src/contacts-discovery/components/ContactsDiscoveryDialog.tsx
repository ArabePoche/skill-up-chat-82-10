/**
 * Dialog pour découvrir des contacts sur la plateforme.
 * Affiche automatiquement tous les utilisateurs de la plateforme (style WhatsApp)
 * + recherche par nom/username + contacts téléphone sur mobile natif.
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
import { Users, Loader2, Search, MessageCircle, Smartphone } from 'lucide-react';
import { usePhoneContacts } from '../hooks/usePhoneContacts';
import { useMatchingUsers } from '../hooks/useMatchingUsers';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Capacitor } from '@capacitor/core';

interface ContactsDiscoveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PlatformUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export const ContactsDiscoveryDialog = ({ open, onOpenChange }: ContactsDiscoveryDialogProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [hasSearchedContacts, setHasSearchedContacts] = useState(false);

  const { requestContacts, isLoading: isLoadingContacts } = usePhoneContacts();
  const { matchingUsers, isLoading: isLoadingMatches, findMatchingUsers } = useMatchingUsers();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const isNative = Capacitor.isNativePlatform();

  // Charger tous les utilisateurs de la plateforme à l'ouverture
  useEffect(() => {
    if (!open || !user?.id) return;

    const loadPlatformUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, username, avatar_url')
          .neq('id', user.id)
          .order('first_name', { ascending: true })
          .limit(100);

        if (error) throw error;
        setPlatformUsers(data || []);
      } catch (err) {
        console.error('Erreur chargement utilisateurs:', err);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    loadPlatformUsers();

    // Sur natif, chercher automatiquement les contacts téléphone
    if (isNative) {
      handleFindContacts();
    }
  }, [open, user?.id]);

  const handleFindContacts = async () => {
    const contacts = await requestContacts();
    if (contacts.length > 0) {
      const allPhoneNumbers = contacts.flatMap(contact => contact.phoneNumbers);
      await findMatchingUsers(allPhoneNumbers);
      setHasSearchedContacts(true);
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
      setPlatformUsers([]);
      setHasSearchedContacts(false);
    }
  }, [open]);

  const getUserDisplayName = (u: PlatformUser) =>
    `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || 'Utilisateur';

  const getUserInitials = (u: PlatformUser) => {
    const name = getUserDisplayName(u);
    return name.substring(0, 2).toUpperCase();
  };

  // Filtrer les utilisateurs selon la recherche
  const filteredUsers = platformUsers.filter((u) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const name = getUserDisplayName(u).toLowerCase();
    const username = (u.username || '').toLowerCase();
    return name.includes(query) || username.includes(query);
  });

  // IDs des contacts téléphone trouvés sur la plateforme
  const phoneContactIds = new Set(matchingUsers.map((mu) => mu.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Nouveau message
          </DialogTitle>
          <DialogDescription>
            Sélectionnez un contact pour démarrer une conversation
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 flex-1 overflow-hidden">
          {/* Barre de recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          {/* Bouton contacts téléphone (natif uniquement, si pas encore fait) */}
          {isNative && !hasSearchedContacts && (
            <Button
              variant="outline"
              onClick={handleFindContacts}
              disabled={isLoadingContacts || isLoadingMatches}
              size="sm"
              className="gap-2 self-start"
            >
              {isLoadingContacts || isLoadingMatches ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Synchronisation...
                </>
              ) : (
                <>
                  <Smartphone className="h-4 w-4" />
                  Synchroniser mes contacts
                </>
              )}
            </Button>
          )}

          {/* Liste des contacts */}
          <div className="flex-1 overflow-y-auto space-y-0.5 min-h-0">
            {isLoadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                Aucun contact trouvé
              </p>
            ) : (
              <>
                {/* Section contacts téléphone sur la plateforme */}
                {hasSearchedContacts && matchingUsers.length > 0 && !searchQuery.trim() && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-muted-foreground px-1 mb-2 uppercase tracking-wide">
                      📱 Contacts téléphone sur la plateforme
                    </p>
                    {matchingUsers.map((mu) => {
                      const platformUser = platformUsers.find((p) => p.id === mu.id);
                      return (
                        <UserRow
                          key={`phone-${mu.id}`}
                          user={platformUser || { id: mu.id, first_name: mu.first_name, last_name: mu.last_name, username: null, avatar_url: null }}
                          onStartConversation={handleStartConversation}
                          getUserDisplayName={getUserDisplayName}
                          getUserInitials={getUserInitials}
                          isPhoneContact
                        />
                      );
                    })}
                  </div>
                )}

                {/* Tous les utilisateurs */}
                <p className="text-xs font-medium text-muted-foreground px-1 mb-2 uppercase tracking-wide">
                  {searchQuery.trim()
                    ? `${filteredUsers.length} résultat${filteredUsers.length > 1 ? 's' : ''}`
                    : `Tous les contacts (${filteredUsers.length})`}
                </p>
                {filteredUsers
                  .filter((u) => !phoneContactIds.has(u.id) || searchQuery.trim())
                  .map((u) => (
                    <UserRow
                      key={u.id}
                      user={u}
                      onStartConversation={handleStartConversation}
                      getUserDisplayName={getUserDisplayName}
                      getUserInitials={getUserInitials}
                      isPhoneContact={phoneContactIds.has(u.id)}
                    />
                  ))}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/** Ligne individuelle d'un utilisateur */
function UserRow({
  user,
  onStartConversation,
  getUserDisplayName,
  getUserInitials,
  isPhoneContact,
}: {
  user: { id: string; first_name: string | null; last_name: string | null; username: string | null; avatar_url: string | null };
  onStartConversation: (id: string) => void;
  getUserDisplayName: (u: any) => string;
  getUserInitials: (u: any) => string;
  isPhoneContact?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={() => onStartConversation(user.id)}
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            {getUserInitials(user)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-sm flex items-center gap-1.5">
            {getUserDisplayName(user)}
            {isPhoneContact && <span className="text-xs">📱</span>}
          </p>
          {user.username && (
            <p className="text-xs text-muted-foreground">@{user.username}</p>
          )}
        </div>
      </div>
      <MessageCircle className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}
