// Baked-in build version. Vite's `define` swaps this at build time; dev
// mode gets the string "dev" so the update gate never fires locally.
export const APP_VERSION =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'

// Fetches /version.json from the server (never from cache — Caddy is
// configured to serve it with no-store, and we also request no-store
// here as belt-and-braces). Returns the server's version string, or
// null if the fetch fails / times out / returns garbage — in that
// case we trust the running bundle rather than showing a false
// "outdated" alarm when the client is just offline.
export const fetchServerVersion = async (timeoutMs = 6000) => {
  if (APP_VERSION === 'dev') return null
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch('/version.json?_=' + Date.now(), {
      cache: 'no-store',
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) return null
    const data = await res.json()
    if (!data || typeof data.version !== 'string') return null
    return data.version
  } catch (err) {
    clearTimeout(timeout)
    return null
  }
}

// Hard reset: unregister every SW, delete every cache, then reload from
// the network. This is what the "Обновить" button on the block screen
// runs — clients whose SW has poisoned their cache with HTML at
// /assets/*.js get unwedged in one step, no manual "clear site data".
export const hardReset = async () => {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister().catch(() => {})))
    }
  } catch {
    // ignore
  }
  try {
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => {})))
    }
  } catch {
    // ignore
  }
  // Cache-busting reload — hard-loads index.html and every referenced
  // hashed asset from the network. Uses location.replace so iOS bfcache
  // can't "resume" the old tab from memory instead of doing a real
  // network fetch.
  const bust = window.location.pathname + '?_v=' + Date.now()
  window.location.replace(bust)
}
