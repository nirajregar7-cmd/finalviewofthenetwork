import { Connection, UserProfile } from '../types';
import { getEducationDisplay } from './education';

export type StudentRecommendationKind = 'study-partner' | 'tech-peer' | 'iit-nit-guide';

export interface StudentRecommendation {
  user: UserProfile;
  kind: StudentRecommendationKind;
  reason: string;
  score: number;
}

export interface StudentAudience {
  isSchoolOrExamStudent: boolean;
  classLevel: string;
  examTargets: string[];
  techTopics: string[];
  communityTerms: string[];
}

const TECH_TOPICS = [
  { label: 'AI / ML', terms: ['ai', 'ml', 'machine learning', 'deep learning', 'artificial intelligence', 'data science', 'llm'] },
  { label: 'DSA', terms: ['dsa', 'data structures', 'algorithms', 'competitive programming', 'leetcode', 'codeforces', 'problem solving'] },
  { label: 'Web development', terms: ['web development', 'web dev', 'frontend', 'front end', 'backend', 'full stack', 'react', 'javascript', 'html', 'css', 'node'] },
  { label: 'Python', terms: ['python'] },
  { label: 'Java', terms: ['java'] },
  { label: 'C++', terms: ['c++', 'cpp'] },
];

function textFor(user: UserProfile): string {
  return [
    user.degree,
    user.branch,
    user.academicStream,
    user.programGroup,
    user.college,
    user.aboutMe,
    ...(user.fields ?? []),
    ...(user.interests ?? []),
    ...(user.skills ?? []),
    ...(user.lookingFor ?? []),
  ].filter(Boolean).join(' ').toLowerCase();
}

function includesTerm(text: string, term: string): boolean {
  if (term.length <= 3) return new RegExp(`\\b${term.replace(/[+]/g, '\\$&')}\\b`, 'i').test(text);
  return text.includes(term);
}

function classLevelFor(user: UserProfile): string {
  const match = textFor(user).match(/\b(?:class\s*)?(10|11|12)(?:st|nd|th)?\b/i);
  return match ? `Class ${match[1]}` : '';
}

function examsFor(user: UserProfile): string[] {
  const text = textFor(user);
  return [
    'JEE', 'NEET', 'SAT', 'BITSAT', 'CUET', 'CLAT', 'AILET', 'NDA',
    'CDS', 'AFCAT', 'GATE', 'JAM', 'CAT', 'XAT', 'MAT', 'UPSC',
    'SSC', 'IBPS', 'SBI', 'RRB', 'CA', 'CMA', 'CS', 'NET', 'CTET',
    'NIFT', 'NID', 'UCEED', 'ICAR', 'NCHM',
  ].filter(exam => new RegExp(`\\b${exam}\\b`, 'i').test(text));
}

function topicsFor(user: UserProfile): string[] {
  const text = textFor(user);
  return TECH_TOPICS
    .filter(topic => topic.terms.some(term => includesTerm(text, term)))
    .map(topic => topic.label);
}

export function getStudentAudience(user: UserProfile): StudentAudience {
  const education = getEducationDisplay(user);
  const classLevel = classLevelFor(user);
  const examTargets = examsFor(user);
  const techTopics = topicsFor(user);
  const isSchoolOrExamStudent = education.kind === 'school'
    || education.kind === 'exam'
    || Boolean(classLevel)
    || examTargets.length > 0;

  return {
    isSchoolOrExamStudent,
    classLevel,
    examTargets,
    techTopics,
    communityTerms: [
      ...examTargets.map(exam => exam.toLowerCase()),
      classLevel.toLowerCase(),
      ...techTopics.map(topic => topic.toLowerCase()),
      'study partner',
      'india',
    ].filter(Boolean),
  };
}

