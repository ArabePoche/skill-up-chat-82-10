/**
 * Hook pour accéder aux contacts du téléphone de l'utilisateur
 * Utilise Capacitor Contacts plugin
 */
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface PhoneContact {
  name: string;
  phoneNumbers: string[];
}

export const usePhoneContacts = () => {
  const [contacts, setContacts] = useState<PhoneContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const requestContacts = async () => {
    setIsLoading(true);
    try {
      // Vérifier si on est sur mobile avec Capacitor
      if ('contacts' in navigator && 'select' in (navigator as any).contacts) {
        const props = ['name', 'tel'];
        const opts = { multiple: true };
        
        const selectedContacts = await (navigator as any).contacts.select(props, opts);
        
        const formattedContacts: PhoneContact[] = selectedContacts.map((contact: any) => ({
          name: contact.name?.[0] || 'Sans nom',
          phoneNumbers: contact.tel?.map((t: any) => t.replace(/\s+/g, '')) || []
        }));
        
        setContacts(formattedContacts);
        return formattedContacts;
      } else {
        // Fallback pour le développement web
        toast({
          title: "Non disponible",
          description: "L'accès aux contacts n'est disponible que sur mobile",
          variant: "destructive",
        });
        return [];
      }
    } catch (error) {
      console.error('Erreur lors de l\'accès aux contacts:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'accéder aux contacts",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  return {
    contacts,
    isLoading,
    requestContacts
  };
};
