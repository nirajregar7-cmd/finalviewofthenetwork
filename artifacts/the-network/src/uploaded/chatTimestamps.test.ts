import { describe, expect, it } from 'vitest';
import { formatChatMessageTime, getChatDayMarker } from './chatTimestamps';

function localDateAt(dayOffset: number, hour: number, minute: number) {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

describe('chat day separators', () => {
  it('keeps consecutive messages in the same minute on one day', () => {
    const first = getChatDayMarker(localDateAt(0, 16, 37));
    const second = getChatDayMarker(localDateAt(0, 16, 37));

    expect(second.key).toBe(first.key);
  });

  it('does not add a date separator for a same-day time gap', () => {
    const first = getChatDayMarker(localDateAt(0, 9, 10));
    const later = getChatDayMarker(localDateAt(0, 16, 37));

    expect(later.key).toBe(first.key);
  });

  it('adds a separator when a message is from a different day', () => {
    const today = getChatDayMarker(localDateAt(0, 23, 59));
    const yesterday = getChatDayMarker(localDateAt(-1, 0, 1));

    expect(yesterday.key).not.toBe(today.key);
    expect(yesterday.label).toBe('Yesterday');
  });

  it('does not treat a clock-time display as a date', () => {
    const marker = getChatDayMarker(undefined, '4:37 PM');

    expect(marker.key).toBe('today');
    expect(marker.label).toBe('Today');
  });

  it('keeps the day marker stable when an optimistic label becomes a clock time', () => {
    const createdAt = localDateAt(0, 16, 37);
    const optimistic = getChatDayMarker(createdAt, 'Just now');
    const persisted = getChatDayMarker(createdAt, '4:37 PM');

    expect(persisted.key).toBe(optimistic.key);
  });

  it('formats the displayed time from the immutable message timestamp', () => {
    const createdAt = localDateAt(0, 16, 37);

    expect(formatChatMessageTime(createdAt, 'Just now')).toBe(
      new Date(createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    );
  });
});
