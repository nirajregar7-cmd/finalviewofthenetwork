import { ReplitConnectors } from '@replit/connectors-sdk';

const connectors = new ReplitConnectors();
const CONNECTOR_NAME = 'google-mail';

type GmailHeader = {
  name?: string;
  value?: string;
};

type GmailPayload = {
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: { data?: string };
  parts?: GmailPayload[];
};

type GmailMessage = {
  id: string;
  threadId: string;
  labelIds?: string[];
  internalDate?: string;
  snippet?: string;
  payload?: GmailPayload;
};

type GmailThread = {
  id: string;
  messages?: GmailMessage[];
};

type GmailProfile = {
  emailAddress?: string;
  messagesTotal?: number;
  threadsTotal?: number;
};

export type InboxMessage = {
  id: string;
  threadId: string;
  direction: 'inbound' | 'outbound';
  from: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  body: string;
  isUnread: boolean;
};

export type InboxThread = {
  id: string;
  subject: string;
  latestDate: string;
  latestSender: string;
  latestSnippet: string;
  isUnread: boolean;
  messages: InboxMessage[];
};

async function gmailRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const proxyInit = init
    ? {
        method: init.method,
        body: init.body,
        headers: init.headers
          ? Object.fromEntries(new Headers(init.headers).entries())
          : undefined,
      }
    : undefined;
  const response = await connectors.proxy(CONNECTOR_NAME, path, proxyInit);
  const responseText = await response.text();
  let data: unknown = null;

  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    console.error(`[gmail] mailbox request failed status=${response.status}`);
    throw new Error('Gmail mailbox request failed');
  }

  return data as T;
}

function headerValue(payload: GmailPayload | undefined, name: string): string {
  return payload?.headers?.find(header => header.name?.toLowerCase() === name.toLowerCase())?.value?.trim() || '';
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64').toString('utf8');
}

