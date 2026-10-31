import type { ChatConversation, ChatMessage } from './types';

function timestampValue(value?: string | null): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

export function sortChatMessagesChronologically(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort((left, right) => {
    const leftTime = timestampValue(left.createdAt);
    const rightTime = timestampValue(right.createdAt);
    if (leftTime === null) return rightTime === null ? 0 : -1;
    if (rightTime === null) return 1;
    return leftTime - rightTime || left.id.localeCompare(right.id);
  });
}

export function latestChatActivityTimestamp(conversation: ChatConversation): number {
  let latest = timestampValue(conversation.lastTimestamp) ?? 0;
  for (const message of conversation.messages) {
    latest = Math.max(latest, timestampValue(message.createdAt) ?? 0);
  }
  return latest;
}

export function compareConversationsByLatestActivity(
  left: ChatConversation,
  right: ChatConversation,
): number {
  const byTime = latestChatActivityTimestamp(right) - latestChatActivityTimestamp(left);
  return byTime || String(right.lastMessageId || '').localeCompare(String(left.lastMessageId || ''));
}

export function isChatActivityAtOrAfterLatest(
  conversation: ChatConversation,
  createdAt?: string | null,
  messageId?: string | null,
): boolean {
  const incoming = timestampValue(createdAt);
  if (incoming === null) return false;
  const latest = latestChatActivityTimestamp(conversation);
  if (incoming !== latest) return incoming > latest;
  if (messageId && conversation.lastMessageId) {
    return messageId.localeCompare(conversation.lastMessageId) >= 0;
  }
  return true;
}
