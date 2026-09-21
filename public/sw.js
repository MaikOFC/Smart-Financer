// SmartFinancer Service Worker for PWA, APK & Share Target Support
const CACHE_NAME = 'smartfinancer-v5';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
  '/favicon.png',
  '/logo.png',
  '/logosmartfincancer.png'
];

// Helper to open IndexedDB for PWA Web Share Target
function openShareDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('smartfin_pwa_share_db', 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('shared_items')) {
        db.createObjectStore('shared_items', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function saveSharedData(item) {
  return openShareDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('shared_items', 'readwrite');
      const store = tx.objectStore('shared_items');
      store.put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pre-cache partial failure:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // --- SHARE TARGET INTERCEPTOR (Nubank / Outros Bancos) ---
  if (url.pathname === '/share-target' || url.pathname.endsWith('/share-target')) {
    if (event.request.method === 'POST') {
      event.respondWith(
        (async () => {
          try {
            const formData = await event.request.formData();
            const title = formData.get('title') || '';
            const text = formData.get('text') || '';
            const sharedUrl = formData.get('url') || '';

            // Collect all files uploaded (PDFs, Images, etc.)
            const files = [];
            for (const [key, value] of formData.entries()) {
              if (value && typeof value === 'object' && ('size' in value || value instanceof Blob)) {
                files.push(value);
              }
            }

            const item = {
              id: 'share_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
              timestamp: Date.now(),
              title: typeof title === 'string' ? title : '',
              text: typeof text === 'string' ? text : '',
              url: typeof sharedUrl === 'string' ? sharedUrl : '',
              files: files,
            };

            await saveSharedData(item);
            return Response.redirect('/?shared_target=1', 303);
          } catch (err) {
            console.error('[SW] Erro ao processar share-target POST:', err);
            return Response.redirect('/?shared_target_error=1', 303);
          }
        })()
      );
      return;
    }

    if (event.request.method === 'GET') {
      event.respondWith(
        (async () => {
          try {
            const title = url.searchParams.get('title') || '';
            const text = url.searchParams.get('text') || '';
            const sharedUrl = url.searchParams.get('url') || '';

            if (title || text || sharedUrl) {
              const item = {
                id: 'share_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
                timestamp: Date.now(),
                title,
                text,
                url: sharedUrl,
                files: [],
              };
              await saveSharedData(item);
            }
            return Response.redirect('/?shared_target=1', 303);
          } catch (err) {
            console.error('[SW] Erro ao processar share-target GET:', err);
            return Response.redirect('/?shared_target_error=1', 303);
          }
        })()
      );
      return;
    }
  }

  // Only handle GET requests for asset caching
  if (event.request.method !== 'GET') return;

  // Skip API or external non-http schemes
  if (url.pathname.startsWith('/api') || !url.protocol.startsWith('http')) {
    return;
  }

  // Network-first strategy for document/HTML navigation, cache-first for assets
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // Stale-while-revalidate for images, scripts, stylesheets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          // offline fallback
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});
