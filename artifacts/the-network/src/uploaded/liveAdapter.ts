import type {
  UserProfile,
  Post as ApiPost,
  Community as ApiCommunity,
  CampusEvent,
  DirectMessage,
  Notification as ApiNotification,
} from '../types';
import type {
  User,
  Community,
  Post,
  PostComment,
  ChatConversation,
  NotificationItem,
  Opportunity,
} from './types';
import { API_ORIGIN, resolveAssetUrl } from '../api';
import {
  compareConversationsByLatestActivity,
  sortChatMessagesChronologically,
} from './chatOrdering';

function isGeneratedInitialsAvatar(value: string | undefined): boolean {
  if (!value?.startsWith('data:image/svg+xml')) return false;

  const commaIndex = value.indexOf(',');
  if (commaIndex < 0) return false;

  try {
    const svg = decodeURIComponent(value.slice(commaIndex + 1));
    return svg.includes('<rect width="96" height="96" rx="48" fill="#4f46e5"/>')
      && svg.includes('font-size="32" font-weight="700"');
  } catch {
    return false;
  }
}

function avatarFor(value: string | undefined, name: string): string {
  const photo = value?.trim();
  if (photo && /^(https?:\/\/|data:|\/)/i.test(photo)) return resolveAssetUrl(photo) || photo;
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => Array.from(part)[0] || '')
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'N';
  const safeInitials = Array.from(initials, (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint >= 0xd800 && codePoint <= 0xdfff ? '\uFFFD' : character;
  }).join('').replace(/[&<>]/g, (character) => {
    if (character === '&') return '&amp;';
    if (character === '<') return '&lt;';
    return '&gt;';
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="48" fill="#4f46e5"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-size="32" font-weight="700">${safeInitials}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function anonymousAlias(userId: string): string {
  let hash = 0;
  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash * 31 + userId.charCodeAt(index)) >>> 0;
  }
  const code = (hash % 36 ** 4).toString(36).toUpperCase().padStart(4, '0');
  return `Anonymous student #${code}`;
}

export function anonymousUserFor(userId: string): User {
  return {
    id: `anonymous:${userId}`,
    name: anonymousAlias(userId),
    avatar: '',
    college: '',
    branch: '',
    verified: false,
    interests: [],
    skills: [],
    communities: [],
  };
}

export function slugFor(name: string): string {
  return `/${name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')}`;
}

export function toUploadedUser(profile: UserProfile): User {
  const profileAvatar = profile.avatar?.trim();
  const hasProfilePhoto = Boolean(
    profileAvatar &&
      /^(https?:\/\/|data:image\/|\/)/i.test(profileAvatar) &&
      !isGeneratedInitialsAvatar(profileAvatar),
  );
  return {
    id: profile.id,
    name: profile.fullName,
    email: profile.email,
    role: profile.role,
    createdAt: profile.createdAt,
    avatar: avatarFor(profileAvatar, profile.fullName),
    hasProfilePhoto,
    college: profile.college,
    schoolName: profile.schoolName || '',
    coachingName: profile.coachingName || '',
    location: profile.location || '',
    branch: profile.branch,
    degree: profile.degree || '',
    academicStream: profile.academicStream || '',
    programGroup: profile.programGroup || '',
    fields: profile.fields || [],
    academicCategory: profile.programGroup || '',
    year: String(profile.year || ''),
    verified: profile.isVerified,
    verifiedCollege: profile.isVerified ? profile.college : undefined,
    bio: profile.aboutMe,
    interests: profile.interests || [],
    skills: profile.skills || [],
    communities: [],
    goals: profile.lookingFor || [],
    connectPreference: profile.connectPreference || null,
    directMessagePreference: profile.privacySettings?.directMessages || 'connections',
    connectionsCount: 0,
    stats: { postsCount: 0, connectionsCount: 0, points: 0 },
  };
}

