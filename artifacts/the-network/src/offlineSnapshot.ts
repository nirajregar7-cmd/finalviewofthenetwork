import type {
  Community,
  Connection,
  Post,
  Project,
  Story,
  UserProfile,
} from './types';
import type { NotificationItem, Opportunity } from './uploaded/types';

const DATABASE_NAME = 'the-network-offline';
const STORE_NAME = 'screen-snapshots';
const SNAPSHOT_VERSION = 1;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_USERS = 500;
const MAX_POSTS = 40;
const MAX_COMMENTS_PER_POST = 5;
const MAX_COMMUNITIES = 100;
const MAX_CONNECTIONS = 500;
const MAX_STORIES = 30;
const MAX_PROJECTS = 100;
const MAX_OPPORTUNITIES = 100;
const MAX_NOTIFICATIONS = 50;
const MAX_CACHED_COMMUNITY_FEEDS = 12;
const MAX_COMMUNITY_POSTS = 20;
const MAX_CACHED_FEED_FILTERS = 6;
const MAX_INLINE_MEDIA_CHARS = 250_000;

export interface OfflineScreenSnapshot {
  version: number;
  userId: string;
  savedAt: number;
  currentUser: UserProfile;
  users: UserProfile[];
  posts: Post[];
  communities?: Community[];
  connections?: Connection[];
  stories?: Story[];
  projects?: Project[];
  opportunities?: Opportunity[];
  notifications?: NotificationItem[];
  savedPostIds?: string[];
  savedCommunityIds?: string[];
  communityPosts?: Record<string, Post[]>;
  homeFeeds?: Record<string, Post[]>;
  competitions?: unknown[];
}

export type OfflineScreenSnapshotUpdate = Partial<
  Omit<OfflineScreenSnapshot, 'version' | 'userId' | 'savedAt' | 'currentUser'>
> & {
  userId: string;
  currentUser?: UserProfile;
};

function openSnapshotDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable'));
      return;
    }

    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'userId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to open offline storage'));
  });
}

function withoutEmail(user: UserProfile): UserProfile {
  return compactOfflineValue({ ...user, email: '' });
}

function compactOfflineValue<T>(value: T): T {
  if (typeof value === 'string') {
    if (value.startsWith('data:') && value.length > MAX_INLINE_MEDIA_CHARS) {
      return undefined as T;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => compactOfflineValue(item)) as T;
  }
  if (value && typeof value === 'object') {
    const compacted: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (key.toLowerCase() === 'email') {
        compacted[key] = '';
        continue;
      }
      const compactItem = compactOfflineValue(item);
      if (compactItem !== undefined) compacted[key] = compactItem;
    }
    return compacted as T;
  }
  return value;
}

function compactPosts(posts: Post[] | undefined, limit: number): Post[] {
  return (posts ?? []).slice(0, limit).map((post) =>
    compactOfflineValue({
      ...post,
      comments: (post.comments ?? []).slice(0, MAX_COMMENTS_PER_POST),
    }),
  );
}

export function createOfflineScreenSnapshot(input: {
  userId: string;
  currentUser: UserProfile;
  users: UserProfile[];
  posts: Post[];
  communities?: Community[];
  connections?: Connection[];
  stories?: Story[];
  projects?: Project[];
  opportunities?: Opportunity[];
  notifications?: NotificationItem[];
  savedPostIds?: string[];
  savedCommunityIds?: string[];
  communityPosts?: Record<string, Post[]>;
  homeFeeds?: Record<string, Post[]>;
  competitions?: unknown[];
}): OfflineScreenSnapshot {
  const profiles = new Map<string, UserProfile>();
  profiles.set(input.currentUser.id, withoutEmail(input.currentUser));
  for (const user of input.users.slice(0, MAX_USERS)) {
    profiles.set(user.id, withoutEmail(user));
  }
  const safeProfiles = [...profiles.values()].slice(0, MAX_USERS);
  const currentUser = safeProfiles.find((user) => user.id === input.userId);

  if (!currentUser) {
    throw new Error('Cannot save an offline snapshot without the signed-in profile');
  }

  return {
    version: SNAPSHOT_VERSION,
    userId: input.userId,
    savedAt: Date.now(),
    currentUser,
    users: safeProfiles,
    posts: compactPosts(input.posts, MAX_POSTS),
    communities: compactOfflineValue((input.communities ?? []).slice(0, MAX_COMMUNITIES)),
    connections: compactOfflineValue((input.connections ?? []).slice(0, MAX_CONNECTIONS)),
    stories: compactOfflineValue((input.stories ?? []).slice(0, MAX_STORIES)),
    projects: compactOfflineValue((input.projects ?? []).slice(0, MAX_PROJECTS)),
    opportunities: compactOfflineValue((input.opportunities ?? []).slice(0, MAX_OPPORTUNITIES)),
    notifications: compactOfflineValue(
      (input.notifications ?? [])
        .filter((item) => !['message', 'group_message', 'community_message'].includes(item.type))
        .slice(0, MAX_NOTIFICATIONS),
    ),
    savedPostIds: [...new Set(input.savedPostIds ?? [])].slice(0, MAX_POSTS * 10),
    savedCommunityIds: [...new Set(input.savedCommunityIds ?? [])].slice(0, MAX_COMMUNITIES),
    communityPosts: Object.fromEntries(
      Object.entries(input.communityPosts ?? {})
        .slice(0, MAX_CACHED_COMMUNITY_FEEDS)
        .map(([communityId, communityPosts]) => [
          communityId,
          compactPosts(communityPosts, MAX_COMMUNITY_POSTS),
        ]),
    ),
    homeFeeds: Object.fromEntries(
      Object.entries(input.homeFeeds ?? {})
        .slice(0, MAX_CACHED_FEED_FILTERS)
        .map(([filter, feedPosts]) => [filter, compactPosts(feedPosts, MAX_POSTS)]),
    ),
    competitions: compactOfflineValue((input.competitions ?? []).slice(0, MAX_OPPORTUNITIES)),
  };
}

