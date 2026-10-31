export type PushProviderCapabilities = {
  fcm: boolean;
  webPush: boolean;
};

export type PushProvider = 'fcm' | 'webPush';

export function getPushProviderAttempts(
  capabilities: PushProviderCapabilities | null,
  hasFcmVapidKey: boolean,
): PushProvider[] {
  const providers: PushProvider[] = [];

  if (capabilities?.fcm && hasFcmVapidKey) {
    providers.push('fcm');
  }

  // An unavailable capabilities endpoint should never cause an FCM-only
  // token to be stored. VAPID registration verifies its own backend endpoint.
  if (!capabilities || capabilities.webPush) {
    providers.push('webPush');
  }

  return providers;
}
