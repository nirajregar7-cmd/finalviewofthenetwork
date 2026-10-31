/**
 * NotificationSetup — registers the device for push notifications.
 * Primary: Firebase Cloud Messaging (FCM) — works even when phone screen is off.
 * Fallback: VAPID Web Push — if FCM token fetch fails.
 */
import { useEffect, useRef } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { firebaseApp } from '../lib/firebase';
import { API_ORIGIN } from '../api';
import { getPushProviderAttempts } from './push-provider';

// Firebase Web Push certificate key (Project Settings → Cloud Messaging → Web Push certificates)
const FCM_VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY as string;
const API_BASE = API_ORIGIN + '/api';

function apiAuthHeaders(json = false): HeadersInit {
  const token = localStorage.getItem('network_auth_token');
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const bytes = new Uint8Array(rawData.length);
  for (let index = 0; index < rawData.length; index += 1) {
    bytes[index] = rawData.charCodeAt(index);
  }
  return bytes;
}

async function waitForActiveWorker(registration: ServiceWorkerRegistration): Promise<ServiceWorkerRegistration> {
  if (registration.active) return registration;

  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve();
    };
    const timeout = window.setTimeout(finish, 10000);
    const worker = registration.installing || registration.waiting;
    if (!worker) {
      registration.addEventListener('updatefound', () => {
        const nextWorker = registration.installing;
        if (!nextWorker) return;
        nextWorker.addEventListener('statechange', () => {
          if (nextWorker.state === 'activated' || registration.active) finish();
        });
      }, { once: true });
      return;
    }
    worker.addEventListener('statechange', () => {
      if (worker.state === 'activated' || registration.active) finish();
    });
  });

  return registration;
}

interface Props {
  userId: string;
  darkMode: boolean;
  onForegroundPush?: (payload: { title?: string; body?: string; type?: string; view?: string; data?: any }) => void;
}

