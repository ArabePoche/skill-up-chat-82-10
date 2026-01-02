/**
 * Service Worker pour le mode offline
 * Cache les assets critiques et gère les requêtes réseau
 */

const CACHE_NAME = 'educatok-cache-v1';
const OFFLINE_URL = '/offline.html';

// Assets critiques à mettre en cache immédiatement
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installation...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Mise en cache des assets critiques');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('[SW] Installation terminée');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Erreur lors de l\'installation:', error);
      })
  );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Suppression de l\'ancien cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activation terminée');
        return self.clients.claim();
      })
  );
});

// Interception des requêtes
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET et les requêtes externes
  if (request.method !== 'GET') return;
  if (!url.origin.includes(self.location.origin) && !request.url.includes('supabase')) return;

  // Stratégie: Network First avec fallback sur le cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cloner la réponse pour la mettre en cache
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            // Ne pas cacher les requêtes API Supabase
            if (!request.url.includes('supabase')) {
              cache.put(request, responseClone);
            }
          });
        }
        return response;
      })
      .catch(async () => {
        // Réseau indisponible, essayer le cache
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
          console.log('[SW] Servi depuis le cache:', request.url);
          return cachedResponse;
        }

        // Si c'est une navigation, afficher la page offline
        if (request.mode === 'navigate') {
          const offlinePage = await caches.match(OFFLINE_URL);
          if (offlinePage) {
            return offlinePage;
          }
        }

        // Retourner une réponse d'erreur générique
        return new Response('Contenu non disponible hors ligne', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain' })
        });
      })
  );
});

// Écouter les messages du client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker chargé');
