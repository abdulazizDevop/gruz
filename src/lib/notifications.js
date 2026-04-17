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

export const showBrowserNotification = (title, options = {}) => {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return null;
  try {
    const n = new Notification(title, {
      icon: '/doorman-logo.png',
      badge: '/doorman-logo.png',
      silent: false,
      ...options,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
    return n;
  } catch {
    return null;
  }
};
