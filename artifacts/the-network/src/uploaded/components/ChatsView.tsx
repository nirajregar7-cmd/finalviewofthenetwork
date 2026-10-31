import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Send,
  Plus,
  MoreVertical,
  CheckCheck,
  Check,
  LoaderCircle,
  ChevronLeft,
  Copy,
  Globe,
  Image as ImageIcon,
  Bell,
  Lock,
  Smile,
  Mic,
  X,
  FileText,
  Reply,
  UserPlus,
  ShieldAlert,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { api, PUBLIC_APP_URL } from '../../api';
import { ChatConversation, ChatMessage, Community, User } from '../types';
import {
  compareConversationsByLatestActivity,
  sortChatMessagesChronologically,
} from '../chatOrdering';
import { CHAT_TAB_CONVERSATION_TYPE } from '../chatConversationTabs';
import { formatChatMessageTime, getChatDayMarker } from '../chatTimestamps';
import { SafeAvatar } from './SafeAvatar';
import { SharedPostPreview } from './SharedPostPreview';
import { LinkifiedText } from './LinkPreview';
import { ChatMessageDraftInput, type ChatMessageDraftHandle } from './ChatMessageDraftInput';
import confetti from 'canvas-confetti';

const CHAT_REACTION_EMOJIS = [
  '❤️', '👍', '😂', '😮', '😢', '🙏', '🔥', '👏', '🎉', '😍',
  '🤔', '😡', '💯', '✅', '🚀', '💪', '🙌', '👀', '🥳', '😎',
];

const CHAT_EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '🙂',
  '🙃', '😉', '😌', '😍', '🥰', '😘', '😎', '🤩', '🥳', '🤗',
  '🤔', '😐', '😶', '🙄', '😏', '😢', '😭', '😤', '😡', '🤯',
  '😴', '🤝', '👏', '🙌', '👍', '👎', '🙏', '💪', '🔥', '✨',
  '🎉', '💯', '✅', '🚀', '💡', '❤️', '💙', '💚', '💛', '💜',
];

const CHAT_STICKERS = ['🥳', '🤩', '😎', '😂', '😭', '🤗', '🙌', '🔥', '💯', '🚀', '💖', '🎉'];

interface ChatsViewProps {
  conversations: ChatConversation[];
  currentUser: User;
  users?: User[];
  communities?: Community[];
  onOpenProfile: (user: User) => void;
  onOpenSafetyOptions?: (user: User) => void;
  onCreateGroup?: (input: {
    name: string;
    description: string;
    inviteUserIds: string[];
    purpose: 'study' | 'chat';
    visibility: 'public' | 'private';
  }) => Promise<ChatConversation>;
  onUpdateGroupVisibility?: (
    conversation: ChatConversation,
    visibility: 'public' | 'private',
  ) => Promise<void>;
  onInviteGroupMembers?: (conversation: ChatConversation, userIds: string[]) => Promise<void>;
  onAcceptGroupInvite?: (conversation: ChatConversation) => Promise<ChatConversation>;
  onDeclineGroupInvite?: (conversation: ChatConversation) => Promise<void>;
  onConversationOpened?: (conversation: ChatConversation) => void;
  onConversationBack?: () => void;
  onLoadOlderMessages?: (conversation: ChatConversation) => Promise<{ loaded: number; hasMore: boolean }>;
  onSendMessage: (
    conversationId: string,
    text: string,
    attachment?: { name: string; data: string; mimeType: string },
    options?: { replyToId?: string },
  ) => Promise<void> | void;
  onToggleReaction?: (conversationId: string, messageId: string, emoji: string) => Promise<void> | void;
  onKeyboardVisibilityChange?: (isOpen: boolean) => void;
  initialConversationId?: string;
  sharedGroupMessage?: string | null;
  initialTab?: 'direct' | 'communities' | 'study_groups';
}

