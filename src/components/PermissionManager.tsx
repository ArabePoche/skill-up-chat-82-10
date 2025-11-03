// src/components/PermissionManager.tsx
import { useEffect } from 'react';
import { Camera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

// Import conditionnel du plugin Contacts
let Contacts: any = null;
try {
  if (Capacitor.isNativePlatform()) {
    Contacts = require('@capacitor-community/contacts').Contacts;
  }
} catch (error) {
  console.warn('Capacitor Contacts plugin not available:', error);
}

const PermissionManager = () => {
  useEffect(() => {
    const askPermissions = async () => {
      try {
        // Caméra & galerie - demande toutes les permissions
        await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
        console.log('Permissions caméra et photos demandées');
        
        // Contacts - demande la permission si disponible
        if (Capacitor.isNativePlatform() && Contacts) {
          try {
            await Contacts.requestPermissions();
            console.log('Permission contacts demandée');
          } catch (contactsError) {
            console.warn('Erreur permission contacts:', contactsError);
          }
        }
      } catch (err) {
        console.error('Erreur permissions :', err);
      }
    };

    askPermissions();
  }, []);

  return null;
};

export default PermissionManager;