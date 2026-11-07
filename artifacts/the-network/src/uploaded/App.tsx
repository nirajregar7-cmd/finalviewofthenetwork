import React, { useCallback, useEffect, useState, useRef } from 'react';
import './signedIn.css';
import { NavTab, User, Community, Post, Opportunity, LearningTopic, ChatConversation, ChatMessage, NotificationItem } from './types';
import {
  MOCK_COMMUNITIES,
  MOCK_POSTS,
  MOCK_OPPORTUNITIES,
  MOCK_LEARNING_TOPIC,
  MOCK_CHATS,
  MOCK_NOTIFICATIONS,
} from './data/mockData';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { HomeFeed } from './components/HomeFeed';
import { AnonymousCampusView } from './components/AnonymousCampusView';
import { CommunitiesView } from './components/CommunitiesView';
import { CommunityDetailView } from './components/CommunityDetailView';
import { ConnectView } from './components/ConnectView';
import CompeteView from './components/CompeteView';
import { ExamCompeteView } from './components/ExamCompeteView';
import { LearnView } from './components/LearnView';
import { MySpaceView } from './components/MySpaceView';
import { ChatsView } from './components/ChatsView';
import { ProfileModal } from './components/ProfileModal';
import { OpportunityDetailModal } from './components/OpportunityDetailModal';
import { CreatePostModal } from './components/CreatePostModal';
import { RecommendRoadmapModal } from './components/RecommendRoadmapModal';
import { BookMentorModal } from './components/BookMentorModal';
import InviteSheet from './components/InviteSheet';
import StudentStarterTour from './components/StudentStarterTour';
import AdminSection from '../components/AdminSection';
import { InstallAppButton } from './components/InstallAppButton';
import { api } from '../api';
import { getChatSocket } from './chatSocket';
import type {
  UserProfile,
  UserReport,
  Post as CorePost,
  Community as CoreCommunity,
  Connection as CoreConnection,
  Project as CoreProject,
  CampusEvent as CoreCampusEvent,
  GroupChat as CoreGroupChat,
} from '../types';
import {
  updateOfflineFeedSnapshot,
  updateOfflineScreenSnapshot,
  type OfflineScreenSnapshot,
  type OfflineScreenSnapshotUpdate,
} from '../offlineSnapshot';
import {
  slugFor,
  toUploadedCommunity,
  toUploadedConversations,
  toUploadedNotifications,
  toUploadedOpportunity,
  toUploadedPost,
  toUploadedUser,
  ensureDirectConversation,
  anonymousUserFor,
  normalizeChatReactions,
  mergeDirectConversationRefresh,
} from './liveAdapter';
import {
  HOME_FEED_PAGE_SIZE,
  mergeHomeFeedPosts,
  type HomeFeedFilter,
} from './homeFeed';
import { isExamFocusedStudent } from './examMode';
import {
  compareConversationsByLatestActivity,
  isChatActivityAtOrAfterLatest,
  latestChatActivityTimestamp,
  sortChatMessagesChronologically,
} from './chatOrdering';

interface UploadedAppProps {
  authenticatedUser: UserProfile;
  offlineSnapshot?: OfflineScreenSnapshot | null;
  onLogout: () => void;
  openOwnProfileRequest?: number;
  pushNavigationRequest?: {
    view: string;
    targetId?: string;
    requestId: number;
  };
}

export function getInitialUploadedTab(pathname: string, search: string): NavTab {
  const params = new URLSearchParams(search);
  const initialView = params.get('view');
  const initialGroupId = params.get('groupId');
  const initialCommunityId = params.get('communityId') || params.get('community');
  const hasCommunityPath = /^\/community\/[^/]+\/?$/i.test(pathname);

  if (pathname === '/anonymous/community') return 'anonymous';
  if (initialView === 'messages' || initialGroupId) return 'chats';
  if (initialView === 'communities') return 'communities';
  if (initialView === 'compete') return 'compete';
  if (initialView === 'workshops') return 'workshops';
  if (hasCommunityPath || initialCommunityId) return 'communities';
  return 'home';
}

