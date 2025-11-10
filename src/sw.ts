/// <reference lib="webworker" />
/**
 * Service Worker unifié : PWA Cache + Firebase Messaging
 */

import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

// Injecter le manifest précaché par VitePWA
precacheAndRoute(self.__WB_MANIFEST);

// Nettoyer les caches obsolètes
cleanupOutdatedCaches();

// Prendre le contrôle immédiatement
self.skipWaiting();
clientsClaim();

// ====== STRATÉGIES DE CACHE ======

// Cache pour les images
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 jours
      }),
    ],
  })
);

// Cache pour les assets statiques (JS, CSS)
registerRoute(
  ({ request }) => 
    request.destination === 'script' || 
    request.destination === 'style',
  new StaleWhileRevalidate({
    cacheName: 'static-resources',
  })
);

// Cache pour les requêtes API (Network First avec fallback)
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/') || url.hostname.includes('supabase'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 10,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
    ],
  })
);

// Navigation (SPA) - toujours servir index.html
const navigationRoute = new NavigationRoute(
  createHandlerBoundToURL('/index.html'),
  {
    allowlist: [/^(?!.*\.(?:png|jpg|jpeg|svg|css|js)$).*/],
    denylist: [/\/api\//, /supabase\.co/],
  }
);
registerRoute(navigationRoute);

// ====== FIREBASE MESSAGING ======

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDa4NhETpsY6DzzujBdlKctwCCG9aiy9GQ",
  authDomain: "push-notifications-727ff.firebaseapp.com",
  projectId: "push-notifications-727ff",
  storageBucket: "push-notifications-727ff.firebasestorage.app",
  messagingSenderId: "848401036339",
  appId: "1:848401036339:web:7c8ab4b7bf2d430d9cdf46"
};

try {
  // @ts-ignore - Firebase global
  firebase.initializeApp(firebaseConfig);
  // @ts-ignore
  const messaging = firebase.messaging();

  // Gérer les messages en arrière-plan
  messaging.onBackgroundMessage((payload: any) => {
    console.log('📨 Message reçu en arrière-plan:', payload);

    const notificationTitle = payload.notification?.title || 'EducaTok';
    const notificationOptions = {
      body: payload.notification?.body || 'Vous avez une nouvelle notification',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'educatok-notification',
      data: payload.data || {},
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });

  console.log('✅ Firebase Messaging initialisé dans SW');
} catch (error) {
  console.error('❌ Erreur Firebase SW:', error);
}

// ====== ÉVÉNEMENTS ======

self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installé');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activé');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('🚀 Service Worker unifié chargé (PWA + Firebase)');
