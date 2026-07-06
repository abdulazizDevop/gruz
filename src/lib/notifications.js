import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { db, VAPID_KEY, getMessagingIfSupported } from './firebase';

export const isNotificationSupported = () =>
  typeof window !== 'undefined' && 'Notification' in window;

export const requestNotificationPermission = async () => {
  if (!isNotificationSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return 'denied';
  }
};

const showViaServiceWorker = async (title, options) => {
  if (!('serviceWorker' in navigator)) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return false;
    await reg.showNotification(title, options);
    return true;
  } catch {
    return false;
  }
};

export const showBrowserNotification = async (title, options = {}) => {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return null;

  const payload = {
    icon: '/doorman-logo.png',
    badge: '/doorman-logo.png',
    vibrate: [100, 50, 100],
    silent: false,
    ...options,
  };

  const viaSW = await showViaServiceWorker(title, payload);
  if (viaSW) return true;

  try {
    const n = new Notification(title, payload);
    n.onclick = () => {
      window.focus();
      n.close();
    };
    return n;
  } catch {
    return null;
  }
};

// ---- FCM push registration -------------------------------------------------
// Gets an FCM token for this device+browser and stores it on the user doc so
// the backend can push to it. Called on login; safe to call repeatedly (only
// writes when the token actually changes).

let registeredForUser = null;
let cachedToken = null;

export const registerFcmToken = async (userId) => {
  if (!userId) return null;
  if (Notification?.permission !== 'granted') return null;

  const messaging = await getMessagingIfSupported();
  if (!messaging) return null;

  try {
    let swReg = null;
    if ('serviceWorker' in navigator) {
      // Ensure the FCM SW is registered before requesting a token — this file
      // lives at /firebase-messaging-sw.js in public/. Firebase auto-registers
      // it on first getToken() call, but doing it explicitly is safer here.
      try {
        swReg = await navigator.serviceWorker.register(
          '/firebase-messaging-sw.js',
        );
      } catch (err) {
        console.warn('[fcm] failed to register messaging SW:', err);
      }
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg || undefined,
    });
    if (!token) return null;

    // Only write to Firestore if the token or the user actually changed.
    if (registeredForUser === userId && cachedToken === token) return token;
    registeredForUser = userId;
    cachedToken = token;

    try {
      await updateDoc(doc(db, 'users', userId), { fcmToken: token });
    } catch (err) {
      console.warn('[fcm] failed to save token:', err);
    }
    return token;
  } catch (err) {
    console.warn('[fcm] getToken failed:', err);
    return null;
  }
};

export const listenForegroundMessages = (handler) => {
  let unsub = () => {};
  (async () => {
    const messaging = await getMessagingIfSupported();
    if (!messaging) return;
    unsub = onMessage(messaging, (payload) => {
      try {
        handler(payload);
      } catch (err) {
        console.warn('[fcm] foreground handler threw:', err);
      }
    });
  })();
  return () => unsub();
};

// Fire-and-forget: tells the backend to send push to the order's target users
// (creator + superadmins). Silent on failure — the user still sees an in-app
// notification via the Firestore listener, so a failed push just means users
// with the app closed miss it this time.
export const notifyOrderEvent = async ({ orderId, event, actorName }) => {
  if (!orderId || !event) return;
  try {
    await fetch('/api/notify-order-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, event, actorName: actorName || '' }),
    });
  } catch (err) {
    console.warn('[fcm] notify failed:', err);
  }
};
