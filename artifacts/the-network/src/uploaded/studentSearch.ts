type ExamFilter = {
  label: string;
  pattern: RegExp;
};

export type SearchableStudent = {
  name?: string;
  fullName?: string;
  college?: string;
  schoolName?: string;
  coachingName?: string;
  branch?: string;
  degree?: string;
  academicStream?: string;
  programGroup?: string;
  academicCategory?: string;
  year?: string | number;
  location?: string;
  bio?: string;
  aboutMe?: string;
  fields?: string[];
  interests?: string[];
  skills?: string[];
  goals?: string[];
  lookingFor?: string[];
  availableFor?: string[] | Record<string, boolean>;
  projects?: Array<{ title: string; description: string; tags: string[] }>;
  mentorInfo?: { speciality: string; companyOrRole: string };
};

const EXAM_FILTERS: ExamFilter[] = [
  { label: 'JEE', pattern: /\bjee\b/i },
  { label: 'NEET', pattern: /\bneet\b/i },
  { label: 'BITSAT', pattern: /\bbitsat\b/i },
  { label: 'CUET', pattern: /\bcuet\b/i },
  { label: 'GATE', pattern: /\bgate\b/i },
  { label: 'CAT', pattern: /\bcat\b/i },
  { label: 'CLAT', pattern: /\bclat\b/i },
  { label: 'AILET', pattern: /\bailet\b/i },
  { label: 'UPSC', pattern: /\bupsc\b/i },
  { label: 'NDA', pattern: /\bnda\b/i },
  { label: 'CDS', pattern: /\bcds\b/i },
  { label: 'AFCAT', pattern: /\bafcat\b/i },
  { label: 'SSC', pattern: /\bssc\b|\bcgl\b/i },
  { label: 'XAT', pattern: /\bxat\b/i },
  { label: 'MAT', pattern: /\bmat\b/i },
  { label: 'CET', pattern: /\bcet\b/i },
  { label: 'IIT JAM', pattern: /\bjam\b/i },
  { label: 'CA', pattern: /\bca\b|chartered accountancy/i },
  { label: 'Banking / IBPS', pattern: /\bbanking\b|\bibps\b|\bsbi\b/i },
  { label: 'Railway / RRB', pattern: /\brailway\b|\brrb\b/i },
  { label: 'CMA', pattern: /\bcma\b/i },
  { label: 'Company Secretary', pattern: /\bcompany secretary\b|\bcs\b/i },
  { label: 'UGC NET', pattern: /\bnet\b/i },
  { label: 'CTET / TET', pattern: /\bctet\b|\btet\b/i },
  { label: 'NIFT', pattern: /\bnift\b/i },
  { label: 'NID', pattern: /\bnid\b/i },
  { label: 'UCEED', pattern: /\buceed\b/i },
  { label: 'ICAR', pattern: /\bicar\b/i },
  { label: 'NCHMCT', pattern: /\bnchm(?:ct)?\b/i },
  { label: 'Olympiad', pattern: /\bolympiad\b/i },
  { label: 'GRE', pattern: /\bgre\b/i },
  { label: 'GMAT', pattern: /\bgmat\b/i },
];

function profileExamText(user: SearchableStudent): string {
  return [
    user.degree,
    user.academicStream,
    user.programGroup,
    user.academicCategory,
    user.branch,
    user.bio,
    user.aboutMe,
    ...(user.fields ?? []),
    ...(user.goals ?? []),
    ...(user.interests ?? []),
    ...(user.skills ?? []),
  ]
    .filter(Boolean)
    .join(' ');
}

export function getStudentClassLabel(user: SearchableStudent): string {
  const numericYear = Number.parseInt(String(user.year ?? ''), 10);
  if (numericYear >= 9 && numericYear <= 12) return `Class ${numericYear}`;

  const text = [
    user.academicStream,
    user.branch,
    user.degree,
    user.programGroup,
    user.academicCategory,
    user.bio,
    user.aboutMe,
    ...(user.fields ?? []),
  ]
    .filter(Boolean)
    .join(' ');
  const match = text.match(
    /\b(?:class|grade)\s*(9|10|11|12|xii|xi|x)\b|\b(9|10|11|12)(?:st|nd|rd|th)\b/i,
  );
  const rawLevel = match?.[1] || match?.[2];
  if (!rawLevel) return '';

  const normalizedLevel = rawLevel.toLowerCase() === 'x'
    ? '10'
    : rawLevel.toLowerCase() === 'xi'
      ? '11'
      : rawLevel.toLowerCase() === 'xii'
        ? '12'
        : rawLevel;
  return `Class ${normalizedLevel}`;
}

export function getStudentExamLabels(user: SearchableStudent): string[] {
  const text = profileExamText(user);
  const labels = EXAM_FILTERS.filter(({ pattern }) => pattern.test(text)).map(({ label }) => label);
  if (
    labels.length === 0 &&
    /\b(?:competitive exam|exam aspirant|exam preparation|exam prep|entrance exam)\b/i.test(text)
  ) {
    labels.push('Other competitive exam');
  }
  return labels;
}

export function matchesStudentSearch(
  user: SearchableStudent,
  query: string,
  additionalText: string[] = [],
): boolean {
  const tokens = query
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return true;

  const projectText = (user.projects ?? []).flatMap((project) => [
    project.title,
    project.description,
    ...(project.tags ?? []),
  ]);
  const availabilityText = Array.isArray(user.availableFor)
    ? user.availableFor
    : Object.entries(user.availableFor ?? {})
        .filter(([, available]) => available)
        .map(([name]) => name);
  const profileText = [
    user.name,
    user.fullName,
    user.college,
    user.schoolName,
    user.coachingName,
    user.branch,
    user.degree,
    user.academicStream,
    user.programGroup,
    user.academicCategory,
    user.year,
    user.location,
    user.bio,
    user.aboutMe,
    user.mentorInfo?.speciality,
    user.mentorInfo?.companyOrRole,
    ...(user.fields ?? []),
    ...(user.interests ?? []),
    ...(user.skills ?? []),
    ...(user.goals ?? []),
    ...(user.lookingFor ?? []),
    ...additionalText,
    ...availabilityText,
    ...projectText,
    ...getStudentExamLabels(user),
    getStudentClassLabel(user),
  ]
    .filter(Boolean)
    .join(' ')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase();

  return tokens.every((token) => profileText.includes(token));
}

export function getAvailableStudentExamOptions(users: SearchableStudent[]): string[] {
  const labels = new Set(users.flatMap(getStudentExamLabels));
  return [...labels].sort((a, b) => a.localeCompare(b));
}
