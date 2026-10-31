import React, { useState, useEffect } from 'react';
import { UserProfile, Community, Connection, Project } from '../types';
import {
  ShieldCheck, Sparkles, Check, Save, Image as ImageIcon, X,
  User, Rocket, Users, UserCheck, GraduationCap, MapPin,
  BookOpen, Code, Star, Clock, ExternalLink, Award, LogIn,
  CheckCircle2, MessageSquare, Handshake, BookMarked, Puzzle, LogOut,
  Smartphone
} from 'lucide-react';
import {
  canInstall,
  isAlreadyInstalled,
  isIOS,
  triggerInstall,
  onInstallAvailableChange,
  onInstalledChange,
} from '../pwaInstall';
import CollegeSelector from './CollegeSelector';
import Avatar from './Avatar';
import { api } from '../api';
import { getEducationDisplay } from '../utils/education';

interface ProfileSectionProps {
  currentUser: UserProfile;
  onUpdateProfile: (updatedProfile: UserProfile) => void;
  darkMode: boolean;
  communities?: Community[];
  connections?: Connection[];
  allUsers?: UserProfile[];
  onLogout?: () => void;
}

type Tab = 'edit' | 'projects' | 'clubs' | 'connections';

const STAGE_COLORS: Record<string, string> = {
  Idea: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Building: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  MVP: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  Launched: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};

const CONN_TYPE_ICONS: Record<string, React.ReactNode> = {
  'Startup Discussion': <Rocket size={10} />,
  'Friendship': <Handshake size={10} />,
  'Study Partner': <BookMarked size={10} />,
  'Hackathon Team': <Puzzle size={10} />,
};

