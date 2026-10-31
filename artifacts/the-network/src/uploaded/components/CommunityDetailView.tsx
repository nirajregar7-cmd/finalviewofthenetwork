import React, { useState } from 'react';
import { getEducationDisplay } from '../../utils/education';
import {
  ArrowLeft,
  Bell,
  Code,
  CheckCircle2,
  Check,
  Plus,
  Bookmark,
  Trash2,
  Shield,
  UserCog,
  ArrowUp,
  ArrowDown,
  MessageSquare,
  FileText,
  Github,
  Award,
  Sparkles,
  SlidersHorizontal,
  Send,
  Heart,
  Users,
  Search,
  UserRound,
  BadgeCheck,
  ShieldCheck,
  BookOpen,
  HelpCircle,
  FolderGit2,
  BarChart2,
  ExternalLink,
  Info,
  ListChecks,
  Target,
  Image as ImageIcon,
  MessageCircle,
  Share2,
  UserPlus,
  Youtube,
  Paperclip,
  X,
  Maximize2,
  Reply,
  Smile,
  Repeat2,
} from 'lucide-react';
import { ChatConversation, Community, Post, SharedPostPreview as SharedPostPreviewData, User } from '../types';
import confetti from 'canvas-confetti';
import { LinkPreview, LinkifiedText, extractUrls } from './LinkPreview';
import { SocialShareMenu } from './SocialShareMenu';
import { SharedPostPreview } from './SharedPostPreview';
import { api } from '../../api';
import { SafeAvatar } from './SafeAvatar';
import { AuthenticatedImage } from './AuthenticatedImage';
import { PostActionMenu } from './PostActionMenu';
import { PostEditorModal } from './PostEditorModal';
import { PostPoll } from './PostPoll';
import { InlineCommentComposer, type InlineCommentComposerHandle } from './InlineCommentComposer';
import { CommunityChatComposer } from './CommunityChatComposer';
import JeeCountdownCard from '../../components/JeeCountdownCard';
import AptitudeExamPanel from './AptitudeExamPanel';
import { CommunityGroupsPanel } from './CommunityGroupsPanel';
import type { GroupChat } from '../../types';

interface CommunityQuickPostDraftHandle {
  getValues: () => { title: string; content: string; link: string };
  reset: () => void;
}

interface CommunityQuickPostDraftProps {
  titlePlaceholder: string;
  contentPlaceholder: string;
  expanded: boolean;
  onExpand: () => void;
}

const CommunityQuickPostDraft = React.memo(React.forwardRef<
  CommunityQuickPostDraftHandle,
  CommunityQuickPostDraftProps
>(function CommunityQuickPostDraft({ titlePlaceholder, contentPlaceholder, expanded, onExpand }, ref) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [link, setLink] = useState('');

  React.useImperativeHandle(ref, () => ({
    getValues: () => ({ title, content, link }),
    reset: () => {
      setTitle('');
      setContent('');
      setLink('');
    },
  }), [content, link, title]);

  const previewUrl = extractUrls(`${content}\n${link}`)[0];

  return (
    <div className="min-w-0 flex-1 space-y-3">
      <input
        type="text"
        value={title}
        onFocus={onExpand}
        onChange={(event) => setTitle(event.target.value)}
        placeholder={titlePlaceholder}
        aria-label={titlePlaceholder}
        className="w-full cursor-text rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 transition-colors hover:bg-slate-100/80 focus:border-indigo-400 focus:bg-white focus:outline-none"
      />
      {expanded && (
        <>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={contentPlaceholder}
            aria-label="Post details"
            rows={3}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none"
          />
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <ExternalLink className="h-3 w-3" /> Website link (optional)
            </label>
            <input
              type="url"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              placeholder="https://github.com/... or any website"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none"
            />
            {previewUrl && <div className="mt-2"><LinkPreview url={previewUrl} /></div>}
          </div>
        </>
      )}
    </div>
  );
}));

interface CommunityDetailViewProps {
  community: Community;
  posts: Post[];
  users: Record<string, User>;
  currentUser: User;
  communities: Community[];
  conversations: ChatConversation[];
  onSendMessage: (
    conversationId: string,
    text: string,
    attachment?: { name: string; data: string; mimeType: string },
  ) => Promise<void> | void;
  onBack: () => void;
  onSelectCommunity: (slug: string) => void;
  onOpenProfile: (user: User) => void;
  onToggleJoin: (slug: string) => void;
  onToggleUpvote: (postId: string, delta: 1 | -1) => void;
  onToggleLike: (postId: string) => void;
  onToggleSave: (postId: string) => void;
  onDeletePost: (postId: string) => Promise<void> | void;
  onEditPost?: (postId: string, updates: { title: string; content: string }) => Promise<void> | void;
  onResharePost?: (postId: string) => Promise<void> | void;
  onSharePostToCommunity?: (postId: string, communityId: string) => Promise<void>;
  onVotePoll?: (postId: string, optionIndex: number) => Promise<void> | void;
  onCommunityUpdated?: (community: any) => void;
  onQuickPost: (type: 'post' | 'question' | 'resource' | 'project', title: string, content: string, postImage?: string) => Promise<void>;
  onAddComment: (
    postId: string,
    text: string,
    isAnonymous?: boolean,
    replyToId?: string | null,
  ) => void | Promise<void>;
  onChatTabChange?: (isChatActive: boolean) => void;
  onKeyboardVisibilityChange?: (isOpen: boolean) => void;
  onOpenInvite?: (community: Community) => void;
  onOpenCommunityChat?: (community: Community) => void;
  onOpenGroupChat: (group: GroupChat) => void;
  focusPostId?: string | null;
  focusReply?: boolean;
  onFocusPostHandled?: () => void;
}

type CuratedLink = {
  id: string;
  title: string;
  description: string;
  url: string;
  youtubeUrl?: string;
  tags: string[];
  source: string;
};

type CommunityChatMessage = {
  id: string;
  clientMessageId?: string;
  groupId?: string;
  senderId: string;
  content: string;
  createdAt: string;
  replyToId?: string | null;
  reactions?: Record<string, string[]> | null;
  attachmentName?: string | null;
  attachmentData?: string | null;
  attachmentMimeType?: string | null;
  sharedPost?: SharedPostPreviewData | null;
  seenBy?: Array<{ id: string; name: string }>;
};

type ChatConnectionState = 'connecting' | 'live' | 'reconnecting' | 'offline' | 'join';

function mergeCommunityChatMessages(
  existing: CommunityChatMessage[],
  incoming: CommunityChatMessage[],
): CommunityChatMessage[] {
  const byId = new Map<string, CommunityChatMessage>();
  [...existing, ...incoming].forEach((message) =>
    byId.set(message.clientMessageId || message.id, message),
  );
  return [...byId.values()].sort((a, b) => {
    const chronologicalOrder = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return chronologicalOrder || a.id.localeCompare(b.id);
  });
}

function formatChatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

const DSA_CURATED_RESOURCES: CuratedLink[] = [
  {
    id: 'striver-a2z',
    title: "Striver's A2Z DSA Sheet",
    description: 'A structured path from programming basics through arrays, trees, graphs and dynamic programming.',
    url: 'https://takeuforward.org/dsa/strivers-a2z-sheet-learn-dsa-a-to-z',
    tags: ['Beginner → Advanced', 'Topic-wise'],
    source: 'Take U Forward',
  },
  {
    id: 'striver-sde',
    title: "Striver's SDE Sheet",
    description: 'A focused set of frequently asked interview problems for placement preparation and revision.',
    url: 'https://takeuforward.org/dsa/strivers-sde-sheet-top-coding-interview-problems',
    tags: ['Interview prep', 'Revision'],
    source: 'Take U Forward',
  },
  {
    id: 'apna-college-sheet',
    title: 'Apna College DSA Sheet',
    description: '193 important interview questions covering the major DSA patterns, with practice links and topic coverage.',
    url: 'https://dsa.apnacollege.in/',
    tags: ['193 problems', 'Interview prep'],
    source: 'Apna College',
  },
  {
    id: 'apna-college-video-course',
    title: 'Apna College DSA video course',
    description: 'A beginner-friendly video path for learning data structures and algorithms with guided explanations.',
    url: 'https://www.youtube.com/channel/UCBwmMxybNva6P_5VmxjzwqA',
    tags: ['Video lessons', 'Beginner-friendly'],
    source: 'Apna College',
  },
];

const DSA_CURATED_PROBLEMS: CuratedLink[] = [
  {
    id: 'two-sum',
    title: 'Two Sum',
    description: 'Start with a hash-map pattern: find two values that add to a target in one pass.',
    url: 'https://leetcode.com/problems/two-sum/',
    tags: ['Arrays', 'Hash map', 'Easy'],
    source: 'LeetCode',
  },
  {
    id: 'stock-profit',
    title: 'Best Time to Buy and Sell Stock',
    description: 'Practice tracking a running minimum and the best answer so far.',
    url: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/',
    tags: ['Arrays', 'Greedy', 'Easy'],
    source: 'LeetCode',
  },
  {
    id: 'longest-substring',
    title: 'Longest Substring Without Repeating Characters',
    description: 'Use a sliding window to learn how to maintain a valid range efficiently.',
    url: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/',
    tags: ['Strings', 'Sliding window', 'Medium'],
    source: 'LeetCode',
  },
  {
    id: 'number-of-islands',
    title: 'Number of Islands',
    description: 'A classic grid traversal problem for building confidence with BFS or DFS.',
    url: 'https://leetcode.com/problems/number-of-islands/',
    tags: ['Graphs', 'BFS / DFS', 'Medium'],
    source: 'LeetCode',
  },
  {
    id: 'climbing-stairs',
    title: 'Climbing Stairs',
    description: 'A compact introduction to recognizing and writing a one-dimensional DP recurrence.',
    url: 'https://leetcode.com/problems/climbing-stairs/',
    tags: ['Dynamic programming', 'Easy'],
    source: 'LeetCode',
  },
];

