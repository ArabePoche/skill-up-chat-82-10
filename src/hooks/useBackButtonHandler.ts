// src/hooks/useBackButtonHandler.ts
import { useEffect, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { useNavigate, useLocation } from 'react-router-dom';

export default function useBackButtonHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const lastBackPress = useRef<number | null>(null);

  useEffect(() => {
    const handler = CapacitorApp.addListener('backButton', () => {
      if (location.pathname === '/' || location.pathname === '/home') {
        const now = Date.now();
        if (lastBackPress.current && now - lastBackPress.current < 2000) {
          CapacitorApp.exitApp(); // 🚪 Quitte l'app
        } else {
          lastBackPress.current = now;
          alert('Appuyez encore une fois pour quitter l’application');
        }
      } else {
        navigate(-1); // ⬅️ Retour en arrière
      }
    });

    return () => {
      handler.remove(); // 💡 Nettoie l'écouteur à la destruction
    };
  }, [location, navigate]);
}
