import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getDailyCommunityQuizWindow,
  getPreviousDailyQuizDate,
  isDailyQuizAttendanceMilestone,
} from './daily-community-quiz-window.ts';

test('daily quiz window rolls over at midnight India time', () => {
  const beforeOpen = getDailyCommunityQuizWindow(new Date('2025-01-01T18:29:59.000Z'));
  assert.equal(beforeOpen.quizDate, '2025-01-01');
  assert.equal(beforeOpen.opensAt.toISOString(), '2024-12-31T18:30:00.000Z');
  assert.equal(beforeOpen.closesAt.toISOString(), '2025-01-01T18:30:00.000Z');

  const atOpen = getDailyCommunityQuizWindow(new Date('2025-01-01T18:30:00.000Z'));
  assert.equal(atOpen.quizDate, '2025-01-02');
  assert.equal(atOpen.opensAt.toISOString(), '2025-01-01T18:30:00.000Z');
});

test('previous quiz date handles month and year boundaries', () => {
  assert.equal(getPreviousDailyQuizDate('2025-01-01'), '2024-12-31');
});

test('attendance alerts fire on the first attempt and every fifth attempt', () => {
  assert.equal(isDailyQuizAttendanceMilestone(1), true);
  assert.equal(isDailyQuizAttendanceMilestone(4), false);
  assert.equal(isDailyQuizAttendanceMilestone(5), true);
  assert.equal(isDailyQuizAttendanceMilestone(10), true);
  assert.equal(isDailyQuizAttendanceMilestone(0), false);
});
