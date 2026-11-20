const QUIZ_WINDOW_START_HOUR_IST = 0;
const INDIA_UTC_OFFSET_MINUTES = 5 * 60 + 30;

function getIndiaDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getDailyCommunityQuizWindow(now = new Date()) {
  const dateForQuiz = new Date(now.getTime() - QUIZ_WINDOW_START_HOUR_IST * 60 * 60 * 1000);
  const quizDate = getIndiaDateKey(dateForQuiz);
  const [year, month, day] = quizDate.split('-').map(Number);
  const opensAt = new Date(Date.UTC(year, month - 1, day, QUIZ_WINDOW_START_HOUR_IST) -
    INDIA_UTC_OFFSET_MINUTES * 60 * 1000);

  return {
    quizDate,
    opensAt,
    closesAt: new Date(opensAt.getTime() + 24 * 60 * 60 * 1000),
  };
}

export function getPreviousDailyQuizDate(quizDate: string): string {
  const [year, month, day] = quizDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
}

export function isDailyQuizAttendanceMilestone(attemptCount: number): boolean {
  return Number.isInteger(attemptCount) && attemptCount > 0 &&
    (attemptCount === 1 || attemptCount % 5 === 0);
}
