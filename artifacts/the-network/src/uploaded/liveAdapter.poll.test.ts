import { describe, expect, it } from 'vitest';
import type { Post as CorePost } from '../types';
import type { User } from './types';
import { toUploadedPost } from './liveAdapter';

function makeUser(id: string, name: string): User {
  return {
    id,
    name,
    avatar: `/${id}.png`,
    college: '',
    branch: '',
    verified: false,
    interests: [],
    skills: [],
    communities: [],
  };
}

describe('poll result adaptation', () => {
  it('counts votes by selected option and includes matching voter names', () => {
    const post = {
      id: 'poll-1',
      authorId: 'author-1',
      content: 'When are exams?',
      createdAt: '2026-10-10T12:00:00.000Z',
      pollOptions: ['Already over', 'Starting soon'],
      pollVotes: {
        'current-user': 0,
        'voter-1': 1,
        'stale-voter': 5,
      },
    } as unknown as CorePost;

    const result = toUploadedPost(
      post,
      {
        'author-1': makeUser('author-1', 'Poll Author'),
        'current-user': makeUser('current-user', 'Current Student'),
        'voter-1': makeUser('voter-1', 'Another Student'),
      },
      {},
      'current-user',
    );

    expect(result.pollData).toMatchObject({
      totalVotes: 2,
      userVotedOptionId: '0',
      options: [
        {
          id: '0',
          votes: 1,
          voters: [{ id: 'current-user', name: 'Current Student' }],
        },
        {
          id: '1',
          votes: 1,
          voters: [{ id: 'voter-1', name: 'Another Student' }],
        },
      ],
    });
  });
});
