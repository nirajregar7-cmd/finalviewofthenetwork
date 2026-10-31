import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Notification } from '../types';
import { api } from '../api';
import {
  Bell, Heart, MessageCircle, UserPlus, UserCheck, MessageSquare,
  X, CheckCheck, Users, Megaphone, Coffee, BookOpen, Rocket,
  Lightbulb, GraduationCap, Volume2, VolumeX,
} from 'lucide-react';

interface NotificationsDropdownProps {
  userId: string;
  darkMode: boolean;
  onNavigate: (view: string, actorId?: string) => void;
}

// ── Type metadata ─────────────────────────────────────────────────────────────
const TYPE_META: Record<string, {
  icon: React.ReactNode;
  color: string;      // solid bg for icon circle
  dot: string;        // unread dot colour
  label: string;
}> = {
  like:                 { icon: <Heart size={14} fill="currentColor" />,   color: 'bg-rose-500 text-white',    dot: 'bg-rose-500',    label: 'liked your post' },
  comment:              { icon: <MessageCircle size={14} />,               color: 'bg-blue-500 text-white',    dot: 'bg-blue-500',    label: 'commented' },
  mention:              { icon: <MessageCircle size={14} />,               color: 'bg-fuchsia-500 text-white', dot: 'bg-fuchsia-500',  label: 'mentioned you' },
  connection_request:   { icon: <UserPlus size={14} />,                    color: 'bg-indigo-500 text-white',  dot: 'bg-indigo-500',  label: 'sent a request' },
  connection_accepted:  { icon: <UserCheck size={14} />,                   color: 'bg-emerald-500 text-white', dot: 'bg-emerald-500', label: 'accepted' },
  message:              { icon: <MessageSquare size={14} />,               color: 'bg-violet-500 text-white',  dot: 'bg-violet-500',  label: 'message' },
  group_message:        { icon: <MessageSquare size={14} />,               color: 'bg-violet-500 text-white',  dot: 'bg-violet-500',  label: 'group message' },
  community_message:    { icon: <MessageSquare size={14} />,               color: 'bg-emerald-500 text-white', dot: 'bg-emerald-500', label: 'community message' },
  community_post:      { icon: <Megaphone size={14} />,                    color: 'bg-indigo-500 text-white',  dot: 'bg-indigo-500',  label: 'new community post' },
  project_message:      { icon: <MessageSquare size={14} />,               color: 'bg-cyan-500 text-white',    dot: 'bg-cyan-500',    label: 'project message' },
  group_invite:         { icon: <Users size={14} />,                       color: 'bg-amber-500 text-white',   dot: 'bg-amber-500',   label: 'group invite' },
  profile_view:         { icon: <Bell size={14} />,                        color: 'bg-sky-500 text-white',     dot: 'bg-sky-500',     label: 'viewed your profile' },
  find_people_apply:    { icon: <Users size={14} />,                       color: 'bg-indigo-500 text-white',  dot: 'bg-indigo-500',  label: 'applied' },
  find_people_accept:   { icon: <UserCheck size={14} />,                   color: 'bg-emerald-500 text-white', dot: 'bg-emerald-500', label: 'accepted' },
  find_people_accepted: { icon: <UserCheck size={14} />,                   color: 'bg-emerald-500 text-white', dot: 'bg-emerald-500', label: 'accepted' },
  announcement:         { icon: <Megaphone size={14} />,                   color: 'bg-orange-500 text-white',  dot: 'bg-orange-500',  label: 'announcement' },
  community_invite:      { icon: <Users size={14} />,                       color: 'bg-indigo-500 text-white',  dot: 'bg-indigo-500',  label: 'community invite' },
  community_member_joined: { icon: <Users size={14} />,                   color: 'bg-emerald-500 text-white',  dot: 'bg-emerald-500',  label: 'new community member' },
};

const FALLBACK = { icon: <Bell size={14} />, color: 'bg-slate-500 text-white', dot: 'bg-slate-400', label: 'notification' };

function metaForNotif(n: Notification) {
  let m = TYPE_META[n.type];
  if (!m) {
    if (n.title.includes('☕')) m = { ...FALLBACK, icon: <Coffee size={14} />,       color: 'bg-amber-500 text-white',  dot: 'bg-amber-500' };
    else if (n.title.includes('📚')) m = { ...FALLBACK, icon: <BookOpen size={14} />,  color: 'bg-blue-500 text-white',   dot: 'bg-blue-500' };
    else if (n.title.includes('🚀')) m = { ...FALLBACK, icon: <Rocket size={14} />,    color: 'bg-rose-500 text-white',   dot: 'bg-rose-500' };
    else if (n.title.includes('💡')) m = { ...FALLBACK, icon: <Lightbulb size={14} />, color: 'bg-yellow-500 text-white', dot: 'bg-yellow-500' };
    else if (n.title.includes('🎓')) m = { ...FALLBACK, icon: <GraduationCap size={14} />, color: 'bg-purple-500 text-white', dot: 'bg-purple-500' };
    else m = FALLBACK;
  }
  return m;
}

