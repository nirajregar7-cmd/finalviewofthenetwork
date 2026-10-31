export interface PostInteractionRow {
  id: string;
  resharedFromId?: string | null;
  likes?: unknown;
  votes?: unknown;
  pollVotes?: unknown;
  createdAt?: Date | string;
  [key: string]: unknown;
}

export interface PostInteractionComment {
  id: string;
  postId: string;
  authorId?: string;
  isAnonymous?: boolean;
  replyToId?: string | null;
  content?: string;
  createdAt?: Date | string;
}

export interface SharedPostEngagement {
  likes: string[];
  votes: Record<string, unknown>;
  pollVotes: Record<string, unknown>;
  comments: PostInteractionComment[];
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringIds(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function mergeRecords(
  rows: PostInteractionRow[],
  key: 'votes' | 'pollVotes',
  rootPostId: string,
): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  const nonRootRows = rows
    .filter((row) => row.id !== rootPostId)
    .sort((a, b) => {
      const createdAt = (value: Date | string | undefined) => {
        if (!value) return 0;
        const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
        return Number.isFinite(timestamp) ? timestamp : 0;
      };
      return createdAt(a.createdAt) - createdAt(b.createdAt) || a.id.localeCompare(b.id);
    });
  const rootRow = rows.find((row) => row.id === rootPostId);

  for (const row of [...nonRootRows, ...(rootRow ? [rootRow] : [])]) {
    Object.assign(merged, record(row[key]));
  }

  return merged;
}

export function buildPostEngagementById(
  rows: PostInteractionRow[],
  comments: PostInteractionComment[],
): Map<string, SharedPostEngagement> {
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  const rootForPost = (postId: string): string => {
    let current = rowsById.get(postId);
    if (!current) return postId;

    const visited = new Set<string>();
    while (current.resharedFromId) {
      if (visited.has(current.id)) break;
      visited.add(current.id);
      const parent = rowsById.get(current.resharedFromId);
      if (!parent) return current.resharedFromId;
      current = parent;
    }

    return current.id;
  };

  const rowsByRoot = new Map<string, PostInteractionRow[]>();
  for (const row of rows) {
    const rootId = rootForPost(row.id);
    const group = rowsByRoot.get(rootId) || [];
    group.push(row);
    rowsByRoot.set(rootId, group);
  }

  const commentsByRoot = new Map<string, PostInteractionComment[]>();
  const seenCommentIdsByRoot = new Map<string, Set<string>>();
  for (const comment of comments) {
    const rootId = rootForPost(comment.postId);
    const seen = seenCommentIdsByRoot.get(rootId) || new Set<string>();
    if (seen.has(comment.id)) continue;
    seen.add(comment.id);
    seenCommentIdsByRoot.set(rootId, seen);

    const group = commentsByRoot.get(rootId) || [];
    group.push(comment);
    commentsByRoot.set(rootId, group);
  }

  const result = new Map<string, SharedPostEngagement>();
  for (const [rootId, group] of rowsByRoot) {
    const likes = [...new Set(group.flatMap((row) => stringIds(row.likes)))];
    const sharedEngagement = {
      likes,
      votes: mergeRecords(group, 'votes', rootId),
      pollVotes: mergeRecords(group, 'pollVotes', rootId),
      comments: commentsByRoot.get(rootId) || [],
    };

    for (const row of group) {
      result.set(row.id, sharedEngagement);
    }
  }

  return result;
}
