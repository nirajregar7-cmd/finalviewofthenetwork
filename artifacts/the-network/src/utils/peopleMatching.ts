import type { UserProfile } from '../types';
import { getEducationDisplay } from './education';

export interface PeopleMatch {
  user: UserProfile;
  score: number;
  reasons: string[];
  isNew: boolean;
  mode: 'school' | 'college' | 'general';
}

const EXAM_SIGNALS = [
  ['jee', 'JEE'],
  ['neet', 'NEET'],
  ['bitsat', 'BITSAT'],
  ['cuet', 'CUET'],
  ['clat', 'CLAT'],
  ['nda', 'NDA'],
  ['upsc', 'UPSC'],
  ['gate', 'GATE'],
  ['cat', 'CAT'],
  ['nift', 'NIFT'],
  ['ca foundation', 'CA Foundation'],
  ['competitive exam', 'Competitive Exams'],
] as const;

function textValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function profileText(user: UserProfile): string {
  return [
    user.schoolName,
    user.coachingName,
    user.college,
    user.branch,
    user.degree,
    user.academicStream,
    user.programGroup,
    user.aboutMe,
    ...(user.fields ?? []),
    ...(user.interests ?? []),
    ...(user.skills ?? []),
    ...(user.lookingFor ?? []),
  ]
    .map(textValue)
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function classLevel(user: UserProfile): string | null {
  const text = [
    user.academicStream,
    user.branch,
    ...(user.fields ?? []),
    user.aboutMe,
  ]
    .map(textValue)
    .filter(Boolean)
    .join(' ');
  const match = text.match(/\b(?:class|grade)\s*(9|10|11|12)\b|\b(9|10|11|12)(?:st|nd|rd|th)\b/i);
  return match ? (match[1] || match[2]) : null;
}

function examTrack(user: UserProfile): string | null {
  const text = profileText(user);
  const match = EXAM_SIGNALS.find(([term]) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
  });
  return match?.[1] ?? null;
}

function matchMode(user: UserProfile): PeopleMatch['mode'] {
  const kind = getEducationDisplay(user).kind;
  if (kind === 'school' || kind === 'coaching' || kind === 'exam') return 'school';
  if (kind === 'college') return 'college';
  return 'general';
}

function normalized(value: string | null | undefined): string {
  return textValue(value).toLowerCase().replace(/\s+/g, ' ');
}

function sharedValues(first: string[] = [], second: string[] = []): string[] {
  const secondValues = new Set(second.map(normalized).filter(Boolean));
  return first.filter(value => secondValues.has(normalized(value)));
}

function isNewProfile(user: UserProfile): boolean {
  const createdAt = new Date(user.createdAt).getTime();
  return Number.isFinite(createdAt) && Date.now() - createdAt <= 14 * 24 * 60 * 60 * 1000;
}

function sameValue(first: string | null | undefined, second: string | null | undefined): boolean {
  const a = normalized(first);
  const b = normalized(second);
  return Boolean(a && b && a === b);
}

