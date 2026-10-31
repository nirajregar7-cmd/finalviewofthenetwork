import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPostEngagementById } from './post-engagement.ts';

test('reshared posts expose the original thread and merge prior engagement without duplicate voters', () => {
  const rows = [
    {
      id: 'original',
      likes: ['alice', 'shared-liker'],
      votes: { alice: 1 },
      pollVotes: { alice: 0, sharedVoter: 1 },
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'reshare-a',
      resharedFromId: 'original',
      likes: ['shared-liker', 'bob'],
      votes: { bob: 1, alice: -1 },
      pollVotes: { bob: 2, alice: 3, sharedVoter: 0 },
      createdAt: '2026-01-02T00:00:00.000Z',
    },
    {
      id: 'reshare-b',
      resharedFromId: 'original',
      likes: ['carol'],
      votes: { carol: -1 },
      pollVotes: { carol: 0, sharedVoter: 2 },
      createdAt: '2026-01-03T00:00:00.000Z',
    },
  ];
  const comments = [
    { id: 'comment-original', postId: 'original', content: 'Original comment' },
    { id: 'comment-reshare', postId: 'reshare-a', content: 'Older reshare comment' },
  ];

  const engagement = buildPostEngagementById(rows, comments);
  const original = engagement.get('original');
  const shared = engagement.get('reshare-a');

  assert.ok(original);
  assert.ok(shared);
  assert.deepEqual(shared.likes, ['alice', 'shared-liker', 'bob', 'carol']);
  assert.deepEqual(shared.votes, { bob: 1, alice: 1, carol: -1 });
  assert.deepEqual(shared.pollVotes, { bob: 2, alice: 0, carol: 0, sharedVoter: 1 });
  assert.deepEqual(shared.comments.map((comment) => comment.id), [
    'comment-original',
    'comment-reshare',
  ]);
  assert.deepEqual(shared, original);
});

test('reshare chains resolve to the same root post', () => {
  const engagement = buildPostEngagementById(
    [
      { id: 'original', pollVotes: { alice: 0 } },
      { id: 'reshare-a', resharedFromId: 'original', pollVotes: { bob: 1 } },
      { id: 'reshare-b', resharedFromId: 'reshare-a', pollVotes: { carol: 2 } },
    ],
    [{ id: 'comment', postId: 'reshare-b', content: 'Thread comment' }],
  );

  assert.deepEqual(engagement.get('original')?.pollVotes, {
    bob: 1,
    carol: 2,
    alice: 0,
  });
  assert.deepEqual(engagement.get('reshare-a')?.comments.map((comment) => comment.id), ['comment']);
});
