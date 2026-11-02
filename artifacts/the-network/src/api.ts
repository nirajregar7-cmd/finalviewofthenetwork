import type { Community } from './types';
import { API_SERVER_ORIGIN } from './apiOrigin';

// Replit Preview serves the API on the same origin by default. External static
// builds can set VITE_API_URL to the persistent API host so REST and Socket.IO
// use the same Neon-backed service.
const _firebaseHosts = [
  'the-network.web.app',
  'the-netwowrk.web.app',
  'the-network-72bba.web.app',
  'the-network-72bba.firebaseapp.com',
  'the-network-d1d4c.web.app',
  'the-network-d1d4c.firebaseapp.com',
  'the-network-a1188.web.app',
  'the-network-a1188.firebaseapp.com',
  'the-network-44912.web.app',
  'the-network-44912.firebaseapp.com',
];
const _hostname = typeof window !== 'undefined' ? window.location.hostname : '';
export const IS_FIREBASE_HOST = _firebaseHosts.includes(_hostname);
const _isFirebase = IS_FIREBASE_HOST;
const _cloudflareHosts = [
  'the-network.co.in',
  'www.the-network.co.in',
  'the-network-1vw.pages.dev',
];
export const IS_STATIC_SITE_HOST = IS_FIREBASE_HOST ||
  _cloudflareHosts.includes(_hostname) ||
  _hostname.endsWith('.the-network-1vw.pages.dev');
const _isCloudflarePagesHost = typeof window !== 'undefined' && (
  _cloudflareHosts.includes(_hostname) ||
  _hostname.endsWith('.the-network-1vw.pages.dev')
);
const _isReplitPreviewHost = typeof window !== 'undefined' && (
  _hostname.endsWith('.replit.dev') ||
  _hostname.endsWith('.replit.app')
);
const DEFAULT_API_ORIGIN = (import.meta.env.VITE_API_URL || API_SERVER_ORIGIN).replace(/\/$/, '');
export const API_BACKEND = DEFAULT_API_ORIGIN;
export const PUBLIC_APP_URL = 'https://www.the-network.co.in';
// API_ORIGIN: the root of the backend (no /api suffix). Use for image URLs.
const _configuredApiOrigin = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, '');
export const API_ORIGIN = _isCloudflarePagesHost
  ? DEFAULT_API_ORIGIN
  : (!_isReplitPreviewHost && _configuredApiOrigin)
    || (_isFirebase ? API_BACKEND : '');

const REMOVED_COMMUNITY_ID = 'college-k-ramakrishnan-college-of-engineering';
const REMOVED_COMMUNITY_NAME = 'k ramakrishnan college of engineering';

export function isRemovedCommunity(community: { id?: unknown; name?: unknown } | null | undefined): boolean {
  return community?.id === REMOVED_COMMUNITY_ID ||
    String(community?.name || '').trim().toLowerCase() === REMOVED_COMMUNITY_NAME;
}

export function filterVisibleCommunities<T extends { id?: unknown; name?: unknown }>(communities: T[]): T[] {
  return communities.filter(community => !isRemovedCommunity(community));
}

import { buildHomeFeedPath, HOME_FEED_PAGE_SIZE, type HomeFeedFilter } from './uploaded/homeFeed';

export interface WorkshopParticipant {
  networkId: string;
  name: string;
  email: string;
  college: string;
  schoolName: string;
  branch: string;
  year: number;
  registeredAt: string;
}

export interface HostedWorkshop {
  id: string;
  title: string;
  description: string;
  scheduledDate: string;
  venue: string;
  isOnline: boolean;
  isHost: boolean;
  hostName: string;
  participantCount: number;
  registered: boolean;
  createdAt: string;
}

// API responses may contain relative media paths because the Replit-hosted
// app serves its API and frontend from one origin. Firebase Hosting serves
// only the frontend, so API media paths must be sent to the backend origin.
export function resolveAssetUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (value.startsWith('/api/')) return `${API_ORIGIN}${value}`;

  try {
    const assetUrl = new URL(value);
    const currentApiUrl = new URL(API_ORIGIN || API_BACKEND);
    if (
      assetUrl.pathname.startsWith('/api/') &&
      assetUrl.hostname.endsWith('.replit.app') &&
      assetUrl.origin !== currentApiUrl.origin
    ) {
      return new URL(
        `${assetUrl.pathname}${assetUrl.search}${assetUrl.hash}`,
        currentApiUrl,
      ).toString();
    }
  } catch {
    // Non-URL asset values, such as data URLs, should pass through unchanged.
  }

  return value;
}