function relativeTime(value: string | undefined): string {
  if (!value) return 'Recently';
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return value;
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function toUploadedCommunity(
  community: ApiCommunity,
  currentUserId: string,
  currentUserRole?: User['role'],
): Community {
  const slug = slugFor(community.name);
  const memberIds = Array.isArray(community.memberIds) ? community.memberIds : [];
  const adminIds = Array.isArray(community.adminIds) ? community.adminIds : [];
  const blockedMemberIds = Array.isArray(community.blockedMemberIds) ? community.blockedMemberIds : [];
  const category = community.category?.toLowerCase().includes('career')
    ? 'career'
    : community.college
      ? 'college'
      : 'interest';
  return {
    id: community.id,
    slug,
    name: community.name,
    displayName: community.name,
    iconType: 'users',
    iconBg: 'bg-indigo-100 text-indigo-700',
    description: community.description,
    tags: Array.isArray(community.tags) ? community.tags : [],
    memberIds,
    creatorId: community.creatorId,
    adminIds,
    blockedMemberIds,
    membersCount: memberIds.length,
    onlineCount: 0,
    category,
    isJoined: memberIds.includes(currentUserId),
    isAdmin: currentUserRole === 'admin' || community.creatorId === currentUserId || adminIds.includes(currentUserId),
    isBlocked: blockedMemberIds.includes(currentUserId),
    isSaved: Boolean((community as any).isSaved),
    rules: ['Be respectful to all peers', 'Share verified notes and resources', 'No spam'],
    createdDate: 'Recently',
  };
}

export function toUploadedPost(
  post: ApiPost,
  usersById: Record<string, User>,
  communitiesById: Record<string, Community>,
  currentUserId: string,
): Post {
  const realAuthor = usersById[post.authorId] || {
    id: post.authorId,
    name: 'Network member',
    avatar: avatarFor('', 'Network member'),
    college: '',
    branch: '',
    verified: false,
    interests: [],
    skills: [],
    communities: [],
  };
  // Older API deployments may omit isAnonymous while still preserving the
  // server-enforced anonymous topic marker. Treat both shapes consistently.
  const isAnonymous = Boolean(
    post.isAnonymous ||
    (typeof post.academicTag === 'string' && post.academicTag.trim().toLowerCase().startsWith('anonymous topic:'))
  );
  const author = isAnonymous ? anonymousUserFor(post.authorId) : realAuthor;
  const community = post.communityId ? communitiesById[post.communityId] : undefined;
  const likes = Array.isArray(post.likes) ? post.likes : [];
  const votes = post.votes && typeof post.votes === 'object' ? post.votes : {};
  const voteEntries = Object.entries(votes).filter(
    ([, value]) => value === 1 || value === -1,
  ) as Array<[string, 1 | -1]>;
  const voteScore = voteEntries.reduce((total, [, value]) => total + value, 0);
  const comments: PostComment[] = (post.comments || []).map((comment: any) => ({
    id: comment.id,
    isAnonymous: Boolean(comment.isAnonymous),
    replyToId: comment.replyToId ?? comment.reply_to_id ?? null,
    author: comment.isAnonymous
      ? anonymousUserFor(comment.authorId)
      : usersById[comment.authorId] || author,
    content: comment.content,
    timestamp: relativeTime(comment.createdAt),
    upvotes: 0,
  }));
  const title = post.projectTitle || post.academicTag || 'Discussion';
  const normalizedTag = typeof post.academicTag === 'string' ? post.academicTag.trim().toLowerCase() : '';
  // The API stores a post title in projectTitle for historical reasons. Prefer
  // the explicit type tag so titled resources and questions are not displayed
  // as projects.
  const type = isAnonymous
    ? 'post'
    : normalizedTag === 'resource'
      ? 'resource'
      : normalizedTag === 'question'
        ? 'question'
        : normalizedTag === 'project'
          ? 'project'
          : normalizedTag.startsWith('looking for:')
            ? 'collab'
            : normalizedTag.includes('hackathon')
              ? 'hackathon'
              : post.pollOptions?.length
                ? 'question'
                : post.projectTitle
                  ? 'project'
                  : 'post';
  const pollOptions = Array.isArray(post.pollOptions) ? post.pollOptions : [];
  const pollVotes =
    post.pollVotes && typeof post.pollVotes === 'object'
      ? post.pollVotes as Record<string, number>
      : {};
  const pollVoteEntries = Object.entries(pollVotes)
    .filter(([, optionIndex]) =>
      Number.isInteger(optionIndex) && optionIndex >= 0 && optionIndex < pollOptions.length,
    )
    .sort(([leftId], [rightId]) =>
      leftId === currentUserId ? -1 : rightId === currentUserId ? 1 : 0,
    );
  const persistedTags = Array.isArray(post.tags) ? post.tags : [];
  const rawPostImages = Array.isArray(post.postImages)
    ? post.postImages.filter((image): image is string => typeof image === 'string' && image.length > 0)
    : post.postImage
      ? [post.postImage]
      : [];
  const postImages = rawPostImages.map((image) =>
    image.startsWith('/') ? `${API_ORIGIN}${image}` : image,
  );
  return {
    id: post.id,
    isAnonymous,
    author,
    communitySlug: community?.slug || '/general',
    communityName: community?.name || 'The Network',
    timestamp: relativeTime(post.createdAt),
    type,
    title,
    content: post.content,
    websiteUrl: post.websiteUrl ?? undefined,
    postImage: postImages[0],
    postImages,
    tags: [...new Set([...persistedTags, post.academicTag, post.feeling].filter(Boolean) as string[])],
    upvotes: voteScore,
    votes: Object.fromEntries(voteEntries),
    userVote: voteEntries.find(([userId]) => userId === currentUserId)?.[1] ?? null,
    commentsCount: comments.length,
    comments,
    saved: false,
    liked: likes.includes(currentUserId),
    likesCount: likes.length,
    attachment: post.attachment
      ? {
          name: post.attachment.name,
          size: '',
          type: post.attachment.mimeType || undefined,
          url: post.attachment.url,
        }
      : undefined,
    githubRepo: undefined,
    pollData: pollOptions.length
      ? {
          question: title,
          options: pollOptions.map((text, index) => ({
            id: String(index),
            text,
            votes: pollVoteEntries.filter(([, optionIndex]) => optionIndex === index).length,
            voters: pollVoteEntries
              .filter(([, optionIndex]) => optionIndex === index)
              .flatMap(([voterId]) => {
                const voter = usersById[voterId];
                return voter
                  ? [{ id: voter.id, name: voter.name, avatar: voter.avatar }]
                  : [];
              }),
          })),
          totalVotes: pollVoteEntries.length,
          userVotedOptionId: pollVoteEntries.find(([voterId]) => voterId === currentUserId)
            ? String(pollVotes[currentUserId])
            : undefined,
        }
      : undefined,
     resharedFromId: post.resharedFromId ?? null,
  };
}

export function toUploadedConversations(
  messages: DirectMessage[],
  usersById: Record<string, User>,
  currentUserId: string,
): ChatConversation[] {
  const grouped = new Map<string, DirectMessage[]>();
  for (const message of messages) {
    const otherId = message.senderId === currentUserId ? message.receiverId : message.senderId;
    const existing = grouped.get(otherId) || [];
    existing.push(message);
    grouped.set(otherId, existing);
  }
  return [...grouped.entries()].map(([otherId, items]) => {
    const hasAnonymousMessages = items.some((message) => message.isAnonymous);
    const anonymousPostId = items.find((message) => message.anonymousPostId)?.anonymousPostId;
    const participant = usersById[otherId] || {
      id: otherId,
      name: 'Network member',
      avatar: avatarFor('', 'Network member'),
      college: '',
      branch: '',
      verified: false,
      interests: [],
      skills: [],
      communities: [],
    };
    const sorted = [...items].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
        String(a.id).localeCompare(String(b.id)),
    );
    const last = sorted[sorted.length - 1];
    return {
      id: hasAnonymousMessages ? `anonymous-${otherId}` : `direct-${otherId}`,
      type: 'direct' as const,
      title: hasAnonymousMessages ? 'Anonymous person' : participant.name,
      subtitle: hasAnonymousMessages ? 'Private anonymous chat' : `${participant.college}${participant.branch ? ` · ${participant.branch}` : ''}`,
      avatar: hasAnonymousMessages ? '' : participant.avatar,
      online: false,
      verified: hasAnonymousMessages ? false : participant.verified,
      participant: hasAnonymousMessages ? { ...participant, id: `anonymous-${otherId}`, name: 'Anonymous person', avatar: '', college: '', branch: '', verified: false } : participant,
      anonymousTargetId: hasAnonymousMessages ? otherId : undefined,
      anonymousPostId: hasAnonymousMessages ? anonymousPostId : undefined,
    lastMessage: last?.content || (
      last?.attachmentMimeType?.startsWith('image/')
        ? 'Photo'
        : last?.attachmentName || (last?.attachmentData ? 'Attachment' : '')
    ),
      lastMessageTime: relativeTime(last?.createdAt),
      lastTimestamp: last?.createdAt,
      lastMessageId: last?.id,
      unreadCount: Math.max(
        ...sorted.map((message) => Number(message.unreadCount) || 0),
        sorted.filter((message) => message.receiverId === currentUserId && !message.isRead).length,
      ),
      messages: sorted.map((message) => ({
        id: message.id,
        clientMessageId: message.clientMessageId,
        senderId: message.senderId,
        senderName: message.isAnonymous ? 'Anonymous person' : usersById[message.senderId]?.name || 'Network member',
        text: message.content,
        timestamp: relativeTime(message.createdAt),
        createdAt: message.createdAt,
        read: message.isRead,
        replyToId: message.replyToId ?? null,
        attachmentName: message.attachmentName,
        attachmentData: message.attachmentData,
        attachmentMimeType: message.attachmentMimeType,
        reactions: normalizeChatReactions(message.reactions),
      })),
    };
  }).sort((a, b) => {
    const aTime = a.lastTimestamp ? new Date(a.lastTimestamp).getTime() : 0;
    const bTime = b.lastTimestamp ? new Date(b.lastTimestamp).getTime() : 0;
    return bTime - aTime || String(b.lastMessageId || '').localeCompare(String(a.lastMessageId || ''));
  });
}

