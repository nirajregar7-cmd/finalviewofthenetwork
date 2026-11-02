export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV) return;

  // Keep the worker URL versioned so a CDN cannot reuse a cached worker body.
  const serviceWorkerUrl = '/sw.js?app-shell=v50';

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register(serviceWorkerUrl, { updateViaCache: 'none' });
      console.log('[PWA] Service worker registered:', reg.scope);

      // Force update check immediately
      reg.update();

      // When a new SW is waiting, skip waiting so it takes over right away
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New SW installed — tell it to skip waiting
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      // When the SW takes control, reload once to get fresh content
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    } catch (err) {
      console.warn('[PWA] Service worker registration failed:', err);
    }
  });
}

export async function unregisterAppServiceWorkerForDevelopment(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const appRegistrations = registrations.filter((registration) =>
      [registration.active, registration.waiting, registration.installing].some((worker) => {
        if (!worker) return false;
        const scriptUrl = new URL(worker.scriptURL);
        return scriptUrl.origin === window.location.origin && scriptUrl.pathname === '/sw.js';
      }),
    );

    if (appRegistrations.length === 0) return false;

    const hasController = Boolean(navigator.serviceWorker.controller);
    const unregistered = await Promise.all(
      appRegistrations.map((registration) => registration.unregister()),
    );

    const appCaches = (await caches.keys()).filter((name) => name.startsWith('the-network-v'));
    await Promise.all(appCaches.map((name) => caches.delete(name)));

    return hasController && unregistered.some(Boolean);
  } catch (error) {
    console.warn('[PWA] Development service worker cleanup failed:', error);
    return false;
  }
}