const CYBER_CURATED_RESOURCES: CuratedLink[] = [
  {
    id: 'cyber-roadmap',
    title: 'Cybersecurity roadmap',
    description: 'Follow the sequence: networking → Linux → scripting → security fundamentals → web security → blue team or red team specialization.',
    url: 'https://roadmap.sh/cyber-security',
    tags: ['Beginner → Career', 'Roadmap'],
    source: 'roadmap.sh',
  },
  {
    id: 'cyber-tryhackme',
    title: 'TryHackMe learning paths',
    description: 'Browser-based guided rooms for pre-security, SOC analysis, penetration testing, and security engineering. Start with a beginner path and keep notes.',
    url: 'https://tryhackme.com/paths',
    tags: ['Hands-on labs', 'Beginner-friendly'],
    source: 'TryHackMe',
  },
  {
    id: 'cyber-portswigger',
    title: 'PortSwigger Web Security Academy',
    description: 'Free interactive labs for SQL injection, XSS, authentication, access control, API security, and other web application topics.',
    url: 'https://portswigger.net/web-security',
    tags: ['Free labs', 'Web security'],
    source: 'PortSwigger',
  },
  {
    id: 'cyber-overthewire',
    title: 'OverTheWire Wargames',
    description: 'Use Bandit for Linux and command-line basics, then choose Natas for web security or Krypton for cryptography.',
    url: 'https://overthewire.org/wargames/',
    tags: ['Linux', 'CTF practice'],
    source: 'OverTheWire',
  },
  {
    id: 'cyber-owasp',
    title: 'OWASP Web Security Testing Guide',
    description: 'An open methodology for understanding how web applications are tested, reported, and improved. Pair it with a local practice app.',
    url: 'https://owasp.org/www-project-web-security-testing-guide/',
    tags: ['AppSec', 'Reference'],
    source: 'OWASP',
  },
  {
    id: 'cyber-mitre',
    title: 'MITRE ATT&CK',
    description: 'Map attacker behavior to tactics and techniques, then use the mapping to design detections and explain your blue-team projects.',
    url: 'https://attack.mitre.org/',
    tags: ['Blue team', 'Threat intelligence'],
    source: 'MITRE',
  },
  {
    id: 'cyber-professor-messer',
    title: 'Professor Messer',
    description: 'Clear, certification-focused lessons for networking, security fundamentals, and CompTIA Security+. A strong structured choice for beginners.',
    url: 'https://www.professormesser.com/',
    youtubeUrl: 'https://www.youtube.com/@professormesser',
    tags: ['Security+', 'Foundations'],
    source: 'Website + YouTube',
  },
  {
    id: 'cyber-david-bombal',
    title: 'David Bombal',
    description: 'Networking, Linux, Python, and ethical-hacking labs that help you build the technical foundations security work depends on.',
    url: 'https://davidbombal.com/',
    youtubeUrl: 'https://www.youtube.com/@davidbombal',
    tags: ['Networking', 'Linux'],
    source: 'Website + YouTube',
  },
  {
    id: 'cyber-john-hammond',
    title: 'John Hammond',
    description: 'Practical malware analysis, CTFs, threat research, and security engineering walkthroughs with a strong emphasis on understanding the why.',
    url: 'https://jh.live/',
    youtubeUrl: 'https://www.youtube.com/@_JohnHammond',
    tags: ['Malware', 'CTF research'],
    source: 'Website + YouTube',
  },
  {
    id: 'cyber-tcm',
    title: 'TCM Security / The Cyber Mentor',
    description: 'Hands-on penetration-testing courses, labs, and certification guidance. Use the legal lab environments and never test systems without permission.',
    url: 'https://tcm-sec.com/academy',
    youtubeUrl: 'https://www.youtube.com/@TCMSecurityAcademy',
    tags: ['Pentesting', 'Career skills'],
    source: 'Website + YouTube',
  },
  {
    id: 'cyber-liveoverflow',
    title: 'LiveOverflow',
    description: 'Deep technical explanations of binary exploitation, reverse engineering, and CTF concepts for learners ready to go beyond the basics.',
    url: 'https://liveoverflow.com/',
    youtubeUrl: 'https://www.youtube.com/@LiveOverflow',
    tags: ['Reverse engineering', 'Advanced'],
    source: 'Website + YouTube',
  },
];

const CYBER_ROADMAP = [
  {
    phase: '01',
    title: 'Build the foundations',
    duration: 'Weeks 1–3',
    topics: 'Networking, HTTP/DNS, operating systems, Linux command line, and basic Python.',
    study: 'Professor Messer + OverTheWire Bandit',
  },
  {
    phase: '02',
    title: 'Learn security fundamentals',
    duration: 'Weeks 4–5',
    topics: 'CIA triad, authentication, cryptography basics, common attacks, logging, and risk.',
    study: 'Security+ lessons + TryHackMe beginner path',
  },
  {
    phase: '03',
    title: 'Practice web security',
    duration: 'Weeks 6–8',
    topics: 'OWASP Top 10, requests, sessions, access control, injection, XSS, and APIs.',
    study: 'PortSwigger Academy + OWASP Testing Guide',
  },
  {
    phase: '04',
    title: 'Choose a first track',
    duration: 'Weeks 9–12',
    topics: 'Blue team: SIEM, alerts, detection, and ATT&CK. Red team: enumeration, exploitation, and reporting.',
    study: 'TryHackMe SOC or offensive paths',
  },
  {
    phase: '05',
    title: 'Build proof of work',
    duration: 'Weeks 13–16',
    topics: 'Complete three projects, write ethical lab reports, publish notes, and explain your decisions.',
    study: 'Home SOC, Juice Shop assessment, or phishing triage tool',
  },
  {
    phase: '06',
    title: 'Prepare for your next step',
    duration: 'After 16 weeks',
    topics: 'Pick a role, deepen its tools, join CTFs, ask for review, and prepare for internships or certifications.',
    study: 'Community projects + mentor feedback',
  },
];

