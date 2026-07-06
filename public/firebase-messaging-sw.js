// Firebase Cloud Messaging service worker.
// Runs alongside the app's own service-worker.js — this one handles push
// messages when the tab is closed or backgrounded.
// The Firebase SDK auto-registers this file at /firebase-messaging-sw.js.

importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBaVT1wtUr30hf_kWzM99uX2o7iNyW0Nco',
  authDomain: 'gruz-azhab.firebaseapp.com',
  projectId: 'gruz-azhab',
  storageBucket: 'gruz-azhab.firebasestorage.app',
  messagingSenderId: '417648175698',
  appId: '1:417648175698:web:f5683ecce50c2c6ec90d8b',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
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

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    }),
  );
});
