
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyDY11S6os_Ixb2SLJ4q88gSEXG-BD0T-80",
  authDomain: "eductok-a2a00.firebaseapp.com",
  projectId: "eductok-a2a00",
  storageBucket: "eductok-a2a00.firebasestorage.app",
  messagingSenderId: "1010464187969",
  appId: "1:1010464187969:web:1027389ff1a6bf8be508c0"
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
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('🔧 Service Worker enregistré:', registration);
        
        // Attendre que le service worker soit prêt
        await navigator.serviceWorker.ready;
      }

      const messaging = initializeFirebase();
      
      const token = await getToken(messaging, {
        vapidKey: 'BPE6_Yc4iHGui2Dj1zix6efPsyRKS-_vvDBYR1z1JOednZXoo5XLQWB0zqRvyK3hlMf2Q8PxLCzG2Yt2ryjxMKQ'
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
