import React, { useState, useMemo, useEffect } from 'react';
import { Community, UserProfile, Connection, Post, CollegeAnnouncement } from '../types';
import { api } from '../api';
import { getCollegeImage } from '../data/collegeImages';
import { getCommunityImage } from '../data/communityImages';
import {
  GraduationCap, Users, Plus, X, Search, ChevronDown, ChevronUp,
  Star, Globe, Pencil, Trash2, UserPlus, LogOut, CheckCircle2, Building2,
  BookOpen, Code, Rocket, Palette, Music, Dumbbell, Cpu, Heart, Shield,
  FlaskConical, TrendingUp, Camera, Gamepad2, Award, Megaphone,
  ThumbsUp, MessageCircle, ChevronRight, Crown, ArrowRight, Pin
} from 'lucide-react';
import Avatar from './Avatar';

interface CollegesSectionProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  communities: Community[];
  connections: Connection[];
  posts: Post[];
  darkMode: boolean;
  onCommunitiesChange: (communities: Community[]) => void;
  onViewUserProfile?: (userId: string) => void;
}

const CLUB_CATEGORIES = [
  'Technical', 'Cultural', 'Sports', 'Arts', 'Startup',
  'Research', 'Social', 'Gaming', 'Music', 'Fitness',
];

const CAT_ICONS: Record<string, React.ReactNode> = {
  Technical: <Code size={12} />,
  Cultural: <Globe size={12} />,
  Sports: <Dumbbell size={12} />,
  Arts: <Palette size={12} />,
  Startup: <Rocket size={12} />,
  Research: <FlaskConical size={12} />,
  Social: <Heart size={12} />,
  Gaming: <Gamepad2 size={12} />,
  Music: <Music size={12} />,
  Fitness: <TrendingUp size={12} />,
};

const CAT_COLORS: Record<string, string> = {
  Technical: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  Cultural: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  Sports: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Arts: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  Startup: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  Research: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  Social: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  Gaming: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  Music: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Fitness: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
};

const COLLEGE_GRADIENTS = [
  'from-indigo-500 to-purple-600',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-500',
  'from-violet-500 to-indigo-600',
];

function collegeGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLLEGE_GRADIENTS[Math.abs(hash) % COLLEGE_GRADIENTS.length];
}

function collegeInitials(name: string) {
  return name.split(' ').filter(w => w.length > 2).map(w => w[0]).join('').toUpperCase().slice(0, 3) || name.slice(0, 3).toUpperCase();
}

interface ClubFormState {
  name: string;
  description: string;
  category: string;
  tags: string;
}

