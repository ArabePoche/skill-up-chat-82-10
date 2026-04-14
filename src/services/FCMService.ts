import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const isDevelopment = import.meta.env.DEV;

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDa4NhETpsY6DzzujBdlKctwCCG9aiy9GQ",
  authDomain: "push-notifications-727ff.firebaseapp.com", 
  projectId: "push-notifications-727ff",
  storageBucket: "push-notifications-727ff.firebasestorage.app",
  messagingSenderId: "848401036339",
  appId: "1:848401036339:web:7c8ab4b7bf2d430d9cdf46"
};

let app: any = null;
let messaging: any = null;

const initializeFirebase = () => {
  if (!app) {
    app = initializeApp(firebaseConfig);
    messaging = getMessaging(app);
  }
  return messaging;
};

export const FCMService = {
  async requestPermission(): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      console.log('🔔 Demande de permission pour les notifications...');
      
      // Vérifier le support avant de continuer
      if (!('Notification' in window)) {
        console.error('❌ API Notification non disponible');
        return { success: false, error: 'Les notifications ne sont pas supportées sur ce navigateur' };
      }

      if (!('serviceWorker' in navigator)) {
        console.error('❌ Service Worker non disponible');
        return { success: false, error: 'Les Service Workers ne sont pas supportés sur ce navigateur' };
      }
      
      const permission = await Notification.requestPermission();
      console.log('📋 Permission:', permission);
      
      if (permission !== 'granted') {
        console.warn('⚠️ Permission refusée');
        return { success: false, error: 'Permission refusée par l\'utilisateur' };
      }

      // Utiliser le service worker existant (géré par VitePWA)
      let registration: ServiceWorkerRegistration | undefined;
      try {
        // Attendre que le service worker soit prêt (déjà enregistré par VitePWA)
        registration = await navigator.serviceWorker.ready;
        console.log('✅ Service Worker prêt:', registration);
      } catch (swError) {
        console.error('❌ Erreur Service Worker:', swError);
        return { success: false, error: `Service Worker non disponible: ${swError instanceof Error ? swError.message : 'Erreur inconnue'}` };
      }

      const messaging = initializeFirebase();
      console.log('🔥 Firebase initialisé');
      
      // Obtenir le token FCM
      try {
        const token = await getToken(messaging, {
          vapidKey: 'BBMhY-FjyO2yC2ZHEoqOuWJSxOAe--IFH8VftzM0Pj1Ly3NljfJnxt1LAk-ddwPx0SIdndNGAs_fXQJCpHbsveI',
          serviceWorkerRegistration: registration
        });

        if (!token) {
          console.error('❌ Aucun token FCM obtenu');
          return { success: false, error: 'Impossible d\'obtenir le token FCM' };
        }

        if (isDevelopment) {
          console.log('FCM token obtained successfully');
        }

        // Écouter les messages en foreground
        onMessage(messaging, (payload) => {
          if (isDevelopment) {
            console.log('Foreground push message received');
          }
          
          // Afficher une notification même en foreground
          if (payload.notification) {
            const notification = new Notification(payload.notification.title || 'Nouvelle notification', {
              body: payload.notification.body,
              icon: '/icon-192.png',
              badge: '/badge-72.png'
            });
            
            notification.onclick = () => {
              window.focus();
              notification.close();
            };
          }
        });

        return { success: true, token };
      } catch (tokenError) {
        console.error('❌ Erreur obtention token:', tokenError);
        return { success: false, error: 'Erreur obtention token: ' + tokenError };
      }
    } catch (error) {
      console.error('❌ Erreur FCM générale:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
    }
  },

  // Fonction pour afficher une notification de test locale
  showTestNotification(): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('🎯 Test de notification', {
        body: 'Si vous voyez ceci, les notifications locales fonctionnent !',
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        requireInteraction: false
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      setTimeout(() => notification.close(), 5000);
    }
  }
};
