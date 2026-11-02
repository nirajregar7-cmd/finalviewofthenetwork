const CACHE_NAME = 'the-network-v49';
const STATIC_ASSETS = ['/', '/manifest.json', '/favicon.png'];
const EXTERNAL_API_ORIGIN = 'https://the-network-12-5--thenetwork9587.replit.app';
const FIREBASE_HOSTS = new Set([
  'the-network-72bba.web.app',
  'the-network-72bba.firebaseapp.com',
  'the-network-d1d4c.web.app',
  'the-network-d1d4c.firebaseapp.com',
  'the-network-a1188.web.app',
  'the-network-a1188.firebaseapp.com',
  'the-network-44912.web.app',
  'the-network-44912.firebaseapp.com',
]);
const CLOUDFLARE_API_HOSTS = new Set([
  'the-network.co.in',
  'www.the-network.co.in',
  'the-network-1vw.pages.dev',
]);
const API_BASE = (
  self.__API_BASE__ ||
  (FIREBASE_HOSTS.has(self.location.hostname) ||
  CLOUDFLARE_API_HOSTS.has(self.location.hostname) ||
  self.location.hostname.endsWith('.the-network-1vw.pages.dev')
    ? EXTERNAL_API_ORIGIN
    : '')
).replace(/\/$/, '');

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  // Take over immediately — don't wait for old tabs to close
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Handle SKIP_WAITING message from registerSW.ts
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  // Let the browser fetch service-worker scripts directly so a stale cached
  // worker cannot prevent the app from receiving updates.
  if (url.pathname === '/sw.js' || url.pathname === '/firebase-messaging-sw.js') return;
  // Cache Storage only accepts GET requests. Let mutations pass through.
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedPage = await cache.match(event.request);
        if (cachedPage) return cachedPage;

        try {
          const response = await fetch(event.request);
          if (response.ok) await cache.put(event.request, response.clone());
          return response;
        } catch {
          return (await cache.match('/')) || Response.error();
        }
      })()
    );
    return;
  }

  const isStaticAsset = /\.(js|css|png|jpg|jpeg|svg|ico|woff2?|ttf)$/.test(url.pathname);
  if (isStaticAsset) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedAsset = await cache.match(event.request);
        if (cachedAsset) return cachedAsset;

        const response = await fetch(event.request);
        if (response.ok) await cache.put(event.request, response.clone());
        return response;
      })()
    );
    return;
  }

  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ── Push Notifications ────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'The Network', body: event.data.text() }; }

  const {
    title = 'The Network',
    body = '',
    icon = '/icons/icon-192x192.png',
    badge = '/icons/icon-72x72.png',
    tag = 'default',
    view = 'notifications',
    type = '',
    data: rawExtraData = {}
  } = data;
  let extraData = rawExtraData;
  if (typeof extraData === 'string') {
    try { extraData = JSON.parse(extraData); } catch { extraData = {}; }
  }
  // Older senders put routing IDs at the top level while newer payloads put
  // them under data. Preserve both shapes for notification clicks.
  const routingData = {
    ...(extraData && typeof extraData === 'object' ? extraData : {}),
    ...Object.fromEntries(
      ['userId', 'groupId', 'communityId', 'projectId', 'postId', 'anonymousPostId', 'connectionId']
        .filter((key) => data[key])
        .map((key) => [key, data[key]])
    ),
  };

  // Simple, universally-supported action buttons — NO type:'text', NO image
  // (those experimental fields cause showNotification to throw silently on many Android versions)
  let actions = [];
  if (type === 'message' || view === 'messages') {
    actions = [{ action: 'open', title: '💬 Open Chat' }];
  } else if (type === 'connection_request') {
    actions = [
      { action: 'accept-conn', title: '✅ Accept' },
      { action: 'open',        title: '👁 View' },
    ];
  } else if (type === 'find_people_apply') {
    actions = [{ action: 'open', title: '👀 View Request' }];
  } else if (type === 'find_people_accept') {
    actions = [{ action: 'open', title: '💬 Open Chat' }];
  } else if (type === 'group_invite') {
    actions = [{ action: 'open', title: '👥 View Invite' }];
  } else if (view === 'feed') {
    actions = [{ action: 'open', title: '📢 See Post' }];
  } else if (view === 'colleges') {
    actions = [{ action: 'open', title: '🔔 See Announcement' }];
  } else {
    actions = [{ action: 'open', title: '🔔 Open' }];
  }

  const notifOptions = {
    body,
    icon,
    badge,
    tag,
    renotify: true,
    actions,
    data: { view, type, ...routingData },
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    (async () => {
      // Check if any window is visible/focused
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const hasVisibleClient = clientList.some(c => c.visibilityState === 'visible');

      // Always send foreground payload to open windows for in-app toast + sound
      clientList.forEach(client => {
        client.postMessage({ type: 'PUSH_FOREGROUND', payload: { title, body, type, view, icon, data: extraData } });
      });

      // The visible app shows an in-app toast and its branded chime. Only show
      // an OS notification when the app is backgrounded or closed.
      if (!hasVisibleClient) {
        try {
          await self.registration.showNotification(title, notifOptions);
        } catch (e) {
          // Fallback: plain notification with no actions
          try {
            await self.registration.showNotification(title, { body, icon, badge, tag, data: { view, type, ...extraData } });
          } catch (e2) { /* nothing we can do */ }
        }
      }
    })()
  );
});

// ── Notification Click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  const action = event.action;
  const notifData = event.notification.data || {};
  event.notification.close();

  const { view, type, connectionId, userId, groupId, communityId, projectId, postId } = notifData;

  // Inline Accept Connection (no app open needed)
  if (action === 'accept-conn' && connectionId) {
    // Use absolute URL so this works when SW is served from Firebase Hosting
    const apiBase = API_BASE;
    event.waitUntil(
      fetch(`${apiBase}/api/connections/${connectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'accepted' }),
      }).then(() =>
        self.registration.showNotification('✅ Connected!', {
          body: 'Connection accepted.',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          tag: `conn-accepted-${connectionId}`,
        })
      ).catch(() => {})
    );
    return;
  }

  // Navigate to the right view for all other actions / tap
  const targetView  = view || 'notifications';
  const targetUser  = userId || null;
  const targetGroup = groupId || null;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
        client.postMessage({
            type: 'SW_NAVIGATE',
            view: targetView,
            userId: targetUser,
            groupId: targetGroup,
            communityId,
            projectId,
            postId,
          anonymousPostId: notifData.anonymousPostId,
          });
          return client.focus();
        }
      }
      if (clients.openWindow) {
        let url = `/?view=${targetView}`;
        if (targetUser)  url += `&userId=${targetUser}`;
        if (targetGroup) url += `&groupId=${targetGroup}`;
        if (communityId) url += `&communityId=${communityId}`;
        if (projectId) url += `&projectId=${projectId}`;
        if (postId) url += `&postId=${postId}`;
        return clients.openWindow(url);
      }
    })
  );
});
