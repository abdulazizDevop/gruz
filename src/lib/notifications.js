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
