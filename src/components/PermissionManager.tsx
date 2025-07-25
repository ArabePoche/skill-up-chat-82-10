// src/components/PermissionManager.tsx
import { useEffect } from 'react';
import { Camera } from '@capacitor/camera';
import { Permissions } from '@capacitor/permissions';

const PermissionManager = () => {
  useEffect(() => {
    const askPermissions = async () => {
      try {
        // Caméra & galerie
        await Camera.requestPermissions({ permissions: ['camera', 'photos'] });

        // Micro
        await Permissions.requestPermission({ name: 'microphone' });

        // Contacts (nécessite cordova-plugin-contacts installé + déclaré)
        await Permissions.requestPermission({ name: 'contacts' });

        console.log('Permissions demandées');
      } catch (err) {
        console.error('Erreur permissions :', err);
      }
    };

    askPermissions();
  }, []);

  return null;
};

export default PermissionManager;
