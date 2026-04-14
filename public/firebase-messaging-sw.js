// Service Worker pour Firebase Cloud Messaging avec Workbox
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Workbox manifest injection point (requis par vite-plugin-pwa)
self.__WB_MANIFEST;

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDa4NhETpsY6DzzujBdlKctwCCG9aiy9GQ",
  authDomain: "push-notifications-727ff.firebaseapp.com",
  projectId: "push-notifications-727ff",
  storageBucket: "push-notifications-727ff.firebasestorage.app",
  messagingSenderId: "848401036339",
  appId: "1:848401036339:web:7c8ab4b7bf2d430d9cdf46"
};

console.log('🔧 Firebase Service Worker starting...');

// Initialiser Firebase
try {
  firebase.initializeApp(firebaseConfig);
  console.log('✅ Firebase initialized in service worker');
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
}

// Récupérer une instance du service de messagerie
const messaging = firebase.messaging();

// Gérer les messages en arrière-plan
messaging.onBackgroundMessage(function(payload) {
  console.log('📨 Message reçu en arrière-plan');

  const notificationTitle = payload.notification?.title || 'REZO';
  const imageUrl = payload.notification?.image || payload.data?.imageUrl || null;
  const notificationOptions = {
    body: payload.notification?.body || 'Vous avez une nouvelle notification',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    ...(imageUrl ? { image: imageUrl } : {}),
    tag: 'rezo-notification',
    data: {
      click_action: payload.data?.click_action || '/',
      ...payload.data
    },
    actions: [
      {
        action: 'open',
        title: 'Ouvrir l\'app',
        icon: '/icon-192.png'
      },
      {
        action: 'close',
        title: 'Fermer'
      }
    ],
    requireInteraction: true,
    silent: false
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Gérer les clics sur les notifications
self.addEventListener('notificationclick', function(event) {
  console.log('👆 Clic sur notification');
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Ouvrir ou focuser l'app et naviguer vers la bonne page
  const clickAction = event.notification.data?.click_action || event.notification.data?.clickAction || '/';
  const urlToOpen = new URL(clickAction, self.location.origin).href;
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      // Vérifier si l'app est déjà ouverte
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // Naviguer vers la bonne page
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      
      // Si l'app n'est pas ouverte, l'ouvrir sur la bonne page
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Gérer l'installation du service worker
self.addEventListener('install', function(event) {
  console.log('📦 Service Worker installé');
  self.skipWaiting();
});

// Gérer l'activation du service worker
self.addEventListener('activate', function(event) {
  console.log('🚀 Service Worker activé');
  event.waitUntil(self.clients.claim());
});