export function ensureDirectConversation(
  conversations: ChatConversation[],
  participant: User,
): { conversation: ChatConversation; conversations: ChatConversation[] } {
  const conversationId = `direct-${participant.id}`;
  const existing = conversations.find((conversation) =>
    conversation.type === 'direct' &&
    (
      conversation.id === conversationId ||
      (
        !conversation.anonymousPostId &&
        !conversation.anonymousTargetId &&
        conversation.participant?.id === participant.id
      )
    ),
  );
  const conversation: ChatConversation = {
    id: conversationId,
    type: 'direct',
    title: participant.name,
    subtitle: `${participant.college}${participant.branch ? ` · ${participant.branch}` : ''}`,
    avatar: participant.avatar,
    online: Boolean(participant.isOnline),
    verified: participant.verified,
    participant,
    lastMessage: existing?.messages.length ? existing.lastMessage : 'Start a conversation',
    lastMessageTime: existing?.lastMessageTime,
    lastTimestamp: existing?.lastTimestamp,
      lastMessageId: existing?.lastMessageId,
    unreadCount: existing?.unreadCount ?? 0,
    messages: existing?.messages ?? [],
  };
  const remaining = conversations.filter(
    (item) => item !== existing && item.id !== conversationId,
  );

  return {
    conversation,
    conversations: [conversation, ...remaining],
  };
}

