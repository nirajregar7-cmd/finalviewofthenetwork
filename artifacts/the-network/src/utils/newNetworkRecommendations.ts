import type { Connection, UserProfile } from '../types';
import { getEducationDisplay } from './education';

const RECENT_JOIN_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

function normalizeEducationValue(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function profileEducationText(user: UserProfile): string {
  return [
    user.schoolName,
    user.coachingName,
    user.college,
    user.branch,
    user.degree,
    user.academicStream,
    user.programGroup,
    ...(user.fields ?? []),
  ]
    .map(normalizeEducationValue)
    .filter(Boolean)
    .join(' ');
}

function classFor(user: UserProfile): string {
  const match = profileEducationText(user).match(/\b(?:class|grade)\s*(9|10|11|12)\b|\b(9|10|11|12)(?:st|nd|rd|th)\b/i);
  return match?.[1] || match?.[2] || '';
}

function examFor(user: UserProfile): string {
  const match = profileEducationText(user).match(/\b(jee|neet|bitsat|cuet|clat|nda|upsc|gate|cat|xat|mat|sat|nift|nid|ssc|ibps|afcat|cds)\b/i);
  return match?.[1]?.toLowerCase() || '';
}

export function sameEducationValue(first: unknown, second: unknown): boolean {
  const a = normalizeEducationValue(first);
  const b = normalizeEducationValue(second);
  return Boolean(a && b && a === b);
}

export function isNewNetworkRecent(user: UserProfile, now = Date.now()): boolean {
  const createdAt = new Date(user.createdAt ?? 0).getTime();
  return Number.isFinite(createdAt) && createdAt >= now - RECENT_JOIN_WINDOW_MS;
}

function relatedUserIdsFor(currentUser: UserProfile, connections: Connection[]): Set<string> {
  return new Set(
    connections
      .filter(connection =>
        (connection.senderId === currentUser.id || connection.receiverId === currentUser.id)
        && connection.status !== 'rejected'
      )
      .map(connection => connection.senderId === currentUser.id ? connection.receiverId : connection.senderId),
  );
}

/**
 * Selects the profiles shown in the home feed's "New on The Network" rail.
 * Same-stage and same-institution profiles are ranked first, while recent
 * cross-stage profiles keep the rail useful for the whole student network.
 */
export function getNewNetworkRecommendations(
  currentUser: UserProfile,
  allUsers: UserProfile[],
  connections: Connection[],
  pathwayUsers: UserProfile[] = [],
  limit = 5,
): UserProfile[] {
  const viewerEducation = getEducationDisplay(currentUser);
  const viewerIsCollegeStudent = viewerEducation.kind === 'college';
  const relatedUserIds = relatedUserIdsFor(currentUser, connections);

  const audienceScore = (user: UserProfile): number => {
    const candidateEducation = getEducationDisplay(user);
    const viewerClass = classFor(currentUser);
    const candidateClass = classFor(user);
    const viewerExam = examFor(currentUser);
    const candidateExam = examFor(user);
    let score = 0;

    if (viewerIsCollegeStudent && candidateEducation.kind === 'college') {
      if (sameEducationValue(currentUser.college, user.college)) score += 40;
      if (currentUser.year > 0 && currentUser.year === user.year) score += 18;
      if (sameEducationValue(currentUser.branch, user.branch)) score += 14;
      if (sameEducationValue(currentUser.degree, user.degree)) score += 6;
    } else if (!viewerIsCollegeStudent && candidateEducation.kind !== 'college') {
      if (candidateEducation.kind === viewerEducation.kind) score += 18;
      if (viewerClass && candidateClass && viewerClass === candidateClass) score += 24;
      if (viewerExam && candidateExam && viewerExam === candidateExam) score += 20;
      if (sameEducationValue(currentUser.schoolName, user.schoolName)) score += 20;
      if (sameEducationValue(currentUser.coachingName, user.coachingName)) score += 20;
      if (sameEducationValue(currentUser.academicStream, user.academicStream)) score += 8;
    }

    return score;
  };

  const isEligible = (user: UserProfile): boolean =>
    !user.isSuspended
    && !user.privacySettings?.hideProfileFromSearch
    && user.id !== currentUser.id
    && !relatedUserIds.has(user.id);
  const byNewest = (first: UserProfile, second: UserProfile) =>
    new Date(second.createdAt ?? 0).getTime() - new Date(first.createdAt ?? 0).getTime();
  const isRecent = (user: UserProfile): boolean => isNewNetworkRecent(user, Date.now());

  const rankUsers = (users: UserProfile[]): UserProfile[] =>
    users.sort((first, second) => audienceScore(second) - audienceScore(first) || byNewest(first, second));
  const audienceUsers = allUsers.filter(isEligible);
  const pathUsers = pathwayUsers.filter(isEligible);
  const mergedAudienceUsers = rankUsers([...audienceUsers, ...pathUsers]
    .filter((user, index, users) => users.findIndex(candidate => candidate.id === user.id) === index));
  const recentUsers = mergedAudienceUsers.filter(isRecent);
  const candidates = recentUsers.length > 0 ? recentUsers : mergedAudienceUsers;

  return candidates.slice(0, limit);
}