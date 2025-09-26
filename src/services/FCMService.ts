import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

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
      
      const permission = await Notification.requestPermission();
      console.log('📋 Permission accordée:', permission);
      
      if (permission !== 'granted') {
        return { success: false, error: 'Permission refusée par l\'utilisateur' };
      }

      // Enregistrer le service worker
      let registration: ServiceWorkerRegistration | undefined;
      if ('serviceWorker' in navigator) {
        registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('🔧 Service Worker enregistré:', registration);
        // Attendre que le service worker soit prêt
        await navigator.serviceWorker.ready;
      }

      const messaging = initializeFirebase();
      
      // Obtenir le token FCM
      const token = await getToken(messaging, {
        vapidKey: 'BBMhY-FjyO2yC2ZHEoqOuWJSxOAe--IFH8VftzM0Pj1Ly3NljfJnxt1LAk-ddwPx0SIdndNGAs_fXQJCpHbsveI',
        serviceWorkerRegistration: typeof registration !== 'undefined' ? registration : undefined
      });

      if (!token) {
        return { success: false, error: 'Impossible d\'obtenir le token FCM' };
      }

      console.log('🎯 Token FCM obtenu:', token.substring(0, 20) + '...');

      // Écouter les messages en foreground
      onMessage(messaging, (payload) => {
        console.log('📨 Message reçu en foreground:', payload);
        
        if (payload.notification) {
          new Notification(payload.notification.title || 'Nouvelle notification', {
            body: payload.notification.body,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png'
          });
        }
      });

      return { success: true, token };
    } catch (error) {
      console.error('❌ Erreur FCM:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
    }
  }
};
