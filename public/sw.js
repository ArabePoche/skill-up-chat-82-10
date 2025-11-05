/**
 * Service Worker pour le mode offline
 * Cache les assets statiques et l'interface utilisateur
 */

const CACHE_NAME = 'skillup-v1';
const STATIC_CACHE = 'skillup-static-v1';

// Assets à mettre en cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('📦 Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('📦 Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Stratégie de cache : Cache First pour assets, Network First pour API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') return;

  // Ignorer les requêtes Supabase (toujours en ligne)
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  // Pour les navigations (pages), toujours servir depuis le cache en priorité
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html')
        .then((cachedResponse) => {
          if (cachedResponse) {
            console.log('📦 Serving navigation from cache');
            return cachedResponse;
          }
          return fetch(request);
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Stratégie Cache First pour les assets statiques (JS, CSS, images, fonts)
  const isStaticAsset = url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|woff|woff2|ttf|eot|ico)$/);
  
  if (isStaticAsset) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            console.log('📦 Serving static asset from cache:', url.pathname);
            return cachedResponse;
          }
          
          // Si pas en cache, télécharger et mettre en cache
          return fetch(request).then((response) => {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
            return response;
          });
        })
        .catch(() => {
          console.log('❌ Asset not available offline:', url.pathname);
          return new Response('Offline - Asset not available', {
            status: 503,
            statusText: 'Service Unavailable',
          });
        })
    );
    return;
  }

  // Pour tout le reste, Network First avec fallback cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('📦 Serving from cache:', request.url);
            return cachedResponse;
          }
          return new Response('Offline - Content not available', {
            status: 503,
            statusText: 'Service Unavailable',
          });
        });
      })
  );
});

// Écouter les messages du client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((cacheName) => {
        caches.delete(cacheName);
      });
    });
  }
});
