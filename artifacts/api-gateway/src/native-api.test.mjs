import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPostEngagement,
  hashBearerToken,
  normalizeCommunity,
  normalizePost,
  sanitizeApiResponse,
} from './native-api.mjs';

test('session tokens are hashed with lowercase SHA-256 hex', async () => {
  assert.equal(
    await hashBearerToken('abc'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  );
});

test('API response sanitization preserves only the viewer email and strips credential hashes', () => {
  const response = sanitizeApiResponse({
    users: [
      { id: 'viewer', email: 'viewer@example.test', passwordHash: 'never-return' },
      { id: 'other', email: 'other@example.test', token_hash: 'never-return' },
    ],
  }, 'viewer', false);

  assert.deepEqual(response, {
    users: [
      { id: 'viewer', email: 'viewer@example.test' },
      { id: 'other' },
    ],
  });
});

test('shared posts receive merged likes, votes, poll votes, and comments', () => {
  const posts = [
    { id: 'root', likes: ['a'], votes: { q: 'root' }, pollVotes: {}, createdAt: '2025-01-01' },
    { id: 'share', resharedFromId: 'root', likes: ['b'], votes: { q: 'share' }, pollVotes: { q: 'share' }, createdAt: '2025-01-02' },
  ];
  const comments = [{
    id: 'comment',
    postId: 'share',
    authorId: 'author',
    isAnonymous: true,
    replyToId: null,
    content: 'hello',
    createdAt: new Date('2025-01-03T00:00:00Z'),
  }];
  const engagement = buildPostEngagement(posts, comments);
  const normalized = normalizePost({ ...posts[1], hasImage: true }, engagement.get('share'));

  assert.deepEqual(normalized.likes, ['a', 'b']);
  assert.deepEqual(normalized.votes, { q: 'root' });
  assert.deepEqual(normalized.pollVotes, { q: 'share' });
  assert.equal(normalized.postImage, '/api/posts/share/image?index=0');
  assert.equal(normalized.comments[0].authorId, 'anonymous:comment');
  assert.equal(normalized.comments[0].createdAt, '2025-01-03T00:00:00.000Z');
});

test('community bootstrap assigns a usable head administrator without mutating storage', () => {
  const community = normalizeCommunity({
    id: 'community',
    creatorId: 'system',
    memberIds: ['first-member', 'second-member'],
    adminIds: ['second-member', 'system'],
    createdAt: new Date('2025-01-01T00:00:00Z'),
  });

  assert.equal(community.creatorId, 'first-member');
  assert.deepEqual(community.adminIds, ['first-member', 'second-member']);
  assert.equal(community.createdAt, '2025-01-01T00:00:00.000Z');
});

test('communities without a head retain their stored creator and admins', () => {
  const community = normalizeCommunity({
    id: 'empty-community',
    creatorId: 'system',
    memberIds: [],
    adminIds: ['system'],
    createdAt: new Date('2025-01-01T00:00:00Z'),
  });

  assert.equal(community.creatorId, 'system');
  assert.deepEqual(community.adminIds, ['system']);
});
