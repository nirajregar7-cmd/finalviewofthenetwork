import type { UserProfile } from '../types';
import { getStudentAudience } from '../utils/studentRecommendations';
import type { Community } from './types';

export interface StarterCommunityRecommendation {
  community: Community;
  reason: string;
  isPersonalized: boolean;
  score: number;
}

interface MatchSignal {
  term: string;
  label: string;
  weight: number;
  aliases?: string[];
}

const EXAM_ALIASES: Record<string, string[]> = {
  jee: ['joint entrance'],
  neet: ['medical entrance'],
};

const TOPIC_ALIASES: Record<string, string[]> = {
  'ai ml': ['artificial intelligence', 'machine learning', 'deep learning', 'data science', 'llm'],
  dsa: ['data structures', 'algorithms', 'competitive programming', 'problem solving'],
  'web development': ['web dev', 'frontend', 'front end', 'backend', 'back end', 'full stack', 'react', 'javascript'],
};

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9+#]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesPhrase(searchableText: string, phrase: string): boolean {
  const normalizedPhrase = normalizeSearchText(phrase);
  return Boolean(normalizedPhrase) && ` ${searchableText} `.includes(` ${normalizedPhrase} `);
}

function classAliases(classLevel: string): string[] {
  const number = classLevel.match(/\d+/)?.[0];
  return number
    ? [classLevel, `class ${number}`, `grade ${number}`, `${number}th`]
    : [classLevel];
}

function buildSignals(user: UserProfile): MatchSignal[] {
  const audience = getStudentAudience(user);
  const signals: MatchSignal[] = [];
  const add = (
    term: string | undefined,
    label: string,
    weight: number,
    aliases: string[] = [],
  ) => {
    if (!term?.trim()) return;
    const normalizedTerm = normalizeSearchText(term);
    if (normalizedTerm.length < 2) return;
    signals.push({ term, label, weight, aliases: [term, ...aliases] });
  };

  audience.examTargets.forEach((exam) => {
    add(exam, exam, 58, EXAM_ALIASES[normalizeSearchText(exam)] || []);
  });
  if (audience.classLevel) {
    add(audience.classLevel, audience.classLevel, 52, classAliases(audience.classLevel));
  }
  audience.techTopics.forEach((topic) => {
    add(topic, topic, 38, TOPIC_ALIASES[normalizeSearchText(topic)] || []);
  });
  (user.fields || []).forEach((field) => add(field, field, 25));
  (user.interests || []).forEach((interest) => add(interest, interest, 34));
  (user.skills || []).forEach((skill) => add(skill, skill, 22));
  [user.academicStream, user.branch, user.degree, user.programGroup]
    .forEach((path) => add(path, path, 17));
  (user.lookingFor || []).forEach((goal) => add(goal, goal, 9));

  return signals;
}

function activityScore(community: Community): number {
  return Math.min(
    6,
    Math.max(0, community.onlineCount || 0) * 0.25
      + Math.log10(Math.max(0, community.membersCount || 0) + 1) * 1.5,
  );
}

function rankCommunity(
  community: Community,
  signals: MatchSignal[],
): StarterCommunityRecommendation {
  const searchableText = normalizeSearchText([
    community.name,
    community.displayName,
    community.description,
    community.slug,
    ...(community.tags || []),
  ].join(' '));
  const matches = signals
    .filter((signal) => (signal.aliases || [signal.term])
      .some((alias) => matchesPhrase(searchableText, alias)))
    .sort((first, second) => second.weight - first.weight);
  const matchLabels = [...new Set(matches.map((match) => match.label))].slice(0, 2);
  const personalizedScore = matches.reduce((total, match) => total + match.weight, 0);

  return {
    community,
    reason: matchLabels.length
      ? `Matches ${matchLabels.join(' · ')}`
      : 'Popular with students',
    isPersonalized: matches.length > 0,
    score: personalizedScore + activityScore(community),
  };
}

export function getStarterCommunityRecommendations(
  user: UserProfile,
  communities: Community[],
  limit = 3,
): StarterCommunityRecommendation[] {
  if (limit <= 0) return [];
  const available = communities.filter((community) => !community.isJoined && !community.isBlocked);
  if (available.length === 0) return [];

  const signals = buildSignals(user);
  const ranked = available
    .map((community) => rankCommunity(community, signals))
    .sort((first, second) =>
      second.score - first.score
      || (second.community.onlineCount || 0) - (first.community.onlineCount || 0)
      || (second.community.membersCount || 0) - (first.community.membersCount || 0)
      || first.community.displayName.localeCompare(second.community.displayName),
    );

  const personalized = ranked.filter((recommendation) => recommendation.isPersonalized);
  const selected = personalized.slice(0, limit);
  if (selected.length === limit) return selected;

  const selectedIds = new Set(selected.map((recommendation) => recommendation.community.id));
  const popular = [...available]
    .filter((community) => !selectedIds.has(community.id))
    .sort((first, second) =>
      activityScore(second) - activityScore(first)
      || (second.membersCount || 0) - (first.membersCount || 0)
      || first.displayName.localeCompare(second.displayName),
    )
    .slice(0, limit - selected.length)
    .map((community) => ({
      community,
      reason: 'Popular with students',
      isPersonalized: false,
      score: activityScore(community),
    }));

  return [...selected, ...popular];
}