// src/hooks/useBackButtonHandler.ts
import { useEffect, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { useNavigate, useLocation } from 'react-router-dom';

export default function useBackButtonHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const lastBackPress = useRef<number | null>(null);

  useEffect(() => {
    let handler: any = null;

    const setupHandler = async () => {
      try {
        handler = await CapacitorApp.addListener('backButton', () => {
          if (location.pathname === '/' || location.pathname === '/home') {
            const now = Date.now();
            if (lastBackPress.current && now - lastBackPress.current < 2000) {
              CapacitorApp.exitApp(); // 🚪 Quitte l'app
            } else {
              lastBackPress.current = now;
              alert('Appuyez encore une fois pour quitter l\'application');
            }
          } else {
            navigate(-1); // ⬅️ Retour en arrière
          }
        });
      } catch (error) {
        console.log('Capacitor App not available or web environment');
      }
    };

    setupHandler();

    return () => {
      if (handler && handler.remove) {
        handler.remove(); // 💡 Nettoie l'écouteur à la destruction
      }
    };
  }, [location, navigate]);
}