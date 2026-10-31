import React, { useState, useRef } from 'react';
import {
  X, Send, Image as ImageIcon, FileText, Calendar, Rocket,
  Users, MessageSquare, Video, Plus, Trash2, Globe, MapPin,
  Cpu, Hash, Zap, ChevronDown, Star, BarChart2, HelpCircle, Search
} from 'lucide-react';
import { api } from '../api';
import Avatar from './Avatar';

interface UserProfile {
  id: string; fullName: string; college: string; branch: string; year: number;
  email: string; avatar: string; aboutMe: string; interests: string[];
  skills: string[]; lookingFor: string[]; isVerified: boolean; isSuspended: boolean;
  role: string; collegeAdminOf?: string | null; privacySettings: any; createdAt: string;
}

interface Community { id: string; name: string; }

interface Props {
  onClose: () => void;
  currentUser: UserProfile;
  communities: Community[];
  darkMode: boolean;
  onPostCreated: (post: any) => void;
  onEventCreated: (event: any) => void;
  onProjectCreated: (project: any) => void;
  onCommunityCreated: (community: any) => void;
  onGroupCreated: (group: any) => void;
  onStoryCreated: (story: any) => void;
}

type Tab = 'post' | 'event' | 'project' | 'community' | 'group' | 'reel' | 'club' | 'poll' | 'question';

const TABS: { id: Tab; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'post',      label: 'Post',      icon: <FileText size={14} />,      color: 'indigo' },
  { id: 'question',  label: 'Question',  icon: <HelpCircle size={14} />,    color: 'blue' },
  { id: 'event',     label: 'Event',     icon: <Calendar size={14} />,      color: 'rose' },
  { id: 'project',   label: 'Project',   icon: <Rocket size={14} />,        color: 'amber' },
  { id: 'community', label: 'Community', icon: <Users size={14} />,         color: 'emerald' },
  { id: 'club',      label: 'Club',      icon: <Star size={14} />,          color: 'violet' },
  { id: 'group',     label: 'Group',     icon: <MessageSquare size={14} />, color: 'sky' },
  { id: 'reel',      label: 'Reel',      icon: <Video size={14} />,         color: 'pink' },
  { id: 'poll',      label: 'Poll',      icon: <BarChart2 size={14} />,     color: 'teal' },
];

// Academic-first tag set — general campus life and learning, with startup as one option among many.
const ACADEMIC_TAGS = [
  'Question ❓','Study Partner Wanted 📚','Notes & Resources 📖','Exam Prep 📝',
  'Research Collaborator 🔬','Academic Discussion 🎓','Assignment Help 🧩',
  'Hackathon Squad 💻','Idea Drop 💡','Startup Pitch 🚀','Co-Founder Search 🤝',
  'Career & Internships 💼','Campus Life 🏫','General 💬'
];
const FEELING_PRESETS = [
  { emoji: '🚀', label: 'Building' }, { emoji: '💡', label: 'Ideating' },
  { emoji: '🔥', label: 'Hustling' }, { emoji: '🧠', label: 'Deep Work' },
  { emoji: '🤝', label: 'Networking' }, { emoji: '🎯', label: 'Focused' },
];
const EVENT_CATS = ['Hackathon', 'Study Group', 'Seminar', 'Workshop', 'Social', 'Sports', 'Cultural', 'General'];
const PROJECT_STAGES = ['Idea', 'Prototype', 'MVP', 'Scaling', 'Completed'];
const COMMUNITY_CATS = ['Academic', 'Tech', 'Social', 'Sports', 'Cultural', 'Startup', 'Research', 'General'];
const COMMUNITY_ICONS = ['📚','💻','🚀','🎨','⚽','🎸','🔬','🌍','💼','🎭','🏆','🤝'];
const LOOKING_FOR_OPTIONS = ['Friends', 'Study Partner', 'Startup Co-Founder', 'Project Partner', 'Hackathon Team', 'Mentor', 'Mentee'];
const GROUP_TYPES = [
  { value: 'fun', label: 'Fun & Social', icon: '🎉' },
  { value: 'study', label: 'Study Group', icon: '📚' },
  { value: 'project', label: 'Project Team', icon: '🚀' },
  { value: 'branch', label: 'Branch Circle', icon: '🔧' },
  { value: 'batch', label: 'Batch Group', icon: '🎓' },
];
const CLUB_TYPES = [
  { value: 'technical', label: 'Technical', icon: '⚙️' },
  { value: 'cultural', label: 'Cultural', icon: '🎭' },
  { value: 'sports', label: 'Sports', icon: '⚽' },
  { value: 'entrepreneurship', label: 'Entrepreneurship', icon: '🚀' },
  { value: 'research', label: 'Research', icon: '🔬' },
  { value: 'social', label: 'Social Service', icon: '🤝' },
  { value: 'arts', label: 'Arts & Media', icon: '🎨' },
  { value: 'general', label: 'General', icon: '🏛️' },
];
const CLUB_ICONS = ['🏛️','⚙️','🎭','⚽','🚀','🔬','🤝','🎨','🏆','🎵','📸','🌱'];

