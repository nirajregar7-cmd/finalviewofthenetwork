import type { Community, User } from './types';

export type ExamTrack = 'jee' | 'neet' | 'school' | 'other';

const EXAM_TERMS = [
  'jee',
  'neet',
  'sat',
  'gate',
  'bitsat',
  'cuet',
  'clat',
  'ailet',
  'nda',
  'cds',
  'afcat',
  'upsc',
  'ssc',
  'cat',
  'xat',
  'mat',
  'cet',
  'jam',
  'ca foundation',
  'banking',
  'ibps',
  'sbi',
  'railway',
  'rrb',
  'cma',
  'cs',
  'net',
  'ctet',
  'tet',
  'nift',
  'nid',
  'uceed',
  'icar',
  'nchm',
  'olympiad',
  'gre',
  'gmat',
  'entrance exam',
  'competitive exam',
];

const COACHING_TERMS = [
  'physics wallah',
  'pw',
  'allen',
  'vedantu',
  'unacademy',
  'fiitjee',
  'aakash',
  'resonance',
  'motion education',
  'narayana',
];

const SCHOOL_LEVEL_PATTERN = /\b(?:class|grade)\s*(?:10|11|12)\b|\bschool\s*[—-]?\s*(?:10th|11th|12th)\b|\b(?:10th|11th|12th)\s*(?:standard|class|grade)\b/i;
const SCHOOL_PROGRAM_PATTERN = /\bschool\b/i;
const COLLEGE_PROGRAM_PATTERN = /\b(?:college|university|undergraduate|postgraduate)\b/i;
const COMPETITIVE_PROGRAM_PATTERN = /\b(?:competitive exam|exam aspirant|exam preparation|exam prep|entrance exam)\b/i;

type ExamProfile = Pick<User, 'college' | 'branch' | 'degree' | 'academicStream' | 'programGroup' | 'bio' | 'fields' | 'academicCategory' | 'goals' | 'interests' | 'skills' | 'year'>;

function includesExamTerm(text: string, term: string) {
  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return term.length <= 4
    ? new RegExp(`\\b${escapedTerm}\\b`, 'i').test(text)
    : text.includes(term);
}

function educationText(user: ExamProfile) {
  return [
    user.degree,
    user.academicStream,
    user.programGroup,
    user.academicCategory,
    ...(user.fields || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function profileText(user: ExamProfile) {
  return [
    user.college,
    user.branch,
    user.degree,
    user.academicStream,
    user.programGroup,
    user.bio,
    ...(user.fields || []),
    user.academicCategory,
    user.year,
    ...(user.goals || []),
    ...(user.interests || []),
    ...(user.skills || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function schoolClassLevel(user: ExamProfile): '10' | '11' | '12' | null {
  const text = `${user.year || ''} ${profileText(user)}`;
  const match = text.match(/\b(?:class|grade)\s*(10|11|12)\b|\b(10|11|12)th\b|\b(10|11|12)\b/i);
  return match ? ((match[1] || match[2] || match[3]) as '10' | '11' | '12') : null;
}

function isSchoolProfile(user: ExamProfile) {
  const text = educationText(user);
  return SCHOOL_PROGRAM_PATTERN.test(text) || SCHOOL_LEVEL_PATTERN.test(text);
}

function hasCompetitiveProgram(user: ExamProfile) {
  return COMPETITIVE_PROGRAM_PATTERN.test(educationText(user));
}

function isCollegeProfile(user: ExamProfile) {
  if (isSchoolProfile(user) || hasCompetitiveProgram(user)) return false;
  const text = educationText(user);
  return COLLEGE_PROGRAM_PATTERN.test(text) || Boolean(user.college?.trim());
}

export function isExamFocusedStudent(user: ExamProfile) {
  const text = profileText(user);
  if (isSchoolProfile(user) || hasCompetitiveProgram(user)) return true;
  // College students may optionally select an entrance exam while still
  // wanting the college competition experience. Only profiles without a
  // college education signal use the legacy free-text exam detection.
  if (isCollegeProfile(user)) return false;
  return SCHOOL_LEVEL_PATTERN.test(text)
    || EXAM_TERMS.some((term) => includesExamTerm(text, term))
    || COACHING_TERMS.some((term) => includesExamTerm(text, term));
}

export function isJeeStudent(user: ExamProfile) {
  if (isCollegeProfile(user)) return false;
  const text = profileText(user);
  // Coaching institutes serve multiple exams. Only an explicit JEE signal
  // should choose the JEE track; otherwise a NEET student at Allen/PW would
  // incorrectly receive JEE content.
  return /\bjee\b|\bjoint entrance\b/i.test(text);
}

export function isNeetStudent(user: ExamProfile) {
  if (isCollegeProfile(user)) return false;
  const text = profileText(user);
  return /\bneet\b|\bmedical entrance\b|\bpcb\b|\bbiology stream\b/i.test(text);
}

export function getExamTrack(user: ExamProfile): ExamTrack {
  const text = profileText(user);
  // An explicit JEE or NEET goal takes priority for Class 11/12 students so
  // their first view is the exam they are actively preparing for.
  if (isJeeStudent(user)) return 'jee';
  if (isNeetStudent(user)) return 'neet';
  if (isSchoolProfile(user)) return 'school';
  if (SCHOOL_LEVEL_PATTERN.test(text)) return 'school';
  return 'other';
}

export function findExamCommunity(
  user: ExamProfile,
  communities: Community[],
  requestedTrack: ExamTrack = getExamTrack(user),
) {
  const text = profileText(user);
  const targetTerms =
    requestedTrack === 'jee'
      ? ['jee', 'joint entrance']
      : requestedTrack === 'neet'
        ? ['neet', 'medical entrance', 'pcb', 'biology']
        : requestedTrack === 'school'
          ? ['class 10', 'class 11', 'class 12', 'school', 'board', 'cbse', 'isc']
          : EXAM_TERMS.filter((term) => !['jee', 'neet'].includes(term));
  if (requestedTrack === 'other') {
    targetTerms.push(...EXAM_TERMS.filter((term) => text.includes(term) && !['jee', 'neet'].includes(term)));
  }
  if (requestedTrack === 'school' || SCHOOL_LEVEL_PATTERN.test(text)) {
    targetTerms.push('class 10', 'class 11', 'class 12', 'school', 'board', 'cbse', 'isc');
  }
  const matches = communities.filter((community) => {
    const searchable = `${community.name} ${community.displayName} ${community.description} ${community.slug} ${(community.tags || []).join(' ')}`.toLowerCase();
    return targetTerms.some((term) => includesExamTerm(searchable, term));
  });
  const classLevel = schoolClassLevel(user);
  const exactClassCommunity = classLevel
    ? communities.find((community) =>
      community.id === `school-class-${classLevel}-india` ||
      new RegExp(`\\bclass\\s*${classLevel}\\b`).test(`${community.name} ${community.displayName} ${community.slug}`.toLowerCase()),
    )
    : null;
  if (exactClassCommunity) return exactClassCommunity;
  return matches.sort((first, second) => {
    const firstJoined = first.isJoined ? 1 : 0;
    const secondJoined = second.isJoined ? 1 : 0;
    return secondJoined - firstJoined || second.membersCount - first.membersCount;
  })[0] || null;
}