function isIitOrNitStudent(user: UserProfile): boolean {
  if (getEducationDisplay(user).kind !== 'college') return false;
  const college = user.college.toLowerCase();
  return /\biit\b|indian institute of technology|\bnit\b|national institute of technology|\biiit\b|indian institute of information technology/.test(college);
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function sharedValues(first: string[], second: string[]): string[] {
  const secondSet = new Set(second.map(normalize));
  return first.filter(value => secondSet.has(normalize(value)));
}

function hasStudyIntent(user: UserProfile): boolean {
  return [...user.lookingFor, user.connectPreference || ''].some(value =>
    /study|doubt|mentor|guidance|exam|partner|resource|practice/i.test(value)
  );
}

function recentScore(user: UserProfile): number {
  const createdAt = new Date(user.createdAt).getTime();
  if (!Number.isFinite(createdAt)) return 0;
  const ageDays = Math.max(0, (Date.now() - createdAt) / (24 * 60 * 60 * 1000));
  return ageDays <= 30 ? 3 : ageDays <= 90 ? 1 : 0;
}

export function getStudentRecommendations(
  currentUser: UserProfile,
  allUsers: UserProfile[],
  connections: Connection[],
  limitPerKind = 3,
): StudentRecommendation[] {
  const audience = getStudentAudience(currentUser);
  if (!audience.isSchoolOrExamStudent) return [];

  const relatedUserIds = new Set(
    connections
      .filter(connection =>
        (connection.senderId === currentUser.id || connection.receiverId === currentUser.id)
        && connection.status !== 'rejected'
      )
      .map(connection => connection.senderId === currentUser.id ? connection.receiverId : connection.senderId)
  );

  const eligible = allUsers.filter(user =>
    user.id !== currentUser.id
    && !user.isSuspended
    && !user.privacySettings?.hideProfileFromSearch
    && !relatedUserIds.has(user.id)
  );

  const candidates: StudentRecommendation[] = [];
  for (const user of eligible) {
    const userAudience = getStudentAudience(user);
    const sharedTopics = sharedValues(audience.techTopics, userAudience.techTopics);
    const sharedExams = sharedValues(audience.examTargets, userAudience.examTargets);
    const sameClass = Boolean(audience.classLevel && audience.classLevel === userAudience.classLevel);
    const sameCollege = Boolean(currentUser.college && user.college && normalize(currentUser.college) === normalize(user.college));
    const studyIntent = hasStudyIntent(user);
    const recent = recentScore(user);

    if (userAudience.isSchoolOrExamStudent && (sameClass || sharedExams.length > 0 || studyIntent)) {
      const score = (sameClass ? 18 : 0)
        + sharedExams.length * 16
        + sharedTopics.length * 8
        + (studyIntent ? 10 : 0)
        + (sameCollege ? 6 : 0)
        + recent;
      const reason = sharedExams.length > 0
        ? `${sharedExams.join(' + ')} study partner`
        : sameClass
          ? `${audience.classLevel} study partner`
          : 'Looking for study support';
      candidates.push({ user, kind: 'study-partner', reason, score });
    }

    if (userAudience.techTopics.length > 0 && (sharedTopics.length > 0 || audience.techTopics.length === 0 || studyIntent)) {
      const score = sharedTopics.length * 14
        + userAudience.techTopics.length * 3
        + (studyIntent ? 5 : 0)
        + recent;
      candidates.push({
        user,
        kind: 'tech-peer',
        reason: sharedTopics.length > 0
          ? `Also learning ${sharedTopics.slice(0, 2).join(' + ')}`
          : `Learning ${userAudience.techTopics.slice(0, 2).join(' + ')}`,
        score,
      });
    }

    if (isIitOrNitStudent(user)) {
      const seniorYear = Number(user.year) || 0;
      const score = 26
        + (seniorYear >= 2 ? 8 : 0)
        + (sharedTopics.length > 0 ? 10 : 0)
        + (sharedExams.length > 0 ? 10 : 0)
        + (user.isVerified ? 3 : 0);
      candidates.push({
        user,
        kind: 'iit-nit-guide',
        reason: sharedExams.length > 0
          ? `${sharedExams[0]} and college-choice guidance`
          : 'IIT/NIT senior guidance',
        score,
      });
    }
  }

  const selected: StudentRecommendation[] = [];
  for (const kind of ['study-partner', 'tech-peer', 'iit-nit-guide'] as StudentRecommendationKind[]) {
    const seen = new Set<string>();
    const matches = candidates
      .filter(candidate => candidate.kind === kind)
      .sort((a, b) => b.score - a.score || a.user.fullName.localeCompare(b.user.fullName))
      .filter(candidate => {
        if (seen.has(candidate.user.id)) return false;
        seen.add(candidate.user.id);
        return true;
      })
      .slice(0, limitPerKind);
    selected.push(...matches);
  }

  return selected;
}