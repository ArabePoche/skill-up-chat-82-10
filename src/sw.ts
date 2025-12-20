/// <reference lib="webworker" />
/**
 * Service Worker unifié : PWA Cache + Firebase Messaging + Offline Support
 */

import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute, Route } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst, NetworkOnly } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

// Prendre le contrôle immédiatement
self.skipWaiting();
clientsClaim();

// Injecter le manifest précaché par VitePWA
precacheAndRoute(self.__WB_MANIFEST);

// Nettoyer les caches obsolètes
cleanupOutdatedCaches();

// ====== CACHE NAMES ======
const CACHE_NAME = 'educatok-v1';
const OFFLINE_CACHE = 'educatok-offline-v1';

// ====== PRE-CACHE OFFLINE PAGE ======
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installé');
  
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => {
      console.log('📦 Caching offline assets...');
      return cache.addAll([
        '/offline.html',
        '/icon-192.png',
        '/icon-512.png',
      ]);
    })
  );
  
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activé');
  
  // Nettoyer les anciens caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== OFFLINE_CACHE)
          .map((name) => {
            console.log('🗑️ Suppression ancien cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

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

// Cache pour les polices
registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({
    cacheName: 'fonts-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 an
      }),
    ],
  })
);

// Cache pour les requêtes API Supabase (Network First avec fallback cache)
registerRoute(
  ({ url }) => url.hostname.includes('supabase.co'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 10,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 24 * 60 * 60, // 24 heures
      }),
    ],
  })
);

// ====== NAVIGATION OFFLINE HANDLER ======
// Servir l'app depuis le cache, avec fallback offline.html

const navigationHandler = async ({ request }: { request: Request }) => {
  try {
    // Essayer le réseau d'abord
    const networkResponse = await fetch(request);
    
    // Mettre en cache la réponse réussie
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, networkResponse.clone());
    
    return networkResponse;
  } catch (error) {
    console.log('📵 Network failed, trying cache...');
    
    // Essayer le cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('✅ Serving from cache:', request.url);
      return cachedResponse;
    }
    
    // Essayer de servir index.html du cache (pour SPA)
    const indexCache = await caches.match('/index.html');
    if (indexCache) {
      console.log('✅ Serving index.html from cache');
      return indexCache;
    }
    
    // Dernier recours : page offline
    console.log('📄 Serving offline page');
    const offlineResponse = await caches.match('/offline.html');
    if (offlineResponse) {
      return offlineResponse;
    }
    
    // Si même offline.html n'est pas disponible
    return new Response('Application hors ligne. Veuillez réessayer plus tard.', {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
};

// Route pour la navigation (pages HTML)
registerRoute(
  ({ request }) => request.mode === 'navigate',
  navigationHandler
);

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

// ====== MESSAGE HANDLING ======

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Permettre au client de demander la mise en cache de ressources
  if (event.data && event.data.type === 'CACHE_URLS') {
    const urls = event.data.urls;
    caches.open(CACHE_NAME).then((cache) => {
      cache.addAll(urls);
    });
  }
});

// ====== NOTIFICATION CLICK ======

self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked');
  event.notification.close();
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      // Si une fenêtre est déjà ouverte, la focus
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      // Sinon, ouvrir une nouvelle fenêtre
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

console.log('🚀 Service Worker unifié chargé (PWA + Firebase + Offline Support)');
