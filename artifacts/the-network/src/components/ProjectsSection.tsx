import React, { useState, useEffect, useRef } from 'react';
import { Project, UserProfile, Connection } from '../types';
import { api } from '../api';
import {
  Rocket, Plus, X, Tag, Users, ArrowRight, Trash2, Pencil, CheckCircle2, Lightbulb, Wrench, Zap, Globe, UserPlus, LogOut, Send, ChevronLeft, MessageSquare
} from 'lucide-react';
import Avatar from './Avatar';

interface ProjectsSectionProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  connections: Connection[];
  darkMode: boolean;
  onViewUserProfile?: (userId: string) => void;
}

const STAGES = ['Idea', 'Building', 'MVP', 'Launched'] as const;
const STAGE_COLORS: Record<string, string> = {
  Idea: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Building: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  MVP: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  Launched: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};
const STAGE_ICONS: Record<string, React.ReactNode> = {
  Idea: <Lightbulb size={11} />,
  Building: <Wrench size={11} />,
  MVP: <Zap size={11} />,
  Launched: <Globe size={11} />,
};
const COMMON_TAGS = ['AI/ML', 'SaaS', 'EdTech', 'FinTech', 'HealthTech', 'Open Source', 'Hardware', 'Mobile', 'Web3', 'Social'];
const LOOKING_FOR_OPTIONS = ['Co-founder', 'Designer', 'Developer', 'Marketer', 'Mentor', 'Investor', 'Business Partner'];