export default function ProfileSection({
  currentUser,
  onUpdateProfile,
  darkMode,
  communities = [],
  connections = [],
  allUsers = [],
  onLogout,
}: ProfileSectionProps) {
  const [activeTab, setActiveTab] = useState<Tab>('edit');

  // Profile edit state
  const [fullName, setFullName] = useState(currentUser.fullName);
  const [aboutMe, setAboutMe] = useState(currentUser.aboutMe);
  const [college, setCollege] = useState(currentUser.college);
  const [branch, setBranch] = useState(currentUser.branch);
  const [degree, setDegree] = useState(currentUser.degree ?? '');
  const [academicStream, setAcademicStream] = useState(currentUser.academicStream ?? '');
  const [programGroup, setProgramGroup] = useState(currentUser.programGroup ?? '');
  const [fields, setFields] = useState<string[]>(currentUser.fields ?? []);
  const [year, setYear] = useState(currentUser.year);
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [coverImage, setCoverImage] = useState<string | null | undefined>(currentUser.coverImage);
  const coverFileRef = React.useRef<HTMLInputElement>(null);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(currentUser.interests);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(currentUser.skills);
  const [selectedLookingFor, setSelectedLookingFor] = useState<string[]>(currentUser.lookingFor);
  const [showEmail, setShowEmail] = useState(currentUser.privacySettings.showEmail);
  const [onlyVerified, setOnlyVerified] = useState(currentUser.privacySettings.onlyAllowVerifiedConnections);
  const [hideProfile, setHideProfile] = useState(currentUser.privacySettings.hideProfileFromSearch);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // PWA install
  const [installAvailable, setInstallAvailable] = useState(() => canInstall());
  const [installDone, setInstallDone] = useState(() => isAlreadyInstalled());
  useEffect(() => onInstallAvailableChange(setInstallAvailable), []);
  useEffect(() => onInstalledChange(setInstallDone), []);

  // Projects state
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'projects' && projects.length === 0) {
      setProjectsLoading(true);
      api.projects.getAll()
        .then((all: Project[]) => {
          setProjects(all.filter((p: Project) => p.memberIds.includes(currentUser.id) || p.creatorId === currentUser.id));
        })
        .catch(() => {})
        .finally(() => setProjectsLoading(false));
    }
  }, [activeTab]);

  // Profile strength
  const scoreInterestsCount = Math.min(3, selectedInterests.length);
  const scoreSkillsCount = Math.min(3, selectedSkills.length);
  const scoreLookingForCount = Math.min(2, selectedLookingFor.length);

  const strength = (() => {
    let score = 0;
    if (fullName.trim()) score += 10;
    if (college.trim()) score += 10;
    if (branch.trim()) score += 10;
    if (year > 0) score += 10;
    if (aboutMe.trim().length >= 20) score += 20; else if (aboutMe.trim()) score += 10;
    score += scoreInterestsCount * 5;
    score += scoreSkillsCount * 5;
    score += scoreLookingForCount * 5;
    return score;
  })();

  const strengthMeta = (() => {
    if (strength < 40) return { text: 'SPECTATOR / INCOMPLETE', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', barBg: 'bg-rose-500' };
    if (strength < 80) return { text: 'COMPETENT / FILLING OUT', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', barBg: 'bg-amber-500' };
    return { text: 'OPTIMIZED / ELITE', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', barBg: 'bg-gradient-to-r from-indigo-500 to-emerald-500' };
  })();

  const PROGRAM_GROUPS = ['Engineering & Technology', 'Arts & Humanities', 'Commerce & Management', 'Science & Research', 'Medicine & Healthcare', 'Law', 'Design & Architecture', 'Competitive Exams', 'Other'];
  const FIELD_OPTIONS = ['Artificial Intelligence', 'Software Development', 'Data Science', 'Electronics & Embedded', 'Business & Entrepreneurship', 'Finance', 'Research', 'Healthcare', 'Law & Policy', 'Design', 'Media & Content'];
  const UNIQUE_INTERESTS = ['Startups', 'AI/ML', 'Coding', 'Design', 'Finance', 'Entrepreneurship', 'Research', 'Higher Studies', 'Placement Preparation', 'Sports', 'Music', 'Gaming', 'Photography'];
  const UNIQUE_SKILLS = ['React', 'Python', 'UI/UX', 'Marketing', 'Video Editing', 'C++', 'Data Structures', 'PyTorch', 'Figma', 'Embedded Systems', 'SQL', 'Algorithms'];
  const UNIQUE_LOOKING_FOR = ['Friends', 'Study Partner', 'Startup Co-Founder', 'Hackathon Team', 'Mentor', 'Career Guidance', 'Research Collaborator', 'Project Partner'];

  const saveProfileData = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      ...currentUser,
      fullName, aboutMe, college, branch, degree, academicStream, programGroup, fields, year, avatar, coverImage,
      interests: selectedInterests,
      skills: selectedSkills,
      lookingFor: selectedLookingFor,
      privacySettings: { showEmail, onlyAllowVerifiedConnections: onlyVerified, hideProfileFromSearch: hideProfile }
    });
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 4000);
  };

  // Derived data for tabs
  const myClubs = communities.filter(c => c.memberIds.includes(currentUser.id));
  const myConnections = connections.filter(c =>
    c.status === 'accepted' && (c.senderId === currentUser.id || c.receiverId === currentUser.id)
  );

  const card = `rounded-2xl border ${darkMode ? 'bg-[#121217] border-white/10' : 'bg-white border-neutral-200'} shadow-sm`;
  const toggleField = (field: string) => {
    setFields(current => current.includes(field)
      ? current.filter(item => item !== field)
      : [...current, field]);
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'edit', label: 'Edit Profile', icon: <User size={12} /> },
    { id: 'projects', label: 'Projects', icon: <Rocket size={12} /> },
    { id: 'clubs', label: 'Clubs', icon: <Users size={12} />, count: myClubs.length },
    { id: 'connections', label: 'Connections', icon: <UserCheck size={12} />, count: myConnections.length },
  ];

  return (
    <div className="flex-1 min-w-0 space-y-5 pb-10">
      {/* Profile Header Card */}
      <div className={`${card} overflow-visible`}>
        {/* Cover banner */}
        <div className="h-40 rounded-t-2xl relative overflow-hidden">
          {/* Background: cover photo or gradient */}
          {coverImage ? (
            <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-rose-500" />
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 25% 60%, white 1.5px, transparent 1.5px), radial-gradient(circle at 75% 30%, white 1px, transparent 1px)', backgroundSize: '28px 28px, 18px 18px' }} />
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

          {/* Cover photo upload button */}
          <input
            ref={coverFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 8 * 1024 * 1024) { alert('Too large (max 8MB)'); return; }
              const reader = new FileReader();
              reader.onloadend = () => setCoverImage(reader.result as string);
              reader.readAsDataURL(file);
            }}
          />
          <button
            type="button"
            onClick={() => coverFileRef.current?.click()}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/50 hover:bg-black/70 text-white text-[10px] font-semibold backdrop-blur-sm transition-all cursor-pointer border border-white/20"
          >
            <ImageIcon size={11} />Add Cover Photo
          </button>

          {coverImage && (
            <button
              type="button"
              onClick={() => setCoverImage(null)}
              className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/50 hover:bg-rose-600/80 text-white text-[9px] font-semibold backdrop-blur-sm cursor-pointer border border-white/20"
            >
              <X size={10} />Remove
            </button>
          )}

          {/* Logout */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/40 hover:bg-black/60 text-white text-[10px] font-semibold backdrop-blur-sm transition-all cursor-pointer border border-white/20"
            >
              <LogOut size={10} />Log out
            </button>
          )}
        </div>

        <div className="px-5 pb-5">
          {/* Avatar overlapping banner — pushed up with negative margin */}
          <div className="flex items-end justify-between gap-3 -mt-12 mb-4">
            <div className="p-[3px] rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-600 shrink-0 shadow-2xl" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.35))' }}>
              <div className={`w-[88px] h-[88px] rounded-full border-4 ${darkMode ? 'border-[#121217]' : 'border-white'} flex items-center justify-center font-bold text-2xl overflow-hidden ${darkMode ? 'bg-zinc-900 text-white' : 'bg-slate-100 text-slate-800'}`}>
                <Avatar avatar={currentUser.avatar} />
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 pb-1">
              {currentUser.isVerified && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-500 text-[9px] font-bold border border-indigo-500/20">
                  <ShieldCheck size={10} />VERIFIED
                </span>
              )}
              <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold border ${darkMode ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-50 border-neutral-200 text-slate-500'}`}>
                {getEducationDisplay(currentUser).compact}
              </span>
            </div>
          </div>

          {/* Name + identity */}
          <h2 className={`font-extrabold text-base leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{currentUser.fullName}</h2>
          <p className={`text-[11px] mt-0.5 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {currentUser.degree ? `${currentUser.degree} · ` : ''}{currentUser.branch}
          </p>
          <p className={`text-[10px] mt-0.5 flex items-center gap-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            <GraduationCap size={10} className="text-indigo-400" />{currentUser.college}
          </p>

          {/* Bio preview */}
          {currentUser.aboutMe && (
            <p className={`text-[11px] mt-3 leading-relaxed line-clamp-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{currentUser.aboutMe}</p>
          )}

          {/* Interests pills */}
          {currentUser.interests?.length > 0 && (
            <div className="mt-3">
              <p className={`text-[8px] font-bold uppercase tracking-wider mb-1.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Interests</p>
              <div className="flex flex-wrap gap-1.5">
                {currentUser.interests.map(interest => (
                  <span key={interest} className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${darkMode ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Skills pills */}
          {currentUser.skills?.length > 0 && (
            <div className="mt-3">
              <p className={`text-[8px] font-bold uppercase tracking-wider mb-1.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {currentUser.skills.map(skill => (
                  <span key={skill} className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${darkMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Looking For pills */}
          {currentUser.lookingFor?.length > 0 && (
            <div className="mt-3">
              <p className={`text-[8px] font-bold uppercase tracking-wider mb-1.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Looking For</p>
              <div className="flex flex-wrap gap-1.5">
                {currentUser.lookingFor.map(item => (
                  <span key={item} className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${darkMode ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Stats row */}
          <div className={`grid grid-cols-3 gap-2 mt-4 pt-4 border-t ${darkMode ? 'border-white/5' : 'border-neutral-100'}`}>
            <div className={`text-center py-2 rounded-xl ${darkMode ? 'bg-white/5' : 'bg-neutral-50'}`}>
              <div className={`text-base font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{myClubs.length}</div>
              <div className="text-[9px] text-slate-400 font-medium mt-0.5">Clubs</div>
            </div>
            <div className={`text-center py-2 rounded-xl ${darkMode ? 'bg-white/5' : 'bg-neutral-50'}`}>
              <div className={`text-base font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{myConnections.length}</div>
              <div className="text-[9px] text-slate-400 font-medium mt-0.5">Connections</div>
            </div>
            <div className={`text-center py-2 rounded-xl ${darkMode ? 'bg-white/5' : 'bg-neutral-50'}`}>
              <div className={`text-base font-extrabold ${strength >= 80 ? 'text-emerald-500' : strength >= 40 ? 'text-amber-500' : 'text-rose-500'}`}>{strength}%</div>
              <div className="text-[9px] text-slate-400 font-medium mt-0.5">Profile</div>
            </div>
          </div>

          {/* Profile strength bar */}
          <div className="mt-3">
            <div className={`w-full h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-zinc-800' : 'bg-neutral-100'}`}>
              <div
                className={`h-full rounded-full transition-all duration-700 ${strength >= 80 ? 'bg-gradient-to-r from-indigo-500 to-emerald-500' : strength >= 40 ? 'bg-amber-400' : 'bg-rose-400'}`}
                style={{ width: `${strength}%` }}
              />
            </div>
            <p className={`text-[8px] font-mono mt-1 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>{strengthMeta.text}</p>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className={`flex gap-1 p-1 rounded-xl border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-neutral-100 border-neutral-200'}`}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${activeTab === tab.id ? 'bg-indigo-500 text-white shadow-sm' : (darkMode ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-800 hover:bg-white')}`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`px-1 py-0.5 rounded text-[8px] font-black ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-indigo-500/10 text-indigo-500'}`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── EDIT PROFILE TAB ── */}
      {activeTab === 'edit' && (
        <form onSubmit={saveProfileData} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {showSuccessToast && (
            <div className="col-span-full p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-2 text-xs font-semibold">
              <Sparkles size={14} className="text-emerald-500 animate-spin" />
              Profile saved to institutional ledger.
            </div>
          )}

          <div className="space-y-5 lg:col-span-1">
            {/* Avatar card */}
            <div className={`p-5 ${card} text-center space-y-3`}>
              <div className="relative group mx-auto w-20 h-20">
                <div className="p-[2.5px] rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-600 w-full h-full">
                  <div className={`w-full h-full rounded-full border-2 ${darkMode ? 'border-[#121217] bg-zinc-900 text-white' : 'border-white bg-slate-100 text-slate-800'} flex items-center justify-center font-bold text-lg overflow-hidden`}>
                    <Avatar avatar={avatar} />
                  </div>
                </div>
                <label htmlFor="profile-avatar-file" className="absolute inset-[2px] bg-black/70 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-[8px] font-bold">
                  <ImageIcon size={14} className="mb-0.5 text-indigo-400" />Upload
                </label>
                <input id="profile-avatar-file" type="file" accept="image/*" className="hidden" onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 8 * 1024 * 1024) { alert('Too large (max 8MB)'); return; }
                    const reader = new FileReader();
                    reader.onloadend = () => setAvatar(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }} />
              </div>
              <div>
                <p className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{fullName}</p>
              </div>

              {/* Profile strength */}
              <div className="pt-3 border-t border-neutral-100 dark:border-white/5 space-y-2 text-left">
                <div className="flex justify-between text-[9px] font-mono font-bold uppercase">
                  <span className="text-slate-400">Profile Index</span>
                  <span className="text-indigo-500">{strength}%</span>
                </div>
                <div className={`w-full h-2 rounded-full overflow-hidden ${darkMode ? 'bg-zinc-800' : 'bg-neutral-100'}`}>
                  <div className={`h-full ${strengthMeta.barBg} transition-all duration-500 rounded-full`} style={{ width: `${strength}%` }} />
                </div>
                <div className={`text-center py-1 px-2 rounded-lg border text-[8px] font-bold ${strengthMeta.color}`}>{strengthMeta.text}</div>
              </div>
            </div>

            {/* Identity fields */}
            <div className={`p-5 ${card} space-y-3`}>
              <p className={`text-[9px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Identity</p>
              <div>
                <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-1">Full Name</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)} required className={`w-full px-3 py-1.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${darkMode ? 'bg-[#09090C] text-white border-white/10' : 'bg-white text-slate-800 border-neutral-200'}`} />
              </div>
              <div>
                <CollegeSelector id="profile-college" value={college} onChange={setCollege} darkMode={darkMode} label="School / College / Coaching institute" />
                <p className="mt-1 text-[9px] leading-4 text-slate-400">
                  Add the institute name students would search for. If it is not listed, type the full name and choose “Add”.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-1">Degree</label>
                  <select value={degree} onChange={e => setDegree(e.target.value)} className={`w-full px-3 py-1.5 rounded-xl border text-xs cursor-pointer ${darkMode ? 'bg-[#09090C] text-slate-300 border-white/10' : 'bg-white text-slate-800 border-neutral-200'}`}>
                    <option value="">Select Degree</option>
                    <optgroup label="Undergraduate">
                      <option>B.Tech</option>
                      <option>B.E</option>
                      <option>B.Sc</option>
                      <option>B.Com</option>
                      <option>B.A</option>
                      <option>BBA</option>
                      <option>BCA</option>
                      <option>BDS</option>
                      <option>MBBS</option>
                      <option>LLB (3-yr)</option>
                      <option>BA LLB (5-yr)</option>
                      <option>B.Arch</option>
                      <option>B.Pharm</option>
                      <option>B.Des</option>
                    </optgroup>
                    <optgroup label="Postgraduate">
                      <option>M.Tech</option>
                      <option>M.E</option>
                      <option>M.Sc</option>
                      <option>MBA</option>
                      <option>MCA</option>
                      <option>M.Com</option>
                      <option>MA</option>
                      <option>LLM</option>
                      <option>M.Arch</option>
                      <option>M.Pharm</option>
                      <option>M.Des</option>
                      <option>MDS</option>
                    </optgroup>
                    <optgroup label="Other">
                      <option>PhD</option>
                      <option>Integrated (5-yr)</option>
                      <option>Diploma</option>
                      <option>Certificate</option>
                      <option>Other</option>
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-1">Year</label>
                  <select value={year} onChange={e => setYear(Number(e.target.value))} className={`w-full px-3 py-1.5 rounded-xl border text-xs cursor-pointer ${darkMode ? 'bg-[#09090C] text-slate-300 border-white/10' : 'bg-white text-slate-800 border-neutral-200'}`}>
                    <option value={1}>1st Yr (Fr)</option>
                    <option value={2}>2nd Yr (So)</option>
                    <option value={3}>3rd Yr (Jr)</option>
                    <option value={4}>4th Yr (Sr)</option>
                    <option value={5}>Postgrad / Fellow</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-1">Academic Stream</label>
                  <select value={academicStream} onChange={e => setAcademicStream(e.target.value)} className={`w-full px-3 py-1.5 rounded-xl border text-xs cursor-pointer ${darkMode ? 'bg-[#09090C] text-slate-300 border-white/10' : 'bg-white text-slate-800 border-neutral-200'}`}>
                    <option value="">Select stream</option>
                    {['Engineering', 'Science', 'Commerce', 'Business & Management', 'Arts & Humanities', 'Medicine & Healthcare', 'Law & Public Affairs', 'Design / Art / Media', 'Agriculture & Environment', 'Education', 'Sports & Recreation', 'Professional', 'Research', 'Competitive Exam / Preparation', 'Other'].map(option => <option key={option}>{option}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-1">Program Group</label>
                  <select value={programGroup} onChange={e => setProgramGroup(e.target.value)} className={`w-full px-3 py-1.5 rounded-xl border text-xs cursor-pointer ${darkMode ? 'bg-[#09090C] text-slate-300 border-white/10' : 'bg-white text-slate-800 border-neutral-200'}`}>
                    <option value="">Select group</option>
                    {PROGRAM_GROUPS.map(option => <option key={option}>{option}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-1">Fields of Interest</label>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {FIELD_OPTIONS.map(field => (
                      <button
                        type="button"
                        key={field}
                        onClick={() => toggleField(field)}
                        className={`px-2 py-1 rounded-lg border text-[9px] font-bold transition-colors cursor-pointer ${
                          fields.includes(field)
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : (darkMode ? 'bg-[#09090C] text-slate-400 border-white/10 hover:border-indigo-400' : 'bg-white text-slate-600 border-neutral-200 hover:border-indigo-300')
                        }`}
                      >
                        {field}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-1">Department / Branch</label>
                <input value={branch} onChange={e => setBranch(e.target.value)} placeholder="e.g. Computer Science, Electrical Engineering..." required className={`w-full px-3 py-1.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${darkMode ? 'bg-[#09090C] text-white border-white/10' : 'bg-white text-slate-800 border-neutral-200'}`} />
              </div>
            </div>

            {/* Privacy */}
            <div className={`p-5 ${card} space-y-4`}>
              <p className={`text-[9px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Privacy</p>
              {[
                { label: 'Expose University Email', sub: 'Allow verified matches to see your email', val: showEmail, set: setShowEmail },
                { label: 'Strict Connection Filter', sub: 'Only receive from verified campus seats', val: onlyVerified, set: setOnlyVerified },
                { label: 'Go Stealth / Incognito', sub: 'Hide from discovery search engine', val: hideProfile, set: setHideProfile },
              ].map(({ label, sub, val, set }) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <div>
                    <p className={`text-[11px] font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{label}</p>
                    <p className="text-[9px] text-slate-400">{sub}</p>
                  </div>
                  <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} className="w-4 h-4 rounded text-indigo-500 border-neutral-300 cursor-pointer shrink-0" />
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-5">
            {/* Bio */}
            <div className={`p-5 ${card} space-y-3`}>
              <p className={`text-[9px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Institutional Bio</p>
              <textarea rows={4} required placeholder="Share what you're working on, startup plans, study goals..." value={aboutMe} onChange={e => setAboutMe(e.target.value)} className={`w-full p-4 text-xs rounded-xl border focus:outline-none resize-none ${darkMode ? 'bg-[#09090C] text-slate-100 border-white/10' : 'bg-neutral-50 text-slate-900 border-neutral-200'}`} />
            </div>

            {/* Interests */}
            <div className={`p-5 ${card} space-y-3`}>
              <div className="flex items-center justify-between">
                <p className={`text-[9px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Academic & Social Interests</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {UNIQUE_INTERESTS.map(interest => {
                  const active = selectedInterests.includes(interest);
                  return (
                    <button key={interest} type="button" onClick={() => setSelectedInterests(p => p.includes(interest) ? p.filter(i => i !== interest) : [...p, interest])}
                      className={`py-1 px-3 rounded-full border text-xs font-semibold cursor-pointer transition-all flex items-center gap-1 ${active ? 'bg-indigo-500 text-white border-transparent' : (darkMode ? 'border-white/10 text-slate-400 hover:border-indigo-500' : 'border-neutral-200 text-slate-500 hover:border-indigo-500')}`}>
                      {interest}{active && <Check size={10} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Skills */}
            <div className={`p-5 ${card} space-y-3`}>
              <p className={`text-[9px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Hard Skills & Focus Fields</p>
              <div className="flex flex-wrap gap-2">
                {UNIQUE_SKILLS.map(skill => {
                  const active = selectedSkills.includes(skill);
                  return (
                    <button key={skill} type="button" onClick={() => setSelectedSkills(p => p.includes(skill) ? p.filter(s => s !== skill) : [...p, skill])}
                      className={`py-1 px-3 rounded-full border text-xs font-semibold cursor-pointer transition-all flex items-center gap-1 ${active ? 'bg-indigo-500 text-white border-transparent' : (darkMode ? 'border-white/10 text-slate-400 hover:border-indigo-500' : 'border-neutral-200 text-slate-500 hover:border-indigo-500')}`}>
                      {skill}{active && <Check size={10} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Looking For */}
            <div className={`p-5 ${card} space-y-3`}>
              <p className={`text-[9px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Campus Collaborations Sought</p>
              <div className="flex flex-wrap gap-2">
                {UNIQUE_LOOKING_FOR.map(opt => {
                  const active = selectedLookingFor.includes(opt);
                  return (
                    <button key={opt} type="button" onClick={() => setSelectedLookingFor(p => p.includes(opt) ? p.filter(l => l !== opt) : [...p, opt])}
                      className={`py-1 px-3 rounded-full border text-xs font-semibold cursor-pointer transition-all flex items-center gap-1 ${active ? 'bg-emerald-500 text-white border-transparent' : (darkMode ? 'border-white/10 text-slate-400 hover:border-emerald-500' : 'border-neutral-200 text-slate-500 hover:border-emerald-500')}`}>
                      {opt}{active && <Check size={10} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" className="py-2.5 px-6 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold uppercase text-[10px] tracking-wider cursor-pointer flex items-center gap-1.5 transition-colors">
                <Save size={13} />Update Campus Profile
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ── PROJECTS TAB ── */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          {projectsLoading ? (
            <div className={`${card} p-10 text-center`}>
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-400">Loading projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className={`${card} p-10 text-center`}>
              <Rocket size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-400">No projects yet</p>
              <p className="text-[11px] text-slate-400 mt-1">Create or join a project from the Projects section.</p>
            </div>
          ) : (
            projects.map(project => {
              const isCreator = project.creatorId === currentUser.id;
              return (
                <div key={project.id} className={`${card} p-5`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${STAGE_COLORS[project.stage] || 'bg-slate-100 text-slate-500'}`}>{project.stage}</span>
                        {isCreator && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold bg-indigo-500/10 text-indigo-500"><Award size={8} />Creator</span>}
                      </div>
                      <h3 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>{project.title}</h3>
                    </div>
                  </div>
                  <p className={`text-xs leading-relaxed mb-3 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{project.description}</p>
                  {project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {project.tags.map(tag => (
                        <span key={tag} className={`px-2 py-0.5 rounded text-[9px] font-medium ${darkMode ? 'bg-white/5 text-slate-400' : 'bg-neutral-100 text-slate-500'}`}>{tag}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-3 pt-3 border-t border-neutral-100 dark:border-white/5">
                    <div className="flex -space-x-1">
                      {project.memberIds.slice(0, 5).map(uid => {
                        const u = allUsers.find(x => x.id === uid);
                        return u ? (
                          <div key={uid} className={`w-5 h-5 rounded-full border-2 ${darkMode ? 'border-[#121217]' : 'border-white'} bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-[7px] font-bold overflow-hidden`} title={u.fullName}>
                            <Avatar avatar={u.avatar} />
                          </div>
                        ) : null;
                      })}
                    </div>
                    <span className={`text-[10px] font-mono ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{project.memberIds.length} member{project.memberIds.length !== 1 ? 's' : ''}</span>
                    {project.lookingFor.length > 0 && (
                      <span className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        Looking for: {project.lookingFor.slice(0, 2).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── CLUBS TAB ── */}
      {activeTab === 'clubs' && (
        <div className="space-y-4">
          {myClubs.length === 0 ? (
            <div className={`${card} p-10 text-center`}>
              <Users size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-400">No clubs joined yet</p>
              <p className="text-[11px] text-slate-400 mt-1">Join campus clubs from the Colleges section.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {myClubs.map(club => {
                const isCreator = club.creatorId === currentUser.id;
                return (
                  <div key={club.id} className={`${card} p-4 flex flex-col gap-2`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-500`}>{club.category}</span>
                          {isCreator && <span className="flex items-center gap-0.5 text-[8px] font-bold text-amber-500"><Award size={8} />Owner</span>}
                          {club.college && <span className={`text-[8px] font-mono ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{club.college}</span>}
                        </div>
                        <h3 className={`font-bold text-xs ${darkMode ? 'text-white' : 'text-slate-900'}`}>{club.name}</h3>
                      </div>
                    </div>
                    <p className={`text-[10px] leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{club.description}</p>
                    {club.tags && club.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {club.tags.slice(0, 3).map(tag => (
                          <span key={tag} className={`px-1.5 py-0.5 rounded text-[8px] ${darkMode ? 'bg-white/5 text-slate-400' : 'bg-neutral-100 text-slate-500'}`}>{tag}</span>
                        ))}
                      </div>
                    )}
                    <div className={`flex items-center gap-1.5 pt-2 border-t border-neutral-100 dark:border-white/5 text-[9px] font-mono ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      <Users size={9} />{club.memberIds.length} member{club.memberIds.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── CONNECTIONS TAB ── */}
      {activeTab === 'connections' && (
        <div className="space-y-3">
          {myConnections.length === 0 ? (
            <div className={`${card} p-10 text-center`}>
              <UserCheck size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-400">No connections yet</p>
              <p className="text-[11px] text-slate-400 mt-1">Send connection requests from the Peer Search or Feed.</p>
            </div>
          ) : (
            myConnections.map(conn => {
              const peerId = conn.senderId === currentUser.id ? conn.receiverId : conn.senderId;
              const peer = allUsers.find(u => u.id === peerId);
              if (!peer) return null;
              return (
                <div key={conn.id} className={`${card} p-4 flex items-center gap-4`}>
                  <div className="p-[2px] rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-600 shrink-0">
                    <div className={`w-10 h-10 rounded-full border-2 ${darkMode ? 'border-[#121217]' : 'border-white'} flex items-center justify-center overflow-hidden ${darkMode ? 'bg-zinc-900 text-white' : 'bg-slate-100 text-slate-800'} font-bold text-sm`}>
                      <Avatar avatar={peer.avatar} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-xs ${darkMode ? 'text-white' : 'text-slate-900'} truncate`}>{peer.fullName}</span>
                      {peer.isVerified && <CheckCircle2 size={10} className="text-indigo-500 shrink-0" />}
                    </div>
                    <p className={`text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'} truncate`}>{peer.branch} · {peer.college}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold ${darkMode ? 'bg-white/5 text-slate-400' : 'bg-neutral-100 text-slate-500'}`}>
                        {CONN_TYPE_ICONS[conn.type]}{conn.type}
                      </span>
                    </div>
                  </div>
                  <div className={`text-[9px] font-mono shrink-0 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    {getEducationDisplay(peer).compact}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Install App — persistent button for PWA, shown when installable or iOS */}
      {!installDone && (
        <div className="mt-4">
          {/* Android: native install available */}
          {installAvailable && (
            <button
              onClick={async () => {
                const r = await triggerInstall();
                if (r === 'accepted') setInstallDone(true);
              }}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border font-semibold text-sm transition-all cursor-pointer ${
                darkMode
                  ? 'border-indigo-500/30 text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20'
                  : 'border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
              }`}
            >
              <Smartphone size={15} />
              Add to Home Screen
            </button>
          )}
          {/* iOS: instructions hint */}
          {isIOS() && !installAvailable && (
            <div className={`w-full flex items-start gap-3 py-3 px-4 rounded-2xl border text-sm ${
              darkMode
                ? 'border-indigo-500/20 bg-indigo-500/8 text-indigo-300'
                : 'border-indigo-100 bg-indigo-50 text-indigo-700'
            }`}>
              <Smartphone size={16} className="shrink-0 mt-0.5" />
              <span className="leading-snug text-[12px]">
                To install: tap the <strong>Share</strong> button in Safari, then <strong>Add to Home Screen</strong>.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Logout — visible on mobile only (desktop has it in the sidebar) */}
      {onLogout && (
        <div className="md:hidden mt-3 pb-2">
          <button
            onClick={onLogout}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border font-semibold text-sm transition-all cursor-pointer ${
              darkMode
                ? 'border-red-500/20 text-red-400 bg-red-500/8 hover:bg-red-500/15'
                : 'border-red-200 text-red-500 bg-red-50 hover:bg-red-100'
            }`}
          >
            <LogOut size={15} />
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}