function relativeTimeForUploaded(value?: string): string {
  if (!value) return 'Recently';
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return value;
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function uploadedChatMessage(message: any, usersById: Record<string, User>): ChatMessage {
  return {
    id: message.id,
    clientMessageId: message.clientMessageId,
    senderId: message.senderId,
    senderName: message.isAnonymous
      ? 'Anonymous person'
      : usersById[message.senderId]?.name || 'Network member',
    text: message.content || '',
    timestamp: relativeTimeForUploaded(message.createdAt),
    createdAt: message.createdAt,
    read: Boolean(message.isRead),
    seenBy: Array.isArray(message.seenBy) ? message.seenBy : [],
    replyToId: message.replyToId ?? null,
    attachmentName: message.attachmentName,
    attachmentData: message.attachmentData,
    attachmentMimeType: message.attachmentMimeType,
    sharedPost: message.sharedPost ?? null,
    reactions: normalizeChatReactions(message.reactions),
  };
}

function uploadedChatPreview(message: any): string {
  return message?.content || (
    message?.attachmentMimeType?.startsWith('image/')
      ? 'Photo'
      : message?.attachmentName || (message?.attachmentData ? 'Attachment' : 'No messages yet')
  );
}

function mergeChatConversationSnapshots(
  previous: ChatConversation[],
  incoming: ChatConversation[],
): ChatConversation[] {
  const byId = new Map(previous.map((conversation) => [conversation.id, conversation]));

  for (const conversation of incoming) {
    const existing = byId.get(conversation.id);
    if (!existing) {
      byId.set(conversation.id, conversation);
      continue;
    }

    const messagesByIdentity = new Map<string, ChatMessage>();
    for (const message of existing.messages) {
      messagesByIdentity.set(message.clientMessageId || message.id, message);
    }
    for (const message of conversation.messages) {
      messagesByIdentity.set(message.clientMessageId || message.id, message);
    }

    const existingActivity = latestChatActivityTimestamp(existing);
    const incomingActivity = latestChatActivityTimestamp(conversation);
    const preserveExistingLatest = existingActivity > incomingActivity ||
      (existingActivity === incomingActivity &&
        Boolean(existing.lastMessageId && conversation.lastMessageId) &&
        String(existing.lastMessageId).localeCompare(String(conversation.lastMessageId)) > 0);
    const latest = preserveExistingLatest ? existing : conversation;

    byId.set(conversation.id, {
      ...existing,
      ...conversation,
      lastMessage: latest.lastMessage,
      lastMessageTime: latest.lastMessageTime,
      lastTimestamp: latest.lastTimestamp,
      lastMessageId: latest.lastMessageId,
      unreadCount: Math.max(existing.unreadCount, conversation.unreadCount),
      messages: sortChatMessagesChronologically(Array.from(messagesByIdentity.values())),
    });
  }

  return Array.from(byId.values()).sort(compareConversationsByLatestActivity);
}

function applyConnectionFlags(
  userMap: Record<string, User>,
  rawConnections: CoreConnection[],
  currentUserId: string,
): Record<string, User> {
  const nextUsers = Object.fromEntries(
    Object.entries(userMap).map(([id, user]) => [
      id,
      {
        ...user,
        isConnected: false,
        connectionPending: false,
        incomingConnectionPending: false,
        outgoingConnectionPending: false,
      },
    ]),
  ) as Record<string, User>;

  rawConnections.forEach((connection) => {
    const otherUserId =
      connection.senderId === currentUserId
        ? connection.receiverId
        : connection.receiverId === currentUserId
          ? connection.senderId
          : null;
    if (!otherUserId || !nextUsers[otherUserId]) return;

    if (connection.status === 'accepted') {
      nextUsers[otherUserId] = {
        ...nextUsers[otherUserId],
        isConnected: true,
        connectionPending: false,
      };
    } else if (connection.status === 'pending') {
      const isOutgoing = connection.senderId === currentUserId;
      nextUsers[otherUserId] = {
        ...nextUsers[otherUserId],
        connectionPending: isOutgoing,
        incomingConnectionPending: !isOutgoing,
        outgoingConnectionPending: isOutgoing,
      };
    }
  });

  return nextUsers;
}

function createOfflineFeedSeed(
  snapshot: OfflineScreenSnapshot | null | undefined,
  authenticatedUser: UserProfile,
): {
  users: Record<string, User>;
  posts: Post[];
  communities: Community[];
  connections: CoreConnection[];
  opportunities: Opportunity[];
  notifications: NotificationItem[];
} | null {
  if (!snapshot || snapshot.userId !== authenticatedUser.id) return null;

  const cachedUsers = Object.fromEntries(
    snapshot.users.map((profile) => [profile.id, toUploadedUser(profile)]),
  ) as Record<string, User>;
  cachedUsers[authenticatedUser.id] = toUploadedUser(authenticatedUser);
  const connections = snapshot.connections ?? [];
  const users = applyConnectionFlags(cachedUsers, connections, authenticatedUser.id);
  const savedCommunityIds = new Set(snapshot.savedCommunityIds ?? []);
  const communities = (snapshot.communities ?? []).map((community) => ({
    ...toUploadedCommunity(community, authenticatedUser.id, authenticatedUser.role),
    isSaved: savedCommunityIds.has(community.id),
  }));
  const communityMap = Object.fromEntries(communities.map((community) => [community.id, community]));
  const cachedFeedPosts = snapshot.homeFeeds?.['looking-for'] ?? snapshot.posts;
  const posts = cachedFeedPosts.map((post) => ({
    ...toUploadedPost(post, users, communityMap, authenticatedUser.id),
    saved: (snapshot.savedPostIds ?? []).includes(post.id),
  }));
  return {
    users,
    posts,
    communities,
    connections,
    opportunities: snapshot.opportunities ?? MOCK_OPPORTUNITIES,
    notifications: snapshot.notifications ?? [],
  };
}

function applyOnlinePresence(
  userMap: Record<string, User>,
  communityList: Community[],
  onlineUserIds: string[],
  currentUserId: string,
): { users: Record<string, User>; communities: Community[] } {
  const activeIds = new Set([...onlineUserIds, currentUserId]);
  const users = Object.fromEntries(
    Object.entries(userMap).map(([id, user]) => [id, { ...user, isOnline: activeIds.has(id) }]),
  ) as Record<string, User>;
  const communities = communityList.map((community) => ({
    ...community,
    onlineCount: (community.memberIds || []).filter((memberId) => activeIds.has(memberId)).length,
  }));
  return { users, communities };
}

function createLiveUserMap(
  profiles: UserProfile[],
  rawCommunities: CoreCommunity[],
  rawConnections: CoreConnection[],
  rawProjects: CoreProject[],
): Record<string, User> {
  return Object.fromEntries(profiles.map((profile) => {
    const uploaded = toUploadedUser(profile);
    const communitySlugs = rawCommunities
      .filter((community) => Array.isArray(community.memberIds) && community.memberIds.includes(profile.id))
      .map((community) => slugFor(community.name));
    const userProjects = rawProjects
      .filter((project) =>
        project.creatorId === profile.id ||
        (Array.isArray(project.memberIds) && project.memberIds.includes(profile.id)),
      )
      .map((project) => ({
        title: project.title,
        description: project.description,
        tags: Array.isArray(project.tags) ? project.tags : [],
      }));
    const connectionsCount = rawConnections.filter((connection) =>
      connection.status === 'accepted' &&
      (connection.senderId === profile.id || connection.receiverId === profile.id),
    ).length;

    return [profile.id, {
      ...uploaded,
      communities: communitySlugs,
      connectionsCount,
      projects: userProjects,
      stats: {
        ...uploaded.stats,
        connectionsCount,
      },
    }];
  }));
}

function normalizeCommunitySlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function communityMatchesSlug(community: Community, requestedSlug: string): boolean {
  const canonical = normalizeCommunitySlug(community.name);
  const requested = normalizeCommunitySlug(requestedSlug);
  if (canonical === requested || community.slug === `/${requested}`) return true;
  const compactCanonical = canonical.replace(/-/g, '');
  const compactRequested = requested.replace(/-/g, '');
  return compactCanonical.length >= 4 && compactRequested.startsWith(compactCanonical);
}

export const App: React.FC<UploadedAppProps> = ({
  authenticatedUser,
  offlineSnapshot,
  onLogout,
  openOwnProfileRequest = 0,
  pushNavigationRequest,
}) => {
  const authenticatedAs = toUploadedUser(authenticatedUser);
  const persistCompetitionListings = useCallback((competitions: unknown[]) => {
    void updateOfflineScreenSnapshot({
      userId: authenticatedUser.id,
      currentUser: authenticatedUser,
      competitions,
    });
  }, [authenticatedUser]);
  const [offlineFeedSeed] = useState(() =>
    createOfflineFeedSeed(offlineSnapshot, authenticatedUser),
  );
  const anonymousPath = '/anonymous/community';

  // Navigation & View States
  const initialUrlParams = new URLSearchParams(window.location.search);
  const initialUserId = initialUrlParams.get('userId');
  const initialGroupId = initialUrlParams.get('groupId');
  const initialCommunityId = initialUrlParams.get('communityId') || initialUrlParams.get('community');
  const initialPostId = initialUrlParams.get('postId');
  const initialCommunityQuery = initialUrlParams.get('community');
  const communityPathMatch = window.location.pathname.match(/^\/community\/([^/]+)\/?$/i);
  const initialCommunitySlug = communityPathMatch
    ? `/${decodeURIComponent(communityPathMatch[1]).replace(/^\/+/, '')}`
    : initialCommunityQuery
      ? `/${decodeURIComponent(initialCommunityQuery).replace(/^\/+/, '')}`
      : null;
  const initialConversationId = initialUserId
    ? `direct-${initialUserId}`
    : initialGroupId
      ? `study-${initialGroupId}`
    : initialCommunityId
      ? `community-${initialCommunityId}`
      : undefined;
  const [activeTab, setActiveTab] = useState<NavTab>(() =>
    getInitialUploadedTab(window.location.pathname, window.location.search),
  );
  const [selectedCommunitySlug, setSelectedCommunitySlug] = useState<string | null>(initialCommunitySlug);
  const [requestedConversationId, setRequestedConversationId] = useState<string | undefined>(initialConversationId);
  const [sharedGroupMessage, setSharedGroupMessage] = useState<string | null>(null);
  const handledSharedGroupIdRef = useRef<string | null>(null);

  // App Data States
  const [currentUser, setCurrentUser] = useState<User>(authenticatedAs);
  const examFocusedStudent = isExamFocusedStudent(currentUser);
  const [users, setUsers] = useState<Record<string, User>>(
    () => offlineFeedSeed?.users ?? { [authenticatedAs.id]: authenticatedAs },
  );
  const [communities, setCommunities] = useState<Community[]>(() => offlineFeedSeed?.communities ?? []);
  const [posts, setPosts] = useState<Post[]>(() => offlineFeedSeed?.posts ?? []);
  const [homeFeedFilter, setHomeFeedFilter] = useState<HomeFeedFilter>('looking-for');
  const [homeFeedPosts, setHomeFeedPosts] = useState<Post[]>(() => offlineFeedSeed?.posts ?? []);
  const [homeFeedLoading, setHomeFeedLoading] = useState(
    () => !offlineFeedSeed?.posts.length,
  );
  const [homeFeedLoadingMore, setHomeFeedLoadingMore] = useState(false);
  const [homeFeedError, setHomeFeedError] = useState<string | null>(null);
  const [homeFeedLoadMoreError, setHomeFeedLoadMoreError] = useState<string | null>(null);
  const [homeFeedHasMore, setHomeFeedHasMore] = useState(false);
  const [homeFeedOffset, setHomeFeedOffset] = useState(0);
  const [competeInitialTab, setCompeteInitialTab] = useState<'overview' | 'college-challenge'>('overview');
  const [networkDataReady, setNetworkDataReady] = useState(() => Boolean(offlineFeedSeed));
  const [initialHomeFeedBootstrapDone, setInitialHomeFeedBootstrapDone] = useState(
    () => authenticatedUser.role === 'admin',
  );
  const homeFeedRequestRef = useRef(0);
  const initialHomeFeedRequestPendingRef = useRef(authenticatedUser.role !== 'admin');
  const initialHomeFeedLoadedRef = useRef(false);
  const homeFeedEffectStartedRef = useRef(false);
  const profileSnapshotRef = useRef<UserProfile[]>(offlineSnapshot?.users ?? []);
  const freshReadOnlyFieldsRef = useRef({
    users: false,
    communities: false,
    posts: false,
    connections: false,
    opportunities: false,
    notifications: false,
    saved: false,
  });
  const hydratedOfflineSnapshotAtRef = useRef<number | null>(offlineSnapshot?.savedAt ?? null);
  const [connections, setConnections] = useState<CoreConnection[]>(() => offlineFeedSeed?.connections ?? []);
  const [opportunities, setOpportunities] = useState<Opportunity[]>(
    () => offlineFeedSeed?.opportunities ?? MOCK_OPPORTUNITIES,
  );
  const [learningTopic, setLearningTopic] = useState<LearningTopic>(MOCK_LEARNING_TOPIC);
  const [requestedChatTab, setRequestedChatTab] = useState<'direct' | 'communities' | 'study_groups'>('direct');
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const conversationsRef = useRef<ChatConversation[]>([]);
  const [activeChatConversationId, setActiveChatConversationId] = useState<string | null>(null);
  const activeChatConversationIdRef = useRef<string | null>(null);
  const latestDirectMessageAtRef = useRef<string | null>(null);
  const directHistoryLoadedRef = useRef(new Set<string>());
  const directHistoryLoadingRef = useRef(new Set<string>());
  const [directChatsReady, setDirectChatsReady] = useState(false);
  const [chatBootstrapReady, setChatBootstrapReady] = useState(false);
  const chatPreviewRequestsRef = useRef(new Set<string>());
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    () => offlineFeedSeed?.notifications ?? [],
  );

  useEffect(() => {
    const unreadByConversation = new Map<string, number>();
    for (const notification of notifications) {
      if (!notification.unread) continue;
      const conversationId = notification.groupId && notification.type === 'group_message'
        ? `study-${notification.groupId}`
        : notification.communityId && (notification.type === 'community' || notification.type === 'mention')
          ? `community-${notification.communityId}`
          : null;
      if (conversationId) {
        unreadByConversation.set(
          conversationId,
          (unreadByConversation.get(conversationId) || 0) + 1,
        );
      }
    }
    setConversations((previous) => previous.map((conversation) => {
      if (conversation.type === 'direct') return conversation;
      const unreadCount = unreadByConversation.get(conversation.id) || 0;
      return conversation.unreadCount === unreadCount
        ? conversation
        : { ...conversation, unreadCount };
    }));
  }, [notifications]);

  useEffect(() => {
    if (activeTab === 'chats') return;
    activeChatConversationIdRef.current = null;
    setActiveChatConversationId(null);
  }, [activeTab]);
  const [notificationFocus, setNotificationFocus] = useState<{
    postId: string;
    reply: boolean;
  } | null>(() => initialPostId
    ? { postId: initialPostId, reply: initialUrlParams.get('focus') === 'comment' }
    : null);
  const [communityQuizOpenRequest, setCommunityQuizOpenRequest] = useState(0);
  const [adminUsers, setAdminUsers] = useState<UserProfile[]>([]);
  const [adminReports, setAdminReports] = useState<UserReport[]>([]);
  const [adminPosts, setAdminPosts] = useState<CorePost[]>([]);
  const [adminCommunities, setAdminCommunities] = useState<CoreCommunity[]>([]);

  useEffect(() => {
    if (!pushNavigationRequest) return;
    if (pushNavigationRequest.view === 'messages') {
      setRequestedConversationId(
        pushNavigationRequest.targetId
          ? `direct-${pushNavigationRequest.targetId}`
          : undefined,
      );
      setSelectedCommunitySlug(null);
      setActiveTab('chats');
      return;
    }
    if (pushNavigationRequest.view === 'communities') {
      setSelectedCommunitySlug(
        pushNavigationRequest.targetId
          ? `/${pushNavigationRequest.targetId.replace(/^\/+/, '')}`
          : null,
      );
      setActiveTab('communities');
      return;
    }
    const requestedTab = pushNavigationRequest.view as NavTab;
    setActiveTab(requestedTab);
  }, [pushNavigationRequest]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    if (!initialCommunityId || selectedCommunitySlug) return;
    const target = communities.find((community) => community.id === initialCommunityId);
    if (target) setSelectedCommunitySlug(target.slug);
  }, [communities, initialCommunityId, selectedCommunitySlug]);

  const [isChatKeyboardOpen, setIsChatKeyboardOpen] = useState(false);
  const [isCommunityChatActive, setIsCommunityChatActive] = useState(false);
  const pendingConnectionUsersRef = useRef(new Set<string>());
  const connectionsRef = useRef<CoreConnection[]>([]);
  const lastNetworkRefreshRef = useRef(0);
  const sendLockRef = useRef<string | null>(null);

  // Modals & Overlays
  const [activeProfileUser, setActiveProfileUser] = useState<User | null>(null);
  const [activeOpportunity, setActiveOpportunity] = useState<Opportunity | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [initialCreateMode, setInitialCreateMode] = useState<'post' | 'community'>('post');
  const [initialRequestType, setInitialRequestType] = useState<string | undefined>();
  const [initialDraftCommunitySlug, setInitialDraftCommunitySlug] = useState<string | undefined>();
  const [initialPostTitle, setInitialPostTitle] = useState<string | undefined>();
  const [initialPostContent, setInitialPostContent] = useState<string | undefined>();
  const [isRecommendModalOpen, setIsRecommendModalOpen] = useState(false);
  const [activeMentorBooking, setActiveMentorBooking] = useState<User | null>(null);
  const [inviteSheet, setInviteSheet] = useState<{
    community?: Community;
    onCancel?: () => void;
    onContinue?: () => void;
  } | null>(null);

  useEffect(() => {
    setCurrentUser(authenticatedAs);
    setUsers((prev) => ({ ...prev, [authenticatedAs.id]: authenticatedAs }));
  }, [authenticatedUser.id, authenticatedUser.fullName, authenticatedUser.avatar]);

  useEffect(() => {
    const handleBrowserNavigation = () => {
      if (window.location.pathname === anonymousPath) {
        setSelectedCommunitySlug(null);
        setIsCreateModalOpen(false);
        setInitialRequestType(undefined);
        setActiveTab('anonymous');
      }
    };

    window.addEventListener('popstate', handleBrowserNavigation);
    handleBrowserNavigation();
    return () => window.removeEventListener('popstate', handleBrowserNavigation);
  }, []);

  // A notification can be tapped while this tab is already open. Route that
  // live message into the active mobile shell without requiring a reload.
  useEffect(() => {
    const handlePushNavigation = (event: MessageEvent) => {
      const data = event.data;
      if (data?.type !== 'SW_NAVIGATE') return;
      if (data.view === 'messages') {
        const conversationId = data.userId
          ? `direct-${data.userId}`
          : data.groupId
            ? `study-${data.groupId}`
            : data.communityId
              ? `community-${data.communityId}`
              : data.anonymousPostId
                ? `anonymous-post-${data.anonymousPostId}`
                : undefined;
        if (conversationId) setRequestedConversationId(conversationId);
        setActiveTab('chats');
        setSelectedCommunitySlug(null);
        if (data.groupId) {
          void api.groupChats.getAll().then((result) => {
            if (!Array.isArray(result)) return;
            const group = result.find((item: any) =>
              item.id === data.groupId &&
              Array.isArray(item.pendingIds) &&
              item.pendingIds.includes(authenticatedUser.id),
            );
            if (!group) return;
            const invitation: ChatConversation = {
              id: `study-${group.id}`,
              groupId: group.id,
              type: 'study_group',
              isInvitePending: true,
              title: group.name,
              subtitle: 'Group invitation',
              communityName: group.name,
              lastMessage: 'You were invited to join this group',
              unreadCount: 0,
              messages: [],
            };
            setConversations((previous) => previous.some((item) => item.id === invitation.id)
              ? previous
              : [invitation, ...previous]);
          }).catch(() => {});
        }
      } else if ((data.view === 'communities' || data.view === 'feed') && data.postId) {
        const targetPost = [...posts, ...homeFeedPosts].find((post) => post.id === data.postId);
        const targetCommunity = data.communityId
          ? communities.find((community) => community.id === data.communityId)
          : targetPost
            ? communities.find((community) =>
                community.slug === targetPost.communitySlug ||
                communityMatchesSlug(community, targetPost.communitySlug),
              )
            : undefined;
        setNotificationFocus({ postId: data.postId, reply: data.type === 'comment' });
        if (targetCommunity) {
          setActiveTab('communities');
          setSelectedCommunitySlug(targetCommunity.slug);
          setIsCommunityChatActive(false);
        } else {
          setActiveTab('home');
          setSelectedCommunitySlug(null);
        }
      } else if (data.view === 'communities' && data.communityId) {
        setActiveTab('communities');
        const target = communities.find((community) => community.id === data.communityId);
        if (target) setSelectedCommunitySlug(target.slug);
      }
    };
    navigator.serviceWorker?.addEventListener('message', handlePushNavigation);
    return () => navigator.serviceWorker?.removeEventListener('message', handlePushNavigation);
  }, [communities, posts, homeFeedPosts]);

  useEffect(() => {
    if (!offlineSnapshot || offlineSnapshot.userId !== authenticatedUser.id) return;
    if (hydratedOfflineSnapshotAtRef.current === offlineSnapshot.savedAt) return;
    hydratedOfflineSnapshotAtRef.current = offlineSnapshot.savedAt;
    const seed = createOfflineFeedSeed(offlineSnapshot, authenticatedUser);
    if (!seed) return;

    profileSnapshotRef.current = offlineSnapshot.users;
    const fresh = freshReadOnlyFieldsRef.current;
    if (!fresh.users) setUsers(seed.users);
    if (!fresh.communities) setCommunities(seed.communities);
    if (!fresh.connections) setConnections(seed.connections);
    if (!fresh.posts) {
      setPosts(seed.posts);
      setHomeFeedPosts(seed.posts);
      setHomeFeedLoading(false);
      setHomeFeedOffset(seed.posts.length);
    } else if (!fresh.saved) {
      const savedPostIds = new Set(offlineSnapshot.savedPostIds ?? []);
      setPosts((previous) => previous.map((post) => ({ ...post, saved: savedPostIds.has(post.id) })));
      setHomeFeedPosts((previous) => previous.map((post) => ({ ...post, saved: savedPostIds.has(post.id) })));
    }
    if (fresh.communities && !fresh.saved) {
      const savedCommunityIds = new Set(offlineSnapshot.savedCommunityIds ?? []);
      setCommunities((previous) => previous.map((community) => ({
        ...community,
        isSaved: savedCommunityIds.has(community.id),
      })));
    }
    if (!fresh.opportunities && offlineSnapshot.opportunities) setOpportunities(seed.opportunities);
    if (!fresh.notifications && offlineSnapshot.notifications) setNotifications(seed.notifications);
    setNetworkDataReady(true);
  }, [offlineSnapshot, authenticatedUser.id]);

  useEffect(() => {
    let cancelled = false;
    const usersRequest = api.users.getAll();
    const communitiesRequest = api.communities.getAll();
    const postsRequest = authenticatedUser.role === 'admin'
      ? api.posts.getAll()
      : api.posts.getFeed('looking-for', authenticatedUser.id, HOME_FEED_PAGE_SIZE, 0);
    const directMessagesRequest = api.messages.getForUser(
      authenticatedUser.id,
      undefined,
      { limit: 1 },
    );
    const groupChatsRequest = api.groupChats.getAll();

    void Promise.allSettled([
      usersRequest,
      communitiesRequest,
      directMessagesRequest,
      groupChatsRequest,
    ]).then(async ([usersResult, communitiesResult, messagesResult, groupsResult]) => {
      if (cancelled) return;

      const profiles = usersResult.status === 'fulfilled' && Array.isArray(usersResult.value)
        ? usersResult.value as UserProfile[]
        : offlineSnapshot?.users ?? [authenticatedUser];
      const rawCommunities = communitiesResult.status === 'fulfilled' && Array.isArray(communitiesResult.value)
        ? communitiesResult.value as CoreCommunity[]
        : offlineSnapshot?.communities ?? [];
      const chatUserMap = createLiveUserMap(
        profiles,
        rawCommunities,
        offlineSnapshot?.connections ?? [],
        offlineSnapshot?.projects ?? [],
      );
      const userMap = chatUserMap[authenticatedAs.id]
        ? chatUserMap
        : { ...chatUserMap, [authenticatedAs.id]: authenticatedAs };
      const chatCommunities = rawCommunities.map((community) =>
        toUploadedCommunity(community, authenticatedUser.id, authenticatedUser.role),
      );
      const communityConversations: ChatConversation[] = chatCommunities
        .filter((community) => community.isJoined)
        .map((community) => ({
          id: `community-${community.id}`,
          type: 'community' as const,
          title: community.displayName || community.name,
          subtitle: `${community.membersCount} members`,
          communitySlug: community.slug,
          communityName: community.displayName || community.name,
          communityIconBg: community.iconBg,
          lastMessage: 'Loading...',
          unreadCount: 0,
          messages: [],
        }));

      let rawMessages = messagesResult.status === 'fulfilled' && Array.isArray(messagesResult.value)
        ? messagesResult.value
        : [];
      if (rawMessages.length === 1 && rawMessages[0].unreadCount === undefined) {
        try {
          const expanded = await api.messages.getForUser(
            authenticatedUser.id,
            undefined,
            { limit: 100 },
          );
          if (Array.isArray(expanded) && expanded.length > rawMessages.length) {
            rawMessages = expanded;
          }
        } catch (error) {
          console.warn('[Chat] Could not expand legacy conversation previews.', error);
        }
      }
      if (cancelled) return;

      for (const message of rawMessages) {
        if (
          message.createdAt &&
          (!latestDirectMessageAtRef.current ||
            new Date(message.createdAt).getTime() > new Date(latestDirectMessageAtRef.current).getTime())
        ) {
          latestDirectMessageAtRef.current = message.createdAt;
        }
      }
      const directConversations = toUploadedConversations(
        rawMessages,
        userMap,
        authenticatedUser.id,
      );
      const groups = groupsResult.status === 'fulfilled' && Array.isArray(groupsResult.value)
        ? groupsResult.value as CoreGroupChat[]
        : [];
      const visibleGroups = groups.filter((group) =>
        (Array.isArray(group.memberIds) ? group.memberIds : []).includes(authenticatedUser.id) ||
        (Array.isArray(group.pendingIds) ? group.pendingIds : []).includes(authenticatedUser.id),
      );
      const groupConversations: ChatConversation[] = visibleGroups.map((group) => {
        const memberIds = Array.isArray(group.memberIds) ? group.memberIds : [];
        const isInvitePending = !memberIds.includes(authenticatedUser.id) &&
          (Array.isArray(group.pendingIds) ? group.pendingIds : []).includes(authenticatedUser.id);
        return {
          id: `study-${group.id}`,
          type: 'study_group' as const,
          groupId: group.id,
          creatorId: group.creatorId,
          visibility: group.visibility,
          memberIds,
          isInvitePending,
          title: group.name,
          subtitle: isInvitePending
            ? 'Group invitation'
            : `${memberIds.length} ${memberIds.length === 1 ? 'member' : 'members'}`,
          communityName: group.name,
          lastMessage: isInvitePending ? 'You were invited to join this group' : 'Loading...',
          unreadCount: 0,
          messages: [],
        };
      });

      setConversations((previous) =>
        mergeChatConversationSnapshots(previous, [
          ...directConversations,
          ...communityConversations,
          ...groupConversations,
        ]),
      );
      setDirectChatsReady(true);
      setChatBootstrapReady(true);
    }).catch((error: unknown) => {
      console.error('[Chat] Could not initialize conversations.', error);
      if (cancelled) return;
      setDirectChatsReady(true);
      setChatBootstrapReady(true);
    });

    if (authenticatedUser.role !== 'admin') {
      initialHomeFeedRequestPendingRef.current = true;
      void Promise.allSettled([usersRequest, communitiesRequest, postsRequest])
        .then(([usersResult, communitiesResult, postsResult]) => {
          if (cancelled || postsResult.status !== 'fulfilled') return;

          const feedPage = postsResult.value;
          const feedItems = Array.isArray(feedPage?.items)
            ? feedPage.items as CorePost[]
            : null;
          if (!feedItems) return;

          const profiles = usersResult.status === 'fulfilled' && Array.isArray(usersResult.value)
            ? usersResult.value as UserProfile[]
            : offlineSnapshot?.users ?? [authenticatedUser];
          const rawCommunities = communitiesResult.status === 'fulfilled' && Array.isArray(communitiesResult.value)
            ? communitiesResult.value as CoreCommunity[]
            : offlineSnapshot?.communities ?? [];
          const rawConnections = offlineSnapshot?.connections ?? [];
          const rawProjects = offlineSnapshot?.projects ?? [];
          const savedCommunityIds = new Set(offlineSnapshot?.savedCommunityIds ?? []);
          const nextCommunities = rawCommunities.map((community) => ({
            ...toUploadedCommunity(community, authenticatedUser.id, authenticatedUser.role),
            isSaved: savedCommunityIds.has(community.id),
          }));
          const liveUserMap = createLiveUserMap(profiles, rawCommunities, rawConnections, rawProjects);
          const nextUsers = applyConnectionFlags(liveUserMap, rawConnections, authenticatedUser.id);
          const communityMap = Object.fromEntries(
            nextCommunities.map((community) => [community.id, community]),
          );
          const savedPostIds = new Set(offlineSnapshot?.savedPostIds ?? []);
          const mappedPosts = feedItems.map((post) => ({
            ...toUploadedPost(post, nextUsers, communityMap, authenticatedUser.id),
            saved: savedPostIds.has(post.id),
          }));

          profileSnapshotRef.current = profiles;
          setUsers(nextUsers);
          setCurrentUser(nextUsers[authenticatedUser.id] || authenticatedAs);
          setCommunities(nextCommunities);
          setPosts(mappedPosts);
          setHomeFeedPosts(mappedPosts);
          setHomeFeedHasMore(Boolean(feedPage.hasMore));
          setHomeFeedOffset(
            typeof feedPage.nextOffset === 'number' ? feedPage.nextOffset : mappedPosts.length,
          );
          setHomeFeedLoading(false);
          initialHomeFeedLoadedRef.current = true;
        })
        .finally(() => {
          initialHomeFeedRequestPendingRef.current = false;
          setInitialHomeFeedBootstrapDone(true);
        });
    }

    Promise.allSettled([
      usersRequest,
      communitiesRequest,
      postsRequest,
      api.notifications.getForUser(authenticatedUser.id),
      api.events.getAll(),
      api.connections.getAll(),
       api.projects.getAll(),
       api.sessions.online(),
       api.saved.getForUser(authenticatedUser.id),
    ]).then(async ([usersResult, communitiesResult, postsResult, notificationsResult, eventsResult, connectionsResult, projectsResult, onlineResult, savedResult]) => {
      if (cancelled) return;

      const freshProfiles =
        usersResult.status === 'fulfilled' && Array.isArray(usersResult.value)
          ? usersResult.value as UserProfile[]
          : null;
      const freshCommunities =
        communitiesResult.status === 'fulfilled' && Array.isArray(communitiesResult.value)
          ? communitiesResult.value as CoreCommunity[]
          : null;
      const freshConnections =
        connectionsResult.status === 'fulfilled' && Array.isArray(connectionsResult.value)
          ? connectionsResult.value as CoreConnection[]
          : null;
      const freshPosts =
        postsResult.status === 'fulfilled' && Array.isArray(postsResult.value)
          ? postsResult.value as CorePost[]
          : postsResult.status === 'fulfilled' && Array.isArray(postsResult.value?.items)
            ? postsResult.value.items as CorePost[]
            : null;
      const freshEvents =
        eventsResult.status === 'fulfilled' && Array.isArray(eventsResult.value)
          ? eventsResult.value as CoreCampusEvent[]
          : null;
      const freshProjects =
        projectsResult.status === 'fulfilled' && Array.isArray(projectsResult.value)
          ? projectsResult.value as CoreProject[]
          : null;
      const freshNotifications =
        notificationsResult.status === 'fulfilled' && Array.isArray(notificationsResult.value)
          ? notificationsResult.value
          : null;
      const freshSavedData =
        savedResult.status === 'fulfilled' && savedResult.value
          ? savedResult.value as { postIds?: string[]; communityIds?: string[] }
          : null;
      const fresh = freshReadOnlyFieldsRef.current;
      fresh.users = Boolean(freshProfiles);
      fresh.communities = Boolean(freshCommunities);
      fresh.connections = Boolean(freshConnections);
      fresh.posts = Boolean(freshPosts);
      fresh.opportunities = Boolean(freshEvents);
      fresh.notifications = Boolean(freshNotifications);
      fresh.saved = Boolean(freshSavedData);

      const profiles = freshProfiles ?? profileSnapshotRef.current;
      if (freshProfiles?.length) profileSnapshotRef.current = freshProfiles;
      if (authenticatedUser.role === 'admin') {
        if (freshProfiles) setAdminUsers(freshProfiles);
         setAdminPosts(postsResult.status === 'fulfilled' && Array.isArray(postsResult.value) ? postsResult.value as CorePost[] : []);
        if (freshCommunities) setAdminCommunities(freshCommunities);
      }
      const rawConnections = freshConnections ?? offlineSnapshot?.connections ?? [];
      const rawCommunities = freshCommunities ?? offlineSnapshot?.communities ?? [];
      const savedData = freshSavedData ?? {
        postIds: offlineSnapshot?.savedPostIds ?? [],
        communityIds: offlineSnapshot?.savedCommunityIds ?? [],
      };
      const savedPostIds = new Set(Array.isArray(savedData.postIds) ? savedData.postIds : []);
      const savedCommunityIds = new Set(Array.isArray(savedData.communityIds) ? savedData.communityIds : []);
      const rawProjects = freshProjects ?? offlineSnapshot?.projects ?? [];
      const onlineUserIds =
        onlineResult.status === 'fulfilled' && Array.isArray(onlineResult.value)
          ? onlineResult.value.map(String)
          : [];
      if (freshConnections) connectionsRef.current = freshConnections;
      lastNetworkRefreshRef.current = Date.now();
      if (freshConnections) setConnections(freshConnections);
      const nextCommunities = rawCommunities.map((community) => ({
        ...toUploadedCommunity(community, authenticatedUser.id, authenticatedUser.role),
        isSaved: savedCommunityIds.has(community.id),
      }));
      const liveUserMap = createLiveUserMap(profiles, rawCommunities, rawConnections, rawProjects);
      const userMap: Record<string, User> = liveUserMap[authenticatedAs.id]
        ? liveUserMap
        : { ...liveUserMap, [authenticatedAs.id]: authenticatedAs };
      const presence = applyOnlinePresence(userMap, nextCommunities, onlineUserIds, authenticatedUser.id);
      const nextUsers = applyConnectionFlags(presence.users, rawConnections, authenticatedUser.id);
      const communitiesWithPresence = presence.communities;
      setUsers(nextUsers);
      setCurrentUser(nextUsers[authenticatedAs.id] || authenticatedAs);
      setCommunities(communitiesWithPresence);
      if (initialCommunityQuery) {
        const requestedCommunity = nextCommunities.find((community) =>
          communityMatchesSlug(community, initialCommunityQuery),
        );
        if (requestedCommunity) setSelectedCommunitySlug(requestedCommunity.slug);
      }

      const communityMap = Object.fromEntries(communitiesWithPresence.map((community) => [community.id, community]));
      const rawPosts = freshPosts ?? offlineSnapshot?.posts ?? [];
      if (freshPosts) {
        setPosts(rawPosts.map((post) => ({
          ...toUploadedPost(post, userMap, communityMap, authenticatedUser.id),
          saved: savedPostIds.has(post.id),
        })));
      } else if (offlineSnapshot?.posts.length) {
        // Keep the seeded offline list and refresh saved flags without replacing
        // it with an empty result from a failed network request.
        setPosts((previous) => previous.map((post) => ({
          ...post,
          saved: savedPostIds.has(post.id),
        })));
      }

      const joinedCommunities = nextCommunities.filter((community) => community.isJoined);
      const communityConversations: ChatConversation[] = joinedCommunities.map((community) => ({
          id: `community-${community.id}`,
          type: 'community' as const,
          title: community.displayName || community.name,
          subtitle: `${community.membersCount} members`,
          communitySlug: community.slug,
          communityName: community.displayName || community.name,
          communityIconBg: community.iconBg,
          lastMessage: 'Loading...',
          unreadCount: 0,
          messages: [],
        }));
      setConversations((previous) =>
        mergeChatConversationSnapshots(previous, communityConversations),
      );

      if (freshNotifications) {
        setNotifications(toUploadedNotifications(freshNotifications));
      }

      const freshOpportunities = freshEvents?.map(toUploadedOpportunity);
      if (freshOpportunities) setOpportunities(freshOpportunities);

      const snapshotUpdate: OfflineScreenSnapshotUpdate = {
        userId: authenticatedUser.id,
        currentUser: authenticatedUser,
      };
      if (freshProfiles) snapshotUpdate.users = freshProfiles;
      if (freshCommunities) snapshotUpdate.communities = freshCommunities;
      if (freshConnections) snapshotUpdate.connections = freshConnections;
      if (freshPosts && authenticatedUser.role !== 'admin') snapshotUpdate.posts = freshPosts;
      if (freshProjects) snapshotUpdate.projects = freshProjects;
      if (freshOpportunities) snapshotUpdate.opportunities = freshOpportunities;
      if (freshNotifications) snapshotUpdate.notifications = toUploadedNotifications(freshNotifications);
      if (freshSavedData) {
        snapshotUpdate.savedPostIds = Array.isArray(freshSavedData.postIds) ? freshSavedData.postIds : [];
        snapshotUpdate.savedCommunityIds = Array.isArray(freshSavedData.communityIds)
          ? freshSavedData.communityIds
          : [];
      }
      if (Object.keys(snapshotUpdate).length > 2) {
        void updateOfflineScreenSnapshot(snapshotUpdate);
      }
    }).finally(() => {
      if (!cancelled) setNetworkDataReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [authenticatedUser.id]);

  useEffect(() => {
    if (activeTab !== 'chats' || !chatBootstrapReady) return;

    for (const conversation of conversations) {
      if (
        conversation.type === 'direct' ||
        conversation.isInvitePending ||
        conversation.messages.length > 0 ||
        conversation.id === activeChatConversationId ||
        chatPreviewRequestsRef.current.has(conversation.id)
      ) continue;

      chatPreviewRequestsRef.current.add(conversation.id);
      const request = conversation.type === 'community'
        ? api.entityMessages.get(
            'community',
            conversation.id.replace(/^community-/, ''),
            authenticatedUser.id,
            { limit: 1 },
          )
        : api.groupChats.getMessages(
            conversation.groupId || conversation.id.replace(/^study-/, ''),
            { limit: 1 },
          );

      void request.then((result) => {
        const message = Array.isArray(result) ? result[result.length - 1] : null;
        if (!message) {
          setConversations((previous) =>
            mergeChatConversationSnapshots(previous, [{
              ...conversation,
              lastMessage: 'No messages yet',
            }]),
          );
          return;
        }

        setConversations((previous) => mergeChatConversationSnapshots(previous, [{
          ...conversation,
          lastMessage: uploadedChatPreview(message),
          lastMessageTime: message.createdAt,
          lastTimestamp: message.createdAt,
          lastMessageId: message.id,
          messages: [uploadedChatMessage(message, users)],
        }]));
      }).catch(() => {
        chatPreviewRequestsRef.current.delete(conversation.id);
      });
    }
  }, [
    activeTab,
    activeChatConversationId,
    authenticatedUser.id,
    chatBootstrapReady,
    conversations,
    users,
  ]);

  const loadHomeFeed = async (
    filter: HomeFeedFilter,
    offset = 0,
    append = false,
  ) => {
    const requestedOffset = append ? offset : 0;
    const requestId = homeFeedRequestRef.current + 1;
    homeFeedRequestRef.current = requestId;
    if (append) {
      setHomeFeedLoadingMore(true);
      setHomeFeedLoadMoreError(null);
    } else {
      const showingFirstCachedFeed =
        requestId === 1 &&
        filter === 'looking-for' &&
        Boolean(homeFeedPosts.length);
      if (!showingFirstCachedFeed) setHomeFeedLoading(true);
      setHomeFeedLoadingMore(false);
      setHomeFeedError(null);
      setHomeFeedLoadMoreError(null);
    }
    try {
      const response = await api.posts.getFeed(
        filter,
        authenticatedUser.id,
        HOME_FEED_PAGE_SIZE,
        requestedOffset,
      );
      if (requestId !== homeFeedRequestRef.current) return;
      const items = Array.isArray(response?.items) ? response.items as CorePost[] : [];
      const communityMap = Object.fromEntries(communities.map((community) => [community.id, community]));
      const mapped = items.map((post) =>
        toUploadedPost(post, users, communityMap, authenticatedUser.id),
      );
      void updateOfflineFeedSnapshot({
        userId: authenticatedUser.id,
        currentUser: authenticatedUser,
        users: profileSnapshotRef.current,
        posts: items,
        filter,
      });
      setHomeFeedPosts((previous) => {
        return mergeHomeFeedPosts(previous, mapped, append);
      });
      setHomeFeedHasMore(Boolean(response?.hasMore));
      setHomeFeedOffset(
        typeof response?.nextOffset === 'number'
          ? response.nextOffset
          : requestedOffset + mapped.length,
      );
    } catch (error) {
      if (requestId !== homeFeedRequestRef.current) return;
      const message = error instanceof Error ? error.message : 'Could not load the Home feed.';
      if (append) {
        setHomeFeedLoadMoreError(message);
      } else {
        setHomeFeedError(message);
        if (homeFeedPosts.length === 0) setHomeFeedHasMore(false);
      }
    } finally {
      if (requestId === homeFeedRequestRef.current) {
        if (append) {
          setHomeFeedLoadingMore(false);
        } else {
          setHomeFeedLoading(false);
        }
      }
    }
  };

  useEffect(() => {
    if (!networkDataReady) return;
    if (!initialHomeFeedBootstrapDone) return;
    const skipDuplicateInitialFeed = !homeFeedEffectStartedRef.current &&
      homeFeedFilter === 'looking-for' &&
      initialHomeFeedLoadedRef.current;
    homeFeedEffectStartedRef.current = true;
    if (skipDuplicateInitialFeed) return;
    void loadHomeFeed(homeFeedFilter);
  }, [networkDataReady, initialHomeFeedBootstrapDone, homeFeedFilter, authenticatedUser.id]);

  // Refresh shared app data after returning to a long-lived session. Individual
  // views use their own streams or polling for data that needs faster updates.
  useEffect(() => {
    let cancelled = false;
    let refreshInFlight = false;

    const refreshNetworkData = async () => {
      const now = Date.now();
      if (refreshInFlight || now - lastNetworkRefreshRef.current < 120_000) return;
      refreshInFlight = true;
      lastNetworkRefreshRef.current = now;

      try {
       const [
          usersResult,
          communitiesResult,
          postsResult,
          connectionsResult,
          notificationsResult,
          eventsResult,
           projectsResult,
           onlineResult,
           savedResult,
        ] = await Promise.allSettled([
          api.users.getAll(),
          api.communities.getAll(),
           authenticatedUser.role === 'admin'
             ? api.posts.getAll()
             : api.posts.getFeed(homeFeedFilter, authenticatedUser.id, HOME_FEED_PAGE_SIZE, 0),
          api.connections.getAll(),
          api.notifications.getForUser(authenticatedUser.id),
          api.events.getAll(),
           api.projects.getAll(),
           api.sessions.online(),
            api.saved.getForUser(authenticatedUser.id),
        ]);

        if (cancelled) return;

        const profiles = usersResult.status === 'fulfilled' && Array.isArray(usersResult.value)
          ? usersResult.value as UserProfile[]
          : null;
        const rawConnections = connectionsResult.status === 'fulfilled' && Array.isArray(connectionsResult.value)
          ? connectionsResult.value as CoreConnection[]
          : null;
        const rawCommunities = communitiesResult.status === 'fulfilled' && Array.isArray(communitiesResult.value)
          ? communitiesResult.value as CoreCommunity[]
          : null;
        const rawProjects = projectsResult.status === 'fulfilled' && Array.isArray(projectsResult.value)
          ? projectsResult.value as CoreProject[]
          : [];
         const savedData = savedResult.status === 'fulfilled' && savedResult.value
           ? savedResult.value as { postIds?: string[]; communityIds?: string[] }
           : {};
         const savedPostIds = new Set(Array.isArray(savedData.postIds) ? savedData.postIds : []);
         const savedCommunityIds = new Set(Array.isArray(savedData.communityIds) ? savedData.communityIds : []);
         const onlineUserIds = onlineResult.status === 'fulfilled' && Array.isArray(onlineResult.value)
           ? onlineResult.value.map(String)
           : [];
        const refreshedPosts = postsResult.status === 'fulfilled'
          ? Array.isArray(postsResult.value)
            ? postsResult.value
            : Array.isArray(postsResult.value?.items)
              ? postsResult.value.items
              : null
          : null;

        if (rawConnections) {
          connectionsRef.current = rawConnections;
          setConnections(rawConnections);
        }

        if (profiles) {
          profileSnapshotRef.current = profiles;
           const nextCommunities = (rawCommunities || []).map((community) => ({
             ...toUploadedCommunity(community, authenticatedUser.id, authenticatedUser.role),
             isSaved: savedCommunityIds.has(community.id),
           }));
          const liveUserMap = createLiveUserMap(
            profiles,
            rawCommunities || [],
            rawConnections || connectionsRef.current,
            rawProjects,
          );
          const userMap: Record<string, User> = liveUserMap[authenticatedAs.id]
            ? liveUserMap
            : { ...liveUserMap, [authenticatedAs.id]: authenticatedAs };
           const presence = applyOnlinePresence(
             userMap,
             nextCommunities,
             onlineUserIds,
             authenticatedUser.id,
           );
           const nextUsers = applyConnectionFlags(
             presence.users,
            rawConnections || connectionsRef.current,
            authenticatedUser.id,
          );
           const communitiesWithPresence = presence.communities;
          setUsers(nextUsers);
          setCurrentUser(nextUsers[authenticatedAs.id] || authenticatedAs);

           if (rawCommunities) {
             const communityMap = Object.fromEntries(communitiesWithPresence.map((community) => [community.id, community]));
             setCommunities(communitiesWithPresence);

             if (refreshedPosts) {
                const mappedPosts = refreshedPosts.map((post) => ({
                  ...toUploadedPost(post, nextUsers, communityMap, authenticatedUser.id),
                  saved: savedPostIds.has(post.id),
                }));
                setPosts(mappedPosts);
                // The Home discovery cards derive from the same live users and
                // communities props, but the post stream has its own state.
                // Refresh it here as well instead of leaving the old page in
                // place until a filter change or full reload.
                setHomeFeedPosts((previous) => mergeHomeFeedPosts(previous, mappedPosts, false));
                 if (
                   postsResult.status === 'fulfilled' &&
                   !Array.isArray(postsResult.value) &&
                   typeof postsResult.value?.hasMore === 'boolean'
                 ) {
                   setHomeFeedHasMore(postsResult.value.hasMore);
                  setHomeFeedOffset(
                     typeof postsResult.value.nextOffset === 'number'
                       ? postsResult.value.nextOffset
                      : mappedPosts.length,
                  );
                }
            }
          }
        }

        if (notificationsResult.status === 'fulfilled' && Array.isArray(notificationsResult.value)) {
          setNotifications(toUploadedNotifications(notificationsResult.value));
        }
        if (eventsResult.status === 'fulfilled' && Array.isArray(eventsResult.value)) {
          setOpportunities(eventsResult.value.map(toUploadedOpportunity));
        }

        const snapshotUpdate: OfflineScreenSnapshotUpdate = {
          userId: authenticatedUser.id,
          currentUser: authenticatedUser,
        };
        if (profiles) snapshotUpdate.users = profiles;
        if (rawCommunities) snapshotUpdate.communities = rawCommunities;
        if (rawConnections) snapshotUpdate.connections = rawConnections;
        if (refreshedPosts && authenticatedUser.role !== 'admin') snapshotUpdate.posts = refreshedPosts;
        if (projectsResult.status === 'fulfilled' && Array.isArray(projectsResult.value)) {
          snapshotUpdate.projects = projectsResult.value as CoreProject[];
        }
        if (eventsResult.status === 'fulfilled' && Array.isArray(eventsResult.value)) {
          snapshotUpdate.opportunities = eventsResult.value.map(toUploadedOpportunity);
        }
        if (notificationsResult.status === 'fulfilled' && Array.isArray(notificationsResult.value)) {
          snapshotUpdate.notifications = toUploadedNotifications(notificationsResult.value);
        }
        if (savedResult.status === 'fulfilled' && savedResult.value) {
          snapshotUpdate.savedPostIds = Array.isArray(savedData.postIds) ? savedData.postIds : [];
          snapshotUpdate.savedCommunityIds = Array.isArray(savedData.communityIds)
            ? savedData.communityIds
            : [];
        }
        if (Object.keys(snapshotUpdate).length > 2) {
          void updateOfflineScreenSnapshot(snapshotUpdate);
        }
      } catch {
        // Keep the last successful data visible during outages.
      } finally {
        refreshInFlight = false;
      }
    };

    const refreshOnReturn = () => {
      if (selectedCommunitySlug) return;
      if (document.visibilityState === 'visible') void refreshNetworkData();
    };
    window.addEventListener('focus', refreshOnReturn);
    document.addEventListener('visibilitychange', refreshOnReturn);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', refreshOnReturn);
      document.removeEventListener('visibilitychange', refreshOnReturn);
    };
  }, [homeFeedFilter, selectedCommunitySlug, networkDataReady, authenticatedUser.id]);

  // Keep one authenticated Socket.IO connection for chat while the current
  // user's session is active.
  useEffect(() => {
    if (!authenticatedUser.id) return;
    const socket = getChatSocket();
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, [authenticatedUser.id]);

  // Direct messages and read receipts arrive through the authenticated user
  // room; REST remains the source of truth and the send path.
  useEffect(() => {
    if (!authenticatedUser.id) return;
    const socket = getChatSocket();
    const handleDirectEvent = (message: any) => {
      try {
        if (message?.type === 'read_receipt' && message.readerId && Array.isArray(message.messageIds)) {
          const readMessageIds = new Set(message.messageIds.map(String));
          const conversationIds = new Set([
            `direct-${message.readerId}`,
            `anonymous-${message.readerId}`,
          ]);
          setConversations((previous) => previous.map((item) => {
            if (!conversationIds.has(item.id)) return item;
            return {
              ...item,
              messages: item.messages.map((entry) =>
                readMessageIds.has(entry.id) ? { ...entry, read: true } : entry,
              ),
            };
          }));
          return;
        }
        if (!message?.id || !message?.senderId || !message?.receiverId) return;
        if (
          message.createdAt &&
          (!latestDirectMessageAtRef.current ||
            new Date(message.createdAt).getTime() > new Date(latestDirectMessageAtRef.current).getTime())
        ) {
          latestDirectMessageAtRef.current = message.createdAt;
        }
        const otherUserId = message.senderId === authenticatedUser.id ? message.receiverId : message.senderId;
        const conversationIds = new Set([
          `direct-${otherUserId}`,
          `anonymous-${otherUserId}`,
        ]);
        const isViewingConversation = conversationIds.has(activeChatConversationIdRef.current || '')
          && document.visibilityState === 'visible';
        const localMessage: ChatMessage = {
          id: message.id,
          clientMessageId: message.clientMessageId,
          senderId: message.senderId,
          senderName: message.senderId === authenticatedUser.id
            ? authenticatedUser.fullName
            : users[message.senderId]?.name || 'Network member',
          text: message.content || '',
          timestamp: message.createdAt
            ? new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
            : 'Just now',
          createdAt: message.createdAt,
          read: Boolean(message.isRead) || isViewingConversation,
          replyToId: message.replyToId ?? null,
          attachmentName: message.attachmentName,
          attachmentData: message.attachmentData,
          attachmentMimeType: message.attachmentMimeType,
          reactions: normalizeChatReactions(message.reactions),
        };
        setConversations((previous) => previous.map((item) => {
          if (!conversationIds.has(item.id)) return item;
          if (item.messages.some((entry) => entry.id === message.id)) return item;
          const pendingIndex = message.senderId === authenticatedUser.id
            ? item.messages.findIndex((entry) =>
                (message.clientMessageId && entry.clientMessageId === message.clientMessageId) ||
                (!message.clientMessageId && entry.id.startsWith('pending-') &&
                entry.senderId === message.senderId &&
                entry.text === localMessage.text &&
                entry.attachmentName === localMessage.attachmentName),
              )
            : -1;
          const nextMessages = [...item.messages];
          if (pendingIndex >= 0) nextMessages[pendingIndex] = localMessage;
          else nextMessages.push(localMessage);
          const sortedMessages = sortChatMessagesChronologically(nextMessages);
          const preview = localMessage.text || localMessage.attachmentName || 'Attachment';
          const advancesLatest = isChatActivityAtOrAfterLatest(
            item,
            localMessage.createdAt || message.createdAt,
            localMessage.id,
          ) || pendingIndex >= 0;
          return {
            ...item,
            ...(advancesLatest ? {
              lastMessage: preview,
              lastMessageTime: message.createdAt || new Date().toISOString(),
              lastTimestamp: message.createdAt || new Date().toISOString(),
              lastMessageId: message.id,
            } : {}),
            unreadCount: message.receiverId === authenticatedUser.id
              ? (isViewingConversation ? 0 : item.unreadCount + 1)
              : item.unreadCount,
            messages: sortedMessages,
          };
        }));
        if (message.receiverId === authenticatedUser.id && isViewingConversation) {
          void api.messages.markRead(authenticatedUser.id, otherUserId).catch(() => {});
        }
      } catch {
        // Reconnects and the bounded history refresh recover missed events.
      }
    };
    socket.on('chat:direct-event', handleDirectEvent);
    return () => {
      socket.off('chat:direct-event', handleDirectEvent);
    };
  }, [authenticatedUser.id, authenticatedUser.fullName, users]);

  // Update conversation previews even when the user is not currently inside
  // the community or study-group room.
  useEffect(() => {
    if (!authenticatedUser.id) return;
    const socket = getChatSocket();
    const handleConversationActivity = (event: any) => {
      const conversationId = event?.type === 'community'
        ? `community-${event.id}`
        : event?.type === 'study_group'
          ? `study-${event.id}`
          : '';
      const createdAt = typeof event?.createdAt === 'string' ? event.createdAt : '';
      const messageId = typeof event?.messageId === 'string' ? event.messageId : '';
      const senderId = typeof event?.senderId === 'string' ? event.senderId : '';
      const preview = typeof event?.preview === 'string' && event.preview.trim()
        ? event.preview.trim()
        : 'New message';
      if (!conversationId || !createdAt || !senderId) return;

      const isActiveConversation = activeChatConversationIdRef.current === conversationId;
      setConversations((previous) => previous.map((item) => {
        if (item.id !== conversationId) return item;
        const advancesLatest = isChatActivityAtOrAfterLatest(item, createdAt, messageId);
        return {
          ...item,
          ...(advancesLatest ? {
            lastMessage: preview,
            lastMessageTime: createdAt,
            lastTimestamp: createdAt,
            lastMessageId: messageId || item.lastMessageId,
          } : {}),
          unreadCount: event.isNewMessage === true &&
            senderId !== authenticatedUser.id &&
            !isActiveConversation
            ? item.unreadCount + 1
            : item.unreadCount,
        };
      }));
    };

    socket.on('chat:conversation-activity', handleConversationActivity);
    return () => {
      socket.off('chat:conversation-activity', handleConversationActivity);
    };
  }, [authenticatedUser.id]);

  // Join only the currently open shared conversation. The server checks
  // membership before allowing the socket into a group or entity room.
  useEffect(() => {
    const conversationId = activeChatConversationId;
    if (!conversationId || conversationId.startsWith('direct-') || conversationId.startsWith('anonymous-')) return;
    const isCommunity = conversationId.startsWith('community-');
    const entityId = conversationId.slice(isCommunity ? 'community-'.length : 'study-'.length);
    const socket = getChatSocket();
    const room = {
      type: isCommunity ? 'community' : 'group',
      id: entityId,
    };
    const joinRoom = () => {
      socket.emit('chat:join', room);
    };

    const handleSharedMessage = (message: any) => {
      try {
        if (!message?.id || !message?.senderId) return;
        const isViewing = document.visibilityState === 'visible'
          && activeChatConversationIdRef.current === conversationId;
        const localMessage: ChatMessage = {
          id: message.id,
          clientMessageId: message.clientMessageId,
          senderId: message.senderId,
          senderName: users[message.senderId]?.name || 'Network member',
          text: message.content || '',
          timestamp: relativeTimeForUploaded(message.createdAt),
          createdAt: message.createdAt,
          read: isViewing,
          replyToId: message.replyToId ?? null,
          attachmentName: message.attachmentName,
          attachmentData: message.attachmentData,
          attachmentMimeType: message.attachmentMimeType,
          sharedPost: message.sharedPost ?? null,
          reactions: normalizeChatReactions(message.reactions),
        };
        setConversations((previous) => previous.map((item) => {
          if (item.id !== conversationId) return item;
          const existingIndex = item.messages.findIndex((entry) =>
            entry.id === message.id ||
            (message.clientMessageId && entry.clientMessageId === message.clientMessageId),
          );
          const nextMessages = [...item.messages];
          if (existingIndex >= 0) nextMessages[existingIndex] = localMessage;
          else nextMessages.push(localMessage);
          const sortedMessages = sortChatMessagesChronologically(nextMessages);
          const preview = localMessage.text || localMessage.attachmentName || 'Attachment';
          const advancesLatest = isChatActivityAtOrAfterLatest(
            item,
            localMessage.createdAt,
            localMessage.id,
          );
          return {
            ...item,
            ...(advancesLatest ? {
              lastMessage: preview,
              lastMessageTime: message.createdAt || 'Just now',
              lastTimestamp: message.createdAt || item.lastTimestamp,
              lastMessageId: message.id,
            } : {}),
            unreadCount: message.senderId !== authenticatedUser.id && !isViewing
              ? item.unreadCount + 1
              : isViewing ? 0 : item.unreadCount,
            messages: sortedMessages,
          };
        }));
        if (message.senderId !== authenticatedUser.id && isViewing) {
          const notificationType = isCommunity ? 'community' : 'study_group';
          void api.notifications.markConversationRead(notificationType, entityId).catch(() => {});
          const markerField = isCommunity ? 'communityId' : 'groupId';
          setNotifications((previous) => previous.map((notification) =>
            notification[markerField] === entityId
              ? { ...notification, unread: false }
              : notification,
          ));
        }
      } catch {
        // The bounded history refresh recovers malformed or missed events.
      }
    };
    socket.on('connect', joinRoom);
    socket.on('chat:shared-message', handleSharedMessage);
    if (socket.connected) joinRoom();
    return () => {
      socket.off('connect', joinRoom);
      socket.off('chat:shared-message', handleSharedMessage);
      if (socket.connected) socket.emit('chat:leave', room);
    };
  }, [activeChatConversationId, authenticatedUser.id, users]);

  // Keep history reconciled if a socket event was missed. Poll infrequently
  // while connected and more often only while Socket.IO is reconnecting.
  useEffect(() => {
    if (!authenticatedUser.id || !directChatsReady) return;
    let cancelled = false;
    let interval: number | null = null;
    const socket = getChatSocket();

    const refreshDirectMessages = async () => {
      try {
        // Use the last seen timestamp after the initial load. The API uses
        // >= intentionally, so the boundary row is harmlessly de-duplicated
        // while the query stays small enough not to compete with live chat.
        const after = latestDirectMessageAtRef.current || undefined;
        const result = await api.messages.getForUser(
          authenticatedUser.id,
          after,
          after ? undefined : { limit: 1 },
        );
        if (cancelled || !Array.isArray(result)) return;
        for (const message of result) {
          if (
            message.createdAt &&
            (!latestDirectMessageAtRef.current ||
              new Date(message.createdAt).getTime() > new Date(latestDirectMessageAtRef.current).getTime())
          ) {
            latestDirectMessageAtRef.current = message.createdAt;
          }
        }
        const direct = toUploadedConversations(result, users, authenticatedUser.id);
        setConversations((previous) =>
          mergeDirectConversationRefresh(previous, direct, Boolean(after), authenticatedUser.id),
        );
      } catch {
        // The socket and next polling cycle recover from transient failures.
      }
    };

    const setPollingInterval = (delayMs: number) => {
      if (interval !== null) window.clearInterval(interval);
      interval = window.setInterval(() => void refreshDirectMessages(), delayMs);
    };
    const onSocketConnect = () => setPollingInterval(60_000);
    const onSocketDisconnect = () => setPollingInterval(10_000);

    void refreshDirectMessages();
    socket.on('connect', onSocketConnect);
    socket.on('disconnect', onSocketDisconnect);
    setPollingInterval(socket.connected ? 60_000 : 10_000);
    const refreshOnReturn = () => {
      if (document.visibilityState === 'visible') void refreshDirectMessages();
    };
    window.addEventListener('focus', refreshOnReturn);
    document.addEventListener('visibilitychange', refreshOnReturn);
    return () => {
      cancelled = true;
      if (interval !== null) window.clearInterval(interval);
      socket.off('connect', onSocketConnect);
      socket.off('disconnect', onSocketDisconnect);
      window.removeEventListener('focus', refreshOnReturn);
      document.removeEventListener('visibilitychange', refreshOnReturn);
    };
  }, [authenticatedUser.id, users, directChatsReady]);

  // Reconcile only the open shared conversation. Socket.IO delivers messages
  // immediately; bounded polling recovers events missed during reconnects.
  useEffect(() => {
    if (!authenticatedUser.id || !activeChatConversationId
      || activeChatConversationId.startsWith('direct-')
      || activeChatConversationId.startsWith('anonymous-')) return;
    let cancelled = false;
    let inFlight = false;
    let hasWarnedAboutRefreshFailure = false;
    let interval: number | null = null;
    const socket = getChatSocket();

    const refreshSharedChats = async () => {
      if (cancelled || inFlight || document.visibilityState === 'hidden') return;
      const conversation = conversationsRef.current.find((item) => item.id === activeChatConversationId);
      if (!conversation) return;
      inFlight = true;
      try {
        const isCommunity = conversation.type === 'community';
        const entityId = conversation.id.replace(isCommunity ? 'community-' : 'study-', '');
          let messages;
          try {
            messages = isCommunity
              ? await api.entityMessages.get('community', entityId, authenticatedUser.id)
              : await api.groupChats.getMessages(entityId);
            hasWarnedAboutRefreshFailure = false;
          } catch (error) {
            if (!cancelled && !hasWarnedAboutRefreshFailure) {
              console.warn('[Chat] Background message refresh failed; polling will retry.', error);
              hasWarnedAboutRefreshFailure = true;
            }
            return;
          }
        if (cancelled || !Array.isArray(messages)) return;
        setConversations((previous) => previous.map((current) => {
          if (current.id !== conversation.id) return current;
          const existingById = new Map(current.messages.map((message) => [message.id, message]));
          for (const message of messages) {
            const existing = existingById.get(message.id);
            existingById.set(message.id, {
              ...(existing || {}),
              id: message.id,
              senderId: message.senderId,
              senderName: users[message.senderId]?.name || 'Network member',
              text: message.content || '',
              timestamp: relativeTimeForUploaded(message.createdAt),
              createdAt: message.createdAt,
              read: message.isRead,
              seenBy: Array.isArray(message.seenBy)
                ? message.seenBy
                : existing?.seenBy || [],
              replyToId: message.replyToId ?? null,
              attachmentName: message.attachmentName,
              attachmentData: message.attachmentData,
              attachmentMimeType: message.attachmentMimeType,
              sharedPost: message.sharedPost ?? existing?.sharedPost ?? null,
              reactions: normalizeChatReactions(message.reactions),
            });
          }
          const mergedMessages = sortChatMessagesChronologically([...existingById.values()]);
          const latest = mergedMessages[mergedMessages.length - 1];
          return latest ? {
            ...current,
            lastMessage: latest.text || latest.attachmentName || 'Attachment',
            lastMessageTime: latest.createdAt,
            lastTimestamp: latest.createdAt || current.lastTimestamp,
            lastMessageId: latest.id,
            messages: mergedMessages,
          } : current;
        }).sort(compareConversationsByLatestActivity));
      } finally {
        inFlight = false;
      }
    };

    const setPollingInterval = (delayMs: number) => {
      if (interval !== null) window.clearInterval(interval);
      interval = window.setInterval(() => void refreshSharedChats(), delayMs);
    };
    // Read-receipt counts are included in the same shared-message response, so
    // refresh this open group thread regularly even while sockets are healthy.
    const onSocketConnect = () => setPollingInterval(60_000);
    const onSocketDisconnect = () => setPollingInterval(10_000);

    void refreshSharedChats();
    socket.on('connect', onSocketConnect);
    socket.on('disconnect', onSocketDisconnect);
    setPollingInterval(socket.connected ? 60_000 : 10_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void refreshSharedChats();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      cancelled = true;
      if (interval !== null) window.clearInterval(interval);
      socket.off('connect', onSocketConnect);
      socket.off('disconnect', onSocketDisconnect);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [activeChatConversationId, authenticatedUser.id, users]);

  // Deliver persisted notifications to the active shell immediately. The
  // database remains the source of truth, while EventSource removes the need
  // to wait for the periodic refresh before the recipient sees a new alert.
  useEffect(() => {
    if (!authenticatedUser.id) return;
    const stream = api.notifications.stream(authenticatedUser.id);
    let fallbackTimer: number | null = null;
    let fallbackDelay = 0;
    const refreshNotifications = async () => {
      try {
        const result = await api.notifications.getForUser(authenticatedUser.id);
        if (Array.isArray(result)) setNotifications(toUploadedNotifications(result));
      } catch {
        // Keep the last known notification state during a temporary outage.
      }
    };
    const stopFallback = () => {
      if (fallbackTimer !== null) {
        window.clearInterval(fallbackTimer);
        fallbackTimer = null;
      }
      fallbackDelay = 0;
    };
    const startFallback = (delayMs: number) => {
      if (fallbackTimer !== null && fallbackDelay === delayMs) return;
      stopFallback();
      fallbackDelay = delayMs;
      fallbackTimer = window.setInterval(refreshNotifications, delayMs);
    };
    const useFastFallback = () => {
      if (fallbackDelay === 10_000) return;
      void refreshNotifications();
      startFallback(10_000);
    };
    // Keep a slow reconciliation poll while the live stream is healthy, and
    // retry faster only while it is reconnecting.
    void refreshNotifications();
    startFallback(60_000);
    stream.onopen = () => startFallback(60_000);
    stream.onerror = useFastFallback;
    stream.onmessage = (event) => {
      try {
        const notification = JSON.parse(event.data);
        const mapped = toUploadedNotifications([notification])[0];
        if (!mapped) return;
        setNotifications((previous) => {
          const existing = previous.findIndex((item) => item.id === mapped.id);
          if (existing >= 0) {
            const next = [...previous];
            next[existing] = mapped;
            return next;
          }
          return [mapped, ...previous].slice(0, 100);
        });
      } catch {
        // EventSource reconnects automatically; malformed events are ignored.
      }
    };
    return () => {
      stream.close();
      stopFallback();
    };
  }, [authenticatedUser.id]);

  // Keep connection requests fresh across tabs and devices without requiring
  // the recipient to refresh the page.
  useEffect(() => {
    let cancelled = false;
    const refreshConnections = async () => {
      try {
        const result = await api.connections.getAll();
        if (cancelled || !Array.isArray(result)) return;
        const nextConnections = result as CoreConnection[];
        setConnections(nextConnections);
        setUsers((prev) => applyConnectionFlags(prev, nextConnections, authenticatedUser.id));
      } catch {
        // Keep the last known state visible during a temporary network failure.
      }
    };

    const refreshOnReturn = () => {
      if (document.visibilityState === 'visible') void refreshConnections();
    };
    const interval = window.setInterval(refreshConnections, 30_000);
    window.addEventListener('focus', refreshOnReturn);
    document.addEventListener('visibilitychange', refreshOnReturn);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshOnReturn);
      document.removeEventListener('visibilitychange', refreshOnReturn);
    };
  }, [authenticatedUser.id]);

  useEffect(() => {
    if (authenticatedUser.role !== 'admin') return;
    api.reports.getAll()
      .then((reports) => setAdminReports(Array.isArray(reports) ? reports as UserReport[] : []))
      .catch(() => {});
  }, [authenticatedUser.id, authenticatedUser.role]);

  const updateVisiblePosts = (updater: (previous: Post[]) => Post[]) => {
    setPosts(updater);
    setHomeFeedPosts(updater);
  };

  const getPostThreadId = (postId: string) => {
    const post = [...posts, ...homeFeedPosts].find((item) => item.id === postId);
    return post?.resharedFromId || post?.id || postId;
  };
  const isInPostThread = (post: Post, threadId: string) =>
    post.id === threadId || post.resharedFromId === threadId;

  // Upvote / Downvote
  const handleToggleUpvote = async (postId: string, delta: 1 | -1 = 1) => {
    const previous = [...posts, ...homeFeedPosts].find((post) => post.id === postId);
    if (!previous) return;
    const threadId = getPostThreadId(postId);
    const currentVote = previous.userVote || 0;
    const nextVote = currentVote === delta ? 0 : delta;
    updateVisiblePosts((prev) =>
      prev.map((p) => {
        if (isInPostThread(p, threadId)) {
          const currentVote = p.userVote || 0;
          let newVote = currentVote;
          let newUpvotes = p.upvotes;

          if (currentVote === delta) {
            // Cancel vote
            newVote = 0;
            newUpvotes -= delta;
          } else if (currentVote === 0) {
            // Cast new vote
            newVote = delta;
            newUpvotes += delta;
          } else {
            // Switch from +1 to -1 or vice versa
            newVote = delta;
            newUpvotes += delta * 2;
          }
          return { ...p, upvotes: newUpvotes, userVote: newVote as any };
        }
        return p;
      })
    );
    try {
      const updated = await api.posts.vote(threadId, authenticatedUser.id, delta);
      const rawVotes = updated?.votes && typeof updated.votes === 'object' ? updated.votes : {};
      const votes = Object.fromEntries(
        Object.entries(rawVotes).filter(([, value]) => value === 1 || value === -1),
      ) as Record<string, 1 | -1>;
      const score = Object.values(votes).reduce<number>((total, value) =>
        total + (value === 1 ? 1 : value === -1 ? -1 : 0), 0);
      updateVisiblePosts((prev) => prev.map((post) =>
        isInPostThread(post, threadId)
          ? { ...post, votes, upvotes: score, userVote: votes[authenticatedUser.id] || null }
          : post,
      ));
    } catch {
      updateVisiblePosts((prev) => prev.map((post) =>
        isInPostThread(post, threadId)
          ? { ...post, upvotes: previous.upvotes, userVote: previous.userVote }
          : post,
      ));
    }
  };

  // Like / Heart Post
  const handleToggleLike = async (postId: string) => {
    const previous = [...posts, ...homeFeedPosts].find((post) => post.id === postId);
    if (!previous) return;
    const threadId = getPostThreadId(postId);
    updateVisiblePosts((prev) =>
      prev.map((p) => {
        if (isInPostThread(p, threadId)) {
          const liked = !p.liked;
          const likesCount = (p.likesCount || p.upvotes) + (liked ? 1 : -1);
          return { ...p, liked, likesCount };
        }
        return p;
      })
    );
    try {
      const updated = await api.posts.like(threadId, authenticatedUser.id);
      const likes = Array.isArray(updated?.likes) ? updated.likes : [];
      updateVisiblePosts((prev) => prev.map((post) =>
        isInPostThread(post, threadId)
          ? { ...post, liked: likes.includes(authenticatedUser.id), likesCount: likes.length }
          : post,
      ));
    } catch {
      updateVisiblePosts((prev) => prev.map((post) =>
        isInPostThread(post, threadId)
          ? { ...post, liked: previous.liked, likesCount: previous.likesCount }
          : post,
      ));
    }
  };

  // Bookmark / Save Post
  const handleToggleSave = (postId: string) => {
    const previousSaved = posts.find((post) => post.id === postId)?.saved ?? false;
    updateVisiblePosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          return { ...p, saved: !p.saved };
        }
        return p;
      })
    );
    api.saved.toggle(authenticatedUser.id, 'post', postId).catch(() => {
      updateVisiblePosts((prev) => prev.map((post) =>
        post.id === postId ? { ...post, saved: previousSaved } : post,
      ));
    });
  };

  const handleToggleCommunitySave = (communityId: string) => {
    const previousSaved = communities.find((community) => community.id === communityId)?.isSaved ?? false;
    setCommunities((previous) => previous.map((community) =>
      community.id === communityId ? { ...community, isSaved: !previousSaved } : community,
    ));
    api.saved.toggle(authenticatedUser.id, 'community', communityId).catch(() => {
      setCommunities((previous) => previous.map((community) =>
        community.id === communityId ? { ...community, isSaved: previousSaved } : community,
      ));
    });
  };

  // Add Comment
  const handleAddComment = async (
    postId: string,
    text: string,
    isAnonymous = false,
    replyToId?: string | null,
  ) => {
    const threadId = getPostThreadId(postId);
    const pendingCommentId = `pending-comment-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const newComment: Post['comments'][number] = {
      id: pendingCommentId,
      author: isAnonymous ? anonymousUserFor(authenticatedUser.id) : currentUser,
      isAnonymous,
      replyToId: replyToId ?? null,
      content: text,
      timestamp: 'Just now',
      upvotes: 0,
    };
    React.startTransition(() => updateVisiblePosts((prev) =>
      prev.map((p) => {
        if (!isInPostThread(p, threadId)) return p;
        const comments = p.comments.some((comment) => comment.id === newComment.id)
          ? p.comments
          : [newComment, ...p.comments];
        return {
          ...p,
          comments,
          commentsCount: (p.commentsCount ?? p.comments.length) + 1,
        };
      })
    ));

    try {
      const savedComment = await api.posts.addComment(
        threadId,
        authenticatedUser.id,
        text,
        isAnonymous,
        replyToId,
      );
      React.startTransition(() => updateVisiblePosts((prev) =>
        prev.map((p) => isInPostThread(p, threadId)
          ? {
              ...p,
              comments: p.comments.map((comment) => comment.id === pendingCommentId
                ? {
                    ...comment,
                    id: savedComment.id,
                    replyToId: savedComment.replyToId ?? replyToId ?? null,
                    content: savedComment.content,
                  }
                : comment),
            }
          : p),
      ));
    } catch (error) {
      React.startTransition(() => updateVisiblePosts((prev) =>
        prev.map((p) => isInPostThread(p, threadId)
          ? {
              ...p,
              comments: p.comments.filter((comment) => comment.id !== pendingCommentId),
              commentsCount: Math.max(0, (p.commentsCount ?? p.comments.length) - 1),
            }
          : p),
      ));
      throw error;
    }
  };

  // Join / Leave Community
  const handleToggleJoinCommunity = async (slug: string) => {
    const target = communities.find((community) => community.slug === slug);
    if (!target) return;

    const currentMemberIds = target.memberIds || [];
    const wasJoined = currentMemberIds.includes(authenticatedUser.id);
    const nextMemberIds = wasJoined
      ? currentMemberIds.filter((id) => id !== authenticatedUser.id)
      : [...currentMemberIds, authenticatedUser.id];

    setCommunities((prev) =>
      prev.map((c) => {
        if (c.slug === slug) {
          const isJoined = !wasJoined;
          return {
            ...c,
            isJoined,
            membersCount: c.membersCount + (isJoined ? 1 : -1),
            memberIds: nextMemberIds,
          };
        }
        return c;
      })
    );

    // Also update currentUser's community list
    setCurrentUser((prev) => {
      const exists = prev.communities.includes(slug);
      return {
        ...prev,
        communities: exists
          ? prev.communities.filter((s) => s !== slug)
          : [...prev.communities, slug],
      };
    });

    try {
      // Joining must use the dedicated endpoint because it notifies the
      // existing members. Leaving can continue to update membership directly.
      const saved = wasJoined
        ? await api.communities.update(target.id, { memberIds: nextMemberIds })
        : await api.communities.join(target.id, authenticatedUser.id);
      const savedMemberIds = Array.isArray(saved?.memberIds) ? saved.memberIds : nextMemberIds;
      setCommunities((prev) =>
        prev.map((community) =>
          community.slug === slug
            ? {
                ...community,
                memberIds: savedMemberIds,
                membersCount: savedMemberIds.length,
                isJoined: savedMemberIds.includes(authenticatedUser.id),
              }
            : community,
        ),
      );
    } catch (error) {
      console.error('Failed to update community membership', error);
      setCommunities((prev) =>
        prev.map((community) =>
          community.slug === slug
            ? {
                ...community,
                memberIds: currentMemberIds,
                membersCount: currentMemberIds.length,
                isJoined: wasJoined,
              }
            : community,
        ),
      );
      setCurrentUser((prev) => ({
        ...prev,
        communities: wasJoined
          ? [...new Set([...prev.communities, slug])]
          : prev.communities.filter((communitySlug) => communitySlug !== slug),
      }));
    }
  };

  const openCreatePostModal = (requestType?: string) => {
    setInitialCreateMode('post');
    setInitialRequestType(typeof requestType === 'string' ? requestType : undefined);
    setInitialDraftCommunitySlug(undefined);
    setInitialPostTitle(undefined);
    setInitialPostContent(undefined);
    setIsCreateModalOpen(true);
  };

  const openCreateCommunityModal = () => {
    setInitialCreateMode('community');
    setInitialRequestType(undefined);
    setInitialDraftCommunitySlug(undefined);
    setInitialPostTitle(undefined);
    setInitialPostContent(undefined);
    setIsCreateModalOpen(true);
  };

  const openStudyPartnerPost = (draft: { requestType: string; title: string; content: string }) => {
    setInitialCreateMode('post');
    setInitialRequestType(draft.requestType);
    setInitialDraftCommunitySlug('');
    setInitialPostTitle(draft.title);
    setInitialPostContent(draft.content);
    setIsCreateModalOpen(true);
  };

  const openWorkshopSharePost = (draft: { title: string; content: string }) => {
    setInitialCreateMode('post');
    setInitialRequestType(undefined);
    setInitialDraftCommunitySlug('');
    setInitialPostTitle(draft.title);
    setInitialPostContent(draft.content);
    setIsCreateModalOpen(true);
  };

  const handleOpenProfile = (user: User) => {
    if (user.id === 'anonymous') return;
    setActiveProfileUser(user);
  };

  useEffect(() => {
    if (openOwnProfileRequest > 0) handleOpenProfile(currentUser);
  }, [openOwnProfileRequest]);

  // Send a persistent connection request. The recipient can accept it from Connect.
  const handleToggleConnect = async (
    userId: string,
    type: CoreConnection['type'] = 'Friendship',
    message = '',
  ) => {
    const target = users[userId];
    const existing = connections.find((connection) =>
      (connection.status === 'pending' || connection.status === 'accepted') &&
      ((connection.senderId === authenticatedUser.id && connection.receiverId === userId) ||
        (connection.receiverId === authenticatedUser.id && connection.senderId === userId)),
    );
    if (!target || existing || pendingConnectionUsersRef.current.has(userId)) return;

    const temporaryId = `temp-conn-${Date.now()}-${userId}`;
    const optimisticConnection: CoreConnection = {
      id: temporaryId,
      senderId: authenticatedUser.id,
      receiverId: userId,
      type,
      message,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    pendingConnectionUsersRef.current.add(userId);
    setConnections((prev) => {
      const nextConnections = [optimisticConnection, ...prev];
      setUsers((currentUsers) =>
        applyConnectionFlags(currentUsers, nextConnections, authenticatedUser.id),
      );
      return nextConnections;
    });
    setActiveProfileUser((prev) =>
      prev && prev.id === userId
        ? {
            ...prev,
            connectionPending: true,
            outgoingConnectionPending: true,
            incomingConnectionPending: false,
          }
        : prev,
    );

    try {
      const saved = await api.connections.create({
        senderId: authenticatedUser.id,
        receiverId: userId,
        type,
        message,
      }) as CoreConnection;
      setConnections((prev) => {
        const nextConnections = [
          saved,
          ...prev.filter((connection) =>
            connection.id !== temporaryId && connection.id !== saved.id,
          ),
        ];
        setUsers((currentUsers) =>
          applyConnectionFlags(currentUsers, nextConnections, authenticatedUser.id),
        );
        return nextConnections;
      });
      setActiveProfileUser((prev) =>
        prev && prev.id === userId
          ? {
              ...prev,
              isConnected: saved.status === 'accepted',
              connectionPending: saved.status === 'pending',
              outgoingConnectionPending: saved.status === 'pending',
            }
          : prev,
      );
    } catch (error) {
      setConnections((prev) => {
        const nextConnections = prev.filter((connection) => connection.id !== temporaryId);
        setUsers((currentUsers) =>
          applyConnectionFlags(currentUsers, nextConnections, authenticatedUser.id),
        );
        return nextConnections;
      });
      setActiveProfileUser((prev) =>
        prev && prev.id === userId
          ? {
              ...prev,
              connectionPending: false,
              outgoingConnectionPending: false,
            }
          : prev,
      );
      console.error('Failed to send connection request', error);
    } finally {
      pendingConnectionUsersRef.current.delete(userId);
    }
  };

  const handleConnectionStatus = async (
    connectionId: string,
    status: 'accepted' | 'rejected',
  ) => {
    const connection = connections.find((item) => item.id === connectionId);
    if (!connection) return;
    const previousConnections = connections;
    const optimisticConnections = previousConnections.map((item) =>
      item.id === connectionId ? { ...item, status } : item,
    );
    setConnections(optimisticConnections);
    setUsers((prev) => applyConnectionFlags(prev, optimisticConnections, authenticatedUser.id));

    try {
      const saved = await api.connections.update(connectionId, status) as CoreConnection;
      const nextConnections = optimisticConnections.map((item) =>
        item.id === connectionId ? saved : item,
      );
      setConnections(nextConnections);
      setUsers((prev) => applyConnectionFlags(prev, nextConnections, authenticatedUser.id));
    } catch (error) {
      setConnections(previousConnections);
      setUsers((prev) => applyConnectionFlags(prev, previousConnections, authenticatedUser.id));
      console.error('Failed to update connection request', error);
    }
  };

  // Direct chat transition
  const handleStartDirectChat = (targetUser: User) => {
    const conversationId = `direct-${targetUser.id}`;
    setConversations((previous) => ensureDirectConversation(previous, targetUser).conversations);
    setRequestedConversationId(conversationId);
    setActiveTab('chats');
  };

  const handleStartAnonymousChat = (postId: string) => {
    const id = `anonymous-post-${postId}`;
    setConversations((previous) => previous.some((conversation) => conversation.id === id)
      ? previous
      : [{
          id,
          type: 'direct',
          title: 'Anonymous person',
          subtitle: 'Private anonymous chat',
          avatar: '',
          online: false,
          verified: false,
          lastMessage: 'Start a private conversation',
          lastTimestamp: undefined,
          unreadCount: 0,
          anonymousPostId: postId,
          messages: [],
        }, ...previous]);
    setActiveTab('chats');
  };

  // Send message in Chat
  const handleSharePostToCommunity = async (postId: string, communityId: string) => {
    const savedMessage = await api.entityMessages.send('community', communityId, authenticatedUser.id, '', {
      sharedPostId: postId,
    });
    const createdAt = savedMessage?.createdAt || new Date().toISOString();
    const sharedMessage: ChatMessage = {
      id: savedMessage?.id || `shared-post-${postId}-${createdAt}`,
      senderId: savedMessage?.senderId || authenticatedUser.id,
      senderName: currentUser.name,
      text: savedMessage?.content || 'Shared a post',
      timestamp: relativeTimeForUploaded(createdAt),
      createdAt,
      sharedPost: savedMessage?.sharedPost ?? null,
      replyToId: savedMessage?.replyToId ?? null,
      attachmentName: savedMessage?.attachmentName,
      attachmentData: savedMessage?.attachmentData,
      attachmentMimeType: savedMessage?.attachmentMimeType,
      reactions: normalizeChatReactions(savedMessage?.reactions),
      read: true,
    };
    setConversations((previous) => previous.map((conversation) => {
      if (conversation.id !== `community-${communityId}`) return conversation;
      const advancesLatest = isChatActivityAtOrAfterLatest(
        conversation,
        createdAt,
        sharedMessage.id,
      );
      const messages = sortChatMessagesChronologically([
        ...conversation.messages.filter((message) => message.id !== sharedMessage.id),
        sharedMessage,
      ]);
      return {
        ...conversation,
        ...(advancesLatest ? {
          lastMessage: sharedMessage.text || 'Shared a post',
          lastMessageTime: createdAt,
          lastTimestamp: createdAt,
          lastMessageId: sharedMessage.id,
        } : {}),
        messages,
      };
    }));
  };

  const handleSendMessage = async (
    conversationId: string,
    text: string,
    attachment?: { name: string; data: string; mimeType: string },
    messageOptions?: { replyToId?: string },
  ) => {
    const conversation = conversations.find((item) => item.id === conversationId);
    const optimisticId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const clientMessageId = optimisticId;
    const extras = {
      clientMessageId,
      ...(attachment
        ? {
            attachmentName: attachment.name,
            attachmentData: attachment.data,
            attachmentMimeType: attachment.mimeType,
          }
        : {}),
      ...(messageOptions?.replyToId ? { replyToId: messageOptions.replyToId } : {}),
    };
    const messagePreview = text || (attachment?.mimeType.startsWith('image/') ? 'Photo' : attachment?.name || 'Attachment');
    const anonymousPostId = conversation?.anonymousPostId || (
      conversationId.startsWith('anonymous-post-')
        ? conversationId.slice('anonymous-post-'.length)
        : undefined
    );
    const targetId = conversation?.anonymousTargetId || conversation?.participant?.id;
    if (
      !conversationId.startsWith('community-') &&
      !conversationId.startsWith('study-') &&
      !anonymousPostId &&
      !targetId
    ) {
      throw new Error('This conversation does not have a recipient.');
    }
    if (sendLockRef.current === conversationId) return;
    sendLockRef.current = conversationId;

    const optimisticTime = new Date().toISOString();
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      clientMessageId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      text,
      attachmentName: attachment?.name,
      attachmentData: attachment?.data,
      attachmentMimeType: attachment?.mimeType,
      replyToId: messageOptions?.replyToId,
      timestamp: 'Just now',
      createdAt: optimisticTime,
    };

    // Paint locally before the network round trip. The server response below
    // replaces this pending row with its durable id and timestamp.
    setConversations((previous) => previous.map((item) =>
      item.id === conversationId
        ? {
            ...item,
            lastMessage: messagePreview,
            lastMessageTime: 'Just now',
            lastTimestamp: optimisticTime,
            lastMessageId: optimisticId,
            messages: sortChatMessagesChronologically([...item.messages, optimisticMessage]),
          }
        : item,
    ));

    const reconcileMessage = (savedMessage: any) => {
      const savedId = savedMessage?.id || optimisticId;
      const savedCreatedAt = savedMessage?.createdAt || optimisticTime;
      const savedTimestamp = new Date(savedCreatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      setConversations((previous) => previous.map((item) =>
        item.id === conversationId
          ? (() => {
              // The SSE event can arrive before the optimistic state update
              // commits. In that order the conversation may contain the
              // durable row, then the pending row, so replacing only the
              // pending ID would leave two bubbles for one saved message.
               const replacement = {
                 ...optimisticMessage,
                 id: savedId,
                 clientMessageId,
                 timestamp: savedTimestamp,
                 createdAt: savedCreatedAt,
                 replyToId: savedMessage?.replyToId ?? optimisticMessage.replyToId,
                 reactions: normalizeChatReactions(savedMessage?.reactions),
               };
               const nextMessages = item.messages.filter(
                (message) => message.id !== optimisticId && message.id !== savedId,
              );
               nextMessages.push(replacement);
               const advancesLatest = item.lastMessageId === optimisticId ||
                 isChatActivityAtOrAfterLatest(item, savedCreatedAt, savedId);
              return {
                ...item,
                 ...(advancesLatest ? {
                   lastMessage: messagePreview,
                   lastMessageTime: savedCreatedAt,
                   lastTimestamp: savedCreatedAt,
                   lastMessageId: savedId,
                 } : {}),
                 messages: sortChatMessagesChronologically(nextMessages),
              };
            })()
          : item,
      ));
    };

    const rollbackMessage = () => {
      setConversations((previous) => previous.map((item) =>
        item.id === conversationId
          ? (() => {
              const messages = sortChatMessagesChronologically(
                item.messages.filter((message) => message.id !== optimisticId),
              );
              const latest = messages[messages.length - 1];
              return {
                ...item,
                messages,
                lastMessage: latest?.text || latest?.attachmentName || 'No messages yet',
                lastMessageTime: latest?.createdAt,
                lastTimestamp: latest?.createdAt,
                lastMessageId: latest?.id,
              };
            })()
          : item,
      ));
    };

    try {
      if (conversationId.startsWith('community-')) {
        const communityId = conversationId.slice('community-'.length);
        reconcileMessage(await api.entityMessages.send('community', communityId, authenticatedUser.id, text, extras));
        return;
      }
      if (conversationId.startsWith('study-')) {
        const groupId = conversationId.slice('study-'.length);
        reconcileMessage(await api.groupChats.sendMessage(groupId, authenticatedUser.id, text, extras));
        return;
      }
      if (anonymousPostId) {
        const savedMessage = await api.messages.sendAnonymous(anonymousPostId, authenticatedUser.id, text, extras);
        reconcileMessage(savedMessage);
        setConversations((previous) => previous.map((item) =>
          item.id === conversationId
            ? { ...item, anonymousPostId, anonymousTargetId: savedMessage.receiverId }
            : item,
        ));
        return;
      }

      reconcileMessage(await api.messages.send(authenticatedUser.id, targetId as string, text, {
        ...extras,
        clientMessageId,
      }));
    } catch (error) {
      rollbackMessage();
      throw error;
    } finally {
      if (sendLockRef.current === conversationId) sendLockRef.current = null;
    }
  };

  const handleConversationOpened = (conversation: ChatConversation) => {
    activeChatConversationIdRef.current = conversation.id;
    setActiveChatConversationId(conversation.id);
    if (conversation.groupId !== initialGroupId) setSharedGroupMessage(null);
    // Clear the badge immediately so the list reflects what the user just
    // opened, without waiting for the network round trip.
    setConversations((previous) => previous.map((item) =>
      item.id === conversation.id ? { ...item, unreadCount: 0 } : item,
    ));

    if (conversation.type === 'direct') {
      const otherUserId = conversation.anonymousTargetId || conversation.participant?.id;
      if (!otherUserId) return;
      if (
        !directHistoryLoadedRef.current.has(conversation.id) &&
        !directHistoryLoadingRef.current.has(conversation.id)
      ) {
        directHistoryLoadingRef.current.add(conversation.id);
        void api.messages.getForUser(authenticatedUser.id, undefined, {
          peerId: otherUserId,
          limit: 50,
        }).then((result) => {
          if (!Array.isArray(result)) return;
          const refreshed = toUploadedConversations(result, users, authenticatedUser.id);
          setConversations((previous) => {
            const merged = mergeDirectConversationRefresh(
              previous,
              refreshed,
              false,
              authenticatedUser.id,
            );
            return merged.map((item) => item.id === conversation.id
              ? {
                  ...item,
                  unreadCount: 0,
                  messages: item.messages.map((message) =>
                    message.senderId === otherUserId ? { ...message, read: true } : message,
                  ),
                }
              : item);
          });
          directHistoryLoadedRef.current.add(conversation.id);
        }).catch(() => {
          // Keep the latest-message preview usable; reopening can retry history.
        }).finally(() => {
          directHistoryLoadingRef.current.delete(conversation.id);
        });
      }
      api.messages.markRead(authenticatedUser.id, otherUserId).then(() => {
        setConversations((previous) => previous.map((item) =>
          item.id === conversation.id
            ? { ...item, messages: item.messages.map((message) =>
                message.senderId === otherUserId ? { ...message, read: true } : message,
              ) }
            : item,
        ));
      }).catch(() => {});
      return;
    }

    const entityId = conversation.id.replace(/^(community-|study-)/, '');
    const notificationType = conversation.type === 'community' ? 'community' : 'study_group';
    const markerField = conversation.type === 'community' ? 'communityId' : 'groupId';
    setNotifications((previous) => previous.map((notification) =>
      notification[markerField] === entityId
        ? { ...notification, unread: false }
        : notification,
    ));
    void api.notifications.markConversationRead(notificationType, entityId).catch(() => {});
  };

  const handleLoadOlderMessages = async (conversation: ChatConversation) => {
    const oldestPersistedMessage = conversation.messages.find((message) =>
      !message.id.startsWith('pending-') && message.createdAt,
    );
    if (!oldestPersistedMessage) return { loaded: 0, hasMore: false };

    let result: any[];
    if (conversation.type === 'direct') {
      const otherUserId = conversation.anonymousTargetId || conversation.participant?.id;
      if (!otherUserId) return { loaded: 0, hasMore: false };
      result = await api.messages.getForUser(authenticatedUser.id, undefined, {
        peerId: otherUserId,
        beforeId: oldestPersistedMessage.id,
        limit: 50,
      });
    } else if (conversation.type === 'community') {
      result = await api.entityMessages.get(
        'community',
        conversation.id.replace('community-', ''),
        authenticatedUser.id,
        { beforeId: oldestPersistedMessage.id, limit: 50 },
      );
    } else {
      result = await api.groupChats.getMessages(
        conversation.id.replace('study-', ''),
        { beforeId: oldestPersistedMessage.id, limit: 50 },
      );
    }

    const olderMessages: ChatMessage[] = (Array.isArray(result) ? result : []).map((message: any) => ({
      id: message.id,
      clientMessageId: message.clientMessageId,
      senderId: message.senderId,
      senderName: message.isAnonymous
        ? 'Anonymous person'
        : users[message.senderId]?.name || 'Network member',
      text: message.content || '',
      timestamp: relativeTimeForUploaded(message.createdAt),
      createdAt: message.createdAt,
      read: Boolean(message.isRead),
      seenBy: Array.isArray(message.seenBy) ? message.seenBy : [],
      replyToId: message.replyToId ?? null,
      attachmentName: message.attachmentName,
      attachmentData: message.attachmentData,
      attachmentMimeType: message.attachmentMimeType,
      sharedPost: message.sharedPost ?? null,
      reactions: normalizeChatReactions(message.reactions),
      pollOptions: message.pollOptions ?? undefined,
      pollVotes: message.pollVotes ?? undefined,
    }));

    if (olderMessages.length) {
      setConversations((previous) => previous.map((current) => {
        if (current.id !== conversation.id) return current;
        const existingIds = new Set(current.messages.map((message) => message.id));
        const merged = [
          ...olderMessages.filter((message) => !existingIds.has(message.id)),
          ...current.messages,
        ];
        merged.sort((a, b) =>
          new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime(),
        );
        return { ...current, messages: merged };
      }));
    }
    return { loaded: olderMessages.length, hasMore: olderMessages.length === 50 };
  };

  const handleConversationBack = () => {
    activeChatConversationIdRef.current = null;
    setActiveChatConversationId(null);
    setRequestedConversationId(undefined);
  };

  const handleToggleReaction = async (conversationId: string, messageId: string, emoji: string) => {
    const conversation = conversations.find((item) => item.id === conversationId);
    const existingMessage = conversation?.messages.find((message) => message.id === messageId);
    if (!conversation || !existingMessage) throw new Error('That message is no longer available.');

    const previousReactions = existingMessage.reactions || [];
    const currentReaction = previousReactions.find((reaction) => reaction.emoji === emoji);
    const currentUsers = currentReaction?.users || [];
    const nextUsers = currentUsers.includes(authenticatedUser.id)
      ? currentUsers.filter((id) => id !== authenticatedUser.id)
      : [...currentUsers, authenticatedUser.id];
    const nextReactions = [
      ...previousReactions.filter((reaction) => reaction.emoji !== emoji),
      ...(nextUsers.length ? [{ emoji, count: nextUsers.length, users: nextUsers }] : []),
    ];

    setConversations((previous) => previous.map((item) =>
      item.id === conversationId
        ? {
            ...item,
            messages: item.messages.map((message) =>
              message.id === messageId ? { ...message, reactions: nextReactions } : message,
            ),
          }
        : item,
    ));

    try {
      const saved = conversationId.startsWith('community-')
        ? await api.entityMessages.toggleReaction(
            'community',
            conversationId.slice('community-'.length),
            messageId,
            authenticatedUser.id,
            emoji,
          )
        : conversationId.startsWith('study-')
        ? await api.groupChats.toggleReaction(
            conversationId.slice('study-'.length),
            messageId,
            authenticatedUser.id,
            emoji,
          )
        : await api.messages.toggleReaction(messageId, authenticatedUser.id, emoji);
      const savedReactions = normalizeChatReactions(saved?.reactions);
      setConversations((previous) => previous.map((item) =>
        item.id === conversationId
          ? {
              ...item,
              messages: item.messages.map((message) =>
                message.id === messageId ? { ...message, reactions: savedReactions } : message,
              ),
            }
          : item,
      ));
    } catch (error) {
      setConversations((previous) => previous.map((item) =>
        item.id === conversationId
          ? {
              ...item,
              messages: item.messages.map((message) =>
                message.id === messageId ? { ...message, reactions: previousReactions } : message,
              ),
            }
          : item,
      ));
      throw error;
    }
  };

  // Create Post
  const handleCreatePost = async (postData: {
    communitySlug: string;
     type: 'post' | 'question' | 'project' | 'hackathon' | 'resource' | 'opportunity' | 'event' | 'collab';
    title: string;
    content: string;
    requestType?: string;
    prizePool?: string;
    teamSize?: string;
    deadline?: string;
    tags: string[];
    postImage?: string;
    postImages?: string[];
    fileName?: string;
    fileData?: string;
    fileMimeType?: string;
    pollOptions?: string[];
    websiteUrl?: string;
    isAnonymous?: boolean;
    anonymousTopic?: string;
  }) => {
    const community = communities.find((item) => item.slug === postData.communitySlug);
    const savedPost = await api.posts.create({
      authorId: authenticatedUser.id,
      content: postData.content,
       academicTag: postData.isAnonymous
         ? `Anonymous topic: ${postData.anonymousTopic || 'Campus life'}`
         : postData.requestType
         ? `${postData.type} · Looking for: ${postData.requestType}`
         : postData.type,
      communityId: community?.id || null,
      projectTitle: postData.title || null,
      postImage: postData.postImage || null,
      postImages: postData.postImages || undefined,
      websiteUrl: postData.websiteUrl || null,
      tags: postData.tags,
      attachmentName: postData.fileName || null,
      attachmentData: postData.fileData || null,
      attachmentMimeType: postData.fileMimeType || null,
      pollOptions: postData.pollOptions || undefined,
      isAnonymous: Boolean(postData.isAnonymous),
    });

    const communityMap = Object.fromEntries(
      communities.map((item) => [item.id, item]),
    );
    const newPost: Post = {
      ...toUploadedPost(
        { ...savedPost, comments: savedPost.comments || [] },
        users,
        communityMap,
        authenticatedUser.id,
      ),
      communitySlug: community?.slug || '/general',
      communityName: community?.name || 'The Network',
      title: postData.title,
      type: postData.type as Post['type'],
      prizePool: postData.prizePool,
      teamSize: postData.teamSize,
      deadline: postData.deadline,
      tags: postData.tags,
    };

    setPosts((prev) => [newPost, ...prev.filter((post) => post.id !== newPost.id)]);
    if (homeFeedFilter === 'looking-for') {
      setHomeFeedPosts((prev) => [newPost, ...prev.filter((post) => post.id !== newPost.id)]);
    } else {
      void loadHomeFeed(homeFeedFilter);
    }
  };

  const handleCreateAnonymousPost = async (postData: {
    title: string;
    content: string;
    topic: string;
  }) => {
    const savedPost = await api.posts.create({
      authorId: authenticatedUser.id,
      content: postData.content,
      academicTag: `Anonymous topic: ${postData.topic}`,
      communityId: null,
      projectTitle: postData.title,
      isAnonymous: true,
    });
    const newPost = toUploadedPost(
      {
        ...savedPost,
        authorId: authenticatedUser.id,
        isAnonymous: true,
        projectTitle: postData.title,
        content: postData.content,
        academicTag: `Anonymous topic: ${postData.topic}`,
        comments: [],
      },
      users,
      Object.fromEntries(communities.map((community) => [community.id, community])),
      authenticatedUser.id,
    );
    setPosts((prev) => [newPost, ...prev.filter((post) => post.id !== newPost.id)]);
    if (homeFeedFilter === 'looking-for') {
      setHomeFeedPosts((prev) => [newPost, ...prev.filter((post) => post.id !== newPost.id)]);
    } else {
      void loadHomeFeed(homeFeedFilter);
    }
  };

  // Create Community
  const handleCreateCommunity = async (commData: {
    slug: string;
    displayName: string;
    description: string;
    category: 'college' | 'interest' | 'career';
  }) => {
    try {
      const savedCommunity = await api.communities.create({
        name: commData.displayName,
        description: commData.description,
        category: commData.category,
        creatorId: authenticatedUser.id,
      });
      const newComm = toUploadedCommunity(savedCommunity as CoreCommunity, authenticatedUser.id, authenticatedUser.role);
      setCommunities((previous) => [{ ...newComm, isSaved: false }, ...previous]);
      setCurrentUser((prev) => ({
        ...prev,
        communities: [...prev.communities, newComm.slug],
      }));
    } catch {
      // Keep the modal open state controlled by the modal, but do not add a
      // community locally when the server rejected the create request.
    }
  };

  const handleDeleteCommunityPost = async (postId: string) => {
    await api.posts.delete(postId, authenticatedUser.id);
    updateVisiblePosts((previous) => previous.filter((post) => post.id !== postId));
    setAdminPosts((previous) => previous.filter((post) => post.id !== postId));
  };

  const handleEditPost = async (postId: string, updates: { title: string; content: string }) => {
    const savedPost = await api.posts.update(postId, {
      actorId: authenticatedUser.id,
      content: updates.content,
      projectTitle: updates.title || null,
    });
    const communityMap = Object.fromEntries(
      communities.map((community) => [community.id, community]),
    );
    const mappedPost = toUploadedPost(
      { ...savedPost, comments: [] },
      users,
      communityMap,
      authenticatedUser.id,
    );
    const replacePost = (previous: Post[]) => previous.map((post) => {
      if (post.id !== postId) return post;
      return {
        ...post,
        ...mappedPost,
        comments: post.comments,
        commentsCount: post.commentsCount,
        saved: post.saved,
        liked: post.liked,
        likesCount: post.likesCount,
        upvotes: post.upvotes,
        userVote: post.userVote,
      };
    });
    setPosts(replacePost);
    setHomeFeedPosts(replacePost);
    setAdminPosts((previous) => previous.map((post) => post.id === postId ? { ...post, content: updates.content, projectTitle: updates.title || undefined } : post));
  };

  const handleResharePost = async (postId: string) => {
    try {
      const savedPost = await api.posts.reshare(postId, authenticatedUser.id);
      const communityMap = Object.fromEntries(
        communities.map((community) => [community.id, community]),
      );
      const mappedPost = toUploadedPost(
        { ...savedPost, comments: savedPost.comments || [] },
        users,
        communityMap,
        authenticatedUser.id,
      );
      setPosts((previous) => [mappedPost, ...previous.filter((post) => post.id !== mappedPost.id)]);
      if (homeFeedFilter === 'looking-for') {
        setHomeFeedPosts((previous) => [mappedPost, ...previous.filter((post) => post.id !== mappedPost.id)]);
      } else {
        void loadHomeFeed(homeFeedFilter);
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not reshare this post.');
    }
  };

  const handleVotePoll = async (postId: string, optionIndex: number) => {
    const previous = [...posts, ...homeFeedPosts].find((post) => post.id === postId);
    const previousPoll = previous?.pollData;
    if (!previousPoll) return;
    const threadId = getPostThreadId(postId);

    updateVisiblePosts((items) => items.map((post) => {
      if (!isInPostThread(post, threadId) || !post.pollData) return post;
      const previousOptionId = post.pollData.userVotedOptionId;
      const nextOptionId = String(optionIndex);
      const options = post.pollData.options.map((option) => {
        let votes = option.votes;
        if (option.id === previousOptionId) votes -= 1;
        if (option.id === nextOptionId) votes += 1;
        const voters = (option.voters || []).filter((voter) => voter.id !== currentUser.id);
        if (option.id === nextOptionId) {
          voters.unshift({
            id: currentUser.id,
            name: currentUser.name,
            avatar: currentUser.avatar,
          });
        }
        return { ...option, votes: Math.max(0, votes), voters };
      });
      return {
        ...post,
        pollData: {
          ...post.pollData,
          options,
          totalVotes: post.pollData.totalVotes + (previousOptionId ? 0 : 1),
          userVotedOptionId: nextOptionId,
        },
      };
    }));

    try {
      const savedPost = await api.posts.votePoll(threadId, authenticatedUser.id, optionIndex);
      const communityMap = Object.fromEntries(
        communities.map((community) => [community.id, community]),
      );
      const mappedPost = toUploadedPost(
        { ...savedPost, comments: savedPost.comments || [] },
        users,
        communityMap,
        authenticatedUser.id,
      );
      updateVisiblePosts((items) => items.map((post) => {
        if (!isInPostThread(post, threadId)) return post;
        return {
          ...post,
          pollData: mappedPost.pollData || post.pollData,
          comments: mappedPost.comments,
          commentsCount: mappedPost.commentsCount,
          liked: mappedPost.liked,
          likesCount: mappedPost.likesCount,
          votes: mappedPost.votes,
          upvotes: mappedPost.upvotes,
          userVote: mappedPost.userVote,
        };
      }));
    } catch {
      updateVisiblePosts((items) => items.map((post) => isInPostThread(post, threadId)
        ? { ...post, pollData: previousPoll }
        : post));
    }
  };

  const handleCommunityUpdated = (updated: CoreCommunity) => {
    setCommunities((previous) => previous.map((community) => {
      if (community.id !== updated.id) return community;
      return {
        ...toUploadedCommunity(updated, authenticatedUser.id, authenticatedUser.role),
        isSaved: community.isSaved,
      };
    }));
  };

  // Quick navigation helpers
  const handleSelectCommunity = (slug: string) => {
    setSelectedCommunitySlug(slug);
    setIsCommunityChatActive(false);
  };

  const handleSelectTab = (
    tab: NavTab,
    chatTab: 'direct' | 'communities' | 'study_groups' = 'direct',
  ) => {
    if (tab === 'anonymous') {
      if (window.location.pathname !== anonymousPath) {
        window.history.pushState({}, '', anonymousPath);
      }
    } else if (window.location.pathname === anonymousPath) {
      window.history.pushState({}, '', '/');
    }
    setActiveTab(tab);
    if (tab === 'chats') setRequestedChatTab(chatTab);
    setSelectedCommunitySlug(null);
    setIsChatKeyboardOpen(false);
    setIsCommunityChatActive(false);
  };

  const handleLauncherNavigation = (
    destination: 'compete' | 'workshops' | 'resources' | 'mentors' | 'my-space',
  ) => {
    const destinationTabs = {
      compete: 'compete',
      workshops: 'workshops',
      resources: 'resources',
      mentors: 'mentors',
      'my-space': 'my-space',
    } as const;
    handleSelectTab(destinationTabs[destination]);
  };

  const handleOpenCommunityChat = (community: Community) => {
    setRequestedConversationId(`community-${community.id}`);
    handleSelectTab('chats', 'communities');
  };

  const handleOpenCommunityGroup = async (group: CoreGroupChat) => {
    const conversationId = `study-${group.id}`;
    setRequestedConversationId(conversationId);
    handleSelectTab('chats', 'study_groups');

    try {
      const response = await api.groupChats.getMessages(group.id);
      const groupMessages = Array.isArray(response) ? response : [];
      const sortedMessages = [...groupMessages].sort(
        (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
      );
      const lastMessage = sortedMessages[sortedMessages.length - 1];
      const memberCount = group.memberCount ?? group.memberIds?.length ?? 1;
      const conversation: ChatConversation = {
        id: conversationId,
        groupId: group.id,
        creatorId: group.creatorId,
        visibility: group.visibility,
        memberIds: group.memberIds || [],
        type: 'study_group',
        title: group.name,
        subtitle: `${memberCount} ${memberCount === 1 ? 'member' : 'members'}`,
        communityName: group.name,
        lastMessage: lastMessage?.content || (
          lastMessage?.attachmentMimeType?.startsWith('image/')
            ? 'Photo'
            : lastMessage?.attachmentName || (lastMessage?.attachmentData ? 'Attachment' : 'No messages yet')
        ),
        lastMessageTime: lastMessage?.createdAt,
        lastTimestamp: lastMessage?.createdAt,
        unreadCount: 0,
        messages: sortedMessages.map((message): ChatMessage => ({
          id: message.id,
          senderId: message.senderId,
          senderName: users[message.senderId]?.name || 'Network member',
          text: message.content,
          timestamp: relativeTimeForUploaded(message.createdAt),
          createdAt: message.createdAt,
          replyToId: message.replyToId ?? null,
          seenBy: Array.isArray(message.seenBy) ? message.seenBy : [],
          attachmentName: message.attachmentName,
          attachmentData: message.attachmentData,
          attachmentMimeType: message.attachmentMimeType,
          reactions: normalizeChatReactions(message.reactions),
        })),
      };
      setConversations((previous) => [
        conversation,
        ...previous.filter((item) => item.id !== conversationId),
      ]);
    } catch (error) {
      console.error('Failed to load community group chat', error);
    }
  };

  useEffect(() => {
    const groupId = initialGroupId?.trim();
    if (!groupId || handledSharedGroupIdRef.current === groupId) return;
    handledSharedGroupIdRef.current = groupId;
    setActiveTab('chats');
    setSharedGroupMessage(null);

    void (async () => {
      try {
        const groups = await api.groupChats.getAll() as CoreGroupChat[];
        const existingGroup = Array.isArray(groups)
          ? groups.find((group) => group.id === groupId)
          : undefined;
        const memberIds = existingGroup?.memberIds || [];
        const pendingIds = existingGroup?.pendingIds || [];

        if (existingGroup && memberIds.includes(authenticatedUser.id)) {
          await handleOpenCommunityGroup(existingGroup);
          return;
        }
        if (existingGroup && pendingIds.includes(authenticatedUser.id)) {
          setRequestedConversationId(`study-${groupId}`);
          setSharedGroupMessage('You already have an invitation to this group. Accept it from the group list.');
          return;
        }

        await api.groupChats.getPublicPreview(groupId);
        const joinedGroup = await api.groupChats.joinPublicGroup(groupId) as CoreGroupChat;
        await handleOpenCommunityGroup(joinedGroup);
      } catch (error) {
        setRequestedConversationId(undefined);
        setSharedGroupMessage(
          error instanceof Error
            ? error.message
            : 'This group link could not be opened. Ask a group member for an invitation.',
        );
      }
    })();
  }, [initialGroupId, authenticatedUser.id]);

  const handleCreateStandaloneGroup = async (input: {
    name: string;
    description: string;
    inviteUserIds: string[];
    purpose: 'study' | 'chat';
    visibility: 'public' | 'private';
  }): Promise<ChatConversation> => {
    const created = await api.groupChats.create({
      name: input.name,
      creatorId: authenticatedUser.id,
      college: currentUser.college || currentUser.schoolName || currentUser.coachingName || 'The Network',
      branch: currentUser.branch || null,
      inviteUserIds: input.inviteUserIds,
      description: input.description,
      purpose: input.purpose,
      type: input.purpose === 'study' ? 'course' : 'interest',
      visibility: input.visibility,
    }) as CoreGroupChat;

    const memberCount = Array.isArray(created.memberIds) ? created.memberIds.length : 1;
    const conversation: ChatConversation = {
      id: `study-${created.id}`,
      groupId: created.id,
      creatorId: created.creatorId,
      visibility: created.visibility,
      memberIds: created.memberIds || [authenticatedUser.id],
      type: 'study_group',
      title: created.name,
      subtitle: `${memberCount} ${memberCount === 1 ? 'member' : 'members'}`,
      communityName: created.name,
      lastMessage: 'No messages yet',
      lastTimestamp: created.createdAt,
      unreadCount: 0,
      messages: [],
    };

    setRequestedConversationId(conversation.id);
    setConversations((previous) => [
      conversation,
      ...previous.filter((item) => item.id !== conversation.id),
    ]);
    return conversation;
  };

  const handleUpdateGroupVisibility = async (
    conversation: ChatConversation,
    visibility: 'public' | 'private',
  ) => {
    const groupId = conversation.groupId || conversation.id.replace(/^study-/, '');
    const updated = await api.groupChats.updateVisibility(groupId, visibility) as CoreGroupChat;
    setConversations((previous) => previous.map((item) =>
      item.groupId === groupId
        ? {
            ...item,
            visibility: updated.visibility,
            creatorId: updated.creatorId,
            memberIds: updated.memberIds || item.memberIds,
          }
        : item,
    ));
  };

  const handleInviteGroupMembers = async (
    conversation: ChatConversation,
    userIds: string[],
  ) => {
    const groupId = conversation.groupId || conversation.id.replace(/^study-/, '');
    const updated = await api.groupChats.invite(
      groupId,
      userIds,
      authenticatedUser.id,
    ) as CoreGroupChat;
    setConversations((previous) => previous.map((item) =>
      item.groupId === groupId
        ? { ...item, memberIds: updated.memberIds || item.memberIds }
        : item,
    ));
  };

  const handleAcceptGroupInvite = async (conversation: ChatConversation): Promise<ChatConversation> => {
    const groupId = conversation.groupId || conversation.id.replace(/^study-/, '');
    const accepted = await api.groupChats.accept(groupId, authenticatedUser.id) as CoreGroupChat;
    const memberCount = Array.isArray(accepted.memberIds) ? accepted.memberIds.length : 1;
    let groupMessages: any[] = [];
    try {
      const result = await api.groupChats.getMessages(groupId);
      groupMessages = Array.isArray(result) ? result : [];
    } catch {}
    const sortedMessages = [...groupMessages].sort(
      (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
    );
    const lastMessage = sortedMessages[sortedMessages.length - 1];
    const updatedConversation: ChatConversation = {
      ...conversation,
      isInvitePending: false,
      subtitle: `${memberCount} ${memberCount === 1 ? 'member' : 'members'}`,
      lastMessage: lastMessage?.content || (
        lastMessage?.attachmentMimeType?.startsWith('image/')
          ? 'Photo'
          : lastMessage?.attachmentName || (lastMessage?.attachmentData ? 'Attachment' : 'No messages yet')
      ),
      lastMessageTime: lastMessage?.createdAt,
      lastTimestamp: lastMessage?.createdAt,
      messages: sortedMessages.map((message): ChatMessage => ({
        id: message.id,
        senderId: message.senderId,
        senderName: users[message.senderId]?.name || 'Network member',
        text: message.content,
        timestamp: relativeTimeForUploaded(message.createdAt),
        createdAt: message.createdAt,
        replyToId: message.replyToId ?? null,
        seenBy: Array.isArray(message.seenBy) ? message.seenBy : [],
        attachmentName: message.attachmentName,
        attachmentData: message.attachmentData,
        attachmentMimeType: message.attachmentMimeType,
        reactions: normalizeChatReactions(message.reactions),
      })),
    };
    setConversations((previous) => previous.map((item) =>
      item.id === conversation.id ? updatedConversation : item,
    ));
    return updatedConversation;
  };

  const handleDeclineGroupInvite = async (conversation: ChatConversation): Promise<void> => {
    const groupId = conversation.groupId || conversation.id.replace(/^study-/, '');
    await api.groupChats.decline(groupId, authenticatedUser.id);
    setConversations((previous) => previous.filter((item) => item.id !== conversation.id));
  };

  const handleOpenNetworkChallenge = () => {
    handleSelectTab('compete');
    setCompeteInitialTab('college-challenge');
  };

  const currentCommunity = communities.find((c) => c.slug === selectedCommunitySlug);

  useEffect(() => {
    if (!currentCommunity) return;
    let cancelled = false;
    const communityMap = Object.fromEntries(
      communities.map((community) => [community.id, community]),
    );
    const mergeCommunityPosts = (communityPosts: Post[]) => {
      const communityPostIds = new Set(communityPosts.map((post) => post.id));
      setPosts((previous) => [
        ...communityPosts,
        ...previous.filter((post) => !communityPostIds.has(post.id)),
      ]);
    };
    const cachedCommunityPosts = offlineSnapshot?.communityPosts?.[currentCommunity.id];
    if (cachedCommunityPosts?.length) {
      mergeCommunityPosts(cachedCommunityPosts.map((post) =>
        toUploadedPost(post, users, communityMap, authenticatedUser.id),
      ));
    }

    api.posts.getForCommunity(currentCommunity.id).then((result) => {
      if (cancelled || !Array.isArray(result)) return;
      const communityPosts = result.map((post) =>
        toUploadedPost(post, users, communityMap, authenticatedUser.id),
      );
      mergeCommunityPosts(communityPosts);
      void updateOfflineScreenSnapshot({
        userId: authenticatedUser.id,
        currentUser: authenticatedUser,
        communityPosts: { [currentCommunity.id]: result as CorePost[] },
      });
    }).catch(() => {
      // Keep the already-loaded feed available if the community refresh fails.
    });

    return () => {
      cancelled = true;
    };
  }, [authenticatedUser.id, authenticatedUser, communities, currentCommunity, offlineSnapshot, users]);

  const isCommunityChatScreen = activeTab === 'communities' && isCommunityChatActive;
  const shouldHideInstallAction = activeTab === 'chats' || isCommunityChatScreen;
  const isViewportLocked = activeTab === 'chats' || isCommunityChatScreen;
  const refreshAdminUsers = async () => {
    const next = await api.users.getAll();
    if (Array.isArray(next)) setAdminUsers(next as UserProfile[]);
  };
  const unreadNotificationsCount = notifications.filter((notification) => notification.unread).length;
  const handleNotificationOpened = (notification: NotificationItem) => {
    setNotificationFocus(null);

    if (notification.type === 'connection_request') {
      handleSelectTab('connect');
      return;
    }

    if (notification.type === 'community_invite' && notification.communityId) {
      const targetCommunity = communities.find((community) => community.id === notification.communityId);
      if (targetCommunity) {
        setSelectedCommunitySlug(targetCommunity.slug);
        setActiveTab('communities');
        setIsCommunityChatActive(false);
      } else {
        handleSelectTab('communities');
      }
      return;
    }

    if (notification.type === 'community_member_joined' && notification.communityId) {
      const targetCommunity = communities.find((community) => community.id === notification.communityId);
      if (targetCommunity) {
        setSelectedCommunitySlug(targetCommunity.slug);
        setActiveTab('communities');
        setIsCommunityChatActive(false);
      } else {
        handleSelectTab('communities');
      }
      return;
    }

    if (notification.type === 'community_quiz' && notification.communityId) {
      const targetCommunity = communities.find((community) => community.id === notification.communityId);
      if (targetCommunity) {
        setSelectedCommunitySlug(targetCommunity.slug);
        setActiveTab('communities');
        setIsCommunityChatActive(false);
        setCommunityQuizOpenRequest((request) => request + 1);
      } else {
        handleSelectTab('communities');
      }
      return;
    }

    if (notification.type === 'community' && notification.communityId) {
      setRequestedConversationId(`community-${notification.communityId}`);
      setSelectedCommunitySlug(null);
      setActiveTab('chats');
      return;
    }

    if (notification.type === 'group_message' && notification.groupId) {
      setRequestedConversationId(`study-${notification.groupId}`);
      setSelectedCommunitySlug(null);
      setActiveTab('chats');
      return;
    }

    if (notification.type === 'group_invite' && notification.groupId) {
      const groupId = notification.groupId;
      setRequestedConversationId(`study-${groupId}`);
      setSelectedCommunitySlug(null);
      setActiveTab('chats');
      if (!conversations.some((conversation) => conversation.groupId === groupId)) {
        void api.groupChats.getAll().then((result) => {
          if (!Array.isArray(result)) return;
          const group = result.find((item: any) =>
            item.id === groupId &&
            Array.isArray(item.pendingIds) &&
            item.pendingIds.includes(authenticatedUser.id),
          );
          if (!group) return;
          const invitation: ChatConversation = {
            id: `study-${group.id}`,
            groupId: group.id,
            type: 'study_group',
            isInvitePending: true,
            title: group.name,
            subtitle: 'Group invitation',
            communityName: group.name,
            lastMessage: 'You were invited to join this group',
            unreadCount: 0,
            messages: [],
          };
          setConversations((previous) => [
            invitation,
            ...previous.filter((item) => item.id !== invitation.id),
          ]);
        }).catch(() => {});
      }
      return;
    }

    if (notification.communityId) {
      const targetCommunity = communities.find((community) => community.id === notification.communityId);
      if (targetCommunity) {
        if (notification.postId) {
          setNotificationFocus({
            postId: notification.postId,
            reply: notification.type === 'reply',
          });
        }
        setSelectedCommunitySlug(targetCommunity.slug);
        setIsCommunityChatActive(false);
        setActiveTab('communities');
        return;
      }
    }

    if (notification.postId) {
      const targetPost = [...posts, ...homeFeedPosts].find((post) => post.id === notification.postId);
      if (targetPost) {
        const targetCommunity = communities.find((community) =>
          community.slug === targetPost.communitySlug ||
          communityMatchesSlug(community, targetPost.communitySlug),
        );
        setNotificationFocus({
          postId: notification.postId,
          reply: notification.type === 'reply',
        });
        if (targetCommunity) {
          setSelectedCommunitySlug(targetCommunity.slug);
          setActiveTab('communities');
          setIsCommunityChatActive(false);
        } else {
          setActiveTab('home');
        }
        return;
      }
    }

    if (notification.type === 'message' && notification.targetId) {
      setRequestedConversationId(`direct-${notification.targetId}`);
      setSelectedCommunitySlug(null);
      setActiveTab('chats');
      return;
    }

    if (notification.type === 'profile_view' && notification.targetId) {
      const actor = users[notification.targetId];
      if (actor) handleOpenProfile(actor);
      else handleSelectTab('connect');
      return;
    }

    if (notification.type === 'announcement') {
      handleSelectTab('communities');
    }
  };

  const handleUpdateCurrentUserProfile = async (updated: Partial<User>) => {
    const previousUser = currentUser;
    const nextUser = { ...previousUser, ...updated };
    setCurrentUser(nextUser);
    setActiveProfileUser((previous) => previous ? { ...previous, ...updated } : previous);
    setUsers((previous) => ({
      ...previous,
      [previousUser.id]: { ...previous[previousUser.id], ...updated },
    }));

    try {
      await api.users.update(previousUser.id, {
        fullName: updated.name ?? previousUser.name,
        avatar: updated.avatar ?? previousUser.avatar,
        college: updated.college ?? previousUser.college,
        schoolName: updated.schoolName ?? previousUser.schoolName ?? '',
        coachingName: updated.coachingName ?? previousUser.coachingName ?? '',
        location: updated.location ?? previousUser.location ?? '',
        branch: updated.branch ?? previousUser.branch,
        degree: updated.degree ?? previousUser.degree ?? '',
        academicStream: updated.academicStream ?? previousUser.academicStream ?? '',
        programGroup: updated.programGroup ?? previousUser.programGroup ?? updated.academicCategory ?? previousUser.academicCategory ?? '',
        fields: updated.fields ?? previousUser.fields ?? [],
        year: Number.parseInt(String(updated.year ?? previousUser.year ?? '0'), 10) || 1,
        aboutMe: updated.bio ?? previousUser.bio ?? '',
        interests: updated.interests ?? previousUser.interests ?? [],
        skills: updated.skills ?? previousUser.skills ?? [],
        lookingFor: updated.goals ?? previousUser.goals ?? [],
        connectPreference: updated.connectPreference ?? previousUser.connectPreference ?? null,
      });
    } catch (error) {
      setCurrentUser(previousUser);
      setActiveProfileUser((previous) => previous ? { ...previousUser } : previous);
      setUsers((previous) => ({
        ...previous,
        [previousUser.id]: previousUser,
      }));
      throw error;
    }
  };

  const handleUpdateDirectMessagePreference = async (
    preference: NonNullable<User['directMessagePreference']>,
  ) => {
    await api.safety.updateSettings(preference);
    setCurrentUser((previous) => ({ ...previous, directMessagePreference: preference }));
    setUsers((previous) => ({
      ...previous,
      [currentUser.id]: { ...previous[currentUser.id], directMessagePreference: preference },
    }));
  };

  const handleBlockUser = async (userId: string) => {
    await api.safety.block(userId);
    connectionsRef.current = connectionsRef.current.filter((connection) =>
      connection.senderId !== userId && connection.receiverId !== userId,
    );
    setConnections((previous) => {
      const next = previous.filter((connection) =>
        connection.senderId !== userId && connection.receiverId !== userId,
      );
      setUsers((currentUsers) => applyConnectionFlags(currentUsers, next, authenticatedUser.id));
      return next;
    });
    setConversations((previous) => previous.filter((conversation) =>
      conversation.type !== 'direct' ||
      (conversation.participant?.id !== userId && conversation.anonymousTargetId !== userId),
    ));
  };

  const handleReportUser = async (userId: string, reason: string, description: string) => {
    await api.reports.create({ reportedUserId: userId, reason, description });
  };

  return (
    <div className={`network-app-shell ${activeTab === 'chats' ? 'h-[100dvh] overflow-hidden' : isCommunityChatScreen ? 'h-[100dvh]' : 'min-h-screen'} bg-[#F8FAFC] text-[#0F172A] flex font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900`}>
      {/* 1. Sleek Glass Sidebar (Desktop) */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        currentUser={currentUser}
        communities={communities}
        onSelectCommunity={handleSelectCommunity}
        onOpenProfile={handleOpenProfile}
        unreadChatsCount={conversations.reduce((total, conversation) => total + conversation.unreadCount, 0)}
        onLogout={onLogout}
        onOpenInvite={() => setInviteSheet({})}
      />

      {/* 2. Main Content Area */}
      <div className={`main-content network-main-content flex flex-1 min-h-0 flex-col min-w-0 ${isViewportLocked ? 'h-[100dvh]' : 'h-screen'} ${
        activeTab === 'chats'
          ? 'chat-main-content overflow-hidden'
          : isCommunityChatScreen
            ? 'community-chat-main-content'
            : 'overflow-y-auto'
      }`}>
        {/* Top Navigation */}
        <div className={activeTab === 'chats' || isCommunityChatScreen ? 'hidden lg:block' : ''}>
          <Header
            currentUser={currentUser}
            communities={communities}
            users={users}
            posts={posts}
            notifications={notifications}
            activeTab={activeTab}
            onSelectCommunity={(slug) => {
              setSelectedCommunitySlug(slug);
              setActiveTab('communities');
              setIsCommunityChatActive(false);
            }}
            onOpenProfile={handleOpenProfile}
            onSelectTab={handleSelectTab}
            onMarkAllNotificationsRead={() => {
              api.notifications.markAllRead(authenticatedUser.id).catch(() => {});
              setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
            }}
            unreadNotificationsCount={unreadNotificationsCount}
            onMarkNotificationRead={(notificationId) => {
              api.notifications.markRead(notificationId).catch(() => {});
              setNotifications((prev) => prev.map((n) => n.id === notificationId ? { ...n, unread: false } : n));
            }}
            onOpenNotification={handleNotificationOpened}
            onOpenInvite={() => setInviteSheet({})}
            onOpenCreatePost={() => openCreatePostModal()}
            onLogout={onLogout}
            onNavigateFromLauncher={handleLauncherNavigation}
          />
        </div>

        {/* View Switcher */}
        <main className={`flex min-h-0 flex-1 w-full ${
          isViewportLocked ? 'pb-0 lg:pb-12' : 'pb-24 lg:pb-12'
        }`}>
          {selectedCommunitySlug && currentCommunity ? (
            /* Community Detail View */
            <CommunityDetailView
              key={currentCommunity.id}
              community={currentCommunity}
              posts={posts}
              users={users}
              currentUser={currentUser}
              communities={communities}
              conversations={conversations}
              onSendMessage={handleSendMessage}
              onBack={() => {
                setSelectedCommunitySlug(null);
                setIsCommunityChatActive(false);
                setIsChatKeyboardOpen(false);
              }}
              onSelectCommunity={handleSelectCommunity}
              onOpenProfile={handleOpenProfile}
              onToggleJoin={handleToggleJoinCommunity}
              onToggleUpvote={handleToggleUpvote}
              onToggleLike={handleToggleLike}
              onToggleSave={handleToggleSave}
              onDeletePost={handleDeleteCommunityPost}
               onEditPost={handleEditPost}
               onResharePost={handleResharePost}
                onSharePostToCommunity={handleSharePostToCommunity}
               onVotePoll={handleVotePoll}
              onCommunityUpdated={handleCommunityUpdated}
              onQuickPost={(type, title, content, postImage) =>
                handleCreatePost({
                  communitySlug: currentCommunity.slug,
                  type,
                  title,
                  content,
                  postImage,
                  tags: ['Discussion'],
                })
              }
              onAddComment={handleAddComment}
              focusPostId={notificationFocus?.postId}
              focusReply={notificationFocus?.reply}
              onFocusPostHandled={() => setNotificationFocus(null)}
              quizOpenRequest={communityQuizOpenRequest}
              currentUserId={authenticatedUser.id}
              onOpenCommunityChat={handleOpenCommunityChat}
              onOpenGroupChat={handleOpenCommunityGroup}
              onChatTabChange={setIsCommunityChatActive}
              onKeyboardVisibilityChange={setIsChatKeyboardOpen}
              onOpenInvite={(community) => setInviteSheet({ community })}
            />
          ) : activeTab === 'home' ? (
            /* Home Feed */
            <HomeFeed
              currentUser={currentUser}
              users={Object.values(users)}
              posts={homeFeedPosts}
              opportunities={opportunities}
              communities={communities}
              feedFilter={homeFeedFilter}
              isFeedLoading={homeFeedLoading}
              isLoadingMoreFeedPosts={homeFeedLoadingMore}
              feedError={homeFeedError}
              loadMoreFeedError={homeFeedLoadMoreError}
              hasMoreFeedPosts={homeFeedHasMore}
              onFeedFilterChange={(filter) => setHomeFeedFilter(filter)}
              onRetryFeed={() => void loadHomeFeed(homeFeedFilter)}
              onLoadMoreFeed={() => {
                if (!homeFeedLoading && !homeFeedLoadingMore && homeFeedHasMore) {
                  void loadHomeFeed(homeFeedFilter, homeFeedOffset, true);
                }
              }}
              onSelectCommunity={handleSelectCommunity}
              onSelectTab={handleSelectTab}
              onOpenNetworkChallenge={handleOpenNetworkChallenge}
              onOpenProfile={handleOpenProfile}
              onOpenOpportunity={(opp) => setActiveOpportunity(opp)}
              onToggleConnect={handleToggleConnect}
              onToggleUpvote={(postId) => handleToggleUpvote(postId, 1)}
              onToggleLike={handleToggleLike}
              onToggleSave={handleToggleSave}
              onEditPost={handleEditPost}
              onDeletePost={handleDeleteCommunityPost}
              onResharePost={handleResharePost}
              onSharePostToCommunity={handleSharePostToCommunity}
              onVotePoll={handleVotePoll}
              onAddComment={handleAddComment}
               focusPostId={notificationFocus?.postId}
               focusReply={notificationFocus?.reply}
               onFocusPostHandled={() => setNotificationFocus(null)}
              onToggleJoinCommunity={handleToggleJoinCommunity}
              onOpenCreatePost={openCreatePostModal}
              onStartAnonymousChat={handleStartAnonymousChat}
            />
          ) : activeTab === 'communities' ? (
            /* Communities Directory */
            <CommunitiesView
              communities={communities}
              posts={posts}
              currentUser={currentUser}
              users={Object.values(users)}
              onSelectCommunity={handleSelectCommunity}
              onOpenCreate={openCreateCommunityModal}
              onOpenProfile={handleOpenProfile}
              onToggleJoinCommunity={handleToggleJoinCommunity}
              onToggleUpvote={handleToggleUpvote}
              onToggleSave={handleToggleSave}
              onToggleSaveCommunity={handleToggleCommunitySave}
            />
          ) : activeTab === 'anonymous' ? (
            <AnonymousCampusView
              currentUser={currentUser}
              posts={posts}
              onCreatePost={handleCreateAnonymousPost}
              onToggleLike={handleToggleLike}
              onAddComment={handleAddComment}
              onStartAnonymousChat={handleStartAnonymousChat}
            />
          ) : activeTab === 'connect' ? (
            /* Connect / Mentors / Students Directory */
            <ConnectView
              users={users}
              communities={communities}
              currentUser={currentUser}
              connections={connections}
              onOpenCreatePost={openCreatePostModal}
              onOpenProfile={handleOpenProfile}
              onSelectCommunity={handleSelectCommunity}
              onToggleConnect={handleToggleConnect}
              onAcceptConnection={(connectionId) => handleConnectionStatus(connectionId, 'accepted')}
              onRejectConnection={(connectionId) => handleConnectionStatus(connectionId, 'rejected')}
              onToggleJoinCommunity={handleToggleJoinCommunity}
              onBookMentor={(mentor) => setActiveMentorBooking(mentor)}
              onStartDirectChat={handleStartDirectChat}
              onUpdateCurrentUserProfile={handleUpdateCurrentUserProfile}
            />
          ) : activeTab === 'compete' ? (
            examFocusedStudent ? (
              <ExamCompeteView
                currentUser={currentUser}
                communities={communities}
                onSelectCommunity={handleSelectCommunity}
                onSelectTab={handleSelectTab}
                onOpenCreatePost={openCreatePostModal}
              />
            ) : (
              <CompeteView
                currentUser={currentUser}
                users={Object.values(users)}
                initialTab={competeInitialTab}
                cachedCompetitions={offlineSnapshot?.competitions}
                onCacheCompetitions={persistCompetitionListings}
                onOpenProfile={handleOpenProfile}
                onToggleConnect={handleToggleConnect}
                onOpenCreatePost={openCreatePostModal}
              />
            )
          ) : activeTab === 'learn' ||
            activeTab === 'workshops' ||
            activeTab === 'resources' ||
            activeTab === 'mentors' ? (
            /* Dedicated learning pages */
            <LearnView
              key={`learning-page-${activeTab}`}
              topic={learningTopic}
              currentUser={currentUser}
              users={Object.values(users)}
              communities={communities}
              opportunities={opportunities}
              initialHubTab={activeTab === 'workshops' ? 'workshops' : 'resources_guidance'}
              initialSectionTab={
                activeTab === 'resources'
                  ? 'all'
                  : activeTab === 'mentors'
                    ? 'mentors'
                    : 'for_you'
              }
              pageTitle={
                activeTab === 'workshops'
                  ? 'Workshops & Events'
                  : activeTab === 'resources'
                    ? 'Resources'
                    : activeTab === 'mentors'
                      ? 'Guidance & Mentorship'
                      : 'Learn'
              }
              pageDescription={
                activeTab === 'workshops'
                  ? 'Technical workshops, webinars and college events for students.'
                  : activeTab === 'resources'
                    ? 'Notes, roadmaps, papers and learning material for your next step.'
                    : activeTab === 'mentors'
                      ? 'Career advice, internship guidance and learn from seniors.'
                      : 'Your learning roadmaps, saved resources, and study topics.'
              }
              showHubNavigation={false}
              showSectionNavigation={activeTab === 'learn'}
              showCompete
              competeContent={examFocusedStudent ? (
                <ExamCompeteView
                  currentUser={currentUser}
                  communities={communities}
                  onSelectCommunity={handleSelectCommunity}
                  onSelectTab={handleSelectTab}
                  onOpenCreatePost={openCreatePostModal}
                />
              ) : (
                <CompeteView
                  currentUser={currentUser}
                  users={Object.values(users)}
                  initialTab={competeInitialTab}
                  cachedCompetitions={offlineSnapshot?.competitions}
                  onCacheCompetitions={persistCompetitionListings}
                  onOpenProfile={handleOpenProfile}
                  onToggleConnect={handleToggleConnect}
                  onOpenCreatePost={openCreatePostModal}
                />
              )}
              onOpenProfile={handleOpenProfile}
              onSelectCommunity={handleSelectCommunity}
              onToggleJoinCommunity={handleToggleJoinCommunity}
              onOpenOpportunity={(opp) => setActiveOpportunity(opp)}
              onOpenRecommendQuiz={() => setIsRecommendModalOpen(true)}
              onShareWorkshop={openWorkshopSharePost}
            />
          ) : activeTab === 'my-space' ? (
            <MySpaceView
              communities={communities}
              conversations={conversations}
              currentUser={currentUser}
              onSelectCommunity={handleSelectCommunity}
              onBrowseCommunities={() => handleSelectTab('communities')}
              onOpenGroup={(conversationId) => {
                setRequestedConversationId(conversationId);
                handleSelectTab('chats', 'study_groups');
              }}
              onCreateCommunity={openCreateCommunityModal}
              onCreateGroup={() => {
                setRequestedConversationId(undefined);
                handleSelectTab('chats', 'study_groups');
              }}
            />
          ) : activeTab === 'chats' ? (
            /* Chats Dashboard */
            <ChatsView
              conversations={conversations}
              currentUser={currentUser}
              users={Object.values(users)}
              communities={communities}
              onOpenProfile={handleOpenProfile}
              onBlockUser={handleBlockUser}
              onReportUser={handleReportUser}
              onCreateGroup={handleCreateStandaloneGroup}
              onUpdateGroupVisibility={handleUpdateGroupVisibility}
              onInviteGroupMembers={handleInviteGroupMembers}
              onAcceptGroupInvite={handleAcceptGroupInvite}
              onDeclineGroupInvite={handleDeclineGroupInvite}
              onConversationOpened={handleConversationOpened}
              onConversationBack={handleConversationBack}
              onLoadOlderMessages={handleLoadOlderMessages}
              onSendMessage={handleSendMessage}
              onToggleReaction={handleToggleReaction}
              onKeyboardVisibilityChange={setIsChatKeyboardOpen}
              initialConversationId={requestedConversationId}
              initialTab={requestedChatTab}
              sharedGroupMessage={sharedGroupMessage}
            />
          ) : activeTab === 'admin' && currentUser.role === 'admin' ? (
            <div className="network-admin-page p-4 lg:p-8 max-w-7xl mx-auto w-full">
              <AdminSection
                currentUser={authenticatedUser}
                allUsers={adminUsers}
                reports={adminReports}
                posts={adminPosts}
                communities={adminCommunities}
                darkMode={false}
                onToggleUserSuspension={async (userId) => {
                  const updated = await api.users.toggleSuspend(userId);
                  if (updated?.isSuspended && updated?.suspensionEmailSent === false) {
                    window.alert('The account was suspended, but the notice email could not be sent.');
                  }
                  await refreshAdminUsers();
                }}
                onResolveReport={async (reportId, status) => {
                  await api.reports.update(reportId, status);
                  const next = await api.reports.getAll();
                  setAdminReports(Array.isArray(next) ? next as UserReport[] : []);
                }}
                onDeletePost={async (postId) => {
                   await api.posts.delete(postId, authenticatedUser.id);
                  setAdminPosts((prev) => prev.filter((post) => post.id !== postId));
                }}
                onAllUsersChange={setAdminUsers}
                onCommunitiesChange={setAdminCommunities}
              />
            </div>
          ) : null}
        </main>
      </div>

      {/* App installation action — hidden in Communities */}
      {!shouldHideInstallAction && activeTab !== 'communities' && (
        <InstallAppButton
          id="sleek-fab-install"
          className="fab hidden lg:flex fixed bottom-8 right-8 z-40 h-14 items-center justify-center gap-2 rounded-full bg-indigo-600 px-5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition-all duration-200 hover:bg-indigo-700 hover:scale-105 active:scale-95 disabled:cursor-wait disabled:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
        />
      )}

      {/* 4. Bottom Sticky Navigation Bar on Mobile */}
      <div className={`mobile-bottom-nav-container ${isCommunityChatActive ? 'community-chat-bottom-nav-hidden' : ''}`}>
        <BottomNav
          currentTab={activeTab}
          onSelectTab={handleSelectTab}
          unreadChatsCount={2}
          hideInstallAction={shouldHideInstallAction}
          showCompete={false}
        />
      </div>

      {/* 4. Modals and Overlays */}
      {/* Profile Modal (Image 6) */}
      {activeProfileUser && (
        <ProfileModal
          user={activeProfileUser}
          currentUser={currentUser}
          communities={communities}
          onClose={() => setActiveProfileUser(null)}
          onSelectCommunity={(slug) => {
            setActiveProfileUser(null);
            handleSelectCommunity(slug);
          }}
          onToggleConnect={handleToggleConnect}
          onStartDirectChat={handleStartDirectChat}
          onUpdateCurrentUserProfile={handleUpdateCurrentUserProfile}
          onUpdateDirectMessagePreference={handleUpdateDirectMessagePreference}
        />
      )}

      {/* Opportunity Detail Modal */}
      {activeOpportunity && (
        <OpportunityDetailModal
          opportunity={activeOpportunity}
          onClose={() => setActiveOpportunity(null)}
        />
      )}

      {/* Create Post / New Community Modal */}
      {isCreateModalOpen && (
        <CreatePostModal
          communities={communities}
          currentUser={currentUser}
          initialMode={initialCreateMode}
          initialRequestType={initialRequestType}
          initialCommunitySlug={initialDraftCommunitySlug}
          initialTitle={initialPostTitle}
          initialContent={initialPostContent}
          onClose={() => {
            setIsCreateModalOpen(false);
            setInitialCreateMode('post');
            setInitialRequestType(undefined);
            setInitialDraftCommunitySlug(undefined);
            setInitialPostTitle(undefined);
            setInitialPostContent(undefined);
          }}
          onCreatePost={handleCreatePost}
          onCreateCommunity={handleCreateCommunity}
          onOpenAnonymous={() => {
            setIsCreateModalOpen(false);
            setInitialCreateMode('post');
            setInitialRequestType(undefined);
            setInitialDraftCommunitySlug(undefined);
            setInitialPostTitle(undefined);
            setInitialPostContent(undefined);
            handleSelectTab('anonymous');
          }}
        />
      )}

      {/* Recommend Roadmap Modal */}
      {isRecommendModalOpen && (
        <RecommendRoadmapModal
          onClose={() => setIsRecommendModalOpen(false)}
          onSelectRoadmap={(slug) => {
            setSelectedCommunitySlug(slug);
            setActiveTab('communities');
          }}
        />
      )}

      {/* Book Mentor Modal */}
      {activeMentorBooking && (
        <BookMentorModal
          mentor={activeMentorBooking}
          onClose={() => setActiveMentorBooking(null)}
        />
      )}

      {inviteSheet && (
        <InviteSheet
          currentUser={currentUser}
          community={inviteSheet.community}
          onClose={() => {
            const onCancel = inviteSheet.onCancel;
            setInviteSheet(null);
            onCancel?.();
          }}
          onContinue={inviteSheet.onContinue
            ? () => {
                const onContinue = inviteSheet.onContinue;
                setInviteSheet(null);
                onContinue?.();
              }
            : undefined}
        />
      )}

      <StudentStarterTour
        currentUser={authenticatedUser}
        communities={communities}
        onSelectTab={handleSelectTab}
        onOpenInvite={(handlers) => setInviteSheet({ ...handlers })}
        onJoinCommunity={(community) => handleToggleJoinCommunity(community.slug)}
        onOpenCreatePost={openStudyPartnerPost}
        onOpenCommunity={(community) => {
          handleSelectTab('communities');
          handleSelectCommunity(community.slug);
        }}
      />
    </div>
  );
};

export default App;
