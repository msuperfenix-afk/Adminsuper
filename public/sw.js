/**
 * Service Worker Oficial - Minisúper Fénix PWA
 * Soporte para instalación en Android/iOS y funcionamiento fluido
 */

const CACHE_NAME = 'adminfenix-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './logo-fenix.png',
  './pwa-192.png',
  './pwa-512.png'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Advertencia al cachear assets iniciales en SW:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activación y limpieza de versiones viejas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estrategia Network First con fallback a Cache
self.addEventListener('fetch', (event) => {
  // Ignorar peticiones que no sean GET o que sean hacia Firebase Firestore API
  if (event.request.method !== 'GET') return;
  const url = event.request.url;
  if (url.includes('firestore.googleapis.com') || url.includes('identitytoolkit')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch(() => {});
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Si es navegación HTML, retornar index.html
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
