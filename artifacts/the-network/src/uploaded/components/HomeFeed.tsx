import React, { useLayoutEffect, useRef, useState } from 'react';
import {
  Heart,
  MessageSquare,
  Bookmark,
  Repeat2,
  ArrowRight,
  Sparkles,
  Trophy,
  Clock,
  Send,
  Building,
  CheckCircle2,
  UserPlus,
  UserCheck,
  GraduationCap,
  BookOpen,
  MapPin,
  BriefcaseBusiness,
  MessageCircle,
  CornerUpLeft,
  FileText,
  Github,
  Award,
  Camera,
  Image,
  PenLine,
  Users,
  Code2,
  Shield,
  Rocket,
  Maximize2,
  X,
  Globe2,
  Building2,
  EyeOff,
} from 'lucide-react';
import { getEducationDisplay } from '../../utils/education';
import { Community, Opportunity, Post, User, NavTab } from '../types';
import type { Connection as CoreConnection } from '../../types';
import { LinkPreview, LinkifiedText, extractUrls } from './LinkPreview';
import { SocialShareMenu } from './SocialShareMenu';
import type { HomeFeedFilter } from '../homeFeed';
import { isExamFocusedStudent, isJeeStudent } from '../examMode';
import { SafeAvatar } from './SafeAvatar';
import { AuthenticatedImage } from './AuthenticatedImage';
import NetworkLoadingScreen from '../../components/NetworkLoadingScreen';
import { PostActionMenu } from './PostActionMenu';
import { PostEditorModal } from './PostEditorModal';
import { PostPoll } from './PostPoll';
import { InlineCommentComposer, type InlineCommentComposerHandle } from './InlineCommentComposer';

type ConnectionKind = CoreConnection['type'];

const CLASS_EXAM_OPTIONS = [
  { value: 'jee', label: 'JEE Main / Advanced', terms: ['jee'] },
  { value: 'neet', label: 'NEET-UG', terms: ['neet'] },
  { value: 'sat', label: 'SAT', terms: ['sat'] },
  { value: 'bitsat', label: 'BITSAT', terms: ['bitsat'] },
  { value: 'cuet', label: 'CUET', terms: ['cuet'] },
  { value: 'cet', label: 'MHT-CET / State CET', terms: ['cet'] },
  { value: 'clat', label: 'CLAT / AILET', terms: ['clat', 'ailet'] },
  { value: 'defence', label: 'NDA / CDS / AFCAT', terms: ['nda', 'cds', 'afcat'] },
  { value: 'gate', label: 'GATE / JAM', terms: ['gate', 'jam'] },
  { value: 'management', label: 'CAT / XAT / MAT', terms: ['cat', 'xat', 'mat'] },
  { value: 'upsc', label: 'UPSC', terms: ['upsc'] },
  { value: 'ssc', label: 'SSC CGL / CHSL', terms: ['ssc'] },
  { value: 'banking', label: 'Banking / IBPS / SBI', terms: ['banking', 'ibps', 'sbi'] },
  { value: 'other', label: 'Other competitive exams', terms: ['competitive exams', 'aptitude', 'reasoning'] },
] as const;

interface HomeFeedProps {
  currentUser: User;
  users: User[];
  posts: Post[];
  opportunities: Opportunity[];
  communities: Community[];
  onSelectCommunity: (slug: string) => void;
  onSelectTab: (tab: NavTab) => void;
  onOpenNetworkChallenge?: () => void;
  onOpenProfile: (user: User) => void;
  onOpenOpportunity: (opp: Opportunity) => void;
  onToggleConnect: (userId: string, type?: ConnectionKind, message?: string) => void | Promise<void>;
  onToggleUpvote: (postId: string) => void;
  onToggleLike: (postId: string) => void;
  onToggleSave: (postId: string) => void;
  onEditPost?: (postId: string, updates: { title: string; content: string }) => Promise<void> | void;
  onDeletePost?: (postId: string) => Promise<void> | void;
  onResharePost?: (postId: string) => Promise<void> | void;
  onSharePostToCommunity?: (postId: string, communityId: string) => Promise<void>;
  onVotePoll?: (postId: string, optionIndex: number) => Promise<void> | void;
  onAddComment: (
    postId: string,
    commentText: string,
    isAnonymous?: boolean,
    replyToId?: string | null,
  ) => void | Promise<void>;
  onOpenCreatePost?: (requestType?: string) => void;
  onStartAnonymousChat?: (postId: string) => void;
  onToggleJoinCommunity?: (slug: string) => void | Promise<void>;
  feedFilter?: HomeFeedFilter;
  onFeedFilterChange?: (filter: HomeFeedFilter) => void;
  isFeedLoading?: boolean;
  isLoadingMoreFeedPosts?: boolean;
  feedError?: string | null;
  loadMoreFeedError?: string | null;
  hasMoreFeedPosts?: boolean;
  onRetryFeed?: () => void;
  onLoadMoreFeed?: () => void;
  focusPostId?: string | null;
  focusReply?: boolean;
  onFocusPostHandled?: () => void;
}