export const ChatsView: React.FC<ChatsViewProps> = ({
  conversations,
  currentUser,
  users = [],
  communities = [],
  onOpenProfile,
  onOpenSafetyOptions,
  onCreateGroup,
  onAcceptGroupInvite,
  onDeclineGroupInvite,
  onConversationOpened,
  onConversationBack,
  onLoadOlderMessages,
  onSendMessage,
  onToggleReaction,
  onKeyboardVisibilityChange,
  initialConversationId,
  initialTab = 'direct',
  onUpdateGroupVisibility,
  onInviteGroupMembers,
  sharedGroupMessage,
}) => {
  const [activeTab, setActiveTab] = useState<'direct' | 'communities' | 'study_groups'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState<string>(
    conversations[0]?.id || 'conv-1'
  );
  const messageInputRef = useRef<ChatMessageDraftHandle>(null);
  const [showMobileThread, setShowMobileThread] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [reactionMenuFor, setReactionMenuFor] = useState<string | null>(null);
  const [actionMenuFor, setActionMenuFor] = useState<string | null>(null);
  const [attachmentDraft, setAttachmentDraft] = useState<{ name: string; data: string; mimeType: string } | null>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [emojiPickerTab, setEmojiPickerTab] = useState<'emoji' | 'sticker'>('emoji');
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [visibleViewportHeight, setVisibleViewportHeight] = useState<number | null>(null);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCommunityInfo, setShowCommunityInfo] = useState(false);
  const [communityMemberSearch, setCommunityMemberSearch] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupPurpose, setNewGroupPurpose] = useState<'study' | 'chat'>('study');
  const [newGroupVisibility, setNewGroupVisibility] = useState<'public' | 'private'>('private');
  const [groupInviteSearch, setGroupInviteSearch] = useState('');
  const [groupInviteIds, setGroupInviteIds] = useState<Set<string>>(() => new Set());
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [createGroupError, setCreateGroupError] = useState<string | null>(null);
  const [showGroupActions, setShowGroupActions] = useState(false);
  const [showGroupLinkField, setShowGroupLinkField] = useState(false);
  const [showManageInvites, setShowManageInvites] = useState(false);
  const [manageInviteSearch, setManageInviteSearch] = useState('');
  const [manageInviteIds, setManageInviteIds] = useState<Set<string>>(() => new Set());
  const [invitingGroupMembers, setInvitingGroupMembers] = useState(false);
  const [savingGroupVisibility, setSavingGroupVisibility] = useState(false);
  const [groupManagementNotice, setGroupManagementNotice] = useState<string | null>(null);
  const [groupManagementError, setGroupManagementError] = useState<string | null>(null);
  const [groupInviteActionId, setGroupInviteActionId] = useState<string | null>(null);
  const [groupInviteError, setGroupInviteError] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);
  const lightboxCloseButtonRef = useRef<HTMLButtonElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const lastSeenMessageByConversationRef = useRef(new Map<string, string>());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoOpenedConversationRef = useRef<string | null>(null);
  const sendLockRef = useRef(false);
  const loadingOlderRef = useRef(false);
  const noMoreHistoryRef = useRef(new Set<string>());
  const skipNextAutoScrollRef = useRef(false);

  useEffect(() => {
    if (!lightboxImage) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightboxImage(null);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    lightboxCloseButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lightboxImage]);

  useEffect(() => {
    if (!showCommunityInfo) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowCommunityInfo(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showCommunityInfo]);

  const activeConv =
    conversations.find((c) =>
      c.id === selectedConversationId &&
      c.type === CHAT_TAB_CONVERSATION_TYPE[activeTab] &&
      !c.isInvitePending,
    ) ||
    conversations.find((c) =>
      c.type === CHAT_TAB_CONVERSATION_TYPE[activeTab] && !c.isInvitePending,
    );
  const activeCommunity = activeConv?.type === 'community'
    ? communities.find((community) =>
        community.slug === activeConv.communitySlug ||
        activeConv.id === `community-${community.id}`,
      )
    : undefined;
  const communityMemberRows = useMemo(() => {
    if (!activeCommunity) return [];
    const userById = new Map(users.map((user) => [user.id, user]));
    const adminIds = new Set([activeCommunity.creatorId, ...(activeCommunity.adminIds || [])].filter(Boolean));
    const query = communityMemberSearch.trim().toLocaleLowerCase();
    return (activeCommunity.memberIds || [])
      .map((id) => ({ id, user: userById.get(id), isAdmin: adminIds.has(id) }))
      .filter(({ user }) => Boolean(user) && (!query || [
        user?.name,
        user?.college,
        user?.branch,
      ].some((value) => value?.toLocaleLowerCase().includes(query))))
      .sort((first, second) =>
        Number(second.isAdmin) - Number(first.isAdmin) ||
        Number(Boolean(second.user?.isOnline)) - Number(Boolean(first.user?.isOnline)) ||
        (first.user?.name || '').localeCompare(second.user?.name || ''),
      );
  }, [activeCommunity, communityMemberSearch, users]);
  const visibleCommunityMemberCount = activeCommunity?.memberIds
    ?.filter((id) => users.some((user) => user.id === id)).length || 0;
  const visibleMessages = useMemo(() => {
    const result: ChatMessage[] = [];
    const indexByMessageKey = new Map<string, number>();
    for (const message of activeConv?.messages || []) {
      const messageKey = message.clientMessageId || message.id;
      const existingIndex = indexByMessageKey.get(messageKey);
      if (existingIndex === undefined) {
        indexByMessageKey.set(messageKey, result.length);
        result.push(message);
        continue;
      }

      // The optimistic row and the SSE/POST row can coexist briefly. Prefer
      // the durable row immediately so the sender never sees a double bubble.
      const existing = result[existingIndex];
      if (existing.id.startsWith('pending-') && !message.id.startsWith('pending-')) {
        result[existingIndex] = message;
      }
    }
    return sortChatMessagesChronologically(result);
  }, [activeConv?.messages]);

  const markSeenThrough = (conversation: ChatConversation | undefined, messageId?: string) => {
    if (
      !conversation ||
      !messageId ||
      messageId.startsWith('pending-') ||
      document.visibilityState === 'hidden' ||
      (conversation.type !== 'community' && conversation.type !== 'study_group')
    ) return;

    const previousMessageId = lastSeenMessageByConversationRef.current.get(conversation.id);
    if (previousMessageId === messageId) return;
    lastSeenMessageByConversationRef.current.set(conversation.id, messageId);

    const request = conversation.type === 'community'
      ? api.entityMessages.markSeen('community', conversation.id.replace(/^community-/, ''), messageId)
      : api.groupChats.markSeen(
          conversation.groupId || conversation.id.replace(/^study-/, ''),
          messageId,
        );
    void request.catch(() => {
      if (lastSeenMessageByConversationRef.current.get(conversation.id) === messageId) {
        lastSeenMessageByConversationRef.current.delete(conversation.id);
      }
    });
  };

  const markLatestMessageSeen = (conversation: ChatConversation | undefined = activeConv) => {
    markSeenThrough(conversation, visibleMessages[visibleMessages.length - 1]?.id);
  };

  useEffect(() => {
    setShowGroupActions(false);
    setShowGroupLinkField(false);
    setShowManageInvites(false);
    setGroupManagementNotice(null);
    setGroupManagementError(null);
  }, [activeConv?.id]);

  useEffect(() => {
    setReplyingTo(null);
    setReactionMenuFor(null);
    setActionMenuFor(null);
    setActionError(null);
  }, [activeConv?.id]);

  const scrollMessagesToBottom = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const node = messagesRef.current;
        if (node) {
          node.scrollTo({ top: node.scrollHeight, behavior: 'auto' });
          markLatestMessageSeen();
        }
      });
    });
  };

  const openConversation = (conversation: ChatConversation) => {
    setSelectedConversationId(conversation.id);
    setShowMobileThread(true);
    autoOpenedConversationRef.current = conversation.id;
    onConversationOpened?.(conversation);
  };

  const loadOlderMessages = async () => {
    const node = messagesRef.current;
    const conversation = activeConv;
    if (!node || !conversation || !onLoadOlderMessages || node.scrollTop > 48
      || loadingOlderRef.current || noMoreHistoryRef.current.has(conversation.id)) return;
    loadingOlderRef.current = true;
    setLoadingOlderMessages(true);
    const oldHeight = node.scrollHeight;
    const oldTop = node.scrollTop;
    skipNextAutoScrollRef.current = true;
    try {
      const result = await onLoadOlderMessages(conversation);
      if (!result.hasMore) noMoreHistoryRef.current.add(conversation.id);
      if (result.loaded > 0) {
        requestAnimationFrame(() => {
          const currentNode = messagesRef.current;
          if (currentNode) currentNode.scrollTop = currentNode.scrollHeight - oldHeight + oldTop;
        });
      } else {
        skipNextAutoScrollRef.current = false;
      }
    } catch {
      skipNextAutoScrollRef.current = false;
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlderMessages(false);
    }
  };

  const closeMobileThread = () => {
    setShowMobileThread(false);
    setEmojiPickerOpen(false);
    setReplyingTo(null);
    setReactionMenuFor(null);
    setActionMenuFor(null);
    onConversationBack?.();
  };

  useEffect(() => {
    if (!initialConversationId) return;
    const target = conversations.find((conversation) => conversation.id === initialConversationId);
    if (target) {
      if (target.type === 'community') setActiveTab('communities');
      if (target.type === 'study_group') setActiveTab('study_groups');
      if (target.type === 'direct') setActiveTab('direct');
      if (target.isInvitePending) {
        setSelectedConversationId('');
        setShowMobileThread(false);
        return;
      }
      setSelectedConversationId(target.id);
      setShowMobileThread(true);
      if (autoOpenedConversationRef.current !== target.id) {
        autoOpenedConversationRef.current = target.id;
        onConversationOpened?.(target);
      }
    }
  }, [initialConversationId, conversations]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const updateViewport = () => {
      const heightDifference = window.innerHeight - viewport.height;
      const isOpen = heightDifference > 120;
      setKeyboardOpen(isOpen);
      setVisibleViewportHeight(isOpen ? viewport.height : null);
      onKeyboardVisibilityChange?.(isOpen);
    };

    updateViewport();
    viewport.addEventListener('resize', updateViewport);
    viewport.addEventListener('scroll', updateViewport);
    window.addEventListener('resize', updateViewport);
    return () => {
      viewport.removeEventListener('resize', updateViewport);
      viewport.removeEventListener('scroll', updateViewport);
      window.removeEventListener('resize', updateViewport);
      onKeyboardVisibilityChange?.(false);
    };
  }, [onKeyboardVisibilityChange]);

  useEffect(() => {
    if (!showMobileThread || !activeConv) return;
    if (skipNextAutoScrollRef.current) {
      skipNextAutoScrollRef.current = false;
      return;
    }
    scrollMessagesToBottom();
  }, [activeConv?.id, activeConv?.messages.length, showMobileThread, keyboardOpen]);

  useEffect(() => {
    if (!activeConv || !window.matchMedia('(min-width: 640px)').matches) return;
    onConversationOpened?.(activeConv);
    // The desktop thread is visible as soon as a conversation is selected.
    // Parent callbacks are intentionally omitted: they are recreated on render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConv?.id]);

  useEffect(() => {
    if (activeConv?.type !== 'community' && activeConv?.type !== 'study_group') return;
    if (!window.matchMedia('(min-width: 640px)').matches && !showMobileThread) return;
    const node = messagesRef.current;
    if (!node || node.scrollHeight - node.scrollTop - node.clientHeight < 96) {
      markLatestMessageSeen(activeConv);
    }
  }, [activeConv?.id, activeConv?.messages.length, showMobileThread]);

  useEffect(() => {
    const newlyStartedAnonymousChat = conversations.find((conversation) =>
      conversation.id.startsWith('anonymous-post-'),
    );
    if (newlyStartedAnonymousChat && autoOpenedConversationRef.current !== newlyStartedAnonymousChat.id) {
      autoOpenedConversationRef.current = newlyStartedAnonymousChat.id;
      openConversation(newlyStartedAnonymousChat);
    }
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
    return conversations.filter((conversation) => {
      if (activeTab === 'direct' && conversation.type !== 'direct') return false;
      if (activeTab === 'communities' && conversation.type !== 'community') return false;
      if (activeTab === 'study_groups' && conversation.type !== 'study_group') return false;
      if (normalizedQuery && !(
        (conversation.title || '').toLocaleLowerCase().includes(normalizedQuery) ||
        conversation.lastMessage.toLocaleLowerCase().includes(normalizedQuery)
      )) return false;
      return true;
    }).sort(compareConversationsByLatestActivity);
  }, [activeTab, conversations, searchQuery]);

  const groupInviteCandidates = users
    .filter((user) => user.id !== currentUser.id && user.role !== 'admin' && user.role !== 'college_admin')
    .filter((user) => {
      const query = groupInviteSearch.trim().toLocaleLowerCase();
      return !query ||
        user.name.toLocaleLowerCase().includes(query) ||
        user.college.toLocaleLowerCase().includes(query);
    })
    .slice(0, 8);

  const manageInviteCandidates = users
    .filter((user) => user.id !== currentUser.id && user.role !== 'admin' && user.role !== 'college_admin')
    .filter((user) => !activeConv?.memberIds?.includes(user.id))
    .filter((user) => {
      const query = manageInviteSearch.trim().toLocaleLowerCase();
      return !query ||
        user.name.toLocaleLowerCase().includes(query) ||
        user.college.toLocaleLowerCase().includes(query);
    })
    .slice(0, 8);
  const isGroupOwner = activeConv?.type === 'study_group' && activeConv.creatorId === currentUser.id;
  const groupShareUrl = activeConv?.groupId
    ? `${PUBLIC_APP_URL}/?groupId=${encodeURIComponent(activeConv.groupId)}`
    : '';

  const resetCreateGroupForm = () => {
    setShowCreateGroup(false);
    setNewGroupName('');
    setNewGroupDescription('');
    setNewGroupPurpose('study');
    setNewGroupVisibility('private');
    setGroupInviteSearch('');
    setGroupInviteIds(new Set());
    setCreateGroupError(null);
  };

  const handleChangeGroupVisibility = async () => {
    if (!activeConv || !onUpdateGroupVisibility || savingGroupVisibility) return;
    const nextVisibility = activeConv.visibility === 'public' ? 'private' : 'public';
    setSavingGroupVisibility(true);
    setGroupManagementError(null);
    setGroupManagementNotice(null);
    try {
      await onUpdateGroupVisibility(activeConv, nextVisibility);
      setGroupManagementNotice(
        nextVisibility === 'public'
          ? 'This group is public. Anyone with a Network account and the link can join.'
          : 'This group is private. Only invited members can join.',
      );
    } catch (error) {
      setGroupManagementError(
        error instanceof Error ? error.message : 'Group access could not be updated.',
      );
    } finally {
      setSavingGroupVisibility(false);
    }
  };

  const handleShareGroup = async () => {
    if (!groupShareUrl || activeConv?.visibility !== 'public') return;
    setGroupManagementError(null);
    setGroupManagementNotice(null);
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Join ${activeConv.title || 'this study group'}`,
          text: `Join ${activeConv.title || 'this study group'} on The Network.`,
          url: groupShareUrl,
        });
        setGroupManagementNotice('Group link shared.');
      } else {
        await navigator.clipboard.writeText(groupShareUrl);
        setGroupManagementNotice('Group link copied. Share it with your classmates.');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(groupShareUrl);
        setGroupManagementNotice('Group link copied. Share it with your classmates.');
      } catch {
        setShowGroupLinkField(true);
        setGroupManagementError('Copy the group link below and share it with your classmates.');
      }
    }
  };

  const handleInviteGroupMembers = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeConv || !onInviteGroupMembers || invitingGroupMembers || manageInviteIds.size === 0) return;
    setInvitingGroupMembers(true);
    setGroupManagementError(null);
    setGroupManagementNotice(null);
    try {
      await onInviteGroupMembers(activeConv, Array.from(manageInviteIds));
      setGroupManagementNotice(
        `${manageInviteIds.size} ${manageInviteIds.size === 1 ? 'invitation' : 'invitations'} sent.`,
      );
      setManageInviteIds(new Set());
      setManageInviteSearch('');
      setShowManageInvites(false);
      setShowGroupActions(true);
    } catch (error) {
      setGroupManagementError(
        error instanceof Error ? error.message : 'Invitations could not be sent.',
      );
    } finally {
      setInvitingGroupMembers(false);
    }
  };

  const handleCreateGroup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!onCreateGroup || !newGroupName.trim() || creatingGroup) return;
    setCreatingGroup(true);
    setCreateGroupError(null);
    try {
      const conversation = await onCreateGroup({
        name: newGroupName.trim(),
        description: newGroupDescription.trim(),
        inviteUserIds: Array.from(groupInviteIds),
        purpose: newGroupPurpose,
        visibility: newGroupVisibility,
      });
      setActiveTab('study_groups');
      openConversation(conversation);
      resetCreateGroupForm();
    } catch (error) {
      setCreateGroupError(
        error instanceof Error ? error.message : 'The group could not be created. Please try again.',
      );
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleGroupInvite = async (conversation: ChatConversation, action: 'accept' | 'decline') => {
    if (groupInviteActionId) return;
    setGroupInviteActionId(conversation.id);
    setGroupInviteError(null);
    try {
      if (action === 'accept') {
        if (!onAcceptGroupInvite) return;
        const accepted = await onAcceptGroupInvite(conversation);
        setActiveTab('study_groups');
        openConversation(accepted);
      } else {
        if (!onDeclineGroupInvite) return;
        await onDeclineGroupInvite(conversation);
      }
    } catch (error) {
      setGroupInviteError(error instanceof Error ? error.message : 'The group invitation could not be updated.');
    } finally {
      setGroupInviteActionId(null);
    }
  };

  const handleFilePicked = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setSendError('Files must be 8 MB or smaller.');
      return;
    }
    if (!file.type.startsWith('image/') && ![
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ].includes(file.type)) {
      setSendError('Choose an image, PDF, DOC, DOCX, or TXT file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentDraft({
        name: file.name,
        data: String(reader.result || ''),
        mimeType: file.type || 'application/octet-stream',
      });
      setSendError(null);
    };
    reader.onerror = () => setSendError('This file could not be read. Please try again.');
    reader.readAsDataURL(file);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const submittedText = messageInputRef.current?.getValue() || '';
    const text = submittedText.trim();
    if ((!text && !attachmentDraft) || !activeConv || isSending || sendLockRef.current) return;

    sendLockRef.current = true;
    setIsSending(true);
    setSendError(null);
    const submittedAttachment = attachmentDraft;
    const reply = replyingTo;
    // Clear the composer immediately so the UI feels instant. App owns the
    // optimistic message and restores the text if persistence fails.
    messageInputRef.current?.setValue('');
    setAttachmentDraft(null);
    setReplyingTo(null);
    setActionError(null);
    // onSendMessage paints the optimistic bubble before its first await. Do
    // not hold the composer hostage to push/email/database work after that
    // paint; the callback still rolls the bubble back if persistence fails.
    void Promise.resolve(
      onSendMessage(activeConv.id, text, submittedAttachment || undefined, reply ? { replyToId: reply.id } : undefined),
    ).then(() => {
      confetti({ particleCount: 15, spread: 30 });
    }).catch(() => {
      messageInputRef.current?.setValue((current) => current || submittedText);
      setAttachmentDraft((current) => current || submittedAttachment);
      setSendError('Message could not be sent. Please try again.');
    });
    sendLockRef.current = false;
    setIsSending(false);
  };

  const insertEmoji = (emoji: string) => {
    messageInputRef.current?.setValue((value) => `${value}${emoji}`);
    setEmojiPickerOpen(false);
  };

  const sendSticker = async (sticker: string) => {
    if (!activeConv || isSending || sendLockRef.current) return;
    setEmojiPickerOpen(false);
    setReplyingTo(null);
    messageInputRef.current?.setValue('');
    setSendError(null);
    setIsSending(true);
    sendLockRef.current = true;
    void Promise.resolve(onSendMessage(activeConv.id, sticker)).catch(() => {
      setSendError('Sticker could not be sent. Please try again.');
    });
    sendLockRef.current = false;
    setIsSending(false);
  };

  const toggleReaction = async (message: ChatMessage, emoji: string) => {
    if (!onToggleReaction || message.id.startsWith('pending-')) return;
    setReactionMenuFor(null);
    setActionMenuFor(null);
    setActionError(null);
    try {
      await onToggleReaction(activeConv?.id || '', message.id, emoji);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'That reaction could not be saved. Please try again.');
    }
  };

  return (
    <div
      className="network-chats-view mobile-chat-shell w-full h-[calc(100dvh-4rem)] min-h-0 overflow-hidden overscroll-none bg-[#fafafa] md:min-h-0 lg:h-full"
      style={visibleViewportHeight ? { height: `${visibleViewportHeight}px`, minHeight: `${visibleViewportHeight}px` } : undefined}
    >
      <div className={`h-full min-h-0 flex flex-col md:flex-row md:h-full ${keyboardOpen ? '!h-full !min-h-0' : ''}`}>
        {/* LEFT COLUMN: Chat List */}
        <div
          className={`chat-conversation-pane w-full md:w-[23rem] lg:w-[26rem] min-h-0 bg-white md:border-r border-slate-200/70 flex flex-col ${
            showMobileThread ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Native mobile app header */}
          <div className="px-4 pt-4 pb-3 sm:px-5 space-y-3 border-b border-slate-100/80">
            <div className="flex items-center justify-between">
              <h1 className="text-[1.7rem] leading-none font-extrabold text-slate-950 tracking-tight">Chats</h1>
              <div className="flex items-center gap-1">
                {activeTab === 'study_groups' && onCreateGroup && (
                  <button
                    type="button"
                    onClick={() => {
                      setCreateGroupError(null);
                      setShowCreateGroup(true);
                    }}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-indigo-600 px-3 text-xs font-bold text-white transition hover:bg-indigo-700"
                    aria-label="Create a standalone student group"
                  >
                    <Plus className="h-4 w-4" />
                    New group
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => confetti({ particleCount: 20, spread: 40 })}
                  className="p-2 text-slate-500 hover:text-indigo-600 active:scale-95 transition-transform"
                  title="Notifications"
                  aria-label="Notifications"
                >
                  <Bell className="w-[1.15rem] h-[1.15rem]" />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-[1.05rem] h-[1.05rem] absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats, people, groups..."
                className="w-full pl-10 pr-3 py-3 text-[13px] bg-slate-100/80 border-0 rounded-2xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:outline-none"
              />
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-0.5 bg-slate-100/90 p-1 rounded-xl">
              {(
                [
                  { id: 'direct', label: 'Direct' },
                  { id: 'communities', label: 'Communities' },
                  { id: 'study_groups', label: 'Study Groups' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-white text-indigo-700 shadow-[0_1px_3px_rgba(15,23,42,0.08)]'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y">
            {filteredConversations.length > 0 ? (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === activeConv?.id;
                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      if (!conv.isInvitePending) openConversation(conv);
                    }}
                    className={`min-h-[4.8rem] px-4 sm:px-5 py-3 flex items-center gap-3 transition-colors border-b border-slate-100/80 ${
                      conv.isInvitePending
                        ? 'bg-amber-50/50'
                        : isSelected ? 'cursor-pointer bg-indigo-50/70' : 'cursor-pointer hover:bg-slate-50 active:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        {conv.type === 'community' ? (
                          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-mono font-bold text-xs">
                            {(conv.title || 'Chat').slice(1, 3).toUpperCase()}
                          </div>
                        ) : (
                          <SafeAvatar
                            src={conv.avatar}
                            name={conv.title || 'Chat'}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        )}
                        {conv.online && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white"></span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className={`text-[14px] truncate ${conv.unreadCount > 0 ? 'font-extrabold text-slate-950' : 'font-bold text-slate-800'}`}>
                            {conv.title}
                          </h3>
                          {conv.verified && (
                            <span className="w-3.5 h-3.5 rounded-full bg-emerald-100 text-emerald-700 text-[8px] font-bold flex items-center justify-center">
                              ✓
                            </span>
                          )}
                        </div>
                        <p className={`text-[12px] truncate mt-0.5 ${conv.unreadCount > 0 ? 'font-semibold text-slate-600' : 'text-slate-500'}`}>
                          {conv.lastMessage}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center">
                      {conv.isInvitePending ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={!onAcceptGroupInvite || Boolean(groupInviteActionId)}
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleGroupInvite(conv, 'accept');
                            }}
                            className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
                          >
                            {groupInviteActionId === conv.id ? 'Saving…' : 'Accept'}
                          </button>
                          <button
                            type="button"
                            disabled={!onDeclineGroupInvite || Boolean(groupInviteActionId)}
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleGroupInvite(conv, 'decline');
                            }}
                            className="rounded-lg border border-slate-200 px-2 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-white disabled:opacity-60"
                          >
                            Decline
                          </button>
                        </div>
                      ) : conv.unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 text-[10px] font-extrabold text-white bg-indigo-600 rounded-full">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">
                {activeTab === 'study_groups' ? (
                  <>
                    <p>No student groups yet.</p>
                    {onCreateGroup && (
                      <button
                        type="button"
                        onClick={() => {
                          setCreateGroupError(null);
                          setShowCreateGroup(true);
                        }}
                        className="mt-3 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-700"
                      >
                        Start a group
                      </button>
                    )}
                  </>
                ) : 'No chats found in this category.'}
              </div>
            )}
            {groupInviteError && (
              <p role="alert" className="mx-4 mt-2 rounded-lg bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">
                {groupInviteError}
              </p>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Chat Thread */}
        <div
          className={`flex-1 min-h-0 min-w-0 flex flex-col bg-[#fafafa] ${
            showMobileThread ? 'flex' : 'hidden md:flex'
          }`}
        >
          {activeConv ? (
            <>
              {/* Active Header */}
              <div className="min-h-[4.25rem] px-4 sm:px-5 pt-[env(safe-area-inset-top)] bg-white border-b border-slate-200/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={closeMobileThread}
                    className="md:hidden -ml-2 flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                    aria-label="Back to chats"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  <div
                    role={
                      activeConv.type === 'community' || (
                        activeConv.type === 'direct' && activeConv.participant && !activeConv.anonymousTargetId
                      ) ? 'button' : undefined
                    }
                    tabIndex={
                      activeConv.type === 'community' || (
                        activeConv.type === 'direct' && activeConv.participant && !activeConv.anonymousTargetId
                      ) ? 0 : undefined
                    }
                    aria-label={
                      activeConv.type === 'community'
                        ? `View ${activeConv.title || 'community'} information and members`
                        : activeConv.type === 'direct'
                          ? `Open ${activeConv.title || 'user'} profile`
                          : undefined
                    }
                    onClick={() => {
                      if (activeConv.type === 'community') {
                        setCommunityMemberSearch('');
                        setShowCommunityInfo(true);
                      } else if (activeConv.type === 'direct' && activeConv.participant && !activeConv.anonymousTargetId) {
                        onOpenProfile(activeConv.participant);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (
                        (event.key === 'Enter' || event.key === ' ') &&
                        (
                          activeConv.type === 'community' ||
                          (activeConv.type === 'direct' && activeConv.participant && !activeConv.anonymousTargetId)
                        )
                      ) {
                        event.preventDefault();
                        if (activeConv.type === 'community') {
                          setCommunityMemberSearch('');
                          setShowCommunityInfo(true);
                        } else if (activeConv.participant) {
                          onOpenProfile(activeConv.participant);
                        }
                      }
                    }}
                    className={`flex items-center gap-3 rounded-xl text-left outline-none ${
                      activeConv.type === 'community' ||
                      (activeConv.type === 'direct' && activeConv.participant && !activeConv.anonymousTargetId)
                        ? 'cursor-pointer hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-400'
                        : ''
                    }`}
                  >
                    <div className="relative">
                      {activeConv.type === 'community' ? (
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-mono font-bold text-xs">
                          {(activeConv.title || 'Chat').slice(1, 3).toUpperCase()}
                        </div>
                      ) : (
                        <SafeAvatar
                          src={activeConv.avatar}
                          name={activeConv.title || 'Chat'}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      )}
                      {activeConv.online && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white"></span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <h2 className="text-sm font-semibold tracking-tight text-slate-900">
                          {activeConv.title}
                        </h2>
                        {activeConv.verified && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 rounded-full">
                            ✓ Verified
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {activeConv.subtitle || 'Active now'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-0.5 text-slate-500">
                  {activeConv.type === 'study_group' ? (
                    <div className="relative">
                      <button
                        type="button"
                        aria-label="Group sharing and access"
                        aria-expanded={showGroupActions}
                        onClick={() => {
                          setShowGroupActions((value) => !value);
                          setShowGroupLinkField(false);
                          setGroupManagementError(null);
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-slate-100 hover:text-slate-800"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {showGroupActions && (
                        <div className="absolute right-0 top-11 z-40 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                          <div className="flex items-center gap-2 border-b border-slate-100 px-1 pb-3">
                            {activeConv.visibility === 'public' ? (
                              <Globe className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <Lock className="h-4 w-4 text-slate-500" />
                            )}
                            <div>
                              <p className="text-xs font-bold text-slate-800">
                                {activeConv.visibility === 'public' ? 'Public group' : 'Private group'}
                              </p>
                              <p className="text-[10px] leading-4 text-slate-500">
                                {activeConv.visibility === 'public'
                                  ? 'Any signed-in student with the link can join.'
                                  : 'Only invited students can join.'}
                              </p>
                            </div>
                          </div>
                          {activeConv.visibility === 'public' && (
                            <button
                              type="button"
                              onClick={() => void handleShareGroup()}
                              className="mt-2 flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                            >
                              <Copy className="h-4 w-4" /> Share public link
                            </button>
                          )}
                          {showGroupLinkField && (
                            <input
                              type="url"
                              readOnly
                              value={groupShareUrl}
                              aria-label="Public group link"
                              onFocus={(event) => event.currentTarget.select()}
                              className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[10px] text-slate-600"
                            />
                          )}
                          {onInviteGroupMembers && (
                            <button
                              type="button"
                              onClick={() => {
                                setShowGroupActions(false);
                                setGroupManagementError(null);
                                setManageInviteSearch('');
                                setManageInviteIds(new Set());
                                setShowManageInvites(true);
                              }}
                              className="mt-1 flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              <UserPlus className="h-4 w-4" /> Invite classmates
                            </button>
                          )}
                          {isGroupOwner && onUpdateGroupVisibility ? (
                            <button
                              type="button"
                              disabled={savingGroupVisibility}
                              onClick={() => void handleChangeGroupVisibility()}
                              className="mt-1 flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                              {activeConv.visibility === 'public'
                                ? <><Lock className="h-4 w-4" /> Make private</>
                                : <><Globe className="h-4 w-4" /> Make public</>}
                            </button>
                          ) : (
                            <p className="px-2.5 pt-2 text-[10px] text-slate-400">
                              Only the group creator can change access.
                            </p>
                          )}
                          {groupManagementNotice && (
                            <p role="status" className="mt-2 rounded-lg bg-emerald-50 px-2.5 py-2 text-[10px] leading-4 text-emerald-800">
                              {groupManagementNotice}
                            </p>
                          )}
                          {groupManagementError && (
                            <p role="alert" className="mt-2 rounded-lg bg-rose-50 px-2.5 py-2 text-[10px] leading-4 text-rose-700">
                              {groupManagementError}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : activeConv.type === 'direct' ? (
                    <button
                      type="button"
                      aria-label={`Safety options for ${activeConv.title || 'this account'}`}
                      title="Safety options"
                      disabled={!activeConv.participant || Boolean(activeConv.anonymousTargetId)}
                      onClick={() => {
                        if (activeConv.participant && !activeConv.anonymousTargetId) {
                          onOpenSafetyOptions?.(activeConv.participant);
                        }
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40"
                    >
                      <ShieldAlert className="w-4 h-4" />
                    </button>
                  ) : (
                    <button aria-label="Conversation options" className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-slate-100 hover:text-slate-800">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {sharedGroupMessage && (
                <div role="status" className="border-b border-indigo-100 bg-indigo-50 px-4 py-2 text-xs font-medium text-indigo-800">
                  {sharedGroupMessage}
                </div>
              )}

              {/* Messages Stream */}
              <div
                ref={messagesRef}
                className="mobile-chat-messages flex flex-1 min-h-0 flex-col gap-3 px-4 py-5 sm:px-6 overflow-y-auto overscroll-contain touch-pan-y bg-[#fafafa] scroll-smooth"
                onScroll={(event) => {
                  const node = event.currentTarget;
                  if (node.scrollHeight - node.scrollTop - node.clientHeight < 96) {
                    markLatestMessageSeen();
                  }
                  if (node.scrollTop <= 48) void loadOlderMessages();
                }}
              >
                {loadingOlderMessages && (
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
                {visibleMessages.map((msg, messageIndex) => {
                  const isMe = msg.senderId === currentUser.id;
                  const previousMessage = visibleMessages[messageIndex - 1];
                  const day = getChatDayMarker(msg.createdAt, msg.timestamp);
                  const previousDay = previousMessage
                    ? getChatDayMarker(previousMessage.createdAt, previousMessage.timestamp)
                    : null;
                  const isNewDay = !previousDay || previousDay.key !== day.key;
                  const grouped = Boolean(previousMessage && previousMessage.senderId === msg.senderId && !isNewDay);
                  const replyTarget = msg.replyToId
                    ? visibleMessages.find((item) => item.id === msg.replyToId)
                    : null;
                  return (
                    <div key={msg.id} className={`flex flex-col ${grouped ? '-mt-2' : ''}`}>
                    {isNewDay && (
                      <div className="mb-1 flex justify-center py-1">
                        <span className="rounded-full border border-white/80 bg-white/80 px-3 py-1 text-[10px] font-medium text-slate-500 shadow-sm">
                          {day.label}
                        </span>
                      </div>
                    )}
                    <div
                      id={`uploaded-chat-message-${msg.id}`}
                      className={`group/message relative flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        onDoubleClick={() => void toggleReaction(msg, '❤️')}
                        className={`max-w-[86%] sm:max-w-md px-4 py-2.5 rounded-[20px] text-[14px] leading-6 shadow-sm ${
                          isMe ? 'bg-indigo-600 text-white rounded-br-md' : 'bg-white text-slate-800 rounded-bl-md border border-white'
                        } ${grouped ? (isMe ? 'rounded-tr-md' : 'rounded-tl-md') : ''}`}
                        title="Double-click to react with ❤️"
                      >
                        {replyTarget && (
                          <button
                            type="button"
                            onClick={() => document.getElementById(`uploaded-chat-message-${replyTarget.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                            className={`mb-2 w-full rounded-lg border-l-2 px-2 py-1.5 text-left text-[10px] ${
                              isMe
                                ? 'border-white/60 bg-white/15 text-white/95'
                                : 'border-indigo-400 bg-slate-50 text-slate-600'
                            }`}
                          >
                            <span className={`block font-bold ${isMe ? 'text-emerald-100' : 'text-indigo-600'}`}>
                              Replying to {replyTarget.senderId === currentUser.id ? 'yourself' : replyTarget.senderName || activeConv.title}
                            </span>
                            <span className="block truncate">{replyTarget.text || replyTarget.attachmentName || 'Attachment'}</span>
                          </button>
                        )}
                        {!isMe && activeConv.type !== 'direct' && (
                          <p className="text-[10px] font-bold text-indigo-600 mb-0.5">
                            {msg.senderName}
                          </p>
                        )}
                        {msg.attachmentData && msg.attachmentMimeType?.startsWith('image/') && msg.attachmentData.startsWith('data:') && (
                          <button
                            type="button"
                            onClick={() => setLightboxImage({
                              src: msg.attachmentData!,
                              alt: msg.attachmentName || 'Shared image',
                            })}
                            aria-label={`Open ${msg.attachmentName || 'shared image'} full size`}
                            title="Open full-size image"
                            className="mb-2 block max-w-full cursor-zoom-in rounded-xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                          >
                            <img
                              src={msg.attachmentData}
                              alt={msg.attachmentName || 'Shared image'}
                              className="block max-h-64 max-w-full rounded-xl object-contain"
                            />
                          </button>
                        )}
                        {msg.attachmentData && !msg.attachmentMimeType?.startsWith('image/') && msg.attachmentData.startsWith('data:') && (
                          <a
                            href={msg.attachmentData}
                            download={msg.attachmentName || 'shared-file'}
                            className="mb-2 flex items-center gap-2 rounded-xl bg-black/5 px-2.5 py-2 text-[11px] font-bold hover:bg-black/10"
                          >
                            <FileText className="h-4 w-4 shrink-0" />
                            <span className="truncate">{msg.attachmentName || 'Shared file'}</span>
                          </a>
                        )}
                        {msg.sharedPost && <SharedPostPreview post={msg.sharedPost} />}
                        {msg.text && (!msg.sharedPost || msg.text !== 'Shared a post') && (
                          <p className="whitespace-pre-wrap break-words">
                            <LinkifiedText text={msg.text} />
                          </p>
                        )}
                      </div>
                      {(activeConv.type === 'direct' || activeConv.type === 'study_group' || activeConv.type === 'community') && (
                        <>
                          {reactionMenuFor === msg.id && (
                            <div className="flex items-center gap-0.5 rounded-full border border-slate-200 bg-white p-1 shadow-lg">
                              {CHAT_REACTION_EMOJIS.map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => void toggleReaction(msg, emoji)}
                                  className="h-8 w-8 rounded-full text-base hover:bg-indigo-50 active:scale-95"
                                  aria-label={`React with ${emoji}`}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                          {msg.reactions && msg.reactions.length > 0 && (
                            <div className={`flex flex-wrap gap-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                              {msg.reactions.map((reaction) => (
                                <button
                                  key={reaction.emoji}
                                  type="button"
                                  onClick={() => void toggleReaction(msg, reaction.emoji)}
                                  className={`rounded-full border px-2 py-0.5 text-[10px] ${
                                    reaction.users.includes(currentUser.id)
                                      ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                                      : 'border-slate-200 bg-white text-slate-600'
                                  }`}
                                >
                                  {reaction.emoji} {reaction.count}
                                </button>
                              ))}
                            </div>
                          )}
                          {actionMenuFor === msg.id && (
                            <div className={`flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-lg ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <button
                                type="button"
                                onClick={() => { setReplyingTo(msg); setActionMenuFor(null); setReactionMenuFor(null); }}
                                className="flex items-center gap-1 rounded-lg px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-indigo-50"
                              >
                                <Reply className="h-3.5 w-3.5" /> Reply
                              </button>
                              <button
                                type="button"
                                onClick={() => { setReactionMenuFor(msg.id); setActionMenuFor(null); }}
                                className="flex items-center gap-1 rounded-lg px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-indigo-50"
                              >
                                <Smile className="h-3.5 w-3.5" /> React
                              </button>
                            </div>
                          )}
                          <div className={`flex items-center gap-2 px-1 text-[10px] text-slate-400 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <button
                              type="button"
                              onClick={() => { setActionMenuFor((value) => value === msg.id ? null : msg.id); setReactionMenuFor(null); }}
                              className="rounded-full p-1.5 hover:bg-indigo-50 hover:text-indigo-600 active:scale-95"
                              aria-label="Message actions"
                              title="Message actions"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => { setReplyingTo(msg); setActionMenuFor(null); setReactionMenuFor(null); }}
                              className="flex items-center gap-1 rounded-lg px-1.5 py-1 font-semibold hover:bg-indigo-50 hover:text-indigo-600"
                            >
                              <Reply className="h-3 w-3" /> Reply
                            </button>
                            <button
                              type="button"
                              onClick={() => { setReactionMenuFor((value) => value === msg.id ? null : msg.id); setActionMenuFor(null); }}
                              className="flex items-center gap-1 rounded-lg px-1.5 py-1 font-semibold hover:bg-indigo-50 hover:text-indigo-600"
                            >
                              <Smile className="h-3 w-3" /> React
                            </button>
                          </div>
                        </>
                      )}

                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 px-1">
                        <span>{formatChatMessageTime(msg.createdAt, msg.timestamp)}</span>
                        {isMe && activeConv.type !== 'direct' && (
                          <span className="ml-1 font-semibold text-indigo-600">
                            Seen by {msg.seenBy?.length || 0}
                          </span>
                        )}
                        {isMe && (
                          <span>
                            <CheckCheck className="w-3.5 h-3.5 text-indigo-600 inline" />
                          </span>
                        )}
                      </div>
                    </div>
                    </div>
                  );
                })}
              </div>

              {/* Message Composer Footer */}
              <form
                onSubmit={handleSend}
                autoComplete="off"
                className="mobile-chat-composer relative px-3 pt-3 pb-[max(0.65rem,env(safe-area-inset-bottom))] bg-[#fafafa] sm:px-4"
              >
                {replyingTo && (
                  <div className="mb-2 flex items-center gap-2 rounded-xl border-l-2 border-indigo-500 bg-white px-3 py-2 text-[11px] text-slate-600">
                    <Reply className="h-4 w-4 shrink-0 text-indigo-600" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-indigo-700">
                        Replying to {replyingTo.senderId === currentUser.id ? 'yourself' : replyingTo.senderName || activeConv.title}
                      </p>
                      <p className="truncate">{replyingTo.text || replyingTo.attachmentName || 'Attachment'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Cancel reply"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {actionError && (
                  <p className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-600">
                    {actionError}
                  </p>
                )}
                {attachmentDraft && (
                  <div className="mb-2 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2.5 py-2">
                    {attachmentDraft.mimeType.startsWith('image/') ? (
                      <img src={attachmentDraft.data} alt="" className="h-12 w-12 rounded-xl object-cover" />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><FileText className="h-5 w-5" /></span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-slate-700">{attachmentDraft.name}</span>
                    <button type="button" onClick={() => setAttachmentDraft(null)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Remove attachment">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <input ref={fileInputRef} type="file" hidden accept="image/*,.pdf,.doc,.docx,.txt" onChange={handleFilePicked} />
                <div className="flex items-center gap-1 rounded-[1.75rem] border border-slate-200/80 bg-white px-2 py-1.5 shadow-[0_2px_14px_rgba(15,23,42,0.08)]">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100 active:scale-95"
                    title="Attach image or file"
                    aria-label="Attach image or file"
                  >
                    <Plus className="h-6 w-6" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEmojiPickerOpen((value) => !value); setEmojiPickerTab('emoji'); }}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100 hover:text-indigo-600 active:scale-95"
                    title="Open emoji and sticker picker"
                    aria-label="Open emoji and sticker picker"
                  >
                    <Smile className="h-5 w-5" />
                  </button>
                  {emojiPickerOpen && (
                    <div className="absolute bottom-full left-2 z-30 mb-2 w-[min(21rem,calc(100vw-1rem))] rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                      <div className="mb-2 flex items-center gap-1 border-b border-slate-100 pb-2">
                        <button
                          type="button"
                          onClick={() => setEmojiPickerTab('emoji')}
                          className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-bold ${emojiPickerTab === 'emoji' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-indigo-50'}`}
                        >
                          Emoji
                        </button>
                        <button
                          type="button"
                          onClick={() => setEmojiPickerTab('sticker')}
                          className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-bold ${emojiPickerTab === 'sticker' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-indigo-50'}`}
                        >
                          Stickers
                        </button>
                      </div>
                      <div className="grid max-h-40 grid-cols-8 gap-1 overflow-y-auto">
                        {(emojiPickerTab === 'emoji' ? CHAT_EMOJIS : CHAT_STICKERS).map((emoji, index) => (
                          <button
                            key={`${emoji}-${index}`}
                            type="button"
                            onClick={() => emojiPickerTab === 'emoji' ? insertEmoji(emoji) : void sendSticker(emoji)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-lg hover:bg-indigo-50 active:scale-95"
                            aria-label={`Send ${emoji}`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                      {emojiPickerTab === 'sticker' && (
                        <p className="mt-2 text-[10px] text-slate-400">
                          Tap a sticker to send it. Use the + button for any GIF or sticker file.
                        </p>
                      )}
                    </div>
                  )}
                  <ChatMessageDraftInput
                    ref={messageInputRef}
                    conversationTitle={activeConv.title || 'this chat'}
                    isSending={isSending}
                    hasAttachment={Boolean(attachmentDraft)}
                    onFocus={scrollMessagesToBottom}
                  />
                </div>
                {sendError && (
                  <p className="absolute bottom-full left-4 right-4 mb-2 rounded-lg bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-600 shadow-sm">
                    {sendError}
                  </p>
                )}
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
              <div className="max-w-sm px-5 text-center">
                {sharedGroupMessage && (
                  <p role="status" className="mb-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-left text-xs leading-5 text-indigo-800">
                    {sharedGroupMessage}
                  </p>
                )}
                <p>Select a conversation to start chatting.</p>
              </div>
            </div>
          )}
        </div>
      </div>
      {showCreateGroup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !creatingGroup) resetCreateGroupForm();
          }}
        >
          <form
            onSubmit={(event) => void handleCreateGroup(event)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-standalone-group-title"
            className="max-h-[min(90dvh,44rem)] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="create-standalone-group-title" className="text-lg font-black text-slate-900">Create a student group</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  This group is independent of any community. Invite classmates to start the conversation.
                </p>
              </div>
              <button
                type="button"
                onClick={resetCreateGroupForm}
                disabled={creatingGroup}
                aria-label="Close group creation"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-slate-700">Group name</span>
              <input
                autoFocus
                required
                maxLength={80}
                value={newGroupName}
                onChange={(event) => setNewGroupName(event.target.value)}
                placeholder="e.g. GATE study circle"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-slate-700">Group type</span>
              <select
                value={newGroupPurpose}
                onChange={(event) => setNewGroupPurpose(event.target.value as 'study' | 'chat')}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="study">Study group</option>
                <option value="chat">Chat group</option>
              </select>
            </label>

            <fieldset className="space-y-2">
              <legend className="text-xs font-bold text-slate-700">Who can join?</legend>
              <div className="grid grid-cols-2 gap-2">
                <label className={`cursor-pointer rounded-xl border p-3 ${
                  newGroupVisibility === 'private' ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200'
                }`}>
                  <span className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <input
                      type="radio"
                      name="group-visibility"
                      value="private"
                      checked={newGroupVisibility === 'private'}
                      onChange={() => setNewGroupVisibility('private')}
                    />
                    <Lock className="h-3.5 w-3.5" /> Private
                  </span>
                  <span className="mt-1 block pl-5 text-[10px] leading-4 text-slate-500">
                    Only invited students can join.
                  </span>
                </label>
                <label className={`cursor-pointer rounded-xl border p-3 ${
                  newGroupVisibility === 'public' ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200'
                }`}>
                  <span className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <input
                      type="radio"
                      name="group-visibility"
                      value="public"
                      checked={newGroupVisibility === 'public'}
                      onChange={() => setNewGroupVisibility('public')}
                    />
                    <Globe className="h-3.5 w-3.5" /> Public
                  </span>
                  <span className="mt-1 block pl-5 text-[10px] leading-4 text-slate-500">
                    Any signed-in student with the link can join.
                  </span>
                </label>
              </div>
            </fieldset>

            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-slate-700">Description <span className="font-normal text-slate-400">· optional</span></span>
              <textarea
                maxLength={500}
                rows={3}
                value={newGroupDescription}
                onChange={(event) => setNewGroupDescription(event.target.value)}
                placeholder="What will the group work on?"
                className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </label>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-700">Invite classmates <span className="font-normal text-slate-400">· optional</span></span>
                <span className="text-[10px] text-slate-400">{groupInviteIds.size} selected</span>
              </div>
              <input
                type="search"
                value={groupInviteSearch}
                onChange={(event) => setGroupInviteSearch(event.target.value)}
                placeholder="Search by name or college"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
              <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-slate-100 p-1">
                {groupInviteCandidates.length ? groupInviteCandidates.map((user) => {
                  const isSelected = groupInviteIds.has(user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      disabled={!isSelected && groupInviteIds.size >= 100}
                      onClick={() => setGroupInviteIds((previous) => {
                        const next = new Set(previous);
                        if (next.has(user.id)) next.delete(user.id);
                        else if (next.size < 100) next.add(user.id);
                        return next;
                      })}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition ${
                        isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      <SafeAvatar src={user.avatar} name={user.name} className="h-8 w-8 rounded-full object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-slate-800">{user.name}</span>
                        <span className="block truncate text-[10px] text-slate-500">{user.college}</span>
                      </span>
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                        isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 text-transparent'
                      }`}>
                        <Check className="h-3 w-3" />
                      </span>
                    </button>
                  );
                }) : (
                  <p className="px-3 py-4 text-center text-xs text-slate-400">No students match that search.</p>
                )}
              </div>
            </div>

            {createGroupError && (
              <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                {createGroupError}
              </p>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={resetCreateGroupForm}
                disabled={creatingGroup}
                className="min-h-10 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingGroup || !newGroupName.trim()}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creatingGroup && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {creatingGroup ? 'Creating…' : 'Create group'}
              </button>
            </div>
          </form>
        </div>
      )}
      {showManageInvites && activeConv?.type === 'study_group' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !invitingGroupMembers) {
              setShowManageInvites(false);
            }
          }}
        >
          <form
            onSubmit={(event) => void handleInviteGroupMembers(event)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-group-members-title"
            className="max-h-[min(90dvh,40rem)] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="invite-group-members-title" className="text-lg font-black text-slate-900">
                  Invite classmates
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Send a Network invitation to join {activeConv.title || 'this group'}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowManageInvites(false)}
                disabled={invitingGroupMembers}
                aria-label="Close invite dialog"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <input
              type="search"
              value={manageInviteSearch}
              onChange={(event) => setManageInviteSearch(event.target.value)}
              placeholder="Search by name or college"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-slate-100 p-1">
              {manageInviteCandidates.length ? manageInviteCandidates.map((user) => {
                const isSelected = manageInviteIds.has(user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    disabled={!isSelected && manageInviteIds.size >= 100}
                    onClick={() => setManageInviteIds((previous) => {
                      const next = new Set(previous);
                      if (next.has(user.id)) next.delete(user.id);
                      else if (next.size < 100) next.add(user.id);
                      return next;
                    })}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition ${
                      isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <SafeAvatar src={user.avatar} name={user.name} className="h-8 w-8 rounded-full object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-slate-800">{user.name}</span>
                      <span className="block truncate text-[10px] text-slate-500">{user.college}</span>
                    </span>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                      isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 text-transparent'
                    }`}>
                      <Check className="h-3 w-3" />
                    </span>
                  </button>
                );
              }) : (
                <p className="px-3 py-5 text-center text-xs text-slate-400">
                  No students match that search.
                </p>
              )}
            </div>
            {groupManagementError && (
              <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                {groupManagementError}
              </p>
            )}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowManageInvites(false)}
                disabled={invitingGroupMembers}
                className="min-h-10 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={invitingGroupMembers || manageInviteIds.size === 0}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {invitingGroupMembers && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {invitingGroupMembers ? 'Sending…' : `Invite ${manageInviteIds.size || ''}`}
              </button>
            </div>
          </form>
        </div>
      )}
      {showCommunityInfo && activeConv?.type === 'community' && (
        createPortal(
          <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-5"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setShowCommunityInfo(false);
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="community-chat-info-title"
              className="flex max-h-[min(92dvh,52rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
              <header className="flex items-start gap-3 border-b border-slate-100 p-5 sm:p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-sm font-black text-indigo-700">
                  {(activeCommunity?.displayName || activeConv.title || 'Community')
                    .split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 id="community-chat-info-title" className="truncate text-lg font-black text-slate-900">
                    {activeCommunity?.displayName || activeConv.communityName || activeConv.title || 'Community'}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {activeCommunity
                      ? `${activeCommunity.membersCount.toLocaleString()} members · ${activeCommunity.onlineCount.toLocaleString()} online`
                      : activeConv.subtitle || 'Community chat'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCommunityInfo(false)}
                  aria-label="Close community information"
                  className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
                {activeCommunity ? (
                  <>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        About this community
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        {activeCommunity.description || 'No description has been added yet.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-slate-100 p-3">
                        <p className="text-lg font-black text-slate-900">{activeCommunity.membersCount.toLocaleString()}</p>
                        <p className="text-[11px] font-semibold text-slate-500">Members</p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 p-3">
                        <p className="text-lg font-black text-emerald-700">{activeCommunity.onlineCount.toLocaleString()}</p>
                        <p className="text-[11px] font-semibold text-slate-500">Online now</p>
                      </div>
                      <div className="col-span-2 rounded-2xl border border-slate-100 p-3 sm:col-span-1">
                        <p className="truncate text-sm font-black capitalize text-slate-900">
                          {activeCommunity.category === 'interest'
                            ? 'Interest-based'
                            : activeCommunity.category === 'college'
                              ? 'College'
                              : 'Career'}
                        </p>
                        <p className="text-[11px] font-semibold text-slate-500">Category</p>
                      </div>
                    </div>

                    {activeCommunity.tags && activeCommunity.tags.length > 0 && (
                      <section aria-label="Community topics">
                        <h3 className="text-xs font-black uppercase tracking-wide text-slate-500">Topics</h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {activeCommunity.tags.map((tag) => (
                            <span key={tag} className="rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-bold text-indigo-700">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </section>
                    )}

                    <section aria-labelledby="community-info-rules-title" className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                      <h3 id="community-info-rules-title" className="text-xs font-black text-slate-800">Community guidelines</h3>
                      <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-600">
                        {(activeCommunity.rules?.length
                          ? activeCommunity.rules
                          : ['Be respectful to all members.', 'Keep discussions relevant and constructive.', 'Do not spam or share harmful content.']
                        ).map((rule) => <li key={rule}>• {rule}</li>)}
                      </ul>
                    </section>

                    <section aria-labelledby="community-info-members-title">
                      <div className="flex flex-wrap items-end justify-between gap-2">
                        <div>
                          <h3 id="community-info-members-title" className="text-sm font-black text-slate-900">
                            Members
                          </h3>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {visibleCommunityMemberCount} profiles visible · {activeCommunity.membersCount} members total
                          </p>
                        </div>
                        <label className="relative w-full sm:w-56">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            type="search"
                            value={communityMemberSearch}
                            onChange={(event) => setCommunityMemberSearch(event.target.value)}
                            placeholder="Search members"
                            aria-label="Search community members"
                            className="min-h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-xs outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                          />
                        </label>
                      </div>

                      <div className="mt-3 max-h-72 space-y-1 overflow-y-auto rounded-2xl border border-slate-100 p-2">
                        {communityMemberRows.length ? communityMemberRows.map(({ id, user, isAdmin }) => {
                          const memberContent = (
                            <>
                              <SafeAvatar
                                src={user?.avatar}
                                name={user?.name || 'Network member'}
                                className="h-10 w-10 shrink-0 rounded-full object-cover"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-1.5">
                                  <span className="truncate text-xs font-bold text-slate-800">
                                    {user?.name || 'Network member'}
                                  </span>
                                  {isAdmin && (
                                    <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-black text-indigo-700">
                                      {id === activeCommunity.creatorId ? 'Creator' : 'Admin'}
                                    </span>
                                  )}
                                </span>
                                <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                                  {[user?.branch, user?.college].filter(Boolean).join(' · ') || 'Community member'}
                                </span>
                              </span>
                              {user?.isOnline && (
                                <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-emerald-700">
                                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Online
                                </span>
                              )}
                            </>
                          );
                          return user ? (
                            <button
                              key={id}
                              type="button"
                              onClick={() => {
                                setShowCommunityInfo(false);
                                onOpenProfile(user);
                              }}
                              className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                            >
                              {memberContent}
                            </button>
                          ) : (
                            <div key={id} className="flex items-center gap-3 rounded-xl px-2.5 py-2">
                              {memberContent}
                            </div>
                          );
                        }) : (
                          <p className="px-3 py-8 text-center text-xs font-medium text-slate-500">
                            {visibleCommunityMemberCount
                              ? 'No members match your search.'
                              : activeCommunity.membersCount
                                ? 'Member profiles are hidden or unavailable.'
                                : 'No members are listed yet.'}
                          </p>
                        )}
                      </div>
                      {visibleCommunityMemberCount < activeCommunity.membersCount && (
                        <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
                          Some members may have hidden their profile or their account is no longer available.
                        </p>
                      )}
                    </section>
                  </>
                ) : (
                  <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
                    Community details are not available right now. Try again after the community list refreshes.
                  </div>
                )}
              </div>
              <footer className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 sm:px-6">
                <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                  <Users className="h-4 w-4" /> Community chat
                </span>
                <button
                  type="button"
                  onClick={() => setShowCommunityInfo(false)}
                  className="min-h-9 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white transition hover:bg-indigo-700"
                >
                  Done
                </button>
              </footer>
            </section>
          </div>,
          document.body,
        )
      )}
      {lightboxImage && (
        createPortal(
          <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/90 p-3 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Full-size image preview"
            onClick={() => setLightboxImage(null)}
          >
            <button
              ref={lightboxCloseButtonRef}
              type="button"
              onClick={() => setLightboxImage(null)}
              aria-label="Close full-size image"
              className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={lightboxImage.src}
              alt={lightboxImage.alt}
              onClick={(event) => event.stopPropagation()}
              className="max-h-[92dvh] max-w-[96vw] rounded-xl object-contain shadow-2xl"
            />
          </div>,
          document.body,
        )
      )}
    </div>
  );
};
