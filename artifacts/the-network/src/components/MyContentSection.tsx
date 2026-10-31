import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Post, CampusEvent, Project, Community, GroupChat } from '../types';
import { api } from '../api';
import Avatar from './Avatar';
import {
  FileText, Calendar, Rocket, Users, MessageSquare,
  Trash2, Pencil, X, Check, Heart, MessageCircle,
  Globe, MapPin, Clock, Tag, AlertTriangle,
  Lightbulb, Wrench, Zap, UserPlus, Crown,
  Search, UserMinus, ChevronDown, ChevronUp,
  MessageCircle as ChatIcon, Settings, Send, UserCheck,
} from 'lucide-react';

interface MyContentSectionProps {
  currentUser: UserProfile;
  darkMode: boolean;
  posts: Post[];
  allUsers: UserProfile[];
  onDeletePost: (id: string) => void;
  onNavigate?: (view: string, extra?: string) => void;
}

type Tab = 'posts' | 'events' | 'projects' | 'communities' | 'groups';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'posts',       label: 'Posts',       icon: <FileText size={13} /> },
  { key: 'events',      label: 'Events',      icon: <Calendar size={13} /> },
  { key: 'projects',    label: 'Projects',    icon: <Rocket size={13} /> },
  { key: 'communities', label: 'Communities', icon: <Users size={13} /> },
  { key: 'groups',      label: 'Groups',      icon: <MessageSquare size={13} /> },
];

