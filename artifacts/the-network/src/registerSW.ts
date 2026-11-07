export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV) return;

  // Keep the worker URL versioned so a CDN cannot reuse a cached worker body.
  const serviceWorkerUrl = '/sw.js?app-shell=v60';

  const register = async () => {
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    try {
      const expectedWorkerUrl = new URL(serviceWorkerUrl, window.location.href).href;
      const registrations = await navigator.serviceWorker.getRegistrations();
      const staleAppRegistrations = registrations.filter((registration) =>
        [registration.active, registration.waiting, registration.installing].some((worker) => {
          if (!worker) return false;
          const workerUrl = new URL(worker.scriptURL);
          return workerUrl.origin === window.location.origin &&
            workerUrl.pathname === '/sw.js' &&
            worker.scriptURL !== expectedWorkerUrl;
        }),
      );
      if (staleAppRegistrations.length > 0) {
        await Promise.all(staleAppRegistrations.map((registration) => registration.unregister()));
        window.location.reload();
        return;
      }

      const reg = await navigator.serviceWorker.register(serviceWorkerUrl, { updateViaCache: 'none' });
      console.log('[PWA] Service worker registered:', reg.scope);

      const skipWaitingWhenInstalled = (worker: ServiceWorker | null) => {
        if (!worker) return;
        const skipWaiting = () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            worker.postMessage({ type: 'SKIP_WAITING' });
          }
        };
        skipWaiting();
        worker.addEventListener('statechange', skipWaiting);
      };

      reg.addEventListener('updatefound', () => skipWaitingWhenInstalled(reg.installing));
      skipWaitingWhenInstalled(reg.waiting);
      if (reg.installing) skipWaitingWhenInstalled(reg.installing);
      void reg.update().catch((error: unknown) => {
        console.warn('[PWA] Service worker update check failed:', error);
      });
    } catch (err) {
      console.warn('[PWA] Service worker registration failed:', err);
    }
  };

  if (document.readyState === 'complete') {
    void register();
  } else {
    window.addEventListener('load', () => void register(), { once: true });
  }
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
