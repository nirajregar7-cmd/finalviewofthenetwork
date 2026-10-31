import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserProfile, Connection, DirectMessage, GroupChat, GroupMessage, CircleType, Community, Project, CampusEvent } from '../types';
import * as LucideIcons from 'lucide-react';
import {
  Send, Search, Users, ShieldCheck, MessageSquare, CheckCheck,
  ArrowLeft, Plus, X, Hash, BookOpen, Smile, Check, GraduationCap,
  Cpu, FileText, Lightbulb, Building2, ChevronDown, Crown, Calendar, Rocket, Globe,
  ExternalLink, Star, Paperclip, Image as ImageIcon, BarChart3, File as FileIcon,
  Download, LoaderCircle, MoreHorizontal
} from 'lucide-react';
import { Reply } from 'lucide-react';
import Avatar from './Avatar';
import { api, API_ORIGIN } from '../api';

function CommIcon({ name, size = 18, className = '' }: { name?: string; size?: number; className?: string }) {
  const safeName = name || 'MessageSquare';
  const IconComp = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>)[safeName];
  if (IconComp) return <IconComp size={size} className={className} />;
  return <span className="font-bold text-xs">{safeName.charAt(0)}</span>;
}

interface MessagingSectionProps {
  currentUser: UserProfile;
  connections: Connection[];
  allUsers: UserProfile[];
  darkMode: boolean;
  preSelectedUserId?: string;
  preSelectedGroupId?: string;
  onViewUserProfile?: (userId: string) => void;
  communities?: Community[];
  onUnreadCountChange?: (count: number) => void;
}

type ChatTab = 'dms' | 'circles';
type MessageExtras = {
  attachmentName?: string;
  attachmentData?: string;
  attachmentMimeType?: string;
  pollOptions?: string[];
  replyToId?: string;
};
type AttachmentDraft = {
  name: string;
  data: string;
  mimeType: string;
};

function attachmentSource(message: { attachmentData?: string | null; attachmentMimeType?: string | null }) {
  if (!message.attachmentData) return '';
  if (message.attachmentData.startsWith('data:')) return message.attachmentData;
  return message.attachmentMimeType
    ? `data:${message.attachmentMimeType};base64,${message.attachmentData}`
    : message.attachmentData;
}

function readAttachment(file: File): Promise<AttachmentDraft> {
  return new Promise((resolve, reject) => {
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error('Files must be 8 MB or smaller.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve({
      name: file.name,
      data: String(reader.result || ''),
      mimeType: file.type || 'application/octet-stream',
    });
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });
}

type ChatMessageRecord = {
  id: string;
  clientMessageId?: string | null;
  senderId: string;
  receiverId?: string;
  content: string;
  createdAt: string;
  groupId?: string;
  attachmentName?: string | null;
  attachmentMimeType?: string | null;
  pollOptions?: unknown;
  replyToId?: string | null;
};

function sameChatPayload(a: ChatMessageRecord, b: ChatMessageRecord) {
  return a.senderId === b.senderId
    && a.receiverId === b.receiverId
    && (!a.groupId || !b.groupId || a.groupId === b.groupId)
    && a.content === b.content
    && (a.attachmentName || null) === (b.attachmentName || null)
    && (a.attachmentMimeType || null) === (b.attachmentMimeType || null)
    && JSON.stringify(a.pollOptions || null) === JSON.stringify(b.pollOptions || null)
    && (a.replyToId || null) === (b.replyToId || null);
}

function messageIdentity(message: ChatMessageRecord) {
  return message.clientMessageId || message.id;
}

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

// These are intentionally lightweight, native sticker choices. Tapping one
// sends it as a message immediately, while the media picker below supports
// arbitrary sticker/GIF files from the user's device.
const CHAT_STICKERS = ['🥳', '🤩', '😎', '😂', '😭', '🤗', '🙌', '🔥', '💯', '🚀', '💖', '🎉'];

function reactionEntries(reactions?: Record<string, string[]> | null) {
  return Object.entries(reactions || {}).filter(([, users]) => Array.isArray(users) && users.length > 0);
}

function messageQuote(message?: { content?: string; attachmentName?: string | null; pollOptions?: unknown } | null) {
  if (!message) return 'Original message unavailable';
  if (message.content) return message.content;
  if (Array.isArray(message.pollOptions) && message.pollOptions.length) return `Poll: ${message.pollOptions[0]}`;
  return message.attachmentName ? `Attachment: ${message.attachmentName}` : 'Attachment';
}

function chatDayLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDifference = Math.round((startOfToday - startOfDate) / 86_400_000);
  if (dayDifference === 0) return 'Today';
  if (dayDifference === 1) return 'Yesterday';
  return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
}

function startsNewChatDay(message: ChatMessageRecord, previous?: ChatMessageRecord) {
  if (!previous) return true;
  const currentDate = new Date(message.createdAt);
  const previousDate = new Date(previous.createdAt);
  return currentDate.toDateString() !== previousDate.toDateString();
}

