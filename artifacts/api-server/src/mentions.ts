export interface MentionCandidate {
  id: string;
  fullName: string;
}

export function getCommentNotificationRecipients(
  postAuthorId: string,
  commenterId: string,
  previousCommentAuthorIds: string[],
  mentionedUserIds: Iterable<string>,
): string[] {
  const mentioned = new Set(mentionedUserIds);
  const recipients = new Set<string>();

  if (postAuthorId !== commenterId && !mentioned.has(postAuthorId)) {
    recipients.add(postAuthorId);
  }
  for (const authorId of previousCommentAuthorIds) {
    if (authorId !== commenterId && authorId !== postAuthorId && !mentioned.has(authorId)) {
      recipients.add(authorId);
    }
  }
  return [...recipients];
}

export function mentionKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function mentionHandle(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .map(part => part.replace(/[^a-z0-9]/gi, ''))
    .filter(Boolean)
    .join('.');
}

const BROADCAST_MENTION_KEYS = new Set(['all', 'everyone', 'members', 'community']);
const MENTION_TOKEN_PATTERN = /(?:^|[\s([{])@([a-z0-9][a-z0-9._-]*)/gi;

function extractMentionKeys(content: string): string[] {
  return [...content.matchAll(MENTION_TOKEN_PATTERN)]
    .map(match => mentionKey(match[1]))
    .filter(Boolean);
}

export function hasBroadcastMention(content: string): boolean {
  return extractMentionKeys(content).some(token => BROADCAST_MENTION_KEYS.has(token));
}

export function extractMentionedUserIds(
  content: string,
  candidates: MentionCandidate[],
): string[] {
  const tokens = extractMentionKeys(content);
  if (!tokens.length) return [];

  const mentioned = new Set<string>();
  for (const candidate of candidates) {
    const nameParts = candidate.fullName.trim().split(/\s+/);
    const firstName = mentionKey(nameParts[0] || '');
    const fullName = mentionKey(candidate.fullName);
    const handle = mentionKey(mentionHandle(candidate.fullName));
    if (tokens.some(token => token === firstName || token === fullName || token === handle)) {
      mentioned.add(candidate.id);
    }
  }
  return [...mentioned];
}