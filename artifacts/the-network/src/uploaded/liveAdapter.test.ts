import { describe, expect, it } from 'vitest';
import type { ChatConversation, ChatMessage, User } from '../types';
import { mergeDirectConversationRefresh } from './liveAdapter';

function directConversation(id: string, timestamp: string): ChatConversation {
  const peerId = id.replace('direct-', '');
  const message: ChatMessage = {
    id: `message-${peerId}`,
    senderId: peerId,
    senderName: peerId,
    text: `Hello ${peerId}`,
    timestamp: '4:37 PM',
    createdAt: timestamp,
    read: true,
    reactions: [],
  };
  const participant = {
    id: peerId,
    name: peerId,
    avatar: '',
    college: '',
    branch: '',
    verified: false,
    interests: [],
    skills: [],
    communities: [],
  } as User;

  return {
    id,
    type: 'direct',
    title: peerId,
    subtitle: '',
    avatar: '',
    online: false,
    verified: false,
    participant,
    lastMessage: message.text,
    lastMessageTime: timestamp,
    lastTimestamp: timestamp,
    lastMessageId: message.id,
    unreadCount: 0,
    messages: [message],
  };
}

describe('direct conversation refreshes', () => {
  it('does not remove other conversations when a refresh returns a partial page', () => {
    const first = directConversation('direct-arya', '2026-10-24T10:00:00.000Z');
    const second = directConversation('direct-bala', '2026-10-24T09:00:00.000Z');

    const refreshed = mergeDirectConversationRefresh(
      [first, second],
      [directConversation('direct-arya', '2026-10-24T10:30:00.000Z')],
      false,
      'current-user',
    );

    expect(refreshed.map((conversation) => conversation.id)).toEqual(
      expect.arrayContaining(['direct-arya', 'direct-bala']),
    );
  });
});
