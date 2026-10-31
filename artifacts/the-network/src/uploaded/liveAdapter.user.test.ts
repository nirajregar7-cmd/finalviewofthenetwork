import { describe, expect, it } from 'vitest';
import type { UserProfile } from '../types';
import { toUploadedUser } from './liveAdapter';

function makeProfile(avatar: string, fullName = 'New Student'): UserProfile {
  return {
    id: 'student-1',
    fullName,
    college: 'KRCE Trichy',
    branch: 'CSE',
    degree: 'B.Tech',
    year: 1,
    email: 'student@example.test',
    avatar,
    aboutMe: '',
    interests: [],
    skills: [],
    lookingFor: [],
    isVerified: false,
    isSuspended: false,
    role: 'student',
    privacySettings: {
      showEmail: false,
      onlyAllowVerifiedConnections: false,
      hideProfileFromSearch: false,
    },
    createdAt: '2026-10-01T00:00:00.000Z',
  };
}

describe('profile photo adaptation', () => {
  it('keeps an uploaded root-relative photo path and marks it as a photo', () => {
    const user = toUploadedUser(makeProfile('/uploads/profiles/student-1.webp'));

    expect(user.hasProfilePhoto).toBe(true);
    expect(user.avatar).toBe('/uploads/profiles/student-1.webp');
  });

  it('does not treat the generated initials fallback as an uploaded photo', () => {
    const user = toUploadedUser(makeProfile(''));

    expect(user.hasProfilePhoto).toBe(false);
    expect(user.avatar).toMatch(/^data:image\/svg\+xml/);
  });

  it('does not treat a previously saved generated initials SVG as an uploaded photo', () => {
    const generatedSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="48" fill="#4f46e5"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-size="32" font-weight="700">DS</text></svg>';
    const savedFallback = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(generatedSvg)}`;
    const user = toUploadedUser(makeProfile(savedFallback));

    expect(user.hasProfilePhoto).toBe(false);
    expect(user.avatar).toBe(savedFallback);
  });

  it('creates a valid fallback avatar for a name containing malformed UTF-16', () => {
    const user = toUploadedUser(makeProfile('', '\uD800 Student'));
    const encodedSvg = user.avatar.split(',')[1] || '';

    expect(() => decodeURIComponent(encodedSvg)).not.toThrow();
    expect(decodeURIComponent(encodedSvg)).toContain('�S');
  });
});