export const CommunityDetailView: React.FC<CommunityDetailViewProps> = ({
  community,
  posts,
  users,
  currentUser,
  communities,
  conversations,
  onSendMessage,
  onBack,
  onSelectCommunity,
  onOpenProfile,
  onToggleJoin,
  onToggleUpvote,
  onToggleLike,
  onToggleSave,
  onDeletePost,
  onEditPost,
  onResharePost,
  onSharePostToCommunity,
  onVotePoll,
  onCommunityUpdated,
  onQuickPost,
  onAddComment,
  onChatTabChange,
  onKeyboardVisibilityChange,
  onOpenInvite,
  onOpenCommunityChat,
  onOpenGroupChat,
  focusPostId,
  focusReply = false,
  onFocusPostHandled,
}) => {
  const [activeTab, setActiveTab] = useState<
    'feed' | 'members' | 'chat' | 'groups' | 'resources' | 'problems' | 'projects' | 'opportunities' | 'about' | 'aptitude'
  >('feed');
  const [feedFilter, setFeedFilter] = useState<'latest' | 'top' | 'unanswered' | 'projects'>('latest');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberFilter, setMemberFilter] = useState<'all' | 'online'>('all');
  const [shareOpen, setShareOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [sendingToConversationId, setSendingToConversationId] = useState<string | null>(null);
  const [sentToConversationId, setSentToConversationId] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [adminName, setAdminName] = useState(community.name);
  const [adminDescription, setAdminDescription] = useState(community.description);
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);
  const [communityDescriptionExpanded, setCommunityDescriptionExpanded] = useState(false);

  // Quick composer state
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerType, setComposerType] = useState<'post' | 'question' | 'resource' | 'project'>('post');
  const composerDraftRef = React.useRef<CommunityQuickPostDraftHandle>(null);
  const [composerImage, setComposerImage] = useState('');
  const [composerError, setComposerError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const composerImageInputRef = React.useRef<HTMLInputElement>(null);

  // Community chat state
  const [chatMessages, setChatMessages] = useState<CommunityChatMessage[]>([]);
  const communityChatDraftRef = React.useRef('');
  const [chatAttachment, setChatAttachment] = useState<{ name: string; data: string; mimeType: string } | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatLoadingOlder, setChatLoadingOlder] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const [chatConnection, setChatConnection] = useState<ChatConnectionState>('offline');
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatReplyingTo, setChatReplyingTo] = useState<CommunityChatMessage | null>(null);
  const [chatReactionMenuFor, setChatReactionMenuFor] = useState<string | null>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const chatOlderRequestRef = React.useRef(false);
  const chatHasMoreRef = React.useRef(true);
  const chatLastMarkedSeenRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    setCommunityDescriptionExpanded(false);
  }, [community.slug]);

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
  const chatMessagesRef = React.useRef<HTMLDivElement>(null);

  // Bell alert state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Inline comment state
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<string | null>(null);
  const commentInputRefs = React.useRef<Record<string, InlineCommentComposerHandle | null>>({});
  const commentDraftsRef = React.useRef<Record<string, string>>({});
  const [expandedContentPostIds, setExpandedContentPostIds] = useState<Set<string>>(() => new Set());
  const [anonymousCommentPosts, setAnonymousCommentPosts] = useState<Record<string, boolean>>({});
  const [replyingTo, setReplyingTo] = useState<Record<string, string | null>>({});
  const [commentSubmitting, setCommentSubmitting] = useState<Record<string, boolean>>({});
  const [commentErrors, setCommentErrors] = useState<Record<string, string>>({});
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [resharingPostId, setResharingPostId] = useState<string | null>(null);

  const isPostingAnonymously = (postId: string) =>
    anonymousCommentPosts[postId] ??
    posts.some((post) => post.id === postId && post.isAnonymous);

  const handleDeleteFromCommunity = async (postId: string) => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    await onDeletePost(postId);
  };

  const handleReshareFromCommunity = async (postId: string) => {
    if (!onResharePost || resharingPostId) return;
    setResharingPostId(postId);
    try {
      await onResharePost(postId);
    } finally {
      setResharingPostId(null);
    }
  };

  const communityPosts = posts.filter((p) => p.communitySlug === community.slug);
  const isDsaCommunity = `${community.slug} ${community.name} ${community.displayName}`.toLowerCase().includes('dsa');
  const isCyberCommunity = `${community.slug} ${community.name} ${community.displayName} ${community.description}`.toLowerCase().includes('cyber');
  const isJeeCommunity = `${community.slug} ${community.name} ${community.displayName}`.toLowerCase().includes('jee');
  const isAptitudeCommunity = `${community.id} ${community.slug} ${community.name} ${community.displayName} ${(community.tags || []).join(' ')}`.toLowerCase().includes('aptitude');
  const resourcePosts = communityPosts.filter((post) => post.type === 'resource');
  const problemPosts = communityPosts.filter((post) => post.type === 'question');
  const projectPosts = communityPosts.filter((post) => post.type === 'project');
  const opportunityPosts = communityPosts.filter(
    (post) => post.type === 'hackathon' || post.type === 'collab' || post.tags?.some((tag) => /opportunit|internship|hackathon/i.test(tag)),
  );

  React.useEffect(() => {
    if (!focusPostId || !communityPosts.some((post) => post.id === focusPostId)) return;

    setActiveTab('feed');
    setFeedFilter('latest');
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
  }, [community.id, posts, focusPostId, focusReply, onFocusPostHandled]);

  React.useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get('tab');
    if (isAptitudeCommunity && requestedTab === 'aptitude') {
      setActiveTab('aptitude');
    }
  }, [community.id, isAptitudeCommunity]);
  const feedPosts =
    feedFilter === 'projects'
      ? projectPosts
      : feedFilter === 'unanswered'
        ? communityPosts.filter((post) => post.type === 'question' && post.commentsCount === 0)
        : feedFilter === 'top'
          ? [...communityPosts].sort((a, b) => b.upvotes - a.upvotes)
          : communityPosts;
  const libraryPosts =
    activeTab === 'resources'
      ? resourcePosts
      : activeTab === 'problems'
        ? problemPosts
        : activeTab === 'projects'
          ? projectPosts
          : opportunityPosts;
  const libraryTitle = {
    resources: 'Resources',
    problems: 'Problems',
    projects: 'Projects',
    opportunities: 'Opportunities',
  }[activeTab as 'resources' | 'problems' | 'projects' | 'opportunities'];
  const libraryDescription = {
    resources: 'Useful links, notes and learning paths shared with this community.',
    problems: 'Practice questions and doubts to solve together.',
    projects: 'Build ideas and project updates from community members.',
    opportunities: 'Hackathons, collaborations and other ways to get involved.',
  }[activeTab as 'resources' | 'problems' | 'projects' | 'opportunities'];
  const curatedLinks = activeTab === 'resources'
    ? (isDsaCommunity ? DSA_CURATED_RESOURCES : isCyberCommunity ? CYBER_CURATED_RESOURCES : [])
    : activeTab === 'problems'
      ? (isDsaCommunity ? DSA_CURATED_PROBLEMS : [])
      : [];
  const composerTypeLabel = composerType.charAt(0).toUpperCase() + composerType.slice(1);
  const composerPlaceholder = {
    post: 'Share an update with this community...',
    question: 'Describe your doubt or problem...',
    resource: 'Explain the resource and who it will help...',
    project: 'Describe your project, stack and what you are building...',
  }[composerType];
  const selectTab = (tab: typeof activeTab) => {
    if (tab === 'chat' && onOpenCommunityChat) {
      onOpenCommunityChat(community);
      return;
    }
    setActiveTab(tab);
    onChatTabChange?.(tab === 'chat');
    if (tab === 'resources' || tab === 'problems' || tab === 'projects') {
      setComposerType(tab === 'resources' ? 'resource' : tab === 'problems' ? 'question' : 'project');
    }
  };
  const openComposerFor = (type: 'post' | 'question' | 'resource' | 'project') => {
    setComposerType(type);
    setActiveTab('feed');
    setComposerOpen(true);
  };
  const communityMembers = React.useMemo(() => (community.memberIds || [])
    .map((memberId) => users[memberId])
    .filter((member): member is User => Boolean(member)), [community.memberIds, users]);
  const onlineCommunityMembers = React.useMemo(() => communityMembers.filter(
    (member) => member.isOnline === true || (member.id === currentUser.id && community.memberIds?.includes(currentUser.id)),
  ), [community.memberIds, communityMembers, currentUser.id]);
  const onlineCommunityCount = onlineCommunityMembers.length;
  const deferredMemberSearch = React.useDeferredValue(memberSearch);
  const filteredMembers = React.useMemo(() => communityMembers.filter((member) => {
    const search = deferredMemberSearch.trim().toLowerCase();
    const matchesSearch =
      !search ||
      member.name.toLowerCase().includes(search) ||
      member.college.toLowerCase().includes(search) ||
      member.branch.toLowerCase().includes(search) ||
      member.skills.some((skill) => skill.toLowerCase().includes(search));
    const isOnline = member.isOnline === true || (member.id === currentUser.id && community.memberIds?.includes(currentUser.id));
    return matchesSearch && (memberFilter === 'all' || isOnline);
  }), [community.memberIds, communityMembers, currentUser.id, deferredMemberSearch, memberFilter]);
  const isCommunityMember = Boolean(community.isJoined || community.memberIds?.includes(currentUser.id));
  const communityAdminIds = new Set([community.creatorId, ...(community.adminIds || [])].filter(Boolean));
  const communityHeadId = community.creatorId;
  const communityPathSlug = community.slug.replace(/^\/+/, '').replace(/\/+$/, '');
  const communityShareUrl = `https://www.the-network.co.in/community/${encodeURIComponent(communityPathSlug)}`;
  const examShareUrl = `${communityShareUrl}?tab=aptitude`;
  const communityShareText = `Join ${community.displayName || community.name} on The Network!\n\n${community.description}\n\n${communityShareUrl}`;
  const directConversations = conversations.filter(
    (conversation) => conversation.type === 'direct' && Boolean(conversation.participant?.id),
  );

  const copyCommunityLink = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(communityShareUrl);
      } else {
        const input = document.createElement('textarea');
        input.value = communityShareUrl;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        input.remove();
      }
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 1800);
    } catch {
      setShareError('The link could not be copied. Please try again.');
    }
  };

  const shareCommunityWithDevice = async () => {
    if (!navigator.share) {
      await copyCommunityLink();
      return;
    }
    try {
      await navigator.share({
        title: community.displayName || community.name,
        text: `Join ${community.displayName || community.name} on The Network`,
        url: communityShareUrl,
      });
    } catch {
      // Dismissing the native share sheet is not an error.
    }
  };

  const sendCommunityToConversation = async (conversation: ChatConversation) => {
    setSendingToConversationId(conversation.id);
    setShareError(null);
    try {
      await onSendMessage(conversation.id, communityShareText);
      setSentToConversationId(conversation.id);
      window.setTimeout(() => setSentToConversationId(null), 1800);
    } catch {
      setShareError('The community link could not be sent. Please try again.');
    } finally {
      setSendingToConversationId(null);
    }
  };

  const scrollChatToLatest = (behavior: ScrollBehavior = 'smooth') => {
    window.setTimeout(() => {
      const messages = chatMessagesRef.current;
      if (!messages) return;
      messages.scrollTo({ top: messages.scrollHeight, behavior });
    }, 50);
  };

  const loadOlderCommunityMessages = async () => {
    const node = chatMessagesRef.current;
    const oldestMessage = chatMessages[0];
    if (!node || !oldestMessage || node.scrollTop > 48 || chatOlderRequestRef.current || !chatHasMoreRef.current) return;
    chatOlderRequestRef.current = true;
    setChatLoadingOlder(true);
    const oldHeight = node.scrollHeight;
    const oldTop = node.scrollTop;
    try {
      const result = await api.entityMessages.get('community', community.id, currentUser.id, {
        beforeId: oldestMessage.id,
        limit: 50,
      });
      if (!Array.isArray(result)) return;
      if (result.length < 50) chatHasMoreRef.current = false;
      if (result.length) {
        setChatMessages((previous) => mergeCommunityChatMessages(
          result as CommunityChatMessage[],
          previous,
        ));
        requestAnimationFrame(() => {
          const currentNode = chatMessagesRef.current;
          if (currentNode) currentNode.scrollTop = currentNode.scrollHeight - oldHeight + oldTop;
        });
      } else {
        chatHasMoreRef.current = false;
      }
    } catch {
      // Preserve the current thread; the next scroll can retry the same cursor.
    } finally {
      chatOlderRequestRef.current = false;
      setChatLoadingOlder(false);
    }
  };

  React.useEffect(() => {
    if (activeTab !== 'chat') {
      setKeyboardInset(0);
      setKeyboardOpen(false);
      onKeyboardVisibilityChange?.(false);
      return;
    }

    const viewport = window.visualViewport;
    if (!viewport) {
      setKeyboardOpen(false);
      setViewportHeight(null);
      onKeyboardVisibilityChange?.(false);
      return;
    }

    const updateKeyboardInset = () => {
      const layoutViewportHeight = Math.max(window.innerHeight, document.documentElement.clientHeight);
      const inset = Math.max(0, layoutViewportHeight - viewport.height - viewport.offsetTop);
      const isOpen = inset > 24;
      setKeyboardInset(inset);
      setKeyboardOpen(isOpen);
      setViewportHeight(Math.round(viewport.height));
      onKeyboardVisibilityChange?.(isOpen);
    };

    updateKeyboardInset();
    viewport.addEventListener('resize', updateKeyboardInset);
    viewport.addEventListener('scroll', updateKeyboardInset);
    return () => {
      viewport.removeEventListener('resize', updateKeyboardInset);
      viewport.removeEventListener('scroll', updateKeyboardInset);
      setViewportHeight(null);
      setKeyboardOpen(false);
      onKeyboardVisibilityChange?.(false);
    };
  }, [activeTab, onKeyboardVisibilityChange]);

  React.useEffect(() => () => {
    onChatTabChange?.(false);
  }, [onChatTabChange]);

  React.useEffect(() => {
    if (activeTab !== 'chat') {
      setChatConnection('offline');
      return;
    }

    const communityId = community.id;
    let disposed = false;
    let reconciliationInterval: number | null = null;
    let stream: ReturnType<typeof api.entityMessages.stream> | null = null;

    setChatMessages([]);
    chatLastMarkedSeenRef.current = null;
    chatHasMoreRef.current = true;
    setChatError(null);
    setChatReplyingTo(null);
    setChatReactionMenuFor(null);
    setChatConnection(isCommunityMember ? 'connecting' : 'join');

    const markSeenThrough = (messageId: string | undefined) => {
      if (!messageId || chatLastMarkedSeenRef.current === messageId) return;
      chatLastMarkedSeenRef.current = messageId;
      void api.entityMessages.markSeen('community', communityId, messageId).catch(() => {
        if (chatLastMarkedSeenRef.current === messageId) chatLastMarkedSeenRef.current = null;
      });
    };

    const loadHistory = async (showLoading = true) => {
      if (showLoading) setChatLoading(true);
      try {
        const result = await api.entityMessages.get('community', communityId, currentUser.id);
        if (!disposed && Array.isArray(result)) {
          const latestMessage = result[result.length - 1] as CommunityChatMessage | undefined;
          const messageList = chatMessagesRef.current;
          const wasNearLatest = !messageList
            || messageList.scrollHeight - messageList.scrollTop - messageList.clientHeight < 96;
          if (showLoading) chatHasMoreRef.current = result.length === 50;
          setChatMessages((previous) => mergeCommunityChatMessages(
            previous,
            result as CommunityChatMessage[],
          ));
          if (showLoading) {
            scrollChatToLatest('auto');
            if (document.visibilityState === 'visible' && isCommunityMember) {
              void api.notifications.markConversationRead('community', communityId).catch(() => {});
              markSeenThrough(latestMessage?.id);
            }
          } else if (
            wasNearLatest
            && document.visibilityState === 'visible'
            && isCommunityMember
          ) {
            markSeenThrough(latestMessage?.id);
          }
        }
        return true;
      } catch (error: any) {
        if (!disposed && showLoading) setChatError(error?.message || 'Unable to load community chat.');
        return false;
      } finally {
        if (showLoading) setChatLoading(false);
      }
    };

    void loadHistory();
    if (isCommunityMember) {
      reconciliationInterval = window.setInterval(() => {
        if (document.visibilityState === 'hidden') return;
        void loadHistory(false);
      }, 10_000);
    }
    if (!isCommunityMember) {
      return () => {
        disposed = true;
        if (reconciliationInterval !== null) window.clearInterval(reconciliationInterval);
      };
    }

    stream = api.entityMessages.stream('community', communityId, currentUser.id);
    stream.onopen = () => {
      if (disposed) return;
      setChatConnection('live');
    };
    stream.onmessage = (event) => {
      if (disposed) return;
      try {
        const message = JSON.parse(event.data) as CommunityChatMessage;
        const node = chatMessagesRef.current;
        const wasNearLatest = Boolean(node && node.scrollHeight - node.scrollTop - node.clientHeight < 96);
        setChatMessages((previous) => mergeCommunityChatMessages(previous, [message]));
        if (wasNearLatest) scrollChatToLatest();
        if (message.senderId !== currentUser.id && document.visibilityState === 'visible') {
          void api.notifications.markConversationRead('community', communityId).catch(() => {});
          if (wasNearLatest) markSeenThrough(message.id);
        }
      } catch {
        // The persisted history refresh is the recovery path for malformed events.
      }
    };
    stream.onerror = () => {
      if (!disposed) setChatConnection('reconnecting');
    };

    return () => {
      disposed = true;
      stream?.close();
      if (reconciliationInterval !== null) window.clearInterval(reconciliationInterval);
    };
  }, [activeTab, community.id, currentUser.id, isCommunityMember]);

  const handleChatAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setChatError('Files must be 8 MB or smaller.');
      return;
    }
    if (!file.type.startsWith('image/') && ![
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ].includes(file.type)) {
      setChatError('Choose an image, PDF, DOC, DOCX, or TXT file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setChatAttachment({
        name: file.name,
        data: String(reader.result || ''),
        mimeType: file.type || 'application/octet-stream',
      });
      setChatError(null);
    };
    reader.onerror = () => setChatError('This file could not be read. Please try again.');
    reader.readAsDataURL(file);
  };

  const sendCommunityChatMessage = async (submittedText: string): Promise<boolean> => {
    const content = submittedText.trim();
    if ((!content && !chatAttachment) || !isCommunityMember || chatSending) return false;

    setChatSending(true);
    setChatError(null);
    const submittedAttachment = chatAttachment;
    const reply = chatReplyingTo;
    const pendingId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const pendingMessage: CommunityChatMessage = {
      id: pendingId,
      clientMessageId: pendingId,
      groupId: `community:${community.id}`,
      senderId: currentUser.id,
      content,
      replyToId: reply?.id ?? null,
      attachmentName: submittedAttachment?.name,
      attachmentData: submittedAttachment?.data,
      attachmentMimeType: submittedAttachment?.mimeType,
      createdAt: new Date().toISOString(),
    };
    setChatMessages((previous) => [...previous, pendingMessage]);
    setChatAttachment(null);
    setChatReplyingTo(null);
    scrollChatToLatest();
    try {
      const message = await api.entityMessages.send(
        'community',
        community.id,
        currentUser.id,
        content,
        {
          clientMessageId: pendingId,
          ...(submittedAttachment ? {
            attachmentName: submittedAttachment.name,
            attachmentData: submittedAttachment.data,
            attachmentMimeType: submittedAttachment.mimeType,
          } : {}),
          ...(reply ? { replyToId: reply.id } : {}),
        },
      );
      setChatMessages((previous) => mergeCommunityChatMessages(
        previous.filter((entry) => entry.id !== pendingId),
        [message as CommunityChatMessage],
      ));
      scrollChatToLatest();
      return true;
    } catch (error: any) {
      setChatMessages((previous) => previous.filter((entry) => entry.id !== pendingId));
      setChatAttachment((current) => current || submittedAttachment);
      setChatError(error?.message || 'Unable to send this message.');
      return false;
    } finally {
      setChatSending(false);
    }
  };

  const toggleChatReaction = async (message: CommunityChatMessage, emoji: string) => {
    if (message.id.startsWith('pending-')) return;
    const previousReactions = message.reactions || {};
    const currentUsers = previousReactions[emoji] || [];
    const nextUsers = currentUsers.includes(currentUser.id)
      ? currentUsers.filter((id) => id !== currentUser.id)
      : [...currentUsers, currentUser.id];
    const nextReactions = { ...previousReactions };
    if (nextUsers.length) nextReactions[emoji] = nextUsers;
    else delete nextReactions[emoji];

    setChatReactionMenuFor(null);
    setChatMessages((previous) => previous.map((entry) =>
      entry.id === message.id ? { ...entry, reactions: nextReactions } : entry,
    ));
    try {
      const saved = await api.entityMessages.toggleReaction(
        'community',
        community.id,
        message.id,
        currentUser.id,
        emoji,
      );
      setChatMessages((previous) => previous.map((entry) =>
        entry.id === message.id
          ? { ...entry, reactions: (saved as CommunityChatMessage).reactions || {} }
          : entry,
      ));
    } catch (error: any) {
      setChatMessages((previous) => previous.map((entry) =>
        entry.id === message.id ? { ...entry, reactions: previousReactions } : entry,
      ));
      setChatError(error?.message || 'That reaction could not be saved. Please try again.');
    }
  };

  const handleComposerImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setComposerError('Please choose an image file.');
      event.target.value = '';
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setComposerError('Images must be 8 MB or smaller.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setComposerImage(String(reader.result || ''));
      setComposerError(null);
    };
    reader.readAsDataURL(file);
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPublishing) return;
    const {
      title: composerTitle,
      content: composerContent,
      link: composerLink,
    } = composerDraftRef.current?.getValues() || { title: '', content: '', link: '' };
    const content = [composerContent.trim(), composerLink.trim()].filter(Boolean).join('\n\n');
    if (!content && !composerTitle.trim()) return;

    const fallbackTitle =
      composerType === 'resource'
        ? 'Shared resource'
        : composerType === 'question'
          ? 'Community question'
          : composerType === 'project'
            ? 'Community project'
            : content.replace(/\s+/g, ' ').slice(0, 80) || 'Community post';

    setComposerError(null);
    setIsPublishing(true);
    try {
      await onQuickPost(composerType, composerTitle.trim() || fallbackTitle, content, composerImage || undefined);
      composerDraftRef.current?.reset();
      setComposerImage('');
      if (composerImageInputRef.current) composerImageInputRef.current.value = '';
      setComposerOpen(false);
      confetti({ particleCount: 35, spread: 60 });
    } catch (error: any) {
      setComposerError(error?.message || 'Unable to publish this post. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCommentSubmit = async (postId: string, text: string): Promise<boolean> => {
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

  return (
    <div
      className={`community-detail-root network-community-detail max-w-5xl mx-auto px-4 sm:px-6 py-4 pb-28 space-y-5 ${activeTab === 'chat' ? 'community-chat-root' : ''} ${activeTab === 'chat' && keyboardOpen ? 'community-keyboard-open' : ''}`}
      style={activeTab === 'chat'
        ? {
            '--community-keyboard-inset': `${keyboardInset}px`,
            '--community-viewport-height': viewportHeight ? `${viewportHeight}px` : undefined,
          } as React.CSSProperties
        : undefined}
    >
      {/* Top back navigation */}
      <div className="community-detail-back flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to communities</span>
        </button>
      </div>

      {/* 1. Community Header Banner */}
      <div className={`community-detail-banner bg-gradient-to-r from-emerald-950/90 via-teal-900 to-slate-900 text-white rounded-3xl p-6 shadow-md relative overflow-hidden ${communityDescriptionExpanded ? 'community-detail-banner--description-expanded' : ''}`}>
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-4">
          <div className="community-detail-identity-row flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="community-detail-identity flex items-center gap-3.5">
              <div className="w-13 h-13 shrink-0 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center font-mono font-bold text-lg text-emerald-300 shadow-inner">
                {community.slug.slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="community-detail-title-line flex items-center gap-2">
                  <h1 className="min-w-0 break-words text-xl sm:text-2xl font-black tracking-tight text-white">
                    {community.displayName || community.name}
                  </h1>
                  <span className="shrink-0 text-xs text-emerald-300/80 font-medium flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    {community.membersCount.toLocaleString()} students
                  </span>
                </div>
                <div className="community-detail-description-block">
                  <p
                    id={`community-description-${community.slug}`}
                    className={`community-detail-description break-words text-xs sm:text-sm text-slate-300 mt-1 max-w-xl ${communityDescriptionExpanded ? 'is-expanded' : ''}`}
                  >
                    {community.description}
                  </p>
                  {community.description.length > 100 && (
                    <button
                      type="button"
                      className="community-detail-description-toggle"
                      aria-controls={`community-description-${community.slug}`}
                      aria-expanded={communityDescriptionExpanded}
                      data-testid={`button-expand-community-description-${community.slug}`}
                      onClick={() => setCommunityDescriptionExpanded((expanded) => !expanded)}
                    >
                      {communityDescriptionExpanded ? 'Less' : 'More'}
                    </button>
                  )}
                </div>
                <p className="community-detail-handle">{community.slug}</p>
              </div>
            </div>

            {/* Actions: Join, share & notifications */}
            <div className="community-detail-actions flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  onToggleJoin(community.slug);
                  if (!community.isJoined) confetti({ particleCount: 30, spread: 50 });
                }}
                className={`community-detail-action-button community-detail-join-button px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  community.isJoined
                    ? 'community-detail-join-button--joined bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm'
                    : 'community-detail-join-button--available bg-white hover:bg-white/90 text-slate-900 border border-white shadow-lg shadow-indigo-600/30'
                }`}
              >
                {community.isJoined ? (
                  <>
                    <span className="community-detail-join-label-full">Joined ✓</span>
                    <span className="community-detail-join-label-short">Joined</span>
                  </>
                ) : (
                  <>
                    <span className="community-detail-join-label-full">Join Community</span>
                    <span className="community-detail-join-label-short">Join</span>
                  </>
                )}
               </button>

              <button
                type="button"
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={`community-detail-action-button community-detail-notification-toggle p-2 rounded-xl border transition-colors cursor-pointer ${
                  notificationsEnabled
                    ? 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                    : 'bg-transparent border-white/30 text-white/80'
                }`}
                title="Community Notifications"
                aria-label={notificationsEnabled ? 'Disable community notifications' : 'Enable community notifications'}
              >
                <Bell className="w-4 h-4" />
              </button>

               {community.isAdmin && (
                 <button
                   type="button"
                   onClick={() => selectTab('members')}
                    className="community-detail-action-button inline-flex items-center gap-1.5 rounded-xl border border-emerald-300/30 bg-emerald-400/15 px-3 py-2 text-xs font-bold text-emerald-100 transition-colors hover:bg-emerald-400/25"
                   title="Manage this community"
                   aria-label={`Manage ${community.displayName || community.name}`}
                 >
                   <Shield className="h-4 w-4" />
                   <span className="hidden sm:inline">Manage</span>
                 </button>
               )}

              <button
                 type="button"
                 onClick={() => onOpenInvite?.(community)}
                  className="community-detail-action-button inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-white/20"
                 title="Invite students to this community"
                 aria-label={`Invite students to ${community.displayName || community.name}`}
               >
                 <UserPlus className="h-4 w-4" />
                 <span className="hidden sm:inline">Invite students</span>
               </button>

               <button
                type="button"
                onClick={() => {
                  setShareError(null);
                  setShareOpen(true);
                }}
                 className="community-detail-action-button inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-white/20"
                title="Share community"
                aria-label={`Share ${community.displayName || community.name}`}
              >
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Share</span>
              </button>
            </div>
          </div>

          {/* Members Avatar Overlap */}
          <div className="community-detail-online-status flex items-center gap-2 pt-1 border-t border-white/10">
            <div className="flex -space-x-2 overflow-hidden" aria-label={`${onlineCommunityCount} students online now`}>
              {onlineCommunityMembers.slice(0, 4).map((member) => (
                <SafeAvatar
                  key={member.id}
                  src={member.avatar}
                  name={member.name}
                  className="inline-block h-6 w-6 rounded-full object-cover ring-2 ring-emerald-950"
                />
              ))}
            </div>
            <span className="text-[11px] text-slate-300 font-medium">
              {onlineCommunityCount > 0 ? `${onlineCommunityCount} ${onlineCommunityCount === 1 ? 'student' : 'students'} online now` : 'No students online now'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Community Navigation Tabs */}
      <div className={`community-detail-tabs flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-slate-200 pb-1 ${activeTab === 'chat' ? 'community-chat-tabs' : ''}`}>
        {(
          [
            { id: 'feed', label: 'Feed' },
            ...(isAptitudeCommunity ? [{ id: 'aptitude', label: 'Aptitude' }] : []),
            { id: 'members', label: 'Members' },
            { id: 'chat', label: 'Chat' },
            { id: 'groups', label: 'Groups' },
            { id: 'resources', label: 'Resources' },
            { id: 'problems', label: 'Problems' },
            { id: 'projects', label: 'Projects' },
            { id: 'opportunities', label: 'Opportunities' },
            { id: 'about', label: 'About' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => selectTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'aptitude' ? (
        <AptitudeExamPanel
          currentUser={currentUser}
          directConversations={directConversations}
          onSendMessage={onSendMessage}
          shareUrl={examShareUrl}
        />
      ) : activeTab === 'groups' ? (
        <CommunityGroupsPanel
          community={community}
          currentUser={currentUser}
          onJoinCommunity={() => onToggleJoin(community.slug)}
          onOpenGroupChat={onOpenGroupChat}
        />
      ) : activeTab === 'chat' ? (
        <section className="community-chat-section space-y-4" aria-label={`${community.displayName || community.name} community chat`}>
          <div className="grid min-h-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="community-chat-panel flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200/80 bg-white shadow-xs max-sm:-mx-4 max-sm:rounded-none max-sm:border-x-0 lg:min-h-[560px]">
              <div className="community-chat-header flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={onBack}
                    className="community-chat-back-button inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-indigo-600 lg:hidden"
                    aria-label="Back to communities"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-black text-slate-900">{community.displayName || community.name} chat</h2>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        chatConnection === 'live' ? 'bg-emerald-500' : chatConnection === 'reconnecting' ? 'bg-amber-500' : 'bg-slate-300'
                      }`} />
                      {chatConnection === 'live'
                        ? 'Live for community members'
                        : chatConnection === 'reconnecting'
                          ? 'Reconnecting…'
                          : chatConnection === 'connecting'
                            ? 'Connecting…'
                            : chatConnection === 'join'
                              ? 'Join the community to chat'
                              : 'Chat is offline'}
                    </p>
                  </div>
                </div>
                <span className="hidden shrink-0 rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-500 sm:inline-flex">
                  {community.membersCount.toLocaleString()} members
                </span>
              </div>

              <div
                ref={chatMessagesRef}
                className="community-chat-messages flex min-h-0 flex-1 basis-0 flex-col space-y-3 overflow-y-auto bg-slate-50/50 px-4 py-4 sm:px-5"
                onScroll={(event) => {
                  if (event.currentTarget.scrollTop <= 48) void loadOlderCommunityMessages();
                }}
              >
                {chatLoadingOlder && (
                  <div className="flex justify-center py-2" role="status" aria-live="polite">
                    <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1" aria-hidden="true">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
                      </span>
                      Loading...
                    </span>
                  </div>
                )}
                {chatLoading && chatMessages.length === 0 ? (
                  <div className="flex min-h-0 flex-1 items-center justify-center" role="status" aria-live="polite">
                    <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1" aria-hidden="true">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
                      </span>
                      Loading...
                    </span>
                  </div>
                ) : chatMessages.length === 0 ? (
                  <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <p className="mt-3 text-sm font-black text-slate-800">Start the conversation</p>
                    <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
                      Ask a question, share a resource, or help another member solve a problem.
                    </p>
                  </div>
                ) : (
                  chatMessages.map((message) => {
                    const sender = users[message.senderId];
                    const isOwn = message.senderId === currentUser.id;
                    const seenNames = (message.seenBy || [])
                      .map((reader) => reader.name.trim())
                      .filter(Boolean);
                    const replyTarget = message.replyToId
                      ? chatMessages.find((entry) => entry.id === message.replyToId)
                      : null;
                    const reactionEntries = Object.entries(message.reactions || {}).filter(
                      ([, usersForReaction]) => Array.isArray(usersForReaction) && usersForReaction.length > 0,
                    );
                    return (
                      <div key={message.id} className={`flex items-end gap-2.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        {!isOwn && (
                          <SafeAvatar
                            src={sender?.avatar}
                            name={sender?.name || 'Community member'}
                            className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
                          />
                        )}
                        <div className={`max-w-[78%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                          {!isOwn && <span className="mb-1 px-1 text-[10px] font-bold text-slate-500">{sender?.name || 'Community member'}</span>}
                          <div className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                            isOwn
                              ? 'rounded-br-md bg-indigo-600 text-white'
                              : 'rounded-bl-md border border-slate-200 bg-white text-slate-700'
                          }`}>
                             {replyTarget && (
                               <button
                                 type="button"
                                 onClick={() => document.getElementById(`community-chat-message-${replyTarget.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                                 className={`mb-2 w-full rounded-lg border-l-2 px-2 py-1.5 text-left text-[10px] ${
                                   isOwn
                                     ? 'border-white/60 bg-white/10 text-white/80'
                                     : 'border-indigo-400 bg-slate-50 text-slate-500'
                                 }`}
                               >
                                 <span className="block font-bold">
                                   Replying to {replyTarget.senderId === currentUser.id ? 'yourself' : users[replyTarget.senderId]?.name || 'community member'}
                                 </span>
                                 <span className="block truncate">{replyTarget.content || replyTarget.attachmentName || 'Attachment'}</span>
                               </button>
                             )}
                            {message.attachmentData && message.attachmentMimeType?.startsWith('image/') && message.attachmentData.startsWith('data:') && (
                               <button
                                 type="button"
                                 onClick={() => setLightboxImage({
                                   src: message.attachmentData!,
                                   alt: message.attachmentName || 'Shared image',
                                 })}
                                 aria-label={`Open ${message.attachmentName || 'shared image'} full size`}
                                 title="Open full-size image"
                                 className="mb-2 block max-w-full cursor-zoom-in rounded-xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                               >
                                 <img
                                   src={message.attachmentData}
                                   alt={message.attachmentName || 'Shared image'}
                                   className="block max-h-64 max-w-full rounded-xl object-contain"
                                 />
                               </button>
                            )}
                            {message.attachmentData && !message.attachmentMimeType?.startsWith('image/') && message.attachmentData.startsWith('data:') && (
                              <a
                                href={message.attachmentData}
                                download={message.attachmentName || 'shared-file'}
                                className="mb-2 flex items-center gap-2 rounded-xl bg-black/5 px-2.5 py-2 text-[11px] font-bold hover:bg-black/10"
                              >
                                <FileText className="h-4 w-4 shrink-0" />
                                <span className="truncate">{message.attachmentName || 'Shared file'}</span>
                              </a>
                            )}
                             {message.sharedPost && <SharedPostPreview post={message.sharedPost} />}
                             {message.content && (!message.sharedPost || message.content !== 'Shared a post') && (
                               <p className="whitespace-pre-wrap break-words">{message.content}</p>
                             )}
                          </div>
                           {chatReactionMenuFor === message.id && (
                             <div className={`flex items-center gap-0.5 rounded-full border p-1 shadow-lg ${isOwn ? 'border-indigo-400/30 bg-indigo-700' : 'border-slate-200 bg-white'}`}>
                               {['❤️', '👍', '😂', '😮', '😢', '🙏'].map((emoji) => (
                                 <button
                                   key={emoji}
                                   type="button"
                                   onClick={() => void toggleChatReaction(message, emoji)}
                                   className="h-8 w-8 rounded-full text-base hover:bg-indigo-500/10"
                                   aria-label={`React with ${emoji}`}
                                 >
                                   {emoji}
                                 </button>
                               ))}
                             </div>
                           )}
                           {reactionEntries.length > 0 && (
                             <div className={`mt-1 flex flex-wrap gap-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                               {reactionEntries.map(([emoji, usersForReaction]) => (
                                 <button
                                   key={emoji}
                                   type="button"
                                   onClick={() => void toggleChatReaction(message, emoji)}
                                   className={`rounded-full border px-2 py-0.5 text-[10px] ${
                                     usersForReaction.includes(currentUser.id)
                                       ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                                       : 'border-slate-200 bg-white text-slate-600'
                                   }`}
                                 >
                                   {emoji} {usersForReaction.length}
                                 </button>
                               ))}
                             </div>
                           )}
                           <div className={`mt-1 flex items-center gap-2 px-1 text-[10px] text-slate-400 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                             <button
                               type="button"
                               onClick={() => setChatReplyingTo(message)}
                               className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 font-semibold hover:bg-indigo-50 hover:text-indigo-600"
                             >
                               <Reply className="h-3 w-3" /> Reply
                             </button>
                             <button
                               type="button"
                               onClick={() => setChatReactionMenuFor((value) => value === message.id ? null : message.id)}
                               className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 font-semibold hover:bg-indigo-50 hover:text-indigo-600"
                             >
                               <Smile className="h-3 w-3" /> React
                             </button>
                           </div>
                          <span className="mt-1 px-1 text-[9px] font-medium text-slate-400">{formatChatTime(message.createdAt)}</span>
                           {isOwn && seenNames.length > 0 && (
                             <details className="mt-0.5 max-w-full px-1 text-[9px] font-semibold text-indigo-500">
                               <summary
                                 className="cursor-pointer list-none truncate"
                                 title={`Seen by ${seenNames.join(', ')}`}
                               >
                                 Seen by {seenNames.slice(0, 2).join(', ')}
                                 {seenNames.length > 2 ? ` +${seenNames.length - 2}` : ''}
                               </summary>
                               <div className="mt-1 max-h-24 overflow-y-auto rounded-lg bg-indigo-50 px-2 py-1.5 text-left text-[10px] font-medium text-slate-600">
                                 {message.seenBy?.map((reader) => (
                                   <div key={reader.id}>{reader.name}</div>
                                 ))}
                               </div>
                             </details>
                           )}
                        </div>
                        {isOwn && (
                          <SafeAvatar src={currentUser.avatar} name={currentUser.name} className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-indigo-100" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {chatError && (
                <p className="border-t border-rose-100 bg-rose-50 px-4 py-2 text-[11px] font-semibold text-rose-600" role="alert">
                  {chatError}
                </p>
              )}

              <div
                className={`community-chat-composer border-t border-slate-100 bg-white p-3 sm:p-4 ${keyboardInset > 0 ? 'community-keyboard-open' : ''}`}
              >
                {isCommunityMember ? (
                  <>
                    {chatAttachment && (
                    <div className="mb-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2">
                      {chatAttachment.mimeType.startsWith('image/') ? (
                        <img src={chatAttachment.data} alt="" className="h-12 w-12 rounded-lg object-cover" />
                      ) : (
                        <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-rose-50 text-rose-600"><FileText className="h-5 w-5" /></span>
                      )}
                      <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-slate-700">{chatAttachment.name}</span>
                      <button type="button" onClick={() => setChatAttachment(null)} className="rounded-full p-1.5 text-slate-400 hover:bg-white hover:text-slate-700" aria-label="Remove attachment">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    )}
                    <input id="community-chat-attachment" type="file" hidden accept="image/*,.pdf,.doc,.docx,.txt" onChange={handleChatAttachment} />
                    <CommunityChatComposer
                      inputId="community-chat-input"
                      placeholder={`Message ${community.displayName || community.name}…`}
                      isSending={chatSending}
                      hasAttachment={Boolean(chatAttachment)}
                      draftRef={communityChatDraftRef}
                      onChooseAttachment={() => document.getElementById('community-chat-attachment')?.click()}
                      onSubmit={sendCommunityChatMessage}
                      onKeyboardFocus={() => {
                        setKeyboardOpen(true);
                        onKeyboardVisibilityChange?.(true);
                      }}
                      onKeyboardBlur={() => {
                        setKeyboardOpen(false);
                        onKeyboardVisibilityChange?.(false);
                      }}
                    />
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => onToggleJoin(community.slug)}
                    className="w-full rounded-xl bg-indigo-600 px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-indigo-700"
                  >
                    Join the community to start chatting
                  </button>
                )}
              </div>
            </div>

            <aside className="hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs lg:block">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900">Chat with members</h3>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                Messages are shared with members of {community.displayName || community.name} in real time.
              </p>
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                {communityMembers.slice(0, 6).map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => onOpenProfile(member)}
                    className="flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left transition-colors hover:bg-slate-50"
                  >
                    <span className="relative shrink-0">
                      <SafeAvatar src={member.avatar} name={member.name} className="h-8 w-8 rounded-full object-cover" />
                      <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${(member.isOnline ?? member.id === currentUser.id) ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[11px] font-bold text-slate-800">{member.name}</span>
                      <span className="block truncate text-[10px] text-slate-400">{member.isOnline ?? member.id === currentUser.id ? 'Online now' : 'Community member'}</span>
                    </span>
                  </button>
                ))}
                {communityMembers.length === 0 && <p className="text-xs text-slate-400">Member profiles will appear here as they join.</p>}
              </div>
            </aside>
          </div>
        </section>
      ) : activeTab === 'members' ? (
        <section className="space-y-4" aria-label={`${community.displayName || community.name} members`}>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-slate-900">Community members</p>
                <p className="mt-1 text-xs text-slate-500">
                  {community.membersCount.toLocaleString()} students in {community.displayName || community.name}
                </p>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl bg-slate-50 p-1">
                {([
                  { id: 'all', label: 'All members' },
                  { id: 'online', label: 'Online now' },
                ] as const).map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setMemberFilter(filter.id)}
                    className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors ${
                      memberFilter === filter.id
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="relative mt-4 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={memberSearch}
                onChange={(event) => setMemberSearch(event.target.value)}
                placeholder="Search members by name, college, branch or skill"
                aria-label="Search community members"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white"
              />
            </label>

            {community.isAdmin && (
              <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                <div className="flex items-start gap-2">
                  <Shield className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-indigo-950">Community admin controls</p>
                    <p className="mt-1 text-[11px] text-indigo-800/70">Update the community details or manage member access.</p>
                   <p className="mt-1 text-[11px] text-indigo-800/70">
                     Head admin: {communityMembers.find((member) => member.id === communityHeadId)?.name || 'Community creator'} · Admin access can be shared with multiple members.
                   </p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <input
                    value={adminName}
                    onChange={(event) => setAdminName(event.target.value)}
                    aria-label="Community name"
                    className="rounded-xl border border-indigo-100 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-400"
                  />
                  <input
                    value={adminDescription}
                    onChange={(event) => setAdminDescription(event.target.value)}
                    aria-label="Community description"
                    className="rounded-xl border border-indigo-100 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-400"
                  />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={adminBusy || !adminName.trim() || !adminDescription.trim()}
                    onClick={async () => {
                      setAdminBusy(true);
                      setAdminMessage(null);
                      try {
                        const updated = await api.communities.update(community.id, {
                          actorId: currentUser.id,
                          name: adminName.trim(),
                          description: adminDescription.trim(),
                        });
                        onCommunityUpdated?.(updated);
                        setAdminMessage('Community details saved.');
                      } catch {
                        setAdminMessage('Could not save community details.');
                      } finally {
                        setAdminBusy(false);
                      }
                    }}
                    className="rounded-xl bg-indigo-600 px-3 py-2 text-[11px] font-black text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {adminBusy ? 'Saving…' : 'Save details'}
                  </button>
                  {adminMessage && <span className="text-[11px] font-semibold text-indigo-700">{adminMessage}</span>}
                </div>
              </div>
            )}
          </div>

          {filteredMembers.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {filteredMembers.map((member) => {
                const isOnline = member.isOnline ?? member.id === currentUser.id;
                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs transition-all hover:border-indigo-200 hover:shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => onOpenProfile(member)}
                      className="relative shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
                      aria-label={`Open ${member.name}'s profile`}
                    >
                      <SafeAvatar
                        src={member.avatar}
                        name={member.name}
                        className="h-12 w-12 rounded-full object-cover ring-1 ring-slate-200"
                      />
                      <span
                        className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                          isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                        title={isOnline ? 'Online now' : 'Offline'}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenProfile(member)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-black text-slate-900 hover:text-indigo-600">
                          {member.name}
                        </span>
                        {member.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-indigo-500" />}
                        {communityAdminIds.has(member.id) && (
                          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-black ${
                            member.id === communityHeadId
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-indigo-50 text-indigo-700'
                          }`}>
                            {member.id === communityHeadId ? 'Head admin' : 'Admin'}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
                        {[member.branch, member.college].filter(Boolean).join(' · ') || 'Network member'}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                        <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        {isOnline ? 'Online now' : getEducationDisplay(member).compact}
                      </p>
                    </button>
                     <div className="flex shrink-0 items-center gap-1">
                       <button
                         type="button"
                         onClick={() => onOpenProfile(member)}
                         className="hidden items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-indigo-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 sm:flex"
                       >
                         <UserRound className="h-3.5 w-3.5" />
                         View
                       </button>
                       {community.isAdmin && member.id !== currentUser.id && (
                         <>
                            <button
                             type="button"
                             onClick={async () => {
                                if (member.id === communityHeadId) return;
                               try {
                                 const updated = communityAdminIds.has(member.id)
                                   ? await api.communities.demoteAdmin(community.id, currentUser.id, member.id)
                                   : await api.communities.promoteAdmin(community.id, currentUser.id, member.id);
                                 onCommunityUpdated?.(updated);
                               } catch {
                                 setAdminMessage('Could not update admin access.');
                               }
                             }}
                              disabled={member.id === communityHeadId}
                              className="rounded-lg border border-indigo-100 px-2 py-1.5 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
                              title={member.id === communityHeadId ? 'The head admin cannot be removed' : communityAdminIds.has(member.id) ? 'Remove admin access' : 'Make admin'}
                           >
                             <UserCog className="h-3.5 w-3.5" />
                           </button>
                           <button
                             type="button"
                             onClick={async () => {
                               if (!window.confirm(`Block ${member.name} from this community?`)) return;
                               try {
                                 const updated = await api.communities.blockMember(community.id, currentUser.id, member.id);
                                 onCommunityUpdated?.(updated);
                               } catch {
                                 setAdminMessage('Could not block this member.');
                               }
                             }}
                             className="rounded-lg border border-rose-100 px-2 py-1.5 text-[10px] font-bold text-rose-600 hover:bg-rose-50"
                             title="Block and remove member"
                           >
                             <span aria-hidden="true">×</span>
                           </button>
                         </>
                       )}
                     </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <Users className="mx-auto h-7 w-7 text-slate-300" />
              <p className="mt-2 text-xs font-bold text-slate-600">
                {communityMembers.length === 0 ? 'No member profiles are available yet.' : 'No members match your search.'}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Try a different name, college, branch or filter.
              </p>
            </div>
          )}
        </section>
      ) : activeTab === 'about' ? (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3" aria-label={`About ${community.displayName || community.name}`}>
          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><Info className="h-5 w-5" /></div>
                <div>
                  <h2 className="text-base font-black text-slate-900">About {community.displayName || community.name}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{community.description}</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-lg font-black text-slate-900">{community.membersCount.toLocaleString()}</p><p className="text-[11px] font-semibold text-slate-500">Members</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-lg font-black text-slate-900">{communityPosts.length}</p><p className="text-[11px] font-semibold text-slate-500">Posts</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-lg font-black text-slate-900">{onlineCommunityCount}</p><p className="text-[11px] font-semibold text-slate-500">Online now</p></div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /><h3 className="text-sm font-black text-slate-900">Community rules</h3></div>
              <ol className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600">
                {(community.rules || ['Be respectful to all peers', 'Share verified notes and resources', 'No spam', 'Search before posting']).map((rule, index) => <li key={rule} className="flex gap-2"><span className="font-black text-indigo-600">{index + 1}.</span><span>{rule}</span></li>)}
              </ol>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-black text-slate-900">Make this space useful</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">Ask focused questions, share links with context, and help others build a consistent learning habit.</p>
            <button type="button" onClick={() => openComposerFor('post')} className="mt-4 w-full rounded-xl bg-indigo-600 px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-indigo-700">Start a discussion</button>
          </div>
        </section>
      ) : activeTab === 'resources' || activeTab === 'problems' || activeTab === 'projects' || activeTab === 'opportunities' ? (
        <section className="space-y-4" aria-label={libraryTitle}>
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                {activeTab === 'resources' ? <BookOpen className="h-5 w-5 text-amber-600" /> : activeTab === 'problems' ? <ListChecks className="h-5 w-5 text-emerald-600" /> : activeTab === 'projects' ? <FolderGit2 className="h-5 w-5 text-purple-600" /> : <Target className="h-5 w-5 text-indigo-600" />}
                <h2 className="text-base font-black text-slate-900">{libraryTitle}</h2>
              </div>
              <p className="mt-1 text-xs text-slate-500">{libraryDescription}</p>
            </div>
            <button type="button" onClick={() => openComposerFor(activeTab === 'resources' ? 'resource' : activeTab === 'problems' ? 'question' : activeTab === 'projects' ? 'project' : 'post')} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-700">
              <Plus className="h-3.5 w-3.5" /> Add {activeTab === 'problems' ? 'problem' : activeTab === 'opportunities' ? 'opportunity' : activeTab.slice(0, -1)}
            </button>
          </div>

          {activeTab === 'resources' && isCyberCommunity && (
            <section className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 p-4 text-white shadow-sm sm:p-5" aria-label="Cybersecurity study roadmap">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">Study roadmap</p>
                  <h2 className="mt-1 text-lg font-black">From zero to security projects</h2>
                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-indigo-100">
                    Learn the foundations first, practice only in authorized labs, then choose a blue-team or red-team direction.
                  </p>
                </div>
                <span className="w-fit rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-bold text-cyan-200">16-week starter path</span>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {CYBER_ROADMAP.map((step) => (
                  <div key={step.phase} className="rounded-xl border border-white/10 bg-white/[0.07] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black tracking-widest text-cyan-300">{step.phase}</span>
                      <span className="text-[10px] font-semibold text-indigo-200">{step.duration}</span>
                    </div>
                    <h3 className="mt-2 text-xs font-black text-white">{step.title}</h3>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-indigo-100">{step.topics}</p>
                    <p className="mt-2 border-t border-white/10 pt-2 text-[10px] font-semibold text-cyan-200">Study: {step.study}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[10px] leading-relaxed text-indigo-200">
                Safety first: use CTFs, local vulnerable apps, and systems you own or have explicit permission to test. Never scan or exploit a real target without authorization.
              </p>
            </section>
          )}

          {curatedLinks.length > 0 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {curatedLinks.map((item) => (
                <div key={item.id} className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`rounded-xl p-2 ${item.youtubeUrl ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
                        {item.youtubeUrl ? <Youtube className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                      </div>
                      <div><h3 className="text-sm font-black text-slate-900 group-hover:text-indigo-700">{item.title}</h3><p className="mt-1 text-[11px] font-semibold text-indigo-600">{item.source}</p></div>
                    </div>
                    <ExternalLink className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-indigo-500" />
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-slate-600">{item.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">{item.tags.map((tag) => <span key={tag} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500">{tag}</span>)}</div>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                    <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-[10px] font-bold text-indigo-700 transition-colors hover:bg-indigo-100">
                      {item.youtubeUrl ? 'Website' : 'Open resource'} <ExternalLink className="h-3 w-3" />
                    </a>
                    {item.youtubeUrl && (
                      <a href={item.youtubeUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[10px] font-bold text-rose-700 transition-colors hover:bg-rose-100">
                        <Youtube className="h-3 w-3" /> YouTube
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {libraryPosts.length > 0 ? (
            <div className="space-y-3">
              <p className="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Shared by this community</p>
              {libraryPosts.map((post) => (
                <article key={post.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                       <SafeAvatar src={post.author.avatar} name={post.author.name} className="h-8 w-8 rounded-full object-cover" />
                      <div className="min-w-0"><p className="truncate text-xs font-bold text-slate-800">{post.author.name}</p><p className="text-[10px] text-slate-400">{post.timestamp}</p></div>
                    </div>
                    <span className="rounded-full bg-slate-50 px-2 py-1 text-[10px] font-bold capitalize text-slate-500">{post.type}</span>
                  </div>
                  <h3 className="mt-3 text-sm font-black text-slate-900">{post.title}</h3>
                  <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-600"><LinkifiedText text={post.content} /></p>
                  {(post.websiteUrl || extractUrls(post.content)[0]) && <a href={post.websiteUrl || extractUrls(post.content)[0]} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline">Open link <ExternalLink className="h-3.5 w-3.5" /></a>}
                  <div className="mt-3 flex items-center gap-4 border-t border-slate-100 pt-3 text-xs font-semibold text-slate-500">
                    <button type="button" onClick={() => onToggleUpvote(post.id, 1)} className="inline-flex items-center gap-1 hover:text-indigo-600"><ArrowUp className="h-3.5 w-3.5" />{post.upvotes}</button>
                    <button type="button" onClick={() => onToggleSave(post.id)} className={`inline-flex items-center gap-1 hover:text-indigo-600 ${post.saved ? 'text-indigo-600' : ''}`}><Bookmark className="h-3.5 w-3.5" />{post.saved ? 'Saved' : 'Save'}</button>
                  </div>
                </article>
              ))}
            </div>
          ) : curatedLinks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <Sparkles className="mx-auto h-7 w-7 text-slate-300" />
              <p className="mt-2 text-xs font-bold text-slate-600">Nothing here yet</p>
              <p className="mt-1 text-[11px] text-slate-400">Be the first person to add a {activeTab === 'problems' ? 'problem' : activeTab.slice(0, -1)}.</p>
            </div>
          ) : null}
        </section>
      ) : (
      /* Main Grid: Feed & Sidebar */
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Feed & Composer */}
        <div className="lg:col-span-2 space-y-4">
          {/* Quick Composer */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <SafeAvatar
                src={currentUser.avatar}
                name={currentUser.name}
                className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-100"
              />
              <CommunityQuickPostDraft
                ref={composerDraftRef}
                titlePlaceholder={`${composerTypeLabel} title...`}
                contentPlaceholder={composerPlaceholder}
                expanded={composerOpen}
                onExpand={() => setComposerOpen(true)}
              />
            </div>

            {/* Quick type shortcuts */}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-100 overflow-x-auto no-scrollbar">
              <button
                onClick={() => {
                  setComposerType('post');
                  setComposerOpen(true);
                }}
                aria-pressed={composerOpen && composerType === 'post'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${composerOpen && composerType === 'post' ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'}`}
              >
                <FileText className="h-3.5 w-3.5" /> Post
              </button>
              <button
                onClick={() => {
                  setComposerType('question');
                  setComposerOpen(true);
                }}
                aria-pressed={composerOpen && composerType === 'question'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${composerOpen && composerType === 'question' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-600'}`}
              >
                <HelpCircle className="h-3.5 w-3.5" /> Question
              </button>
              <button
                onClick={() => {
                  setComposerType('resource');
                  setComposerOpen(true);
                }}
                aria-pressed={composerOpen && composerType === 'resource'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${composerOpen && composerType === 'resource' ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' : 'text-slate-600 hover:bg-amber-50 hover:text-amber-600'}`}
              >
                <BookOpen className="h-3.5 w-3.5" /> Resource
              </button>
              <button
                onClick={() => {
                  setComposerType('project');
                  setComposerOpen(true);
                }}
                aria-pressed={composerOpen && composerType === 'project'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${composerOpen && composerType === 'project' ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-200' : 'text-slate-600 hover:bg-purple-50 hover:text-purple-600'}`}
              >
                <Code className="h-3.5 w-3.5" /> Project
              </button>
            </div>

            {/* Expanded Composer Dialog */}
            {composerOpen && (
              <form onSubmit={handlePostSubmit} className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Type: <span className="text-indigo-600">{composerTypeLabel}</span></span>
                  {(['post', 'question', 'resource', 'project'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setComposerType(t)}
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        composerType === t
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div>
                  <input
                    ref={composerImageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleComposerImageUpload}
                    className="hidden"
                  />
                  {composerImage ? (
                    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
                      <img
                        src={composerImage}
                        alt="Preview of the image attached to this community post"
                        className="max-h-80 w-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setComposerImage('');
                          if (composerImageInputRef.current) composerImageInputRef.current.value = '';
                        }}
                        className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-black"
                      >
                        Remove image
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => composerImageInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/60 px-3 py-2 text-xs font-bold text-indigo-700 hover:border-indigo-400 hover:bg-indigo-50"
                    >
                      <ImageIcon className="h-4 w-4" /> Add image or screenshot
                    </button>
                  )}
                  <p className="mt-1 text-[10px] text-slate-400">PNG, JPG, WEBP or GIF up to 8 MB</p>
                </div>

                {composerError && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700" role="alert">
                    {composerError}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setComposerOpen(false)}
                    disabled={isPublishing}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPublishing}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                  >
                    {isPublishing ? 'Publishing…' : `Publish to ${community.slug}`}
                  </button>
                </div>
              </form>
            )}
          </div>

          {isJeeCommunity && <JeeCountdownCard darkMode={true} />}

          {/* Feed Filter Bar */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: 'latest', label: 'Latest' },
                  { id: 'top', label: 'Top' },
                  { id: 'unanswered', label: 'Unanswered' },
                  { id: 'projects', label: 'Projects' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFeedFilter(f.id)}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                    feedFilter === f.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
            </button>
          </div>

          {/* Posts List */}
          <div className="space-y-4">
             {feedPosts.map((post) => {
              const isCommentsOpen = expandedCommentsPostId === post.id;
               const isLongPost = post.content.length > 240 || post.content.split('\n').length > 5;
               const isContentExpanded = expandedContentPostIds.has(post.id);
                const postTypeLabel = post.type === 'question' ? 'Question' : post.type === 'collab' ? 'Looking for' : post.type === 'project' ? 'Project' : post.type === 'hackathon' ? 'Hackathon' : 'Post';
              return (
                <div
                  key={post.id}
                  id={`post-${post.id}`}
                   data-post-id={post.id}
                    className="post-card home-post-card space-y-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[0_2px_10px_rgba(15,23,42,0.035)] transition-all hover:border-indigo-200 sm:p-4"
                >
                  {/* Author Header */}
                   <div className="flex items-start gap-2.5">
                      {post.isAnonymous ? (
                       <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm text-slate-500 ring-1 ring-slate-100">?</div>
                      ) : (
                         <SafeAvatar
                           src={post.author.avatar}
                           name={post.author.name}
                           onClick={() => onOpenProfile(post.author)}
                           className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-slate-100 cursor-pointer"
                         />
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
                         <div className="flex shrink-0 items-center gap-1">
                            <span className="post-type-pill rounded-full border border-indigo-100 bg-indigo-50 px-2 py-1 text-[9px] font-black text-indigo-700">{postTypeLabel}</span>
                            <PostActionMenu
                              canEdit={!post.isAnonymous && post.author.id === currentUser.id && Boolean(onEditPost)}
                              canDelete={community.isAdmin || (!post.isAnonymous && post.author.id === currentUser.id)}
                              canReshare={!post.isAnonymous && Boolean(onResharePost)}
                              reshareBusy={resharingPostId === post.id}
                              onEdit={() => setEditingPost(post)}
                              onDelete={() => handleDeleteFromCommunity(post.id)}
                              onReshare={() => handleReshareFromCommunity(post.id)}
                            />
                         </div>
                       </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="space-y-2">
                     {post.resharedFromId && (
                       <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-2.5 py-2 text-[10px] font-bold text-emerald-700">
                         <Repeat2 className="h-3.5 w-3.5" /> Reshared post
                       </div>
                     )}
                    {((post.postImages?.length ? post.postImages : post.postImage ? [post.postImage] : [])).length > 0 && (
                      <div className="flex snap-x snap-mandatory items-start gap-1 overflow-x-auto rounded-2xl bg-slate-100 no-scrollbar">
                        {(post.postImages?.length ? post.postImages : post.postImage ? [post.postImage] : []).map((image, index, images) => (
                          <button
                            key={`${post.id}-image-${index}`}
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
                              className={`w-full ${images.length > 1 ? 'h-64 object-cover sm:h-80' : 'max-h-[560px] object-contain'}`}
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                            <span className="pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-slate-950/65 px-2 py-1 text-[10px] font-bold text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                              <Maximize2 className="h-3 w-3" />
                              View full image
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                     <h3 className="text-[15px] font-black leading-snug text-slate-900 sm:text-base">
                      {post.title}
                    </h3>
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
                        {(post.websiteUrl || extractUrls(post.content)[0]) && (
                          <LinkPreview url={post.websiteUrl || extractUrls(post.content)[0]} />
                        )}

                        {/* Tag Pills */}
                        {(post.tags?.length || post.prizePool || post.teamSize || post.deadline) && (
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {(post.tags || []).slice(0, 4).map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500"
                              >
                                #{tag}
                              </span>
                            ))}
                            {post.prizePool && <span className="rounded-full bg-purple-50 px-2 py-1 text-[10px] font-bold text-purple-700">Prize pool · {post.prizePool}</span>}
                            {post.teamSize && <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">Team · {post.teamSize}</span>}
                            {post.deadline && <span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700">Deadline · {post.deadline}</span>}
                          </div>
                        )}
                        {post.pollData && (
                          <PostPoll postId={post.id} pollData={post.pollData} onVote={onVotePoll} />
                        )}

                        {/* PDF Attachment preview */}
                        {post.attachment && (
                          <a href={post.attachment.url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-800">
                                  {post.attachment.name}
                                </p>
                                <p className="text-[10px] text-slate-500">{post.attachment.size}</p>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-indigo-600 hover:underline">
                              Download
                            </span>
                          </a>
                        )}

                        {/* GitHub Repo preview */}
                        {post.githubRepo && (
                          <a
                            href={`https://${post.githubRepo}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors block"
                          >
                            <Github className="w-4 h-4 text-emerald-400" />
                            <div>
                              <p className="text-xs font-mono font-semibold">{post.githubRepo}</p>
                              <p className="text-[10px] text-slate-400">GitHub Repository</p>
                            </div>
                          </a>
                        )}
                      </>
                    )}

                    {isLongPost && (
                      <button
                        type="button"
                        aria-expanded={isContentExpanded}
                        onClick={() => setExpandedContentPostIds((previous) => {
                          const next = new Set(previous);
                          if (next.has(post.id)) next.delete(post.id);
                          else next.add(post.id);
                          return next;
                        })}
                        className="text-xs font-black text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        {isContentExpanded ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>

                  {/* Actions footer */}
                  <div className="post-actions flex items-center justify-between border-t border-slate-100 pt-2.5">
                    <div className="flex items-center gap-3.5">
                      <button
                        type="button"
                        onClick={() => onToggleLike(post.id)}
                        aria-label={post.liked ? 'Unlike post' : 'Like post'}
                        className={`flex items-center gap-1.5 rounded-lg px-1 py-0.5 text-xs font-bold cursor-pointer ${post.liked ? 'text-rose-600' : 'text-slate-500 hover:text-rose-600'}`}
                      >
                        <Heart className={`h-4 w-4 ${post.liked ? 'fill-rose-600' : ''}`} />
                        <span>{post.likesCount || post.upvotes}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCommentsPostId(isCommentsOpen ? null : post.id)
                        }
                        className="flex items-center gap-1.5 rounded-lg px-1 py-0.5 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>{post.commentsCount || post.comments.length}</span>
                      </button>

                      <SocialShareMenu
                        postId={post.id}
                        title={post.title}
                        text={post.content}
                        communities={communities}
                        onShareToCommunity={onSharePostToCommunity}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleSave(post.id)}
                      aria-label={post.saved ? 'Remove saved post' : 'Save post'}
                      title={post.saved ? 'Saved' : 'Save post'}
                      className={`rounded-lg p-1.5 cursor-pointer ${post.saved ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-700'}`}
                    >
                      <Bookmark className={`h-4 w-4 ${post.saved ? 'fill-indigo-600' : ''}`} />
                    </button>
                  </div>

                  {/* Comments Section */}
                  {isCommentsOpen && (
                    <div className="pt-3 border-t border-slate-100 space-y-3">
                      <div className="space-y-2">
                        {post.comments.map((comment) => (
                          <div key={comment.id} className={`flex gap-2.5 p-2 rounded-xl bg-slate-50 ${comment.replyToId ? 'ml-6 border-l-2 border-indigo-200' : ''}`}>
                            {comment.isAnonymous ? (
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] text-slate-500">?</div>
                            ) : (
                               <SafeAvatar
                                 src={comment.author.avatar}
                                 name={comment.author.name}
                                 onClick={() => onOpenProfile(comment.author)}
                                 className="w-7 h-7 rounded-full object-cover cursor-pointer"
                               />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span
                                  onClick={comment.isAnonymous ? undefined : () => onOpenProfile(comment.author)}
                                  className={`text-xs font-bold text-slate-800 ${comment.isAnonymous ? '' : 'cursor-pointer hover:underline'}`}
                                >
                                  {comment.author.name}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {comment.timestamp}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 mt-0.5">{comment.content}</p>
                              <button
                                type="button"
                                onClick={() => startReply(post.id, comment.id, comment.author.name)}
                                className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 transition hover:text-indigo-600 cursor-pointer"
                              >
                                <MessageCircle className="h-3 w-3" /> Reply
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {replyingTo[post.id] && (
                        <div className="flex items-center justify-between rounded-lg bg-indigo-50 px-3 py-1.5 text-[10px] font-bold text-indigo-700">
                          <span>Replying to a comment</span>
                          <button type="button" onClick={() => setReplyingTo((previous) => ({ ...previous, [post.id]: null }))} className="text-indigo-500 hover:text-indigo-800 cursor-pointer">Cancel</button>
                        </div>
                      )}

                      {/* Reply input */}
                      <div className="flex min-w-0 flex-wrap items-center gap-2 pt-1">
                        {isPostingAnonymously(post.id) ? (
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] text-slate-500">?</div>
                        ) : (
                          <SafeAvatar
                            src={currentUser.avatar}
                            name={currentUser.name}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                        )}
                        <InlineCommentComposer
                          ref={(composer) => { commentInputRefs.current[post.id] = composer; }}
                          postId={post.id}
                          initialValue={commentDraftsRef.current[post.id] || ''}
                          onDraftChange={(value) => { commentDraftsRef.current[post.id] = value; }}
                          placeholder={isPostingAnonymously(post.id) ? 'Reply anonymously…' : 'Write a helpful answer...'}
                          submitting={Boolean(commentSubmitting[post.id])}
                          onSubmit={(text) => handleCommentSubmit(post.id, text)}
                          inputClassName="min-w-[150px] flex-1 basis-[150px] rounded-full border border-transparent bg-slate-100 px-3 py-1.5 text-xs focus:bg-white focus:border-indigo-400 focus:outline-none"
                          buttonClassName="shrink-0 rounded-full bg-indigo-600 p-1.5 text-white hover:bg-indigo-700 disabled:opacity-40"
                        />
                        <button
                          type="button"
                          onClick={() => setAnonymousCommentPosts((previous) => ({ ...previous, [post.id]: !isPostingAnonymously(post.id) }))}
                          className={`order-3 ml-9 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[9px] font-bold transition-colors sm:order-none sm:ml-0 sm:text-[10px] ${
                            isPostingAnonymously(post.id)
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                          title={isPostingAnonymously(post.id) ? 'Posting anonymously' : 'Post using your profile'}
                        >
                          {isPostingAnonymously(post.id) ? 'Posting anonymously' : 'Post anonymously'}
                        </button>
                      </div>
                      {commentErrors[post.id] && <p className="ml-9 text-[10px] font-bold text-rose-600">{commentErrors[post.id]}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Community Meta & Sidebar */}
        <div className="space-y-4">
          {/* About /slug Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900">About {community.slug}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{community.description}</p>
            <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>{community.membersCount.toLocaleString()} Members</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Online {onlineCommunityCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                <span>Created on {community.createdDate || '12 Mar 2023'}</span>
              </div>
            </div>
          </div>

          {/* Rules Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900">Rules</h3>
            <ol className="space-y-2 text-xs text-slate-600 list-decimal list-inside leading-snug">
              {community.rules ? (
                community.rules.map((rule, idx) => <li key={idx}>{rule}</li>)
              ) : (
                <>
                  <li>Be respectful and kind</li>
                  <li>No spam or self-promotion</li>
                  <li>Search before posting</li>
                  <li>Use proper tags</li>
                </>
              )}
            </ol>
            <button className="text-xs font-bold text-indigo-600 hover:underline pt-1 inline-block">
              View all rules →
            </button>
          </div>

          {/* Top Contributors Card */}
          {community.topContributors && community.topContributors.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900">Top Contributors</h3>
                <span className="text-[10px] font-semibold text-slate-400">All-time</span>
              </div>
              <div className="space-y-2.5">
                {community.topContributors.map((tc, idx) => (
                  <div
                    key={tc.user.id}
                    onClick={() => onOpenProfile(tc.user)}
                    className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <SafeAvatar
                        src={tc.user.avatar}
                        name={tc.user.name}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-800">{tc.user.name}</p>
                        <p className="text-[10px] text-slate-400">{tc.points} points</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-black ${tc.badge === 'gold' ? 'text-amber-700' : tc.badge === 'silver' ? 'text-slate-500' : 'text-orange-700'}`}>
                      {tc.badge === 'gold' ? '1st' : tc.badge === 'silver' ? '2nd' : '3rd'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
      )}

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

      {shareOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setShareOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="community-share-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">Invite your people</p>
                <h2 id="community-share-title" className="mt-1 text-xl font-black text-slate-900">
                  Share {community.displayName || community.name}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Send this community to a friend on The Network or share it through any app.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShareOpen(false)}
                aria-label="Close share dialog"
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500">Community link</p>
              <p className="mt-1 break-all text-xs font-semibold leading-relaxed text-slate-700">{communityShareUrl}</p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(communityShareText)}`, '_blank', 'noopener,noreferrer')}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-3 py-3 text-sm font-bold text-white transition-colors hover:bg-[#20bc5a]"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </button>
              <button
                type="button"
                onClick={shareCommunityWithDevice}
                className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-700"
              >
                <Share2 className="h-4 w-4" /> More apps
              </button>
              <button
                type="button"
                onClick={copyCommunityLink}
                className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
              >
                {shareCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <ExternalLink className="h-4 w-4" />}
                {shareCopied ? 'Link copied' : 'Copy link'}
              </button>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Send in The Network</h3>
                  <p className="mt-0.5 text-[11px] text-slate-500">Choose a direct chat to send the link.</p>
                </div>
                <MessageSquare className="h-5 w-5 text-indigo-500" />
              </div>

              {directConversations.length > 0 ? (
                <div className="mt-3 max-h-52 space-y-1.5 overflow-y-auto">
                  {directConversations.slice(0, 12).map((conversation) => (
                    <div key={conversation.id} className="flex items-center gap-2.5 rounded-xl border border-slate-100 px-2.5 py-2">
                      <SafeAvatar src={conversation.avatar} name={conversation.title || 'Network member'} className="h-8 w-8 shrink-0 rounded-full object-cover" />
                      <p className="min-w-0 flex-1 truncate text-xs font-bold text-slate-800">{conversation.title}</p>
                      <button
                        type="button"
                        disabled={sendingToConversationId === conversation.id}
                        onClick={() => sendCommunityToConversation(conversation)}
                        className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
                          sentToConversationId === conversation.id
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50'
                        }`}
                      >
                        {sendingToConversationId === conversation.id
                          ? 'Sending…'
                          : sentToConversationId === conversation.id
                            ? 'Sent ✓'
                            : 'Send'}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-500">
                  Start a direct chat first, then this community will appear as a share option here.
                </p>
              )}
              {shareError && <p className="mt-2 text-xs font-semibold text-rose-600">{shareError}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
