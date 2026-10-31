export interface ChatDayMarker {
  key: string;
  label: string;
}

function localDayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function getChatDayMarker(createdAt?: string, fallbackTimestamp = ''): ChatDayMarker {
  const parsed = createdAt ? new Date(createdAt) : null;
  if (parsed && Number.isFinite(parsed.getTime())) {
    const today = new Date();
    const difference = Math.round(
      (startOfLocalDay(today) - startOfLocalDay(parsed)) / 86_400_000,
    );
    if (difference === 0) return { key: localDayKey(parsed), label: 'Today' };
    if (difference === 1) return { key: localDayKey(parsed), label: 'Yesterday' };
    return {
      key: localDayKey(parsed),
      label: parsed.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: parsed.getFullYear() === today.getFullYear() ? undefined : 'numeric',
      }),
    };
  }

  // Some offline seed messages have only a relative timestamp. A display-time
  // such as "4:37 PM" is not a date and must never become a date separator.
  const normalized = fallbackTimestamp.trim().toLowerCase();
  const daysAgo = normalized.match(/^(\d+)d ago$/);
  if (daysAgo) {
    const days = Number(daysAgo[1]);
    return {
      key: `relative-${days}d`,
      label: days === 1 ? 'Yesterday' : `${days} days ago`,
    };
  }
  return { key: 'today', label: 'Today' };
}

export function formatChatMessageTime(createdAt?: string, fallbackTimestamp = '') {
  const parsed = createdAt ? new Date(createdAt) : null;
  if (!parsed || !Number.isFinite(parsed.getTime())) return fallbackTimestamp;
  return parsed.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
