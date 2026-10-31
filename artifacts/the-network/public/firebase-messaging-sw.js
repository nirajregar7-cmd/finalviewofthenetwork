// Firebase Messaging Service Worker
// Handles FCM push notifications when the app is closed or in the background

importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAz60-u1yWkbBDvBlk5ahAldyvvrEncF7w",
  authDomain: "the-netwowrk.firebaseapp.com",
  projectId: "the-netwowrk",
  storageBucket: "the-netwowrk.firebasestorage.app",
  messagingSenderId: "769267753662",
  appId: "1:769267753662:web:113b204468f44149f9b4ef",
});

const messaging = firebase.messaging();

// Called when a background/closed FCM message arrives
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM SW] Background message received:', payload);

  // Notification payloads are displayed automatically by Firebase. Do not
  // display them a second time from this handler. New backend messages are
  // data-only and continue through the custom renderer below.
  if (payload.notification) return;

  const data = payload.data || {};
  const notif = payload.notification || {};

  const title  = data.title  || notif.title  || 'The Network';
  const body   = data.body   || notif.body   || '';
  const icon   = data.icon   || notif.icon   || '/icons/icon-192x192.png';
  const badge  = data.badge  || '/icons/icon-72x72.png';
  // The server supplies a unique tag/message ID for every chat message.
  // Never reuse a tag for repeated text such as 100 separate "hi" messages:
  // reusing it would replace the old Android notification.
  const messageId = data.messageId || '';
  const tag    = data.tag || (messageId ? `message-${messageId}` : `network-${Date.now()}`);
  const type   = data.type   || '';
  const view   = data.view   || 'notifications';

  // Action buttons based on notification type
  let actions = [];
  if (type === 'message') {
    actions = [{ action: 'open_chat', title: '💬 Open Chat' }];
  } else if (type === 'connection_request') {
    actions = [
      { action: 'accept_conn', title: '✅ Accept' },
      { action: 'open_app',    title: '👁 View' },
    ];
  } else {
    actions = [{ action: 'open_app', title: '🔔 Open' }];
  }

  return self.registration.showNotification(title, {
    body,
    icon,
    badge,
    tag,
    renotify: true,
    vibrate: [200, 100, 200],
    data: { ...data, view, type },
    actions,
  });
});

// Handle notification click — open/focus the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const view = data.view || 'notifications';
  const params = new URLSearchParams({ view });
  if (data.userId) params.set('userId', data.userId);
  if (data.groupId) params.set('groupId', data.groupId);
  if (data.communityId) params.set('communityId', data.communityId);
  if (data.projectId) params.set('projectId', data.projectId);
  if (data.postId) params.set('postId', data.postId);
  const url = `${self.location.origin}/?${params.toString()}`;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.postMessage({
            type: 'SW_NAVIGATE',
            view,
            userId: data.userId,
            communityId: data.communityId,
            projectId: data.projectId,
            postId: data.postId,
            groupId: data.groupId,
            anonymousPostId: data.anonymousPostId,
          });
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
