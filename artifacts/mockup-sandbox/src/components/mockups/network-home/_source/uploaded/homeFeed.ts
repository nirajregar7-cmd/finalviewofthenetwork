import type { Post } from './types';

export const HOME_FEED_FILTERS = ['looking-for', 'beyond-campus', 'college', 'learn'] as const;
export type HomeFeedFilter = (typeof HOME_FEED_FILTERS)[number];
export const HOME_FEED_PAGE_SIZE = 12;

export function buildHomeFeedPath(
  filter: HomeFeedFilter,
  viewerId: string,
  limit = HOME_FEED_PAGE_SIZE,
  offset = 0,
): string {
  return `/feed?filter=${encodeURIComponent(filter)}&viewerId=${encodeURIComponent(viewerId)}&limit=${limit}&offset=${offset}`;
}

export function mergeHomeFeedPosts(
  previous: Post[],
  incoming: Post[],
  append: boolean,
): Post[] {
  const combined = append ? [...previous, ...incoming] : incoming;
  return combined.filter((post, index, all) => (
    all.findIndex((candidate) => candidate.id === post.id) === index
  ));
}