function stripHtml(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function collectBodyParts(payload: GmailPayload | undefined, result: Array<{ mimeType: string; data: string }> = []) {
  if (!payload) return result;
  if (payload.body?.data) {
    result.push({ mimeType: payload.mimeType || '', data: payload.body.data });
  }
  for (const part of payload.parts || []) {
    collectBodyParts(part, result);
  }
  return result;
}

function messageBody(payload: GmailPayload | undefined): string {
  const parts = collectBodyParts(payload);
  const plain = parts.find(part => part.mimeType === 'text/plain');
  if (plain) return decodeBase64Url(plain.data).trim();
  const html = parts.find(part => part.mimeType === 'text/html');
  return html ? stripHtml(decodeBase64Url(html.data)) : '';
}

function extractEmail(address: string): string {
  const bracketed = address.match(/<([^>]+)>/);
  if (bracketed?.[1]) return bracketed[1].trim().toLowerCase();
  return address.trim().split(/\s+/).pop()?.replace(/^["']|["']$/g, '').toLowerCase() || '';
}

function messageDate(message: GmailMessage): string {
  const timestamp = Number(message.internalDate);
  return Number.isFinite(timestamp) && timestamp > 0
    ? new Date(timestamp).toISOString()
    : new Date().toISOString();
}

function sortMessages(messages: GmailMessage[]): GmailMessage[] {
  return [...messages].sort((a, b) => Number(a.internalDate || 0) - Number(b.internalDate || 0));
}

async function getProfile(): Promise<GmailProfile> {
  return gmailRequest<GmailProfile>('/gmail/v1/users/me/profile');
}

function normalizeThread(thread: GmailThread, accountEmail: string): InboxThread {
  const normalizedMessages = sortMessages(thread.messages || []).map(message => {
    const from = headerValue(message.payload, 'From');
    const to = headerValue(message.payload, 'To');
    const subject = headerValue(message.payload, 'Subject') || '(No subject)';
    const senderEmail = extractEmail(from);
    return {
      id: message.id,
      threadId: message.threadId,
      direction: senderEmail === accountEmail.toLowerCase() ? 'outbound' : 'inbound',
      from,
      to,
      subject,
      date: messageDate(message),
      snippet: message.snippet || '',
      body: messageBody(message.payload),
      isUnread: (message.labelIds || []).includes('UNREAD'),
    } satisfies InboxMessage;
  });

  const latest = normalizedMessages[normalizedMessages.length - 1] || {
    id: '',
    threadId: thread.id,
    direction: 'inbound' as const,
    from: '',
    to: '',
    subject: '(No subject)',
    date: new Date(0).toISOString(),
    snippet: '',
    body: '',
    isUnread: false,
  };

  return {
    id: thread.id,
    subject: latest.subject,
    latestDate: latest.date,
    latestSender: latest.from,
    latestSnippet: latest.snippet || latest.body.slice(0, 240),
    isUnread: normalizedMessages.some(message => message.isUnread),
    messages: normalizedMessages,
  };
}

export async function listInboxThreads({ days = 90, pageSize = 50 } = {}) {
  const profile = await getProfile();
  const query = `in:inbox -from:me to:me newer_than:${days}d`;
  const search = await gmailRequest<{ threads?: GmailThread[]; nextPageToken?: string }>(
    `/gmail/v1/users/me/threads:search?q=${encodeURIComponent(query)}&pageSize=${Math.min(pageSize, 50)}&view=THREAD_VIEW_MINIMAL`,
  );

  const threads = (search.threads || [])
    .map(thread => normalizeThread(thread, profile.emailAddress || ''))
    .sort((a, b) => Date.parse(b.latestDate) - Date.parse(a.latestDate));

  return {
    accountEmail: profile.emailAddress || '',
    threads,
    nextPageToken: search.nextPageToken || null,
  };
}

export async function getInboxThread(threadId: string) {
  const profile = await getProfile();
  const thread = await gmailRequest<GmailThread>(
    `/gmail/v1/users/me/threads/${encodeURIComponent(threadId)}?format=full`,
  );
  return normalizeThread(thread, profile.emailAddress || '');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br>');
}

function headerFromFullMessage(message: GmailMessage, name: string): string {
  return headerValue(message.payload, name).replace(/[\r\n]+/g, ' ').trim();
}

export async function replyToInboxThread(threadId: string, body: string) {
  const profile = await getProfile();
  const thread = await gmailRequest<GmailThread>(
    `/gmail/v1/users/me/threads/${encodeURIComponent(threadId)}?format=full`,
  );
  const orderedMessages = sortMessages(thread.messages || []);
  const latestInbound = [...orderedMessages]
    .reverse()
    .find(message => extractEmail(headerFromFullMessage(message, 'From')) !== (profile.emailAddress || '').toLowerCase());

  if (!latestInbound) {
    throw new Error('This thread has no incoming message to reply to.');
  }

  const recipient = headerFromFullMessage(latestInbound, 'From');
  const subject = headerFromFullMessage(latestInbound, 'Subject') || '(No subject)';
  const messageId = headerFromFullMessage(latestInbound, 'Message-ID');
  const previousReferences = headerFromFullMessage(latestInbound, 'References');
  const references = [previousReferences, messageId].filter(Boolean).join(' ');
  const replySubject = /^re:/i.test(subject) ? subject : `Re: ${subject}`;
  const fromAddress = profile.emailAddress || '';
  const rawMessage = [
    `From: The Network <${fromAddress}>`,
    `To: ${recipient}`,
    `Subject: ${replySubject}`,
    messageId ? `In-Reply-To: ${messageId}` : '',
    references ? `References: ${references}` : '',
    'MIME-Version: 1.0',
    'Content-Type: multipart/alternative; boundary="network-boundary"',
    '',
    '--network-boundary',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    body,
    '',
    '--network-boundary',
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#263238">${escapeHtml(body)}</div>`,
    '',
    '--network-boundary--',
  ].filter(Boolean).join('\r\n');

  const sent = await gmailRequest<{ id?: string; threadId?: string }>(
    '/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw: Buffer.from(rawMessage, 'utf8').toString('base64url'),
        threadId,
      }),
    },
  );

  return {
    id: sent.id || null,
    threadId: sent.threadId || threadId,
    recipient,
    subject: replySubject,
  };
}