function viewForType(type: string): string {
  if (type === 'message' || type === 'group_message' || type === 'group_invite') return 'messages';
  if (type === 'community_message') return 'communities';
  if (type === 'community_post') return 'communities';
  if (type === 'project_message') return 'projects';
  if (type === 'like' || type === 'comment' || type === 'mention') return 'feed';
  // Incoming requests live in the Connect/Discovery view, not the dashboard.
  // Opening the notification there makes the existing Accept/Reject controls
  // immediately discoverable.
  if (type === 'connection_request' || type === 'connection_accepted') return 'explore';
  if (type === 'find_people_apply' || type === 'find_people_accept' || type === 'find_people_accepted') return 'find-people';
  if (type === 'announcement') return 'colleges';
  if (type === 'community_invite') return 'communities';
  if (type === 'community_member_joined') return 'communities';
  if (type === 'profile_view') return 'explore';
  return 'feed';
}

function markerFromBody(body: string, marker: 'community' | 'post'): string | undefined {
  return body.match(new RegExp(`\\[\\[${marker}:([^\\]]+)\\]\\]`))?.[1];
}

function cleanNotificationBody(body: string): string {
  return body.replace(/\s*\[\[(?:community|post|group|project):[^\]]+\]\]/g, '').trim();
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// Initials from notification title (first 2 words)
function initials(title: string): string {
  const clean = title.replace(/[^\w\s]/g, '').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return '??';
}

// Avatar background colours — stable per name
const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-violet-500', 'bg-rose-500', 'bg-amber-500',
  'bg-emerald-500', 'bg-sky-500', 'bg-pink-500', 'bg-teal-500',
];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// ── Web Audio ding ────────────────────────────────────────────────────────────
function playDing() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const play = (freq: number, start: number, dur: number, vol = 0.22) => {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.value = freq;
      g.gain.setValueAtTime(0, ctx.currentTime + start);
      g.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    };
    play(880, 0, 0.18); play(1174, 0.14, 0.35);
    setTimeout(() => ctx.close(), 700);
  } catch {}
}

