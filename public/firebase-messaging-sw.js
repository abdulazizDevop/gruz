// Deprecated. Firebase Cloud Messaging is now handled inside the main
// service-worker.js so there's only one SW registered at the origin scope
// — registering two SWs there caused a controllerchange→reload loop.
//
// This file stays as an empty stub so any browser that already installed
// it from an older deploy replaces it with a no-op instead of failing
// updates. It intentionally does nothing.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.registration.unregister().catch(() => {}),
  );
});
