import crypto from 'crypto';

const VAPID_PRIVATE_KEY_BYTES = 32;
const VAPID_PUBLIC_KEY_BYTES = 65;

function decodeBase64Url(value: string): Buffer {
  return Buffer.from(value.replace(/\s+/g, ''), 'base64url');
}

/**
 * Derive the uncompressed P-256 public key used by Web Push from a VAPID
 * private key. The returned value is URL-safe base64, as required by
 * PushManager and web-push.
 */
export function deriveVapidPublicKey(privateKey: string): string {
  const privateBytes = decodeBase64Url(privateKey);
  if (privateBytes.length !== VAPID_PRIVATE_KEY_BYTES) {
    throw new Error('VAPID private key must decode to 32 bytes');
  }
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.setPrivateKey(privateBytes);
  const publicBytes = ecdh.getPublicKey(undefined, 'uncompressed');
  if (publicBytes.length !== VAPID_PUBLIC_KEY_BYTES) {
    throw new Error('VAPID public key must decode to 65 bytes');
  }
  return publicBytes.toString('base64url');
}

export function normalizeVapidKey(value: string): string {
  return value.replace(/\s+/g, '');
}

export function vapidKeysMatch(publicKey: string, privateKey: string): boolean {
  return normalizeVapidKey(publicKey) === deriveVapidPublicKey(privateKey);
}