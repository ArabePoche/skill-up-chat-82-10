/**
 * Hook pour accéder aux contacts du téléphone de l'utilisateur
 * Utilise Capacitor Contacts plugin pour mobile natif
 */
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Capacitor } from '@capacitor/core';

// Import conditionnel du plugin Contacts
import { Contacts } from '@capacitor-community/contacts';
// let Contacts: any = null;
// try {
//   if (Capacitor.isNativePlatform()) {
//     Contacts = require('@capacitor-community/contacts').Contacts;
//   }
// } catch (error) {
//   console.warn('Capacitor Contacts plugin not available:', error);
// }

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
      // Vérifier si on est dans un iframe (comme la preview Lovable)
      // On désactive ce check car il force l'utilisation de données de démo même si on veut tester
      /*
      const isInIframe = window.self !== window.top;
      
      if (isInIframe) {
        // En mode preview/iframe, utiliser des données de démo
        toast({
          title: "Mode démo",
          description: "L'accès aux contacts n'est pas disponible en mode preview. Utilisation de contacts de démonstration.",
        });
        
        // Données de démo pour tester
        const demoContacts: PhoneContact[] = [
          { name: 'Demo User 1', phoneNumbers: ['+33612345678'] },
          { name: 'Demo User 2', phoneNumbers: ['+33687654321'] }
        ];
        
        setContacts(demoContacts);
        return demoContacts;
      }
      */

      // Vérifier si on est sur une plateforme native avec Capacitor
      const isNativePlatform = Capacitor.isNativePlatform();
      
      if (isNativePlatform && Contacts) {
        try {
          console.log('📱 Tentative d\'accès aux contacts natifs...');
          
          // Demander la permission d'accès aux contacts
          const permission = await Contacts.requestPermissions();
          console.log('🔐 Permission contacts:', permission);
          
          if (permission.contacts === 'granted' || permission.contacts === 'prompt') {
            // TENTATIVE SANS PROJECTION POUR MAXIMISER COMPATIBILITÉ
            // Certains téléphones bloquent si on demande une projection précise
            const result = await Contacts.getContacts({
               // @ts-ignore
               projection: {
                  name: true,
                  phones: true
               }
            });
            
            // Si le résultat est vide, on tente sans projection (fetch tout)
            let rawContacts = result.contacts || [];
            if (rawContacts.length === 0) {
              console.log('⚠️ Réessai sans projection...');
              try {
                // @ts-ignore
                const retryResult = await Contacts.getContacts({});
                rawContacts = retryResult.contacts || [];
              } catch (e) {
                console.warn('Erreur fallback contacts:', e);
              }
            }
            console.log('📇 Contacts bruts récupérés:', rawContacts.length);
            
            const formattedContacts: PhoneContact[] = rawContacts
              .filter((contact: any) => {
                 // Vérifier si le contact a au moins un numéro
                 return contact.phones && Array.isArray(contact.phones) && contact.phones.length > 0;
              })
              .map((contact: any) => ({
                // Essayer tous les champs de nom possibles selon les versions d'Android/iOS
                name: contact.name?.display || contact.displayName || contact.givenName || contact.name || 'Sans nom',
                // Nettoyage strict : ne garder que chiffres et +
                phoneNumbers: contact.phones
                  .map((p: any) => typeof p === 'string' ? p.replace(/[^0-9+]/g, '') : p.number?.replace(/[^0-9+]/g, '') || '')
                  .filter((num: string) => num.length > 0)
              }));
            
            console.log('✅ Contacts formatés valides:', formattedContacts.length);

            setContacts(formattedContacts);
            
            if (formattedContacts.length === 0 && rawContacts.length > 0) {
              toast({
                title: "Attention",
                description: `${rawContacts.length} contacts trouvés mais aucun avec un numéro valide.`,
                variant: "destructive",
              });
            } else {
              toast({
                title: "Contacts chargés",
                description: `${formattedContacts.length} contact(s) trouvé(s) sur ${rawContacts.length}`,
              });
            }
            return formattedContacts;
          } else {
            toast({
              title: "Permission refusée",
              description: "Vous devez autoriser l'accès aux contacts pour utiliser cette fonctionnalité",
              variant: "destructive",
            });
            return [];
          }
        } catch (capacitorError) {
          console.error('❌ Erreur accès contacts natifs:', capacitorError);
          toast({
            title: "Erreur",
            description: "Impossible d'accéder aux contacts du téléphone",
            variant: "destructive",
          });
          return [];
        }
      }
      
      // Vérifier si on est sur le web avec l'API Contacts Navigator (expérimental)
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
      
      // Message d'erreur plus spécifique
      const errorMessage = error instanceof Error && error.message.includes('top frame')
        ? "Cette fonctionnalité nécessite l'application mobile ou un navigateur compatible"
        : "Impossible d'accéder aux contacts";
      
      toast({
        title: "Erreur",
        description: errorMessage,
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
