import React, { useState, useEffect } from 'react';
import { UserProfile, Community, CollegeAnnouncement } from '../types';
import { api } from '../api';
import Avatar from './Avatar';
import { getEducationDisplay } from '../utils/education';
import {
  ShieldCheck, Bell, Users, Plus, X, Pencil, Trash2, Pin, PinOff,
  BookOpen, Megaphone, CheckCircle2, AlertCircle, Building2, Crown,
  GraduationCap, Code, Rocket, Palette, Dumbbell, Music, FlaskConical,
  Heart, Gamepad2, TrendingUp, Camera, Globe
} from 'lucide-react';

interface CollegeAdminSectionProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  communities: Community[];
  darkMode: boolean;
  onCommunitiesChange: (c: Community[]) => void;
  onAllUsersChange: (users: UserProfile[]) => void;
}

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

const CLUB_CATEGORIES = [
  'Technical', 'Cultural', 'Sports', 'Arts', 'Startup',
  'Research', 'Social', 'Gaming', 'Music', 'Fitness',
];

type Tab = 'announcements' | 'clubs' | 'students';

export default function CollegeAdminSection({
  currentUser,
  allUsers,
  communities,
  darkMode,
  onCommunitiesChange,
  onAllUsersChange,
}: CollegeAdminSectionProps) {
  const college = currentUser.collegeAdminOf || currentUser.college;

  const [tab, setTab] = useState<Tab>('announcements');

  // Cover photo state
  const [coverImage, setCoverImageState] = useState<string | null>(null);
  const [coverSaving, setCoverSaving] = useState(false);
  const coverFileRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.collegeSettings.getAll().then(map => {
      setCoverImageState(map[college] ?? null);
    }).catch(() => {});
  }, [college]);

  const handleCoverUpload = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) { alert('Too large (max 8MB)'); return; }
    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      setCoverSaving(true);
      try {
        await api.collegeSettings.setCover(college, dataUrl);
        setCoverImageState(dataUrl);
      } catch {}
      setCoverSaving(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCover = async () => {
    setCoverSaving(true);
    try {
      await api.collegeSettings.setCover(college, null);
      setCoverImageState(null);
    } catch {}
    setCoverSaving(false);
  };

  const [announcements, setAnnouncements] = useState<CollegeAnnouncement[]>([]);
  const [loadingAnn, setLoadingAnn] = useState(true);

  const [showAnnForm, setShowAnnForm] = useState(false);
  const [editingAnn, setEditingAnn] = useState<CollegeAnnouncement | null>(null);
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annPinned, setAnnPinned] = useState(false);
  const [savingAnn, setSavingAnn] = useState(false);
  const [annSuccess, setAnnSuccess] = useState('');

  const [showClubForm, setShowClubForm] = useState(false);
  const [editingClub, setEditingClub] = useState<Community | null>(null);
  const [clubName, setClubName] = useState('');
  const [clubDesc, setClubDesc] = useState('');
  const [clubCat, setClubCat] = useState('Technical');
  const [clubTags, setClubTags] = useState('');
  const [savingClub, setSavingClub] = useState(false);

  const collegeStudents = allUsers.filter(u => u.college === college && !u.isSuspended);
  const collegeClubs = communities.filter(c => c.college === college);

  useEffect(() => {
    setLoadingAnn(true);
    api.collegeAdmin.getAnnouncements(college)
      .then(setAnnouncements)
      .catch(() => {})
      .finally(() => setLoadingAnn(false));
  }, [college]);

  const openAnnForm = (ann?: CollegeAnnouncement) => {
    if (ann) {
      setEditingAnn(ann);
      setAnnTitle(ann.title);
      setAnnBody(ann.body);
      setAnnPinned(ann.isPinned);
    } else {
      setEditingAnn(null);
      setAnnTitle('');
      setAnnBody('');
      setAnnPinned(false);
    }
    setShowAnnForm(true);
  };

  const saveAnnouncement = async () => {
    if (!annTitle.trim() || !annBody.trim()) return;
    setSavingAnn(true);
    try {
      if (editingAnn) {
        const updated = await api.collegeAdmin.updateAnnouncement(editingAnn.id, {
          title: annTitle, body: annBody, isPinned: annPinned,
        });
        setAnnouncements(prev => prev.map(a => a.id === editingAnn.id ? updated : a));
        setAnnSuccess('Announcement updated!');
      } else {
        const created = await api.collegeAdmin.createAnnouncement({
          college, authorId: currentUser.id, title: annTitle, body: annBody, isPinned: annPinned,
        });
        setAnnouncements(prev => [created, ...prev]);
        setAnnSuccess('Announcement posted!');
      }
      setShowAnnForm(false);
      setEditingAnn(null);
      setAnnTitle(''); setAnnBody(''); setAnnPinned(false);
      setTimeout(() => setAnnSuccess(''), 3000);
    } catch {}
    setSavingAnn(false);
  };

  const deleteAnnouncement = async (id: string) => {
    if (!confirm('Delete this announcement?')) return;
    await api.collegeAdmin.deleteAnnouncement(id);
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  };

  const togglePin = async (ann: CollegeAnnouncement) => {
    const updated = await api.collegeAdmin.updateAnnouncement(ann.id, { isPinned: !ann.isPinned });
    setAnnouncements(prev => prev.map(a => a.id === ann.id ? updated : a));
  };

  const openClubForm = (club?: Community) => {
    if (club) {
      setEditingClub(club);
      setClubName(club.name);
      setClubDesc(club.description);
      setClubCat(club.category);
      setClubTags((club.tags || []).join(', '));
    } else {
      setEditingClub(null);
      setClubName(''); setClubDesc(''); setClubCat('Technical'); setClubTags('');
    }
    setShowClubForm(true);
  };

  const saveClub = async () => {
    if (!clubName.trim() || !clubDesc.trim()) return;
    setSavingClub(true);
    const tags = clubTags.split(',').map(t => t.trim()).filter(Boolean);
    try {
      if (editingClub) {
        const updated = await api.communities.update(editingClub.id, {
          actorId: currentUser.id,
          name: clubName, description: clubDesc, category: clubCat, tags,
        });
        onCommunitiesChange(communities.map(c => c.id === editingClub.id ? { ...c, ...updated } : c));
      } else {
        const created = await api.communities.create({
          name: clubName, description: clubDesc, icon: 'Users',
          category: clubCat, tags, creatorId: currentUser.id, college,
        });
        onCommunitiesChange([...communities, created]);
      }
      setShowClubForm(false);
      setEditingClub(null);
    } catch {}
    setSavingClub(false);
  };

  const deleteClub = async (club: Community) => {
    if (!confirm(`Delete "${club.name}"?`)) return;
    await api.communities.delete(club.id, currentUser.id);
    onCommunitiesChange(communities.filter(c => c.id !== club.id));
  };

  const card = darkMode ? 'bg-[#121217] border-white/10' : 'bg-white border-neutral-200';
  const subcard = darkMode ? 'bg-white/5 border-white/10' : 'bg-neutral-50 border-neutral-200';

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'announcements', label: 'Announcements', icon: <Megaphone size={13} />, count: announcements.length },
    { id: 'clubs', label: 'Clubs', icon: <BookOpen size={13} />, count: collegeClubs.length },
    { id: 'students', label: 'Students', icon: <Users size={13} />, count: collegeStudents.length },
  ];

  return (
    <div className="space-y-5 pb-10">
      {/* College Banner / Cover Photo */}
      <div className={`rounded-2xl overflow-hidden border ${darkMode ? 'border-white/10' : 'border-neutral-200'}`}>
        {/* Banner area */}
        <div className="relative h-40 overflow-hidden">
          {coverImage ? (
            <img src={coverImage} alt={college} className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

          {/* College name overlay */}
          <div className="absolute bottom-3 left-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Crown size={11} className="text-amber-400" />
              <span className="text-amber-400 text-[10px] font-bold uppercase tracking-wider">College Admin</span>
            </div>
            <h2 className="text-white text-lg font-black leading-tight drop-shadow-md">{college}</h2>
          </div>

          {/* Hidden file input */}
          <input
            ref={coverFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); e.target.value = ''; }}
          />

          {/* Upload button */}
          <button
            type="button"
            onClick={() => coverFileRef.current?.click()}
            disabled={coverSaving}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/55 hover:bg-black/75 text-white text-[10px] font-semibold backdrop-blur-sm transition-all cursor-pointer border border-white/20 disabled:opacity-60"
          >
            <Camera size={11} />{coverSaving ? 'Saving…' : coverImage ? 'Change Photo' : 'Add Cover Photo'}
          </button>

          {/* Remove button */}
          {coverImage && !coverSaving && (
            <button
              type="button"
              onClick={handleRemoveCover}
              className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/50 hover:bg-rose-600/80 text-white text-[9px] font-semibold backdrop-blur-sm cursor-pointer border border-white/20"
            >
              <X size={10} />Remove
            </button>
          )}
        </div>

        {/* Sub-header info */}
        <div className={`px-4 py-3 flex items-center justify-between ${darkMode ? 'bg-[#121217]' : 'bg-white'}`}>
          <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Manage announcements, clubs, and students
          </p>
          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${darkMode ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
            Admin Panel
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`p-4 rounded-2xl border ${card} text-center`}>
          <p className="text-2xl font-black text-amber-500">{announcements.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mt-1">Announcements</p>
        </div>
        <div className={`p-4 rounded-2xl border ${card} text-center`}>
          <p className="text-2xl font-black text-indigo-500">{collegeClubs.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mt-1">Clubs</p>
        </div>
        <div className={`p-4 rounded-2xl border ${card} text-center`}>
          <p className="text-2xl font-black text-emerald-500">{collegeStudents.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mt-1">Students</p>
        </div>
      </div>

      {/* Tabs */}
      <div className={`rounded-2xl border overflow-hidden ${card}`}>
        <div className={`flex border-b ${darkMode ? 'bg-[#09090C] border-white/10' : 'bg-neutral-50 border-neutral-200'}`}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                tab === t.id
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {t.icon}
              {t.label}
              {t.count !== undefined && (
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                  tab === t.id ? 'bg-amber-500 text-white' : 'bg-neutral-200 dark:bg-white/10 text-slate-500'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ─── ANNOUNCEMENTS TAB ─── */}
        {tab === 'announcements' && (
          <div className="p-4 space-y-4">
            {annSuccess && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-semibold">
                <CheckCircle2 size={13} /> {annSuccess}
              </div>
            )}

            {!showAnnForm ? (
              <button
                onClick={() => openAnnForm()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all cursor-pointer"
              >
                <Plus size={13} /> Post Announcement
              </button>
            ) : (
              <div className={`p-4 rounded-xl border space-y-3 ${subcard}`}>
                <h3 className="text-xs font-bold uppercase tracking-wide text-amber-500">
                  {editingAnn ? 'Edit Announcement' : 'New Announcement'}
                </h3>
                <input
                  value={annTitle}
                  onChange={e => setAnnTitle(e.target.value)}
                  placeholder="Title (e.g. Important Notice: Fest Registration Open)"
                  className={`w-full text-sm px-3 py-2 rounded-lg border outline-none ${darkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500' : 'bg-white border-neutral-200 text-slate-900 placeholder:text-slate-400'}`}
                />
                <textarea
                  value={annBody}
                  onChange={e => setAnnBody(e.target.value)}
                  placeholder="Write your announcement here..."
                  rows={4}
                  className={`w-full text-sm px-3 py-2 rounded-lg border outline-none resize-none ${darkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500' : 'bg-white border-neutral-200 text-slate-900 placeholder:text-slate-400'}`}
                />
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={annPinned}
                    onChange={e => setAnnPinned(e.target.checked)}
                    className="rounded accent-amber-500 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                    <Pin size={11} /> Pin this announcement at the top
                  </span>
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={saveAnnouncement}
                    disabled={savingAnn || !annTitle.trim() || !annBody.trim()}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {savingAnn ? 'Saving…' : editingAnn ? 'Update' : 'Post'}
                  </button>
                  <button
                    onClick={() => { setShowAnnForm(false); setEditingAnn(null); }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${darkMode ? 'border-white/10 text-slate-400 hover:bg-white/5' : 'border-neutral-200 text-slate-500 hover:bg-neutral-100'}`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {loadingAnn ? (
              <div className="py-8 text-center text-slate-400 text-xs">Loading…</div>
            ) : announcements.length === 0 ? (
              <div className="py-10 text-center">
                <Megaphone size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-xs font-semibold text-slate-400">No announcements yet</p>
                <p className="text-[10px] text-slate-400 mt-1">Post an announcement to notify all students in your college</p>
              </div>
            ) : (
              <div className="space-y-3">
                {announcements
                  .slice()
                  .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
                  .map(ann => (
                    <div
                      key={ann.id}
                      className={`p-4 rounded-xl border transition-all ${darkMode ? 'bg-white/5 border-white/10' : 'bg-neutral-50 border-neutral-200'} ${ann.isPinned ? 'border-amber-500/30 bg-amber-500/[0.04]' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {ann.isPinned && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 text-[9px] font-bold">
                                <Pin size={9} /> PINNED
                              </span>
                            )}
                            <h4 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                              {ann.title}
                            </h4>
                          </div>
                          <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            {ann.body}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400 mt-2">
                            {new Date(ann.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => togglePin(ann)}
                            title={ann.isPinned ? 'Unpin' : 'Pin'}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${ann.isPinned ? 'text-amber-500 hover:bg-amber-500/10' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-500/10'}`}
                          >
                            {ann.isPinned ? <PinOff size={13} /> : <Pin size={13} />}
                          </button>
                          <button
                            onClick={() => openAnnForm(ann)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-all cursor-pointer"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => deleteAnnouncement(ann.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ─── CLUBS TAB ─── */}
        {tab === 'clubs' && (
          <div className="p-4 space-y-4">
            {!showClubForm ? (
              <button
                onClick={() => openClubForm()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold transition-all cursor-pointer"
              >
                <Plus size={13} /> Create Club
              </button>
            ) : (
              <div className={`p-4 rounded-xl border space-y-3 ${subcard}`}>
                <h3 className="text-xs font-bold uppercase tracking-wide text-indigo-500">
                  {editingClub ? 'Edit Club' : 'New Club'}
                </h3>
                <input
                  value={clubName}
                  onChange={e => setClubName(e.target.value)}
                  placeholder="Club name"
                  className={`w-full text-sm px-3 py-2 rounded-lg border outline-none ${darkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500' : 'bg-white border-neutral-200 text-slate-900 placeholder:text-slate-400'}`}
                />
                <textarea
                  value={clubDesc}
                  onChange={e => setClubDesc(e.target.value)}
                  placeholder="What is this club about?"
                  rows={3}
                  className={`w-full text-sm px-3 py-2 rounded-lg border outline-none resize-none ${darkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500' : 'bg-white border-neutral-200 text-slate-900 placeholder:text-slate-400'}`}
                />
                <div className="flex gap-2 flex-wrap">
                  {CLUB_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setClubCat(cat)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all border ${clubCat === cat ? 'bg-indigo-500 text-white border-transparent' : (darkMode ? 'border-white/10 text-slate-400 hover:bg-white/5' : 'border-neutral-200 text-slate-500 hover:bg-neutral-100')}`}
                    >
                      {CAT_ICONS[cat]} {cat}
                    </button>
                  ))}
                </div>
                <input
                  value={clubTags}
                  onChange={e => setClubTags(e.target.value)}
                  placeholder="Tags (comma-separated, e.g. DSA, Python)"
                  className={`w-full text-sm px-3 py-2 rounded-lg border outline-none ${darkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500' : 'bg-white border-neutral-200 text-slate-900 placeholder:text-slate-400'}`}
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveClub}
                    disabled={savingClub || !clubName.trim() || !clubDesc.trim()}
                    className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {savingClub ? 'Saving…' : editingClub ? 'Update' : 'Create'}
                  </button>
                  <button
                    onClick={() => { setShowClubForm(false); setEditingClub(null); }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${darkMode ? 'border-white/10 text-slate-400 hover:bg-white/5' : 'border-neutral-200 text-slate-500 hover:bg-neutral-100'}`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {collegeClubs.length === 0 ? (
              <div className="py-10 text-center">
                <BookOpen size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-xs font-semibold text-slate-400">No clubs yet</p>
                <p className="text-[10px] text-slate-400 mt-1">Create clubs for your college community</p>
              </div>
            ) : (
              <div className="space-y-3">
                {collegeClubs.map(club => (
                  <div key={club.id} className={`p-4 rounded-xl border ${subcard} flex items-start gap-3`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/10 text-indigo-500`}>
                          {CAT_ICONS[club.category]} {club.category}
                        </span>
                      </div>
                      <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{club.name}</p>
                      <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{club.description}</p>
                      <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                        <Users size={9} /> {club.memberIds.length} members
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => openClubForm(club)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-all cursor-pointer"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => deleteClub(club)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── STUDENTS TAB ─── */}
        {tab === 'students' && (
          <div className="p-4 space-y-3">
            {collegeStudents.length === 0 ? (
              <div className="py-10 text-center">
                <Users size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-xs font-semibold text-slate-400">No students registered yet</p>
              </div>
            ) : (
              collegeStudents.map(student => (
                <div key={student.id} className={`p-3 rounded-xl border flex items-center gap-3 ${subcard}`}>
                  <Avatar avatar={student.avatar} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {student.fullName}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {getEducationDisplay(student).compact}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {student.role === 'college_admin' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 text-[9px] font-bold">
                        <Crown size={9} /> Admin
                      </span>
                    )}
                    {student.isVerified && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[9px] font-bold">
                        <ShieldCheck size={9} /> Verified
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
