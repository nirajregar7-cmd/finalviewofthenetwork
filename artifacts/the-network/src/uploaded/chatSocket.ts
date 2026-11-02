import { io, type Socket } from 'socket.io-client';
import { API_SERVER_ORIGIN } from '../apiOrigin';

let chatSocket: Socket | null = null;

function normalizedOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function resolveSocketOrigin(): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isReplitPreview = hostname.endsWith('.replit.dev')
      || hostname.endsWith('.replit.app');
    if (isReplitPreview && !isLocalHost) return window.location.origin;
    if (isLocalHost) {
      const configuredApiOrigin = import.meta.env.VITE_API_URL?.trim();
      return normalizedOrigin(configuredApiOrigin || window.location.origin);
    }
  }

  const configuredApiOrigin = import.meta.env.VITE_API_URL?.trim();
  return normalizedOrigin(configuredApiOrigin || API_SERVER_ORIGIN);
}

export function getChatSocket(): Socket {
  if (!chatSocket) {
    chatSocket = io(resolveSocketOrigin(), {
      path: '/socket.io/',
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 10_000,
      timeout: 10_000,
      auth: (callback) => {
        let token: string | null = null;
        try {
          token = typeof window === 'undefined'
            ? null
            : window.localStorage.getItem('network_auth_token');
        } catch {
          token = null;
        }
        callback({ token });
      },
    });
  }

  return chatSocket;
}
