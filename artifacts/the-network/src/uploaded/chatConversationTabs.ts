import type { ChatConversation } from './types';

export type ChatConversationTab = 'direct' | 'communities' | 'study_groups';

export const CHAT_TAB_CONVERSATION_TYPE: Record<ChatConversationTab, ChatConversation['type']> = {
  direct: 'direct',
  communities: 'community',
  study_groups: 'study_group',
};