const STAGE_COLORS: Record<string, string> = {
  Idea:     'bg-amber-500/10 text-amber-600',
  Building: 'bg-blue-500/10 text-blue-600',
  MVP:      'bg-violet-500/10 text-violet-600',
  Launched: 'bg-emerald-500/10 text-emerald-600',
};
const STAGE_ICONS: Record<string, React.ReactNode> = {
  Idea:     <Lightbulb size={10} />,
  Building: <Wrench size={10} />,
  MVP:      <Zap size={10} />,
  Launched: <Globe size={10} />,
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function ConfirmDelete({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-rose-500 font-semibold flex items-center gap-1"><AlertTriangle size={10} /> Delete?</span>
      <button onClick={onConfirm} className="px-2 py-0.5 rounded-md bg-rose-500 text-white text-[10px] font-bold cursor-pointer border-0">Yes</button>
      <button onClick={onCancel} className="px-2 py-0.5 rounded-md bg-neutral-200 dark:bg-white/10 text-[10px] font-bold cursor-pointer border-0">No</button>
    </div>
  );
}

// ── Mini member search picker ───────────────────────────────────────────────
function MemberPicker({
  allUsers, excludeIds, darkMode, onAdd, placeholder = 'Search people to add…',
}: {
  allUsers: UserProfile[];
  excludeIds: string[];
  darkMode: boolean;
  onAdd: (user: UserProfile) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState('');
  const results = useMemo(() => {
    if (!q.trim()) return [];
    const lower = q.toLowerCase();
    return allUsers.filter(u =>
      !excludeIds.includes(u.id) &&
      (u.fullName.toLowerCase().includes(lower) || u.college?.toLowerCase().includes(lower) || u.branch?.toLowerCase().includes(lower))
    ).slice(0, 5);
  }, [q, allUsers, excludeIds]);

  return (
    <div className="relative">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-neutral-50 border-neutral-200'}`}>
        <Search size={12} className="opacity-40 shrink-0" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-xs outline-none placeholder-slate-400"
        />
        {q && <button onClick={() => setQ('')} className="cursor-pointer border-0 bg-transparent opacity-40"><X size={12} /></button>}
      </div>
      {results.length > 0 && (
        <div className={`absolute top-full left-0 right-0 mt-1 rounded-xl border shadow-lg z-20 overflow-hidden ${darkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-neutral-200'}`}>
          {results.map(u => (
            <button
              key={u.id}
              type="button"
              onClick={() => { onAdd(u); setQ(''); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-all cursor-pointer border-0 ${darkMode ? 'hover:bg-white/5 text-white' : 'hover:bg-neutral-50 text-slate-800'}`}
            >
              <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 bg-indigo-500/10">
                <Avatar avatar={u.avatar} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold truncate">{u.fullName}</p>
                <p className={`text-[9px] truncate ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{u.college}</p>
              </div>
              <UserPlus size={12} className="text-indigo-500 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Member row ──────────────────────────────────────────────────────────────
function MemberRow({
  user, isOwner, darkMode, onRemove, removable = true,
}: { user: UserProfile; isOwner?: boolean; darkMode: boolean; onRemove?: () => void | Promise<void>; removable?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl ${darkMode ? 'bg-white/3 hover:bg-white/6' : 'bg-neutral-50 hover:bg-neutral-100'} transition-all`}>
      <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
        <Avatar avatar={user.avatar} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={`text-[11px] font-bold truncate ${darkMode ? 'text-white' : 'text-slate-800'}`}>{user.fullName}</p>
          {isOwner && <Crown size={10} className="text-amber-500 shrink-0" />}
        </div>
        <p className={`text-[9px] truncate ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{user.college}</p>
      </div>
      {removable && onRemove && !isOwner && (
        <button
          onClick={onRemove}
          className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer border-0 bg-transparent shrink-0"
          title="Remove member"
        >
          <UserMinus size={12} />
        </button>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function MyContentSection({ currentUser, darkMode, posts, allUsers, onDeletePost, onNavigate }: MyContentSectionProps) {
  const [activeTab, setActiveTab] = useState<Tab>('posts');
  const [events,      setEvents]      = useState<CampusEvent[]>([]);
  const [projects,    setProjects]    = useState<Project[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [groups,      setGroups]      = useState<GroupChat[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [deletingId,  setDeletingId]  = useState<string | null>(null);
  const [confirmId,   setConfirmId]   = useState<string | null>(null);

  // Edit states
  const [editingEvent,   setEditingEvent]   = useState<CampusEvent | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingComm,    setEditingComm]    = useState<Community | null>(null);

  // Management panel open state
  const [managingCommId,  setManagingCommId]  = useState<string | null>(null);
  const [managingGroupId, setManagingGroupId] = useState<string | null>(null);

  // Saving state for member actions
  const [saving, setSaving] = useState(false);

  const myPosts       = posts.filter(p => p.authorId === currentUser.id);
  const myEvents      = events.filter(e => e.organizerId === currentUser.id);
  const myProjects    = projects.filter(p => p.creatorId === currentUser.id);
  const myCommunities = communities.filter(c => c.creatorId === currentUser.id);
  const myGroups      = groups.filter(g => g.creatorId === currentUser.id);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.events.getAll(),
      api.projects.getAll(),
      api.communities.getAll(),
      api.groupChats.getAll(),
    ]).then(([ev, pr, co, gr]) => {
      setEvents(ev);
      setProjects(pr);
      setCommunities(co);
      setGroups(gr);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const counts: Record<Tab, number> = {
    posts:       myPosts.length,
    events:      myEvents.length,
    projects:    myProjects.length,
    communities: myCommunities.length,
    groups:      myGroups.length,
  };

  // ── Delete handlers ────────────────────────────────────────────────────────
  async function handleDeletePost(id: string) {
    setDeletingId(id);
    try { await api.posts.delete(id, currentUser.id); onDeletePost(id); } catch {}
    setDeletingId(null); setConfirmId(null);
  }
  async function handleDeleteEvent(id: string) {
    setDeletingId(id);
    try { await api.events.delete(id); setEvents(p => p.filter(e => e.id !== id)); } catch {}
    setDeletingId(null); setConfirmId(null);
  }
  async function handleDeleteProject(id: string) {
    setDeletingId(id);
    try { await api.projects.delete(id); setProjects(p => p.filter(x => x.id !== id)); } catch {}
    setDeletingId(null); setConfirmId(null);
  }
  async function handleDeleteCommunity(id: string) {
    setDeletingId(id);
    try { await api.communities.delete(id, currentUser.id); setCommunities(p => p.filter(c => c.id !== id)); } catch {}
    setDeletingId(null); setConfirmId(null);
  }
  async function handleDeleteGroup(id: string) {
    setDeletingId(id);
    try { await api.groupChats.delete(id); setGroups(p => p.filter(g => g.id !== id)); } catch {}
    setDeletingId(null); setConfirmId(null);
  }

  // ── Event / Project save ───────────────────────────────────────────────────
  async function saveEvent() {
    if (!editingEvent) return;
    try {
      const updated = await api.events.update(editingEvent.id, {
        title: editingEvent.title, description: editingEvent.description,
        date: editingEvent.date, time: editingEvent.time,
        venue: editingEvent.venue, maxSeats: editingEvent.maxSeats,
      });
      setEvents(p => p.map(e => e.id === updated.id ? updated : e));
      setEditingEvent(null);
    } catch {}
  }
  async function saveProject() {
    if (!editingProject) return;
    try {
      const updated = await api.projects.update(editingProject.id, {
        title: editingProject.title, description: editingProject.description,
        stage: editingProject.stage, tags: editingProject.tags, lookingFor: editingProject.lookingFor,
      });
      setProjects(p => p.map(x => x.id === updated.id ? updated : x));
      setEditingProject(null);
    } catch {}
  }

  // ── Community member management ────────────────────────────────────────────
  async function handleCommAddMember(comm: Community, user: UserProfile) {
    if (comm.memberIds.includes(user.id)) return;
    setSaving(true);
    try {
      const updated = await api.communities.update(comm.id, { memberIds: [...comm.memberIds, user.id] });
      setCommunities(p => p.map(c => c.id === comm.id ? updated : c));
    } catch {} finally { setSaving(false); }
  }
  async function handleCommRemoveMember(comm: Community, userId: string) {
    setSaving(true);
    try {
      const updated = await api.communities.update(comm.id, { memberIds: comm.memberIds.filter(id => id !== userId) });
      setCommunities(p => p.map(c => c.id === comm.id ? updated : c));
    } catch {} finally { setSaving(false); }
  }
  async function handleSaveCommunity() {
    if (!editingComm) return;
    setSaving(true);
    try {
      const updated = await api.communities.update(editingComm.id, {
        actorId: currentUser.id,
        name: editingComm.name, description: editingComm.description,
        icon: editingComm.icon, category: editingComm.category,
        tags: editingComm.tags,
      });
      setCommunities(p => p.map(c => c.id === updated.id ? updated : c));
      setEditingComm(null);
    } catch {} finally { setSaving(false); }
  }

  // ── Group member management ────────────────────────────────────────────────
  async function handleGroupAddMember(group: GroupChat, user: UserProfile) {
    if (group.memberIds.includes(user.id) || group.pendingIds.includes(user.id)) return;
    setSaving(true);
    try {
      // Use invite (sends push notification + puts in pending) instead of addMember (direct)
      const updated = await api.groupChats.invite(group.id, [user.id], currentUser.id);
      setGroups(p => p.map(g => g.id === group.id ? updated : g));
    } catch {} finally { setSaving(false); }
  }
  async function handleGroupRemoveMember(groupId: string, userId: string) {
    setSaving(true);
    try {
      const updated = await api.groupChats.removeMember(groupId, userId);
      setGroups(p => p.map(g => g.id === groupId ? updated : g));
    } catch {} finally { setSaving(false); }
  }
  async function handleGroupApprovePending(groupId: string, userId: string) {
    setSaving(true);
    try {
      const updated = await api.groupChats.accept(groupId, userId);
      setGroups(p => p.map(g => g.id === groupId ? updated : g));
    } catch {} finally { setSaving(false); }
  }
  async function handleGroupDeclinePending(groupId: string, userId: string) {
    setSaving(true);
    try {
      const updated = await api.groupChats.decline(groupId, userId);
      setGroups(p => p.map(g => g.id === groupId ? updated : g));
    } catch {} finally { setSaving(false); }
  }

  // ── Style helpers ──────────────────────────────────────────────────────────
  const card = `rounded-2xl border transition-all ${darkMode ? 'bg-white/3 border-white/8' : 'bg-white border-neutral-200/80'}`;
  const inputCls = `w-full rounded-xl border px-3 py-2 text-xs outline-none transition-all ${darkMode ? 'bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-indigo-400' : 'bg-neutral-50 border-neutral-200 focus:border-indigo-400 text-slate-800'}`;
  const sectionLabel = `text-[9px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`;

  function EmptyState({ label }: { label: string }) {
    return (
      <div className={`rounded-2xl border border-dashed p-10 flex flex-col items-center text-center gap-2 ${darkMode ? 'border-white/10' : 'border-neutral-200'}`}>
        <span className="text-3xl opacity-30">📭</span>
        <p className="text-xs font-semibold opacity-40">No {label} yet</p>
        <p className="text-[10px] opacity-30">Use the <strong>+ Create</strong> button to add one</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-black uppercase tracking-wide">My Content</h1>
        <p className={`text-[11px] mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Manage everything you've created — members, chats, settings
        </p>
      </div>

      {/* Tab bar */}
      <div className={`flex gap-1 p-1 rounded-2xl border ${darkMode ? 'bg-white/3 border-white/8' : 'bg-neutral-100/80 border-neutral-200/60'}`}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer border-0 ${
              activeTab === t.key
                ? 'bg-indigo-500 text-white shadow-sm'
                : darkMode ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-800 hover:bg-white'
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
            {counts[t.key] > 0 && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${activeTab === t.key ? 'bg-white/20 text-white' : 'bg-indigo-500/15 text-indigo-500'}`}>
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        </div>
      )}

      {/* ── POSTS ── */}
      {!loading && activeTab === 'posts' && (
        <div className="space-y-3">
          {myPosts.length === 0 ? <EmptyState label="posts" /> : myPosts.map(p => (
            <div key={p.id} className={`${card} p-4`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-indigo-500/10">
                    <Avatar avatar={currentUser.avatar} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold leading-none">{currentUser.fullName}</p>
                    <p className={`text-[9px] mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{timeAgo(p.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {confirmId === p.id ? (
                    <ConfirmDelete onConfirm={() => handleDeletePost(p.id)} onCancel={() => setConfirmId(null)} />
                  ) : (
                    <button onClick={() => setConfirmId(p.id)} disabled={deletingId === p.id}
                      className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer border-0 bg-transparent">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
              <p className={`mt-3 text-xs leading-relaxed line-clamp-3 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{p.content}</p>
              {(p.academicTag || p.projectTitle || p.feeling) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.academicTag && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 text-[9px] font-semibold"><Tag size={8} />{p.academicTag}</span>}
                  {p.projectTitle && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-500 text-[9px] font-semibold"><Rocket size={8} />{p.projectTitle}</span>}
                  {p.feeling && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[9px] font-semibold">feeling {p.feeling}</span>}
                </div>
              )}
              <div className={`mt-3 pt-3 border-t flex items-center gap-4 text-[10px] ${darkMode ? 'border-white/8 text-slate-500' : 'border-neutral-100 text-slate-400'}`}>
                <span className="flex items-center gap-1"><Heart size={10} /> {p.likes.length} likes</span>
                <span className="flex items-center gap-1"><MessageCircle size={10} /> {p.comments?.length ?? 0} comments</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── EVENTS ── */}
      {!loading && activeTab === 'events' && (
        <div className="space-y-3">
          {myEvents.length === 0 ? <EmptyState label="events" /> : myEvents.map(ev => (
            <div key={ev.id} className={`${card} p-4`}>
              {editingEvent?.id === ev.id ? (
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Edit Event</p>
                  <input className={inputCls} value={editingEvent.title} onChange={e => setEditingEvent({...editingEvent, title: e.target.value})} placeholder="Title" />
                  <textarea className={`${inputCls} resize-none`} rows={2} value={editingEvent.description} onChange={e => setEditingEvent({...editingEvent, description: e.target.value})} placeholder="Description" />
                  <div className="grid grid-cols-2 gap-2">
                    <input className={inputCls} type="date" value={editingEvent.date} onChange={e => setEditingEvent({...editingEvent, date: e.target.value})} />
                    <input className={inputCls} type="time" value={editingEvent.time} onChange={e => setEditingEvent({...editingEvent, time: e.target.value})} />
                  </div>
                  <input className={inputCls} value={editingEvent.venue} onChange={e => setEditingEvent({...editingEvent, venue: e.target.value})} placeholder="Venue" />
                  <div className="flex gap-2">
                    <button onClick={saveEvent} className="flex-1 py-1.5 rounded-xl bg-indigo-500 text-white text-xs font-bold cursor-pointer border-0 flex items-center justify-center gap-1"><Check size={11} />Save</button>
                    <button onClick={() => setEditingEvent(null)} className="flex-1 py-1.5 rounded-xl bg-neutral-200 dark:bg-white/10 text-xs font-bold cursor-pointer border-0"><X size={11} className="inline mr-1" />Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{ev.title}</p>
                      <p className={`text-[9px] mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{ev.category} • {ev.college}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setEditingEvent(ev)} className="p-1.5 rounded-lg text-indigo-400 hover:bg-indigo-500/10 transition-all cursor-pointer border-0 bg-transparent"><Pencil size={11} /></button>
                      {confirmId === ev.id ? (
                        <ConfirmDelete onConfirm={() => handleDeleteEvent(ev.id)} onCancel={() => setConfirmId(null)} />
                      ) : (
                        <button onClick={() => setConfirmId(ev.id)} className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer border-0 bg-transparent"><Trash2 size={11} /></button>
                      )}
                    </div>
                  </div>
                  <p className={`mt-2 text-[10px] leading-relaxed line-clamp-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{ev.description}</p>
                  <div className={`mt-3 pt-3 border-t flex flex-wrap gap-x-4 gap-y-1 text-[10px] ${darkMode ? 'border-white/8 text-slate-500' : 'border-neutral-100 text-slate-400'}`}>
                    <span className="flex items-center gap-1"><Clock size={9} />{ev.date}{ev.time ? ` at ${ev.time}` : ''}</span>
                    {ev.venue && <span className="flex items-center gap-1"><MapPin size={9} />{ev.venue}</span>}
                    <span className="flex items-center gap-1"><UserPlus size={9} />{ev.registeredIds.length}{ev.maxSeats ? `/${ev.maxSeats}` : ''} registered</span>
                    {ev.isOnline && <span className="flex items-center gap-1 text-emerald-500"><Globe size={9} />Online</span>}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── PROJECTS ── */}
      {!loading && activeTab === 'projects' && (
        <div className="space-y-3">
          {myProjects.length === 0 ? <EmptyState label="projects" /> : myProjects.map(pr => (
            <div key={pr.id} className={`${card} p-4`}>
              {editingProject?.id === pr.id ? (
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Edit Project</p>
                  <input className={inputCls} value={editingProject.title} onChange={e => setEditingProject({...editingProject, title: e.target.value})} placeholder="Title" />
                  <textarea className={`${inputCls} resize-none`} rows={2} value={editingProject.description} onChange={e => setEditingProject({...editingProject, description: e.target.value})} placeholder="Description" />
                  <select className={inputCls} value={editingProject.stage} onChange={e => setEditingProject({...editingProject, stage: e.target.value as Project['stage']})}>
                    {(['Idea','Building','MVP','Launched'] as const).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <button onClick={saveProject} className="flex-1 py-1.5 rounded-xl bg-indigo-500 text-white text-xs font-bold cursor-pointer border-0 flex items-center justify-center gap-1"><Check size={11} />Save</button>
                    <button onClick={() => setEditingProject(null)} className="flex-1 py-1.5 rounded-xl bg-neutral-200 dark:bg-white/10 text-xs font-bold cursor-pointer border-0"><X size={11} className="inline mr-1" />Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold truncate">{pr.title}</p>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold ${STAGE_COLORS[pr.stage]}`}>{STAGE_ICONS[pr.stage]}{pr.stage}</span>
                      </div>
                      <p className={`text-[9px] mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{pr.memberIds.length} member{pr.memberIds.length !== 1 ? 's' : ''} • {timeAgo(pr.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setEditingProject(pr)} className="p-1.5 rounded-lg text-indigo-400 hover:bg-indigo-500/10 transition-all cursor-pointer border-0 bg-transparent"><Pencil size={11} /></button>
                      {confirmId === pr.id ? (
                        <ConfirmDelete onConfirm={() => handleDeleteProject(pr.id)} onCancel={() => setConfirmId(null)} />
                      ) : (
                        <button onClick={() => setConfirmId(pr.id)} className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer border-0 bg-transparent"><Trash2 size={11} /></button>
                      )}
                    </div>
                  </div>
                  <p className={`mt-2 text-[10px] leading-relaxed line-clamp-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{pr.description}</p>
                  {pr.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {pr.tags.map(t => <span key={t} className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium ${darkMode ? 'bg-white/8 text-slate-300' : 'bg-neutral-100 text-slate-600'}`}>{t}</span>)}
                    </div>
                  )}
                  {pr.lookingFor.length > 0 && (
                    <div className={`mt-3 pt-3 border-t text-[10px] ${darkMode ? 'border-white/8 text-slate-500' : 'border-neutral-100 text-slate-400'}`}>
                      <span className="font-semibold">Looking for: </span>{pr.lookingFor.join(', ')}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── COMMUNITIES ── */}
      {!loading && activeTab === 'communities' && (
        <div className="space-y-4">
          {myCommunities.length === 0 ? <EmptyState label="communities" /> : myCommunities.map(c => {
            const isManaging = managingCommId === c.id;
            const isEditing  = editingComm?.id === c.id;
            const members    = allUsers.filter(u => c.memberIds.includes(u.id));
            const nonMemberIds = [...c.memberIds];

            return (
              <div key={c.id} className={card}>
                {/* Header */}
                <div className="flex items-center gap-3 p-4">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15 border border-indigo-500/20 flex items-center justify-center text-2xl shrink-0">
                    {c.icon?.length <= 2 ? c.icon : '🌐'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-black truncate ${darkMode ? 'text-white' : 'text-slate-800'}`}>{c.name}</p>
                    <p className={`text-[10px] mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      {c.category} • {c.memberIds.length} member{c.memberIds.length !== 1 ? 's' : ''}
                      {c.college ? ` • ${c.college}` : ' • Campus-wide'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => { setManagingCommId(isManaging ? null : c.id); setEditingComm(null); }}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer border-0 text-xs font-bold flex items-center gap-1 px-2.5 ${isManaging ? 'bg-indigo-500 text-white' : darkMode ? 'bg-white/8 text-slate-300 hover:bg-white/15' : 'bg-neutral-100 text-slate-600 hover:bg-neutral-200'}`}
                    >
                      <Settings size={11} />
                      <span className="hidden sm:inline">Manage</span>
                      {isManaging ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                    </button>
                    {confirmId === c.id ? (
                      <ConfirmDelete onConfirm={() => handleDeleteCommunity(c.id)} onCancel={() => setConfirmId(null)} />
                    ) : (
                      <button onClick={() => setConfirmId(c.id)} className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer border-0 bg-transparent"><Trash2 size={11} /></button>
                    )}
                  </div>
                </div>

                <p className={`px-4 pb-3 text-[11px] leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{c.description}</p>

                {c.tags.length > 0 && (
                  <div className="px-4 pb-3 flex flex-wrap gap-1">
                    {c.tags.map(t => <span key={t} className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${darkMode ? 'bg-indigo-500/15 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>{t}</span>)}
                  </div>
                )}

                {/* Management panel */}
                {isManaging && (
                  <div className={`border-t px-4 py-4 space-y-5 ${darkMode ? 'border-white/8 bg-white/2' : 'border-neutral-100 bg-neutral-50/60'}`}>

                    {/* Edit details */}
                    {isEditing ? (
                      <div className="space-y-3">
                        <p className={sectionLabel}><Pencil size={10} /> Edit Details</p>
                        <div className="flex gap-2">
                          <input className={`${inputCls} w-16`} value={editingComm!.icon} maxLength={2} onChange={e => setEditingComm({...editingComm!, icon: e.target.value})} placeholder="🌐" />
                          <input className={`${inputCls} flex-1`} value={editingComm!.name} onChange={e => setEditingComm({...editingComm!, name: e.target.value})} placeholder="Community name" />
                        </div>
                        <textarea className={`${inputCls} resize-none`} rows={2} value={editingComm!.description} onChange={e => setEditingComm({...editingComm!, description: e.target.value})} placeholder="Description" />
                        <input className={inputCls} value={editingComm!.tags.join(', ')} onChange={e => setEditingComm({...editingComm!, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)})} placeholder="Tags (comma separated)" />
                        <div className="flex gap-2">
                          <button onClick={handleSaveCommunity} disabled={saving} className="flex-1 py-1.5 rounded-xl bg-indigo-500 text-white text-xs font-bold cursor-pointer border-0 flex items-center justify-center gap-1 disabled:opacity-50"><Check size={11} />Save</button>
                          <button onClick={() => setEditingComm(null)} className="flex-1 py-1.5 rounded-xl bg-neutral-200 dark:bg-white/10 text-xs font-bold cursor-pointer border-0"><X size={11} className="inline mr-1" />Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingComm(c)}
                        className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer border-0 ${darkMode ? 'bg-white/6 text-slate-300 hover:bg-white/12' : 'bg-white text-slate-600 hover:bg-neutral-100 border border-neutral-200'}`}
                      >
                        <Pencil size={11} /> Edit Community Details
                      </button>
                    )}

                    {/* Members list */}
                    <div>
                      <p className={sectionLabel}><Users size={10} /> Members ({members.length})</p>
                      <div className="space-y-1.5 max-h-52 overflow-y-auto">
                        {members.length === 0 && <p className="text-[10px] opacity-40 text-center py-2">No members yet</p>}
                        {members.map(u => (
                          <MemberRow
                            key={u.id}
                            user={u}
                            isOwner={u.id === c.creatorId}
                            darkMode={darkMode}
                            removable={u.id !== c.creatorId}
                            onRemove={() => handleCommRemoveMember(c, u.id)}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Add members */}
                    <div>
                      <p className={sectionLabel}><UserPlus size={10} /> Add Members</p>
                      <MemberPicker
                        allUsers={allUsers}
                        excludeIds={nonMemberIds}
                        darkMode={darkMode}
                        onAdd={(user) => handleCommAddMember(c, user)}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── GROUPS ── */}
      {!loading && activeTab === 'groups' && (
        <div className="space-y-4">
          {myGroups.length === 0 ? <EmptyState label="groups" /> : myGroups.map(g => {
            const isManaging  = managingGroupId === g.id;
            const members     = allUsers.filter(u => g.memberIds.includes(u.id));
            const pendingUsers = allUsers.filter(u => g.pendingIds.includes(u.id));
            const allGroupIds  = [...g.memberIds, ...g.pendingIds];

            const typeColor: Record<string, string> = {
              fun: 'from-pink-500/15 to-rose-500/15 border-pink-500/20',
              study: 'from-blue-500/15 to-indigo-500/15 border-blue-500/20',
              startup: 'from-emerald-500/15 to-teal-500/15 border-emerald-500/20',
              hackathon: 'from-orange-500/15 to-amber-500/15 border-orange-500/20',
              batch: 'from-violet-500/15 to-purple-500/15 border-violet-500/20',
            };

            return (
              <div key={g.id} className={card}>
                {/* Header */}
                <div className="flex items-center gap-3 p-4">
                  <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br border flex items-center justify-center shrink-0 ${typeColor[g.type] || typeColor.fun}`}>
                    <MessageSquare size={18} className="text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-sm font-black truncate ${darkMode ? 'text-white' : 'text-slate-800'}`}>{g.name}</p>
                      <Crown size={10} className="text-amber-500 shrink-0" aria-label="You created this" />
                    </div>
                    <p className={`text-[10px] mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      {g.type} • {g.college} • {g.memberIds.length} member{g.memberIds.length !== 1 ? 's' : ''}
                      {g.pendingIds.length > 0 && <span className="text-amber-500 font-bold"> · {g.pendingIds.length} pending</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Open Chat button */}
                    <button
                      onClick={() => onNavigate?.('messages', 'group:' + g.id)}
                      title="Open group chat"
                      className={`p-1.5 rounded-lg transition-all cursor-pointer border-0 flex items-center gap-1 px-2.5 text-[11px] font-bold ${darkMode ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                    >
                      <ChatIcon size={11} />
                      <span className="hidden sm:inline">Chat</span>
                    </button>
                    <button
                      onClick={() => setManagingGroupId(isManaging ? null : g.id)}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer border-0 text-xs font-bold flex items-center gap-1 px-2.5 ${isManaging ? 'bg-indigo-500 text-white' : darkMode ? 'bg-white/8 text-slate-300 hover:bg-white/15' : 'bg-neutral-100 text-slate-600 hover:bg-neutral-200'}`}
                    >
                      <Settings size={11} />
                      <span className="hidden sm:inline">Manage</span>
                      {isManaging ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                    </button>
                    {confirmId === g.id ? (
                      <ConfirmDelete onConfirm={() => handleDeleteGroup(g.id)} onCancel={() => setConfirmId(null)} />
                    ) : (
                      <button onClick={() => setConfirmId(g.id)} className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer border-0 bg-transparent"><Trash2 size={11} /></button>
                    )}
                  </div>
                </div>

                {g.branch && (
                  <p className={`px-4 pb-2 text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Branch: {g.branch}</p>
                )}

                {/* Management panel */}
                {isManaging && (
                  <div className={`border-t px-4 py-4 space-y-5 ${darkMode ? 'border-white/8 bg-white/2' : 'border-neutral-100 bg-neutral-50/60'}`}>

                    {/* Pending invites */}
                    {pendingUsers.length > 0 && (
                      <div>
                        <p className={`${sectionLabel} text-amber-500`}><Send size={10} /> Pending Invites ({pendingUsers.length})</p>
                        <div className="space-y-1.5">
                          {pendingUsers.map(u => (
                            <div key={u.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl ${darkMode ? 'bg-amber-500/8' : 'bg-amber-50'}`}>
                              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                                <Avatar avatar={u.avatar} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-[11px] font-bold truncate ${darkMode ? 'text-white' : 'text-slate-800'}`}>{u.fullName}</p>
                                <p className={`text-[9px] truncate ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{u.college}</p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => handleGroupApprovePending(g.id, u.id)}
                                  disabled={saving}
                                  className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all cursor-pointer border-0 disabled:opacity-50"
                                  title="Approve"
                                >
                                  <UserCheck size={12} />
                                </button>
                                <button
                                  onClick={() => handleGroupDeclinePending(g.id, u.id)}
                                  disabled={saving}
                                  className="p-1.5 rounded-lg bg-rose-500/15 text-rose-500 hover:bg-rose-500/25 transition-all cursor-pointer border-0 disabled:opacity-50"
                                  title="Decline"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Members list */}
                    <div>
                      <p className={sectionLabel}><Users size={10} /> Members ({members.length})</p>
                      <div className="space-y-1.5 max-h-52 overflow-y-auto">
                        {members.length === 0 && <p className="text-[10px] opacity-40 text-center py-2">No members yet</p>}
                        {members.map(u => (
                          <MemberRow
                            key={u.id}
                            user={u}
                            isOwner={u.id === g.creatorId}
                            darkMode={darkMode}
                            removable={u.id !== g.creatorId}
                            onRemove={() => handleGroupRemoveMember(g.id, u.id)}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Add members */}
                    <div>
                      <p className={sectionLabel}><UserPlus size={10} /> Invite Members</p>
                      <MemberPicker
                        allUsers={allUsers}
                        excludeIds={allGroupIds}
                        darkMode={darkMode}
                        onAdd={(user) => handleGroupAddMember(g, user)}
                        placeholder="Search people to invite…"
                      />
                      <p className={`text-[9px] mt-1.5 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                        Invited members receive a notification and must accept to join.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