function inputCls(dark: boolean) {
  return `w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${
    dark ? 'bg-[#0a0a0e] border-white/10 text-slate-100 placeholder-slate-600' : 'bg-neutral-50 border-neutral-200 text-slate-900 placeholder-slate-400'
  }`;
}
function labelCls() { return 'block text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1'; }
function selectCls(dark: boolean) {
  return `w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all appearance-none ${
    dark ? 'bg-[#0a0a0e] border-white/10 text-slate-100' : 'bg-neutral-50 border-neutral-200 text-slate-900'
  }`;
}

const MAX_POST_WORDS = 5000;

function countWords(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function limitToWords(value: string, maxWords = MAX_POST_WORDS) {
  const words = value.match(/\S+/g);
  return words && words.length > maxWords ? words.slice(0, maxWords).join(' ') : value;
}

function SearchableCommunityPicker({
  communities,
  value,
  onChange,
  darkMode,
  label,
}: {
  communities: Community[];
  value: string;
  onChange: (value: string) => void;
  darkMode: boolean;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selectedCommunity = communities.find(community => community.id === value);
  const filteredCommunities = communities.filter(community =>
    community.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div>
      <label className={labelCls()}>{label}</label>
      <div className="relative">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen(current => !current)}
          className={`${selectCls(darkMode)} text-left pr-9`}
        >
          <span className="block truncate">{selectedCommunity?.name || 'No community'}</span>
        </button>
        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
        {open && (
          <div className={`absolute left-0 right-0 top-[calc(100%+0.35rem)] z-30 rounded-xl border p-2 shadow-xl ${
            darkMode ? 'bg-[#111116] border-white/10' : 'bg-white border-neutral-200'
          }`}>
            <div className="relative mb-2">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                type="search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search communities..."
                aria-label="Search communities"
                className={`${inputCls(darkMode)} pl-8`}
              />
            </div>
            <div role="listbox" aria-label={label} className="max-h-56 overflow-y-auto">
              <button
                type="button"
                role="option"
                aria-selected={!value}
                onClick={() => { onChange(''); setQuery(''); setOpen(false); }}
                className={`w-full rounded-lg px-2.5 py-2 text-left text-xs ${
                  !value
                    ? 'bg-indigo-500/10 text-indigo-500 font-bold'
                    : darkMode ? 'text-slate-300 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                No community
              </button>
              {filteredCommunities.map(community => (
                <button
                  key={community.id}
                  type="button"
                  role="option"
                  aria-selected={community.id === value}
                  onClick={() => { onChange(community.id); setQuery(''); setOpen(false); }}
                  className={`w-full rounded-lg px-2.5 py-2 text-left text-xs ${
                    community.id === value
                      ? 'bg-indigo-500/10 text-indigo-500 font-bold'
                      : darkMode ? 'text-slate-300 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="block truncate">{community.name}</span>
                </button>
              ))}
              {filteredCommunities.length === 0 && (
                <p className="px-2.5 py-2 text-xs text-slate-400">No communities found.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CreateModal({ onClose, currentUser, communities, darkMode, onPostCreated, onEventCreated, onProjectCreated, onCommunityCreated, onGroupCreated, onStoryCreated }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('post');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  const fileRef = useRef<HTMLInputElement>(null);
  const reelFileRef = useRef<HTMLInputElement>(null);

  const [postContent, setPostContent] = useState('');
  const [postFeeling, setPostFeeling] = useState('');
  const [postCommunity, setPostCommunity] = useState('');
  const [postProjectTitle, setPostProjectTitle] = useState('');
  const [postImage, setPostImage] = useState('');
  const [postWebsiteUrl, setPostWebsiteUrl] = useState('');
  const [postAttachmentName, setPostAttachmentName] = useState('');
  const [postAttachmentData, setPostAttachmentData] = useState('');
  const [postAttachmentMimeType, setPostAttachmentMimeType] = useState('');

  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventCat, setEventCat] = useState('General');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventVenue, setEventVenue] = useState('');
  const [eventOnline, setEventOnline] = useState(false);
  const [eventLink, setEventLink] = useState('');
  const [eventSeats, setEventSeats] = useState('');

  const [projTitle, setProjTitle] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projStage, setProjStage] = useState('Idea');
  const [projTags, setProjTags] = useState('');
  const [projLookingFor, setProjLookingFor] = useState<string[]>([]);

  const [commName, setCommName] = useState('');
  const [commDesc, setCommDesc] = useState('');
  const [commIcon, setCommIcon] = useState('📚');
  const [commCat, setCommCat] = useState('General');
  const [commTags, setCommTags] = useState('');

  const [groupName, setGroupName] = useState('');
  const [groupType, setGroupType] = useState('fun');

  const [reelContent, setReelContent] = useState('');
  const [reelImage, setReelImage] = useState('');
  const [reelMediaType, setReelMediaType] = useState<'image' | 'video'>('image');
  const reelVideoRef = useRef<HTMLInputElement>(null);

  const [clubName, setClubName] = useState('');
  const [clubDesc, setClubDesc] = useState('');
  const [clubType, setClubType] = useState('general');
  const [clubIcon, setClubIcon] = useState('🏛️');
  const [clubTags, setClubTags] = useState('');
  const [clubOpen, setClubOpen] = useState(true);

  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollTag, setPollTag] = useState(ACADEMIC_TAGS[0]);

  const [questionContent, setQuestionContent] = useState('');
  const [questionTag, setQuestionTag] = useState('Question ❓');
  const [questionCommunity, setQuestionCommunity] = useState('');

  const dm = darkMode;

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => { setSuccess(''); onClose(); }, 1500);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      window.alert('Images must be 8 MB or smaller.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setter(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      window.alert('Files must be 10 MB or smaller.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setPostAttachmentName(file.name);
      setPostAttachmentMimeType(file.type || 'application/octet-stream');
      setPostAttachmentData(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim()) return;
    setSaving(true);
    try {
      const created = await api.posts.create({
        authorId: currentUser.id, content: postContent.trim(),
        academicTag: 'General 💬', communityId: postCommunity || null,
        projectTitle: postProjectTitle || null, postImage: postImage || null,
        feeling: postFeeling || null,
        websiteUrl: postWebsiteUrl.trim() || null,
        tags: [],
        attachmentName: postAttachmentName || null,
        attachmentData: postAttachmentData || null,
        attachmentMimeType: postAttachmentMimeType || null,
      });
      onPostCreated(created);
      showSuccess('Post shared! 🎉');
    } catch { setSaving(false); }
  };

  const handleQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionContent.trim()) return;
    setSaving(true);
    try {
      const created = await api.posts.create({
        authorId: currentUser.id, content: questionContent.trim(),
        academicTag: questionTag, communityId: questionCommunity || null,
      });
      onPostCreated(created);
      showSuccess('Question posted! ❓');
    } catch { setSaving(false); }
  };

  const handleEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim() || !eventDate.trim()) return;
    setSaving(true);
    try {
      const created = await api.events.create({
        title: eventTitle.trim(), description: eventDesc.trim(), category: eventCat,
        date: eventDate.trim(), time: eventTime.trim(), venue: eventVenue.trim(),
        organizer: currentUser.fullName, organizerId: currentUser.id,
        college: currentUser.college, maxSeats: eventSeats ? parseInt(eventSeats) : null,
        isOnline: eventOnline, link: eventLink.trim(),
      });
      onEventCreated(created);
      showSuccess('Event created! 📅');
    } catch { setSaving(false); }
  };

  const handleProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projTitle.trim()) return;
    setSaving(true);
    try {
      const created = await api.projects.create({
        title: projTitle.trim(), description: projDesc.trim(), stage: projStage,
        tags: projTags.split(',').map(t => t.trim()).filter(Boolean),
        lookingFor: projLookingFor, memberIds: [currentUser.id],
        creatorId: currentUser.id,
      });
      onProjectCreated(created);
      showSuccess('Project launched! 🚀');
    } catch { setSaving(false); }
  };

  const handleCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commName.trim()) return;
    setSaving(true);
    try {
      const created = await api.communities.create({
        name: commName.trim(), description: commDesc.trim(), icon: commIcon,
        category: commCat, tags: commTags.split(',').map(t => t.trim()).filter(Boolean),
        creatorId: currentUser.id,
      });
      onCommunityCreated(created);
      showSuccess('Community created! 👥');
    } catch { setSaving(false); }
  };

  const handleGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    setSaving(true);
    try {
      const created = await api.groupChats.create({
        name: groupName.trim(), type: groupType,
        creatorId: currentUser.id, college: currentUser.college,
        branch: currentUser.branch, memberIds: [currentUser.id],
      });
      onGroupCreated(created);
      showSuccess('Group created! 💬');
    } catch { setSaving(false); }
  };

  const handleReel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reelContent.trim() && !reelImage) return;
    setSaving(true);
    try {
      const created = await api.stories.create(currentUser.id, reelContent.trim(), reelImage || undefined);
      onStoryCreated(created);
      showSuccess('Reel posted! 🎬');
    } catch { setSaving(false); }
  };

  const handlePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    const question = pollQuestion.trim();
    const opts = pollOptions.map(o => o.trim()).filter(Boolean);
    if (!question || opts.length < 2) return;
    setSaving(true);
    try {
      const created = await api.posts.create({
        authorId: currentUser.id,
        content: question,
        academicTag: pollTag,
        pollOptions: opts,
      });
      onPostCreated(created);
      showSuccess('Poll launched! 📊');
    } catch { setSaving(false); }
  };

  const handleClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubName.trim()) return;
    setSaving(true);
    try {
      const created = await api.communities.create({
        name: clubName.trim(),
        description: clubDesc.trim(),
        icon: clubIcon,
        category: 'Club',
        tags: [clubType, ...(clubTags.split(',').map(t => t.trim()).filter(Boolean)), clubOpen ? 'Open' : 'Invite Only'],
        creatorId: currentUser.id,
      });
      onCommunityCreated(created);
      showSuccess('Club created! 🏛️');
    } catch { setSaving(false); }
  };

  const tabColor: Record<Tab, string> = {
    post: 'from-indigo-500 to-violet-600',
    question: 'from-blue-500 to-cyan-600',
    event: 'from-rose-500 to-pink-600',
    project: 'from-amber-500 to-orange-500',
    community: 'from-emerald-500 to-teal-600',
    club: 'from-violet-500 to-purple-600',
    group: 'from-sky-500 to-cyan-600',
    reel: 'from-pink-500 to-fuchsia-600',
    poll: 'from-teal-500 to-emerald-600',
  };

  const activeGrad = tabColor[activeTab];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`relative w-full max-w-xl rounded-3xl shadow-2xl border overflow-hidden flex flex-col max-h-[92vh] ${dm ? 'bg-[#0E0E12] border-white/10 text-slate-100' : 'bg-white border-neutral-200 text-slate-900'}`}>

        {/* Header */}
        <div className={`bg-gradient-to-r ${activeGrad} p-4 shrink-0`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-white/30 flex items-center justify-center text-xs font-bold bg-white/20">
                <Avatar avatar={currentUser.avatar} />
              </div>
              <div>
                <p className="text-white font-bold text-xs leading-none">{currentUser.fullName}</p>
                <p className="text-white/60 text-[9px] font-mono mt-0.5">{currentUser.college}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer border-0">
              <X size={14} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto no-scrollbar pb-0.5">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer border-0 ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Success overlay */}
        {success && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-3xl">
            <div className={`text-center p-6 rounded-2xl ${dm ? 'bg-[#121217]' : 'bg-white'} shadow-xl border ${dm ? 'border-white/10' : 'border-neutral-200'}`}>
              <div className="text-4xl mb-2">✅</div>
              <p className="font-bold text-sm">{success}</p>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">

          {/* ── POST ── */}
          {activeTab === 'post' && (
            <form id="form-create" onSubmit={handlePost} className="space-y-3">
              <div>
                <label className={labelCls()}>What's on your mind?</label>
                <div className="relative">
                  <textarea required rows={4} value={postContent} onChange={e => setPostContent(limitToWords(e.target.value))}
                  placeholder="Share a study tip, find a study partner, pitch a startup idea, talk campus life..."
                  className={`${inputCls(dm)} resize-none pb-7`} />
                  <span className="absolute bottom-2 right-3 text-[10px] text-slate-400">{countWords(postContent)}/{MAX_POST_WORDS} words</span>
                </div>
              </div>
              <div>
                <SearchableCommunityPicker
                  communities={communities}
                  value={postCommunity}
                  onChange={setPostCommunity}
                  darkMode={dm}
                  label="Community (optional)"
                />
              </div>
              <div>
                <label className={labelCls()}>Project title (optional)</label>
                <input value={postProjectTitle} onChange={e => setPostProjectTitle(e.target.value)} placeholder="e.g. CampusAI" className={inputCls(dm)} />
              </div>
              <div>
                <label className={labelCls()}>Website link (optional)</label>
                <input type="url" value={postWebsiteUrl} onChange={e => setPostWebsiteUrl(e.target.value)} placeholder="https://your-project.com" className={inputCls(dm)} />
              </div>
              <div>
                <label className={labelCls()}>Feeling</label>
                <div className="flex flex-wrap gap-1.5">
                  {FEELING_PRESETS.map(f => {
                    const val = `${f.emoji} ${f.label}`;
                    const sel = postFeeling === val;
                    return (
                      <button key={f.label} type="button" onClick={() => setPostFeeling(sel ? '' : val)}
                        className={`px-2.5 py-1 rounded-xl text-[10.5px] border cursor-pointer transition-all ${sel ? `bg-gradient-to-r ${activeGrad} border-transparent text-white font-bold` : dm ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-50 border-neutral-200 text-slate-700'}`}>
                        {f.emoji} {f.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className={labelCls()}>Image (optional)</label>
                {postImage ? (
                  <div className="relative rounded-xl overflow-hidden h-28">
                    <img src={postImage} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setPostImage('')} className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white cursor-pointer border-0"><X size={12} /></button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className={`w-full py-3 rounded-xl border-2 border-dashed text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${dm ? 'border-white/10 text-slate-500 hover:border-white/20' : 'border-neutral-200 text-slate-400 hover:border-neutral-300'}`}>
                    <ImageIcon size={14} /> Upload image
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, setPostImage)} />
              </div>
              <div>
                <label className={labelCls()}>PDF or file attachment (optional)</label>
                {postAttachmentName ? (
                  <div className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${dm ? 'border-white/10 bg-white/5 text-slate-200' : 'border-neutral-200 bg-neutral-50 text-slate-700'}`}>
                    <span className="flex min-w-0 items-center gap-2 truncate"><FileText size={14} className="shrink-0 text-rose-500" />{postAttachmentName}</span>
                    <button type="button" onClick={() => { setPostAttachmentName(''); setPostAttachmentData(''); setPostAttachmentMimeType(''); }} className="shrink-0 text-[10px] font-bold text-rose-500 hover:underline">Remove</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => document.getElementById('post-attachment-file')?.click()}
                    className={`w-full rounded-xl border-2 border-dashed py-3 text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${dm ? 'border-white/10 text-slate-500 hover:border-white/20' : 'border-neutral-200 text-slate-400 hover:border-neutral-300'}`}>
                    <FileText size={14} /> Attach PDF or file
                  </button>
                )}
                <input id="post-attachment-file" type="file" accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" className="hidden" onChange={handleAttachmentUpload} />
              </div>
            </form>
          )}

          {/* ── QUESTION ── */}
          {activeTab === 'question' && (
            <form id="form-create" onSubmit={handleQuestion} className="space-y-3">
              <div className={`p-3 rounded-xl border text-[10px] font-mono ${dm ? 'border-blue-500/20 bg-blue-500/5 text-blue-400' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
                ❓ Ask your college anything — academics, exams, career, or campus life. Others can answer and discuss.
              </div>
              <div>
                <label className={labelCls()}>Your question *</label>
                <div className="relative">
                  <textarea required rows={4} value={questionContent} onChange={e => setQuestionContent(limitToWords(e.target.value))}
                  placeholder="e.g. How do I prepare for placements? Any tips for the Data Structures midterm?"
                  className={`${inputCls(dm)} resize-none pb-7`} />
                  <span className="absolute bottom-2 right-3 text-[10px] text-slate-400">{countWords(questionContent)}/{MAX_POST_WORDS} words</span>
                </div>
              </div>
              <div>
                <label className={labelCls()}>Tag</label>
                <div className="relative">
                  <select value={questionTag} onChange={e => setQuestionTag(e.target.value)} className={selectCls(dm)}>
                    {ACADEMIC_TAGS.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                </div>
              </div>
              <div>
                <SearchableCommunityPicker
                  communities={communities}
                  value={questionCommunity}
                  onChange={setQuestionCommunity}
                  darkMode={dm}
                  label="Community (optional)"
                />
              </div>
            </form>
          )}

          {/* ── EVENT ── */}
          {activeTab === 'event' && (
            <form id="form-create" onSubmit={handleEvent} className="space-y-3">
              <div>
                <label className={labelCls()}>Event title *</label>
                <input required value={eventTitle} onChange={e => setEventTitle(e.target.value)} placeholder="e.g. NIT Trichy Hackathon 2026" className={inputCls(dm)} />
              </div>
              <div>
                <label className={labelCls()}>Description</label>
                <textarea rows={3} value={eventDesc} onChange={e => setEventDesc(e.target.value)} placeholder="What's this event about?" className={`${inputCls(dm)} resize-none`} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls()}>Category</label>
                  <div className="relative">
                    <select value={eventCat} onChange={e => setEventCat(e.target.value)} className={selectCls(dm)}>
                      {EVENT_CATS.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                  </div>
                </div>
                <div>
                  <label className={labelCls()}>Max seats</label>
                  <input type="number" value={eventSeats} onChange={e => setEventSeats(e.target.value)} placeholder="Unlimited" className={inputCls(dm)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls()}>Date *</label>
                  <input required type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className={inputCls(dm)} />
                </div>
                <div>
                  <label className={labelCls()}>Time</label>
                  <input type="time" value={eventTime} onChange={e => setEventTime(e.target.value)} className={inputCls(dm)} />
                </div>
              </div>
              <div>
                <label className={labelCls()}>Mode</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEventOnline(false)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border cursor-pointer flex items-center justify-center gap-1.5 ${!eventOnline ? `bg-gradient-to-r ${activeGrad} text-white border-transparent` : dm ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-50 border-neutral-200 text-slate-600'}`}>
                    <MapPin size={12} /> In-Person
                  </button>
                  <button type="button" onClick={() => setEventOnline(true)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border cursor-pointer flex items-center justify-center gap-1.5 ${eventOnline ? `bg-gradient-to-r ${activeGrad} text-white border-transparent` : dm ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-50 border-neutral-200 text-slate-600'}`}>
                    <Globe size={12} /> Online
                  </button>
                </div>
              </div>
              {eventOnline ? (
                <div>
                  <label className={labelCls()}>Link</label>
                  <input value={eventLink} onChange={e => setEventLink(e.target.value)} placeholder="https://meet.google.com/..." className={inputCls(dm)} />
                </div>
              ) : (
                <div>
                  <label className={labelCls()}>Venue</label>
                  <input value={eventVenue} onChange={e => setEventVenue(e.target.value)} placeholder="e.g. Main Auditorium, NIT Trichy" className={inputCls(dm)} />
                </div>
              )}
            </form>
          )}

          {/* ── PROJECT ── */}
          {activeTab === 'project' && (
            <form id="form-create" onSubmit={handleProject} className="space-y-3">
              <div>
                <label className={labelCls()}>Project title *</label>
                <input required value={projTitle} onChange={e => setProjTitle(e.target.value)} placeholder="e.g. CampusAI, SmartAttend..." className={inputCls(dm)} />
              </div>
              <div>
                <label className={labelCls()}>Description</label>
                <textarea rows={3} value={projDesc} onChange={e => setProjDesc(e.target.value)} placeholder="What problem does it solve? Who's it for?" className={`${inputCls(dm)} resize-none`} />
              </div>
              <div>
                <label className={labelCls()}>Stage</label>
                <div className="flex flex-wrap gap-1.5">
                  {PROJECT_STAGES.map(s => (
                    <button key={s} type="button" onClick={() => setProjStage(s)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border cursor-pointer transition-all ${projStage === s ? `bg-gradient-to-r ${activeGrad} text-white border-transparent` : dm ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-50 border-neutral-200 text-slate-600'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls()}>Tags (comma separated)</label>
                <input value={projTags} onChange={e => setProjTags(e.target.value)} placeholder="e.g. AI, React, Health Tech" className={inputCls(dm)} />
              </div>
              <div>
                <label className={labelCls()}>Looking for</label>
                <div className="flex flex-wrap gap-1.5">
                  {LOOKING_FOR_OPTIONS.map(opt => {
                    const sel = projLookingFor.includes(opt);
                    return (
                      <button key={opt} type="button"
                        onClick={() => setProjLookingFor(sel ? projLookingFor.filter(x => x !== opt) : [...projLookingFor, opt])}
                        className={`px-2.5 py-1 rounded-xl text-[10.5px] font-bold border cursor-pointer transition-all ${sel ? `bg-gradient-to-r ${activeGrad} text-white border-transparent` : dm ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-50 border-neutral-200 text-slate-600'}`}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            </form>
          )}

          {/* ── COMMUNITY ── */}
          {activeTab === 'community' && (
            <form id="form-create" onSubmit={handleCommunity} className="space-y-3">
              <div>
                <label className={labelCls()}>Community name *</label>
                <input required value={commName} onChange={e => setCommName(e.target.value)} placeholder="e.g. NIT Trichy Startup Club" className={inputCls(dm)} />
              </div>
              <div>
                <label className={labelCls()}>Description</label>
                <textarea rows={3} value={commDesc} onChange={e => setCommDesc(e.target.value)} placeholder="What's this community about?" className={`${inputCls(dm)} resize-none`} />
              </div>
              <div>
                <label className={labelCls()}>Icon</label>
                <div className="flex flex-wrap gap-2">
                  {COMMUNITY_ICONS.map(icon => (
                    <button key={icon} type="button" onClick={() => setCommIcon(icon)}
                      className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center cursor-pointer border transition-all ${commIcon === icon ? 'border-indigo-500 bg-indigo-500/10 scale-110' : dm ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-neutral-200 bg-slate-50 hover:bg-slate-100'}`}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls()}>Category</label>
                <div className="relative">
                  <select value={commCat} onChange={e => setCommCat(e.target.value)} className={selectCls(dm)}>
                    {COMMUNITY_CATS.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                </div>
              </div>
              <div>
                <label className={labelCls()}>Tags (comma separated)</label>
                <input value={commTags} onChange={e => setCommTags(e.target.value)} placeholder="e.g. AI, Startups, NIT Trichy" className={inputCls(dm)} />
              </div>
            </form>
          )}

          {/* ── GROUP ── */}
          {activeTab === 'group' && (
            <form id="form-create" onSubmit={handleGroup} className="space-y-3">
              <div>
                <label className={labelCls()}>Group name *</label>
                <input required value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="e.g. EEE Study Squad, CS Hackers..." className={inputCls(dm)} />
              </div>
              <div>
                <label className={labelCls()}>Type</label>
                <div className="grid grid-cols-1 gap-2">
                  {GROUP_TYPES.map(t => (
                    <button key={t.value} type="button" onClick={() => setGroupType(t.value)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all text-left ${groupType === t.value ? `bg-gradient-to-r ${activeGrad} text-white border-transparent` : dm ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10' : 'bg-slate-50 border-neutral-200 text-slate-700 hover:bg-slate-100'}`}>
                      <span className="text-lg">{t.icon}</span>
                      <span className="text-xs font-bold">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className={`p-3 rounded-xl border text-xs ${dm ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-50 border-neutral-200 text-slate-500'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Zap size={12} className="text-amber-400" />
                  <span className="font-bold text-[10px] uppercase tracking-wide">Auto-added</span>
                </div>
                You'll be added as admin. Your college: <span className="font-bold text-indigo-400">{currentUser.college}</span>
              </div>
            </form>
          )}

          {/* ── CLUB ── */}
          {activeTab === 'club' && (
            <form id="form-create" onSubmit={handleClub} className="space-y-3">
              <div className={`p-3 rounded-xl border text-[10px] font-mono ${dm ? 'border-violet-500/20 bg-violet-500/5 text-violet-400' : 'border-violet-200 bg-violet-50 text-violet-600'}`}>
                🏛️ Clubs are official campus groups — technical, cultural, sports, and more
              </div>
              <div>
                <label className={labelCls()}>Club name *</label>
                <input required value={clubName} onChange={e => setClubName(e.target.value)} placeholder="e.g. NIT Trichy Coding Club, Robotics Society..." className={inputCls(dm)} />
              </div>
              <div>
                <label className={labelCls()}>About the club</label>
                <textarea rows={3} value={clubDesc} onChange={e => setClubDesc(e.target.value)} placeholder="What does this club do? Who should join?" className={`${inputCls(dm)} resize-none`} />
              </div>
              <div>
                <label className={labelCls()}>Club type</label>
                <div className="grid grid-cols-2 gap-2">
                  {CLUB_TYPES.map(t => (
                    <button key={t.value} type="button" onClick={() => setClubType(t.value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all text-left ${clubType === t.value ? `bg-gradient-to-r ${tabColor['club']} text-white border-transparent` : dm ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10' : 'bg-slate-50 border-neutral-200 text-slate-700 hover:bg-slate-100'}`}>
                      <span>{t.icon}</span>
                      <span className="text-[11px] font-bold">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls()}>Club icon</label>
                <div className="flex flex-wrap gap-2">
                  {CLUB_ICONS.map(icon => (
                    <button key={icon} type="button" onClick={() => setClubIcon(icon)}
                      className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center cursor-pointer border transition-all ${clubIcon === icon ? 'border-violet-500 bg-violet-500/10 scale-110' : dm ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-neutral-200 bg-slate-50 hover:bg-slate-100'}`}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls()}>Tags (comma separated)</label>
                <input value={clubTags} onChange={e => setClubTags(e.target.value)} placeholder="e.g. NIT Trichy, Open Source, Competitive Programming" className={inputCls(dm)} />
              </div>
              <div>
                <label className={labelCls()}>Membership</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setClubOpen(true)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all ${clubOpen ? `bg-gradient-to-r ${tabColor['club']} text-white border-transparent` : dm ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-50 border-neutral-200 text-slate-600'}`}>
                    🌐 Open — Anyone can join
                  </button>
                  <button type="button" onClick={() => setClubOpen(false)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all ${!clubOpen ? `bg-gradient-to-r ${tabColor['club']} text-white border-transparent` : dm ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-50 border-neutral-200 text-slate-600'}`}>
                    🔒 Invite Only
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ── REEL ── */}
          {activeTab === 'reel' && (
            <form id="form-create" onSubmit={handleReel} className="space-y-3">
              <div className={`p-3 rounded-xl border text-[10px] font-mono ${dm ? 'border-pink-500/20 bg-pink-500/5 text-pink-400' : 'border-pink-200 bg-pink-50 text-pink-600'}`}>
                🎬 Reels are 24-hour stories visible to your campus network — share photos or short videos!
              </div>
              <div>
                <label className={labelCls()}>Caption</label>
                <textarea rows={3} value={reelContent} onChange={e => setReelContent(e.target.value)}
                  placeholder="Share a moment, achievement, or thought..."
                  className={`${inputCls(dm)} resize-none`} />
              </div>
              <div>
                <label className={labelCls()}>Media</label>
                {/* Toggle image / video */}
                <div className={`flex rounded-xl overflow-hidden border mb-3 ${dm ? 'border-white/10' : 'border-neutral-200'}`}>
                  {[{ t: 'image' as const, label: '🖼️ Photo' }, { t: 'video' as const, label: '🎬 Video' }].map(opt => (
                    <button
                      key={opt.t}
                      type="button"
                      onClick={() => { setReelMediaType(opt.t); setReelImage(''); }}
                      className={`flex-1 py-2 text-[11px] font-bold transition-all cursor-pointer border-0 ${reelMediaType === opt.t ? 'bg-pink-500 text-white' : dm ? 'bg-white/5 text-slate-400' : 'bg-neutral-50 text-slate-500'}`}
                    >{opt.label}</button>
                  ))}
                </div>

                {reelImage ? (
                  <div className="relative rounded-xl overflow-hidden h-48">
                    {reelMediaType === 'video' ? (
                      <video src={reelImage} className="w-full h-full object-cover" controls muted playsInline />
                    ) : (
                      <img src={reelImage} className="w-full h-full object-cover" />
                    )}
                    <button type="button" onClick={() => setReelImage('')} className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white cursor-pointer border-0"><X size={12} /></button>
                  </div>
                ) : (
                  <button type="button" onClick={() => (reelMediaType === 'video' ? reelVideoRef : reelFileRef).current?.click()}
                    className={`w-full py-10 rounded-xl border-2 border-dashed text-xs flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${dm ? 'border-white/10 text-slate-500 hover:border-pink-500/30 hover:bg-pink-500/5' : 'border-neutral-200 text-slate-400 hover:border-pink-300 hover:bg-pink-50/50'}`}>
                    <Video size={28} className="text-pink-400" />
                    <span className="font-semibold">{reelMediaType === 'video' ? 'Upload a video clip' : 'Upload a photo'}</span>
                    <span className="text-[10px] opacity-60">{reelMediaType === 'video' ? 'MP4, WebM, MOV · max ~50MB' : 'PNG, JPG, WebP'}</span>
                  </button>
                )}
                <input ref={reelFileRef} type="file" accept="image/*" className="hidden" onChange={e => { setReelMediaType('image'); handleImageUpload(e, setReelImage); }} />
                <input ref={reelVideoRef} type="file" accept="video/mp4,video/webm,video/quicktime,video/*" className="hidden" onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 52_428_800) { alert('Video is too large. Please keep it under 50MB.'); return; }
                  const reader = new FileReader();
                  reader.onloadend = () => { setReelMediaType('video'); setReelImage(reader.result as string); };
                  reader.readAsDataURL(file);
                }} />
              </div>
            </form>
          )}

          {/* ── POLL ── */}
          {activeTab === 'poll' && (
            <form id="form-create" onSubmit={handlePoll} className="space-y-4">
              <div className={`p-3 rounded-xl border text-[10px] font-mono ${dm ? 'border-teal-500/20 bg-teal-500/5 text-teal-400' : 'border-teal-200 bg-teal-50 text-teal-700'}`}>
                📊 Polls let your campus vote on ideas, decisions, and opinions — results are shown live!
              </div>
              <div>
                <label className={labelCls()}>Question *</label>
                <textarea required rows={2} value={pollQuestion} onChange={e => setPollQuestion(e.target.value)}
                  placeholder="What do you want to ask the campus?"
                  className={`${inputCls(dm)} resize-none`} />
              </div>
              <div>
                <label className={labelCls()}>Options (2–4) *</label>
                <div className="space-y-2">
                  {pollOptions.map((opt, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${dm ? 'bg-teal-500/20 text-teal-400' : 'bg-teal-100 text-teal-700'}`}>{i + 1}</span>
                      <input type="text" placeholder={`Option ${i + 1}`} value={opt}
                        onChange={e => { const c = [...pollOptions]; c[i] = e.target.value; setPollOptions(c); }}
                        className={`${inputCls(dm)} flex-1`} />
                      {pollOptions.length > 2 && (
                        <button type="button" onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}
                          className="shrink-0 text-rose-400 hover:text-rose-500 cursor-pointer border-0 bg-transparent p-1">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {pollOptions.length < 4 && (
                  <button type="button" onClick={() => setPollOptions([...pollOptions, ''])}
                    className={`mt-2 inline-flex items-center gap-1 text-[10px] font-bold cursor-pointer border-0 bg-transparent ${dm ? 'text-teal-400 hover:text-teal-300' : 'text-teal-600 hover:text-teal-700'}`}>
                    <Plus size={12} /> Add Option
                  </button>
                )}
              </div>
              <div>
                <label className={labelCls()}>Tag</label>
                <div className="relative">
                  <select value={pollTag} onChange={e => setPollTag(e.target.value)} className={selectCls(dm)}>
                    {ACADEMIC_TAGS.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                </div>
              </div>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className={`shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-t ${dm ? 'border-white/10 bg-[#0E0E12]' : 'border-neutral-200 bg-white'}`}>
          <button type="button" onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all ${dm ? 'border-white/10 text-slate-400 hover:bg-white/5' : 'border-neutral-200 text-slate-500 hover:bg-slate-50'}`}>
            Cancel
          </button>
          <button
            type="submit"
            form="form-create"
            disabled={saving}
            className={`px-5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider text-white bg-gradient-to-r ${activeGrad} hover:opacity-90 active:scale-[0.98] transition-all shadow-sm cursor-pointer border-0 flex items-center gap-1.5 disabled:opacity-60`}>
            {saving ? (
              <span className="flex items-center gap-1.5"><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating...</span>
            ) : activeTab === 'post' ? <><Send size={12} /> Share Post</> :
              activeTab === 'question' ? <><HelpCircle size={12} /> Post Question</> :
              activeTab === 'poll' ? <><BarChart2 size={12} /> Launch Poll</> :
              <><Send size={12} /> Create {TABS.find(t => t.id === activeTab)?.label}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
