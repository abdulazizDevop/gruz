const CACHE_NAME = 'doorman-v8';
const APP_SHELL = ['/favicon.svg', '/doorman-logo.png', '/manifest.json'];

// Firebase Cloud Messaging — background push handler. Loaded via importScripts
// because CDN modules aren't allowed in a classic SW. Kept in THIS file (not a
// separate firebase-messaging-sw.js) so we only have one SW at the origin
// scope — registering two SWs there causes them to churn each other and
// trigger an infinite controllerchange→reload loop.
try {
  importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');
  if (!self.firebase.apps.length) {
    self.firebase.initializeApp({
      apiKey: 'AIzaSyBaVT1wtUr30hf_kWzM99uX2o7iNyW0Nco',
      authDomain: 'gruz-azhab.firebaseapp.com',
      projectId: 'gruz-azhab',
      storageBucket: 'gruz-azhab.firebasestorage.app',
      messagingSenderId: '417648175698',
      appId: '1:417648175698:web:f5683ecce50c2c6ec90d8b',
    });
  }
  const _fcmMessaging = self.firebase.messaging();
  _fcmMessaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || 'DoorMan';
    const body = payload.notification?.body || '';
    const tag = payload.data?.event
      ? `order-${payload.data.event}-${payload.data.orderId || ''}`
      : 'doorman-push';
    self.registration.showNotification(title, {
      body,
      icon: '/doorman-logo.png',
      badge: '/doorman-logo.png',
      vibrate: [100, 50, 100],
      tag,
      data: payload.data || {},
    });
  });
} catch (err) {
  // FCM optional — if the CDN can't be reached, the app still works, just
  // without background push. Foreground notifications keep going.
  console.warn('[sw] FCM setup failed:', err);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

const isHashedAsset = (pathname) =>
  /\/assets\/.+\.(js|css|woff2?|ttf|otf|eot|svg|png|jpg|jpeg|gif|webp)$/.test(pathname);

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/src/') || url.pathname.startsWith('/@')) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) return;
  if (url.pathname === '/service-worker.js') return;

  const accept = req.headers.get('accept') || '';
  const isHTML = req.mode === 'navigate' || accept.includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (!res || res.status !== 200) throw new Error('bad-html');
          return res;
        })
        .catch(() => caches.match('/index.html').then((r) => r || fetch('/index.html')))
    );
    return;
  }

  if (isHashedAsset(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return res;
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag } = event.data.payload || {};
    self.registration.showNotification(title || 'DoorMan', {
      body: body || '',
      icon: '/doorman-logo.png',
      badge: '/doorman-logo.png',
      tag: tag || 'doorman-notification',
      vibrate: [100, 50, 100],
      requireInteraction: false,
    });
  }
});