const BASE = API_ORIGIN + '/api';

// ─── Session tracking ────────────────────────────────────────────────────────
// Keeps a single active sessionId in memory for the tab lifetime.
let _activeSessionId: string | null = null;
let _heartbeatTimer: ReturnType<typeof setInterval> | null = null;

export const sessionTracker = {
  start: async (userId: string) => {
    try {
      const data = await request('POST', '/sessions/start', { userId, userAgent: navigator.userAgent });
      _activeSessionId = data.sessionId;
      if (_heartbeatTimer) clearInterval(_heartbeatTimer);
      _heartbeatTimer = setInterval(() => {
        if (_activeSessionId) request('POST', `/sessions/${_activeSessionId}/heartbeat`, {}).catch(() => {});
      }, 30_000);
    } catch { /* silent */ }
  },
  end: async () => {
    if (!_activeSessionId) return;
    if (_heartbeatTimer) { clearInterval(_heartbeatTimer); _heartbeatTimer = null; }
    try { await request('POST', `/sessions/${_activeSessionId}/end`, {}); } catch { /* silent */ }
    _activeSessionId = null;
  },
};
// ─────────────────────────────────────────────────────────────────────────────

async function request(method: string, path: string, body?: any) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = typeof window !== 'undefined' ? localStorage.getItem('network_auth_token') : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    cache: method === 'GET' ? 'no-store' : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await res.json()
    : null;
  if (!data) {
    throw new ApiRequestError(
      res.ok
        ? 'The API returned an unexpected response.'
        : 'The Network API is unavailable. Please try again shortly.',
      res.status,
    );
  }
  if (!res.ok) throw new ApiRequestError(data.error || `HTTP ${res.status}`, res.status);
  if (
    typeof window !== 'undefined' &&
    typeof data.token === 'string' &&
    path.startsWith('/auth/')
  ) {
    localStorage.setItem('network_auth_token', data.token);
  }
  if (typeof window !== 'undefined' && path === '/auth/logout') {
    localStorage.removeItem('network_auth_token');
  }
  return data;
}

const get = (path: string) => request('GET', path);
const post = (path: string, body: any) => request('POST', path, body);
const put = (path: string, body: any) => request('PUT', path, body);
const del = (path: string) => request('DELETE', path);

/**
 * Fetch-based SSE keeps the session bearer token in an Authorization header.
 * Native EventSource cannot set headers, so using it against authenticated
 * routes causes a silent 401/reconnect loop.
 */
export class AuthenticatedEventStream {
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  private closed = false;
  private abortController: AbortController | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private resolveRetry: (() => void) | null = null;
  private retryDelay = 500;

  constructor(private readonly url: string) {
    void this.connect();
  }

  close() {
    this.closed = true;
    this.abortController?.abort();
    if (this.retryTimer !== null) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.resolveRetry?.();
    this.resolveRetry = null;
  }

  private dispatch(block: string) {
    let eventName = '';
    const data: string[] = [];
    for (const line of block.split(/\r?\n/)) {
      if (!line || line.startsWith(':')) continue;
      const separator = line.indexOf(':');
      const field = separator < 0 ? line : line.slice(0, separator);
      const value = separator < 0 ? '' : line.slice(separator + 1).replace(/^ /, '');
      if (field === 'event') eventName = value;
      if (field === 'data') data.push(value);
    }
    if (data.length && (!eventName || eventName === 'message')) {
      this.onmessage?.({ data: data.join('\n') } as MessageEvent<string>);
    }
  }