function buildMatch(currentUser: UserProfile, candidate: UserProfile): PeopleMatch {
  const currentMode = matchMode(currentUser);
  const candidateMode = matchMode(candidate);
  const currentClass = classLevel(currentUser);
  const candidateClass = classLevel(candidate);
  const currentExam = examTrack(currentUser);
  const candidateExam = examTrack(candidate);
  const sharedInterests = sharedValues(currentUser.interests, candidate.interests);
  const sharedSkills = sharedValues(currentUser.skills, candidate.skills);
  const sharedFields = sharedValues(currentUser.fields, candidate.fields);
  const candidateIsNew = isNewProfile(candidate);

  let score = 30;
  const reasons: string[] = [];

  if (currentMode === candidateMode && currentMode !== 'general') {
    score += 16;
    reasons.push(currentMode === 'school' ? 'Same school or exam stage' : 'Same college stage');
  } else if (currentMode !== 'general' && candidateMode !== 'general') {
    score -= 10;
  }

  if (currentMode === 'school' && candidateMode === 'school') {
    if (currentClass && candidateClass && currentClass === candidateClass) {
      score += 22;
      reasons.unshift(`Both in Class ${currentClass}`);
    } else if (currentClass && candidateClass && Math.abs(Number(currentClass) - Number(candidateClass)) === 1) {
      score += 8;
      reasons.push('Nearby school class');
    }

    if (currentExam && candidateExam && currentExam === candidateExam) {
      score += 24;
      reasons.unshift(`Both preparing for ${EXAM_SIGNALS.find(([term]) => term === currentExam)?.[1] ?? currentExam.toUpperCase()}`);
    }

    if (sameValue(currentUser.schoolName, candidate.schoolName) || sameValue(currentUser.coachingName, candidate.coachingName)) {
      score += 12;
      reasons.push('Same school or coaching centre');
    }

    if (sameValue(currentUser.academicStream, candidate.academicStream)) {
      score += 8;
      reasons.push('Same stream');
    }
  }

  if (currentMode === 'college' && candidateMode === 'college') {
    if (sameValue(currentUser.college, candidate.college)) {
      score += 18;
      reasons.unshift('Same college');
    }
    if (currentUser.year > 0 && currentUser.year === candidate.year) {
      score += 12;
      reasons.push(`Both in ${getEducationDisplay(currentUser).details.find(detail => /year/i.test(detail)) ?? 'the same year'}`);
    } else if (currentUser.year > 0 && Math.abs(currentUser.year - candidate.year) === 1) {
      score += 5;
      reasons.push('Nearby college year');
    }
    if (sameValue(currentUser.branch, candidate.branch)) {
      score += 14;
      reasons.unshift('Same branch');
    }
    if (sameValue(currentUser.degree, candidate.degree)) {
      score += 6;
      reasons.push('Same degree');
    }
  }

  if (sharedFields.length > 0) {
    score += Math.min(sharedFields.length * 4, 8);
    reasons.push(`Shared field: ${sharedFields[0]}`);
  }
  if (sharedInterests.length > 0) {
    score += Math.min(sharedInterests.length * 4, 12);
    reasons.push(`Shared interest: ${sharedInterests[0]}`);
  }
  if (sharedSkills.length > 0) {
    score += Math.min(sharedSkills.length * 3, 9);
    reasons.push(`Shared skill: ${sharedSkills[0]}`);
  }
  if (candidateIsNew) {
    score += 5;
    reasons.push('New on The Network');
  }

  const uniqueReasons = [...new Set(reasons)].slice(0, 3);
  if (uniqueReasons.length === 0) uniqueReasons.push('Good study-stage match');

  return {
    user: candidate,
    score: Math.min(Math.max(score, 1), 98),
    reasons: uniqueReasons,
    isNew: candidateIsNew,
    mode: candidateMode,
  };
}

export function getPeopleRecommendations(currentUser: UserProfile, allUsers: UserProfile[], limit = 6): PeopleMatch[] {
  const candidates = allUsers.filter(user =>
    user.id !== currentUser.id &&
    !user.isSuspended &&
    !user.privacySettings?.hideProfileFromSearch,
  );

  const scored = candidates
    .map(user => buildMatch(currentUser, user))
    .sort((first, second) => {
      if (second.score !== first.score) return second.score - first.score;
      return new Date(second.user.createdAt).getTime() - new Date(first.user.createdAt).getTime();
    });

  const preferredMode = matchMode(currentUser);
  const sameStage = preferredMode === 'general'
    ? scored
    : scored.filter(match => match.mode === preferredMode);
  const stagePool = sameStage.length > 0 ? sameStage : scored;
  const strongMatches = stagePool.filter(match => match.score >= 45);
  return (strongMatches.length > 0 ? strongMatches : stagePool).slice(0, limit);
}

export function recommendationHeading(user: UserProfile): { title: string; subtitle: string } {
  const display = getEducationDisplay(user);
  const currentClass = classLevel(user);
  const currentExam = examTrack(user);

  if (display.kind === 'school' || display.kind === 'coaching' || display.kind === 'exam') {
    const level = currentClass ? `Class ${currentClass}` : 'your school stage';
    const exam = currentExam
      ? ` and ${EXAM_SIGNALS.find(([term]) => term === currentExam)?.[1] ?? currentExam.toUpperCase()} preparation`
      : '';
    return {
      title: 'Study partners for you',
      subtitle: `Students in ${level}${exam} are shown first.`,
    };
  }

  if (display.kind === 'college') {
    return {
      title: 'Study partners for your college stage',
      subtitle: 'Matched by college, year, branch, degree, skills, and interests.',
    };
  }

  return {
    title: 'Study partners for you',
    subtitle: 'Matched using your education details, interests, and skills.',
  };
}