// src/components/PermissionManager.tsx
import { useEffect } from 'react';
import { Camera } from '@capacitor/camera';
import { App } from '@capacitor/app';

const PermissionManager = () => {
  useEffect(() => {
    const askPermissions = async () => {
      try {
        // Caméra & galerie - demande toutes les permissions
        await Camera.requestPermissions({ permissions: ['camera', 'photos'] });

        console.log('Permissions caméra et photos demandées');
      } catch (err) {
        console.error('Erreur permissions :', err);
      }
    };

    askPermissions();
  }, []);

  return null;
};

export default PermissionManager;