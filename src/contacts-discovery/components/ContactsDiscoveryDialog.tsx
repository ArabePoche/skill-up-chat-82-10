/**
 * Dialog plein écran pour découvrir les contacts téléphoniques
 * UI inspirée Revyze : liste de tous les contacts avec :
 *  - bouton "Discuter" (vert) pour ceux déjà inscrits
 *  - bouton "Inviter" (jaune) pour les autres
 */
import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Loader2,
  Search,
  MessageCircle,
  Mail,
  Smartphone,
  UserPlus,
} from 'lucide-react';
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

// Palette de couleurs pour les avatars (déterministe selon le nom)
const AVATAR_COLORS = [
  'bg-red-900/60 text-red-100',
  'bg-emerald-900/60 text-emerald-100',
  'bg-amber-900/60 text-amber-100',
  'bg-blue-900/60 text-blue-100',
  'bg-purple-900/60 text-purple-100',
  'bg-pink-900/60 text-pink-100',
  'bg-teal-900/60 text-teal-100',
  'bg-orange-900/60 text-orange-100',
];

const colorFor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const initialsOf = (name: string) =>
  (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

export const ContactsDiscoveryDialog = ({ open, onOpenChange }: ContactsDiscoveryDialogProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSynced, setHasSynced] = useState(false);
  const [allPhoneContacts, setAllPhoneContacts] = useState<{ name: string; phoneNumbers: string[] }[]>([]);

  const { requestContacts, isLoading: isLoadingContacts } = usePhoneContacts();
  const { matchingUsers, isLoading: isLoadingMatches, findMatchingUsers } = useMatchingUsers();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (!open || !user?.id) return;
    if (isNative && !hasSynced) {
      handleSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id]);

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setHasSynced(false);
    }
  }, [open]);

  const handleSync = async () => {
    const phoneContacts = await requestContacts();
    setAllPhoneContacts(phoneContacts || []);

    if (phoneContacts && phoneContacts.length > 0) {
      const allPhoneNumbers = phoneContacts.flatMap((c) => c.phoneNumbers);
      if (allPhoneNumbers.length > 0) {
        await findMatchingUsers(allPhoneNumbers);
      }
    }
    setHasSynced(true);
  };

  const handleInvite = (contact: { name: string; phoneNumbers: string[] }) => {
    if (!contact.phoneNumbers?.length) {
      toast({
        title: "Impossible d'inviter",
        description: "Ce contact n'a pas de numéro valide",
        variant: 'destructive',
      });
      return;
    }
    const phoneNumber = contact.phoneNumbers[0];
    const firstName = (contact.name || '').split(' ')[0] || '';
    const message = `Salut ${firstName} ! Rejoins-moi sur SkillUp : https://educatok.netlify.app`;

    if (navigator.share) {
      navigator
        .share({ title: 'Invitation SkillUp', text: message, url: 'https://educatok.netlify.app' })
        .catch(() => {
          window.open(`sms:${phoneNumber}?body=${encodeURIComponent(message)}`, '_blank');
        });
    } else {
      window.open(`sms:${phoneNumber}?body=${encodeURIComponent(message)}`, '_blank');
    }
  };

  const handleStartConversation = (userId: string) => {
    navigate(`/conversations/${userId}`);
    onOpenChange(false);
  };

  // Construire la liste enrichie (inscrit / non inscrit)
  const displayContacts = useMemo(() => {
    const enriched = allPhoneContacts.map((contact) => {
      const matchingProfile = matchingUsers.find((u) => {
        if (!u.phone) return false;
        const uPhone = u.phone.replace(/[^0-9]/g, '');
        return contact.phoneNumbers.some((num: string) => {
          const cPhone = num.replace(/[^0-9]/g, '');
          if (cPhone.length >= 7 && uPhone.length >= 7) {
            return uPhone.slice(-9) === cPhone.slice(-9);
          }
          return false;
        });
      });
      return {
        ...contact,
        isRegistered: !!matchingProfile,
        profile: matchingProfile,
      };
    });

    const filtered = enriched.filter((c) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const name = (c.name || '').toLowerCase();
      const profileName = c.profile
        ? `${c.profile.first_name ?? ''} ${c.profile.last_name ?? ''}`.toLowerCase()
        : '';
      const phones = c.phoneNumbers.join(' ');
      return name.includes(q) || profileName.includes(q) || phones.includes(q);
    });

    // Inscrits en haut, puis tri alphabétique
    filtered.sort((a, b) => {
      if (a.isRegistered && !b.isRegistered) return -1;
      if (!a.isRegistered && b.isRegistered) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
    return filtered;
  }, [allPhoneContacts, matchingUsers, searchQuery]);

  const isLoading = isLoadingContacts || isLoadingMatches;
  const registeredCount = displayContacts.filter((c) => c.isRegistered).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-full w-screen h-[100dvh] sm:h-[100dvh] sm:max-w-md sm:rounded-none border-0 bg-background flex flex-col gap-0 [&>button]:hidden">
        {/* Header avec mascotte */}
        <div className="shrink-0 px-4 pt-4 pb-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-10 w-10 -ml-2"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>

          <div className="flex items-start gap-3 mt-2">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 flex items-center justify-center text-3xl shrink-0">
              👋
            </div>
            <div className="bg-card text-card-foreground rounded-2xl rounded-tl-sm px-4 py-3 shadow-md flex-1">
              <p className="font-bold text-base leading-tight">
                Ajoute tes ami·e·s
                <br />
                pour discuter
              </p>
            </div>
          </div>
        </div>

        {/* Recherche */}
        <div className="shrink-0 px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Recherche"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 rounded-full bg-muted/50 border-muted text-base"
            />
          </div>
        </div>

        {/* Titre section */}
        {hasSynced && !isLoading && displayContacts.length > 0 && (
          <div className="shrink-0 px-4 py-2">
            <h3 className="text-lg font-bold">
              {registeredCount > 0
                ? `Discute avec tes amis sur `
                : `Invite-les à te rejoindre sur `}
              <span className="text-amber-400">SkillUp</span>
            </h3>
          </div>
        )}

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto px-3 pb-24">
          {/* État initial */}
          {!hasSynced && !isLoading && (
            <div className="flex flex-col items-center gap-4 py-12 px-6">
              <div className="rounded-full bg-primary/10 p-5">
                <Smartphone className="h-10 w-10 text-primary" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-semibold">Synchronise tes contacts</p>
                <p className="text-sm text-muted-foreground">
                  Trouve tes amis déjà inscrits et invite les autres
                </p>
              </div>
              <Button onClick={handleSync} className="gap-2 rounded-full h-12 px-6">
                <UserPlus className="h-4 w-4" />
                Synchroniser
              </Button>
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center gap-3 py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analyse de tes contacts…</p>
            </div>
          )}

          {hasSynced && !isLoading && displayContacts.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-12">
              <p className="text-sm text-muted-foreground text-center">
                Aucun contact trouvé.
              </p>
              <Button variant="outline" size="sm" onClick={handleSync} className="gap-2 rounded-full">
                <Smartphone className="h-4 w-4" />
                Réessayer
              </Button>
            </div>
          )}

          {hasSynced && !isLoading && displayContacts.length > 0 && (
            <div className="space-y-2">
              {displayContacts.map((contact, index) => {
                const displayName = contact.isRegistered
                  ? `${contact.profile?.first_name ?? ''} ${contact.profile?.last_name ?? ''}`.trim() ||
                    contact.name
                  : contact.name || 'Inconnu';
                const initials = initialsOf(displayName);
                const colorClass = colorFor(displayName);

                return (
                  <div
                    key={`${contact.name}-${index}`}
                    className="flex items-center gap-3 px-2 py-2"
                  >
                    <Avatar className="h-14 w-14 shrink-0">
                      {contact.isRegistered && contact.profile?.avatar_url ? (
                        <AvatarImage src={contact.profile.avatar_url} />
                      ) : null}
                      <AvatarFallback className={`${colorClass} font-semibold text-base`}>
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-base truncate">{displayName}</p>
                      {contact.isRegistered ? (
                        <p className="text-xs text-emerald-500 font-medium">Sur SkillUp</p>
                      ) : (
                        <p className="text-xs text-muted-foreground truncate">
                          {contact.phoneNumbers[0] || ''}
                        </p>
                      )}
                    </div>

                    {contact.isRegistered ? (
                      <Button
                        onClick={() => handleStartConversation(contact.profile!.id)}
                        className="shrink-0 h-12 px-5 rounded-2xl gap-2 font-bold text-sm bg-gradient-to-b from-emerald-400 to-emerald-600 hover:from-emerald-500 hover:to-emerald-700 text-white shadow-[0_4px_0_hsl(var(--background))] border border-emerald-700"
                      >
                        <MessageCircle className="h-4 w-4" strokeWidth={2.5} />
                        Discuter
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleInvite(contact)}
                        className="shrink-0 h-12 px-5 rounded-2xl gap-2 font-bold text-sm bg-gradient-to-b from-amber-300 to-amber-500 hover:from-amber-400 hover:to-amber-600 text-amber-950 shadow-[0_4px_0_hsl(var(--background))] border border-amber-600"
                      >
                        <Mail className="h-4 w-4" strokeWidth={2.5} />
                        Inviter
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