export function mergeDirectConversationRefresh(
  previous: ChatConversation[],
  refreshedDirect: ChatConversation[],
  isIncremental: boolean,
  currentUserId: string,
): ChatConversation[] {
  const existingById = new Map(previous.map((conversation) => [conversation.id, conversation]));
  const mergedDirect = refreshedDirect.map((conversation) => {
    const existing = existingById.get(conversation.id);
    if (!existing) return conversation;

    const incomingIds = new Set(conversation.messages.map((message) => message.id));
    const incomingClientIds = new Set(
      conversation.messages.map((message) => message.clientMessageId).filter(Boolean),
    );
    const existingIds = new Set(existing.messages.map((message) => message.id));
    const newlyUnreadCount = isIncremental
      ? conversation.messages.filter((message) =>
          !existingIds.has(message.id) &&
          message.senderId !== currentUserId &&
          message.read !== true,
        ).length
      : 0;
    const mergedMessages = existing.messages.filter((message) =>
      !incomingIds.has(message.id) &&
      !(message.id.startsWith('pending-') && message.clientMessageId && incomingClientIds.has(message.clientMessageId)),
    );
    mergedMessages.push(...conversation.messages);
    const sortedMessages = sortChatMessagesChronologically(mergedMessages);
    const latest = sortedMessages[sortedMessages.length - 1];

    return {
      ...conversation,
      unreadCount: isIncremental
        ? existing.unreadCount + newlyUnreadCount
        : conversation.unreadCount,
      messages: sortedMessages,
      lastMessage: latest
        ? latest.text || latest.attachmentName || (latest.sharedPost ? 'Shared a post' : 'Attachment')
        : conversation.lastMessage || existing.lastMessage,
      lastTimestamp: latest?.createdAt || conversation.lastTimestamp || existing.lastTimestamp,
      lastMessageTime: latest?.createdAt || conversation.lastMessageTime || existing.lastMessageTime,
      lastMessageId: latest?.id || conversation.lastMessageId || existing.lastMessageId,
    };
  });

  const refreshedIds = new Set(mergedDirect.map((conversation) => conversation.id));
  // A recent-message snapshot can be partial (for example, from an older API
  // that applied its limit globally). Do not erase other conversations just
  // because they were not present in this refresh.
  const retainedDirect = previous.filter((conversation) =>
    conversation.type === 'direct' && !refreshedIds.has(conversation.id),
  );
  const nonDirect = previous.filter((conversation) => conversation.type !== 'direct');
  return [...mergedDirect, ...retainedDirect, ...nonDirect].sort(
    compareConversationsByLatestActivity,
  );
}