  private async connect() {
    while (!this.closed) {
      let token = '';
      try {
        token = typeof localStorage === 'undefined'
          ? ''
          : localStorage.getItem('network_auth_token') || '';
      } catch {
        token = '';
      }
      this.abortController = new AbortController();
      try {
        if (!token) throw new Error('A signed-in session is required for chat updates.');
        const response = await fetch(this.url, {
          method: 'GET',
          cache: 'no-store',
          headers: {
            Accept: 'text/event-stream',
            Authorization: `Bearer ${token}`,
          },
          signal: this.abortController.signal,
        });
        if (!response.ok || !response.body) {
          throw new Error(`Chat stream returned HTTP ${response.status}.`);
        }

        this.retryDelay = 500;
        this.onopen?.();
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (!this.closed) {
          const { value, done } = await reader.read();
          if (done) {
            buffer += decoder.decode();
            if (buffer.trim()) this.dispatch(buffer);
            throw new Error('Chat stream closed.');
          }
          buffer += decoder.decode(value, { stream: true });
          let boundary = buffer.search(/\r?\n\r?\n/);
          while (boundary >= 0) {
            const block = buffer.slice(0, boundary);
            const separator = buffer.slice(boundary).match(/^\r?\n\r?\n/)?.[0] || '\n\n';
            buffer = buffer.slice(boundary + separator.length);
            this.dispatch(block);
            boundary = buffer.search(/\r?\n\r?\n/);
          }
        }
      } catch (error) {
        if (this.closed) break;
        this.onerror?.(error as Event);
        await new Promise<void>((resolve) => {
          this.resolveRetry = resolve;
          this.retryTimer = setTimeout(resolve, this.retryDelay);
        });
        this.retryTimer = null;
        this.resolveRetry = null;
        this.retryDelay = Math.min(30_000, this.retryDelay * 2);
      }
    }
  }
}

export class ApiRequestError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

type PublicStats = {
  students: number;
  colleges: number;
  collegeDirectory: Array<{ name: string; students: number }>;
  schoolDirectory: Array<{ name: string; students: number }>;
};

async function getPublicStats(): Promise<PublicStats> {
  try {
    return await get('/public/stats') as PublicStats;
  } catch (error) {
    // Firebase may still point at an older published backend. Its existing
    // public SEO directory contains the same aggregate college data, so use
    // that compatibility path until the backend is republished.
    if (!_isFirebase) throw error;
    const colleges = await get('/seo/colleges') as Array<{ name: string; studentCount: number }>;
    const realColleges = colleges.filter((college) => {
      const name = college.name.trim();
      return name.length > 1 && name !== '.';
    });
    return {
      students: colleges.reduce((total, college) => total + Number(college.studentCount || 0), 0),
      colleges: realColleges.length,
      collegeDirectory: realColleges.slice(0, 24).map((college) => ({
        name: college.name,
        students: Number(college.studentCount || 0),
      })),
      schoolDirectory: [],
    };
  }
}

