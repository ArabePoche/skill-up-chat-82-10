/**
 * Dialog principal pour la découverte de contacts
 */
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Users, Loader2 } from 'lucide-react';
import { usePhoneContacts } from '../hooks/usePhoneContacts';
import { useMatchingUsers } from '../hooks/useMatchingUsers';
import { ContactsList } from './ContactsList';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface ContactsDiscoveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ContactsDiscoveryDialog = ({ open, onOpenChange }: ContactsDiscoveryDialogProps) => {
  const [hasSearched, setHasSearched] = useState(false);
  const { requestContacts, isLoading: isLoadingContacts } = usePhoneContacts();
  const { matchingUsers, isLoading: isLoadingMatches, findMatchingUsers } = useMatchingUsers();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleFindContacts = async () => {
    const contacts = await requestContacts();
    
    if (contacts.length > 0) {
      // Extraire tous les numéros de téléphone
      const allPhoneNumbers = contacts.flatMap(contact => contact.phoneNumbers);
      await findMatchingUsers(allPhoneNumbers);
      setHasSearched(true);
    }
  };

  const handleStartConversation = (userId: string) => {
    // Rediriger vers la page de conversation avec cet utilisateur
    navigate(`/conversations?userId=${userId}`);
    onOpenChange(false);
    toast({
      title: "Conversation démarrée",
      description: "Vous pouvez maintenant discuter avec ce contact",
    });
  };

  const isLoading = isLoadingContacts || isLoadingMatches;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Trouver mes contacts
          </DialogTitle>
          <DialogDescription>
            Découvrez quels contacts de votre répertoire utilisent déjà la plateforme
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!hasSearched ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Nous allons accéder à vos contacts pour trouver ceux qui utilisent déjà la plateforme
              </p>
              <Button
                onClick={handleFindContacts}
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Recherche en cours...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4" />
                    Rechercher mes contacts
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  {matchingUsers.length} contact{matchingUsers.length > 1 ? 's' : ''} trouvé{matchingUsers.length > 1 ? 's' : ''}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFindContacts}
                  disabled={isLoading}
                >
                  Actualiser
                </Button>
              </div>
              
              <ContactsList
                users={matchingUsers}
                onStartConversation={handleStartConversation}
              />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