export default function ProjectsSection({ currentUser, allUsers, connections, darkMode, onViewUserProfile }: ProjectsSectionProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({ title: '', description: '', stage: 'Idea' as Project['stage'], tags: [] as string[], lookingFor: [] as string[] });
  const [tagInput, setTagInput] = useState('');
  const [filter, setFilter] = useState<'all' | 'mine' | 'joined'>('all');
  const [saving, setSaving] = useState(false);

  // Project detail panel state
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projectTab, setProjectTab] = useState<'chat' | 'members'>('chat');

  // Group chat state
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const data = await api.projects.getAll();
      setProjects(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const loadProjectChat = async (projectId: string) => {
    setChatLoading(true);
    try {
      const msgs = await api.entityMessages.get('project', projectId);
      setChatMessages(msgs);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch {}
    setChatLoading(false);
  };

  useEffect(() => {
    if (projectTab === 'chat' && activeProjectId) {
      loadProjectChat(activeProjectId);
       const interval = setInterval(() => loadProjectChat(activeProjectId), 2500);
      return () => clearInterval(interval);
    }
  }, [projectTab, activeProjectId]);

  const sendProjectChat = async () => {
    if (!chatInput.trim() || !activeProjectId || chatSending) return;
    setChatSending(true);
    try {
      const msg = await api.entityMessages.send('project', activeProjectId, currentUser.id, chatInput.trim());
      setChatMessages(prev => [...prev, msg]);
      setChatInput('');
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch {}
    setChatSending(false);
  };

  const resetForm = () => {
    setForm({ title: '', description: '', stage: 'Idea', tags: [], lookingFor: [] });
    setTagInput('');
    setEditingId(null);
    setShowCreate(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        const updated = await api.projects.update(editingId, form);
        setProjects(prev => prev.map(p => p.id === editingId ? updated : p));
      } else {
        const created = await api.projects.create({ ...form, creatorId: currentUser.id });
        setProjects(prev => [created, ...prev]);
      }
      resetForm();
    } catch {}
    setSaving(false);
  };

  const handleJoin = async (project: Project) => {
    const isMember = project.memberIds.includes(currentUser.id);
    try {
      let updated: Project;
      if (isMember) {
        updated = await api.projects.leave(project.id, currentUser.id);
      } else {
        updated = await api.projects.join(project.id, currentUser.id);
      }
      setProjects(prev => prev.map(p => p.id === project.id ? updated : p));
    } catch {}
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project?')) return;
    try {
      await api.projects.delete(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch {}
  };

  const startEdit = (p: Project) => {
    setForm({ title: p.title, description: p.description, stage: p.stage, tags: p.tags, lookingFor: p.lookingFor });
    setEditingId(p.id);
    setShowCreate(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleTag = (t: string, field: 'tags' | 'lookingFor') => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].includes(t) ? prev[field].filter(x => x !== t) : [...prev[field], t],
    }));
  };

  const addCustomTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) setForm(prev => ({ ...prev, tags: [...prev.tags, t] }));
    setTagInput('');
  };

  const filteredProjects = projects.filter(p => {
    if (filter === 'mine') return p.creatorId === currentUser.id;
    if (filter === 'joined') return p.memberIds.includes(currentUser.id) && p.creatorId !== currentUser.id;
    return true;
  });

  const getUserById = (id: string) => allUsers.find(u => u.id === id);

  return (
    <div className="flex-1 min-w-0 space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Project Boards</h2>
          <p className="text-xs text-slate-400 mt-0.5">Discover startups, side projects, and find your team</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowCreate(s => !s); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
        >
          <Plus size={13} />
          New Project
        </button>
      </div>

      {/* Create / Edit Form */}
      {showCreate && (
        <div className={`rounded-2xl border p-5 transition-all ${darkMode ? 'bg-[#121217] border-white/10' : 'bg-white border-neutral-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              {editingId ? '✏️ Edit Project' : '🚀 Post a Project'}
            </h3>
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={14} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Project Title *</label>
              <input
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. EcoDrone — AI-Powered Crop Monitor"
                className={`w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-all ${darkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500/50' : 'bg-neutral-50 border-neutral-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-300'}`}
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Description *</label>
              <textarea
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="What are you building? What problem does it solve? What's your progress?"
                rows={3}
                className={`w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-all resize-none ${darkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500/50' : 'bg-neutral-50 border-neutral-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-300'}`}
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Stage</label>
              <div className="flex gap-2 flex-wrap">
                {STAGES.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, stage: s }))}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${form.stage === s ? 'bg-indigo-500 text-white border-indigo-500' : (darkMode ? 'border-white/10 text-slate-400 hover:border-indigo-500/50' : 'border-neutral-200 text-slate-500 hover:border-indigo-300')}`}
                  >
                    {STAGE_ICONS[s]}{s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Tags</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {COMMON_TAGS.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTag(t, 'tags')}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${form.tags.includes(t) ? 'bg-indigo-500 text-white border-indigo-500' : (darkMode ? 'border-white/10 text-slate-400 hover:border-indigo-500/40' : 'border-neutral-200 text-slate-500 hover:border-indigo-300')}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(); }}}
                  placeholder="Custom tag..."
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs border outline-none ${darkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500' : 'bg-neutral-50 border-neutral-200 text-slate-900 placeholder:text-slate-400'}`}
                />
                <button type="button" onClick={addCustomTag} className="px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 text-xs font-bold hover:bg-indigo-500/20 cursor-pointer">Add</button>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Looking For</label>
              <div className="flex flex-wrap gap-1.5">
                {LOOKING_FOR_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleTag(opt, 'lookingFor')}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${form.lookingFor.includes(opt) ? 'bg-emerald-500 text-white border-emerald-500' : (darkMode ? 'border-white/10 text-slate-400 hover:border-emerald-500/40' : 'border-neutral-200 text-slate-500 hover:border-emerald-300')}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={resetForm} className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${darkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-neutral-100'}`}>Cancel</button>
              <button type="submit" disabled={saving || !form.title.trim() || !form.description.trim()} className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5">
                <Rocket size={11} />
                {saving ? 'Posting...' : editingId ? 'Save Changes' : 'Post Project'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'mine', 'joined'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${filter === f ? 'bg-indigo-500 text-white' : (darkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-neutral-100')}`}
          >
            {f === 'all' ? 'All Projects' : f === 'mine' ? 'My Projects' : 'Joined'}
          </button>
        ))}
        <span className={`ml-auto text-[10px] font-mono ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}</span>
      </div>

      {/* ── PROJECT DETAIL PANEL ─────────────────────────────── */}
      {activeProjectId && (() => {
        const proj = projects.find(p => p.id === activeProjectId);
        if (!proj) { setActiveProjectId(null); return null; }
        const isMember = proj.memberIds.includes(currentUser.id);
        const isMine = proj.creatorId === currentUser.id;
        const memberUsers = proj.memberIds.map(id => allUsers.find(u => u.id === id)).filter(Boolean) as UserProfile[];
        return (
          <div className={`rounded-2xl border flex flex-col ${darkMode ? 'bg-[#0D0D12] border-white/10' : 'bg-white border-neutral-200'}`}>
            {/* Back + header */}
            <div className={`flex items-center gap-3 px-4 py-3 border-b ${darkMode ? 'border-white/10' : 'border-neutral-100'}`}>
              <button onClick={() => { setActiveProjectId(null); setChatMessages([]); }} className="text-slate-400 hover:text-slate-600 cursor-pointer transition-colors">
                <ChevronLeft size={16} />
              </button>
              <div className="flex-1 min-w-0">
                <h3 className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{proj.title}</h3>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${STAGE_COLORS[proj.stage]}`}>{proj.stage}</span>
                  <span className="text-[9px] text-slate-400 font-mono flex items-center gap-0.5"><Users size={8} />{proj.memberIds.length} members</span>
                </div>
              </div>
              {!isMine && (
                <button
                  onClick={() => { handleJoin(proj); }}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${isMember ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20' : 'bg-indigo-500 text-white hover:bg-indigo-600'}`}
                >
                  {isMember ? 'Leave' : 'Join Team'}
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className={`flex border-b px-4 ${darkMode ? 'border-white/10' : 'border-neutral-100'}`}>
              {[{ key: 'chat', label: '💬 Group Chat' }, { key: 'members', label: `👥 Members (${proj.memberIds.length})` }].map(t => (
                <button
                  key={t.key}
                  onClick={() => setProjectTab(t.key as any)}
                  className={`py-2.5 px-3 text-[10px] uppercase font-extrabold tracking-wider border-b-2 transition-all cursor-pointer ${projectTab === t.key ? 'border-violet-500 text-violet-500' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Chat tab */}
            {projectTab === 'chat' && (
              <div className="flex flex-col" style={{ height: '400px' }}>
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
                  {chatLoading && chatMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full"><p className="text-xs text-slate-400">Loading messages…</p></div>
                  ) : chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2">
                      <MessageSquare size={28} className="text-slate-300" />
                      <p className={`text-xs font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {isMember ? 'No messages yet — say hello!' : 'Join the project to start chatting'}
                      </p>
                    </div>
                  ) : (
                    chatMessages.map((msg, i) => {
                      const sender = allUsers.find(u => u.id === msg.senderId);
                      const isMe = msg.senderId === currentUser.id;
                      const showAvatar = i === 0 || chatMessages[i - 1].senderId !== msg.senderId;
                      return (
                        <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                          <div className="shrink-0 w-6 h-6 mt-0.5">
                            {showAvatar && (
                              <div className="w-6 h-6 rounded-full bg-indigo-500/10 flex items-center justify-center text-[9px] font-bold overflow-hidden border border-indigo-500/20">
                                <Avatar avatar={sender?.avatar || ''} />
                              </div>
                            )}
                          </div>
                          <div className={`max-w-[70%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                            {showAvatar && <span className={`text-[9px] font-bold text-slate-400 ${isMe ? 'text-right' : ''}`}>{isMe ? 'You' : sender?.fullName?.split(' ')[0] || 'Member'}</span>}
                            <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${isMe ? 'bg-violet-500 text-white rounded-tr-sm' : darkMode ? 'bg-white/8 text-slate-200 rounded-tl-sm' : 'bg-neutral-100 text-slate-800 rounded-tl-sm'}`}>{msg.content}</div>
                            <span className="text-[8px] text-slate-400 font-mono">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className={`px-3 py-3 border-t shrink-0 ${darkMode ? 'border-white/10' : 'border-neutral-100'}`}>
                  {isMember || isMine ? (
                    <div className="flex gap-2">
                      <input
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendProjectChat(); } }}
                        placeholder={`Message ${proj.title}…`}
                        className={`flex-1 px-3 py-2 text-xs rounded-xl border outline-none focus:ring-1 focus:ring-violet-500 ${darkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500' : 'bg-neutral-50 border-neutral-200 text-slate-800 placeholder:text-slate-400'}`}
                      />
                      <button onClick={sendProjectChat} disabled={!chatInput.trim() || chatSending} className="p-2 rounded-xl bg-violet-500 hover:bg-violet-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer">
                        <Send size={14} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => handleJoin(proj)} className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer">
                      Join {proj.title} to chat
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Members tab */}
            {projectTab === 'members' && (
              <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Team Members ({memberUsers.length})</p>
                {memberUsers.map(u => {
                  const isCreator = u.id === proj.creatorId;
                  return (
                    <div key={u.id} className={`flex items-center gap-3 p-2.5 rounded-xl ${darkMode ? 'bg-white/5' : 'bg-neutral-50'}`}>
                      <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-[10px] font-bold overflow-hidden border border-indigo-500/20">
                        <Avatar avatar={u.avatar} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold truncate ${darkMode ? 'text-white' : 'text-slate-800'}`}>{u.fullName}</p>
                        <p className="text-[9px] text-slate-400 truncate">{u.college}</p>
                      </div>
                      {isCreator && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center gap-1"><CheckCircle2 size={8} />Creator</span>}
                    </div>
                  );
                })}
                {proj.lookingFor.length > 0 && (
                  <div className={`mt-4 pt-3 border-t ${darkMode ? 'border-white/10' : 'border-neutral-100'}`}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Looking For</p>
                    <div className="flex flex-wrap gap-1.5">
                      {proj.lookingFor.map(r => <span key={r} className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">{r}</span>)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Projects Grid */}
      {!activeProjectId && loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`h-40 rounded-2xl animate-pulse ${darkMode ? 'bg-white/5' : 'bg-neutral-100'}`} />
          ))}
        </div>
      ) : !activeProjectId && filteredProjects.length === 0 ? (
        <div className={`rounded-2xl border p-12 text-center ${darkMode ? 'bg-[#121217] border-white/10' : 'bg-white border-neutral-200'}`}>
          <Rocket size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className={`font-bold text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>No projects yet</p>
          <p className="text-xs text-slate-400 mt-1">Be the first to post your startup idea or side project!</p>
          <button onClick={() => setShowCreate(true)} className="mt-4 px-4 py-2 rounded-xl bg-indigo-500 text-white text-xs font-bold cursor-pointer hover:bg-indigo-600 transition-all">
            Post a Project
          </button>
        </div>
      ) : !activeProjectId ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {filteredProjects.map(project => {
            const creator = getUserById(project.creatorId);
            const isMine = project.creatorId === currentUser.id;
            const isMember = project.memberIds.includes(currentUser.id);
            const memberUsers = project.memberIds.map(id => getUserById(id)).filter(Boolean) as UserProfile[];

            return (
              <div key={project.id} className={`rounded-2xl border p-5 flex flex-col gap-3 transition-all hover:shadow-md ${darkMode ? 'bg-[#121217] border-white/10 hover:border-white/20' : 'bg-white border-neutral-200 hover:border-indigo-200'}`}>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${STAGE_COLORS[project.stage]}`}>
                        {STAGE_ICONS[project.stage]}{project.stage}
                      </span>
                      {isMine && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/10 text-indigo-500">Mine</span>
                      )}
                    </div>
                    <h3 className={`font-bold text-sm leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{project.title}</h3>
                  </div>
                  {isMine && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => startEdit(project)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10 cursor-pointer transition-all">
                        <Pencil size={12} />
                      </button>
                      <button onClick={() => handleDelete(project.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-all">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Description */}
                <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`} style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {project.description}
                </p>

                {/* Tags */}
                {project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {project.tags.slice(0, 4).map(tag => (
                      <span key={tag} className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${darkMode ? 'bg-white/5 text-slate-400' : 'bg-neutral-100 text-slate-500'}`}>
                        {tag}
                      </span>
                    ))}
                    {project.tags.length > 4 && <span className="text-[9px] text-slate-400">+{project.tags.length - 4}</span>}
                  </div>
                )}

                {/* Looking For */}
                {project.lookingFor.length > 0 && (
                  <div className="flex flex-wrap gap-1 items-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Looking for:</span>
                    {project.lookingFor.map(r => (
                      <span key={r} className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">{r}</span>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-1 mt-auto border-t border-neutral-100 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    {/* Creator */}
                    <button
                      onClick={() => creator && onViewUserProfile?.(creator.id)}
                      className="flex items-center gap-1.5 cursor-pointer hover:opacity-70 transition-opacity"
                    >
                      <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-[8px] font-bold overflow-hidden">
                        <Avatar avatar={creator?.avatar || ''} />
                      </div>
                      <span className="text-[10px] text-slate-400">{creator?.fullName.split(' ')[0] || 'Unknown'}</span>
                    </button>
                    {/* Team avatars */}
                    {memberUsers.length > 1 && (
                      <div className="flex -space-x-1.5">
                        {memberUsers.slice(0, 4).map(u => (
                          <div key={u.id} className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 border border-white dark:border-[#121217] flex items-center justify-center text-[7px] font-bold overflow-hidden" title={u.fullName}>
                            <Avatar avatar={u.avatar} />
                          </div>
                        ))}
                        {project.memberIds.length > 4 && (
                          <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-white/10 border border-white dark:border-[#121217] flex items-center justify-center text-[7px] font-bold text-slate-400">
                            +{project.memberIds.length - 4}
                          </div>
                        )}
                      </div>
                    )}
                    <span className="text-[9px] font-mono text-slate-400 flex items-center gap-0.5">
                      <Users size={9} />{project.memberIds.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!isMine && (
                      <button
                        onClick={() => handleJoin(project)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${isMember ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20' : 'bg-indigo-500 text-white hover:bg-indigo-600'}`}
                      >
                        {isMember ? <><LogOut size={10} />Leave</> : <><UserPlus size={10} />Join Team</>}
                      </button>
                    )}
                    {isMine && isMember && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                        <CheckCircle2 size={10} />Creator
                      </span>
                    )}
                    <button
                      onClick={() => { setActiveProjectId(project.id); setProjectTab('chat'); setChatMessages([]); }}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${darkMode ? 'bg-violet-500/10 text-violet-400 hover:bg-violet-500/20' : 'bg-violet-50 text-violet-600 hover:bg-violet-100'}`}
                    >
                      <MessageSquare size={10} />Chat
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