export async function readOfflineScreenSnapshot(
  userId: string,
): Promise<OfflineScreenSnapshot | null> {
  let database: IDBDatabase | undefined;
  try {
    database = await openSnapshotDatabase();
    const snapshot = await new Promise<OfflineScreenSnapshot | undefined>((resolve, reject) => {
      const transaction = database!.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(userId);
      request.onsuccess = () => resolve(request.result as OfflineScreenSnapshot | undefined);
      request.onerror = () => reject(request.error ?? new Error('Unable to read offline snapshot'));
    });

    if (
      !snapshot ||
      snapshot.version !== SNAPSHOT_VERSION ||
      snapshot.userId !== userId ||
      !snapshot.currentUser ||
      Date.now() - snapshot.savedAt > MAX_AGE_MS
    ) {
      if (snapshot) await clearOfflineScreenSnapshot(userId);
      return null;
    }
    return snapshot;
  } catch (error) {
    console.warn('[PWA] Unable to read the saved screen:', error);
    return null;
  } finally {
    database?.close();
  }
}

export async function saveOfflineScreenSnapshot(snapshot: OfflineScreenSnapshot): Promise<void> {
  let database: IDBDatabase | undefined;
  try {
    database = await openSnapshotDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database!.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(createOfflineScreenSnapshot(snapshot));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Unable to save offline snapshot'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Offline snapshot save was aborted'));
    });
  } catch (error) {
    console.warn('[PWA] Unable to save the signed-in screen:', error);
  } finally {
    database?.close();
  }
}

export async function updateOfflineScreenSnapshot(
  update: OfflineScreenSnapshotUpdate,
): Promise<OfflineScreenSnapshot | null> {
  let database: IDBDatabase | undefined;
  try {
    database = await openSnapshotDatabase();
    return await new Promise<OfflineScreenSnapshot | null>((resolve, reject) => {
      const transaction = database!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(update.userId);
      let nextSnapshot: OfflineScreenSnapshot | null = null;

      request.onsuccess = () => {
        const previous = request.result as OfflineScreenSnapshot | undefined;
        const previousIsUsable =
          previous?.version === SNAPSHOT_VERSION &&
          previous.userId === update.userId &&
          Date.now() - previous.savedAt <= MAX_AGE_MS;
        const currentUser = update.currentUser ?? (previousIsUsable ? previous?.currentUser : undefined);
        if (!currentUser) {
          transaction.abort();
          reject(new Error('Cannot update an offline snapshot without the signed-in profile'));
          return;
        }

        const base = previousIsUsable ? previous : undefined;
        const communityPosts = {
          ...Object.fromEntries(
            Object.entries(base?.communityPosts ?? {}).filter(
              ([communityId]) => !update.communityPosts?.[communityId],
            ),
          ),
          ...(update.communityPosts ?? {}),
        };
        const homeFeeds = {
          ...Object.fromEntries(
            Object.entries(base?.homeFeeds ?? {}).filter(
              ([filter]) => !update.homeFeeds?.[filter],
            ),
          ),
          ...(update.homeFeeds ?? {}),
        };
        nextSnapshot = createOfflineScreenSnapshot({
          userId: update.userId,
          currentUser,
          users: update.users ?? base?.users ?? [currentUser],
          posts: update.posts ?? base?.posts ?? [],
          communities: update.communities ?? base?.communities,
          connections: update.connections ?? base?.connections,
          stories: update.stories ?? base?.stories,
          projects: update.projects ?? base?.projects,
          opportunities: update.opportunities ?? base?.opportunities,
          notifications: update.notifications ?? base?.notifications,
          savedPostIds: update.savedPostIds ?? base?.savedPostIds,
          savedCommunityIds: update.savedCommunityIds ?? base?.savedCommunityIds,
          communityPosts,
          homeFeeds,
          competitions: update.competitions ?? base?.competitions,
        });
        store.put(nextSnapshot);
      };
      request.onerror = () => reject(request.error ?? new Error('Unable to read offline snapshot for update'));
      transaction.oncomplete = () => resolve(nextSnapshot);
      transaction.onerror = () => reject(transaction.error ?? new Error('Unable to update offline snapshot'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Offline snapshot update was aborted'));
    });
  } catch (error) {
    console.warn('[PWA] Unable to update the saved read-only content:', error);
    return null;
  } finally {
    database?.close();
  }
}

export async function updateOfflineFeedSnapshot(input: {
  userId: string;
  currentUser: UserProfile;
  users: UserProfile[];
  posts: Post[];
  filter?: string;
}): Promise<void> {
  const filter = input.filter ?? 'looking-for';
  await updateOfflineScreenSnapshot({
    ...input,
    ...(filter === 'looking-for' ? { posts: input.posts } : {}),
    homeFeeds: { [filter]: input.posts },
  });
}

export async function clearOfflineScreenSnapshot(userId: string | null): Promise<void> {
  if (!userId) return;
  let database: IDBDatabase | undefined;
  try {
    database = await openSnapshotDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database!.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).delete(userId);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Unable to clear offline snapshot'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Offline snapshot clear was aborted'));
    });
  } catch (error) {
    console.warn('[PWA] Unable to clear the signed-in screen:', error);
  } finally {
    database?.close();
  }
}
