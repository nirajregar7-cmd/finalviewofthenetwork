export type NavTab = 'home' | 'communities' | 'anonymous' | 'connect' | 'compete' | 'learn' | 'chats' | 'admin';

export interface UserProject {
  title: string;
  description: string;
  githubLink?: string;
  tags: string[];
}

export interface User {
  id: string;
  name: string;
  role?: 'student' | 'admin' | 'college_admin';
  createdAt?: string;
  avatar: string;
  hasProfilePhoto?: boolean;
  college: string;
  schoolName?: string;
  coachingName?: string;
  branch: string;
  degree?: string;
  academicStream?: string;
  programGroup?: string;
  fields?: string[];
  academicCategory?: string;
  year?: string;
  verified: boolean;
  verifiedCollege?: string;
  verifiedAt?: string;
  bio?: string;
  location?: string;
  interests: string[];
  skills: string[];
  communities: string[]; // slugs
  goals?: string[];
  connectPreference?: string | null;
  matchScore?: number;
  mutualCommunitiesCount?: number;
  mutualCommunityIcons?: string[];
  connectionsCount?: number;
  projects?: UserProject[];
  stats?: {
    postsCount: number;
    connectionsCount: number;
    points: number;
    rank?: string;
    helpedCount?: number;
    rating?: number;
  };
  mentorInfo?: {
    isMentor: boolean;
    rating: number;
    studentsHelped: number;
    price: string; // "Free" | "₹200/session"
    speciality: string;
    companyOrRole: string;
  };
  availableFor?: {
    hackathons: boolean;
    projects: boolean;
    studyPartner: boolean;
    startup: boolean;
    networking: boolean;
  } | string[];
  isOnline?: boolean;
  isConnected?: boolean;
  connectionPending?: boolean;
  incomingConnectionPending?: boolean;
  outgoingConnectionPending?: boolean;
}

export interface Community {
  id: string;
  slug: string; // e.g. "/dsa"
  name: string;
  displayName: string;
  iconType?: 'code' | 'brain' | 'book' | 'rocket' | 'building' | 'briefcase' | 'trophy' | 'users';
  iconBg: string;
  iconColor?: string;
  description: string;
  tags?: string[];
  memberIds?: string[];
  creatorId?: string | null;
  adminIds?: string[];
  blockedMemberIds?: string[];
  membersCount: number;
  onlineCount: number;
  category: 'interest' | 'college' | 'career';
  isJoined: boolean;
  isAdmin?: boolean;
  isBlocked?: boolean;
  isSaved?: boolean;
  rules?: string[];
  createdDate?: string;
  topContributors?: {
    user: User;
    points: number;
    badge: 'gold' | 'silver' | 'bronze';
  }[];
  relatedSlugs?: string[];
}

export interface PostComment {
  id: string;
  author: User;
  isAnonymous?: boolean;
  replyToId?: string | null;
  content: string;
  timestamp: string;
  upvotes: number;
  votes?: Record<string, 1 | -1>;
  userVote?: 1 | -1 | null;
}

export interface Post {
  id: string;
  author: User;
  isAnonymous?: boolean;
  communitySlug: string;
  communityName?: string;
  timestamp: string;
  type: 'post' | 'question' | 'hackathon' | 'project' | 'resource' | 'collab';
  title: string;
  content: string;
  websiteUrl?: string | null;
  postImage?: string | null;
  postImages?: string[] | null;
  tags?: string[];
  upvotes: number;
  votes?: Record<string, 1 | -1>;
  userVote?: 1 | -1 | null;
  commentsCount: number;
  comments: PostComment[];
  saved: boolean;
  liked?: boolean;
  likesCount?: number;
  prizePool?: string;
  teamSize?: string;
  deadline?: string;
  attachment?: {
    name: string;
    size: string;
    type?: string;
    url?: string;
  };
  githubRepo?: string;
  pollData?: {
    question: string;
    options: {
      id: string;
      text: string;
      votes: number;
      voters?: { id: string; name: string; avatar?: string }[];
    }[];
    totalVotes: number;
    userVotedOptionId?: string;
  };
  resharedFromId?: string | null;
}

export interface Opportunity {
  id: string;
  title: string;
  category: 'Hackathon' | 'Internship' | 'Competition' | 'Scholarship' | 'Research' | 'Campus';
  categoryColor?: string;
  description: string;
  tags: string[];
  prizeOrStipend: string;
  teamSize?: string;
  daysLeft: number;
  deadlineDate?: string;
  imageUrl?: string;
  thumbnail?: string;
  location?: string;
  applyLink?: string;
  isSaved?: boolean;
  collegeRestricted?: string;
  requirements?: string[];
}

export interface RoadmapStep {
  id: string;
  title: string;
  description?: string;
  status: 'completed' | 'in_progress' | 'locked';
  items: {
    id: string;
    title: string;
    status: 'completed' | 'in_progress' | 'not_started';
  }[];
}

export interface LearningTopic {
  id: string;
  slug: string;
  name: string;
  summaryPath: string;
  icon: string;
  category: string;
  progressPercent: number;
  studentsLearningCount: number;
  steps: RoadmapStep[];
  resources: {
    notesCount: number;
    videosCount: number;
    practiceCount: number;
    projectsCount: number;
  };
  opportunities: Opportunity[];
}

export interface ChatMessage {
  id: string;
  clientMessageId?: string | null;
  chatId?: string;
  senderId: string;
  senderName?: string;
  text: string;
  timestamp: string;
  createdAt?: string;
  read?: boolean;
  seenBy?: Array<{ id: string; name: string }>;
  replyToId?: string | null;
  attachmentName?: string | null;
  attachmentData?: string | null;
  attachmentMimeType?: string | null;
  sharedPost?: SharedPostPreview | null;
  reactions?: {
    emoji: string;
    count: number;
    users: string[];
  }[];
}

export interface SharedPostPreview {
  id: string;
  title: string;
  content: string;
  authorName: string;
  authorAvatar?: string | null;
  communitySlug?: string | null;
  communityName?: string | null;
  imageUrl?: string | null;
}

export interface ChatConversation {
  id: string;
  type: 'direct' | 'community' | 'study_group';
  groupId?: string;
  creatorId?: string;
  visibility?: 'public' | 'private';
  memberIds?: string[];
  isInvitePending?: boolean;
  title?: string;
  subtitle?: string;
  avatar?: string;
  online?: boolean;
  verified?: boolean;
  participant?: User;
  communitySlug?: string;
  communityName?: string;
  communityIcon?: string;
  communityIconBg?: string;
  lastMessage: string;
  lastMessageTime?: string;
  lastTimestamp?: string;
  lastMessageId?: string;
  unreadCount: number;
  messages: ChatMessage[];
  anonymousPostId?: string;
  anonymousTargetId?: string;
}

export interface NotificationItem {
  id: string;
  type:
    | 'reply'
    | 'upvote'
    | 'mention'
    | 'connection_request'
    | 'connection_accepted'
    | 'community'
    | 'community_post'
     | 'poll'
    | 'community_invite'
    | 'community_member_joined'
    | 'group_invite'
    | 'group_message'
    | 'project_message'
    | 'profile_view'
    | 'announcement'
    | 'hackathon'
    | 'mentor'
    | 'message';
  title: string;
  subtitle: string;
  timestamp: string;
  unread: boolean;
  avatar?: string;
  badgeIcon?: string;
  targetId?: string;
  actorId?: string;
  communityId?: string;
  groupId?: string;
  projectId?: string;
  postId?: string;
  user?: User;
}
