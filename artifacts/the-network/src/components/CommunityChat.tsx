import React, { useMemo, useRef, useState } from 'react';
import {
  Bell,
  BellOff,
  BookOpen,
  Check,
  ChevronDown,
  File,
  FileImage,
  Image as ImageIcon,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Pin,
  PinIcon,
  Reply,
  Send,
  ShieldCheck,
  SmilePlus,
  Users,
  X,
} from 'lucide-react';
import Avatar from './Avatar';
import { getEducationDisplay } from '../utils/education';
import { Community, UserProfile } from '../types';

export interface CommunityChatMessage {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  parentId?: string | null;
  reactions?: Record<string, number | string[]> | null;
  isPinned?: boolean;
  attachmentName?: string | null;
  attachmentMimeType?: string | null;
  attachmentUrl?: string | null;
  attachmentData?: string | null;
  [key: string]: unknown;
}

export interface CommunityChatProps {
  currentUser: UserProfile;
  selectedComm: Community;
  allUsers: UserProfile[];
  darkMode: boolean;
  chatMessages: CommunityChatMessage[];
  chatLoading: boolean;
  chatSending: boolean;
  chatInput: string;
  setChatInput: (value: string) => void;
  onSendMessage: (content?: string) => void;
  onSendAttachment: (file: File) => void;
  onToggleReaction: (messageId: string, reaction: string) => void;
  onReply: (message: CommunityChatMessage) => void;
  onPin: (messageId: string) => void;
  pinnedMessage?: CommunityChatMessage | null;
  onlineUserIds: string[];
  activeTopic: string;
  onTopicSelect: (topic: string) => void;
  onCloseThread: () => void;
}

const TOPICS = [
  'All discussion',
  'Arrays and strings',
  'Graphs',
  'Dynamic programming',
  'Interview patterns',
];

const QUICK_REACTIONS = ['Helpful', 'Clear', 'Need a hint'];

function getDisplayName(user: UserProfile | undefined, fallbackId: string) {
  return user?.fullName || (fallbackId === 'unknown' ? 'Verified student' : 'Student');
}

function formatMessageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatMessageDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

function getAttachmentSource(message: CommunityChatMessage) {
  if (message.attachmentUrl) return message.attachmentUrl;
  if (!message.attachmentData) return '';
  if (message.attachmentData.startsWith('data:')) return message.attachmentData;
  if (message.attachmentMimeType) {
    return `data:${message.attachmentMimeType};base64,${message.attachmentData}`;
  }
  return message.attachmentData;
}

function getReactionCount(value: number | string[] | undefined) {
  return Array.isArray(value) ? value.length : value || 0;
}

