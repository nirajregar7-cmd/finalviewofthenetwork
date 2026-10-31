export interface EducationRecord {
  college?: string | null;
  schoolName?: string | null;
  coachingName?: string | null;
  branch?: string | null;
  degree?: string | null;
  academicStream?: string | null;
  programGroup?: string | null;
  fields?: unknown;
  year?: number | string | null;
}

export interface EducationDisplay {
  kind: 'school' | 'college' | 'coaching' | 'exam' | 'other';
  compact: string;
  institution: string;
  details: string[];
}

const EXAM_LABELS = [
  ['ssc cgl', 'SSC CGL'],
  ['jee', 'JEE'],
  ['neet', 'NEET'],
  ['upsc', 'UPSC'],
  ['gate', 'GATE'],
  ['cat', 'CAT'],
  ['clat', 'CLAT'],
  ['nda', 'NDA'],
  ['cuet', 'CUET'],
  ['ca', 'CA'],
] as const;

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function profileFields(user: EducationRecord): string[] {
  if (!Array.isArray(user.fields)) return [];
  return user.fields.map(clean).filter(Boolean);
}

function allEducationText(user: EducationRecord): string {
  return [
    user.schoolName,
    user.coachingName,
    user.college,
    user.degree,
    user.academicStream,
    user.programGroup,
    user.branch,
    ...profileFields(user),
  ]
    .map(clean)
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function isSchoolProfile(user: EducationRecord): boolean {
  const group = clean(user.programGroup).toLowerCase();
  const degree = clean(user.degree).toLowerCase();
  return Boolean(clean(user.schoolName)) ||
    group === 'school' ||
    degree === 'school student' ||
    Boolean(classLabel(user));
}

function isCoachingProfile(user: EducationRecord): boolean {
  const group = clean(user.programGroup).toLowerCase();
  const degree = clean(user.degree).toLowerCase();
  return Boolean(clean(user.coachingName)) || group === 'coaching' || degree === 'coaching student';
}

function isExamProfile(user: EducationRecord): boolean {
  const group = clean(user.programGroup).toLowerCase();
  if (group === 'competitive exam / preparation') return true;
  // Legacy exam profiles may not have programGroup. Do not classify college
  // profiles from an exam interest alone when their college program is known.
  if (clean(user.college)) return false;
  return EXAM_LABELS.some(([token]) => allEducationText(user).includes(token));
}

function classLabel(user: EducationRecord): string {
  const text = [user.academicStream, user.branch, user.year, ...profileFields(user)]
    .map(clean)
    .filter(Boolean)
    .join(' ');
  const match = text.match(/\b(?:class\s*)?(9|10|11|12)(?:st|nd|rd|th)?\b/i);
  return match ? `Class ${match[1]}` : '';
}

function schoolStream(user: EducationRecord): string {
  const stream = clean(user.academicStream)
    .replace(/\b(?:class\s*)?(9|10|11|12)(?:st|nd|rd|th)?\b/gi, '')
    .replace(/\s*[—-]\s*/g, ' · ')
    .replace(/\s+/g, ' ')
    .replace(/^(school|student)\s*$/i, '')
    .trim();
  return stream;
}

function examLabel(user: EducationRecord): string {
  const text = allEducationText(user);
  const match = EXAM_LABELS.find(([token]) => text.includes(token));
  if (match) return match[1];

  const candidate = clean(user.degree) || clean(user.branch);
  return candidate && !/student|preparation|exam/i.test(candidate) ? candidate : 'Competitive Exam';
}

function collegeYearLabel(year: number | string | null | undefined): string {
  const value = clean(year);
  if (value) {
    if (/year|postgraduate|phd|graduat/i.test(value)) return value;
    const numeric = Number.parseInt(value, 10);
    if (!Number.isFinite(numeric) || numeric < 1) return '';
    if (numeric === 1) return '1st Year';
    if (numeric === 2) return '2nd Year';
    if (numeric === 3) return '3rd Year';
    return `${numeric}th Year`;
  }

  if (typeof year === 'number' && year >= 1) {
    if (year === 1) return '1st Year';
    if (year === 2) return '2nd Year';
    if (year === 3) return '3rd Year';
    return `${year}th Year`;
  }
  return '';
}

export function getEducationDisplay(user: EducationRecord): EducationDisplay {
  const institution = clean(user.coachingName) || clean(user.schoolName) || clean(user.college);

  if (isSchoolProfile(user)) {
    const level = classLabel(user) || 'School Student';
    const stream = schoolStream(user);
    const schoolExam = EXAM_LABELS.some(([token]) => allEducationText(user).includes(token))
      ? `${examLabel(user)} Aspirant`
      : '';
    return {
      kind: 'school',
      compact: [level, schoolExam, stream].filter(Boolean).join(' · '),
      institution,
      details: [level, schoolExam, stream].filter(Boolean),
    };
  }

  if (isCoachingProfile(user)) {
    const goal = clean(user.degree).replace(/^coaching student$/i, '').trim();
    const level = clean(user.year);
    const focus = clean(user.branch);
    return {
      kind: 'coaching',
      compact: [goal, level, focus].filter(Boolean).join(' · ') || 'Coaching Student',
      institution,
      details: [goal, level, focus].filter(Boolean),
    };
  }

  if (isExamProfile(user)) {
    const exam = `${examLabel(user)} Aspirant`;
    const level = clean(user.academicStream);
    const levelFirst = /\bclass\b|\bgrade\b|\b11th\b|\b12th\b/i.test(level);
    return {
      kind: 'exam',
      compact: [levelFirst ? level : '', exam, levelFirst ? '' : level].filter(Boolean).join(' · '),
      institution,
      details: [exam, level].filter(Boolean),
    };
  }

  const year = collegeYearLabel(user.year);
  const degree = clean(user.degree)
    .replace(/^(school student|other)$/i, '')
    .trim();
  const branch = clean(user.branch)
    .replace(/^(school|student|other)$/i, '')
    .trim();
  const program = [degree, branch && branch.toLowerCase() !== degree.toLowerCase() ? branch : '']
    .filter(Boolean)
    .join(' ');

  if (year || program || institution) {
    return {
      kind: 'college',
      compact: [year || 'College Student', program].filter(Boolean).join(' · '),
      institution,
      details: [year || 'College Student', program].filter(Boolean),
    };
  }

  return {
    kind: 'other',
    compact: 'Student',
    institution,
    details: ['Student'],
  };
}

export function educationCompact(user: EducationRecord): string {
  return getEducationDisplay(user).compact;
}