export function normalizeChatReactions(
  reactions: Record<string, string[]> | null | undefined,
): { emoji: string; count: number; users: string[] }[] {
  if (!reactions || typeof reactions !== 'object') return [];
  return Object.entries(reactions)
    .filter(([, users]) => Array.isArray(users) && users.length > 0)
    .map(([emoji, users]) => ({ emoji, count: users.length, users: users.map(String) }));
}

export function toUploadedNotifications(items: ApiNotification[]): NotificationItem[] {
  return items.map((item) => {
    const communityId = item.body.match(/\[\[community:([^\]]+)\]\]/)?.[1];
    const quizId = item.body.match(/\[\[quiz:([^\]]+)\]\]/)?.[1];
    const postId = item.body.match(/\[\[post:([^\]]+)\]\]/)?.[1];
    const groupId = item.body.match(/\[\[group:([^\]]+)\]\]/)?.[1];
    const projectId = item.body.match(/\[\[project:([^\]]+)\]\]/)?.[1];
    const subtitle = item.body
      .replace(/\s*\[\[(?:community|quiz|post|group|project):[^\]]+\]\]/g, '')
      .trim();

    return {
      id: item.id,
      type:
        item.type === 'community_quiz'
          ? 'community_quiz'
          : item.type === 'like'
          ? 'upvote'
          : item.type === 'connection_request'
            ? 'connection_request'
            : item.type === 'connection_accepted'
              ? 'connection_accepted'
            : item.type === 'message' || item.type === 'group_message'
              ? item.type === 'group_message' ? 'group_message' : 'message'
              : item.type === 'mention'
                ? 'mention'
              : item.type === 'community_message'
                ? 'community'
                : item.type === 'community_post'
                  ? 'community_post'
                 : item.type === 'poll'
                   ? 'poll'
                : item.type === 'community_invite'
                  ? 'community_invite'
                : item.type === 'community_member_joined'
                  ? 'community_member_joined'
                  : item.type === 'group_invite'
                    ? 'group_invite'
                  : item.type === 'project_message'
                    ? 'project_message'
                    : item.type === 'profile_view'
                      ? 'profile_view'
                      : item.type === 'announcement'
                        ? 'announcement'
                        : 'reply',
      title: item.title,
      subtitle,
      timestamp: relativeTime(item.createdAt),
      unread: !item.isRead,
      targetId: postId || (
        item.type === 'message' || item.type === 'profile_view' ? item.actorId : undefined
      ),
      actorId: item.actorId,
      communityId,
      quizId,
      groupId,
      projectId,
      postId,
    };
  });
}

export function toUploadedOpportunity(event: CampusEvent): Opportunity {
  const normalizedCategory = String(event.category || '').trim().toLowerCase();
  const category = (
    ['hackathon', 'internship', 'competition', 'scholarship', 'research', 'workshop', 'campus']
      .find((value) => value === normalizedCategory)
      ?.replace(/^\w/, (letter) => letter.toUpperCase())
      || 'Campus'
  ) as Opportunity['category'];
  const date = new Date(event.date);
  const daysLeft = Number.isFinite(date.getTime())
    ? Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000))
    : 0;
  return {
    id: event.id,
    title: event.title,
    category,
    description: event.description,
    tags: [event.college, event.isOnline ? 'Online' : event.venue].filter(Boolean),
    prizeOrStipend: event.maxSeats ? `${event.maxSeats} seats` : 'Open opportunity',
    daysLeft,
    deadlineDate: event.date,
    location: event.isOnline ? 'Online' : event.venue,
    applyLink: event.link || undefined,
    isSaved: false,
  };
}