export const HomeFeed: React.FC<HomeFeedProps> = ({
  currentUser,
  users,
  posts,
  opportunities,
  communities,
  onSelectCommunity,
  onSelectTab,
  onOpenNetworkChallenge,
  onOpenProfile,
  onOpenOpportunity,
  onToggleConnect,
  onToggleUpvote,
  onToggleLike,
  onToggleSave,
  onEditPost,
  onDeletePost,
  onResharePost,
  onSharePostToCommunity,
  onVotePoll,
  onAddComment,
  onOpenCreatePost,
  onStartAnonymousChat,
  onToggleJoinCommunity,
  feedFilter: controlledFeedFilter,
  onFeedFilterChange,
  isFeedLoading = false,
  isLoadingMoreFeedPosts = false,
  feedError,
  loadMoreFeedError,
  hasMoreFeedPosts = false,
  onRetryFeed,
  onLoadMoreFeed,
  focusPostId,
  focusReply = false,
  onFocusPostHandled,
}) => {
  const homeFeedRootRef = useRef<HTMLDivElement>(null);
  const horizontalScrollPositionsRef = useRef<Record<string, number>>({});
  const justJoinedScrollRef = useRef<HTMLDivElement>(null);

  // Feed tabs
  const [localFeedFilter, setLocalFeedFilter] = useState<HomeFeedFilter>('looking-for');
  const feedFilter = controlledFeedFilter ?? localFeedFilter;
  const setFeedFilter = (filter: HomeFeedFilter) => {
    setLocalFeedFilter(filter);
    onFeedFilterChange?.(filter);
  };

  // Background refreshes replace the recommendation arrays. Keep every
  // horizontal rail at the user's current position while those cards update.
  // The stored positions live for this mounted Home view and are restored
  // after a rail is conditionally added or its cards change.
  useLayoutEffect(() => {
    const root = homeFeedRootRef.current;
    if (!root) return;

    const rails = Array.from(
      root.querySelectorAll<HTMLElement>('[data-preserve-horizontal-scroll]'),
    );
    const cleanups = rails.map((rail) => {
      const key = rail.dataset.preserveHorizontalScroll;
      if (!key) return () => {};

      const savedPosition = horizontalScrollPositionsRef.current[key];
      if (typeof savedPosition === 'number') rail.scrollLeft = savedPosition;

      const handleScroll = () => {
        horizontalScrollPositionsRef.current[key] = rail.scrollLeft;
      };
      rail.addEventListener('scroll', handleScroll, { passive: true });
      return () => rail.removeEventListener('scroll', handleScroll);
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [users, communities, opportunities, posts, feedFilter]);

  // Inline comment state
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<string | null>(null);
  const [expandedContentPostIds, setExpandedContentPostIds] = useState<Set<string>>(() => new Set());
  const commentInputRefs = useRef<Record<string, InlineCommentComposerHandle | null>>({});
  const commentDraftsRef = useRef<Record<string, string>>({});
  const [anonymousCommentPosts, setAnonymousCommentPosts] = useState<Record<string, boolean>>({});
  const [replyingTo, setReplyingTo] = useState<Record<string, string | null>>({});
  const [commentSubmitting, setCommentSubmitting] = useState<Record<string, boolean>>({});
  const [commentErrors, setCommentErrors] = useState<Record<string, string>>({});
  const [requestedUserIds, setRequestedUserIds] = useState<string[]>([]);
  const [connectingUserId, setConnectingUserId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);
  const [selectedClassExam, setSelectedClassExam] = useState('');
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [resharingPostId, setResharingPostId] = useState<string | null>(null);
  const [joiningCommunityIds, setJoiningCommunityIds] = useState<Set<string>>(() => new Set());

  React.useEffect(() => {
    if (!focusPostId || !posts.some((post) => post.id === focusPostId)) return;

    setExpandedCommentsPostId(focusPostId);
    const timer = window.setTimeout(() => {
      const target = Array.from(document.querySelectorAll<HTMLElement>('[data-post-id]'))
        .find((element) => element.dataset.postId === focusPostId);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });

      if (focusReply) {
        const input = Array.from(document.querySelectorAll<HTMLInputElement>('[data-post-comment-input]'))
          .find((element) => element.dataset.postCommentInput === focusPostId);
        input?.focus();
      }
      onFocusPostHandled?.();
    }, 80);

    return () => window.clearTimeout(timer);
  }, [posts, focusPostId, focusReply, onFocusPostHandled]);

  React.useEffect(() => {
    if (!lightboxImage) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightboxImage(null);
    };
    const previousOverflow = document.body.style.overflow;
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [lightboxImage]);

  const isPostingAnonymously = (postId: string) =>
    anonymousCommentPosts[postId] ??
    posts.some((post) => post.id === postId && post.isAnonymous);

  const handleDeleteFromHome = async (postId: string) => {
    if (!onDeletePost || !window.confirm('Delete this post? This cannot be undone.')) return;
    await onDeletePost(postId);
  };

  const handleReshareFromHome = async (postId: string) => {
    if (!onResharePost || resharingPostId) return;
    setResharingPostId(postId);
    try {
      await onResharePost(postId);
    } finally {
      setResharingPostId(null);
    }
  };

  const handleJoinCommunityFromPost = async (community: Community) => {
    if (!onToggleJoinCommunity || joiningCommunityIds.has(community.id)) return;
    setJoiningCommunityIds((previous) => new Set(previous).add(community.id));
    try {
      await onToggleJoinCommunity(community.slug);
    } finally {
      setJoiningCommunityIds((previous) => {
        const next = new Set(previous);
        next.delete(community.id);
        return next;
      });
    }
  };

  const handlePostCommentSubmit = async (postId: string, text: string): Promise<boolean> => {
    if (!text.trim() || commentSubmitting[postId]) return false;
    setCommentSubmitting((previous) => ({ ...previous, [postId]: true }));
    setCommentErrors((previous) => ({ ...previous, [postId]: '' }));
    try {
      await onAddComment(postId, text.trim(), isPostingAnonymously(postId), replyingTo[postId] ?? null);
      setReplyingTo((previous) => ({ ...previous, [postId]: null }));
      return true;
    } catch {
      setCommentErrors((previous) => ({
        ...previous,
        [postId]: 'Could not send your reply. Please try again.',
      }));
      return false;
    } finally {
      setCommentSubmitting((previous) => ({ ...previous, [postId]: false }));
    }
  };

  const startReply = (postId: string, commentId: string, authorName: string) => {
    setExpandedCommentsPostId(postId);
    setReplyingTo((previous) => ({ ...previous, [postId]: commentId }));
    const composer = commentInputRefs.current[postId];
    const mention = authorName.startsWith('Anonymous ') ? '' : `@${authorName.split(/\s+/)[0]} `;
    if (composer && !composer.getValue().trim()) composer.setValue(mention);
    window.requestAnimationFrame(() => {
      commentInputRefs.current[postId]?.focus();
    });
  };

  const handleRecommendationConnect = async (
    userId: string,
    type: ConnectionKind = 'Friendship',
    message = 'Hi! I would love to connect with you.',
  ) => {
    if (connectingUserId || requestedUserIds.includes(userId)) return;
    setConnectingUserId(userId);
    try {
      await onToggleConnect(userId, type, message);
      setRequestedUserIds((previous) => [...previous, userId]);
    } catch {
      // Keep the card in its normal Connect state instead of showing a retry action.
    } finally {
      setConnectingUserId(null);
    }
  };

  // The server owns discovery filtering and ranking. Keep this surface as one
  // vertical feed so switching views never creates a second posting system.
  const filteredPosts = posts;
  const feedViews = [
    {
      id: 'looking-for',
      label: 'Looking For',
      icon: Users,
      activeTextClass: 'text-violet-700',
      iconClass: 'bg-violet-50 text-violet-700',
      underlineClass: 'bg-violet-600',
      tabClass: 'text-slate-500 hover:text-violet-700',
    },
    {
      id: 'beyond-campus',
      label: 'Beyond Campus',
      icon: Globe2,
      activeTextClass: 'text-indigo-700',
      iconClass: 'bg-sky-50 text-sky-600',
      underlineClass: 'bg-indigo-600',
      tabClass: 'text-slate-500 hover:text-indigo-700',
    },
    {
      id: 'college',
      label: 'My College',
      icon: Building2,
      activeTextClass: 'text-emerald-700',
      iconClass: 'bg-emerald-50 text-emerald-600',
      underlineClass: 'bg-emerald-600',
      tabClass: 'text-slate-500 hover:text-emerald-700',
    },
    {
      id: 'learn',
      label: 'Learn',
      icon: BookOpen,
      activeTextClass: 'text-violet-700',
      iconClass: 'bg-indigo-50 text-indigo-600',
      underlineClass: 'bg-violet-600',
      tabClass: 'text-slate-500 hover:text-violet-700',
    },
  ] as const;
  const profileTerms = [
    currentUser.college,
    currentUser.schoolName,
    currentUser.coachingName,
    currentUser.branch,
    currentUser.degree,
    currentUser.academicStream,
    currentUser.programGroup,
    currentUser.year,
    currentUser.bio,
    ...(currentUser.fields || []),
    ...(currentUser.academicCategory ? [currentUser.academicCategory] : []),
    ...(currentUser.goals || []),
    ...(currentUser.interests || []),
    ...(currentUser.skills || []),
  ].filter(Boolean).map((term) => term!.toLowerCase());
  const profileContext = profileTerms.join(' ');
  const classLevel = /(?:class|grade)\s*11\b|\b11th\b|\b11\b/.test(profileContext)
    ? '11'
    : /(?:class|grade)\s*12\b|\b12th\b|\b12\b/.test(profileContext)
      ? '12'
      : null;
  const coachingTerms = [
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
  const examTerms = [
    'jee',
    'neet',
    'gate',
    'bitsat',
    'cuet',
    'clat',
    'upsc',
    'nda',
    'cat',
    'ssc',
    'entrance exam',
    'competitive exam',
  ];
  const getStudentClassLevel = (user: User): string | null => {
    const text = [
      user.schoolName,
      user.coachingName,
      user.academicStream,
      user.branch,
      user.degree,
      user.programGroup,
      user.academicCategory,
      user.bio,
      ...(user.fields || []),
      ...(user.goals || []),
      ...(user.interests || []),
    ]
      .filter(Boolean)
      .join(' ');
    const match = text.match(/\b(?:class|grade)\s*(9|10|11|12)\b|\b(9|10|11|12)(?:st|nd|rd|th)\b/i);
    return match ? (match[1] || match[2]) : null;
  };
  const getStudentExam = (user: User): string | null => {
    const text = [
      user.degree,
      user.academicStream,
      user.programGroup,
      user.academicCategory,
      user.bio,
      ...(user.fields || []),
      ...(user.goals || []),
      ...(user.interests || []),
      ...(user.skills || []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return examTerms.find(term => new RegExp(`\\b${term.replace(/[+]/g, '\\$&')}\\b`, 'i').test(text)) || null;
  };
  const getStudentMode = (user: User): 'school' | 'college' | 'general' => {
    const educationKind = getEducationDisplay(user).kind;
    if (educationKind === 'college') return 'college';
    if (
      educationKind === 'school' ||
      educationKind === 'coaching' ||
      educationKind === 'exam' ||
      getStudentClassLevel(user) ||
      getStudentExam(user)
    ) {
      return 'school';
    }
    return 'general';
  };
  const isDropper = (user: User): boolean =>
    /\b(?:dropper|drop\s*year|repeater|repeat\s*year)\b/i.test([
      user.degree,
      user.academicStream,
      user.branch,
      user.bio,
      ...(user.goals || []),
      ...(user.interests || []),
    ].filter(Boolean).join(' '));
  const isCompatibleStudyStage = (current: User, candidate: User): boolean => {
    const currentMode = getStudentMode(current);
    const candidateMode = getStudentMode(candidate);
    if (currentMode !== candidateMode) return false;

    if (currentMode === 'school') {
      const currentClass = getStudentClassLevel(current);
      const candidateClass = getStudentClassLevel(candidate);
      const currentExam = getStudentExam(current);
      const candidateExam = getStudentExam(candidate);

      // A Class 12 student should not be shown a college profile or a
      // dropper just because both profiles mention an exam such as JEE.
      if (currentClass && candidateClass !== currentClass) return false;
      if (!currentClass && isDropper(current) !== isDropper(candidate)) return false;
      if (currentExam && candidateExam && currentExam !== candidateExam) return false;
      if (currentExam && !candidateExam && !currentClass) return false;
    }

    return true;
  };
  const guidanceTerms = ['iit', 'nit', 'josaa', 'counselling', 'counseling', 'college guidance', 'mentorship'];
  const guidanceCommunityTerms = ['josaa', 'counselling', 'counseling', 'college guidance', 'guidance', 'mentor', 'mentorship'];
  const codingTerms = [
    'dsa',
    'data structure',
    'algorithm',
    'competitive programming',
    'coding',
    'programming',
    'python',
    'c++',
    'cpp',
    'java',
    'web development',
    'web dev',
    'react',
    'frontend',
    'backend',
    'full stack',
  ];
  const innovationTerms = [
    'robotics',
    'robot',
    'aerospace',
    'aeronautics',
    'space',
    'satellite',
    'drone',
    'embedded',
    'iot',
    'electronics',
    'arduino',
    'raspberry pi',
    'mechanical',
    'rocket',
  ];
  const builderTerms = [
    'entrepreneurship',
    'entrepreneur',
    'startup',
    'founder',
    'business',
    'product',
    'pitch',
    'innovation',
  ];
  const schoolStageTerms = [
    'class 10',
    'class 11',
    'class 12',
    '10th',
    '11th',
    '12th',
    'school',
    'board',
    'higher secondary',
    'study partner',
  ];
  const profileRecommendationTerms = [
    currentUser.schoolName,
    currentUser.coachingName,
    currentUser.branch,
    currentUser.degree,
    currentUser.academicStream,
    currentUser.programGroup,
    currentUser.year,
    currentUser.bio,
    ...(currentUser.fields || []),
    ...(currentUser.academicCategory ? [currentUser.academicCategory] : []),
    ...(currentUser.goals || []),
    ...(currentUser.interests || []),
    ...(currentUser.skills || []),
  ].filter(Boolean).map((term) => term!.toLowerCase());
  const profileInterestContext = profileRecommendationTerms.join(' ');
  const isSchoolLearner = schoolStageTerms.some((term) => profileContext.includes(term));
  const isCoachingLearner = coachingTerms.some((term) => profileContext.includes(term));
  const isCodingLearner = codingTerms.some((term) => profileInterestContext.includes(term));
  const isExamLearner = isCoachingLearner || isSchoolLearner || examTerms.some((term) => profileInterestContext.includes(term));
  const isInnovationLearner = innovationTerms.some((term) => profileInterestContext.includes(term));
  const isExamFocused = isExamFocusedStudent(currentUser);
  const isJeeFocused = isJeeStudent(currentUser);
  const wantsCollegeGuidance = isExamLearner || isSchoolLearner || guidanceTerms.some((term) => profileInterestContext.includes(term));
  const searchableCommunity = (community: Community) =>
    `${community.name} ${community.displayName} ${community.description} ${community.slug} ${(community.tags || []).join(' ')}`.toLowerCase();
  const selectedClassExamOption = CLASS_EXAM_OPTIONS.find((option) => option.value === selectedClassExam);
  const selectedClassExamCommunity = selectedClassExamOption
    ? communities
      .filter((community) => selectedClassExamOption.terms.some((term) => searchableCommunity(community).includes(term)))
      .sort((first, second) => second.membersCount - first.membersCount)[0]
    : undefined;
  const isCommunityType = (community: Community, terms: string[]) => {
    const searchable = searchableCommunity(community);
    return terms.some((term) => searchable.includes(term));
  };
  const isSchoolCommunity = (community: Community) => isCommunityType(community, schoolStageTerms);
  const isExamCommunity = (community: Community) => isCommunityType(community, examTerms);
  const isCodingCommunity = (community: Community) => isCommunityType(community, codingTerms);
  const isInnovationCommunity = (community: Community) => isCommunityType(community, innovationTerms);
  const isBuilderCommunity = (community: Community) => isCommunityType(community, builderTerms);
  const isGuidanceCommunity = (community: Community) =>
    isCommunityType(community, guidanceCommunityTerms) || isCommunityType(community, ['iit', 'nit']);
  const isCoachingRelevantCommunity = (community: Community) => {
    const searchable = searchableCommunity(community);
    return coachingTerms.some((term) => searchable.includes(term)) ||
      examTerms.some((term) => searchable.includes(term)) ||
      guidanceCommunityTerms.some((term) => searchable.includes(term));
  };
  const isAvailableCommunity = (community: Community) =>
    !community.isJoined && !currentUser.communities.includes(community.slug);
  const sortByStudentCount = (first: Community, second: Community) =>
    second.membersCount - first.membersCount;
  const currentCollege = currentUser.college.trim().toLowerCase();
  const isCurrentCollegeCommunity = (community: Community) => {
    if (community.category !== 'college') return false;
    const searchable = `${community.name} ${community.displayName} ${community.slug}`.toLowerCase();
    return currentUser.communities.includes(community.slug) ||
      (currentCollege.length > 2 && searchable.includes(currentCollege));
  };
  const isSuggestedCommunity = (community: Community) =>
    isSchoolCommunity(community) ||
    isExamCommunity(community) ||
    isCoachingRelevantCommunity(community) ||
    isCodingCommunity(community) ||
    isInnovationCommunity(community) ||
    isBuilderCommunity(community) ||
    isGuidanceCommunity(community) ||
    isCurrentCollegeCommunity(community);
  const recommendedCommunities = isCoachingLearner
    ? communities
      .filter((community) => isAvailableCommunity(community) && isCoachingRelevantCommunity(community))
      .sort(sortByStudentCount)
      .slice(0, 3)
    : [...communities]
    .filter((community) => isAvailableCommunity(community) && isSuggestedCommunity(community))
    .map((community) => {
      const searchable = `${community.name} ${community.displayName} ${community.description} ${community.slug}`.toLowerCase();
      const score = profileRecommendationTerms.reduce((total, term) => (
        term.length > 2 && searchable.includes(term) ? total + 1 : total
      ), 0);
      return { community, score };
    })
    .sort((a, b) =>
      sortByStudentCount(a.community, b.community) || b.score - a.score
    )
    .slice(0, 3)
    .map(({ community }) => community);
  const communitySuggestions = communities
    .filter((community) => isAvailableCommunity(community))
    .filter(isSuggestedCommunity)
    .sort((a, b) => {
      const score = (community: Community) => {
        const searchable = searchableCommunity(community);
        const profileMatches = profileRecommendationTerms.filter((term) => term.length > 2 && searchable.includes(term)).length;
        const coachingMatch = isCoachingLearner && coachingTerms.some((term) => searchable.includes(term)) ? 20 : 0;
        const examMatch = isExamLearner && examTerms.some((term) => searchable.includes(term)) ? 12 : 0;
        const guidanceMatch = wantsCollegeGuidance && guidanceTerms.some((term) => searchable.includes(term)) ? 10 : 0;
        const schoolMatch = isSchoolLearner && isSchoolCommunity(community) ? 18 : 0;
        const codingMatch = isCodingLearner && isCodingCommunity(community) ? 16 : 0;
        const innovationMatch = isInnovationLearner && isInnovationCommunity(community) ? 16 : 0;
        const collegeMatch = isCurrentCollegeCommunity(community) ? 15 : 0;
        return profileMatches * 3 + coachingMatch + examMatch + guidanceMatch + schoolMatch + codingMatch + innovationMatch + collegeMatch;
      };
      return score(b) - score(a) || sortByStudentCount(a, b);
    })
    .slice(0, 6);
  const classCommunity = classLevel
    ? communities.find((community) => community.id === `school-class-${classLevel}-india`)
    : undefined;
  const yiicCommunity = communities.find((community) =>
    community.id === 'comm-e6639404' || community.name.trim().toLowerCase() === 'yiic',
  );
  const shouldHighlightYiic = Boolean(classLevel && isJeeFocused && yiicCommunity);
  const prioritizedCommunitySuggestions = [
    classCommunity,
    ...communitySuggestions,
  ].filter((community, index, list): community is Community =>
    Boolean(community) && list.findIndex((candidate) => candidate?.id === community.id) === index,
  ).sort(sortByStudentCount);
  const learningCommunityTerms = [
    ...codingTerms,
    ...innovationTerms,
    ...builderTerms,
    'dsa',
    'python',
    'java',
    'c++',
    'cpp',
  ];
  const learningCommunitySuggestions = communities
    .filter((community) => isAvailableCommunity(community))
    .filter((community) => isCommunityType(community, learningCommunityTerms))
    .sort((a, b) => {
      const score = (community: Community) => {
        const searchable = searchableCommunity(community);
        return learningCommunityTerms.filter((term) => searchable.includes(term)).length;
      };
      return score(b) - score(a) || sortByStudentCount(a, b);
    })
    .slice(0, 10);
  const prioritizedLearningCommunitySuggestions = [
    shouldHighlightYiic ? yiicCommunity : undefined,
    ...learningCommunitySuggestions,
  ].filter((community, index, list): community is Community =>
    Boolean(community) && list.findIndex((candidate) => candidate?.id === community.id) === index,
  ).sort(sortByStudentCount);
  const featuredCommunityGroups = [
    ...(isCoachingLearner
      ? [{ label: 'Your coaching institute', terms: coachingTerms }]
      : []),
    ...(isExamLearner
      ? [{ label: 'Exam preparation', terms: examTerms }]
      : []),
    ...(wantsCollegeGuidance
      ? [{ label: 'IIT & NIT guidance', terms: guidanceCommunityTerms }]
      : []),
    ...((isExamFocused && !isCodingLearner && !isInnovationLearner) ? [] : [
      { label: 'DSA & Coding', terms: codingTerms },
      { label: 'Cybersecurity', terms: ['cyber', 'ethical hacking', 'security', 'ctf'] },
      { label: 'Web Development', terms: ['web dev', 'web development', 'full stack', 'react', 'node', 'frontend'] },
      { label: 'AI & ML', terms: ['ai', 'machine learning', 'deep learning', 'llm', 'artificial intelligence'] },
      { label: 'Robotics & Aerospace', terms: innovationTerms },
      { label: 'Placement Prep', terms: ['placement', 'interview', 'aptitude', 'career', 'job'] },
      { label: 'Projects & Startups', terms: ['project', 'startup', 'hackathon', 'build'] },
    ]),
  ];
  const collegeCommunity = communities
    .filter(isCurrentCollegeCommunity)
    .sort((a, b) => b.membersCount - a.membersCount)[0];
  const featuredCommunities = [
    collegeCommunity ? { ...collegeCommunity, featuredLabel: 'Your college' } : null,
    ...featuredCommunityGroups
    .map((group) => {
      const match = communities
        .map((community) => {
          const searchable = searchableCommunity(community);
          const coreSearchable = `${community.name} ${community.displayName} ${community.slug}`.toLowerCase();
          const score = group.terms.reduce((total, term) => (
            total + (coreSearchable.includes(term) ? 3 : searchable.includes(term) ? 1 : 0)
          ), 0);
          return { community, score };
        })
        .filter(({ score }) => score > 0)
        .sort((a, b) => {
          return b.score - a.score || b.community.membersCount - a.community.membersCount;
        })[0];
      return match ? { ...match.community, featuredLabel: group.label } : null;
    })
  ].filter((community): community is Community & { featuredLabel: string } => Boolean(community));
  const collegeTopicLabels = new Set([
    'DSA & Coding',
    'Cybersecurity',
    'Web Development',
    'AI & ML',
    'Placement Prep',
  ]);
  const collegeNeedCommunities = featuredCommunities.filter((community) =>
    isExamFocused
      ? community.featuredLabel === 'Exam preparation' || community.featuredLabel === 'IIT & NIT guidance'
      : community.featuredLabel === 'Your college' || collegeTopicLabels.has(community.featuredLabel),
  );
  const joinedCommunities = communities.filter((community) =>
    community.isJoined || currentUser.communities.includes(community.slug),
  );
  const joinedCommunityIds = new Set(joinedCommunities.map((community) => community.id));
  const suggestedNeedCommunities = communitySuggestions.slice(0, 7);
  const needCommunities = [
    ...joinedCommunities,
    ...suggestedNeedCommunities.filter((community) => !joinedCommunityIds.has(community.id)),
  ];
  const normalizeTerm = (term: string) =>
    term.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const normalizeYear = (year?: string) => {
    const value = (year || '').toLowerCase();
    if (value.includes('final') || value.includes('4') || value.includes('fourth')) return 'Final Year';
    if (value.includes('3') || value.includes('third')) return '3rd Year';
    if (value.includes('2') || value.includes('second')) return '2nd Year';
    if (value.includes('1') || value.includes('first')) return '1st Year';
    return year?.trim() || 'Student';
  };
  const myCommunityIds = new Set(
    communities.filter((community) => community.isJoined).map((community) => community.id),
  );
  const currentProfileTerms = profileTerms
    .map(normalizeTerm)
    .filter((term) => term.length > 2);
  const getJoinedCommunities = (user: User) =>
    communities.filter((community) => community.memberIds?.includes(user.id));
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const currentYear = normalizeYear(currentUser.year);
  const eligibleStudents = users
    .filter((user) =>
      user.id !== currentUser.id &&
      user.role !== 'admin' &&
      !user.isConnected &&
      !user.connectionPending &&
      !requestedUserIds.includes(user.id),
    );
  const studentRecommendationCandidates = eligibleStudents
    .map((user) => {
      const userTerms = [
        ...(user.goals || []),
        ...(user.interests || []),
        ...(user.skills || []),
      ].map(normalizeTerm);
      const sharedTerms = currentProfileTerms.filter((term) =>
        userTerms.some((userTerm) => userTerm === term),
      );
      const joined = getJoinedCommunities(user);
      const relevantCommunities = joined.filter((community) => {
        const searchable = normalizeTerm(`${community.name} ${community.displayName} ${community.description} ${community.slug}`);
        return currentProfileTerms.some((term) => searchable.includes(term));
      });
      const sharedCommunity = joined.some((community) => myCommunityIds.has(community.id));
      const createdAt = user.createdAt ? new Date(user.createdAt).getTime() : 0;
      const year = normalizeYear(user.year);
      const currentClass = getStudentClassLevel(currentUser);
      const candidateClass = getStudentClassLevel(user);
      const currentExam = getStudentExam(currentUser);
      const candidateExam = getStudentExam(user);
      const sameClass = Boolean(currentClass && candidateClass && currentClass === candidateClass);
      const sharedExam = Boolean(currentExam && candidateExam && currentExam === candidateExam);
      return {
        user,
        joined,
        sharedTerms: Array.from(new Set(sharedTerms)).slice(0, 2),
        relevantCommunities: relevantCommunities.slice(0, 2),
        year,
        compatibleStage: isCompatibleStudyStage(currentUser, user),
        isNew: Number.isFinite(createdAt) && createdAt >= thirtyDaysAgo,
        score:
          sharedTerms.length * 4 +
          relevantCommunities.length * 3 +
          (sharedCommunity ? 2 : 0) +
          (year === currentYear ? 2 : 0) +
          (sameClass ? 20 : 0) +
          (sharedExam ? 18 : 0) +
          (currentUser.college && user.college && currentUser.college.toLowerCase() === user.college.toLowerCase() ? 10 : 0) +
          (currentUser.branch && user.branch && currentUser.branch.toLowerCase() === user.branch.toLowerCase() ? 8 : 0),
        createdAt: Number.isFinite(createdAt) ? createdAt : 0,
      };
    })
    .filter(({ createdAt }) => createdAt > 0);
  const stageMatchedCandidates = studentRecommendationCandidates.filter(({ compatibleStage }) => compatibleStage);
  const interestMatchSuggestions = studentRecommendationCandidates
    .filter(({ user, score, isNew, compatibleStage }) => compatibleStage && user.hasProfilePhoto && score > 0 && !isNew)
    .sort((a, b) => b.score - a.score || b.createdAt - a.createdAt)
    .slice(0, 12);
  const interestMatchIds = new Set(interestMatchSuggestions.map(({ user }) => user.id));
  const recentCandidates = stageMatchedCandidates
    // The discovery card must still render for students without profile photos.
    // renderPersonCard already provides an initials fallback for that state.
    .filter(({ isNew, user }) => isNew && !interestMatchIds.has(user.id));
  const stageCandidates = stageMatchedCandidates
    .filter(({ user }) => !interestMatchIds.has(user.id));
  const discoveryCandidates = studentRecommendationCandidates
    .filter(({ user }) => !interestMatchIds.has(user.id));
  const justJoinedStudents = (
    recentCandidates.length > 0
      ? recentCandidates
      : stageCandidates.length > 0
        ? stageCandidates
        : discoveryCandidates
  )
    .sort((a, b) => Number(b.isNew) - Number(a.isNew) || b.createdAt - a.createdAt || b.score - a.score)
    .slice(0, 12);
  const isStudyPartner = (user: User) => [
    ...(user.goals || []),
    ...(user.interests || []),
    ...(Array.isArray(user.availableFor)
      ? user.availableFor
      : user.availableFor
        ? Object.entries(user.availableFor)
            .filter(([, enabled]) => enabled)
            .map(([key]) => key)
        : []),
  ].some((value) => /study|partner|exam|academic|research/i.test(value));
  const studyPartnerCandidates = stageMatchedCandidates
    .filter(({ user }) => isStudyPartner(user))
    .sort((a, b) => b.score - a.score || b.createdAt - a.createdAt);
  const studyPartnerStudents = (studyPartnerCandidates.length > 0
    ? studyPartnerCandidates
    : stageMatchedCandidates
  ).slice(0, 6);
  const joinedLabel = (createdAt: number) => {
    const days = Math.max(0, Math.floor((now - createdAt) / (24 * 60 * 60 * 1000)));
    if (days === 0) return 'Joined today';
    if (days === 1) return 'Joined yesterday';
    if (days < 7) return `Joined ${days} days ago`;
    return 'Joined this month';
  };
  const getInitials = (name: string) =>
    name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'N';
  const renderPersonCard = (
    candidate: typeof studentRecommendationCandidates[number],
    variant: 'interest' | 'new',
  ) => {
    const { user, sharedTerms, relevantCommunities, joined, year, createdAt } = candidate;
    const isRequested = requestedUserIds.includes(user.id) || Boolean(user.connectionPending);
    const isConnecting = connectingUserId === user.id;
    const sharedLabel = sharedTerms.length > 0
      ? `${sharedTerms.length} shared ${sharedTerms.length === 1 ? 'interest' : 'interests'}`
      : relevantCommunities.length > 0
        ? relevantCommunities.map((community) => community.displayName || community.name).join(' · ')
        : 'Same student network';
    if (variant === 'new') {
      const interestTags = (sharedTerms.length > 0 ? sharedTerms : user.interests || []).slice(0, 2);
      return (
        <article
          key={user.id}
          className="group flex h-[318px] w-[205px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_4px_18px_rgba(36,31,79,0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(36,31,79,0.12)]"
        >
          <button
            type="button"
            onClick={() => onOpenProfile(user)}
            aria-label={`Open ${user.name}'s profile`}
            className="flex min-h-0 flex-1 flex-col text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <div className={`relative flex h-[116px] w-full shrink-0 items-center justify-center ${
              user.avatar && user.hasProfilePhoto
                ? 'bg-slate-900'
                : 'bg-gradient-to-br from-violet-500 via-purple-600 to-sky-600'
            }`}>
              {user.avatar && user.hasProfilePhoto ? (
                <SafeAvatar
                  src={user.avatar}
                  name={user.name}
                  className="absolute inset-0 h-full w-full rounded-none object-cover"
                />
              ) : (
                <span className="relative text-5xl font-black leading-none text-white drop-shadow-lg">
                  {getInitials(user.name)}
                </span>
              )}
              {candidate.isNew && (
                <span className="absolute left-3 top-3 z-10 rounded-full bg-white/95 px-2.5 py-1 text-[9px] font-black tracking-wide text-emerald-700 shadow-sm">NEW</span>
              )}
            </div>
            <div className="min-h-0 flex-1 px-3.5 pb-2.5 pt-3">
              <span className="flex items-center gap-1">
                <span className="truncate text-[13px] font-black text-slate-900">{user.name}</span>
                {user.verified && <UserCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}
              </span>
              <span className="mt-0.5 block truncate text-[10px] font-medium text-slate-500">
                {user.college || 'The Network'}{user.branch ? ` · ${user.branch}` : ''}
              </span>
              {user.location?.trim() && (
                <span className="mt-0.5 flex min-w-0 items-center gap-1 truncate text-[10px] font-medium text-slate-500">
                  <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{user.location.trim()}</span>
                </span>
              )}
              <span className="mt-2 inline-flex rounded-full bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-700">{year}</span>
              <span className="mt-2 flex min-w-0 flex-wrap gap-1.5">
                {interestTags.map((interest, index) => (
                  <span
                    key={`${user.id}-${interest}`}
                    className={`max-w-full truncate rounded-full px-2 py-1 text-[9px] font-bold ${
                      index === 0 ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {interest}
                  </span>
                ))}
              </span>
              {sharedTerms.length > 0 && (
                <span className="mt-2 block truncate text-[9px] text-slate-400">{sharedLabel}</span>
              )}
            </div>
          </button>

          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/90 px-3 py-2.5">
            <span className="min-w-0 truncate text-[10px] font-semibold text-slate-500">
              {joinedLabel(createdAt)}
            </span>
            <button
              type="button"
              disabled={isConnecting || isRequested}
              onClick={() => onOpenProfile(user)}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-[10px] font-black transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                isRequested
                  ? 'bg-slate-200 text-slate-500'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {isConnecting ? 'Sending…' : isRequested ? 'Requested' : 'Connect'}
            </button>
          </div>
        </article>
      );
    }
    return (
      <article
        key={user.id}
        className={`min-w-[270px] max-w-[320px] shrink-0 snap-start overflow-hidden rounded-2xl border bg-white ${
          variant === 'interest' ? 'border-emerald-100' : 'border-amber-100'
        }`}
      >
        <button
          type="button"
          onClick={() => onOpenProfile(user)}
          className="flex w-full items-start gap-3 p-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          {user.avatar && user.hasProfilePhoto ? (
            <span className="relative h-11 w-11 shrink-0">
              <SafeAvatar src={user.avatar} name={user.name} className="h-11 w-11 rounded-2xl object-cover ring-1 ring-slate-100" />
              <span
                title="Profile photo"
                aria-label="Profile photo"
                className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-white"
              >
                <Camera className="h-2.5 w-2.5" />
              </span>
            </span>
          ) : (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-sm font-black text-indigo-700">
              {getInitials(user.name)}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-xs font-black text-slate-900">{user.name}</span>
              {user.verified && <UserCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}
            </span>
            <span className="mt-0.5 block truncate text-[10px] font-medium text-slate-500">
              {user.college || 'The Network'}{user.branch ? ` · ${user.branch}` : ''}
            </span>
            <span className="mt-1.5 inline-flex max-w-full truncate rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
              {sharedLabel}
            </span>
          </span>
        </button>
        <div className="flex items-center justify-between gap-2 border-t border-emerald-50 bg-emerald-50/30 px-3 py-2.5">
          <span className="min-w-0 truncate text-[10px] font-semibold text-slate-500">
            {relevantCommunities.length > 0
              ? relevantCommunities[0].displayName || relevantCommunities[0].name
              : joined[0]?.displayName || joined[0]?.name || 'Explore together'}
          </span>
          <button
            type="button"
            disabled={isConnecting || isRequested}
            onClick={() => onOpenProfile(user)}
            className={`shrink-0 rounded-xl px-3 py-1.5 text-[10px] font-black transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
              isRequested
                ? 'bg-slate-200 text-slate-500'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {isConnecting ? 'Sending…' : isRequested ? 'Requested' : 'Connect'}
          </button>
        </div>
      </article>
    );
  };
  const InterestMatchesCard = () => interestMatchSuggestions.length > 0 ? (
    <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50/70 p-4 shadow-[0_8px_30px_rgba(16,185,129,0.06)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <UserCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">People like you</p>
            <h2 className="mt-0.5 text-sm font-black text-slate-900">Make new connections</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">Students who share your interests, communities, and a profile photo.</p>
          </div>
        </div>
        <button onClick={() => onSelectTab('connect')} className="shrink-0 text-[11px] font-bold text-emerald-700 hover:text-emerald-800">See all</button>
      </div>
       <div
         data-preserve-horizontal-scroll="people-like-you"
         className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1 no-scrollbar"
       >
        {interestMatchSuggestions.map((candidate) => renderPersonCard(candidate, 'interest'))}
      </div>
    </section>
  ) : null;
  const JustJoinedCard = () => justJoinedStudents.length > 0 ? (
    <section className="overflow-hidden rounded-3xl border border-amber-100 bg-gradient-to-br from-white via-white to-orange-50/70 p-4 shadow-[0_8px_30px_rgba(245,158,11,0.07)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <GraduationCap className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">Just joined</p>
            <h2 className="mt-0.5 text-sm font-black text-slate-900 sm:text-base">New on The Network</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">Meet students from your year and nearby communities.</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-1 sm:flex">
            <button
              type="button"
              aria-label="Previous students"
              onClick={() => justJoinedScrollRef.current?.scrollBy({ left: -420, behavior: 'smooth' })}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-200 hover:text-indigo-700"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
            </button>
            <button
              type="button"
              aria-label="Next students"
              onClick={() => justJoinedScrollRef.current?.scrollBy({ left: 420, behavior: 'smooth' })}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-200 hover:text-indigo-700"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <button onClick={() => onSelectTab('connect')} className="shrink-0 text-[11px] font-bold text-amber-700 hover:text-amber-800">Meet more</button>
        </div>
      </div>
      <div
        ref={justJoinedScrollRef}
        data-preserve-horizontal-scroll="new-on-network"
        className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1 no-scrollbar"
      >
        {justJoinedStudents.map((candidate) => renderPersonCard(candidate, 'new'))}
      </div>
    </section>
  ) : null;
  const StudyPartnerCard = () => (
    <section className="overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/60 p-4 shadow-[0_8px_30px_rgba(79,70,229,0.08)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
            <BookOpen className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-700">Looking for study</p>
            <h2 className="mt-0.5 text-sm font-black text-slate-900 sm:text-base">Find a study partner</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">Students who are ready to learn together.</p>
          </div>
        </div>
        <button type="button" onClick={() => onSelectTab('connect')} className="shrink-0 text-[11px] font-black text-indigo-700 hover:text-indigo-800">Meet more</button>
      </div>

      {studyPartnerStudents.length > 0 && (
        <div
          data-preserve-horizontal-scroll="study-partners"
          className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1 no-scrollbar"
        >
          {studyPartnerStudents.map(({ user }) => {
            return (
              <article key={`study-${user.id}`} className="group flex h-[318px] w-[205px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_4px_18px_rgba(36,31,79,0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(36,31,79,0.12)]">
                <button
                  type="button"
                  onClick={() => onOpenProfile(user)}
                  aria-label={`Open ${user.name}'s profile`}
                  className="flex min-h-0 flex-1 flex-col text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                >
                  <div className="relative flex h-[116px] w-full shrink-0 items-center justify-center bg-gradient-to-br from-indigo-500 via-violet-600 to-blue-600">
                    <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[9px] font-black tracking-wide text-indigo-800 shadow-sm">STUDY PARTNER</span>
                    <span className="relative flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full border border-white/60 bg-white/20 text-xl font-black text-white shadow-lg">
                      {user.avatar && user.hasProfilePhoto
                        ? <SafeAvatar src={user.avatar} name={user.name} className="h-full w-full rounded-full object-cover" />
                        : getInitials(user.name)}
                    </span>
                  </div>
                  <div className="min-h-0 flex-1 px-3.5 pb-2.5 pt-3">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[13px] font-black text-slate-900">{user.name}</span>
                      {user.verified && <UserCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}
                    </span>
                    <span className="mt-0.5 block truncate text-[10px] font-medium text-slate-500">
                      {user.college || 'The Network'}{user.branch ? ` · ${user.branch}` : ''}
                    </span>
                    <span className="mt-2 inline-flex rounded-full bg-indigo-50 px-2 py-1 text-[9px] font-bold text-indigo-700">
                      {getEducationDisplay(user).compact || 'Student'}
                    </span>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {user.skills.slice(0, 2).length > 0
                        ? user.skills.slice(0, 2).map((skill, index) => (
                          <span
                            key={`${user.id}-${skill}`}
                            className={`max-w-full truncate rounded-full px-2 py-1 text-[9px] font-bold ${index === 0 ? 'bg-violet-50 text-violet-700' : 'bg-emerald-50 text-emerald-700'}`}
                          >
                            {skill}
                          </span>
                        ))
                        : <span className="rounded-full bg-violet-50 px-2 py-1 text-[9px] font-bold text-violet-700">Ready to study</span>}
                    </div>
                  </div>
                </button>
                <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/90 px-3 py-2.5">
                  <span className="min-w-0 truncate text-[10px] font-semibold text-slate-500">
                    {user.skills.length ? user.skills.slice(0, 2).join(' · ') : 'Shared learning goals'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenProfile(user)}
                    className="shrink-0 cursor-pointer rounded-xl bg-violet-600 px-3.5 py-2 text-[10px] font-black text-white transition-colors hover:bg-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                  >
                    View profile
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );

  const CommunitySuggestionsCard = ({
    suggestions = prioritizedCommunitySuggestions,
    title = classLevel ? `Class ${classLevel} community` : 'Communities to join',
    subtitle = classLevel && classCommunity
      ? `Join Class ${classLevel} Students India and meet peers preparing for the same next step.`
      : 'Relevant learning groups, with the most joined students shown first.',
    eyebrow = classLevel && classCommunity ? `For Class ${classLevel}` : 'Recommended for you',
    featuredCommunityId,
    showExamPicker = false,
  }: {
    suggestions?: Community[];
    title?: string;
    subtitle?: string;
    eyebrow?: string;
    featuredCommunityId?: string;
    showExamPicker?: boolean;
  } = {}) => {
    return suggestions.length > 0 ? (
      <section className="overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-white via-white to-indigo-50/65 p-3.5 shadow-[0_12px_34px_rgba(79,70,229,0.08)] sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-700 shadow-inner">
              <Building className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-600">{eyebrow}</p>
              <h2 className="mt-0.5 text-sm font-black text-slate-900">{title}</h2>
              <p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelectTab('communities')}
            className="shrink-0 text-[11px] font-bold text-indigo-700 hover:text-indigo-800"
          >
            See all
          </button>
        </div>

        {showExamPicker && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-2.5">
            <label htmlFor="class-exam-picker" className="shrink-0 text-[10px] font-black uppercase tracking-wide text-emerald-700">
              Preparing for?
            </label>
            <select
              id="class-exam-picker"
              value={selectedClassExam}
              onChange={(event) => setSelectedClassExam(event.target.value)}
              className="min-h-9 min-w-0 flex-1 rounded-xl border border-emerald-200 bg-white px-2.5 py-2 text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="">Select an exam</option>
              {CLASS_EXAM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {selectedClassExam && (
              <button
                type="button"
                onClick={() => selectedClassExamCommunity
                  ? onSelectCommunity(selectedClassExamCommunity.slug)
                  : onSelectTab('communities')}
                className="shrink-0 rounded-xl bg-emerald-600 px-3 py-2 text-[10px] font-black text-white transition-colors hover:bg-emerald-700"
              >
                {selectedClassExamCommunity ? 'Open community' : 'Browse communities'}
              </button>
            )}
          </div>
        )}

        <div
          data-preserve-horizontal-scroll="recommended-communities"
          className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1 no-scrollbar"
        >
          {suggestions.map((community) => {
            const isClassCommunity = community.id === classCommunity?.id;
            const isFeaturedCommunity = community.id === featuredCommunityId;
            const communityMembers = (community.topContributors || []).map(({ user }) => user).length > 0
              ? (community.topContributors || []).map(({ user }) => user)
              : (community.memberIds || [])
                  .map((memberId) => users.find((user) => user.id === memberId))
                  .filter((user): user is User => Boolean(user));
            return (
            <article key={community.id} className={`group relative flex min-h-[218px] min-w-[275px] max-w-[320px] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-2xl border bg-white p-3.5 shadow-[0_4px_14px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(79,70,229,0.12)] sm:min-w-[285px] ${
              isClassCommunity
                ? 'border-emerald-200 bg-gradient-to-br from-white via-white to-emerald-50/50'
                : isFeaturedCommunity
                  ? 'border-amber-200 bg-gradient-to-br from-white via-white to-amber-50/60'
                  : 'border-slate-200'
            }`}>
              <div className={`absolute inset-x-0 top-0 h-1 ${
                isClassCommunity
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                  : isFeaturedCommunity
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                    : 'bg-gradient-to-r from-indigo-500 to-violet-500'
              }`} />
              <button
                type="button"
                onClick={() => onSelectCommunity(community.slug)}
                className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                <span className="flex items-start gap-3">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xs font-black shadow-sm ${community.iconBg}`}>
                    {community.slug.replace('/', '').slice(0, 2).toUpperCase() || 'CN'}
                  </span>
                  <span className="min-w-0">
                    <span className="block line-clamp-2 text-xs font-black leading-tight text-slate-900">{community.displayName || community.name}</span>
                    <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                      isClassCommunity
                        ? 'bg-emerald-50 text-emerald-700'
                        : isFeaturedCommunity
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-violet-50 text-violet-700'
                    }`}>
                      {isClassCommunity ? `Class ${classLevel}` : isFeaturedCommunity ? 'JEE peer community' : 'Skill community'}
                    </span>
                  </span>
                </span>
                <span className="mt-3 flex items-center">
                  {communityMembers.slice(0, 4).map((user) => (
                    <span key={`${community.id}-${user.id}`} className="-ml-1.5 flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-indigo-100 text-[8px] font-black text-indigo-700 first:ml-0">
                      <SafeAvatar src={user.avatar} name={user.name} className="h-full w-full object-cover" />
                    </span>
                  ))}
                  {communityMembers.length > 4 && (
                    <span className="ml-1 text-[10px] font-semibold text-slate-400">+ more joined</span>
                  )}
                </span>
                <span className="mt-2 block line-clamp-3 text-[10px] leading-relaxed text-slate-500">{community.description}</span>
              </button>
              <div className="mt-3 flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[10px] font-bold text-slate-400">
                  {community.membersCount.toLocaleString()} students joined
                </span>
                <button
                  type="button"
                  onClick={() => community.isJoined
                    ? onSelectCommunity(community.slug)
                    : onToggleJoinCommunity?.(community.slug)}
                  disabled={!community.isJoined && !onToggleJoinCommunity}
                  className={`shrink-0 rounded-xl px-3 py-2 text-[10px] font-black transition-all ${
                    community.isJoined
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm hover:from-indigo-700 hover:to-violet-700'
                  }`}
                >
                  {community.isJoined ? 'Joined · Open' : 'Join community'}
                </button>
              </div>
            </article>
            );
          })}
        </div>
      </section>
    ) : null;
  };

  const InlineRecommendations = () => (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 space-y-5 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-600">Recommended for you</p>
        <h2 className="mt-1 text-sm sm:text-base font-black text-slate-900">Keep moving forward</h2>
        <p className="mt-0.5 text-[11px] text-slate-500">Suggestions based on your goals, interests, and activity.</p>
      </div>

      {!isExamFocused && opportunities.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900">Opportunities for you</h3>
            <button onClick={() => onSelectTab('learn')} className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer">See all</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {opportunities.slice(0, 3).map((opportunity) => (
              <button
                key={opportunity.id}
                onClick={() => onOpenOpportunity(opportunity)}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-left hover:border-indigo-300 hover:bg-indigo-50/50 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wide text-indigo-600">{opportunity.category || 'Opportunity'}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                </div>
                <p className="mt-2 text-xs font-black text-slate-900 line-clamp-2">{opportunity.title}</p>
                <p className="mt-1 text-[10px] text-slate-500 line-clamp-1">{opportunity.location || opportunity.prizeOrStipend || 'Explore this opportunity'}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {recommendedCommunities.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900">Communities to join</h3>
            <button onClick={() => onSelectTab('communities')} className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer">See all</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {recommendedCommunities.map((community) => (
              <button key={community.id} onClick={() => onSelectCommunity(community.slug)} className="flex items-center gap-2.5 rounded-2xl border border-slate-200 p-2.5 text-left hover:border-indigo-300 hover:bg-indigo-50/50 transition-all cursor-pointer">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[10px] font-black ${community.iconBg}`}>{community.slug.slice(1, 3).toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-bold text-slate-900">{community.displayName || community.name}</span>
                  <span className="block truncate text-[10px] text-slate-500">{community.membersCount.toLocaleString()} students</span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0 text-slate-300" />
              </button>
            ))}
          </div>
        </div>
      )}

    </section>
  );

  return (
    <div
      ref={homeFeedRootRef}
      className="home-feed network-home-feed mobile-home-feed-shell w-full min-w-0 max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-28 overflow-x-hidden"
    >
      <section className="home-composer rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onOpenProfile(currentUser)}
            aria-label="Open your profile"
            data-testid="button-open-composer-profile"
            className="shrink-0 rounded-full cursor-pointer"
          >
            <SafeAvatar
              src={currentUser.hasProfilePhoto ? currentUser.avatar : undefined}
              name={currentUser.name}
              className="h-10 w-10 rounded-full object-cover ring-1 ring-slate-100"
            />
          </button>
          <button
            type="button"
            onClick={() => onOpenCreatePost?.()}
            aria-label="Create a post: What are you looking for?"
            data-testid="button-open-home-composer"
            className="home-composer-prompt group flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 text-left text-slate-500 transition-colors hover:border-indigo-300 hover:bg-slate-50 cursor-pointer"
          >
            <span aria-hidden="true" className="h-8 w-0.5 shrink-0 rounded-full bg-violet-500" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">What are you looking for?</span>
            <Image aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-500 transition-colors group-hover:text-indigo-600" />
          </button>
        </div>
        <div className="mt-3 flex gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { label: 'Study partner', icon: BookOpen, style: 'border-indigo-200 bg-indigo-50/70 hover:border-indigo-300 hover:bg-indigo-50' },
            { label: 'DSA practice', icon: Code2, style: 'border-slate-200 bg-slate-50/70 hover:border-indigo-200 hover:bg-indigo-50' },
            { label: 'Exam prep', icon: Award, style: 'border-slate-200 bg-slate-50/70 hover:border-indigo-200 hover:bg-indigo-50' },
            { label: 'Homework help', icon: PenLine, style: 'border-slate-200 bg-slate-50/70 hover:border-indigo-200 hover:bg-indigo-50' },
            { label: 'Library partner', icon: BookOpen, style: 'border-slate-200 bg-slate-50/70 hover:border-indigo-200 hover:bg-indigo-50' },
          ].map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => onOpenCreatePost?.(option.label)}
              className={`flex min-h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-[10px] font-bold leading-none text-slate-700 shadow-sm transition-all active:scale-95 cursor-pointer ${option.style}`}
            >
              <option.icon className="h-3.5 w-3.5" />
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="home-communities-section space-y-2.5">
        <div className="flex items-center justify-between px-0.5">
          <div>
            <h2 className="text-[14px] font-black tracking-tight text-slate-900">Communities you need</h2>
            {joinedCommunities.length > 0 && (
              <p className="mt-0.5 text-[10px] font-medium text-slate-500">Your joined communities first, then suggestions for you.</p>
            )}
          </div>
          <button onClick={() => onSelectTab('communities')} className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer">
            See all
          </button>
        </div>
        <div
          data-preserve-horizontal-scroll="home-communities"
          className="flex gap-2 overflow-x-auto px-0.5 pb-1 no-scrollbar"
        >
          {needCommunities.map((community, index) => {
            const isJoined = joinedCommunityIds.has(community.id);
            const icons = [Code2, Building, Shield, BriefcaseBusiness, BookOpen, Rocket];
            const iconStyles = [
              'bg-indigo-100 text-indigo-700 ring-4 ring-indigo-50',
              'bg-emerald-100 text-emerald-700 ring-4 ring-emerald-50',
              'bg-blue-100 text-blue-700 ring-4 ring-blue-50',
              'bg-pink-100 text-pink-700 ring-4 ring-pink-50',
              'bg-amber-100 text-amber-700 ring-4 ring-amber-50',
              'bg-violet-100 text-violet-700 ring-4 ring-violet-50',
            ];
            const cardStyles = [
              'border-indigo-200 bg-indigo-50/35 hover:border-indigo-400',
              'border-emerald-200 bg-emerald-50/35 hover:border-emerald-400',
              'border-blue-200 bg-blue-50/35 hover:border-blue-400',
              'border-pink-200 bg-pink-50/35 hover:border-pink-400',
              'border-amber-200 bg-amber-50/35 hover:border-amber-400',
              'border-violet-200 bg-violet-50/35 hover:border-violet-400',
            ];
            const Icon = icons[index % icons.length];
            const label = community.displayName || community.name;
            return (
              <button
                key={community.id}
                type="button"
                onClick={() => onSelectCommunity(community.slug)}
                className={`group flex w-[92px] shrink-0 flex-col items-center rounded-2xl border px-2 py-2.5 text-center shadow-[0_2px_8px_rgba(15,23,42,0.03)] transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
                  isJoined
                    ? 'border-emerald-300 bg-emerald-50/60 hover:border-emerald-500'
                    : cardStyles[(index - joinedCommunities.length) % cardStyles.length]
                }`}
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconStyles[index % iconStyles.length]}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="mt-2 line-clamp-2 text-[10px] font-black leading-tight text-slate-800 group-hover:text-indigo-700">
                  {label}
                </span>
                <span className={`mt-1 text-[9px] font-bold ${isJoined ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {isJoined ? 'Joined · Open' : `${community.membersCount.toLocaleString()} students`}
                </span>
              </button>
            );
          })}
          {needCommunities.length === 0 && (
            <button type="button" onClick={() => onSelectTab('communities')} className="w-full rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/40 p-4 text-left text-xs font-bold text-indigo-700 cursor-pointer">
              Explore communities built around your goals
            </button>
          )}
        </div>
      </section>

      <section className="home-post-stream space-y-1.5 sm:space-y-2.5">
        <div
          role="tablist"
          aria-label="Home feed views"
          className="flex items-center gap-1 overflow-x-auto border-b border-slate-200/90 px-1 no-scrollbar"
        >
          {feedViews.map((view) => {
            const Icon = view.icon;
            const isActive = feedFilter === view.id;
            return (
              <button
                key={view.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setFeedFilter(view.id)}
                className={`relative flex min-h-11 shrink-0 items-center gap-1.5 rounded-none px-3 text-[10px] font-black transition-colors cursor-pointer ${
                  isActive
                    ? view.activeTextClass
                    : view.tabClass
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{view.label}</span>
                {isActive && (
                  <span
                    aria-hidden="true"
                    className={`absolute bottom-0 left-2 right-2 h-0.5 rounded-full ${view.underlineClass}`}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="home-post-list space-y-3">
          {isFeedLoading && (
            <NetworkLoadingScreen fullScreen={false} />
          )}

          {!isFeedLoading && feedError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
              <p className="text-sm font-black text-rose-900">We couldn’t load this feed</p>
              <p className="mt-1 text-xs text-rose-700">{feedError}</p>
              <button type="button" onClick={onRetryFeed} className="mt-4 rounded-full bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer">
                Try again
              </button>
            </div>
          )}

          {!isFeedLoading && !feedError && filteredPosts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
              <Users className="mx-auto h-7 w-7 text-indigo-300" />
                <p className="mt-2 text-sm font-black text-slate-800">
                 {feedFilter === 'college' && !currentUser.college
                   ? 'Add your college to personalize this feed'
                   : feedFilter === 'college'
                   ? 'No posts from your college yet'
                   : feedFilter === 'beyond-campus'
                     ? 'No cross-campus posts yet'
                     : feedFilter === 'learn'
                       ? 'No learning posts yet'
                       : 'No active requests yet'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {feedFilter === 'college' && !currentUser.college
                  ? 'Add your college in your profile to see campus posts, opportunities, and events.'
                  : feedFilter === 'college'
                  ? 'Be the first to start a conversation with your campus.'
                   : feedFilter === 'beyond-campus'
                     ? 'See what students and communities are building across India.'
                     : feedFilter === 'learn'
                       ? 'Share a doubt, resource, roadmap, or useful study note.'
                       : 'Post what you need and find the right people across The Network.'}
              </p>
              {feedFilter === 'college' && !currentUser.college ? (
                <button type="button" onClick={() => onOpenProfile(currentUser)} className="mt-4 rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 cursor-pointer">Add College</button>
              ) : (
                <button type="button" onClick={() => onOpenCreatePost?.()} className="mt-4 rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 cursor-pointer">Create a post</button>
              )}
            </div>
          )}
          {!isFeedLoading && !feedError && filteredPosts.map((post, postIndex) => {
            const isCommentsOpen = expandedCommentsPostId === post.id;
            const isLongPost = post.content.length > 240 || post.content.split('\n').length > 5;
            const isContentExpanded = expandedContentPostIds.has(post.id);
            const images = post.postImages?.length ? post.postImages : post.postImage ? [post.postImage] : [];
            const postCommunity = post.isAnonymous
              ? undefined
              : communities.find((community) => community.slug === post.communitySlug);
            const hasJoinedPostCommunity = Boolean(
              postCommunity && (
                postCommunity.isJoined ||
                postCommunity.memberIds?.includes(currentUser.id) ||
                currentUser.communities.includes(postCommunity.slug)
              ),
            );
            const isJoiningPostCommunity = Boolean(
              postCommunity && joiningCommunityIds.has(postCommunity.id),
            );
              const postTypeLabel = feedFilter === 'looking-for'
                ? 'Looking for'
                : post.type === 'question' ? 'Question' : post.type === 'collab' ? 'Looking for' : post.type === 'project' ? 'Project' : post.type === 'hackathon' ? 'Hackathon' : 'Post';
            return (
              <React.Fragment key={post.id}>
              <article id={`post-${post.id}`} data-post-id={post.id} className="post-card home-post-card space-y-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[0_2px_10px_rgba(15,23,42,0.035)] transition-all hover:border-indigo-200 sm:p-4">
                <div className="flex items-start gap-2.5">
                  {post.isAnonymous ? (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm text-slate-500 ring-1 ring-slate-100">?</div>
                  ) : (
                    <SafeAvatar src={post.author.avatar} name={post.author.name} onClick={() => onOpenProfile(post.author)} className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-slate-100 cursor-pointer" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <button type="button" onClick={post.isAnonymous ? undefined : () => onOpenProfile(post.author)} className={`truncate text-xs font-black sm:text-sm ${post.isAnonymous ? 'text-slate-600' : 'text-slate-900 hover:text-indigo-600'} cursor-pointer`}>
                            {post.author.name}
                          </button>
                          {!post.isAnonymous && post.author.verified && <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Verified</span>}
                        </div>
                        {!post.isAnonymous && <p className="mt-0.5 truncate text-[10px] font-medium text-slate-500">{post.author.college}</p>}
                        <div className="mt-0.5 flex min-w-0 items-center gap-1 text-[10px] text-slate-400">
                           {!post.isAnonymous && (
                             <>
                               <button type="button" onClick={() => onSelectCommunity(post.communitySlug)} className="max-w-[150px] truncate font-bold text-indigo-600 hover:underline cursor-pointer">{post.communitySlug}</button>
                               <span>·</span>
                             </>
                           )}
                           <span className="shrink-0">{post.timestamp}</span>
                        </div>
                      </div>
                       <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                        <span className="post-type-pill rounded-full border border-indigo-100 bg-indigo-50 px-2 py-1 text-[9px] font-black text-indigo-700">{postTypeLabel}</span>
                         {postCommunity && (
                           hasJoinedPostCommunity ? (
                             <button
                               type="button"
                               onClick={() => onSelectCommunity(postCommunity.slug)}
                               aria-label={`Open joined community ${postCommunity.displayName || postCommunity.name}`}
                               title={`Open ${postCommunity.displayName || postCommunity.name}`}
                               className="inline-flex min-h-7 items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100 cursor-pointer"
                             >
                               <UserCheck className="h-3 w-3" />
                               <span>Joined · Open</span>
                             </button>
                           ) : !postCommunity.isBlocked && (
                             <button
                               type="button"
                               onClick={(event) => {
                                 event.stopPropagation();
                                 void handleJoinCommunityFromPost(postCommunity);
                               }}
                               disabled={!onToggleJoinCommunity || isJoiningPostCommunity}
                               aria-label={`Join ${postCommunity.displayName || postCommunity.name}`}
                               className="inline-flex min-h-7 items-center gap-1 rounded-full bg-indigo-600 px-2.5 py-1 text-[9px] font-black text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-70 cursor-pointer"
                             >
                               <UserPlus className="h-3 w-3" />
                               <span>{isJoiningPostCommunity ? 'Joining…' : 'Join community'}</span>
                             </button>
                           )
                         )}
                         <PostActionMenu
                           canEdit={!post.isAnonymous && post.author.id === currentUser.id && Boolean(onEditPost)}
                           canDelete={!post.isAnonymous && post.author.id === currentUser.id && Boolean(onDeletePost)}
                           canReshare={!post.isAnonymous && Boolean(onResharePost)}
                           reshareBusy={resharingPostId === post.id}
                           onEdit={() => setEditingPost(post)}
                           onDelete={() => handleDeleteFromHome(post.id)}
                           onReshare={() => handleReshareFromHome(post.id)}
                         />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                   {post.resharedFromId && (
                     <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-2.5 py-2 text-[10px] font-bold text-emerald-700">
                       <Repeat2 className="h-3.5 w-3.5" /> Reshared post
                     </div>
                   )}
                  {images.length > 0 && (
                    <div className="flex snap-x snap-mandatory items-start gap-1 overflow-x-auto rounded-2xl bg-slate-100 no-scrollbar">
                      {images.map((image, index) => (
                        <button
                          key={`${post.id}-${index}`}
                          type="button"
                          onClick={() => setLightboxImage({ src: image, alt: `Attached image ${index + 1}` })}
                          aria-label={`View attached image ${index + 1} full screen`}
                          className={`group relative shrink-0 snap-start overflow-hidden rounded-xl bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                            images.length === 1 ? 'w-full' : 'w-[88%] sm:w-[72%] md:w-[58%]'
                          }`}
                        >
                          <AuthenticatedImage
                            src={image}
                            alt={`Attached image ${index + 1}`}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className={`w-full ${images.length > 1 ? 'h-64 object-cover sm:h-80' : 'max-h-[560px] object-contain'}`}
                          />
                          <span className="pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-slate-950/65 px-2 py-1 text-[10px] font-bold text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                            <Maximize2 className="h-3 w-3" />
                            View full image
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  <h3 className="text-[15px] font-black leading-snug text-slate-900 sm:text-base">{post.title}</h3>
                  <p
                    className="whitespace-pre-line text-[12px] leading-5 text-slate-600 sm:text-sm"
                    style={!isContentExpanded && isLongPost ? {
                      display: '-webkit-box',
                      WebkitBoxOrient: 'vertical',
                      WebkitLineClamp: 3,
                      overflow: 'hidden',
                    } : undefined}
                  >
                    <LinkifiedText text={post.content} />
                  </p>
                  {(!isLongPost || isContentExpanded) && (
                    <>
                      {extractUrls(post.content)[0] && <LinkPreview url={extractUrls(post.content)[0]} />}
                      {(post.tags?.length || post.prizePool || post.teamSize || post.deadline) && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {(post.tags || []).slice(0, 4).map((tag) => <span key={tag} className="rounded-full bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500">#{tag}</span>)}
                          {post.prizePool && <span className="rounded-full bg-purple-50 px-2 py-1 text-[10px] font-bold text-purple-700">Prize pool · {post.prizePool}</span>}
                          {post.teamSize && <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">Team · {post.teamSize}</span>}
                          {post.deadline && <span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700">Deadline · {post.deadline}</span>}
                        </div>
                      )}
                      {post.pollData && (
                        <PostPoll postId={post.id} pollData={post.pollData} onVote={onVotePoll} />
                      )}
                      {post.attachment && <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="flex min-w-0 items-center gap-2.5"><FileText className="h-4 w-4 shrink-0 text-rose-600" /><span className="truncate text-xs font-bold text-slate-700">{post.attachment.name}</span></div><span className="text-[10px] font-bold text-indigo-600">PDF</span></div>}
                      {post.githubRepo && <a href={`https://${post.githubRepo}`} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 rounded-xl bg-slate-900 p-3 text-white hover:bg-slate-800"><Github className="h-4 w-4 text-emerald-400" /><span className="truncate text-xs font-mono">{post.githubRepo}</span></a>}
                    </>
                  )}
                  {isLongPost && <button type="button" onClick={() => setExpandedContentPostIds((previous) => { const next = new Set(previous); next.has(post.id) ? next.delete(post.id) : next.add(post.id); return next; })} className="text-xs font-black text-indigo-600 hover:text-indigo-800 cursor-pointer">{isContentExpanded ? 'Show less' : 'Show more'}</button>}
                </div>

                 <div className="post-actions flex items-center justify-between border-t border-slate-100 pt-2.5">
                  <div className="flex items-center gap-3.5">
                    <button type="button" onClick={() => onToggleLike(post.id)} className={`flex items-center gap-1.5 rounded-lg px-1 py-0.5 text-xs font-bold cursor-pointer ${post.liked ? 'text-rose-600' : 'text-slate-500 hover:text-rose-600'}`}><Heart className={`h-4 w-4 ${post.liked ? 'fill-rose-600' : ''}`} /><span>{post.likesCount || post.upvotes}</span></button>
                    <button type="button" onClick={() => setExpandedCommentsPostId(isCommentsOpen ? null : post.id)} className="flex items-center gap-1.5 rounded-lg px-1 py-0.5 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"><MessageSquare className="h-4 w-4" /><span>{post.commentsCount || post.comments.length}</span></button>
                     <SocialShareMenu
                       postId={post.id}
                       title={post.title}
                       text={post.content}
                       communities={communities}
                       onShareToCommunity={onSharePostToCommunity}
                     />
                    {post.isAnonymous && onStartAnonymousChat && <button type="button" onClick={() => onStartAnonymousChat(post.id)} className="hidden items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 sm:flex cursor-pointer"><MessageCircle className="h-4 w-4" /> Chat anonymously</button>}
                  </div>
                  <button type="button" onClick={() => onToggleSave(post.id)} className={`rounded-lg p-1.5 cursor-pointer ${post.saved ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-700'}`} title={post.saved ? 'Saved' : 'Save post'}><Bookmark className={`h-4 w-4 ${post.saved ? 'fill-indigo-600' : ''}`} /></button>
                </div>

                {isCommentsOpen && (
                  <div className="space-y-3 border-t border-slate-100 pt-3">
                    <div className="space-y-2">
                      {post.comments.length > 0 ? post.comments.map((comment) => (
                        <div key={comment.id} className={`flex gap-2.5 rounded-xl bg-slate-50/80 p-2 ${comment.replyToId ? 'ml-6 border-l-2 border-indigo-200' : ''}`}>
                          {comment.isAnonymous ? <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] text-slate-500">?</div> : <SafeAvatar src={comment.author.avatar} name={comment.author.name} onClick={() => onOpenProfile(comment.author)} className="h-7 w-7 shrink-0 rounded-full object-cover cursor-pointer" />}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-xs font-black text-slate-800">{comment.author.name}</span>
                              <span className="shrink-0 text-[10px] text-slate-400">{comment.timestamp}</span>
                            </div>
                            <p className="mt-0.5 text-xs text-slate-600">{comment.content}</p>
                            <button
                              type="button"
                              onClick={() => startReply(post.id, comment.id, comment.author.name)}
                              className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 transition hover:text-indigo-600 cursor-pointer"
                            >
                              <CornerUpLeft className="h-3 w-3" /> Reply
                            </button>
                          </div>
                        </div>
                      )) : <p className="py-1 text-center text-xs text-slate-400">No comments yet. Be the first to start the discussion!</p>}
                    </div>
                    {replyingTo[post.id] && (
                      <div className="flex items-center justify-between rounded-lg bg-indigo-50 px-3 py-1.5 text-[10px] font-bold text-indigo-700">
                        <span>Replying to a comment</span>
                        <button type="button" onClick={() => setReplyingTo((previous) => ({ ...previous, [post.id]: null }))} className="text-indigo-500 hover:text-indigo-800 cursor-pointer">Cancel</button>
                      </div>
                    )}
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      {isPostingAnonymously(post.id) ? <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] text-slate-500">?</div> : <SafeAvatar src={currentUser.avatar} name={currentUser.name} className="h-7 w-7 shrink-0 rounded-full object-cover" />}
                        <InlineCommentComposer
                          ref={(composer) => { commentInputRefs.current[post.id] = composer; }}
                          postId={post.id}
                          initialValue={commentDraftsRef.current[post.id] || ''}
                          onDraftChange={(value) => { commentDraftsRef.current[post.id] = value; }}
                          placeholder={isPostingAnonymously(post.id) ? 'Reply anonymously…' : 'Write a helpful reply...'}
                          submitting={Boolean(commentSubmitting[post.id])}
                          onSubmit={(text) => handlePostCommentSubmit(post.id, text)}
                        />
                    </div>
                    {commentErrors[post.id] && <p className="ml-9 text-[10px] font-bold text-rose-600">{commentErrors[post.id]}</p>}
                    <button type="button" onClick={() => setAnonymousCommentPosts((previous) => ({ ...previous, [post.id]: !isPostingAnonymously(post.id) }))} className={`order-3 ml-9 inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[10px] font-bold cursor-pointer ${isPostingAnonymously(post.id) ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>{isPostingAnonymously(post.id) ? '✓ Anonymous reply · On' : <><EyeOff className="h-3 w-3" /> Reply anonymously</>}</button>
                  </div>
                )}
              </article>
              {postIndex === 0 && <StudyPartnerCard />}
              {postIndex === 1 && <CommunitySuggestionsCard showExamPicker={Boolean(classCommunity)} />}
              {postIndex === 3 && (
                <CommunitySuggestionsCard
                  suggestions={prioritizedLearningCommunitySuggestions}
                  title="Join a skill community"
                  subtitle="Every card opens the real community room."
                  eyebrow="Build skills with your preparation"
                  featuredCommunityId={shouldHighlightYiic ? yiicCommunity?.id : undefined}
                />
              )}
              {postIndex === 2 && <JustJoinedCard />}
              </React.Fragment>
            );
          })}
          {!isFeedLoading && !feedError && filteredPosts.length > 0 && hasMoreFeedPosts && (
            <div className="pt-1">
              {isLoadingMoreFeedPosts ? (
                <NetworkLoadingScreen fullScreen={false} compact />
              ) : loadMoreFeedError ? (
                <div className="flex flex-col items-center gap-2 py-3 text-center">
                  <p className="text-xs font-medium text-slate-500">{loadMoreFeedError}</p>
                  <button
                    type="button"
                    onClick={onLoadMoreFeed}
                    className="rounded-full border border-indigo-200 bg-white px-5 py-2.5 text-xs font-black text-indigo-700 shadow-sm hover:bg-indigo-50 cursor-pointer"
                  >
                    Try loading more
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onLoadMoreFeed}
                  className="mx-auto block rounded-full border border-indigo-200 bg-white px-5 py-2.5 text-xs font-black text-indigo-700 shadow-sm hover:bg-indigo-50 cursor-pointer"
                >
                  Load more posts
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {lightboxImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Full-size image preview"
          onClick={() => setLightboxImage(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            aria-label="Close full-size image"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="h-6 w-6" />
          </button>
          <AuthenticatedImage
            src={lightboxImage.src}
            alt={lightboxImage.alt}
            className="max-h-[92vh] max-w-[96vw] rounded-xl object-contain shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
      {editingPost && onEditPost && (
        <PostEditorModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSave={(updates) => onEditPost(editingPost.id, updates)}
        />
      )}
    </div>
  );
};
