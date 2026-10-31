export interface UserProfile {
  id: string;
  fullName: string;
  college: string;
  schoolName?: string;
  coachingName?: string;
  location?: string;
  branch: string;
  degree: string;
  academicStream?: string;
  programGroup?: string;
  fields?: string[];
  year: number; // 1 to 4 or 5
  email: string;
  avatar: string;
  coverImage?: string | null;
  aboutMe: string;
  interests: string[];
  skills: string[];
  lookingFor: string[];
  connectPreference?: string | null;
  isVerified: boolean;
  isSuspended: boolean;
  role: 'student' | 'admin' | 'college_admin';
  collegeAdminOf?: string | null;
  privacySettings: {
    showEmail: boolean;
    onlyAllowVerifiedConnections: boolean;
    hideProfileFromSearch: boolean;
  };
  createdAt: string;
}

export interface CollegeAnnouncement {
  id: string;
  college: string;
  authorId: string;
  title: string;
  body: string;
  isPinned: boolean;
  createdAt: string;
}

export interface Post {
  id: string;
  authorId: string;
  isAnonymous?: boolean;
  content: string;
  likes: string[]; // List of user IDs who liked
  votes?: Record<string, 1 | -1>;
  comments: Comment[];
  communityId?: string; // Optional indicator of community post
  createdAt: string;
  academicTag?: string; // e.g. "Placement Prep", "Research Partner"
  projectTitle?: string; // e.g. "EcoDrone Seed Pitch"
  postImage?: string; // optional startup attachment image URL
  postImages?: string[]; // optional gallery attachment image URLs
  feeling?: string; // optional feeling status representing "how they are feeling / doing"
  websiteUrl?: string | null;
  tags?: string[];
  attachment?: {
    name: string;
    mimeType?: string | null;
    url: string;
  } | null;
  pollOptions?: string[] | null;
  pollVotes?: Record<string, number> | null;
  resharedFromId?: string | null;
}

export interface Story {
  id: string;
  authorId: string;
  image?: string;
  content: string;
  createdAt: string;
  viewedBy: string[];
  reactions?: { [emoji: string]: number };
  likes: string[];
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  isAnonymous?: boolean;
  replyToId?: string | null;
  content: string;
  createdAt: string;
}

export interface Connection {
  id: string;
  senderId: string;
  receiverId: string;
  type: 'Startup Discussion' | 'Friendship' | 'Study Partner' | 'Hackathon Team';
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface DirectMessage {
  id: string;
  clientMessageId?: string | null;
  senderId: string;
  receiverId: string;
  content: string;
  attachmentName?: string | null;
  attachmentData?: string | null;
  attachmentMimeType?: string | null;
  pollOptions?: string[] | null;
  pollVotes?: Record<string, number> | null;
  replyToId?: string | null;
  reactions?: Record<string, string[]> | null;
  createdAt: string;
  isRead: boolean;
  isAnonymous?: boolean;
  anonymousPostId?: string | null;
  unreadCount?: number;
}

export interface CommunityPoll {
  id: string;
  question: string;
  options: string[];
  votes: Record<string, number>; // userId → option index
  authorId: string;
  createdAt: string;
  endsAt?: string | null;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon identifier
  memberIds: string[];
  adminIds?: string[];
  blockedMemberIds?: string[];
  tags: string[];
  category: string; // Engineering, Startups, Medical, Management, etc.
  threads?: DiscussionThread[];
  resources?: ResourceItem[];
  polls?: CommunityPoll[];
  college?: string | null;  // null = campus-wide; set = college-specific club
  creatorId?: string | null;
}

export interface DiscussionThread {
  id: string;
  title: string;
  content: string;
  authorId: string;
  createdAt: string;
  replies: DiscussionReply[];
}

export interface DiscussionReply {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface ResourceItem {
  id: string;
  title: string;
  link: string;
  description: string;
  authorId: string;
  createdAt: string;
}

export interface UserReport {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reason: string;
  description: string;
  createdAt: string;
  status: 'pending' | 'suspended' | 'dismissed';
}

export interface CampusEvent {
  id: string;
  title: string;
  description: string;
  category: string;
  date: string;
  time: string;
  venue: string;
  organizer: string;
  organizerId: string;
  college: string;
  registeredIds: string[];
  maxSeats?: number | null;
  isOnline: boolean;
  link: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  actorId: string;
  type:
    | 'like'
    | 'comment'
    | 'mention'
    | 'poll'
    | 'connection_request'
    | 'connection_accepted'
    | 'message'
    | 'group_message'
    | 'community_message'
    | 'community_post'
    | 'project_message'
    | 'group_invite'
    | 'announcement'
    | 'community_invite'
    | 'community_member_joined'
    | 'profile_view'
    | 'find_people_apply'
    | 'find_people_accept'
    | 'find_people_accepted';
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export type CircleType = 'college' | 'batch' | 'branch' | 'course' | 'exam' | 'interest';
export type GroupChatPurpose = 'study' | 'chat';
export type GroupChatVisibility = 'public' | 'private';

export interface GroupChat {
  id: string;
  name: string;
  type: CircleType;
  creatorId: string;
  college: string;
  branch?: string | null;
  communityId?: string | null;
  description?: string;
  purpose?: GroupChatPurpose;
  visibility?: GroupChatVisibility;
  memberCount?: number;
  isMember?: boolean;
  memberIds: string[];
  pendingIds: string[];
  createdAt: string;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  content: string;
  attachmentName?: string | null;
  attachmentData?: string | null;
  attachmentMimeType?: string | null;
  pollOptions?: string[] | null;
  pollVotes?: Record<string, number> | null;
  replyToId?: string | null;
  reactions?: Record<string, string[]> | null;
  createdAt: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  stage: 'Idea' | 'Building' | 'MVP' | 'Launched';
  tags: string[];
  lookingFor: string[];
  memberIds: string[];
  createdAt: string;
}
