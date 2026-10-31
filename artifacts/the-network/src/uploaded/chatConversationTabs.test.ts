import { describe, expect, it } from 'vitest';
import { CHAT_TAB_CONVERSATION_TYPE } from './chatConversationTabs';

describe('chat tab conversation types', () => {
  it('maps plural tab labels to the conversation kinds used by the data', () => {
    expect(CHAT_TAB_CONVERSATION_TYPE.direct).toBe('direct');
    expect(CHAT_TAB_CONVERSATION_TYPE.communities).toBe('community');
    expect(CHAT_TAB_CONVERSATION_TYPE.study_groups).toBe('study_group');
  });
});