// SSE and the POST response can deliver the same saved message in either
// order. Merge by durable server id and reconcile matching optimistic rows.
function mergeChatMessages<T extends ChatMessageRecord>(
  previous: T[],
  incoming: T[],
  pendingIds?: Set<string>,
) {
  const droppedPendingIds = new Set<string>();
  if (incoming.length) {
    const serverMessages = incoming.filter(message => !message.id.startsWith('temp-'));
    // Reconcile every temporary row, not only rows still in pendingIds. An SSE
    // event can arrive while React is committing the optimistic state update,
    // leaving the temp row visible after the pending set has already changed.
    for (const pending of previous.filter(message => message.id.startsWith('temp-'))) {
      const matchingServerMessage = serverMessages
        .filter(message => sameChatPayload(pending, message))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      if (!matchingServerMessage) continue;
      const pendingTime = new Date(pending.createdAt).getTime();
      const serverTime = new Date(matchingServerMessage.createdAt).getTime();
      // Do not consume an old identical message for a newly pending send.
      if (!Number.isNaN(pendingTime) && !Number.isNaN(serverTime) && serverTime < pendingTime - 15_000) continue;
      droppedPendingIds.add(pending.id);
      pendingIds?.delete(pending.id);
    }
  }

  const byId = new Map<string, T>();
  for (const message of previous) {
    if (!droppedPendingIds.has(message.id)) byId.set(messageIdentity(message), message);
  }
  for (const message of incoming) byId.set(messageIdentity(message), message);
  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

const CIRCLE_TYPES: { type: CircleType; label: string; icon: React.ReactNode; color: string; hint: string }[] = [
  { type: 'college',  label: 'College Circle',  icon: <Building2 size={14} />,    color: 'text-indigo-500',  hint: 'e.g. NIT Trichy General' },
  { type: 'batch',    label: 'Batch Circle',     icon: <GraduationCap size={14} />, color: 'text-violet-500',  hint: 'e.g. NIT Trichy 2028' },
  { type: 'branch',   label: 'Branch Circle',    icon: <Cpu size={14} />,           color: 'text-sky-500',     hint: 'e.g. NIT Trichy EEE' },
  { type: 'course',   label: 'Course Circle',    icon: <BookOpen size={14} />,      color: 'text-emerald-500', hint: 'e.g. Signals & Systems' },
  { type: 'exam',     label: 'Exam Circle',      icon: <FileText size={14} />,      color: 'text-amber-500',   hint: 'e.g. GATE EEE 2027' },
  { type: 'interest', label: 'Interest Circle',  icon: <Lightbulb size={14} />,     color: 'text-rose-500',    hint: 'e.g. Startup Founders' },
];

function CircleIcon({ type, size = 16 }: { type: CircleType; size?: number }) {
  const map: Record<CircleType, React.ReactNode> = {
    college:  <Building2 size={size} />,
    batch:    <GraduationCap size={size} />,
    branch:   <Cpu size={size} />,
    course:   <BookOpen size={size} />,
    exam:     <FileText size={size} />,
    interest: <Lightbulb size={size} />,
  };
  return <>{map[type] || <Hash size={size} />}</>;
}

function circleColor(type: CircleType) {
  const map: Record<CircleType, string> = {
    college:  'bg-indigo-500/10 text-indigo-500',
    batch:    'bg-violet-500/10 text-violet-500',
    branch:   'bg-sky-500/10 text-sky-500',
    course:   'bg-emerald-500/10 text-emerald-500',
    exam:     'bg-amber-500/10 text-amber-500',
    interest: 'bg-rose-500/10 text-rose-500',
  };
  return map[type] || 'bg-indigo-500/10 text-indigo-500';
}

export default function MessagingSection({
  currentUser,
  connections,
  allUsers,
  darkMode,
  preSelectedUserId,
  preSelectedGroupId,
  onViewUserProfile,
  communities = [],
  onUnreadCountChange,
}: MessagingSectionProps) {
  const [tab, setTab] = useState<ChatTab>('dms');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  // ── Poll real online status every 30s ─────────────────────────────────────
  useEffect(() => {
    const fetchOnline = async () => {
      try {
        const ids: string[] = await fetch(`${API_ORIGIN}/api/sessions/online`).then(r => r.json());
        setOnlineUserIds(new Set(ids));
      } catch {}
    };
    fetchOnline();
    const t = setInterval(fetchOnline, 30000);
    return () => clearInterval(t);
  }, []);

  // ── DM state ──────────────────────────────────────────────────────────────
  const acceptedConns = connections.filter(
    c => (c.senderId === currentUser.id || c.receiverId === currentUser.id) && c.status === 'accepted'
  );
  const matchedUserIds = acceptedConns.map(c =>
    c.senderId === currentUser.id ? c.receiverId : c.senderId
  );
  // Also include anyone the current user has exchanged messages with (pending connections too)
  const [messagedUserIds, setMessagedUserIds] = useState<string[]>([]);
  const inboxUsers = allUsers.filter(u => {
    if (u.isSuspended || u.id === currentUser.id) return false;
    return matchedUserIds.includes(u.id) || messagedUserIds.includes(u.id) || u.id === preSelectedUserId;
  });

  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(() => {
    if (preSelectedUserId) return allUsers.find(u => u.id === preSelectedUserId) || inboxUsers[0] || null;
    return inboxUsers[0] || null;
  });
  const [chatSearch, setChatSearch] = useState('');
  const [typedMessage, setTypedMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<DirectMessage | GroupMessage | null>(null);
  const [reactionMenuFor, setReactionMenuFor] = useState<string | null>(null);
  const [actionMenuFor, setActionMenuFor] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const dmBottomRef = useRef<HTMLDivElement>(null);
  const [attachmentDraft, setAttachmentDraft] = useState<AttachmentDraft | null>(null);
  const [composerMenuOpen, setComposerMenuOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [emojiPickerTab, setEmojiPickerTab] = useState<'emoji' | 'sticker'>('emoji');
  const [pollTarget, setPollTarget] = useState<'dm' | 'circle' | null>(null);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dmRealtimeStatus, setDmRealtimeStatus] = useState<'connecting' | 'live' | 'syncing'>('connecting');
  const [circleRealtimeStatus, setCircleRealtimeStatus] = useState<'connecting' | 'live' | 'syncing'>('connecting');

  // ── Circle state ──────────────────────────────────────────────────────────
  const [circles, setCircles] = useState<GroupChat[]>([]);
  const [selectedCircle, setSelectedCircle] = useState<GroupChat | null>(null);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [circleMessages, setCircleMessages] = useState<GroupMessage[]>([]);
  const [circleTyped, setCircleTyped] = useState('');
  const circleBottomRef = useRef<HTMLDivElement>(null);
  const [circleSearch, setCircleSearch] = useState('');
  const circlePendingIds = useRef<Set<string>>(new Set());
  const latestCircleMessageAt = useRef<string | null>(null);

  // ── Create circle modal ───────────────────────────────────────────────────
  const [showCreateCircle, setShowCreateCircle] = useState(false);
  const [newCircleName, setNewCircleName] = useState('');
  const [newCircleType, setNewCircleType] = useState<CircleType>('interest');
  const [inviteSearch, setInviteSearch] = useState('');
  const [inviteSelected, setInviteSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  const dmPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const circlePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dmStreamRef = useRef<ReturnType<typeof api.messages.stream> | null>(null);
  const groupStreamRef = useRef<ReturnType<typeof api.groupChats.stream> | null>(null);

  // ── Self-contained DM message state ──────────────────────────────────────
  const [localMessages, setLocalMessages] = useState<DirectMessage[]>([]);
  const pendingIds = useRef<Set<string>>(new Set());
  const directSendInFlight = useRef(false);
  const isFetchingDMs = useRef(false);
  const queuedFullRefresh = useRef(false);
  const latestDirectMessageAt = useRef<string | null>(null);

  const fetchMessages = useCallback(async (fullRefresh = false) => {
    if (isFetchingDMs.current) {
      if (fullRefresh) queuedFullRefresh.current = true;
      return;
    }
    isFetchingDMs.current = true;
    const shouldRefreshAll = fullRefresh || queuedFullRefresh.current;
    queuedFullRefresh.current = false;
    try {
      const fresh: DirectMessage[] = await api.messages.getForUser(
        currentUser.id,
        shouldRefreshAll ? undefined : latestDirectMessageAt.current || undefined,
      );
      for (const message of fresh) {
        if (
          !latestDirectMessageAt.current
          || new Date(message.createdAt).getTime() > new Date(latestDirectMessageAt.current).getTime()
        ) {
          latestDirectMessageAt.current = message.createdAt;
        }
      }
      setLocalMessages(prev => mergeChatMessages(prev, fresh, pendingIds.current));
    } catch {} finally {
      isFetchingDMs.current = false;
      if (queuedFullRefresh.current) void fetchMessages(true);
    }
  }, [currentUser.id]);

  // ── My joined projects & events ───────────────────────────────────────────
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [myEvents, setMyEvents] = useState<CampusEvent[]>([]);

  useEffect(() => {
    api.projects.getAll().then((all: Project[]) =>
      setMyProjects(all.filter(p => Array.isArray(p.memberIds) && p.memberIds.includes(currentUser.id)))
    ).catch(() => {});
    api.events.getAll().then((all: CampusEvent[]) =>
      setMyEvents(all.filter(e => Array.isArray(e.registeredIds) && e.registeredIds.includes(currentUser.id)))
    ).catch(() => {});
  }, [currentUser.id]);

  // ── Load circles ──────────────────────────────────────────────────────────
  const loadCircles = useCallback(async () => {
    try {
      const all: GroupChat[] = await api.groupChats.getAll();
      const mine = all.filter(g =>
        (Array.isArray(g.memberIds) ? g.memberIds : []).includes(currentUser.id) ||
        (Array.isArray(g.pendingIds) ? g.pendingIds : []).includes(currentUser.id)
      );
      setCircles(mine);
      if (selectedCircle) {
        const updated = mine.find(g => g.id === selectedCircle.id);
        if (updated) setSelectedCircle(updated);
      }
    } catch {}
  }, [currentUser.id]);

  useEffect(() => { loadCircles(); }, [loadCircles]);

  // ── Direct messages use SSE for instant delivery, with polling recovery ─────
  useEffect(() => {
    if (tab !== 'dms') {
      setDmRealtimeStatus('connecting');
      if (dmPollRef.current) clearInterval(dmPollRef.current);
      dmStreamRef.current?.close();
      return;
    }
    let disposed = false;
    setDmRealtimeStatus('connecting');
    // Keep a database reconciliation timer even while SSE is connected.
    // Autoscale instances do not share the in-memory SSE registry, so a
    // successful stream alone cannot guarantee that another instance's POST
    // will reach this browser.
    void fetchMessages(true);
    // Keep this short even while SSE is connected. Vercel instances do not
    // share their in-memory stream registries, so this is the cross-instance
    // delivery guarantee.
    dmPollRef.current = setInterval(() => fetchMessages(), 1500);
    const stream = api.messages.stream(currentUser.id);
    dmStreamRef.current = stream;
    stream.onopen = () => {
      setDmRealtimeStatus('live');
      // Rehydrate after every initial connection and automatic reconnect so
      // messages sent during a disconnected window are not lost.
      void fetchMessages(true);
    };
    stream.onmessage = event => {
      if (disposed || !event.data) return;
      try {
         const message = JSON.parse(event.data) as DirectMessage & {
           type?: string;
           readerId?: string;
           messageIds?: string[];
         };
         if (message.type === 'read_receipt') {
          // The server sends this event to the message sender's stream and
          // identifies the reader with the recipient's id.
          if (!Array.isArray(message.messageIds)) return;
           const readIds = new Set(message.messageIds);
           setLocalMessages(previous => previous.map(item =>
             readIds.has(item.id) ? { ...item, isRead: true } : item
           ));
           return;
         }
        if (!message.id || !message.senderId) return;
        if (
          !latestDirectMessageAt.current
          || new Date(message.createdAt).getTime() > new Date(latestDirectMessageAt.current).getTime()
        ) {
          latestDirectMessageAt.current = message.createdAt;
        }
        setLocalMessages(previous => mergeChatMessages(previous, [message], pendingIds.current));
      } catch {}
    };
    stream.onerror = () => {
      setDmRealtimeStatus('syncing');
      void fetchMessages(true);
    };
    return () => {
      disposed = true;
      stream.close();
      if (dmPollRef.current) clearInterval(dmPollRef.current);
      dmStreamRef.current = null;
    };
  }, [tab, fetchMessages]);

  // ── Derive messaged user IDs from fetched messages ───────────────────────
  useEffect(() => {
    const ids = new Set<string>();
    localMessages.forEach(m => {
      if (m.senderId === currentUser.id) ids.add(m.receiverId);
      if (m.receiverId === currentUser.id) ids.add(m.senderId);
    });
    setMessagedUserIds(Array.from(ids));
  }, [localMessages, currentUser.id]);

  // ── Mark messages read when conversation opens ────────────────────────────
  useEffect(() => {
    if (!selectedUser) return;
    api.messages.markRead(currentUser.id, selectedUser.id).catch(() => {});
    setLocalMessages(prev => prev.map(m =>
      m.senderId === selectedUser.id && m.receiverId === currentUser.id
        ? { ...m, isRead: true }
        : m
    ));
  }, [selectedUser?.id, currentUser.id]);

  // If a new message arrives while its conversation is already open, mark it
  // read immediately so the sender sees the blue double-check without waiting
  // for another navigation or refresh.
  useEffect(() => {
    if (!selectedUser) return;
    const hasUnreadIncoming = localMessages.some(message =>
      message.senderId === selectedUser.id
      && message.receiverId === currentUser.id
      && !message.isRead
    );
    if (!hasUnreadIncoming) return;
    api.messages.markRead(currentUser.id, selectedUser.id).catch(() => {});
    setLocalMessages(previous => previous.map(message =>
      message.senderId === selectedUser.id && message.receiverId === currentUser.id
        ? { ...message, isRead: true }
        : message
    ));
  }, [localMessages, selectedUser?.id, currentUser.id]);

  // ── Report unread count to parent (for nav badge) ─────────────────────────
  useEffect(() => {
    const count = localMessages.filter(m => m.receiverId === currentUser.id && !m.isRead).length;
    onUnreadCountChange?.(count);
  }, [localMessages, currentUser.id, onUnreadCountChange]);

  // ── Circle messages use SSE for instant delivery, with polling recovery ────
  useEffect(() => {
    if (!selectedCircle || tab !== 'circles') {
      setCircleRealtimeStatus('connecting');
      if (circlePollRef.current) clearInterval(circlePollRef.current);
      groupStreamRef.current?.close();
      return;
    }
    let disposed = false;
    setCircleRealtimeStatus('connecting');
    const fetchMsgs = async () => {
      try {
        const msgs: GroupMessage[] = await api.groupChats.getMessages(selectedCircle.id);
        for (const message of msgs) {
          if (
            !latestCircleMessageAt.current
            || new Date(message.createdAt).getTime() > new Date(latestCircleMessageAt.current).getTime()
          ) {
            latestCircleMessageAt.current = message.createdAt;
          }
        }
        setCircleMessages(previous => mergeChatMessages(previous, msgs, circlePendingIds.current));
      } catch {}
    };
    void fetchMsgs();
    // Reconcile from the database even when SSE is open because autoscale
    // instances do not share their in-memory stream registries.
    circlePollRef.current = setInterval(fetchMsgs, 1500);
    const stream = api.groupChats.stream(selectedCircle.id, currentUser.id);
    groupStreamRef.current = stream;
    stream.onopen = () => {
      setCircleRealtimeStatus('live');
      void fetchMsgs();
    };
    stream.onmessage = event => {
      if (disposed || !event.data) return;
      try {
        const message = JSON.parse(event.data) as GroupMessage;
        if (
          !latestCircleMessageAt.current
          || new Date(message.createdAt).getTime() > new Date(latestCircleMessageAt.current).getTime()
        ) {
          latestCircleMessageAt.current = message.createdAt;
        }
        setCircleMessages(previous => mergeChatMessages(previous, [message], circlePendingIds.current));
      } catch {}
    };
    stream.onerror = () => {
      setCircleRealtimeStatus('syncing');
      void fetchMsgs();
    };
    return () => {
      disposed = true;
      stream.close();
      if (circlePollRef.current) clearInterval(circlePollRef.current);
      groupStreamRef.current = null;
    };
  }, [selectedCircle?.id, tab, currentUser.id]);

  useEffect(() => { dmBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [localMessages, selectedUser]);
  useEffect(() => { circleBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [circleMessages, selectedCircle]);

  useEffect(() => {
    if (preSelectedUserId) {
      const matched = allUsers.find(u => u.id === preSelectedUserId);
      if (matched) { setSelectedUser(matched); setShowMobileChat(true); }
    }
  }, [preSelectedUserId, allUsers]);

  useEffect(() => {
    setReplyingTo(null);
    setReactionMenuFor(null);
    setActionMenuFor(null);
    setChatError(null);
  }, [tab, selectedUser?.id, selectedCircle?.id]);

  // ── Open a specific group when navigated from My Content "Chat" button ───────
  useEffect(() => {
    if (!preSelectedGroupId) return;
    // Wait until circles are loaded
    const target = circles.find(g => g.id === preSelectedGroupId);
    if (target) {
      setTab('circles');
      setSelectedCircle(target);
      setSelectedCommunity(null);
      setShowMobileChat(true);
    }
  }, [preSelectedGroupId, circles]);

  // ── DM helpers ────────────────────────────────────────────────────────────
  const unreadCount = (partnerId: string) =>
    localMessages.filter(m => m.senderId === partnerId && m.receiverId === currentUser.id && !m.isRead).length;

  const sendDirectPayload = async (content: string, extras: MessageExtras = {}) => {
    // Prevent two direct-send handlers from persisting the same user action
    // while the first request is still awaiting the server. Group/community
    // sends use a separate path and are intentionally unaffected.
    if (!selectedUser || currentUser.isSuspended || directSendInFlight.current) return;
    directSendInFlight.current = true;
    setChatError(null);
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    pendingIds.current.add(tempId);
    const optimistic: DirectMessage = {
      id: tempId,
      clientMessageId: tempId,
      senderId: currentUser.id,
      receiverId: selectedUser.id,
      content,
      ...extras,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setLocalMessages(prev => mergeChatMessages(prev, [optimistic], pendingIds.current));
    try {
      // The server uses this stable id to make retries/concurrent duplicate
      // requests return the same persisted message instead of inserting twice.
      const saved: DirectMessage = await api.messages.send(currentUser.id, selectedUser.id, content, {
        ...extras,
        clientMessageId: tempId,
      });
      if (
        !latestDirectMessageAt.current
        || new Date(saved.createdAt).getTime() > new Date(latestDirectMessageAt.current).getTime()
      ) {
        latestDirectMessageAt.current = saved.createdAt;
      }
      setLocalMessages(prev => mergeChatMessages(prev, [saved], pendingIds.current));
    } catch (error) {
      pendingIds.current.delete(tempId);
      setLocalMessages(prev => prev.filter(m => m.id !== tempId));
      setChatError(error instanceof Error ? error.message : 'Your message could not be sent. Please try again.');
    } finally {
      directSendInFlight.current = false;
    }
  };

  const handleDMSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim()) return;
    const content = typedMessage.trim();
    setTypedMessage('');
    const reply = replyingTo;
    setReplyingTo(null);
    await sendDirectPayload(content, reply ? { replyToId: reply.id } : {});
  };

  const activeChatMessages = selectedUser
    ? localMessages
        .filter(m =>
          (m.senderId === currentUser.id && m.receiverId === selectedUser.id) ||
          (m.senderId === selectedUser.id && m.receiverId === currentUser.id)
        )
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    : [];

  // ── Circle helpers ────────────────────────────────────────────────────────
  const sendCirclePayload = async (content: string, extras: MessageExtras = {}) => {
    if (!selectedCircle || currentUser.isSuspended) return;
    setChatError(null);
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    circlePendingIds.current.add(tempId);
    const optimistic: GroupMessage = {
      id: tempId,
      groupId: selectedCircle.id,
      senderId: currentUser.id,
      content,
      ...extras,
      createdAt: new Date().toISOString(),
    };
    setCircleMessages(prev => [...prev, optimistic]);
    try {
      const saved: GroupMessage = await api.groupChats.sendMessage(selectedCircle.id, currentUser.id, content, extras);
      if (
        !latestCircleMessageAt.current
        || new Date(saved.createdAt).getTime() > new Date(latestCircleMessageAt.current).getTime()
      ) {
        latestCircleMessageAt.current = saved.createdAt;
      }
      setCircleMessages(prev => mergeChatMessages(prev, [saved], circlePendingIds.current));
    } catch (error) {
      circlePendingIds.current.delete(tempId);
      setCircleMessages(prev => prev.filter(m => m.id !== tempId));
      setChatError(error instanceof Error ? error.message : 'Your message could not be sent. Please try again.');
    }
  };

  const handleCircleMsgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!circleTyped.trim()) return;
    const content = circleTyped.trim();
    setCircleTyped('');
    const reply = replyingTo;
    setReplyingTo(null);
    await sendCirclePayload(content, reply ? { replyToId: reply.id } : {});
  };

  const toggleReaction = async (message: DirectMessage | GroupMessage, emoji: string) => {
    const currentUsers = message.reactions?.[emoji] || [];
    const nextUsers = currentUsers.includes(currentUser.id)
      ? currentUsers.filter(id => id !== currentUser.id)
      : [...currentUsers, currentUser.id];
    const nextReactions = { ...(message.reactions || {}) };
    if (nextUsers.length) nextReactions[emoji] = nextUsers;
    else delete nextReactions[emoji];
    setReactionMenuFor(null);
    setActionMenuFor(null);
    setChatError(null);

    if ('receiverId' in message) {
      setLocalMessages(prev => prev.map(item => item.id === message.id ? { ...item, reactions: nextReactions } : item));
      try {
        const saved: DirectMessage = await api.messages.toggleReaction(message.id, currentUser.id, emoji);
        setLocalMessages(prev => prev.map(item => item.id === message.id ? saved : item));
      } catch (error) {
        setLocalMessages(prev => prev.map(item => item.id === message.id ? message : item));
        setChatError(error instanceof Error ? error.message : 'That reaction could not be saved. Please try again.');
      }
    } else if (selectedCircle) {
      setCircleMessages(prev => prev.map(item => item.id === message.id ? { ...item, reactions: nextReactions } : item));
      try {
        const saved: GroupMessage = await api.groupChats.toggleReaction(selectedCircle.id, message.id, currentUser.id, emoji);
        setCircleMessages(prev => prev.map(item => item.id === message.id ? saved : item));
      } catch (error) {
        setCircleMessages(prev => prev.map(item => item.id === message.id ? message : item));
        setChatError(error instanceof Error ? error.message : 'That reaction could not be saved. Please try again.');
      }
    }
  };

  const handleFilePicked = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      setAttachmentDraft(await readAttachment(file));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not attach that file.');
    }
    setComposerMenuOpen(false);
  };

  const openPollComposer = () => {
    setPollTarget(tab === 'circles' && selectedCircle ? 'circle' : 'dm');
    setPollQuestion('');
    setPollOptions(['', '']);
    setComposerMenuOpen(false);
  };

  const closePollComposer = () => {
    setPollTarget(null);
    setPollQuestion('');
    setPollOptions(['', '']);
  };

  const submitPoll = async () => {
    const options = pollOptions.map(option => option.trim()).filter(Boolean);
    if (!pollQuestion.trim() || options.length < 2) return;
    const extras = { pollOptions: options };
    const question = pollQuestion.trim();
    closePollComposer();
    const reply = replyingTo;
    setReplyingTo(null);
    const payload = reply ? { ...extras, replyToId: reply.id } : extras;
    if (tab === 'circles' && selectedCircle) await sendCirclePayload(question, payload);
    else await sendDirectPayload(question, payload);
  };

  const handleAttachmentSend = async () => {
    if (!attachmentDraft) return;
    const draft = attachmentDraft;
    setAttachmentDraft(null);
    const extras = {
      attachmentName: draft.name,
      attachmentData: draft.data,
      attachmentMimeType: draft.mimeType,
      ...(replyingTo ? { replyToId: replyingTo.id } : {}),
    };
    setReplyingTo(null);
    if (tab === 'circles' && selectedCircle) await sendCirclePayload('', extras);
    else await sendDirectPayload('', extras);
  };

  const insertChatEmoji = (emoji: string) => {
    if (tab === 'circles' && selectedCircle) {
      setCircleTyped(previous => `${previous}${emoji}`);
    } else {
      setTypedMessage(previous => `${previous}${emoji}`);
    }
    setEmojiPickerOpen(false);
  };

  const sendChatSticker = async (sticker: string) => {
    setEmojiPickerOpen(false);
    const reply = replyingTo;
    setReplyingTo(null);
    const extras = reply ? { replyToId: reply.id } : {};
    if (tab === 'circles' && selectedCircle) {
      await sendCirclePayload(sticker, extras);
    } else {
      await sendDirectPayload(sticker, extras);
    }
  };

  const votePoll = async (message: DirectMessage | GroupMessage, optionIndex: number) => {
    const nextVotes = { ...(message.pollVotes || {}), [currentUser.id]: optionIndex };
    if ('receiverId' in message) {
      setLocalMessages(prev => prev.map(item => item.id === message.id ? { ...item, pollVotes: nextVotes } : item));
      try {
        const saved: DirectMessage = await api.messages.votePoll(message.id, currentUser.id, optionIndex);
        setLocalMessages(prev => prev.map(item => item.id === message.id ? saved : item));
      } catch {}
    } else if (selectedCircle) {
      setCircleMessages(prev => prev.map(item => item.id === message.id ? { ...item, pollVotes: nextVotes } : item));
      try {
        const saved: GroupMessage = await api.groupChats.votePoll(selectedCircle.id, message.id, currentUser.id, optionIndex);
        setCircleMessages(prev => prev.map(item => item.id === message.id ? saved : item));
      } catch {}
    }
  };

  const handleAcceptCircle = async (id: string) => {
    try {
      const updated: GroupChat = await api.groupChats.accept(id, currentUser.id);
      setCircles(prev => prev.map(g => g.id === id ? updated : g));
    } catch {}
  };

  const handleDeclineCircle = async (id: string) => {
    try {
      await api.groupChats.decline(id, currentUser.id);
      setCircles(prev => prev.filter(g => g.id !== id));
    } catch {}
  };

  // ── Create circle ─────────────────────────────────────────────────────────
  const sameCollegeUsers = allUsers.filter(u =>
    u.id !== currentUser.id && !u.isSuspended
  );
  const inviteSearchResults = sameCollegeUsers.filter(u =>
    u.fullName.toLowerCase().includes(inviteSearch.toLowerCase()) ||
    u.college.toLowerCase().includes(inviteSearch.toLowerCase()) ||
    u.branch.toLowerCase().includes(inviteSearch.toLowerCase())
  ).slice(0, 8);

  const handleCreateCircle = async () => {
    if (!newCircleName.trim() || creating) return;
    setCreating(true);
    try {
      const created: GroupChat = await api.groupChats.create({
        name: newCircleName.trim(),
        type: newCircleType,
        creatorId: currentUser.id,
        college: currentUser.college,
        branch: currentUser.branch,
        inviteUserIds: inviteSelected,
      });
      setCircles(prev => [created, ...prev]);
      setShowCreateCircle(false);
      setNewCircleName('');
      setNewCircleType('interest');
      setInviteSelected([]);
      setInviteSearch('');
      setSelectedCircle(created);
      setShowMobileChat(true);
    } catch {}
    setCreating(false);
  };

  const pendingCircles = circles.filter(g => (Array.isArray(g.pendingIds) ? g.pendingIds : []).includes(currentUser.id));
  const memberCircles  = circles.filter(g => (Array.isArray(g.memberIds) ? g.memberIds : []).includes(currentUser.id));

  const filteredInbox = inboxUsers
    .filter(u =>
      u.fullName.toLowerCase().includes(chatSearch.toLowerCase()) ||
      u.college.toLowerCase().includes(chatSearch.toLowerCase())
    )
    .sort((a, b) => {
      const lastA = localMessages
        .filter(m => (m.senderId === currentUser.id && m.receiverId === a.id) || (m.senderId === a.id && m.receiverId === currentUser.id))
        .reduce((latest, m) => Math.max(latest, new Date(m.createdAt).getTime()), 0);
      const lastB = localMessages
        .filter(m => (m.senderId === currentUser.id && m.receiverId === b.id) || (m.senderId === b.id && m.receiverId === currentUser.id))
        .reduce((latest, m) => Math.max(latest, new Date(m.createdAt).getTime()), 0);
      return lastB - lastA;
    });

  // Group member circles by type for the structured sidebar
  const circlesByType: Partial<Record<CircleType, GroupChat[]>> = {};
  for (const c of memberCircles) {
    if (!circlesByType[c.type]) circlesByType[c.type] = [];
    circlesByType[c.type]!.push(c);
  }

  const filteredMemberCircles = memberCircles.filter(g =>
    g.name.toLowerCase().includes(circleSearch.toLowerCase())
  );

  const selectedCTDef = CIRCLE_TYPES.find(t => t.type === newCircleType)!;
  const dm = darkMode;

  return (
    <div className="flex flex-col flex-1 w-full h-full min-h-0">

      {pollTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm">
          <div className={`w-full max-w-sm rounded-2xl border p-5 shadow-2xl ${dm ? 'border-white/10 bg-[#121217] text-white' : 'border-slate-200 bg-white text-slate-900'}`}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold text-sm">Create a poll</h3>
                <p className="mt-1 text-[10px] text-slate-400">Ask your {pollTarget === 'circle' ? 'circle' : 'conversation'} a quick question.</p>
              </div>
              <button type="button" onClick={closePollComposer} className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"><X size={15} /></button>
            </div>
            <input autoFocus value={pollQuestion} onChange={event => setPollQuestion(event.target.value)} placeholder="What do you want to ask?" className={`w-full rounded-xl border px-3 py-2.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500 ${dm ? 'border-white/10 bg-[#09090C] text-white' : 'border-slate-200 bg-slate-50'}`} />
            <div className="mt-3 space-y-2">
              {pollOptions.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <input value={option} onChange={event => setPollOptions(previous => previous.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder={`Option ${index + 1}`} className={`flex-1 rounded-xl border px-3 py-2.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500 ${dm ? 'border-white/10 bg-[#09090C] text-white' : 'border-slate-200 bg-slate-50'}`} />
                  {pollOptions.length > 2 && <button type="button" onClick={() => setPollOptions(previous => previous.filter((_, itemIndex) => itemIndex !== index))} className="p-2 text-slate-400 hover:text-rose-500 cursor-pointer"><X size={14} /></button>}
                </div>
              ))}
            </div>
            {pollOptions.length < 6 && <button type="button" onClick={() => setPollOptions(previous => [...previous, ''])} className="mt-3 text-[10px] font-bold text-indigo-500 hover:text-indigo-600 cursor-pointer">+ Add option</button>}
            <div className="flex gap-2 mt-5">
              <button type="button" onClick={closePollComposer} className="flex-1 rounded-xl border border-slate-200 dark:border-white/10 px-3 py-2.5 text-xs font-semibold cursor-pointer">Cancel</button>
              <button type="button" onClick={submitPoll} disabled={!pollQuestion.trim() || pollOptions.filter(Boolean).length < 2} className="flex-1 rounded-xl bg-indigo-500 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-40 cursor-pointer">Post poll</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Circle Modal ───────────────────────────────────────────── */}
      {showCreateCircle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl shadow-xl border border-neutral-200 dark:border-white/10 p-5 space-y-4 ${dm ? 'bg-[#121217] text-white' : 'bg-white text-slate-900'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm uppercase tracking-wider">Create a Circle</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Structured group for your campus or interests</p>
              </div>
              <button onClick={() => setShowCreateCircle(false)} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/5 cursor-pointer"><X size={15} /></button>
            </div>

            {/* Circle type picker */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Circle Type</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTypeDropdown(v => !v)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer ${dm ? 'bg-[#09090C] border-white/10' : 'bg-neutral-50 border-neutral-200'}`}
                >
                  <span className={`flex items-center gap-2 ${selectedCTDef.color}`}>
                    {selectedCTDef.icon}
                    {selectedCTDef.label}
                  </span>
                  <ChevronDown size={13} className="text-slate-400" />
                </button>
                {showTypeDropdown && (
                  <div className={`absolute top-full left-0 right-0 mt-1 rounded-xl border shadow-lg z-10 overflow-hidden ${dm ? 'bg-[#1c1c24] border-white/10' : 'bg-white border-neutral-200'}`}>
                    {CIRCLE_TYPES.map(ct => (
                      <button
                        key={ct.type}
                        type="button"
                        onClick={() => { setNewCircleType(ct.type); setShowTypeDropdown(false); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold cursor-pointer transition-all text-left ${newCircleType === ct.type ? (dm ? 'bg-white/5' : 'bg-neutral-50') : ''} ${dm ? 'hover:bg-white/5' : 'hover:bg-neutral-50'}`}
                      >
                        <span className={ct.color}>{ct.icon}</span>
                        <div className="min-w-0">
                          <span className="block">{ct.label}</span>
                          <span className="text-[9px] text-slate-400 font-normal">{ct.hint}</span>
                        </div>
                        {newCircleType === ct.type && <Check size={12} className="ml-auto text-indigo-500 shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Circle Name</label>
              <input
                type="text"
                placeholder={selectedCTDef.hint}
                value={newCircleName}
                onChange={e => setNewCircleName(e.target.value)}
                className={`w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${dm ? 'bg-[#09090C] text-white' : 'bg-neutral-50 text-slate-900'}`}
              />
            </div>

            {/* Invite */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Invite Members (optional)</label>
              <input
                type="text"
                placeholder="Search by name, college, or branch..."
                value={inviteSearch}
                onChange={e => setInviteSearch(e.target.value)}
                className={`w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-indigo-500 mb-2 ${dm ? 'bg-[#09090C] text-white' : 'bg-neutral-50 text-slate-900'}`}
              />
              {inviteSelected.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {inviteSelected.map(uid => {
                    const u = allUsers.find(x => x.id === uid);
                    return u ? (
                      <span key={uid} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 text-[10px] font-bold">
                        {u.fullName.split(' ')[0]}
                        <button onClick={() => setInviteSelected(p => p.filter(x => x !== uid))} className="cursor-pointer"><X size={9} /></button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}
              <div className="max-h-28 overflow-y-auto space-y-0.5">
                {inviteSearchResults.map(u => (
                  <div
                    key={u.id}
                    onClick={() => setInviteSelected(p => p.includes(u.id) ? p.filter(x => x !== u.id) : [...p, u.id])}
                    className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-all ${inviteSelected.includes(u.id) ? 'bg-indigo-500/10' : (dm ? 'hover:bg-white/5' : 'hover:bg-neutral-100')}`}
                  >
                    <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-[10px] font-bold text-indigo-600 dark:text-indigo-300 overflow-hidden shrink-0">
                      <Avatar avatar={u.avatar} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{u.fullName}</p>
                      <p className="text-[9px] text-slate-400 truncate">{u.college} · {u.branch}</p>
                    </div>
                    {inviteSelected.includes(u.id) && <Check size={12} className="text-indigo-500 shrink-0" />}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowCreateCircle(false)} className={`flex-1 py-2 rounded-xl text-xs font-bold border cursor-pointer ${dm ? 'border-white/10 text-slate-400 hover:bg-white/5' : 'border-neutral-200 text-slate-600 hover:bg-neutral-100'}`}>Cancel</button>
              <button
                onClick={handleCreateCircle}
                disabled={!newCircleName.trim() || creating}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 cursor-pointer transition-all"
              >
                {creating ? 'Creating…' : `Create${inviteSelected.length > 0 ? ` & Invite ${inviteSelected.length}` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Container ────────────────────────────────────────────────── */}
      <div
        className={`flex-1 w-full rounded-2xl border border-neutral-200 dark:border-white/10 flex overflow-hidden shadow-sm min-h-0 ${dm ? 'bg-[#121217]' : 'bg-white text-slate-800'}`}
        style={{ minHeight: '420px' }}
      >
        {/* ── LEFT PANEL ─────────────────────────────────────────────────── */}
        <div className={`${showMobileChat ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-neutral-200 dark:border-white/5 flex-col shrink-0 ${dm ? 'bg-[#09090C]' : 'bg-neutral-50/50'}`}>

          {/* Tabs */}
          <div className={`flex border-b border-neutral-200 dark:border-white/5 shrink-0`}>
            <button
              onClick={() => { setTab('dms'); setShowMobileChat(false); setSelectedCircle(null); setSelectedCommunity(null); }}
              className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1 ${tab === 'dms' ? 'border-indigo-500 text-indigo-500' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              <MessageSquare size={11} /> Direct
            </button>
            <button
              onClick={() => { setTab('circles'); setShowMobileChat(false); setSelectedUser(null); }}
              className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1 relative ${tab === 'circles' ? 'border-indigo-500 text-indigo-500' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              <Hash size={11} /> Circles
              {pendingCircles.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[8px] font-bold leading-none">{pendingCircles.length}</span>
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">

            {/* ── DM LIST ── */}
            {tab === 'dms' && (
              <div className="p-3 space-y-2.5">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400"><Search size={12} /></span>
                  <input type="text" placeholder="Search chats…" value={chatSearch} onChange={e => setChatSearch(e.target.value)}
                    className={`w-full pl-8 pr-3 py-1.5 rounded-xl text-xs border border-neutral-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${dm ? 'bg-[#121217] text-white' : 'bg-white'}`} />
                </div>

                <p className="text-[9px] uppercase font-bold tracking-widest text-slate-400 px-1">Connections Inbox</p>

                {filteredInbox.length === 0 ? (
                  <div className="text-center p-6 space-y-2">
                    <Users size={20} className="mx-auto text-neutral-400" />
                    <p className="text-[10px] text-slate-400">No connections yet. Connect with people in Discovery!</p>
                  </div>
                ) : filteredInbox.map(user => {
                  const unread = unreadCount(user.id);
                  const paired = localMessages.filter(m =>
                    (m.senderId === currentUser.id && m.receiverId === user.id) ||
                    (m.senderId === user.id && m.receiverId === currentUser.id)
                  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                  const lastMsg = paired[0];
                  const isSel = selectedUser?.id === user.id;

                  return (
                    <div
                      key={user.id}
                      onClick={() => { setSelectedUser(user); setShowMobileChat(true); }}
                      className={`p-3 rounded-xl flex items-start gap-2.5 cursor-pointer transition-all border ${isSel ? (dm ? 'bg-[#1c1c24] border-indigo-500/20' : 'bg-indigo-500/[0.04] border-indigo-100') : 'hover:bg-neutral-500/5 border-transparent'}`}
                    >
                      <div className="relative shrink-0">
                        <div className="p-[1.5px] rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-600">
                          <div className={`w-9 h-9 rounded-full border-2 border-white dark:border-[#09090C] flex items-center justify-center font-bold text-xs overflow-hidden ${dm ? 'bg-[#121217]' : 'bg-white'}`}>
                            <Avatar avatar={user.avatar} />
                          </div>
                        </div>
                        {onlineUserIds.has(user.id) && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#09090C]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold tracking-tight truncate">{user.fullName}</h4>
                          {unread > 0 && <span className="py-0.5 px-1.5 rounded-full text-[8px] font-bold bg-indigo-500 text-white animate-pulse shrink-0">{unread}</span>}
                        </div>
                        <p className="text-[10px] truncate text-slate-400">{user.college}</p>
                        {lastMsg && <p className="text-[9.5px] truncate italic mt-0.5 opacity-60">{lastMsg.senderId === currentUser.id ? 'You: ' : ''}{lastMsg.content}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── CIRCLE LIST ── */}
            {tab === 'circles' && (
              <div className="p-3 space-y-3">
                {/* Search + New Circle header */}
                <div className="relative">
                  <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Search custom circles…" value={circleSearch} onChange={e => setCircleSearch(e.target.value)}
                    className={`w-full pl-7 pr-3 py-2 rounded-xl text-xs border border-neutral-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${dm ? 'bg-[#121217] text-white' : 'bg-white'}`} />
                </div>

                <div className="flex items-center justify-between px-0.5">
                  <p className="text-[9px] uppercase font-bold tracking-widest text-slate-400">Campus Groups & Circles</p>
                  <button
                    onClick={() => setShowCreateCircle(true)}
                    className="flex items-center gap-1 text-[9px] font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer transition-all"
                  >
                    <Plus size={10} /> New Circle
                  </button>
                </div>

                {/* Pending invites */}
                {pendingCircles.length > 0 && (
                  <>
                    <p className="text-[9px] uppercase font-bold tracking-widest text-amber-500 px-1">Pending Invites</p>
                    {pendingCircles.map(g => (
                      <div key={g.id} className={`p-3 rounded-xl border ${dm ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
                        <div className="flex items-center gap-2 mb-2.5">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${circleColor(g.type as CircleType)}`}>
                            <CircleIcon type={g.type as CircleType} size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate">{g.name}</p>
                            <p className="text-[9px] text-slate-400">{CIRCLE_TYPES.find(t => t.type === g.type)?.label}</p>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={() => handleAcceptCircle(g.id)} className="flex-1 py-1.5 rounded-lg bg-indigo-500 text-white text-[10px] font-bold cursor-pointer hover:bg-indigo-600 flex items-center justify-center gap-1"><Check size={11} /> Join</button>
                          <button onClick={() => handleDeclineCircle(g.id)} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer flex items-center justify-center gap-1 ${dm ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-neutral-100 text-slate-500 hover:bg-neutral-200'}`}><X size={11} /> Decline</button>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* ── JOINED COMMUNITIES (Campus Hubs) ── */}
                {(() => {
                   const joined = communities.filter(c =>
                     (Array.isArray(c.memberIds) ? c.memberIds : []).includes(currentUser.id) &&
                    (!circleSearch || c.name.toLowerCase().includes(circleSearch.toLowerCase()))
                  );
                  if (joined.length === 0) return null;
                  const COLLEGE_PROJECT_CATS = ['Engineering & Technology', 'Startups & Entrepreneurship', 'Higher Education & Research'];
                  return (
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase font-bold tracking-widest text-indigo-400 px-0.5 flex items-center gap-1.5">
                        <Star size={9} /> Campus Hubs
                      </p>
                      {joined.map(c => {
                        const isProject = COLLEGE_PROJECT_CATS.includes(c.category);
                        const head = c.creatorId ? allUsers.find(u => u.id === c.creatorId) : null;
                        const isHead = c.creatorId === currentUser.id;
                        const isSel = selectedCommunity?.id === c.id;
                        return (
                          <div
                            key={c.id}
                            onClick={() => { setSelectedCommunity(c); setSelectedCircle(null); setShowMobileChat(true); }}
                            className={`p-3 rounded-xl flex items-center gap-3 border cursor-pointer transition-all ${isSel ? (dm ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200') : (dm ? 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]' : 'border-neutral-100 bg-slate-50/60 hover:bg-slate-100/80')}`}
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${dm ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
                              <CommIcon name={c.icon} size={18} className={dm ? 'text-indigo-400' : 'text-indigo-600'} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className={`text-xs font-bold truncate ${dm ? 'text-white' : 'text-slate-800'}`}>{c.name}</p>
                                {isHead && <span className="flex items-center gap-0.5 text-[8px] text-amber-500 font-bold shrink-0"><Crown size={8} /> Head</span>}
                              </div>
                              <p className={`text-[9px] truncate mt-0.5 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{c.description}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className={`flex items-center gap-0.5 text-[8px] ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
                                  <Users size={8} /> {(Array.isArray(c.memberIds) ? c.memberIds : []).length} Students
                                </span>
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${isProject ? 'bg-rose-500/10 text-rose-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                                  {isProject ? 'PROJECT' : 'CLUB'}
                                </span>
                                {head && !isHead && <span className={`text-[8px] truncate ${dm ? 'text-slate-600' : 'text-slate-400'}`}>by {head.fullName.split(' ')[0]}</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* ── JOINED PROJECTS ── */}
                {(() => {
                  const proj = myProjects.filter(p =>
                    !circleSearch || p.title.toLowerCase().includes(circleSearch.toLowerCase())
                  );
                  if (proj.length === 0) return null;
                  return (
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase font-bold tracking-widest text-amber-500 px-0.5 flex items-center gap-1.5">
                        <Rocket size={9} /> College Projects
                      </p>
                      {proj.map(p => {
                        const head = allUsers.find(u => u.id === p.creatorId);
                        const isHead = p.creatorId === currentUser.id;
                        return (
                          <div key={p.id} className={`p-3 rounded-xl flex items-center gap-3 border transition-all ${dm ? 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]' : 'border-neutral-100 bg-slate-50/60 hover:bg-slate-100/80'}`}>
                            <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                              <Rocket size={16} className="text-amber-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className={`text-xs font-bold truncate ${dm ? 'text-white' : 'text-slate-800'}`}>{p.title}</p>
                                {isHead && <span className="flex items-center gap-0.5 text-[8px] text-amber-500 font-bold shrink-0"><Crown size={8} /> Head</span>}
                              </div>
                              <p className={`text-[9px] truncate mt-0.5 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{p.description}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className={`flex items-center gap-0.5 text-[8px] ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
                                  <Users size={8} /> {(Array.isArray(p.memberIds) ? p.memberIds : []).length} Members
                                </span>
                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500">{p.stage}</span>
                                {head && !isHead && <span className={`text-[8px] truncate ${dm ? 'text-slate-600' : 'text-slate-400'}`}>by {head.fullName.split(' ')[0]}</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* ── REGISTERED EVENTS ── */}
                {(() => {
                  const evts = myEvents.filter(e =>
                    !circleSearch || e.title.toLowerCase().includes(circleSearch.toLowerCase())
                  );
                  if (evts.length === 0) return null;
                  return (
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase font-bold tracking-widest text-rose-500 px-0.5 flex items-center gap-1.5">
                        <Calendar size={9} /> Registered Events
                      </p>
                      {evts.map(e => {
                        const head = e.organizerId ? allUsers.find(u => u.id === e.organizerId) : null;
                        return (
                          <div key={e.id} className={`p-3 rounded-xl flex items-center gap-3 border transition-all ${dm ? 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]' : 'border-neutral-100 bg-slate-50/60 hover:bg-slate-100/80'}`}>
                            <div className="w-10 h-10 rounded-full bg-rose-500/15 flex items-center justify-center shrink-0">
                              {e.isOnline ? <Globe size={16} className="text-rose-500" /> : <Calendar size={16} className="text-rose-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-bold truncate ${dm ? 'text-white' : 'text-slate-800'}`}>{e.title}</p>
                              <p className={`text-[9px] truncate mt-0.5 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{e.date}{e.time ? ` · ${e.time}` : ''}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className={`flex items-center gap-0.5 text-[8px] ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
                                  <Users size={8} /> {(Array.isArray(e.registeredIds) ? e.registeredIds : []).length} Going
                                </span>
                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500">{e.category}</span>
                                {head && <span className={`text-[8px] truncate ${dm ? 'text-slate-600' : 'text-slate-400'}`}>by {head.fullName.split(' ')[0]}</span>}
                                {!head && e.organizer && <span className={`text-[8px] truncate ${dm ? 'text-slate-600' : 'text-slate-400'}`}>by {e.organizer}</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* ── CUSTOM CIRCLES (group chats) ── */}
                {Object.entries(circlesByType).length > 0 && (
                  <>
                    <p className="text-[9px] uppercase font-bold tracking-widest text-indigo-400 px-0.5 flex items-center gap-1.5">
                      <Hash size={9} /> Custom Circles
                    </p>
                    {(Object.entries(circlesByType) as [string, GroupChat[]][])
                      .filter(([, gs]) => circleSearch === '' || gs.some(g => g.name.toLowerCase().includes(circleSearch.toLowerCase())))
                      .map(([type, gs]) => {
                        const def = CIRCLE_TYPES.find(t => t.type === type);
                        const filtered = circleSearch ? gs.filter(g => g.name.toLowerCase().includes(circleSearch.toLowerCase())) : gs;
                        if (!filtered.length) return null;
                        // Fallback for non-CircleType groups (fun, study, startup, hackathon, etc.)
                        const fallbackColor = 'bg-violet-500/10 text-violet-500';
                        const typeLabel = def?.label ?? (type.charAt(0).toUpperCase() + type.slice(1) + ' Group');
                        return filtered.map(g => {
                          const isSel = selectedCircle?.id === g.id;
                          const isHead = g.creatorId === currentUser.id;
                          const colorClass = def ? circleColor(g.type as CircleType) : fallbackColor;
                          return (
                            <div
                              key={g.id}
                              onClick={() => { setSelectedCircle(g); setSelectedCommunity(null); setShowMobileChat(true); }}
                              className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all border ${isSel ? (dm ? 'bg-[#1c1c24] border-indigo-500/20' : 'bg-indigo-500/[0.04] border-indigo-100') : (dm ? 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]' : 'border-neutral-100 bg-slate-50/60 hover:bg-slate-100/80')}`}
                            >
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                                {def
                                  ? <CircleIcon type={g.type as CircleType} size={16} />
                                  : <Users size={16} />
                                }
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className={`text-xs font-bold truncate ${dm ? 'text-white' : 'text-slate-800'}`}>{g.name}</p>
                                  {isHead && <span className="flex items-center gap-0.5 text-[8px] text-amber-500 font-bold shrink-0"><Crown size={8} /> Head</span>}
                                </div>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className={`flex items-center gap-0.5 text-[8px] ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
                                    <Users size={8} /> {(Array.isArray(g.memberIds) ? g.memberIds : []).length} Members
                                  </span>
                                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${colorClass}`}>
                                    {typeLabel.toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })}
                  </>
                )}

                {memberCircles.length === 0 && pendingCircles.length === 0 &&
                  communities.filter(c => (Array.isArray(c.memberIds) ? c.memberIds : []).includes(currentUser.id)).length === 0 &&
                  myProjects.length === 0 && myEvents.length === 0 && (
                  <div className="text-center p-6 space-y-2">
                    <Hash size={20} className="mx-auto text-neutral-400" />
                    <p className="text-[10px] text-slate-400 leading-relaxed">No circles yet.<br />Join communities, projects, or events to see them here!</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Status bar */}
          <div className={`p-3 border-t border-neutral-200 dark:border-white/5 text-[9px] uppercase tracking-wider font-semibold flex items-center gap-1.5 opacity-60 shrink-0 ${dm ? 'text-zinc-400' : 'text-slate-500'}`}>
            <ShieldCheck size={11} className="text-emerald-500 shrink-0" />
            <span>Campus Restrict · Match Active</span>
          </div>
        </div>

        {/* ── RIGHT PANEL (chat) ─────────────────────────────────────────── */}
        <div className={`${showMobileChat ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0 min-h-0 overflow-hidden ${dm ? 'bg-[#121217]' : 'bg-white'}`}>

          {/* ── DM PANE ── */}
          {tab === 'dms' && (
            selectedUser ? (
              <>
                <div className={`px-3 py-3 border-b flex items-center gap-3 shrink-0 ${dm ? 'border-white/8 bg-[#121217]' : 'border-slate-200/80 bg-white'}`}>
                  <button aria-label="Back to conversations" className="md:hidden flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer shrink-0" onClick={() => setShowMobileChat(false)}>
                    <ArrowLeft size={15} />
                  </button>
                  <div onClick={() => onViewUserProfile?.(selectedUser.id)} className={`flex gap-2.5 items-center flex-1 min-w-0 ${onViewUserProfile ? 'cursor-pointer hover:opacity-85' : ''}`}>
                    <div className="relative shrink-0">
                      <div className={`w-10 h-10 rounded-full ring-2 ring-indigo-100 dark:ring-indigo-400/20 flex items-center justify-center font-bold text-xs overflow-hidden ${dm ? 'bg-[#24242d]' : 'bg-white'}`}>
                        <Avatar avatar={selectedUser.avatar} />
                      </div>
                      {onlineUserIds.has(selectedUser.id) && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-[#121217]" />}
                    </div>
                    <div className="min-w-0">
                      <h3 className={`truncate text-sm font-semibold tracking-tight ${dm ? 'text-white' : 'text-slate-900'}`}>{selectedUser.fullName}</h3>
                      <p className={`truncate text-[11px] ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{selectedUser.college}{selectedUser.branch ? ` · ${selectedUser.branch}` : ''}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium ${dm ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`} title={dmRealtimeStatus === 'live' ? 'Live chat connected' : 'Reconnecting to live chat'}>
                    <span className={`h-1.5 w-1.5 rounded-full ${dmRealtimeStatus === 'live' ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}`} />
                    <span className="hidden sm:inline">
                      {dmRealtimeStatus === 'live' ? 'Live' : dmRealtimeStatus === 'connecting' ? 'Connecting…' : 'Syncing…'}
                    </span>
                  </div>
                </div>

                  <div
                    className={`flex-1 overflow-y-auto px-4 py-5 md:px-6 space-y-4 ${dm ? 'bg-[#101014]' : 'bg-[#f5f4f0]'}`}
                  >
                  {activeChatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-8">
                      <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${dm ? 'bg-indigo-500/10' : 'bg-indigo-100'}`}>
                        <MessageSquare className="text-indigo-500" size={24} />
                      </div>
                      <p className={`text-sm font-semibold ${dm ? 'text-slate-100' : 'text-slate-800'}`}>Start the conversation</p>
                      <p className="mt-1 text-xs text-slate-500">Say hello to {selectedUser.fullName.split(' ')[0]} to get things started.</p>
                    </div>
                   ) : activeChatMessages.map((msg, messageIndex) => {
                      const self = msg.senderId === currentUser.id;
                      const previousMessage = activeChatMessages[messageIndex - 1];
                      const showDaySeparator = startsNewChatDay(msg, previousMessage);
                      const replyTarget = msg.replyToId ? localMessages.find(item => item.id === msg.replyToId) : null;
                      const messageKey = messageIdentity(msg);
                     return (
                       <React.Fragment key={messageKey}>
                         {showDaySeparator && (
                            <div className="flex justify-center py-1">
                              <span className={`rounded-full px-3 py-1 text-[10px] font-medium shadow-sm ${dm ? 'bg-[#24242d] text-slate-400' : 'border border-white/80 bg-white/80 text-slate-500'}`}>
                               {chatDayLabel(msg.createdAt)}
                             </span>
                           </div>
                         )}
                       <div id={`chat-message-${messageKey}`} className={`group/message relative flex ${self ? 'justify-end' : 'justify-start'}`}>
                         <div className={`relative flex max-w-[84%] flex-col space-y-1 sm:max-w-[78%] ${self ? 'items-end' : 'items-start'}`}>
                            <div
                              onDoubleClick={() => toggleReaction(msg, '❤️')}
                               className={`rounded-[20px] px-4 py-2.5 text-[14px] leading-6 shadow-sm ${self ? 'rounded-br-md bg-indigo-600 text-white' : (dm ? 'rounded-bl-md border border-white/5 bg-[#1c1c24] text-slate-100' : 'rounded-bl-md border border-white bg-white text-slate-800')} cursor-default`}
                              title="Double-click to react with ❤️"
                            >
                             {replyTarget && (
                                <button
                                  type="button"
                                  onClick={() => document.getElementById(`chat-message-${messageIdentity(replyTarget)}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                                  className={`mb-2 w-full border-l-2 pl-2 text-left text-[10px] ${self ? 'border-white/60 text-white/80' : 'border-indigo-400 text-slate-400'}`}
                                >
                                 <p className="font-bold">Replying to {replyTarget.senderId === currentUser.id ? 'you' : selectedUser.fullName.split(' ')[0]}</p>
                                 <p className="truncate">{messageQuote(replyTarget)}</p>
                                </button>
                             )}
                            {msg.attachmentData && (
                              <div className="mb-1.5">
                                {msg.attachmentMimeType?.startsWith('image/') ? (
                                  <a href={attachmentSource(msg)} target="_blank" rel="noreferrer">
                                    <img src={attachmentSource(msg)} alt={msg.attachmentName || 'Shared image'} className="max-w-full max-h-56 rounded-xl object-cover" />
                                  </a>
                                ) : (
                                  <a href={attachmentSource(msg)} download={msg.attachmentName || 'shared-file'} className="flex items-center gap-2 rounded-lg bg-black/10 px-2.5 py-2 hover:bg-black/20">
                                    <FileIcon size={15} />
                                    <span className="truncate text-[11px]">{msg.attachmentName || 'Shared document'}</span>
                                    <Download size={13} className="ml-auto shrink-0" />
                                  </a>
                                )}
                              </div>
                            )}
                            {msg.pollOptions && msg.pollOptions.length >= 2 && (
                              <div className="min-w-[190px]">
                                <div className="flex items-center gap-1.5 font-bold mb-2"><BarChart3 size={14} /> Poll</div>
                                <p className="mb-2 whitespace-pre-wrap">{msg.content}</p>
                                <div className="space-y-1.5">
                                  {msg.pollOptions.map((option, index) => {
                                    const voted = msg.pollVotes?.[currentUser.id] === index;
                                    const votes = Object.values(msg.pollVotes || {}).filter(value => value === index).length;
                                    return <button key={`${msg.id}-${index}`} type="button" onClick={() => votePoll(msg, index)} className={`w-full flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5 text-left text-[11px] ${voted ? 'border-white/70 font-bold' : 'border-white/20'}`}><span>{option}</span><span className="opacity-70">{votes}</span></button>;
                                  })}
                                </div>
                              </div>
                            )}
                            {!msg.pollOptions?.length && msg.content && <span className="whitespace-pre-wrap">{msg.content}</span>}
                           </div>
                           {reactionMenuFor === msg.id && (
                             <div className={`flex items-center gap-0.5 rounded-full border p-1 shadow-xl ${dm ? 'border-white/10 bg-[#1c1c24]' : 'border-slate-200 bg-white'}`}>
                               {CHAT_REACTION_EMOJIS.map(emoji => (
                                 <button key={emoji} type="button" onClick={() => toggleReaction(msg, emoji)} className="w-7 h-7 rounded-full text-sm hover:bg-indigo-500/10 cursor-pointer">{emoji}</button>
                               ))}
                             </div>
                           )}
                           {reactionEntries(msg.reactions).length > 0 && (
                             <div className={`flex flex-wrap gap-1 ${self ? 'justify-end' : 'justify-start'}`}>
                               {reactionEntries(msg.reactions).map(([emoji, users]) => (
                                 <button key={emoji} type="button" onClick={() => toggleReaction(msg, emoji)} className={`rounded-full border px-1.5 py-0.5 text-[10px] ${users.includes(currentUser.id) ? 'border-indigo-400 bg-indigo-500/10' : 'border-neutral-200 dark:border-white/10'}`}>
                                   {emoji} {users.length}
                                 </button>
                               ))}
                             </div>
                           )}
                            {actionMenuFor === msg.id && (
                              <div className={`flex items-center gap-1 rounded-xl border p-1 shadow-lg ${self ? 'justify-end' : 'justify-start'} ${dm ? 'border-white/10 bg-[#1c1c24]' : 'border-slate-200 bg-white'}`}>
                                <button
                                  type="button"
                                  onClick={() => { setReplyingTo(msg); setActionMenuFor(null); setReactionMenuFor(null); }}
                                  className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold hover:bg-indigo-500/10 cursor-pointer"
                                >
                                  <Reply size={11} /> Reply
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setReactionMenuFor(msg.id); setActionMenuFor(null); }}
                                  className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold hover:bg-indigo-500/10 cursor-pointer"
                                >
                                  <Smile size={11} /> React
                                </button>
                              </div>
                            )}
                             <div className={`absolute top-0 z-10 flex items-center gap-0.5 rounded-full border p-1 shadow-md transition-opacity ${dm ? 'border-white/10 bg-[#24242d]' : 'border-slate-200 bg-white'} opacity-100 sm:opacity-0 sm:group-hover/message:opacity-100 sm:group-focus-within/message:opacity-100 ${self ? 'right-full mr-2' : 'left-full ml-2'}`}>
                              <button
                                type="button"
                                 aria-label="Message actions"
                                 title="Message actions"
                                 onClick={() => { setActionMenuFor(value => value === msg.id ? null : msg.id); setReactionMenuFor(null); }}
                                 className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-indigo-500/10 hover:text-indigo-400 cursor-pointer"
                              >
                                 <MoreHorizontal size={15} />
                              </button>
                           </div>
                             <div className={`flex items-center gap-1 text-[10px] font-medium text-slate-400 ${self ? 'justify-end' : 'justify-start'}`}>
                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {self && (
                               <span className="inline-flex items-center" title={pendingIds.current.has(msg.id) ? 'Sending' : msg.isRead ? 'Seen' : 'Sent'}>
                                 <CheckCheck
                                   size={11}
                                   className={pendingIds.current.has(msg.id)
                                     ? 'text-slate-400'
                                     : msg.isRead ? 'text-blue-400' : 'text-slate-400'}
                                 />
                               </span>
                            )}
                          </div>
                        </div>
                      </div>
                       </React.Fragment>
                    );
                  })}
                  <div ref={dmBottomRef} />
                </div>

                <form onSubmit={handleDMSubmit} className={`relative shrink-0 border-t px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-4 ${dm ? 'border-white/8 bg-[#121217]' : 'border-slate-200/80 bg-white'}`}>
                  {chatError && (
                    <div className={`mb-2 flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-[10px] ${dm ? 'border-rose-400/20 bg-rose-500/10 text-rose-200' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                      <span>{chatError}</span>
                      <button type="button" onClick={() => setChatError(null)} className="shrink-0 font-bold opacity-70 hover:opacity-100 cursor-pointer">Dismiss</button>
                    </div>
                  )}
                  {replyingTo && tab === 'dms' && (
                    <div className={`mb-2 flex items-center gap-2 rounded-xl border-l-2 border-indigo-400 px-2.5 py-2 text-[10px] ${dm ? 'bg-white/5 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
                      <Reply size={13} className="text-indigo-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold">Replying to {replyingTo.senderId === currentUser.id ? 'yourself' : selectedUser.fullName.split(' ')[0]}</p>
                        <p className="truncate opacity-70">{messageQuote(replyingTo)}</p>
                      </div>
                      <button type="button" onClick={() => setReplyingTo(null)} className="p-1 opacity-60 hover:opacity-100 cursor-pointer"><X size={13} /></button>
                    </div>
                  )}
                  {attachmentDraft && (
                    <div className={`mb-2 flex items-center gap-2 rounded-xl px-2.5 py-2 text-[10px] ${dm ? 'bg-white/5 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
                      {attachmentDraft.mimeType.startsWith('image/') ? <ImageIcon size={14} /> : <FileIcon size={14} />}
                      <span className="truncate flex-1">{attachmentDraft.name}</span>
                      <button type="button" onClick={() => setAttachmentDraft(null)} className="p-1 opacity-60 hover:opacity-100 cursor-pointer"><X size={13} /></button>
                      <button type="button" onClick={handleAttachmentSend} className="rounded-lg bg-indigo-500 px-2 py-1 text-[9px] font-bold text-white cursor-pointer">Send</button>
                    </div>
                  )}
                  <div className={`flex items-end gap-1.5 rounded-[25px] border p-1.5 shadow-sm transition ${dm ? 'border-white/10 bg-[#09090C] focus-within:border-indigo-400/40' : 'border-slate-200 bg-white focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-100/70'}`}>
                     <button type="button" onClick={() => { setComposerMenuOpen(value => !value); setEmojiPickerOpen(false); }} disabled={currentUser.isSuspended} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-indigo-500/10 hover:text-indigo-500 cursor-pointer disabled:opacity-40" aria-label="More chat options">
                      <Plus size={19} />
                    </button>
                     <button type="button" onClick={() => { setEmojiPickerOpen(value => !value); setEmojiPickerTab('emoji'); setComposerMenuOpen(false); }} disabled={currentUser.isSuspended} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-amber-500/10 hover:text-amber-500 cursor-pointer disabled:opacity-40" aria-label="Open emoji and sticker picker">
                       <Smile size={19} />
                     </button>
                    <input ref={fileInputRef} type="file" hidden accept="image/*,.pdf,.doc,.docx,.txt" onChange={handleFilePicked} />
                     {emojiPickerOpen && (
                       <div className={`absolute bottom-16 left-3 z-30 w-[min(19rem,calc(100vw-1.5rem))] rounded-2xl border p-2 shadow-2xl ${dm ? 'border-white/10 bg-[#1c1c24]' : 'border-slate-200 bg-white'}`}>
                         <div className="flex items-center gap-1 border-b border-neutral-200 dark:border-white/10 pb-2 mb-2">
                           <button type="button" onClick={() => setEmojiPickerTab('emoji')} className={`flex-1 rounded-lg px-2 py-1.5 text-[10px] font-bold cursor-pointer ${emojiPickerTab === 'emoji' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:bg-indigo-500/10'}`}>Emoji</button>
                           <button type="button" onClick={() => setEmojiPickerTab('sticker')} className={`flex-1 rounded-lg px-2 py-1.5 text-[10px] font-bold cursor-pointer ${emojiPickerTab === 'sticker' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:bg-indigo-500/10'}`}>Stickers</button>
                         </div>
                         <div className="grid grid-cols-8 gap-1 max-h-36 overflow-y-auto">
                           {(emojiPickerTab === 'emoji' ? CHAT_EMOJIS : CHAT_STICKERS).map((emoji, index) => (
                             <button key={`${emoji}-${index}`} type="button" onClick={() => emojiPickerTab === 'emoji' ? insertChatEmoji(emoji) : void sendChatSticker(emoji)} className="flex h-8 w-8 items-center justify-center rounded-lg text-lg hover:bg-indigo-500/10 cursor-pointer" aria-label={`Send ${emoji}`}>
                               {emoji}
                             </button>
                           ))}
                         </div>
                         {emojiPickerTab === 'sticker' && <p className="mt-2 text-[9px] text-slate-400">Tap a sticker to send it, or use GIF / sticker upload for any file.</p>}
                       </div>
                     )}
                    {composerMenuOpen && (
                      <div className={`absolute bottom-14 left-3 z-20 w-44 rounded-2xl border p-1.5 shadow-xl ${dm ? 'border-white/10 bg-[#1c1c24]' : 'border-slate-200 bg-white'}`}>
                         <button type="button" onClick={() => { fileInputRef.current?.click(); setComposerMenuOpen(false); }} className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left text-[11px] hover:bg-indigo-500/10 cursor-pointer"><Paperclip size={14} /> Share photo or file</button>
                         <button type="button" onClick={() => { fileInputRef.current?.click(); setComposerMenuOpen(false); }} className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left text-[11px] hover:bg-indigo-500/10 cursor-pointer"><ImageIcon size={14} /> Send GIF / sticker</button>
                        <button type="button" onClick={openPollComposer} className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left text-[11px] hover:bg-indigo-500/10 cursor-pointer"><BarChart3 size={14} /> Create a poll</button>
                      </div>
                    )}
                      <textarea
                       rows={1}
                       disabled={currentUser.isSuspended}
                      placeholder={currentUser.isSuspended ? 'Account suspended' : `Message ${selectedUser.fullName.split(' ')[0]}…`}
                      value={typedMessage} onChange={e => setTypedMessage(e.target.value)}
                       onKeyDown={event => {
                         if (event.key === 'Enter' && !event.shiftKey) {
                           event.preventDefault();
                           event.currentTarget.form?.requestSubmit();
                         }
                       }}
                       className={`min-h-10 max-h-28 min-w-0 flex-1 resize-none bg-transparent px-1 py-2.5 text-base leading-5 outline-none overflow-y-auto placeholder:text-slate-400 sm:text-sm ${dm ? 'text-white' : 'text-slate-800'}`}
                     />
                     <button type="submit" aria-label="Send message" disabled={currentUser.isSuspended || !typedMessage.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 cursor-pointer">
                       <Send size={17} />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-60">
                <MessageSquare className="text-neutral-400 mb-2" size={32} />
                <p className="text-[10px] font-bold uppercase tracking-widest">Select a conversation</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">Pick a connection from the left to start chatting.</p>
              </div>
            )
          )}

          {/* ── CIRCLE PANE ── */}
          {tab === 'circles' && (
            selectedCommunity ? (
              <>
                {/* Community header */}
                <div className={`px-4 py-3 border-b flex items-center gap-3 shrink-0 ${dm ? 'border-white/8 bg-[#121217]' : 'border-slate-200/80 bg-white'}`}>
                  <button aria-label="Back to conversations" className="md:hidden flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer shrink-0" onClick={() => { setShowMobileChat(false); setSelectedCommunity(null); }}>
                    <ArrowLeft size={15} />
                  </button>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${dm ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
                    <CommIcon name={selectedCommunity.icon} size={20} className={dm ? 'text-indigo-400' : 'text-indigo-600'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-sm font-semibold truncate tracking-tight ${dm ? 'text-white' : 'text-slate-900'}`}>{selectedCommunity.name}</h3>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${dm ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>{selectedCommunity.category}</span>
                      <span className={`text-[9px] ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{selectedCommunity.memberIds.length} members</span>
                    </div>
                  </div>
                </div>

                {/* Community info + member list */}
                <div className="flex-1 overflow-y-auto">
                  {/* Description + tags */}
                  <div className={`p-4 border-b ${dm ? 'border-white/5' : 'border-neutral-100'}`}>
                    <p className={`text-xs leading-relaxed ${dm ? 'text-slate-400' : 'text-slate-600'}`}>{selectedCommunity.description}</p>
                    {selectedCommunity.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {selectedCommunity.tags.map(t => (
                          <span key={t} className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${dm ? 'bg-white/8 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>#{t}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Members */}
                  <div className="p-4 space-y-2">
                    <p className={`text-[9px] uppercase font-bold tracking-widest mb-3 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
                      Members · {selectedCommunity.memberIds.length}
                    </p>
                    {selectedCommunity.memberIds.map(memberId => {
                      const member = allUsers.find(u => u.id === memberId);
                      if (!member) return null;
                      const isHead = memberId === selectedCommunity.creatorId;
                      const isSelf = memberId === currentUser.id;
                      return (
                        <div key={memberId} className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${dm ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                          <div className="p-[1.5px] rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-600 shrink-0">
                            <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center font-bold text-xs overflow-hidden ${dm ? 'border-[#1c1c24] bg-[#121217]' : 'border-white bg-white'}`}>
                              <Avatar avatar={member.avatar} />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className={`text-xs font-bold truncate ${dm ? 'text-white' : 'text-slate-800'}`}>{member.fullName}</p>
                              {isHead && <span className="flex items-center gap-0.5 text-[8px] text-amber-500 font-bold shrink-0"><Crown size={8} /> Head</span>}
                            </div>
                            <p className={`text-[9px] truncate ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{member.college} · {member.branch}</p>
                          </div>
                          {!isSelf && (
                            <button
                              onClick={() => { setTab('dms'); setSelectedUser(member); setSelectedCommunity(null); setShowMobileChat(true); }}
                              className="shrink-0 px-2.5 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-[9px] font-bold cursor-pointer flex items-center gap-1 transition-all"
                            >
                              <Send size={9} /> Message
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : selectedCircle && (Array.isArray(selectedCircle.memberIds) ? selectedCircle.memberIds : []).includes(currentUser.id) ? (
              <>
                <div className={`px-3 py-3 border-b flex items-center gap-3 shrink-0 ${dm ? 'border-white/8 bg-[#121217]' : 'border-slate-200/80 bg-white'}`}>
                  <button aria-label="Back to conversations" className="md:hidden flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer shrink-0" onClick={() => setShowMobileChat(false)}>
                    <ArrowLeft size={15} />
                  </button>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${circleColor(selectedCircle.type as CircleType)}`}>
                    <CircleIcon type={selectedCircle.type as CircleType} size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-sm font-semibold tracking-tight truncate ${dm ? 'text-white' : 'text-slate-900'}`}>{selectedCircle.name}</h3>
                    <p className="text-[11px] text-slate-500 truncate">
                      {CIRCLE_TYPES.find(t => t.type === selectedCircle.type)?.label} · {(Array.isArray(selectedCircle.memberIds) ? selectedCircle.memberIds : []).length} members
                    </p>
                  </div>
                </div>

                <div className={`flex-1 overflow-y-auto px-4 py-5 md:px-6 space-y-4 ${dm ? 'bg-[#101014]' : 'bg-[#f5f4f0]'}`}>
                  {circleMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-60 py-8">
                      <Hash className="text-indigo-400 mb-2" size={28} />
                      <p className="text-[9px] font-bold uppercase tracking-widest mb-1">{selectedCircle.name}</p>
                      <p className="text-[10px] text-slate-400">Be the first to post here!</p>
                    </div>
                  ) : circleMessages.map((msg, messageIndex) => {
                    const self = msg.senderId === currentUser.id;
                    const sender = allUsers.find(u => u.id === msg.senderId);
                    const previousMessage = circleMessages[messageIndex - 1];
                    const groupedMessage = Boolean(previousMessage && previousMessage.senderId === msg.senderId);
                    const showDaySeparator = startsNewChatDay(msg, previousMessage);
                    const replyTarget = msg.replyToId ? circleMessages.find(item => item.id === msg.replyToId) : null;
                    return (
                      <React.Fragment key={msg.id}>
                        {showDaySeparator && (
                          <div className="flex justify-center py-1">
                            <span className={`rounded-full px-3 py-1 text-[10px] font-medium shadow-sm ${dm ? 'bg-[#24242d] text-slate-400' : 'border border-white/80 bg-white/80 text-slate-500'}`}>
                              {chatDayLabel(msg.createdAt)}
                            </span>
                          </div>
                        )}
                      <div className={`group/message flex gap-2 ${self ? 'justify-end' : 'justify-start'} ${groupedMessage ? '-mt-2' : ''}`}>
                        {!self && (
                          <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300 ${groupedMessage ? 'opacity-0' : ''}`}>
                            {!groupedMessage && <Avatar avatar={sender?.avatar} />}
                          </div>
                        )}
                        <div className={`relative flex max-w-[84%] flex-col space-y-1 sm:max-w-[78%] ${self ? 'items-end' : 'items-start'}`}>
                          {!self && sender && !groupedMessage && (
                            <p className={`px-1 text-[11px] font-semibold ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{sender.fullName.split(' ')[0]}</p>
                          )}
                          <div className={`rounded-[20px] px-4 py-2.5 text-[14px] leading-6 shadow-sm ${self ? 'rounded-br-md bg-indigo-600 text-white' : (dm ? 'rounded-bl-md border border-white/5 bg-[#1c1c24] text-slate-100' : 'rounded-bl-md border border-white bg-white text-slate-800')}`}>
                             {replyTarget && (
                               <div className={`mb-2 border-l-2 pl-2 text-[10px] ${self ? 'border-white/60 text-white/80' : 'border-indigo-400 text-slate-400'}`}>
                                 <p className="font-bold">Replying to {replyTarget.senderId === currentUser.id ? 'you' : (allUsers.find(user => user.id === replyTarget.senderId)?.fullName.split(' ')[0] || 'message')}</p>
                                 <p className="truncate">{messageQuote(replyTarget)}</p>
                               </div>
                             )}
                            {msg.attachmentData && (
                              <div className="mb-1.5">
                                {msg.attachmentMimeType?.startsWith('image/') ? (
                                  <a href={attachmentSource(msg)} target="_blank" rel="noreferrer">
                                    <img src={attachmentSource(msg)} alt={msg.attachmentName || 'Shared image'} className="max-w-full max-h-56 rounded-xl object-cover" />
                                  </a>
                                ) : (
                                  <a href={attachmentSource(msg)} download={msg.attachmentName || 'shared-file'} className="flex items-center gap-2 rounded-lg bg-black/10 px-2.5 py-2 hover:bg-black/20">
                                    <FileIcon size={15} />
                                    <span className="truncate text-[11px]">{msg.attachmentName || 'Shared document'}</span>
                                    <Download size={13} className="ml-auto shrink-0" />
                                  </a>
                                )}
                              </div>
                            )}
                            {msg.pollOptions && msg.pollOptions.length >= 2 && (
                              <div className="min-w-[190px]">
                                <div className="flex items-center gap-1.5 font-bold mb-2"><BarChart3 size={14} /> Poll</div>
                                <p className="mb-2 whitespace-pre-wrap">{msg.content}</p>
                                <div className="space-y-1.5">
                                  {msg.pollOptions.map((option, index) => {
                                    const voted = msg.pollVotes?.[currentUser.id] === index;
                                    const votes = Object.values(msg.pollVotes || {}).filter(value => value === index).length;
                                    return <button key={`${msg.id}-${index}`} type="button" onClick={() => votePoll(msg, index)} className={`w-full flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5 text-left text-[11px] ${voted ? 'border-white/70 font-bold' : 'border-white/20'}`}><span>{option}</span><span className="opacity-70">{votes}</span></button>;
                                  })}
                                </div>
                              </div>
                            )}
                            {!msg.pollOptions?.length && msg.content && <span className="whitespace-pre-wrap">{msg.content}</span>}
                           </div>
                           {reactionMenuFor === msg.id && (
                             <div className={`flex items-center gap-0.5 rounded-full border p-1 shadow-xl ${dm ? 'border-white/10 bg-[#1c1c24]' : 'border-slate-200 bg-white'}`}>
                               {CHAT_REACTION_EMOJIS.map(emoji => (
                                 <button key={emoji} type="button" onClick={() => toggleReaction(msg, emoji)} className="w-7 h-7 rounded-full text-sm hover:bg-indigo-500/10 cursor-pointer">{emoji}</button>
                               ))}
                             </div>
                           )}
                           {reactionEntries(msg.reactions).length > 0 && (
                             <div className={`flex flex-wrap gap-1 ${self ? 'justify-end' : 'justify-start'}`}>
                               {reactionEntries(msg.reactions).map(([emoji, users]) => (
                                 <button key={emoji} type="button" onClick={() => toggleReaction(msg, emoji)} className={`rounded-full border px-1.5 py-0.5 text-[10px] ${users.includes(currentUser.id) ? 'border-indigo-400 bg-indigo-500/10' : 'border-neutral-200 dark:border-white/10'}`}>
                                   {emoji} {users.length}
                                 </button>
                               ))}
                             </div>
                           )}
                            {actionMenuFor === msg.id && (
                              <div className={`flex items-center gap-1 rounded-xl border p-1 shadow-lg ${self ? 'justify-end' : 'justify-start'} ${dm ? 'border-white/10 bg-[#1c1c24]' : 'border-slate-200 bg-white'}`}>
                                <button
                                  type="button"
                                  onClick={() => { setReplyingTo(msg); setActionMenuFor(null); setReactionMenuFor(null); }}
                                  className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold hover:bg-indigo-500/10 cursor-pointer"
                                >
                                  <Reply size={11} /> Reply
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setReactionMenuFor(msg.id); setActionMenuFor(null); }}
                                  className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold hover:bg-indigo-500/10 cursor-pointer"
                                >
                                  <Smile size={11} /> React
                                </button>
                              </div>
                            )}
                            <div className={`absolute top-0 z-10 flex items-center gap-0.5 rounded-full border p-1 shadow-md transition-opacity ${dm ? 'border-white/10 bg-[#24242d]' : 'border-slate-200 bg-white'} opacity-100 sm:opacity-0 sm:group-hover/message:opacity-100 sm:group-focus-within/message:opacity-100 ${self ? 'right-full mr-2' : 'left-full ml-2'}`}>
                              <button
                                type="button"
                                aria-label="Message actions"
                                title="Message actions"
                                onClick={() => { setActionMenuFor(value => value === msg.id ? null : msg.id); setReactionMenuFor(null); }}
                                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-indigo-500/10 hover:text-indigo-400 cursor-pointer"
                              >
                                <MoreHorizontal size={15} />
                              </button>
                           </div>
                            <div className={`flex items-center gap-1 text-[10px] font-medium text-slate-400 ${self ? 'justify-end' : 'justify-start'}`}>
                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                      </React.Fragment>
                    );
                  })}
                  <div ref={circleBottomRef} />
                </div>

                <form onSubmit={handleCircleMsgSubmit} className={`relative shrink-0 border-t px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-4 ${dm ? 'border-white/8 bg-[#121217]' : 'border-slate-200/80 bg-white'}`}>
                  {chatError && (
                    <div className={`mb-2 flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-[10px] ${dm ? 'border-rose-400/20 bg-rose-500/10 text-rose-200' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                      <span>{chatError}</span>
                      <button type="button" onClick={() => setChatError(null)} className="shrink-0 font-bold opacity-70 hover:opacity-100 cursor-pointer">Dismiss</button>
                    </div>
                  )}
                  {replyingTo && tab === 'circles' && (
                    <div className={`mb-2 flex items-center gap-2 rounded-xl border-l-2 border-indigo-400 px-2.5 py-2 text-[10px] ${dm ? 'bg-white/5 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
                      <Reply size={13} className="text-indigo-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold">Replying to {replyingTo.senderId === currentUser.id ? 'yourself' : 'this message'}</p>
                        <p className="truncate opacity-70">{messageQuote(replyingTo)}</p>
                      </div>
                      <button type="button" onClick={() => setReplyingTo(null)} className="p-1 opacity-60 hover:opacity-100 cursor-pointer"><X size={13} /></button>
                    </div>
                  )}
                  {attachmentDraft && (
                    <div className={`mb-2 flex items-center gap-2 rounded-xl px-2.5 py-2 text-[10px] ${dm ? 'bg-white/5 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
                      {attachmentDraft.mimeType.startsWith('image/') ? <ImageIcon size={14} /> : <FileIcon size={14} />}
                      <span className="truncate flex-1">{attachmentDraft.name}</span>
                      <button type="button" onClick={() => setAttachmentDraft(null)} className="p-1 opacity-60 hover:opacity-100 cursor-pointer"><X size={13} /></button>
                      <button type="button" onClick={handleAttachmentSend} className="rounded-lg bg-indigo-500 px-2 py-1 text-[9px] font-bold text-white cursor-pointer">Send</button>
                    </div>
                  )}
                  <div className={`flex items-end gap-1.5 rounded-[25px] border p-1.5 shadow-sm transition ${dm ? 'border-white/10 bg-[#09090C] focus-within:border-indigo-400/40' : 'border-slate-200 bg-white focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-100/70'}`}>
                    <button type="button" onClick={() => { setComposerMenuOpen(value => !value); setEmojiPickerOpen(false); }} disabled={currentUser.isSuspended} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-indigo-500/10 hover:text-indigo-500 cursor-pointer disabled:opacity-40" aria-label="More chat options">
                      <Plus size={19} />
                    </button>
                    <button type="button" onClick={() => { setEmojiPickerOpen(value => !value); setEmojiPickerTab('emoji'); setComposerMenuOpen(false); }} disabled={currentUser.isSuspended} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-amber-500/10 hover:text-amber-500 cursor-pointer disabled:opacity-40" aria-label="Open emoji and sticker picker">
                      <Smile size={19} />
                    </button>
                    <input ref={fileInputRef} type="file" hidden accept="image/*,.pdf,.doc,.docx,.txt" onChange={handleFilePicked} />
                    {emojiPickerOpen && (
                      <div className={`absolute bottom-16 left-3 z-30 w-[min(19rem,calc(100vw-1.5rem))] rounded-2xl border p-2 shadow-2xl ${dm ? 'border-white/10 bg-[#1c1c24]' : 'border-slate-200 bg-white'}`}>
                        <div className="flex items-center gap-1 border-b border-neutral-200 dark:border-white/10 pb-2 mb-2">
                          <button type="button" onClick={() => setEmojiPickerTab('emoji')} className={`flex-1 rounded-lg px-2 py-1.5 text-[10px] font-bold cursor-pointer ${emojiPickerTab === 'emoji' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:bg-indigo-500/10'}`}>Emoji</button>
                          <button type="button" onClick={() => setEmojiPickerTab('sticker')} className={`flex-1 rounded-lg px-2 py-1.5 text-[10px] font-bold cursor-pointer ${emojiPickerTab === 'sticker' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:bg-indigo-500/10'}`}>Stickers</button>
                        </div>
                        <div className="grid grid-cols-8 gap-1 max-h-36 overflow-y-auto">
                          {(emojiPickerTab === 'emoji' ? CHAT_EMOJIS : CHAT_STICKERS).map((emoji, index) => (
                            <button key={`${emoji}-${index}`} type="button" onClick={() => emojiPickerTab === 'emoji' ? insertChatEmoji(emoji) : void sendChatSticker(emoji)} className="flex h-8 w-8 items-center justify-center rounded-lg text-lg hover:bg-indigo-500/10 cursor-pointer" aria-label={`Send ${emoji}`}>
                              {emoji}
                            </button>
                          ))}
                        </div>
                        {emojiPickerTab === 'sticker' && <p className="mt-2 text-[9px] text-slate-400">Tap a sticker to send it, or use GIF / sticker upload for any file.</p>}
                      </div>
                    )}
                    {composerMenuOpen && (
                      <div className={`absolute bottom-14 left-3 z-20 w-44 rounded-2xl border p-1.5 shadow-xl ${dm ? 'border-white/10 bg-[#1c1c24]' : 'border-slate-200 bg-white'}`}>
                        <button type="button" onClick={() => { fileInputRef.current?.click(); setComposerMenuOpen(false); }} className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left text-[11px] hover:bg-indigo-500/10 cursor-pointer"><Paperclip size={14} /> Share photo or file</button>
                        <button type="button" onClick={() => { fileInputRef.current?.click(); setComposerMenuOpen(false); }} className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left text-[11px] hover:bg-indigo-500/10 cursor-pointer"><ImageIcon size={14} /> Send GIF / sticker</button>
                        <button type="button" onClick={openPollComposer} className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left text-[11px] hover:bg-indigo-500/10 cursor-pointer"><BarChart3 size={14} /> Create a poll</button>
                      </div>
                    )}
                    <textarea rows={1} disabled={currentUser.isSuspended}
                      placeholder={currentUser.isSuspended ? 'Account suspended' : `Message ${selectedCircle.name}…`}
                      value={circleTyped} onChange={e => setCircleTyped(e.target.value)}
                      onKeyDown={event => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          event.currentTarget.form?.requestSubmit();
                        }
                      }}
                      className={`min-h-10 max-h-28 min-w-0 flex-1 resize-none bg-transparent px-1 py-2.5 text-base leading-5 outline-none overflow-y-auto placeholder:text-slate-400 sm:text-sm ${dm ? 'text-white' : 'text-slate-800'}`} />
                    <button type="submit" aria-label="Send message" disabled={currentUser.isSuspended || !circleTyped.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 cursor-pointer">
                      <Send size={17} />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-60">
                <Hash className="text-neutral-400 mb-2" size={32} />
                <p className="text-[10px] font-bold uppercase tracking-widest">Select a Circle</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">Pick a circle from the left, or create a new one.</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