export default function NotificationsDropdown({ userId, darkMode, onNavigate }: NotificationsDropdownProps) {
  const [open, setOpen]     = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [sound, setSound]   = useState(true);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const dropRef             = useRef<HTMLDivElement>(null);
  const prevIdsRef          = useRef<Set<string>>(new Set());
  const dm = darkMode;

  const unreadCount = notifs.filter(n => !n.isRead).length;

  const fetchNotifs = useCallback(async () => {
    try {
      const data = await api.notifications.getForUser(userId);
      setNotifs(data);
      const incomingIds = new Set<string>(data.map((n: Notification) => n.id));
      const fresh: string[] = [];
      incomingIds.forEach(id => { if (!prevIdsRef.current.has(id)) fresh.push(id); });
      if (fresh.length > 0 && prevIdsRef.current.size > 0) {
        if (sound) playDing();
        setNewIds(new Set(fresh));
        setTimeout(() => setNewIds(new Set()), 3000);
      }
      prevIdsRef.current = incomingIds;
    } catch {}
  }, [userId, sound]);

  useEffect(() => {
    fetchNotifs();
    const iv = setInterval(fetchNotifs, 5000);
    return () => clearInterval(iv);
  }, [fetchNotifs]);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const markRead = async (id: string) => {
    await api.notifications.markRead(id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllRead = async () => {
    setLoading(true);
    await api.notifications.markAllRead(userId);
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    setLoading(false);
  };

  const handleNotifClick = async (n: Notification) => {
    await markRead(n.id);
    setOpen(false);
    const communityId = markerFromBody(n.body, 'community');
    const targetView = communityId && (n.type === 'like' || n.type === 'comment' || n.type === 'mention')
      ? 'communities'
      : viewForType(n.type);
    onNavigate(
      targetView,
      targetView === 'messages' ? n.actorId : communityId
    );
  };

  return (
    <div className="relative" ref={dropRef}>
      {/* ── Bell button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`relative p-2 rounded-full border transition-all cursor-pointer
          ${dm ? 'border-white/10 hover:bg-white/8 text-slate-300' : 'border-neutral-200 hover:bg-neutral-100 text-slate-600'}`}
        title="Notifications"
      >
        <Bell size={17} className={unreadCount > 0 ? 'text-indigo-500' : ''} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center bg-rose-500 text-white text-[9px] font-black rounded-full px-1 shadow-lg shadow-rose-500/50">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute right-0 top-full mt-2 rounded-2xl shadow-2xl border z-50 flex flex-col overflow-hidden
            ${dm ? 'bg-[#111118] border-white/10 shadow-black/70' : 'bg-white border-neutral-200 shadow-slate-200/80'}`}
          style={{ width: 340, maxHeight: 540 }}
        >
          {/* ── Header ── */}
          <div className={`flex items-center justify-between px-4 pt-4 pb-3 shrink-0`}>
            <div className="flex items-center gap-2.5">
              <span className={`text-[13px] font-black tracking-tight ${dm ? 'text-white' : 'text-slate-900'}`}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full bg-indigo-500 text-white text-[10px] font-black">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {/* Sound toggle */}
              <button
                onClick={() => setSound(s => !s)}
                title={sound ? 'Mute sounds' : 'Unmute sounds'}
                className={`p-1.5 rounded-lg cursor-pointer border-0 transition-colors
                  ${sound
                    ? (dm ? 'text-indigo-400 bg-indigo-500/12' : 'text-indigo-500 bg-indigo-50')
                    : (dm ? 'text-slate-500 hover:bg-white/8' : 'text-slate-400 hover:bg-neutral-100')
                  }`}
              >
                {sound ? <Volume2 size={13} /> : <VolumeX size={13} />}
              </button>
              {/* Mark all read */}
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  disabled={loading}
                  title="Mark all read"
                  className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg cursor-pointer border-0 transition-colors disabled:opacity-40
                    ${dm ? 'bg-white/8 text-slate-300 hover:bg-white/12' : 'bg-neutral-100 text-slate-600 hover:bg-neutral-200'}`}
                >
                  <CheckCheck size={11} />
                  All read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className={`p-1.5 rounded-lg cursor-pointer border-0 transition-colors ${dm ? 'text-slate-500 hover:bg-white/8' : 'text-slate-400 hover:bg-neutral-100'}`}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className={`mx-4 h-px shrink-0 ${dm ? 'bg-white/8' : 'bg-neutral-100'}`} />

          {/* ── List ── */}
          <div className="overflow-y-auto flex-1">
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${dm ? 'bg-white/5' : 'bg-slate-50'}`}>
                  <Bell size={28} className={dm ? 'text-slate-700' : 'text-slate-300'} />
                </div>
                <div className="text-center">
                  <p className={`text-[13px] font-bold ${dm ? 'text-slate-300' : 'text-slate-700'}`}>You're all caught up!</p>
                  <p className={`text-[11px] mt-1 ${dm ? 'text-slate-600' : 'text-slate-400'}`}>Likes, messages &amp; connections show here</p>
                </div>
              </div>
            ) : (
              <div className="py-1">
                {notifs.map((n, i) => {
                  const meta    = metaForNotif(n);
                  const isNew   = newIds.has(n.id);
                  const isUnread = !n.isRead;
                  const ini     = initials(n.title);
                  const aColor  = avatarColor(n.title);

                  return (
                    <div
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-all select-none
                        ${isNew ? 'animate-[fadeSlide_0.25s_ease_both]' : ''}
                        ${isUnread
                          ? (dm ? 'bg-indigo-500/6 hover:bg-indigo-500/10' : 'bg-indigo-50/60 hover:bg-indigo-50')
                          : (dm ? 'hover:bg-white/4' : 'hover:bg-neutral-50')
                        }
                        ${i > 0 ? (dm ? 'border-t border-white/5' : 'border-t border-neutral-100') : ''}
                      `}
                    >
                      {/* Avatar with type badge */}
                      <div className="relative shrink-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-[13px] ${aColor}`}>
                          {ini}
                        </div>
                        {/* Type badge */}
                        <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center shadow-sm ${meta.color}
                          ${dm ? 'ring-2 ring-[#111118]' : 'ring-2 ring-white'}`}>
                          {meta.icon}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-[12px] leading-snug flex-1 min-w-0
                            ${isUnread
                              ? (dm ? 'text-white' : 'text-slate-900')
                              : (dm ? 'text-slate-300' : 'text-slate-600')
                            }`}>
                            <span className="font-bold">{n.title}</span>
                            {n.body && (
                              <span className={`ml-1 font-normal ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
                                 {(cleanNotificationBody(n.body).length > 40
                                    ? cleanNotificationBody(n.body).slice(0, 40) + '…'
                                    : cleanNotificationBody(n.body))}
                              </span>
                            )}
                          </p>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className={`text-[10px] font-medium ${dm ? 'text-slate-600' : 'text-slate-400'}`}>
                              {timeAgo(n.createdAt)}
                            </span>
                            {isUnread && (
                              <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