export default function CollegesSection({
  currentUser,
  allUsers,
  communities,
  connections,
  posts,
  darkMode,
  onCommunitiesChange,
  onViewUserProfile,
}: CollegesSectionProps) {
  const [search, setSearch] = useState('');
  const [expandedCollege, setExpandedCollege] = useState<string | null>(currentUser.college);
  const [showCreateClub, setShowCreateClub] = useState<string | null>(null);
  const [editingClub, setEditingClub] = useState<Community | null>(null);
  const [form, setForm] = useState<ClubFormState>({ name: '', description: '', category: 'Technical', tags: '' });
  const [saving, setSaving] = useState(false);
  const [catFilter, setCatFilter] = useState<string>('All');
  const [announcements, setAnnouncements] = useState<Record<string, CollegeAnnouncement[]>>({});
  const [loadingAnn, setLoadingAnn] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<Record<string, 'posts' | 'clubs'>>({});
  const [collegeCoverImages, setCollegeCoverImages] = useState<Record<string, string | null>>({});

  const allColleges = useMemo(() => {
    const cols = new Set<string>();
    allUsers.forEach(u => { if (u.college) cols.add(u.college); });
    return Array.from(cols).sort((a, b) => {
      if (a === currentUser.college) return -1;
      if (b === currentUser.college) return 1;
      return a.localeCompare(b);
    });
  }, [allUsers, currentUser.college]);

  const clubsByCollege = useMemo(() => {
    const map: Record<string, Community[]> = {};
    communities.forEach(c => {
      if (c.college) {
        if (!map[c.college]) map[c.college] = [];
        map[c.college].push(c);
      }
    });
    return map;
  }, [communities]);

  const studentsByCollege = useMemo(() => {
    const map: Record<string, UserProfile[]> = {};
    allUsers.forEach(u => {
      if (!map[u.college]) map[u.college] = [];
      map[u.college].push(u);
    });
    return map;
  }, [allUsers]);

  const postsByCollege = useMemo(() => {
    const map: Record<string, Post[]> = {};
    const allCollegeNames = Array.from(new Set(allUsers.map(u => u.college).filter(Boolean)));
    posts.forEach(p => {
      const author = allUsers.find(u => u.id === p.authorId);
      if (!author) return;
      // Admin posts are platform-wide — appear in every college's feed
      if (author.role === 'admin') {
        allCollegeNames.forEach(col => {
          if (!map[col]) map[col] = [];
          map[col].push(p);
        });
      } else if (author.college) {
        if (!map[author.college]) map[author.college] = [];
        map[author.college].push(p);
      }
    });
    Object.keys(map).forEach(k => {
      map[k] = map[k].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });
    return map;
  }, [posts, allUsers]);

  const filteredColleges = allColleges.filter(c =>
    search === '' || c.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    api.collegeSettings.getAll().then(setCollegeCoverImages).catch(() => {});
  }, []);

  const fetchAnnouncements = async (college: string) => {
    if (announcements[college] !== undefined || loadingAnn.has(college)) return;
    setLoadingAnn(prev => new Set(prev).add(college));
    try {
      const data = await api.collegeAdmin.getAnnouncements(college);
      setAnnouncements(prev => ({ ...prev, [college]: data }));
    } catch {
      setAnnouncements(prev => ({ ...prev, [college]: [] }));
    } finally {
      setLoadingAnn(prev => { const s = new Set(prev); s.delete(college); return s; });
    }
  };

  const handleExpandCollege = (college: string) => {
    const willExpand = expandedCollege !== college;
    setExpandedCollege(willExpand ? college : null);
    if (willExpand) fetchAnnouncements(college);
  };

  const resetForm = () => {
    setForm({ name: '', description: '', category: 'Technical', tags: '' });
    setShowCreateClub(null);
    setEditingClub(null);
  };

  const handleSubmit = async (e: React.FormEvent, college: string) => {
    e.preventDefault();
    if (!form.name.trim() || !form.description.trim()) return;
    setSaving(true);
    try {
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      if (editingClub) {
        const updated = await api.communities.update(editingClub.id, {
          actorId: currentUser.id,
          name: form.name, description: form.description, category: form.category, tags,
        });
        onCommunitiesChange(communities.map(c => c.id === editingClub.id ? { ...c, ...updated } : c));
      } else {
        const created = await api.communities.create({
          name: form.name, description: form.description, icon: 'Users',
          category: form.category, tags, creatorId: currentUser.id, college,
        });
        onCommunitiesChange([...communities, created]);
      }
      resetForm();
    } catch {}
    setSaving(false);
  };

  const handleJoin = async (club: Community) => {
    const isMember = club.memberIds.includes(currentUser.id);
    const newIds = isMember
      ? club.memberIds.filter(id => id !== currentUser.id)
      : [...club.memberIds, currentUser.id];
    try {
      const updated = await api.communities.update(club.id, { memberIds: newIds });
      onCommunitiesChange(communities.map(c => c.id === club.id ? { ...c, ...updated } : c));
    } catch {}
  };

  const handleDelete = async (club: Community) => {
    if (!confirm(`Delete "${club.name}"? This cannot be undone.`)) return;
    try {
      await api.communities.delete(club.id, currentUser.id);
      onCommunitiesChange(communities.filter(c => c.id !== club.id));
    } catch {}
  };

  const startEdit = (club: Community) => {
    setForm({ name: club.name, description: club.description, category: club.category, tags: (club.tags || []).join(', ') });
    setEditingClub(club);
    setShowCreateClub(club.college || null);
    setExpandedCollege(club.college || null);
  };

  const getTab = (college: string) => activeTab[college] || 'posts';
  const setTab = (college: string, tab: 'posts' | 'clubs') => {
    setActiveTab(prev => ({ ...prev, [college]: tab }));
  };

  const allCategories = ['All', ...CLUB_CATEGORIES];

  return (
    <div className="flex-1 min-w-0 space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className={`text-lg font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            <Building2 size={18} className="text-indigo-500" />
            Colleges Hub
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Explore colleges, announcements, clubs and student posts
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-neutral-200'}`}>
        <Search size={14} className="text-slate-400 shrink-0" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search colleges..."
          className={`flex-1 text-sm bg-transparent outline-none ${darkMode ? 'text-white placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'}`}
        />
        {search && <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={12} /></button>}
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {allCategories.map(cat => (
          <button
            key={cat}
            onClick={() => setCatFilter(cat)}
            className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${catFilter === cat ? 'bg-indigo-500 text-white' : (darkMode ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-neutral-100 text-slate-500 hover:bg-neutral-200')}`}
          >
            {cat !== 'All' && CAT_ICONS[cat]}
            {cat}
          </button>
        ))}
      </div>

      {/* College List */}
      <div className="space-y-4">
        {filteredColleges.length === 0 && (
          <div className={`rounded-2xl border p-10 text-center ${darkMode ? 'bg-[#121217] border-white/10' : 'bg-white border-neutral-200'}`}>
            <Building2 size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-400">No colleges found</p>
          </div>
        )}

        {filteredColleges.map((college) => {
          const isMyCollege = college === currentUser.college;
          const students = studentsByCollege[college] || [];
          const clubs = (clubsByCollege[college] || []).filter(club =>
            catFilter === 'All' || club.category === catFilter
          );
          const collegePosts = postsByCollege[college] || [];
          const isExpanded = expandedCollege === college;
          const myClubCount = clubs.filter(c => c.memberIds.includes(currentUser.id)).length;
          const grad = collegeGradient(college);
          const campusImg = collegeCoverImages[college] || getCollegeImage(college);
          const collegeAnn = announcements[college] || [];
          const collegeAdmin = allUsers.find(u => u.collegeAdminOf === college);
          const tab = getTab(college);

          return (
            <div
              key={college}
              className={`rounded-2xl border overflow-hidden transition-all ${darkMode ? 'bg-[#121217] border-white/10' : 'bg-white border-neutral-200'} ${isMyCollege ? 'ring-2 ring-indigo-500/30' : ''}`}
            >
              {/* College Header Card */}
              <button
                onClick={() => handleExpandCollege(college)}
                className="w-full text-left cursor-pointer"
              >
                <div className="h-20 relative overflow-hidden">
                  <img
                    src={campusImg}
                    alt={college}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const image = e.currentTarget as HTMLImageElement;
                      image.onerror = null;
                      image.src = getCommunityImage(college, 'College Community', college);
                    }}
                  />
                  <div className="absolute inset-0 bg-black/30 pointer-events-none" />
                  {isMyCollege && (
                    <span className="absolute top-2 right-3 px-2 py-0.5 rounded-full bg-white/20 text-white text-[9px] font-bold backdrop-blur-sm flex items-center gap-1">
                      <Star size={9} />MY COLLEGE
                    </span>
                  )}
                  {collegeAdmin && (
                    <span className="absolute bottom-2 left-3 px-2 py-0.5 rounded-full bg-black/30 text-amber-300 text-[8px] font-bold backdrop-blur-sm flex items-center gap-1">
                      <Crown size={8} /> Admin: {collegeAdmin.fullName.split(' ')[0]}
                    </span>
                  )}
                </div>
                <div className="px-5 pb-4">
                  <div className="flex items-end justify-between gap-3 -mt-7">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center text-white font-black text-sm border-4 ${darkMode ? 'border-[#121217]' : 'border-white'} shadow-lg`}>
                      {collegeInitials(college)}
                    </div>
                    <div className={`flex items-center gap-2 mb-1`}>
                      {collegeAnn.length > 0 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-bold">
                          <Megaphone size={9} />{collegeAnn.length}
                        </span>
                      )}
                      <span className={`text-[10px] font-mono ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2">
                    <h3 className={`font-bold text-sm leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{college}</h3>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className={`flex items-center gap-1 text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        <Users size={10} />{students.length} student{students.length !== 1 ? 's' : ''} on platform
                      </span>
                      <span className={`flex items-center gap-1 text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        <BookOpen size={10} />{clubsByCollege[college]?.length || 0} club{(clubsByCollege[college]?.length || 0) !== 1 ? 's' : ''}
                      </span>
                      {collegePosts.length > 0 && (
                        <span className={`flex items-center gap-1 text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          <MessageCircle size={10} />{collegePosts.length} post{collegePosts.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      {myClubCount > 0 && (
                        <span className="flex items-center gap-1 text-[10px] text-indigo-500 font-semibold">
                          <CheckCircle2 size={10} />Joined {myClubCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>

              {/* Expanded College Content */}
              {isExpanded && (
                <div className={`border-t ${darkMode ? 'border-white/10' : 'border-neutral-100'}`}>

                  {/* Pinned Announcements (always visible when expanded) */}
                  {loadingAnn.has(college) && (
                    <div className="px-5 py-3 text-[10px] text-slate-400 font-mono flex items-center gap-2">
                      <span className="animate-pulse">Loading announcements...</span>
                    </div>
                  )}
                  {!loadingAnn.has(college) && collegeAnn.length > 0 && (
                    <div className={`px-5 py-4 border-b ${darkMode ? 'border-white/10 bg-amber-500/[0.04]' : 'border-amber-100 bg-amber-50/50'}`}>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mb-3">
                        <Megaphone size={11} /> Announcements from {collegeAdmin?.fullName || 'College Admin'}
                      </p>
                      <div className="space-y-2">
                        {collegeAnn.map(ann => (
                          <div key={ann.id} className={`p-3 rounded-xl border ${darkMode ? 'bg-amber-500/5 border-amber-500/15' : 'bg-white border-amber-200'}`}>
                            <div className="flex items-start gap-2">
                              <Pin size={10} className="text-amber-500 shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <p className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{ann.title}</p>
                                <p className={`text-[10px] mt-0.5 leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{ann.body}</p>
                                <p className="text-[9px] text-slate-400 font-mono mt-1">{new Date(ann.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tab Nav */}
                  <div className={`flex border-b ${darkMode ? 'border-white/10 bg-[#0d0d10]' : 'border-neutral-100 bg-neutral-50'}`}>
                    {([
                      { id: 'posts', label: 'Posts', count: collegePosts.length, icon: <MessageCircle size={11} /> },
                      { id: 'clubs', label: 'Clubs', count: clubs.length, icon: <BookOpen size={11} /> },
                    ] as const).map(t => (
                      <button
                        key={t.id}
                        onClick={() => setTab(college, t.id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold transition-all cursor-pointer border-b-2 ${tab === t.id ? 'border-indigo-500 text-indigo-500' : `border-transparent ${darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-700'}`}`}
                      >
                        {t.icon}{t.label}
                        <span className={`px-1.5 py-0.5 rounded-full text-[8px] ${tab === t.id ? 'bg-indigo-500/15 text-indigo-500' : (darkMode ? 'bg-white/10 text-slate-500' : 'bg-neutral-200 text-slate-500')}`}>
                          {t.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="px-5 py-4 space-y-4">


                    {/* POSTS TAB */}
                    {tab === 'posts' && (
                      <div className="space-y-3">
                        {collegePosts.length === 0 ? (
                          <div className={`rounded-xl border border-dashed p-8 text-center ${darkMode ? 'border-white/10' : 'border-neutral-200'}`}>
                            <MessageCircle size={24} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                            <p className="text-[11px] text-slate-400">No posts from this college yet</p>
                          </div>
                        ) : (
                          collegePosts.slice(0, 10).map(post => {
                            const author = allUsers.find(u => u.id === post.authorId);
                            if (!author) return null;
                            return (
                              <div
                                key={post.id}
                                className={`rounded-xl border p-4 space-y-2.5 transition-all ${darkMode ? 'bg-white/3 border-white/10 hover:border-white/20' : 'bg-white border-neutral-100 hover:border-indigo-100 hover:shadow-sm'}`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <button
                                    onClick={() => onViewUserProfile?.(author.id)}
                                    className="flex items-center gap-2 hover:opacity-80 transition-all cursor-pointer"
                                  >
                                    <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-[9px] font-bold bg-indigo-100 dark:bg-indigo-900/30 shrink-0">
                                      <Avatar avatar={author.avatar} />
                                    </div>
                                    <div className="text-left">
                                      <p className={`text-[11px] font-bold leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>{author.fullName}</p>
                                      <p className="text-[9px] text-slate-400 mt-0.5 font-mono">{author.branch} • {new Date(post.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                                    </div>
                                  </button>
                                  {post.tags?.[0] && (
                                    <span className={`ml-auto px-2 py-0.5 rounded-full text-[8px] font-bold bg-indigo-500/10 text-indigo-500`}>
                                      {post.tags[0]}
                                    </span>
                                  )}
                                </div>
                                <p className={`text-[11px] leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-700'}`} style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                  {post.content}
                                </p>
                                <div className="flex items-center gap-3 pt-1 border-t border-neutral-100 dark:border-white/5">
                                  <span className={`flex items-center gap-1 text-[9px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    <ThumbsUp size={9} />{(post.likes || []).length}
                                  </span>
                                  <span className={`flex items-center gap-1 text-[9px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    <MessageCircle size={9} />{(post.comments || []).length}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* CLUBS TAB */}
                    {tab === 'clubs' && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <p className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            Clubs & Groups
                          </p>
                          {isMyCollege && (
                            <button
                              onClick={() => { setShowCreateClub(college); setEditingClub(null); setForm({ name: '', description: '', category: 'Technical', tags: '' }); }}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-500 text-white text-[9px] font-bold hover:bg-indigo-600 cursor-pointer transition-all"
                            >
                              <Plus size={9} />Create Club
                            </button>
                          )}
                        </div>

                        {/* Create / Edit Club Form */}
                        {(showCreateClub === college) && (
                          <div className={`rounded-xl border p-4 mb-4 ${darkMode ? 'bg-white/5 border-white/10' : 'bg-neutral-50 border-neutral-200'}`}>
                            <div className="flex items-center justify-between mb-3">
                              <span className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                {editingClub ? '✏️ Edit Club' : '➕ New Club'}
                              </span>
                              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={13} /></button>
                            </div>
                            <form onSubmit={e => handleSubmit(e, college)} className="space-y-3">
                              <input
                                value={form.name}
                                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                placeholder="Club name *"
                                required
                                className={`w-full px-3 py-2 rounded-lg text-xs border outline-none ${darkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500/50' : 'bg-white border-neutral-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-300'}`}
                              />
                              <textarea
                                value={form.description}
                                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                placeholder="What does this club do? *"
                                required
                                rows={2}
                                className={`w-full px-3 py-2 rounded-lg text-xs border outline-none resize-none ${darkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500/50' : 'bg-white border-neutral-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-300'}`}
                              />
                              <div className="flex gap-2">
                                <select
                                  value={form.category}
                                  onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                                  className={`flex-1 px-3 py-2 rounded-lg text-xs border outline-none ${darkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-neutral-200 text-slate-900'}`}
                                >
                                  {CLUB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <input
                                  value={form.tags}
                                  onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
                                  placeholder="Tags (comma separated)"
                                  className={`flex-1 px-3 py-2 rounded-lg text-xs border outline-none ${darkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500' : 'bg-white border-neutral-200 text-slate-900 placeholder:text-slate-400'}`}
                                />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <button type="button" onClick={resetForm} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer ${darkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-neutral-100'}`}>Cancel</button>
                                <button type="submit" disabled={saving} className="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-[11px] font-bold cursor-pointer disabled:opacity-50">
                                  {saving ? 'Saving...' : editingClub ? 'Save' : 'Create Club'}
                                </button>
                              </div>
                            </form>
                          </div>
                        )}

                        {clubs.length === 0 ? (
                          <div className={`rounded-xl border border-dashed p-6 text-center ${darkMode ? 'border-white/10' : 'border-neutral-200'}`}>
                            <Users size={24} className="mx-auto text-slate-300 dark:text-slate-600 mb-1.5" />
                            <p className="text-[11px] text-slate-400">
                              {catFilter === 'All' ? 'No clubs yet' : `No ${catFilter} clubs yet`}
                              {isMyCollege && ' — be the first to create one!'}
                            </p>
                          </div>
                        ) : (
                          <div className="grid sm:grid-cols-2 gap-3">
                            {clubs.map(club => {
                              const isMember = club.memberIds.includes(currentUser.id);
                              const isCreator = club.creatorId === currentUser.id;
                              const creator = allUsers.find(u => u.id === club.creatorId);

                              return (
                                <div
                                  key={club.id}
                                  className={`rounded-xl border p-4 flex flex-col gap-2.5 transition-all ${darkMode ? 'bg-white/3 border-white/10 hover:border-white/20' : 'bg-white border-neutral-100 hover:border-indigo-200'} ${isMember ? (darkMode ? 'border-indigo-500/20' : 'border-indigo-200') : ''}`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5 mb-0.5">
                                        <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold ${CAT_COLORS[club.category] || 'bg-slate-500/10 text-slate-500'}`}>
                                          {CAT_ICONS[club.category]}{club.category}
                                        </span>
                                        {isMember && <span className="text-[8px] font-bold text-indigo-500">• Joined</span>}
                                      </div>
                                      <h4 className={`font-bold text-xs leading-snug ${darkMode ? 'text-white' : 'text-slate-900'}`}>{club.name}</h4>
                                    </div>
                                    {isCreator && (
                                      <div className="flex gap-1 shrink-0">
                                        <button onClick={() => startEdit(club)} className="p-1 rounded text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10 cursor-pointer transition-all">
                                          <Pencil size={10} />
                                        </button>
                                        <button onClick={() => handleDelete(club)} className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-all">
                                          <Trash2 size={10} />
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  <p className={`text-[10px] leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {club.description}
                                  </p>

                                  {club.tags && club.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {club.tags.slice(0, 3).map(tag => (
                                        <span key={tag} className={`px-1.5 py-0.5 rounded text-[8px] font-medium ${darkMode ? 'bg-white/5 text-slate-400' : 'bg-neutral-100 text-slate-500'}`}>
                                          #{tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between mt-auto pt-1 border-t border-neutral-100 dark:border-white/5">
                                    <div className="flex items-center gap-1.5">
                                      <div className="flex -space-x-1">
                                        {club.memberIds.slice(0, 4).map(uid => {
                                          const u = allUsers.find(x => x.id === uid);
                                          return u ? (
                                            <div key={uid} className="w-4 h-4 rounded-full border border-white dark:border-[#121217] bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-[6px] font-bold overflow-hidden" title={u.fullName}>
                                              <Avatar avatar={u.avatar} />
                                            </div>
                                          ) : null;
                                        })}
                                      </div>
                                      <span className={`text-[9px] font-mono ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                        {club.memberIds.length} member{club.memberIds.length !== 1 ? 's' : ''}
                                      </span>
                                    </div>

                                    {isCreator ? (
                                      <span className="flex items-center gap-1 text-[9px] font-bold text-indigo-500">
                                        <Award size={9} />You manage this
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => handleJoin(club)}
                                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${isMember ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20' : 'bg-indigo-500 text-white hover:bg-indigo-600'}`}
                                      >
                                        {isMember ? <><LogOut size={8} />Leave</> : <><UserPlus size={8} />Join</>}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
