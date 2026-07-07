import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    // Guard against a controllerchange loop caused by anything registering a
    // competing SW at the origin scope — we've been bitten by this once when
    // an FCM SW briefly co-existed with the app SW. sessionStorage survives
    // the reload, so a second controllerchange within the same tab session
    // is a strong signal something is churning and we should stop reloading.
    try {
      if (sessionStorage.getItem('doorman_sw_reloaded') === '1') {
        console.warn('[sw] skipping reload — controllerchange fired again');
        return;
      }
      sessionStorage.setItem('doorman_sw_reloaded', '1');
    } catch {
      // sessionStorage may be unavailable (private mode) — fall through and
      // let the in-memory `refreshing` flag handle single-fire per page load.
    }
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((reg) => {
        if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        reg.addEventListener('updatefound', () => {
          const sw = reg.installing;
          if (!sw) return;
          sw.addEventListener('statechange', () => {
            if (sw.state === 'installed' && navigator.serviceWorker.controller) {
              sw.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch((err) => console.warn('SW registration failed', err));

    // Best-effort cleanup: if a browser previously installed the standalone
    // /firebase-messaging-sw.js, unregister it explicitly. The stub file we
    // ship now self-unregisters on activate, but this covers the case where
    // the browser never fetches the updated stub because it's cached.
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => {
        for (const r of regs) {
          const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || '';
          if (url.endsWith('/firebase-messaging-sw.js')) {
            r.unregister().catch(() => {});
          }
        }
      })
      .catch(() => {});
  });
}
