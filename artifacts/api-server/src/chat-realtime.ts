import { createHash } from 'node:crypto';
import type { Server as HttpServer } from 'node:http';
import { eq } from 'drizzle-orm';
import { Server as SocketIOServer, type Socket } from 'socket.io';
import {
  communities,
  groupChats,
  projects,
} from '@workspace/db/schema';
import { db, pool } from './db.js';

const userRoom = (userId: string) => `user:${userId}`;
const groupRoom = (groupId: string) => `group:${groupId}`;
const entityRoom = (type: 'community' | 'project', id: string) =>
  `entity:${type}:${id}`;

const allowedOrigins = new Set([
  'https://the-network.web.app',
  'https://the-netwowrk.web.app',
  'https://the-network-72bba.web.app',
  'https://the-network-72bba.firebaseapp.com',
  'https://the-network-d1d4c.web.app',
  'https://the-network-d1d4c.firebaseapp.com',
  'https://the-network-44912.web.app',
  'https://the-network-44912.firebaseapp.com',
  'https://the-network.co.in',
  'https://www.the-network.co.in',
  'https://the-network-1vw.pages.dev',
  'https://www.the-network-1vw.pages.dev',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

function isAllowedOrigin(origin?: string): boolean {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;

  try {
    const hostname = new URL(origin).hostname;
    return hostname === 'localhost'
      || hostname === '127.0.0.1'
      || hostname.endsWith('.replit.dev')
      || hostname.endsWith('.replit.app')
      || hostname.endsWith('.the-network-1vw.pages.dev');
  } catch {
    return false;
  }
}

function readString(value: unknown, maxLength = 180): string | null {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength
    ? value
    : null;
}

function isMember(memberIds: unknown, userId: string): boolean {
  return Array.isArray(memberIds) && memberIds.some((memberId) => String(memberId) === userId);
}

function asWireMessage(message: Record<string, any>): Record<string, any> {
  return {
    ...message,
    ...(message.createdAt instanceof Date
      ? { createdAt: message.createdAt.toISOString() }
      : {}),
  };
}

async function authorizeSharedRoom(
  socket: Socket,
  request: unknown,
): Promise<string | null> {
  if (!request || typeof request !== 'object') return null;

  const value = request as Record<string, unknown>;
  const type = value.type;
  const id = readString(value.id);
  const userId = socket.data.userId as string | undefined;
  if (!id || !userId) return null;

  if (type === 'group') {
    const [group] = await db
      .select({ memberIds: groupChats.memberIds })
      .from(groupChats)
      .where(eq(groupChats.id, id))
      .limit(1);
    return group && isMember(group.memberIds, userId) ? groupRoom(id) : null;
  }

  if (type === 'community') {
    const [community] = await db
      .select({ memberIds: communities.memberIds })
      .from(communities)
      .where(eq(communities.id, id))
      .limit(1);
    return community && isMember(community.memberIds, userId)
      ? entityRoom('community', id)
      : null;
  }

  if (type === 'project') {
    const [project] = await db
      .select({ creatorId: projects.creatorId, memberIds: projects.memberIds })
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);
    return project && (
      project.creatorId === userId || isMember(project.memberIds, userId)
    )
      ? entityRoom('project', id)
      : null;
  }

  return null;
}

export function attachChatRealtime(httpServer: HttpServer): void {
  const io = new SocketIOServer(httpServer, {
    path: '/socket.io/',
    cors: {
      origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
      methods: ['GET', 'POST'],
    },
    allowRequest: (request, callback) => {
      const origin = request.headers.origin;
      const allowed = isAllowedOrigin(typeof origin === 'string' ? origin : undefined);
      callback(allowed ? null : 'Origin not allowed', allowed);
    },
    maxHttpBufferSize: 16 * 1024 * 1024,
  });

  io.use(async (socket, next) => {
    const token = readString(socket.handshake.auth?.token, 512);
    if (!token || !/^[A-Za-z0-9_-]{32,}$/.test(token)) {
      next(new Error('Authentication required'));
      return;
    }

    try {
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const result = await pool.query<{
        user_id: string;
        is_suspended: boolean;
      }>(
        `SELECT s.user_id, u.is_suspended
         FROM auth_sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = $1
           AND s.revoked_at IS NULL
           AND s.expires_at > NOW()
         LIMIT 1`,
        [tokenHash],
      );
      const session = result.rows[0];

      if (!session || session.is_suspended) {
        next(new Error('Authentication required'));
        return;
      }

      socket.data.userId = session.user_id;
      next();
    } catch {
      next(new Error('Authentication unavailable'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    void socket.join(userRoom(userId));

    socket.on('chat:join', (request: unknown, acknowledge?: (result: {
      ok: boolean;
      error?: string;
    }) => void) => {
      void authorizeSharedRoom(socket, request)
        .then(async (room) => {
          if (!room) {
            acknowledge?.({ ok: false, error: 'You are not a member of this chat.' });
            return;
          }
          await socket.join(room);
          acknowledge?.({ ok: true });
        })
        .catch(() => acknowledge?.({ ok: false, error: 'Could not join this chat.' }));
    });

    socket.on('chat:leave', (request: unknown) => {
      if (!request || typeof request !== 'object') return;
      const value = request as Record<string, unknown>;
      const id = readString(value.id);
      if (!id) return;

      if (value.type === 'group') {
        void socket.leave(groupRoom(id));
      } else if (value.type === 'community' || value.type === 'project') {
        void socket.leave(entityRoom(value.type, id));
      }
    });
  });

  chatSocketServer = io;
}

let chatSocketServer: SocketIOServer | null = null;

export function emitDirectMessage(message: Record<string, any>): void {
  if (!message.id || !message.senderId || !message.receiverId) return;
  const wireMessage = asWireMessage(message);
  const recipients = new Set([String(message.senderId), String(message.receiverId)]);
  for (const recipientId of recipients) {
    chatSocketServer?.to(userRoom(recipientId)).emit('chat:direct-event', wireMessage);
  }
}

export function emitDirectEvent(userId: string, event: Record<string, any>): void {
  chatSocketServer?.to(userRoom(userId)).emit('chat:direct-event', event);
}

function emitConversationActivity(
  type: 'community' | 'study_group',
  id: string,
  memberIds: string[],
  message: Record<string, any>,
): void {
  if (!message.id || !message.senderId || !message.createdAt) return;
  const createdAt = message.createdAt instanceof Date
    ? message.createdAt.toISOString()
    : String(message.createdAt);
  const preview = message.sharedPost
    ? 'Shared a post'
    : String(message.content || '').trim() ||
      (typeof message.attachmentMimeType === 'string' && message.attachmentMimeType.startsWith('image/')
        ? 'Photo'
        : String(message.attachmentName || 'Attachment'));
  const activity = {
    type,
    id,
    messageId: String(message.id),
    senderId: String(message.senderId),
    createdAt,
    preview,
    isNewMessage: true,
  };

  for (const userId of new Set(memberIds.filter((memberId) => typeof memberId === 'string' && memberId))) {
    chatSocketServer?.to(userRoom(userId)).emit('chat:conversation-activity', activity);
  }
}

export function emitGroupMessage(
  groupId: string,
  message: Record<string, any>,
  memberIds?: string[],
  isNewMessage = false,
): void {
  chatSocketServer?.to(groupRoom(groupId)).emit('chat:shared-message', asWireMessage(message));
  if (isNewMessage && memberIds?.length) {
    emitConversationActivity('study_group', groupId, memberIds, message);
  }
}

export function emitEntityMessage(
  groupId: string,
  message: Record<string, any>,
  memberIds?: string[],
  isNewMessage = false,
): void {
  const [type, id] = groupId.split(':', 2);
  if ((type !== 'community' && type !== 'project') || !id) return;
  chatSocketServer
    ?.to(entityRoom(type, id))
    .emit('chat:shared-message', asWireMessage(message));
  if (type === 'community' && isNewMessage && memberIds?.length) {
    emitConversationActivity('community', id, memberIds, message);
  }
}