export const api = {
  bootstrap: () => get('/bootstrap'),
  publicStats: getPublicStats,
  sessions: {
    online: () => get('/sessions/online'),
  },
  analytics: {
    overview: () => get('/admin/analytics/overview'),
    sessions: (limit = 200) => get(`/admin/analytics/sessions?limit=${limit}`),
    userDetail: (userId: string) => get(`/admin/analytics/user/${userId}`),
    dailyActive: () => get('/admin/analytics/daily-active'),
    hourlyToday: () => get('/admin/analytics/hourly-today'),
    weeklyStats: () => get('/admin/analytics/weekly-stats'),
  },
  auth: {
    login: (email: string, password: string) => post('/auth/login', { email, password }),
    register: (data: any) => post('/auth/register', data),
    me: () => get('/auth/me'),
    logout: () => post('/auth/logout', {}),
    sendOtp: (email: string, purpose: 'login' | 'register' | 'forgot-password', data?: any) => post('/auth/send-otp', { email, purpose, data }),
    verifyOtp: (email: string, otp: string) => post('/auth/verify-otp', { email, otp }),
    resetPassword: (email: string, otp: string, newPassword: string) => post('/auth/reset-password', { email, otp, newPassword }),
    sendEmailChangeOtp: (currentEmail: string, newEmail: string) => post('/auth/send-email-change-otp', { currentEmail, newEmail }),
    confirmEmailChange: (currentEmail: string, otp: string) => post('/auth/confirm-email-change', { currentEmail, otp }),
  },
  users: {
    getAll: () => get('/users'),
    getById: (id: string) => get(`/users/${id}`),
    update: (id: string, data: any) => put(`/users/${id}`, data),
    toggleSuspend: (id: string) => put(`/users/${id}/suspend`, {}),
    resetPassword: (id: string, newPassword: string) => put(`/users/${id}/reset-password`, { newPassword }),
    bulkImport: (rows: any[]) => post('/admin/import-users', { rows }),
    recordView: (profileId: string, viewerId: string) => post(`/users/${profileId}/view`, { viewerId }),
  },
  email: {
    send: (subject: string, body: string, to?: string[], sendToAll?: boolean) =>
      post('/admin/send-email', { subject, body, to, sendToAll }),
    inbox: (userId: string) =>
      get(`/admin/email-inbox?userId=${encodeURIComponent(userId)}`),
    thread: (userId: string, threadId: string) =>
      get(`/admin/email-inbox/${encodeURIComponent(threadId)}?userId=${encodeURIComponent(userId)}`),
    reply: (userId: string, threadId: string, body: string) =>
      post('/admin/email-inbox/reply', { userId, threadId, body }),
  },
  posts: {
    getAll: () => get('/posts'),
    getForCommunity: (communityId: string) =>
      get(`/posts?communityId=${encodeURIComponent(communityId)}`),
    getFeed: (
      filter: HomeFeedFilter,
      viewerId: string,
      limit = HOME_FEED_PAGE_SIZE,
      offset = 0,
    ) => get(buildHomeFeedPath(filter, viewerId, limit, offset)),
    create: (data: any) => post('/posts', data),
    update: (id: string, data: {
      actorId: string;
      content: string;
      projectTitle?: string | null;
    }) => put(`/posts/${encodeURIComponent(id)}`, data),
    reshare: (id: string, authorId: string) =>
      post(`/posts/${encodeURIComponent(id)}/reshare`, { authorId }),
    delete: (id: string, actorId?: string) =>
      del(`/posts/${id}${actorId ? `?actorId=${encodeURIComponent(actorId)}` : ''}`),
    like: (id: string, userId: string) => post(`/posts/${id}/like`, { userId }),
    vote: (id: string, userId: string, value: 1 | -1) =>
      post(`/posts/${id}/vote`, { userId, value }),
    addComment: (
      id: string,
      authorId: string,
      content: string,
      isAnonymous = false,
      replyToId?: string | null,
    ) =>
      post(`/posts/${id}/comments`, {
        authorId,
        content,
        isAnonymous,
        ...(replyToId ? { replyToId } : {}),
      }),
    votePoll: (id: string, userId: string, optionIndex: number) =>
      post(`/posts/${id}/poll-vote`, { userId, optionIndex }),
  },
  connections: {
    getAll: () => get('/connections'),
    create: (data: any) => post('/connections', data),
    update: (id: string, status: string) => put(`/connections/${id}`, { status }),
  },
  messages: {
    getAll: () => get('/messages'),
    getForUser: (
      userId: string,
      after?: string,
      options?: { peerId?: string; beforeId?: string; limit?: number },
    ) => {
      const query = new URLSearchParams({ userId });
      if (after) query.set('after', after);
      if (options?.peerId) query.set('peerId', options.peerId);
      if (options?.beforeId) query.set('beforeId', options.beforeId);
      if (options?.limit) query.set('limit', String(options.limit));
      return get(`/messages?${query.toString()}`);
    },
    send: (
      senderId: string,
      receiverId: string,
      content: string,
      extras?: {
        attachmentName?: string;
        attachmentData?: string;
        attachmentMimeType?: string;
        pollOptions?: string[];
        clientMessageId?: string;
        replyToId?: string;
      },
    ) => post('/messages', { senderId, receiverId, content, ...extras }),
    votePoll: (messageId: string, userId: string, optionIndex: number) =>
      post(`/messages/${messageId}/poll-vote`, { userId, optionIndex }),
    toggleReaction: (messageId: string, userId: string, emoji: string) =>
      post(`/messages/${messageId}/reaction`, { userId, emoji }),
    sendAnonymous: (
      postId: string,
      senderId: string,
      content: string,
      extras?: {
        attachmentName?: string;
        attachmentData?: string;
        attachmentMimeType?: string;
        clientMessageId?: string;
      },
    ) => post('/messages/anonymous', { postId, senderId, content, ...extras }),
    markRead: (_receiverId: string, otherUserId: string) =>
      put('/messages/read', { otherUserId }),
  },
  safety: {
    getSettings: () => get('/safety/settings') as Promise<{
      directMessages: 'everyone' | 'connections' | 'nobody';
    }>,
    updateSettings: (directMessages: 'everyone' | 'connections' | 'nobody') =>
      put('/safety/settings', { directMessages }),
    block: (userId: string) => post('/safety/blocks', { userId }),
    unblock: (userId: string) => del(`/safety/blocks/${encodeURIComponent(userId)}`),
    getBlockedUsers: () => get('/safety/blocks') as Promise<Array<{
      id: string;
      name: string;
      avatar: string;
      college: string;
    }>>,
  },
  communities: {
    getAll: async (): Promise<Community[]> =>
      filterVisibleCommunities<Community>(await get('/communities') as Community[]),
    create: (data: any) => post('/communities', data),
    join: (id: string, userId: string) => post(`/communities/${id}/join`, { userId }),
    invite: (id: string, inviteUserIds: string[], actorId: string) =>
      post(`/communities/${id}/invite`, { inviteUserIds, actorId }),
    update: (id: string, data: any) => put(`/communities/${id}`, data),
    delete: (id: string, actorId?: string) =>
      del(`/communities/${id}${actorId ? `?actorId=${encodeURIComponent(actorId)}` : ''}`),
    promoteAdmin: (id: string, actorId: string, userId: string) =>
      post(`/communities/${id}/admins`, { actorId, userId }),
    demoteAdmin: (id: string, actorId: string, userId: string) =>
      del(`/communities/${id}/admins/${encodeURIComponent(userId)}?actorId=${encodeURIComponent(actorId)}`),
    blockMember: (id: string, actorId: string, userId: string) =>
      post(`/communities/${id}/blocked-members`, { actorId, userId }),
    unblockMember: (id: string, actorId: string, userId: string) =>
      del(`/communities/${id}/blocked-members/${encodeURIComponent(userId)}?actorId=${encodeURIComponent(actorId)}`),
    mergePreview: (actorId: string, sourceId: string, destinationId: string) =>
      get(`/admin/communities/merge-preview?actorId=${encodeURIComponent(actorId)}&sourceId=${encodeURIComponent(sourceId)}&destinationId=${encodeURIComponent(destinationId)}`),
    merge: (data: {
      actorId: string;
      sourceId: string;
      destinationId: string;
      sourceName: string;
      destinationName: string;
      confirmText: string;
    }) => post('/admin/communities/merge', data),
    mergeAudits: (actorId: string) =>
      get(`/admin/community-merge-audits?actorId=${encodeURIComponent(actorId)}`),
    seed: (chapters: any[]) => post('/seed/communities', { chapters }),
    votePoll: (communityId: string, pollId: string, userId: string, optionIndex: number) =>
      post(`/communities/${communityId}/polls/${pollId}/vote`, { userId, optionIndex }),
  },
  aptitude: {
    getExam: (userId: string) => get(`/aptitude/exam?userId=${encodeURIComponent(userId)}`),
    start: (userId: string) => post('/aptitude/exam/start', { userId }),
    saveAnswers: (attemptId: string, userId: string, answers: Record<string, number | null>) =>
      put(`/aptitude/exam/${encodeURIComponent(attemptId)}/answers`, { userId, answers }),
    submit: (attemptId: string, userId: string, answers: Record<string, number | null>) =>
      post('/aptitude/exam/submit', { attemptId, userId, answers }),
  },
  saved: {
    getForUser: (userId: string) => get(`/saved?userId=${encodeURIComponent(userId)}`),
    toggle: (userId: string, itemType: 'post' | 'community', itemId: string) =>
      post('/saved/toggle', { userId, itemType, itemId }),
  },
  comments: {
    delete: (id: string) => del(`/comments/${id}`),
  },
  stories: {
    getAll: () => get('/stories'),
    create: (authorId: string, content: string, image?: string) =>
      post('/stories', { authorId, content, image }),
    react: (id: string, emoji: string) => put(`/stories/${id}/react`, { emoji }),
    like: (id: string, userId: string) => post(`/stories/${id}/like`, { userId }),
    delete: (id: string) => del(`/stories/${id}`),
  },
  reports: {
    getAll: () => get('/reports'),
    create: (data: any) => post('/reports', data),
    update: (id: string, status: string) => put(`/reports/${id}`, { status }),
  },
  notifications: {
    getForUser: (userId: string) => get(`/notifications/${userId}`),
    stream: (userId: string) => new AuthenticatedEventStream(
      `${BASE}/notifications/${encodeURIComponent(userId)}/stream`,
    ),
    markRead: (id: string) => put(`/notifications/${id}/read`, {}),
    markAllRead: (userId: string) => put(`/notifications/user/${userId}/read-all`, {}),
    markConversationRead: (type: 'community' | 'study_group', conversationId: string) =>
      put('/notifications/conversation-read', { type, conversationId }),
  },
  projects: {
    getAll: () => get('/projects'),
    create: (data: any) => post('/projects', data),
    update: (id: string, data: any) => put(`/projects/${id}`, data),
    delete: (id: string) => del(`/projects/${id}`),
    join: (id: string, userId: string) => put(`/projects/${id}/join`, { userId }),
    leave: (id: string, userId: string) => put(`/projects/${id}/leave`, { userId }),
  },
  events: {
    getAll: () => get('/events'),
    create: (data: any) => post('/events', data),
    update: (id: string, data: any) => put(`/events/${id}`, data),
    delete: (id: string) => del(`/events/${id}`),
    register: (id: string, userId: string) => put(`/events/${id}/register`, { userId }),
    unregister: (id: string, userId: string) => put(`/events/${id}/unregister`, { userId }),
  },
  workshops: {
    getAll: (): Promise<{ workshops: HostedWorkshop[] }> => get('/workshops'),
    create: (data: {
      title: string;
      description: string;
      scheduledDate: string;
      venue: string;
      isOnline: boolean;
    }): Promise<HostedWorkshop> => post('/workshops', data),
    getRegistration: (id: string): Promise<{ registered: boolean; participantCount: number }> =>
      get(`/workshops/${encodeURIComponent(id)}/registration`),
    register: (id: string): Promise<{ registered: boolean; participantCount: number }> =>
      post(`/workshops/${encodeURIComponent(id)}/register`, {}),
    getParticipants: (id: string): Promise<{ participants: WorkshopParticipant[] }> =>
      get(`/workshops/${encodeURIComponent(id)}/participants`),
  },
  competitions: {
    getAll: () => get('/competitions'),
  },
  collegeCompetition: {
    get: (userId?: string) => get(`/college-competition${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`),
    createTeam: (data: { userId: string; name: string; memberIds: string[] }) =>
      post('/college-competition/teams', data),
    saveSubmission: (data: {
      userId: string;
      teamId: string;
      title: string;
      summary: string;
      githubUrl: string;
      demoUrl: string;
      videoUrl?: string;
      techStack: string[];
    }) => post('/college-competition/submissions', data),
    vote: (submissionId: string, userId: string) =>
      post(`/college-competition/submissions/${submissionId}/vote`, { userId }),
  },
  groupChats: {
    getAll: () => get('/group-chats'),
    getCommunityGroups: (communityId: string) =>
      get(`/group-chats/community/${encodeURIComponent(communityId)}`),
    create: (data: {
      name: string;
      creatorId: string;
      college: string;
      type?: string;
      branch?: string | null;
      inviteUserIds?: string[];
      communityId?: string;
      description?: string;
      purpose?: 'study' | 'chat';
      visibility?: 'public' | 'private';
      memberIds?: string[];
    }) => post('/group-chats', data),
    getPublicPreview: (id: string) =>
      get(`/group-chats/${encodeURIComponent(id)}/public-preview`),
    updateVisibility: (id: string, visibility: 'public' | 'private') =>
      put(`/group-chats/${encodeURIComponent(id)}/visibility`, { visibility }),
    joinPublicGroup: (id: string) =>
      post(`/group-chats/${encodeURIComponent(id)}/join`, {}),
    joinCommunityGroup: (id: string) =>
      post(`/group-chats/${encodeURIComponent(id)}/join`, {}),
    delete: (id: string) => del(`/group-chats/${id}`),
    accept: (id: string, userId: string) => put(`/group-chats/${id}/accept`, { userId }),
    decline: (id: string, userId: string) => put(`/group-chats/${id}/decline`, { userId }),
    invite: (id: string, inviteUserIds: string[], actorId: string) =>
      put(`/group-chats/${id}/invite`, { inviteUserIds, actorId }),
    getMessages: (id: string, options?: { beforeId?: string; limit?: number }) => {
      const query = new URLSearchParams();
      if (options?.beforeId) query.set('beforeId', options.beforeId);
      if (options?.limit) query.set('limit', String(options.limit));
      const queryString = query.toString();
      const suffix = queryString ? `?${queryString}` : '';
      return get(`/group-chats/${encodeURIComponent(id)}/messages${suffix}`);
    },
    markSeen: (id: string, upToMessageId: string) =>
      post(`/group-chats/${encodeURIComponent(id)}/seen`, { upToMessageId }),
    sendMessage: (
      id: string,
      senderId: string,
      content: string,
      extras?: {
        attachmentName?: string;
        attachmentData?: string;
        attachmentMimeType?: string;
        pollOptions?: string[];
        replyToId?: string;
        clientMessageId?: string;
      },
    ) => post(`/group-chats/${id}/messages`, { senderId, content, ...extras }),
    votePoll: (id: string, messageId: string, userId: string, optionIndex: number) =>
      post(`/group-chats/${encodeURIComponent(id)}/messages/${encodeURIComponent(messageId)}/poll-vote`, { userId, optionIndex }),
    toggleReaction: (id: string, messageId: string, userId: string, emoji: string) =>
      post(`/group-chats/${encodeURIComponent(id)}/messages/${encodeURIComponent(messageId)}/reaction`, { userId, emoji }),
    addMember: (id: string, userId: string) => put(`/group-chats/${id}/add-member`, { userId }),
    removeMember: (id: string, userId: string) => put(`/group-chats/${id}/remove-member`, { userId }),
  },
  attendance: {
    getAll: (userId: string) => get(`/attendance/${userId}`),
    create: (userId: string, name: string, targetPercent: number) =>
      post('/attendance', { userId, name, targetPercent }),
    mark: (id: string, present: boolean) => put(`/attendance/${id}/mark`, { present }),
    delete: (id: string) => del(`/attendance/${id}`),
  },
  batchGroup: {
    ensure: (userId: string) => post('/batch-group/ensure', { userId }),
  },
  collegeSettings: {
    getAll: () => get('/college-settings') as Promise<Record<string, string | null>>,
    setCover: (college: string, coverImage: string | null) =>
      put(`/college-settings/${encodeURIComponent(college)}`, { coverImage }),
  },
  collegeAdmin: {
    assign: (userId: string, college: string | null) => put('/admin/college-admin', { userId, college }),
    getAnnouncements: (college: string) => get(`/college-announcements/${encodeURIComponent(college)}`),
    createAnnouncement: (data: { college: string; authorId: string; title: string; body: string; isPinned?: boolean }) =>
      post('/college-announcements', data),
    updateAnnouncement: (id: string, data: { title?: string; body?: string; isPinned?: boolean }) =>
      put(`/college-announcements/${id}`, data),
    deleteAnnouncement: (id: string) => del(`/college-announcements/${id}`),
  },
  referral: {
    getStats: (userId: string) => get(`/referral/stats/${userId}`),
  },
  entityMessages: {
    stream: (type: 'community' | 'project', id: string, userId: string) =>
      new AuthenticatedEventStream(
        `${BASE}/entity-messages/${type}/${encodeURIComponent(id)}/stream?userId=${encodeURIComponent(userId)}`,
      ),
    get: (
      type: 'community' | 'project',
      id: string,
      userId?: string,
      options?: { beforeId?: string; limit?: number },
    ) => {
      const query = new URLSearchParams();
      if (userId) query.set('userId', userId);
      if (options?.beforeId) query.set('beforeId', options.beforeId);
      if (options?.limit) query.set('limit', String(options.limit));
      const queryString = query.toString();
      const suffix = queryString ? `?${queryString}` : '';
      return get(`/entity-messages/${type}/${encodeURIComponent(id)}${suffix}`);
    },
    send: (
      type: 'community' | 'project',
      id: string,
      senderId: string,
      content: string,
      extras?: {
        attachmentName?: string;
        attachmentData?: string;
        attachmentMimeType?: string;
        replyToId?: string;
        sharedPostId?: string;
        clientMessageId?: string;
      },
    ) => post(`/entity-messages/${type}/${encodeURIComponent(id)}`, { senderId, content, ...extras }),
    toggleReaction: (type: 'community' | 'project', id: string, messageId: string, userId: string, emoji: string) =>
      post(`/entity-messages/${type}/${encodeURIComponent(id)}/messages/${encodeURIComponent(messageId)}/reaction`, { userId, emoji }),
    markSeen: (type: 'community' | 'project', id: string, upToMessageId: string) =>
      post(`/entity-messages/${type}/${encodeURIComponent(id)}/seen`, { upToMessageId }),
  },
  collegeCommunities: {
    ensureAll: async (): Promise<Community[]> =>
      filterVisibleCommunities<Community>(await get('/college-communities') as Community[]),
  },
};
