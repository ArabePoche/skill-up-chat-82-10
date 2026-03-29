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
import { Share2, Users, Loader2, Search, MessageCircle, Smartphone, UserPlus } from 'lucide-react';
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
  const [allPhoneContacts, setAllPhoneContacts] = useState<{name: string, phoneNumbers: string[]}[]>([]);

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
    setAllPhoneContacts(phoneContacts || []); // Stocker tous les contacts

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
  
  const handleInvite = (contact: {name: string, phoneNumbers: string[]}) => {
    // Logique d'invitation (SMS)
    if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
      const phoneNumber = contact.phoneNumbers[0];
      const message = `Salut ${contact.name.split(' ')[0]} ! Rejoins-moi sur SkillUp pour partager des connaissances. Télécharge l'appli ici : https://educatok.netlify.app`;
      
      // Essayer d'utiliser l'API Web Share si disponible
      if (navigator.share) {
        navigator.share({
          title: 'Invitation SkillUp',
          text: message,
          url: 'https://educatok.netlify.app'
        }).catch(() => {
          // Fallback vers SMS si share échoue ou annulé
           const smsUrl = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
           // Sur iOS, le séparateur body est '&', sur Android '?'
           // Une solution universelle est plus complexe, mais sms: est standard
           window.open(smsUrl, '_blank');
        });
      } else {
         window.open(`sms:${phoneNumber}?body=${encodeURIComponent(message)}`, '_blank');
      }
    } else {
      toast({
        title: "Impossible d'inviter",
        description: "Ce contact n'a pas de numéro de téléphone valide",
        variant: "destructive"
      });
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

  const isLoading = isLoadingContacts || isLoadingMatches;

  // Séparer les contacts inscrits et non inscrits
  const matchingUserIds = new Set(matchingUsers.map(u => {
     // Normaliser le numéro pour la comparaison
     return u.phone ? u.phone.replace(/[^0-9]/g, '') : '';
  }));

  // Mapper les contacts du téléphone en incluant l'info s'ils sont matchés ou non
  const displayContacts = allPhoneContacts.map(contact => {
    // Vérifier si un des numéros du contact matche un utilisateur
    const matchingProfile = matchingUsers.find(u => {
      // Comparer les 9 derniers chiffres
      if (!u.phone) return false;
      const uPhone = u.phone.replace(/[^0-9]/g, '');
      
      return contact.phoneNumbers.some((num: string) => {
        const cPhone = num.replace(/[^0-9]/g, '');
        // Si les deux font au moins 7 chiffres (pour être sûr)
        if (cPhone.length >= 7 && uPhone.length >= 7) {
            return uPhone.slice(-9) === cPhone.slice(-9);
        }
        return false;
      });
    });

    return {
      ...contact,
      isRegistered: !!matchingProfile,
      profile: matchingProfile
    };
  }).filter(c => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const name = c.name ? c.name.toLowerCase() : '';
    // Aussi chercher dans le nom du profil trouvé
    const profileName = c.profile ? `${c.profile.first_name} ${c.profile.last_name}`.toLowerCase() : '';
    return name.includes(query) || profileName.includes(query);
  });
  
  // Trier pour mettre les inscrits en premier
  displayContacts.sort((a, b) => {
      if (a.isRegistered && !b.isRegistered) return -1;
      if (!a.isRegistered && b.isRegistered) return 1;
      return (a.name || '').localeCompare(b.name || '');
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Mes Contacts
          </DialogTitle>
          <DialogDescription>
            Invitez vos amis ou discutez avec ceux déjà inscrits
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
                  Accédez à vos contacts pour retrouver vos amis sur SkillUp
                </p>
              </div>
              <Button onClick={() => handleSync()} className="gap-2">
                <UserPlus className="h-4 w-4" />
                Synchroniser mes contacts
              </Button>
            </div>
          )}

          {/* Chargement */}
          {isLoading && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Analyse de vos contacts en cours...
              </p>
            </div>
          )}

          {/* Résultats */}
          {hasSynced && !isLoading && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un ami..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-0.5 min-h-0">
                {displayContacts.length === 0 ? (
                   <div className="flex flex-col items-center gap-3 py-8">
                    <p className="text-sm text-muted-foreground text-center">
                      Aucun contact trouvé.
                    </p>
                    <Button variant="outline" size="sm" onClick={() => handleSync()} className="gap-2">
                      <Smartphone className="h-4 w-4" />
                      Réessayer
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-medium text-muted-foreground px-1 mb-2 uppercase tracking-wide">
                      {displayContacts.length} contact{displayContacts.length > 1 ? 's' : ''}
                    </p>
                    
                    {displayContacts.map((contact, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 overflow-hidden flex-1">
                          <Avatar className="h-10 w-10 shrink-0">
                             {contact.isRegistered && contact.profile?.avatar_url ? (
                                <AvatarImage src={contact.profile.avatar_url} />
                             ) : null}
                            <AvatarFallback className={contact.isRegistered ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}>
                              {(contact.isRegistered && contact.profile?.first_name 
                                  ? contact.profile.first_name 
                                  : (contact.name || '?')
                              ).substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 pr-2">
                            <p className="font-medium text-sm truncate">
                              {contact.isRegistered 
                                ? `${contact.profile?.first_name || ''} ${contact.profile?.last_name || ''}` 
                                : (contact.name || 'Inconnu')}
                            </p>
                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                               {contact.isRegistered 
                                 ? <span className="text-green-600 font-medium">Utilise SkillUp</span>
                                 : (contact.phoneNumbers[0] || '')}
                            </p>
                          </div>
                        </div>

                        {contact.isRegistered ? (
                             <Button 
                                size="sm" 
                                variant="default"
                                className="h-8 px-3 ml-2 shrink-0 gap-1 bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleStartConversation(contact.profile.id)}
                             >
                                <MessageCircle className="h-3.5 w-3.5" />
                                <span className="hidden xs:inline">Discuter</span>
                             </Button>
                        ) : (
                             <Button 
                                size="sm" 
                                variant="outline"
                                className="h-8 px-3 ml-2 shrink-0 gap-1 text-muted-foreground hover:text-primary hover:bg-primary/5"
                                onClick={() => handleInvite(contact)}
                             >
                                <Share2 className="h-3.5 w-3.5" />
                                <span className="hidden xs:inline">Inviter</span>
                             </Button>
                        )}
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