async function showForegroundDeviceNotification(payload: {
  title?: string;
  body?: string;
  type?: string;
  view?: string;
  data?: Record<string, string>;
}) {
  // The visible app handles foreground delivery with its toast and branded
  // chime. An OS notification here would duplicate both attention signals.
  if (document.visibilityState === 'visible') return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

  const title = payload.title || 'The Network';
  const body = payload.body || '';
  const data = payload.data || {};
  const options = {
    body,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/icon-72x72.png',
    // The server supplies a unique message tag. Keep a unique fallback so
    // foreground messages can never replace one another.
    tag: data.tag || `network-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    renotify: true,
    data: { ...data, view: payload.view || data.view || 'notifications', type: payload.type || data.type || '' },
  } as NotificationOptions;

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, options);
  } catch {
    // Some browsers do not expose a ready service worker immediately after
    // permission is granted. The page-level notification still reaches the
    // device in that case.
    try { new Notification(title, options); } catch { /* unsupported */ }
  }
}

// ── FCM Token registration ─────────────────────────────────────────────────
async function registerFCM(userId: string): Promise<boolean> {
  if (!('Notification' in window) || !FCM_VAPID_KEY) {
    if (!FCM_VAPID_KEY) console.warn('[FCM] Web Push certificate key is not configured');
    return false;
  }
  try {
    const messaging = getMessaging(firebaseApp);

    // Keep the PWA worker at the root scope. FCM gets its own worker scope so
    // registering push support cannot replace the worker that controls the
    // installed app shell (this is especially important on Android).
    let swReg: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      const fcmScope = '/firebase-cloud-messaging-push-scope/';
      // Clean up the old release's conflicting root-scoped FCM registration.
      // The normal /sw.js registration remains untouched.
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations
          .filter((registration) =>
            registration.scope === `${window.location.origin}/` &&
            registration.active?.scriptURL.endsWith('/firebase-messaging-sw.js')
          )
          .map((registration) => registration.unregister())
      );
      swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: fcmScope,
        updateViaCache: 'none',
      })
        .catch(() => undefined);
      if (swReg) {
        await swReg.update().catch(() => {});
        await waitForActiveWorker(swReg);
      }
    }

    const token = await getToken(messaging, {
      vapidKey: FCM_VAPID_KEY,
      ...(swReg ? { serviceWorkerRegistration: swReg } : {}),
    });
    if (!token) { console.warn('[FCM] No token returned'); return false; }

    const res = await fetch(`${API_BASE}/push/subscribe`, {
      method: 'POST',
      headers: apiAuthHeaders(true),
      body: JSON.stringify({ userId, endpoint: token, p256dh: 'fcm', auth: 'fcm' }),
    });
    if (!res.ok) throw new Error(`subscribe failed: ${res.status}`);

    // FCM is the primary provider. Remove any older root-scoped VAPID
    // subscription on this same browser so one message cannot arrive through
    // both providers and create duplicate Android notifications.
    try {
      const rootRegistration = await navigator.serviceWorker.ready;
      const oldVapid = await rootRegistration.pushManager.getSubscription();
      if (oldVapid) {
        const oldEndpoint = oldVapid.endpoint;
        await oldVapid.unsubscribe().catch(() => false);
        await fetch(`${API_BASE}/push/subscribe`, {
          method: 'DELETE',
          headers: apiAuthHeaders(true),
          body: JSON.stringify({ endpoint: oldEndpoint }),
        }).catch(() => {});
      }
    } catch {
      // FCM registration is still valid if old VAPID cleanup is unavailable.
    }

    console.log('[FCM] Token registered ✓');
    return true;
  } catch (err) {
    console.warn('[FCM] getToken failed:', err);
    return false;
  }
}

// ── VAPID Web Push fallback ────────────────────────────────────────────────
async function registerVAPID(userId: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const keyResponse = await fetch(`${API_BASE}/push/vapid-public`, {
      cache: 'no-store',
      headers: apiAuthHeaders(),
    });
    if (!keyResponse.ok) throw new Error(`VAPID public key unavailable: ${keyResponse.status}`);
    const keyPayload = await keyResponse.json() as { publicKey?: string };
    if (!keyPayload.publicKey) throw new Error('VAPID public key unavailable');
    const keyBytes = urlBase64ToUint8Array(keyPayload.publicKey);

    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      const { endpoint, keys } = existing.toJSON() as any;
      const response = await fetch(`${API_BASE}/push/subscribe`, {
        method: 'POST',
        headers: apiAuthHeaders(true),
        body: JSON.stringify({ userId, endpoint, p256dh: keys.p256dh, auth: keys.auth }),
      });
      if (!response.ok) throw new Error(`VAPID subscription save failed: ${response.status}`);
      return true;
    }

    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes });
    const { endpoint, keys } = sub.toJSON() as any;
    const response = await fetch(`${API_BASE}/push/subscribe`, {
      method: 'POST',
      headers: apiAuthHeaders(true),
      body: JSON.stringify({ userId, endpoint, p256dh: keys.p256dh, auth: keys.auth }),
    });
    if (!response.ok) throw new Error(`VAPID subscription save failed: ${response.status}`);
    console.log('[VAPID] Subscription registered ✓');
    return true;
  } catch (err) {
    console.warn('[VAPID] subscribe failed:', err);
    return false;
  }
}

async function getPushCapabilities(): Promise<{ fcm: boolean; webPush: boolean } | null> {
  try {
    const response = await fetch(`${API_BASE}/push/capabilities`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
      headers: apiAuthHeaders(),
    });
    if (!response.ok) return null;
    const capabilities = await response.json() as { fcm?: unknown; webPush?: unknown };
    return {
      fcm: capabilities.fcm === true,
      webPush: capabilities.webPush === true,
    };
  } catch {
    return null;
  }
}

// ── Combined registration: FCM first, VAPID as fallback ───────────────────
export async function subscribePush(userId: string): Promise<boolean> {
  if (!('Notification' in window)) return false;
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return false;

  const capabilities = await getPushCapabilities();
  // Register FCM only when the backend explicitly confirms it can send FCM.
  // If capability discovery is unavailable, safely try VAPID instead.
  for (const provider of getPushProviderAttempts(capabilities, Boolean(FCM_VAPID_KEY))) {
    if (provider === 'fcm' && await registerFCM(userId)) return true;
    if (provider === 'webPush' && await registerVAPID(userId)) return true;
  }

  return false;
}

export async function sendPushTest(userId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/push/test`, {
      method: 'POST',
      headers: apiAuthHeaders(true),
      body: JSON.stringify({ userId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export default function NotificationSetup({ userId, onForegroundPush }: Props) {
  const lastSyncRef = useRef<number>(0);
  const messagingListenerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

    const sync = () => {
      const now = Date.now();
      if (now - lastSyncRef.current < 60_000) return;
      lastSyncRef.current = now;

      const perm = Notification.permission;
      if (perm === 'granted') {
        subscribePush(userId).catch(() => {});
      }
    };

    sync();
    const onVisible = () => { if (document.visibilityState === 'visible') sync(); };
    document.addEventListener('visibilitychange', onVisible);

    // ── FCM foreground message handler ──────────────────────────────────────
    // When app is open, FCM doesn't auto-show a notification — we show our toast instead
    try {
      const messaging = getMessaging(firebaseApp);
      const unsub = onMessage(messaging, (payload) => {
        console.log('[FCM] Foreground message:', payload);
        const data = (payload.data || {}) as Record<string, string>;
        const notif = payload.notification || {};
        const foregroundPayload = {
          title: data.title || notif.title,
          body: data.body || notif.body,
          type: data.type,
          view: data.view,
          data,
        };

        // FCM does not display notification payloads automatically while the
        // page is focused. Show a real OS notification as well as the in-app
        // toast so messages are visible on the phone even when the user is
        // currently inside another part of the app.
        showForegroundDeviceNotification(foregroundPayload).catch(() => {});
        if (onForegroundPush) {
          onForegroundPush(foregroundPayload);
        }
      });
      messagingListenerRef.current = unsub;
    } catch { /* messaging not supported in this browser */ }

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      messagingListenerRef.current?.();
    };
  }, [userId]);

  return null;
}
