// Gestion du bouton retour (matériel Android via Capacitor + navigateur web)
// - Navigue en arrière s'il y a une route précédente dans l'app
// - Demande confirmation puis ferme l'app quand on est sur la page d'accueil
import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { toast } from 'sonner';

const ROOT_PATHS = ['/', '/home', '/video', '/messages'];

const useBackButtonHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const lastBackPressRef = useRef<number>(0);
  const locationRef = useRef(location);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      // Sur le web, on laisse le navigateur gérer son bouton retour normalement
      return;
    }

    let listenerHandle: { remove: () => void } | undefined;

    const setup = async () => {
      listenerHandle = await App.addListener('backButton', ({ canGoBack }) => {
        const currentPath = locationRef.current.pathname;
        const isAtRoot = ROOT_PATHS.includes(currentPath);

        // Cas 1 : on est dans une page interne — retour arrière classique
        if (canGoBack && !isAtRoot) {
          navigate(-1);
          return;
        }

        // Cas 2 : on est à la racine — double tap pour quitter
        const now = Date.now();
        if (now - lastBackPressRef.current < 2000) {
          App.exitApp();
          return;
        }

        lastBackPressRef.current = now;
        toast.info('Appuyez à nouveau pour quitter', {
          duration: 2000,
          position: 'bottom-center',
        });
      });
    };

    setup();

    return () => {
      listenerHandle?.remove();
    };
  }, [navigate]);
};

export default useBackButtonHandler;
