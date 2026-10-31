import { describe, expect, it } from 'vitest';
import type { User } from './types';
import {
  getStudentClassLabel,
  getStudentExamLabels,
  matchesStudentSearch,
} from './studentSearch';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'student-1',
    name: 'Aarav',
    avatar: '',
    college: 'NIT Trichy',
    branch: 'Computer Science',
    verified: false,
    interests: [],
    skills: ['Data Structures', 'Python'],
    communities: [],
    ...overrides,
  };
}

describe('Connect student search', () => {
  it('matches partial skill text without case sensitivity', () => {
    expect(matchesStudentSearch(makeUser(), 'data structure')).toBe(true);
    expect(matchesStudentSearch(makeUser(), 'PYTHON')).toBe(true);
  });

  it('matches multiple terms across profile fields, class, and exam', () => {
    const student = makeUser({
      academicStream: 'Class 12 · Science',
      fields: ['JEE Main'],
    });

    expect(matchesStudentSearch(student, 'class 12 jee')).toBe(true);
    expect(getStudentClassLabel(student)).toBe('Class 12');
    expect(getStudentExamLabels(student)).toContain('JEE');
  });

  it('does not infer an exam from a coaching center name alone', () => {
    const student = makeUser({ coachingName: 'JEE Academy' });

    expect(getStudentExamLabels(student)).toEqual([]);
  });

  it('does not return unrelated profiles for a multi-term search', () => {
    expect(matchesStudentSearch(makeUser(), 'NEET Class 12')).toBe(false);
  });
});
