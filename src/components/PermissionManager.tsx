// src/components/PermissionManager.tsx
import { useEffect } from 'react';
import { Camera } from '@capacitor/camera';

const PermissionManager = () => {
  useEffect(() => {
    const askPermissions = async () => {
      try {
        // Caméra & galerie
        await Camera.requestPermissions({ permissions: ['camera', 'photos'] });

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