export default function CommunityChat({
  currentUser,
  selectedComm,
  allUsers,
  darkMode,
  chatMessages,
  chatLoading,
  chatSending,
  chatInput,
  setChatInput,
  onSendMessage,
  onSendAttachment,
  onToggleReaction,
  onReply,
  onPin,
  pinnedMessage,
  onlineUserIds,
  activeTopic,
  onTopicSelect,
  onCloseThread,
}: CommunityChatProps) {
  const [threadMessage, setThreadMessage] = useState<CommunityChatMessage | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [topicMenuOpen, setTopicMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userById = useMemo(
    () => new Map(allUsers.map((user) => [user.id, user])),
    [allUsers],
  );
  const onlineIds = useMemo(() => new Set(onlineUserIds), [onlineUserIds]);
  const rootMessages = useMemo(
    () => chatMessages.filter((message) => !message.parentId),
    [chatMessages],
  );
  const threadReplies = useMemo(
    () =>
      threadMessage
        ? chatMessages.filter((message) => message.parentId === threadMessage.id)
        : [],
    [chatMessages, threadMessage],
  );
  const visibleOnlineUsers = useMemo(
    () =>
      allUsers
        .filter((user) => onlineIds.has(user.id))
        .sort((a, b) => {
          if (a.id === currentUser.id) return -1;
          if (b.id === currentUser.id) return 1;
          return a.fullName.localeCompare(b.fullName);
        }),
    [allUsers, currentUser.id, onlineIds],
  );
  const selectedTopic = TOPICS.includes(activeTopic) ? activeTopic : 'All discussion';

  const closeThread = () => {
    setThreadMessage(null);
    onCloseThread();
  };

  const selectReply = (message: CommunityChatMessage) => {
    setThreadMessage(message);
    onReply(message);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!chatInput.trim() || chatSending) return;
    onSendMessage(chatInput.trim());
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onSendAttachment(file);
    event.target.value = '';
  };

  const renderMessage = (message: CommunityChatMessage, inThread = false) => {
    const sender = userById.get(message.senderId) || (message.senderId === currentUser.id ? currentUser : undefined);
    const isOwn = message.senderId === currentUser.id;
    const attachmentSource = getAttachmentSource(message);
    const isImageAttachment = Boolean(
      message.attachmentMimeType?.startsWith('image/') ||
        message.attachmentName?.match(/\.(png|jpe?g|gif|webp|svg)$/i),
    );
    const reactions = Object.entries(message.reactions || {});
    const replyCount = chatMessages.filter((reply) => reply.parentId === message.id).length;

    return (
      <article
        key={message.id}
        data-testid={`message-${message.id}`}
        className={`group flex gap-3 ${inThread ? 'py-3' : 'py-4'} ${
          isOwn ? 'flex-row-reverse text-right' : ''
        }`}
      >
        <div className="relative shrink-0">
          <div className="h-9 w-9 overflow-hidden rounded-xl ring-1 ring-inset ring-slate-200/80 dark:ring-white/10">
            <Avatar
              avatar={sender?.avatar || ''}
              fallbackClassName="bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200"
            />
          </div>
          {onlineIds.has(message.senderId) && (
            <span
              data-testid={`status-online-${message.id}`}
              className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-[#151823]"
              title="Online"
            />
          )}
        </div>

        <div className={`min-w-0 max-w-[min(76%,42rem)] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
          <div className={`mb-1 flex items-baseline gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
            <span
              data-testid={`text-sender-${message.id}`}
              className="truncate text-[12px] font-bold text-slate-800 dark:text-slate-100"
            >
              {getDisplayName(sender, message.senderId)}
            </span>
            <span className="truncate text-[10px] text-slate-400 dark:text-slate-500">
              {sender?.college || 'The Network'}
            </span>
            <span className="shrink-0 text-[10px] text-slate-400 dark:text-slate-500">
              {formatMessageTime(message.createdAt)}
            </span>
          </div>

          {sender && (
            <span className={`mb-1 text-[10px] text-slate-400 dark:text-slate-500 ${isOwn ? 'text-right' : ''}`}>
              {getEducationDisplay(sender).compact}
            </span>
          )}

          <div
            className={`relative rounded-2xl px-3.5 py-2.5 text-left text-[13px] leading-6 ${
              isOwn
                ? 'rounded-tr-md bg-indigo-600 text-white shadow-sm shadow-indigo-200/40 dark:shadow-none'
                : 'rounded-tl-md border border-slate-200/80 bg-white text-slate-700 shadow-sm shadow-slate-100/70 dark:border-white/10 dark:bg-[#202432] dark:text-slate-200 dark:shadow-none'
            }`}
          >
            {message.isPinned && (
              <span
                data-testid={`status-pinned-${message.id}`}
                className={`mb-1.5 flex items-center gap-1 text-[10px] font-semibold ${
                  isOwn ? 'text-indigo-100' : 'text-indigo-600 dark:text-indigo-300'
                }`}
              >
                <PinIcon size={11} /> Pinned by moderators
              </span>
            )}
            {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}

            {attachmentSource && (
              <a
                data-testid={`link-attachment-${message.id}`}
                href={attachmentSource}
                target="_blank"
                rel="noreferrer"
                className={`mt-2 flex max-w-full items-center gap-2 rounded-xl border p-2 text-left transition-colors ${
                  isOwn
                    ? 'border-white/20 bg-white/10 hover:bg-white/15'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10'
                }`}
              >
                {isImageAttachment ? (
                  <img
                    src={attachmentSource}
                    alt={message.attachmentName || 'Shared image'}
                    className="max-h-48 max-w-full rounded-lg object-cover"
                  />
                ) : (
                  <>
                    <File size={17} className="shrink-0 text-indigo-500" />
                    <span className="truncate text-[11px] font-semibold">
                      {message.attachmentName || 'Shared file'}
                    </span>
                  </>
                )}
              </a>
            )}
          </div>

          <div
            className={`mt-1.5 flex flex-wrap items-center gap-1.5 ${isOwn ? 'justify-end' : 'justify-start'}`}
          >
            {reactions.map(([reaction, value]) => (
              <button
                key={reaction}
                type="button"
                data-testid={`button-reaction-${message.id}-${reaction.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => onToggleReaction(message.id, reaction)}
                className="rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-200 dark:hover:bg-indigo-400/20"
              >
                {reaction} {getReactionCount(value)}
              </button>
            ))}
            <div className="flex items-center gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
              {QUICK_REACTIONS.map((reaction) => (
                <button
                  key={reaction}
                  type="button"
                  data-testid={`button-add-reaction-${message.id}-${reaction.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => onToggleReaction(message.id, reaction)}
                  className="rounded-md px-1.5 py-1 text-[10px] text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-400/10 dark:hover:text-indigo-200"
                  aria-label={`React ${reaction}`}
                >
                  {reaction}
                </button>
              ))}
            </div>
            <button
              type="button"
              data-testid={`button-reply-${message.id}`}
              onClick={() => selectReply(message)}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-semibold text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-white/5 dark:hover:text-indigo-200"
            >
              <Reply size={11} /> {replyCount ? `${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}` : 'Reply'}
            </button>
            <button
              type="button"
              data-testid={`button-pin-${message.id}`}
              onClick={() => onPin(message.id)}
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-semibold transition-colors ${
                message.isPinned
                  ? 'text-indigo-600 dark:text-indigo-300'
                  : 'text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-white/5 dark:hover:text-indigo-200'
              }`}
              aria-label={message.isPinned ? 'Unpin message' : 'Pin message'}
            >
              <Pin size={11} /> {message.isPinned ? 'Pinned' : 'Pin'}
            </button>
          </div>
        </div>
      </article>
    );
  };

  return (
    <section
      data-testid="community-chat"
      className={`overflow-hidden rounded-[24px] border ${
        darkMode
          ? 'border-white/10 bg-[#11141d] text-slate-100'
          : 'border-slate-200/80 bg-[#fbfcff] text-slate-900 shadow-[0_18px_55px_rgba(40,46,90,0.08)]'
      }`}
    >
      <header className="border-b border-slate-200/80 px-4 py-4 dark:border-white/10 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200">
              <MessageCircle size={21} strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 data-testid="heading-community-chat" className="text-lg font-extrabold tracking-[-0.02em]">
                  DSA Discussion
                </h2>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300">
                  Live room
                </span>
              </div>
              <p data-testid="text-community-name" className="mt-1 truncate text-[11px] text-slate-500 dark:text-slate-400">
                {selectedComm.name} <span className="mx-1 text-slate-300 dark:text-slate-600">/</span> {selectedComm.memberIds.length} students solving together
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-testid="button-chat-notifications"
              onClick={() => setNotificationsEnabled((enabled) => !enabled)}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-600 transition-colors hover:border-indigo-200 hover:text-indigo-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-indigo-400/30 dark:hover:text-indigo-200"
              aria-pressed={notificationsEnabled}
            >
              {notificationsEnabled ? <Bell size={14} /> : <BellOff size={14} />}
              <span className="hidden sm:inline">{notificationsEnabled ? 'Notifications on' : 'Notifications off'}</span>
            </button>
            <button
              type="button"
              data-testid="button-chat-more"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-indigo-200 hover:text-indigo-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-indigo-400/30 dark:hover:text-indigo-200"
              aria-label="More chat options"
            >
              <MoreHorizontal size={17} />
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              type="button"
              data-testid="button-topic-select"
              onClick={() => setTopicMenuOpen((open) => !open)}
              className="inline-flex h-8 items-center gap-2 rounded-lg bg-indigo-50 px-2.5 text-[11px] font-bold text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-400/10 dark:text-indigo-200 dark:hover:bg-indigo-400/15"
            >
              <BookOpen size={13} /> {selectedTopic} <ChevronDown size={13} />
            </button>
            {topicMenuOpen && (
              <div className="absolute left-0 top-10 z-20 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/40 dark:border-white/10 dark:bg-[#202432] dark:shadow-black/30">
                {TOPICS.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    data-testid={`button-topic-${topic.toLowerCase().replace(/\s+/g, '-')}`}
                    onClick={() => {
                      onTopicSelect(topic);
                      setTopicMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[11px] font-semibold transition-colors ${
                      topic === selectedTopic
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-200'
                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5'
                    }`}
                  >
                    {topic}
                    {topic === selectedTopic && <Check size={13} />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className="hidden text-[10px] text-slate-400 sm:inline">Keep the room focused. Ask for the invariant, not just the answer.</span>
        </div>
      </header>

      <div className={`grid min-h-[560px] lg:grid-cols-[minmax(0,1fr)_255px] ${threadMessage ? 'xl:grid-cols-[minmax(0,1fr)_255px_320px]' : ''}`}>
        <main className="flex min-h-[560px] min-w-0 flex-col">
          <div className="flex-1 px-4 sm:px-6">
            {pinnedMessage && (
              <button
                type="button"
                data-testid="button-pinned-message"
                onClick={() => selectReply(pinnedMessage)}
                className="mt-4 flex w-full items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2.5 text-left transition-colors hover:bg-indigo-50 dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:hover:bg-indigo-400/15"
              >
                <PinIcon size={14} className="shrink-0 text-indigo-600 dark:text-indigo-300" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-indigo-600 dark:text-indigo-300">Pinned problem note</span>
                  <span className="mt-0.5 block truncate text-[11px] font-medium text-slate-600 dark:text-slate-300">{pinnedMessage.content || pinnedMessage.attachmentName || 'Open pinned message'}</span>
                </span>
                <Reply size={14} className="shrink-0 text-indigo-500" />
              </button>
            )}

            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {chatLoading ? (
                <div data-testid="status-chat-loading" className="space-y-5 py-6">
                  {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="flex animate-pulse gap-3">
                      <div className="h-9 w-9 rounded-xl bg-slate-200 dark:bg-white/10" />
                      <div className="space-y-2 pt-1">
                        <div className="h-2.5 w-28 rounded-full bg-slate-200 dark:bg-white/10" />
                        <div className={`h-10 rounded-2xl bg-slate-100 dark:bg-white/5 ${item % 2 ? 'w-64' : 'w-44'}`} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : rootMessages.length ? (
                rootMessages.map((message) => renderMessage(message))
              ) : (
                <div data-testid="empty-chat-messages" className="flex min-h-[390px] flex-col items-center justify-center px-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-200">
                    <MessageCircle size={24} strokeWidth={1.7} />
                  </div>
                  <h3 className="mt-4 text-sm font-extrabold text-slate-800 dark:text-slate-100">Start with the problem, not the solution</h3>
                  <p className="mt-1.5 max-w-xs text-[12px] leading-5 text-slate-500 dark:text-slate-400">
                    Share the constraint you are stuck on and let the room reason it out with you.
                  </p>
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="border-t border-slate-200/80 p-4 dark:border-white/10 sm:px-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm shadow-slate-100/70 focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-100/70 dark:border-white/10 dark:bg-[#1b1f2b] dark:shadow-none dark:focus-within:border-indigo-400/50 dark:focus-within:ring-indigo-400/10">
              <textarea
                data-testid="input-chat-message"
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder="Ask about an approach, edge case, or proof..."
                rows={2}
                className="min-h-[44px] w-full resize-none bg-transparent px-2 py-1 text-[13px] leading-6 text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                disabled={chatSending}
              />
              <div className="flex items-center justify-between gap-2 px-1 pt-1">
                <div className="flex items-center gap-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    data-testid="input-chat-attachment"
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*,.pdf,.txt,.doc,.docx,.zip"
                  />
                  <button
                    type="button"
                    data-testid="button-attach-file"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={chatSending}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[10px] font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-indigo-200"
                  >
                    <Paperclip size={14} /> <span className="hidden sm:inline">Attach</span>
                  </button>
                  <span className="hidden text-[10px] text-slate-400 lg:inline">Images, notes, or a test case</span>
                </div>
                <button
                  type="submit"
                  data-testid="button-send-chat-message"
                  disabled={!chatInput.trim() || chatSending}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-[11px] font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Send size={13} /> {chatSending ? 'Sending' : 'Send'}
                </button>
              </div>
            </div>
          </form>
        </main>

        <aside className="border-t border-slate-200/80 bg-slate-50/50 px-4 py-5 dark:border-white/10 dark:bg-white/[0.02] sm:px-5 lg:border-l lg:border-t-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[12px] font-extrabold text-slate-800 dark:text-slate-100">Online members</h3>
              <p data-testid="text-online-count" className="mt-0.5 text-[10px] text-slate-400">{visibleOnlineUsers.length} in the room now</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300">
              <Users size={15} />
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            {visibleOnlineUsers.length ? (
              visibleOnlineUsers.map((user) => (
                <div key={user.id} data-testid={`member-online-${user.id}`} className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-white dark:hover:bg-white/5">
                  <div className="relative h-8 w-8 shrink-0">
                    <Avatar avatar={user.avatar} fallbackClassName="bg-indigo-100 text-[10px] text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200" />
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-50 bg-emerald-500 dark:border-[#171b25]" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-bold text-slate-700 dark:text-slate-200">{user.fullName}{user.id === currentUser.id ? ' (you)' : ''}</p>
                    <p className="truncate text-[10px] text-slate-400">{user.college}</p>
                  </div>
                </div>
              ))
            ) : (
              <div data-testid="empty-online-members" className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center dark:border-white/10">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">You are first in the room.</p>
                <p className="mt-1 text-[10px] text-slate-400">Start a thread for the next solver.</p>
              </div>
            )}
          </div>

          <div className="mt-6 border-t border-slate-200/80 pt-5 dark:border-white/10">
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-indigo-600 dark:text-indigo-300" />
              <h3 className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200">Room norms</h3>
            </div>
            <ul className="mt-2.5 space-y-2 text-[10px] leading-4 text-slate-500 dark:text-slate-400">
              <li>Explain the invariant before sharing code.</li>
              <li>Keep feedback specific and respectful.</li>
              <li>Use a thread when a solution branches.</li>
            </ul>
          </div>
        </aside>

        {threadMessage && (
          <aside className="border-t border-slate-200/80 bg-white px-4 py-5 dark:border-white/10 dark:bg-[#171b25] sm:px-5 lg:border-l lg:border-t-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-indigo-600 dark:text-indigo-300">Thread</p>
                <h3 className="mt-1 text-sm font-extrabold text-slate-800 dark:text-slate-100">Reason it through</h3>
              </div>
              <button
                type="button"
                data-testid="button-close-chat-thread"
                onClick={closeThread}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-slate-200"
                aria-label="Close thread"
              >
                <X size={15} />
              </button>
            </div>
            <div className="mt-4 border-b border-slate-100 pb-4 dark:border-white/10">
              {renderMessage(threadMessage, true)}
            </div>
            <div className="mt-2 divide-y divide-slate-100 dark:divide-white/5">
              {threadReplies.length ? (
                threadReplies.map((reply) => renderMessage(reply, true))
              ) : (
                <div data-testid="empty-chat-thread" className="py-8 text-center">
                  <SmilePlus size={20} className="mx-auto text-indigo-400" />
                  <p className="mt-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">No replies yet</p>
                  <p className="mt-1 text-[10px] leading-4 text-slate-400">Be the first to add a useful hint.</p>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}