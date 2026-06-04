// ============================================================
// FlashMind Service Worker — v1.6
// Stratégie : Cache First avec mise à jour en arrière-plan
//
// Fonctionnement :
// 1. Installation : met en cache index.html
// 2. Fetch : sert depuis le cache si disponible (offline ok)
//    puis met à jour le cache en arrière-plan (réseau disponible)
// 3. Activation : supprime les anciens caches
// ============================================================

const CACHE_NAME = 'flashmind-v1.6';
const ASSETS = ['/FLASHCARD/'];

// ── INSTALL : mise en cache initiale ──────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()) // Activation immédiate sans attendre
  );
});

// ── ACTIVATE : nettoyage des anciens caches ───────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim()) // Prend le contrôle immédiatement
  );
});

// ── FETCH : Cache First + mise à jour arrière-plan ────────
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non-GET et les requêtes vers IndexedDB/API
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('indexeddb')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(event.request).then(cached => {
        // Mise à jour en arrière-plan si réseau disponible
        const fetchPromise = fetch(event.request)
          .then(response => {
            if (response && response.status === 200 && response.type !== 'opaque') {
              cache.put(event.request, response.clone());
            }
            return response;
          })
          .catch(() => null); // Silencieux si hors ligne

        // Retourner le cache immédiatement si disponible, sinon attendre le réseau
        return cached || fetchPromise;
      })
    )
  );
});

// ── MESSAGE : forcer la mise à jour depuis l'app ──────────
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
