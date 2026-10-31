import React, { useState, useEffect } from 'react';
import { UserProfile, Connection } from '../types';
import { Search, Filter, ShieldCheck, Mail, Users, Sparkles, MessageCircle, AlertCircle, RefreshCw, Flag, Eye, Send, Check, X, Plus, FileText, Image as ImageIcon } from 'lucide-react';
import Avatar from './Avatar';
import { getEducationDisplay } from '../utils/education';

interface DiscoverySectionProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  connections: Connection[];
  onSendConnectionRequest: (receiverId: string, type: 'Startup Discussion' | 'Friendship' | 'Study Partner' | 'Hackathon Team', message: string) => void;
  onAcceptConnection: (requestId: string) => void;
  onRejectConnection: (requestId: string) => void;
  onReportUser: (reportedUserId: string, reason: string, description: string) => void;
  darkMode: boolean;
  onNavigate?: (view: string, extra?: string) => void;
}

export interface BulletinCard {
  id: string;
  studentId: string;
  category: 'Looking for Friends' | 'Looking for Co-Founder' | 'Looking for Study Partner' | 'Looking for Hackathon Team' | 'Looking for Mentor' | 'Looking for Research Collaborator' | 'Looking for Internship Referral' | 'Looking for Project Partner';
  title: string;
  content: string;
  createdAt: string;
  bulletinImage?: string; // Add optional photo attachment field
}

export default function DiscoverySection({
  currentUser,
  allUsers,
  connections,
  onSendConnectionRequest,
  onAcceptConnection,
  onRejectConnection,
  onReportUser,
  darkMode,
  onNavigate,
}: DiscoverySectionProps) {
  // Navigation tab
  const [activeSubView, setActiveSubView] = useState<'directory' | 'lookingFor'>('directory');

  // Bulletin Board state
  const [bulletins, setBulletins] = useState<BulletinCard[]>(() => {
    const saved = localStorage.getItem('network_bulletins_v3');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'b-1',
        studentId: 'user-2', // Chloe
        category: 'Looking for Co-Founder',
        title: 'Hardware/VLSI expert for drone reforestation MVP 🌲🤖',
        content: 'We have fully completed deep-learning seed segmentation on Edge TPU. Seeking a hardware/IoT developer who understands Altium designs, brushless motors, and ROS.',
        createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
        bulletinImage: "https://images.unsplash.com/photo-1508962914676-134849a727f0?w=600&auto=format&fit=crop&q=60"
      },
      {
        id: 'b-2',
        studentId: 'user-1', // Aravind
        category: 'Looking for Study Partner',
        title: 'Algorithms study partner to finish CSES questions 🧠',
        content: 'Preparing for global algorithmic challenges. Looking for someone committed to solving 2 medium/hard dynamic-programming or graph problems daily and outlining solutions.',
        createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        bulletinImage: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&auto=format&fit=crop&q=60"
      },
      {
        id: 'b-3',
        studentId: 'user-4', // Jasmine
        category: 'Looking for Research Collaborator',
        title: 'Frugal NLP pricing tokenization research partner 📊',
        content: 'Drafting an empirical survey on low-parameter model quantization behavior in resource-constrained environments. Looking for computer-science or statistics assistants.',
        createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString()
      },
      {
        id: 'b-4',
        studentId: 'user-6', // Ananya
        category: 'Looking for Hackathon Team',
        title: 'Full-stack UI designer for Smart India Hackathon (SIH) 🎨',
        content: 'We have assembled a rigorous 3-student team of database and server architects. Seeking a Figma and frontend specialist to code pristine user interfaces.',
        createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        bulletinImage: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600&auto=format&fit=crop&q=60"
      }
    ];
  });

  // Creation of listing state
  const [showAddBulletinForm, setShowAddBulletinForm] = useState(false);
  const [bulletinCategory, setBulletinCategory] = useState<BulletinCard['category']>('Looking for Study Partner');
  const [bulletinTitle, setBulletinTitle] = useState('');
  const [bulletinContent, setBulletinContent] = useState('');
  const [bulletinImage, setBulletinImage] = useState('');

  // Feed/bulletin filter options
  const [lookingForFilter, setLookingForFilter] = useState('');

  // Persist Bulletins
  useEffect(() => {
    localStorage.setItem('network_bulletins_v3', JSON.stringify(bulletins));
  }, [bulletins]);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCollege, setFilterCollege] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [selectedInterest, setSelectedInterest] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('');
  const [selectedLookingFor, setSelectedLookingFor] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'best-match' | 'new-this-week' | 'saved'>('best-match');
  const [savedUserIds, setSavedUserIds] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('discovery_saved_users') || '[]')); } catch { return new Set(); }
  });
  const [quickYear, setQuickYear] = useState('');
  const [quickCategory, setQuickCategory] = useState('');

  // Active user details to preview as modal/drawer
  const [previewUser, setPreviewUser] = useState<UserProfile | null>(null);
  const [previewInterestsExpanded, setPreviewInterestsExpanded] = useState<boolean>(false);
  const [previewLookingForExpanded, setPreviewLookingForExpanded] = useState<boolean>(false);

  useEffect(() => {
    setPreviewInterestsExpanded(false);
    setPreviewLookingForExpanded(false);
  }, [previewUser?.id]);

  // Connect Request Modal configuration
  const [connectModalUser, setConnectModalUser] = useState<UserProfile | null>(null);
  const [connectType, setConnectType] = useState<'Startup Discussion' | 'Friendship' | 'Study Partner' | 'Hackathon Team'>('Friendship');
  const [connectMessage, setConnectMessage] = useState('');

  // Report Modal configuration
  const [reportModalUser, setReportModalUser] = useState<UserProfile | null>(null);
  const [reportReason, setReportReason] = useState('Spam');
  const [reportDescription, setReportDescription] = useState('');

  // Premium custom banner notifications to avoid ugly iframe-unfriendly alert() calls
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Collect options dynamically from existing user bases
  const allColleges = Array.from(new Set(allUsers.map(u => u.college))).filter(Boolean);
  const allBranches = Array.from(new Set(allUsers.map(u => u.branch))).filter(Boolean);

  const UNIQUE_INTERESTS = [
    'Startups', 'AI/ML', 'Coding', 'Design', 'Finance', 'Entrepreneurship', 'Research', 'Higher Studies', 'Placement Preparation', 'Sports', 'Music', 'Gaming', 'Photography'
  ];

  const UNIQUE_SKILLS = [
    'React', 'Python', 'UI/UX', 'Marketing', 'Video Editing', 'C++', 'Data Structures', 'PyTorch', 'Figma', 'Embedded Systems'
  ];

  const UNIQUE_LOOKING_FOR = [
    'Friends', 'Study Partner', 'Startup Co-Founder', 'Hackathon Team', 'Mentor', 'Career Guidance', 'Research Collaborator', 'Project Partner'
  ];

  // Connection checking auxiliary logic
  const checkConnectionStatus = (userId: string) => {
    const conn = connections.find(c => 
      (c.senderId === currentUser.id && c.receiverId === userId) ||
      (c.senderId === userId && c.receiverId === currentUser.id)
    );
    return conn;
  };

  // Match score (0–100)
  const getMatchScore = (u: UserProfile): number => {
    let score = 0;
    const sharedInterests = u.interests.filter(i => currentUser.interests.includes(i)).length;
    const sharedSkills = u.skills.filter(s => currentUser.skills.includes(s)).length;
    const sharedLookingFor = u.lookingFor.filter(l => currentUser.lookingFor.includes(l)).length;
    score += Math.min(sharedInterests * 15, 45);
    score += Math.min(sharedSkills * 10, 25);
    score += Math.min(sharedLookingFor * 15, 30);
    if (u.year === currentUser.year) score += 10;
    if (u.college === currentUser.college) score += 10;
    // baseline so no-overlap users still show a number
    score = Math.max(score, 22);
    return Math.min(score, 100);
  };

  const toggleSaved = (userId: string) => {
    setSavedUserIds(prev => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      localStorage.setItem('discovery_saved_users', JSON.stringify([...next]));
      return next;
    });
  };

  // Filter pipeline
  const filteredStudents = (() => {
    const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
    let list = allUsers.filter(u => {
      if (u.id === currentUser.id) return false;
      if (u.isSuspended) return false;
      if (u.privacySettings.hideProfileFromSearch) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!u.fullName.toLowerCase().includes(q) && !u.college.toLowerCase().includes(q) && !u.branch.toLowerCase().includes(q)) return false;
      }

      if (filterCollege && u.college !== filterCollege) return false;
      if (filterBranch && u.branch !== filterBranch) return false;
      // quick year pill OR advanced year dropdown
      const effectiveYear = quickYear || filterYear;
      if (effectiveYear && u.year !== Number(effectiveYear)) return false;
      if (selectedInterest && !u.interests.includes(selectedInterest)) return false;
      if (selectedSkill && !u.skills.includes(selectedSkill)) return false;
      // quick category pill OR advanced looking-for dropdown
      const effectiveLF = quickCategory || selectedLookingFor;
      if (effectiveLF && !u.lookingFor.includes(effectiveLF)) return false;

      if (sortBy === 'saved') return savedUserIds.has(u.id);
      if (sortBy === 'new-this-week') {
        const created = u.createdAt ? new Date(u.createdAt).getTime() : 0;
        return Date.now() - created < ONE_WEEK;
      }

      return true;
    });

    if (sortBy === 'best-match') {
      list = [...list].sort((a, b) => getMatchScore(b) - getMatchScore(a));
    }

    return list;
  })();

  const handleSendRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectModalUser) return;
    onSendConnectionRequest(connectModalUser.id, connectType, connectMessage);
    const peerName = connectModalUser.fullName;
    setConnectModalUser(null);
    setConnectMessage('');
    showNotification(`Successfully sent a collaboration invite to ${peerName}!`);
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportModalUser) return;
    onReportUser(reportModalUser.id, reportReason, reportDescription);
    const peerName = reportModalUser.fullName;
    setReportModalUser(null);
    setReportDescription('');
    showNotification(`Report received. Core administration will review ${peerName}'s details immediately.`, 'info');
  };

  // Active Connection Requests Pane
  const pendingRequestsReceived = connections.filter(
    c => c.receiverId === currentUser.id && c.status === 'pending'
  );

  const resetFilters = () => {
    setSearchQuery('');
    setFilterCollege('');
    setFilterBranch('');
    setFilterYear('');
    setSelectedInterest('');
    setSelectedSkill('');
    setSelectedLookingFor('');
  };

  return (
    <div className="space-y-6">
      
      {/* Visual Success/Info notification bar */}
      {notification && (
        <div className={`p-4 rounded-xl border flex items-center justify-between shadow-xs transition-all ${notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-700 dark:text-indigo-400'}`}>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Sparkles size={14} className="text-indigo-500" />
            <span>{notification.message}</span>
          </div>
          <button type="button" onClick={() => setNotification(null)} className="text-[10px] font-bold uppercase tracking-wider opacity-60 hover:opacity-100 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* MATCH MAKING SUB-VIEWS TAB BAR */}
      <div className="flex border-b border-neutral-200 dark:border-white/10 pb-1 mt-1 gap-6 text-left">
        <button
          id="btn-tab-directory"
          type="button"
          onClick={() => setActiveSubView('directory')}
          className={`pb-2.5 text-xs uppercase font-extrabold tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubView === 'directory'
              ? 'border-indigo-500 text-indigo-700 dark:text-indigo-400 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <Search size={14} /> Peer Search Directory
        </button>
        <button
          id="btn-tab-looking-for"
          type="button"
          onClick={() => setActiveSubView('lookingFor')}
          className={`pb-2.5 text-xs uppercase font-extrabold tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubView === 'lookingFor'
              ? 'border-indigo-500 text-indigo-700 dark:text-indigo-400 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <Users size={14} /> "Looking For" Matches <span className="bg-rose-500 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-normal">LIVE BULLETIN</span>
        </button>
      </div>

      {/* Pending Incoming Connection Requests Panel */}
      {pendingRequestsReceived.length > 0 && (
        <div className={`p-5 rounded-2xl border border-neutral-200 dark:border-white/10 shadow-sm ${darkMode ? 'bg-[#121217]' : 'bg-indigo-500/[0.02]'}`}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-1.5 border-b border-dashed border-neutral-200 dark:border-white/10 pb-2 font-sans">
            <Users size={14} className="text-indigo-500" /> Connection Requests ({pendingRequestsReceived.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingRequestsReceived.map((req) => {
              const sender = allUsers.find(u => u.id === req.senderId);
              if (!sender) return null;
              return (
                <div
                  id={`req-card-${req.id}`}
                  key={req.id}
                  className={`p-4 rounded-xl border border-neutral-200 dark:border-white/10 flex flex-col justify-between gap-3 text-xs transition-all shadow-xs ${darkMode ? 'bg-[#1a1a24]' : 'bg-white'}`}
                >
                  <div className="flex items-start gap-3 text-left">
                    <div className="p-[2px] rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-600 shrink-0">
                      <div className={`w-9 h-9 rounded-full border border-white dark:border-[#1a1a24] flex items-center justify-center font-bold text-xs overflow-hidden ${darkMode ? 'bg-zinc-900 text-white' : 'bg-slate-100 text-slate-900'}`}>
                        <Avatar avatar={sender.avatar} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 truncate">{sender.fullName}</h4>
                      <p className="text-[10px] font-mono text-neutral-400">
                        {sender.college} • {sender.branch}
                      </p>
                      <span className="inline-block mt-1 bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/25 dark:text-indigo-400 text-[8px] font-bold uppercase tracking-wider py-0.5 px-2.5 rounded-full">
                        {req.type}
                      </span>
                      {req.message && (
                        <p className={`mt-2 p-2.5 rounded-lg italic text-[10px] border-l-2 border-indigo-600 ${darkMode ? 'bg-zinc-900 text-zinc-300' : 'bg-neutral-50 text-neutral-600'}`}>
                          "{req.message}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end">
                    <button
                      id={`btn-reject-req-${req.id}`}
                      onClick={() => onRejectConnection(req.id)}
                      className="py-1 px-3 rounded-lg border border-neutral-200 dark:border-white/10 hover:bg-rose-500/10 text-rose-500 text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors"
                    >
                      Decline
                    </button>
                    <button
                      id={`btn-accept-req-${req.id}`}
                      onClick={() => onAcceptConnection(req.id)}
                      className="py-1 px-3.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors"
                    >
                      Accept
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeSubView === 'directory' && (
        <>
          {/* Advanced Filter Header */}
          <div className={`p-5 rounded-2xl border border-neutral-200 dark:border-white/10 text-left shadow-sm ${darkMode ? 'bg-[#121217]' : 'bg-white'}`}>
        <div className={`flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 ${showAdvancedFilters ? 'mb-5' : 'mb-0'}`}>
          <div className="relative flex-1 text-left">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search size={14} />
            </span>
            <input
              id="search-explore-input"
              type="text"
              placeholder="Search directory by name, university, or academic branch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${darkMode ? 'bg-[#09090C] text-[#F9F7F2]' : 'bg-[#FFF] text-[#1A1A1A]'}`}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-toggle-advanced-filters"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`py-2 px-4 rounded-xl border font-bold uppercase tracking-wider text-[10.5px] inline-flex items-center justify-center gap-2 cursor-pointer transition-all ${
                showAdvancedFilters
                  ? 'bg-indigo-500 text-white border-indigo-500 hover:bg-indigo-600'
                  : darkMode
                  ? 'bg-[#09090C] hover:bg-zinc-800 text-slate-300 border-neutral-200 dark:border-white/10'
                  : 'bg-[#FFF] hover:bg-neutral-50 text-slate-700 border-neutral-200'
              }`}
            >
              <Filter size={11.5} />
              <span>{showAdvancedFilters ? 'Hide Filters' : 'Filter Options'}</span>
              {[filterCollege, filterBranch, filterYear, selectedInterest, selectedSkill, selectedLookingFor].filter(Boolean).length > 0 && (
                <span className={`inline-flex items-center justify-center w-4 h-4 text-[9px] font-black rounded-full ${showAdvancedFilters ? 'bg-white text-indigo-500' : 'bg-indigo-500 text-white'}`}>
                  {[filterCollege, filterBranch, filterYear, selectedInterest, selectedSkill, selectedLookingFor].filter(Boolean).length}
                </span>
              )}
            </button>

            <button
              id="btn-reset-filters"
              onClick={resetFilters}
              className={`py-2 px-4 rounded-xl border border-neutral-200 dark:border-white/10 text-[10.5px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all ${darkMode ? 'bg-[#09090C] hover:bg-zinc-800 text-slate-300' : 'bg-white hover:bg-neutral-50 text-slate-600'}`}
            >
              <RefreshCw size={11} className="text-indigo-500" /> Clear
            </button>
          </div>
        </div>

        {/* Dynamic drop selectors */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs text-left pt-4 border-t border-dashed border-neutral-200 dark:border-white/5">
            <div>
              <label className="block text-[8px] font-bold uppercase tracking-widest mb-1 text-slate-400 dark:text-slate-500">University</label>
              <select
                id="filter-college"
                value={filterCollege}
                onChange={(e) => setFilterCollege(e.target.value)}
                className={`w-full px-2 py-1.5 rounded-lg border border-neutral-200 dark:border-white/10 focus:outline-none cursor-pointer ${darkMode ? 'bg-[#09090C] text-slate-300' : 'bg-[#FFF] text-neutral-800'}`}
              >
                <option value="">All Colleges</option>
                {allColleges.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[8px] font-bold uppercase tracking-widest mb-1 text-slate-400 dark:text-slate-500">Department</label>
              <select
                id="filter-branch"
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                className={`w-full px-2 py-1.5 rounded-lg border border-neutral-200 dark:border-white/10 focus:outline-none cursor-pointer ${darkMode ? 'bg-[#09090C] text-slate-300' : 'bg-[#FFF] text-neutral-800'}`}
              >
                <option value="">All Branches</option>
                {allBranches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[8px] font-bold uppercase tracking-widest mb-1 text-slate-400 dark:text-slate-500">Study Year</label>
              <select
                id="filter-year"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className={`w-full px-2 py-1.5 rounded-lg border border-neutral-200 dark:border-white/10 focus:outline-none cursor-pointer ${darkMode ? 'bg-[#09090C] text-slate-300' : 'bg-[#FFF] text-neutral-800'}`}
              >
                <option value="">All Years</option>
                <option value="1">1st Yr (Freshman)</option>
                <option value="2">2nd Yr (Sophomore)</option>
                <option value="3">3rd Yr (Junior)</option>
                <option value="4">4th Yr (Senior)</option>
                <option value="5">Postgrad / Fellow</option>
              </select>
            </div>

            <div>
              <label className="block text-[8px] font-bold uppercase tracking-widest mb-1 text-slate-400 dark:text-slate-500">Interests</label>
              <select
                id="filter-interest"
                value={selectedInterest}
                onChange={(e) => setSelectedInterest(e.target.value)}
                className={`w-full px-2 py-1.5 rounded-lg border border-neutral-200 dark:border-white/10 focus:outline-none cursor-pointer ${darkMode ? 'bg-[#09090C] text-slate-300' : 'bg-[#FFF] text-neutral-800'}`}
              >
                <option value="">Any Interest</option>
                {UNIQUE_INTERESTS.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[8px] font-bold uppercase tracking-widest mb-1 text-slate-400 dark:text-slate-500">Hard Skills</label>
              <select
                id="filter-skill"
                value={selectedSkill}
                onChange={(e) => setSelectedSkill(e.target.value)}
                className={`w-full px-2 py-1.5 rounded-lg border border-neutral-200 dark:border-white/10 focus:outline-none cursor-pointer ${darkMode ? 'bg-[#09090C] text-slate-300' : 'bg-[#FFF] text-neutral-800'}`}
              >
                <option value="">Any Skill</option>
                {UNIQUE_SKILLS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[8px] font-bold uppercase tracking-widest mb-1 text-slate-400 dark:text-slate-500">Goals</label>
              <select
                id="filter-lookingFor"
                value={selectedLookingFor}
                onChange={(e) => setSelectedLookingFor(e.target.value)}
                className={`w-full px-2 py-1.5 rounded-lg border border-neutral-200 dark:border-white/10 focus:outline-none cursor-pointer ${darkMode ? 'bg-[#09090C] text-slate-300' : 'bg-[#FFF] text-neutral-800'}`}
              >
                <option value="">Any Purpose</option>
                {UNIQUE_LOOKING_FOR.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Sort bar + Quick filter pills */}
      <div className="space-y-3">
        {/* Sort row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[9px] font-extrabold uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>SORT:</span>
          {(['best-match', 'new-this-week', 'saved'] as const).map((s) => {
            const labels: Record<typeof s, string> = { 'best-match': '★ Best Match', 'new-this-week': '↗ New This Week', 'saved': '🔖 Saved' };
            const active = sortBy === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSortBy(s)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${active ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm' : darkMode ? 'bg-transparent border-white/10 text-slate-400 hover:border-white/20' : 'bg-white border-neutral-200 text-slate-600 hover:border-neutral-300'}`}
              >
                {labels[s]}
              </button>
            );
          })}
        </div>

        {/* Quick filter pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[9px] font-extrabold uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>QUICK:</span>
          {(['1','2','3','4'] as const).map(yr => {
            const active = quickYear === yr;
            return (
              <button key={yr} type="button" onClick={() => setQuickYear(active ? '' : yr)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${active ? 'bg-indigo-500 text-white border-indigo-500' : darkMode ? 'bg-transparent border-white/10 text-slate-400 hover:border-white/20' : 'bg-white border-neutral-200 text-slate-600 hover:bg-neutral-50'}`}>
                Yr {yr}
              </button>
            );
          })}
          {(['Friends','Study Partner','Startup Co-Founder','Hackathon Team'] as const).map(cat => {
            const active = quickCategory === cat;
            return (
              <button key={cat} type="button" onClick={() => setQuickCategory(active ? '' : cat)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${active ? 'bg-indigo-500 text-white border-indigo-500' : darkMode ? 'bg-transparent border-white/10 text-slate-400 hover:border-white/20' : 'bg-white border-neutral-200 text-slate-600 hover:bg-neutral-50'}`}>
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* FROM YOUR COLLEGE section */}
      {(() => {
        const collegepeers = filteredStudents.filter(u => u.college && u.college.trim().toLowerCase() === currentUser.college?.trim().toLowerCase());
        if (!currentUser.college || collegepeers.length === 0) return null;
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users size={13} className="text-indigo-500 shrink-0" />
              <span className={`text-[10px] font-extrabold uppercase tracking-widest ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                From Your College · {currentUser.college}
              </span>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${darkMode ? 'bg-indigo-500/15 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                {collegepeers.length} peer{collegepeers.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 overflow-x-auto">
              {collegepeers.slice(0, 6).map(student => {
                const rel = checkConnectionStatus(student.id);
                const score = getMatchScore(student);
                return (
                  <div key={student.id} className={`p-3.5 rounded-2xl border flex flex-col gap-2.5 ${darkMode ? 'bg-[#121217] border-white/10' : 'bg-white border-neutral-200'}`}>
                    <div className="flex items-center gap-2">
                      <div className="relative shrink-0">
                        <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center font-bold text-xs bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                          <Avatar avatar={student.avatar} />
                        </div>
                        <span className={`absolute -bottom-1 -right-1 text-[8px] font-black px-1 py-0.5 rounded-full leading-none ${score >= 70 ? 'bg-indigo-500 text-white' : 'bg-neutral-200 text-slate-600'}`}>{score}%</span>
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{student.fullName}</p>
                        <p className={`text-[9px] truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{getEducationDisplay(student).compact}</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      {!rel ? (
                        <button onClick={() => setConnectModalUser(student)}
                          className="flex-1 py-1 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-[9px] font-bold uppercase cursor-pointer transition-colors text-center">
                          + Connect
                        </button>
                      ) : rel.status === 'accepted' ? (
                        <button onClick={() => onNavigate?.('messages', student.id)}
                          className="flex-1 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold uppercase cursor-pointer transition-colors flex items-center justify-center gap-1">
                          <MessageCircle size={10} /> Message
                        </button>
                      ) : rel.status === 'pending' && rel.senderId === currentUser.id ? (
                        <span className="flex-1 py-1 rounded-lg border border-dashed border-amber-400/40 text-amber-600 dark:text-amber-400 text-[9px] font-bold uppercase text-center">Pending</span>
                      ) : (
                        <button onClick={() => onAcceptConnection(rel.id)}
                          className="flex-1 py-1 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-[9px] font-bold uppercase cursor-pointer transition-colors text-center">
                          Accept
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Directory Grid output */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStudents.length === 0 ? (
          <div className={`col-span-full p-12 text-center rounded-2xl border border-neutral-200 dark:border-white/10 ${darkMode ? 'bg-[#121217]' : 'bg-white'}`}>
            <AlertCircle className="mx-auto text-neutral-400 mb-2" size={28} />
            <h4 className="text-sm font-bold uppercase tracking-widest mb-1">No Academic Peers Matched</h4>
            <p className={`text-xs max-w-sm mx-auto ${darkMode ? 'text-zinc-500' : 'text-neutral-500'}`}>
              Try expanding your branch scope, clearing selected skills, or resetting filter toggles to search worldwide.
            </p>
          </div>
        ) : (
          filteredStudents.map((student) => {
            const relationship = checkConnectionStatus(student.id);
            const mutualInterests = student.interests.filter(i => currentUser.interests.includes(i));
            const mutualSkills = student.skills.filter(s => currentUser.skills.includes(s));
            const totalOverlaps = mutualInterests.length + mutualSkills.length;

            return (
              <div
                id={`student-explore-card-${student.id}`}
                key={student.id}
                className={`p-5 rounded-2xl border border-neutral-200/80 dark:border-white/10 flex flex-col justify-between gap-4 text-left shadow-xs transition-all hover:shadow-md ${darkMode ? 'bg-[#121217] hover:bg-[#1C1C24]' : 'bg-white hover:bg-neutral-50/20'}`}
              >
                {/* Header */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-2.5">
                      <div className="p-[2px] rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-600 shrink-0">
                        <div className={`w-11 h-11 rounded-full border border-white dark:border-[#121217] flex items-center justify-center font-bold text-sm overflow-hidden ${darkMode ? 'bg-zinc-900 text-white' : 'bg-slate-100 text-slate-900'}`}>
                          <Avatar avatar={student.avatar} />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold flex flex-wrap items-center gap-1 text-slate-800 dark:text-slate-100 font-sans">
                          <span className="truncate">{student.fullName}</span>
                          {student.isVerified && (
                            <span className="py-0.5 px-1.5 rounded-full text-[7px] font-mono font-bold uppercase bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                              VERIFIED
                            </span>
                          )}
                          {totalOverlaps > 0 && (
                            <span id={`student-overlap-${student.id}`} className="py-0.5 px-1.5 rounded-full text-[7px] font-mono font-bold uppercase bg-gradient-to-r from-violet-500/10 to-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5 border border-indigo-500/10 shrink-0 select-none">
                              <Sparkles size={8} className="text-indigo-500 animate-pulse" />
                              {totalOverlaps} Overlaps
                            </span>
                          )}
                        </h4>
                        <p className="text-[10px] font-serif font-bold text-neutral-500 dark:text-neutral-400 mt-0.5 max-w-[155px] truncate">
                          {student.college}
                        </p>
                        <p className="text-[10px] font-mono opacity-60">
                          {getEducationDisplay(student).compact}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => toggleSaved(student.id)}
                        className={`p-1.5 rounded-full cursor-pointer transition-colors ${savedUserIds.has(student.id) ? 'text-indigo-500 bg-indigo-500/10' : 'text-neutral-400 hover:text-indigo-500 hover:bg-indigo-500/10'}`}
                        title={savedUserIds.has(student.id) ? 'Unsave' : 'Save'}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill={savedUserIds.has(student.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                      </button>
                      <button
                        id={`btn-flag-${student.id}`}
                        onClick={() => setReportModalUser(student)}
                        className="p-1.5 rounded-full text-neutral-400 hover:text-red-500 hover:bg-red-500/10 cursor-pointer transition-colors"
                        title="Report / Flag User"
                      >
                        <Flag size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Match percentage bar */}
                  {(() => {
                    const score = getMatchScore(student);
                    return (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                            ⚡ MATCH
                          </span>
                          <span className={`text-[11px] font-black ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>{score}%</span>
                        </div>
                        <div className={`h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-white/10' : 'bg-neutral-100'}`}>
                          <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all" style={{ width: `${score}%` }} />
                        </div>
                        {(() => {
                          const reasons: string[] = [];
                          if (student.year === currentUser.year) reasons.push(`Both Yr ${student.year}`);
                          const sharedInt = student.interests.filter(i => currentUser.interests.includes(i));
                          if (sharedInt.length > 0) reasons.push(`Shares ${sharedInt[0]}`);
                          const sharedLF = student.lookingFor.filter(l => currentUser.lookingFor.includes(l));
                          if (sharedLF.length > 0) reasons.push(`Both know ${sharedLF[0]}`);
                          const sharedSk = student.skills.filter(s => currentUser.skills.includes(s));
                          if (sharedSk.length > 0) reasons.push(`Both know ${sharedSk[0]}`);
                          return reasons.length > 0 ? (
                            <p className={`text-[9px] truncate ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{reasons.slice(0,3).join(' · ')}</p>
                          ) : null;
                        })()}
                      </div>
                    );
                  })()}

                  <p className={`text-xs italic leading-relaxed py-0.5 line-clamp-2 ${darkMode ? 'text-slate-300' : 'text-neutral-600'}`}>
                    "{student.aboutMe}"
                  </p>

                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {student.lookingFor.slice(0, 2).map(lf => (
                        <span key={lf} className="text-[8px] font-extrabold uppercase py-0.5 px-2.5 rounded-full border border-indigo-600/15 text-indigo-700 dark:text-indigo-400 dark:bg-indigo-500/5">
                          {lf}
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {student.skills.slice(0, 3).map(skill => (
                        <span key={skill} className={`text-[8.5px] font-semibold py-0.5 px-2 rounded-full border ${darkMode ? 'bg-[#09090C] border-white/5 text-zinc-400' : 'bg-neutral-50 border-neutral-100 text-neutral-600'}`}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer and Connection CTA Trigger */}
                <div className="pt-3.5 border-t border-dashed border-neutral-200 dark:border-white/5 flex items-center justify-between gap-2 text-xs">
                  <button
                    id={`btn-peek-${student.id}`}
                    onClick={() => setPreviewUser(student)}
                    className={`py-1.5 px-3 rounded-xl border border-neutral-200 dark:border-white/10 text-[10px] uppercase font-bold flex items-center gap-1 cursor-pointer transition-all ${darkMode ? 'bg-[#09090C] hover:bg-neutral-800 text-slate-300' : 'bg-white hover:bg-neutral-100 text-slate-600'}`}
                  >
                    <Eye size={12} className="text-violet-600" /> View Profile
                  </button>

                  {!relationship ? (
                    <button
                      id={`btn-connect-${student.id}`}
                      onClick={() => setConnectModalUser(student)}
                      className="py-1.5 px-3.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                    >
                      + Connect
                    </button>
                  ) : relationship.status === 'accepted' ? (
                    <button
                      onClick={() => onNavigate?.('messages', student.id)}
                      className="inline-flex items-center gap-1 py-1.5 px-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 text-[9px] uppercase font-bold tracking-wider cursor-pointer hover:bg-emerald-500/20 transition-colors"
                    >
                      <MessageCircle size={11} /> Message
                    </button>
                  ) : relationship.status === 'pending' && relationship.senderId === currentUser.id ? (
                    <span className="inline-flex items-center gap-1 py-1 px-3 text-[9px] font-semibold uppercase tracking-wider border border-dashed border-amber-400/50 dark:border-amber-400/30 text-amber-600 dark:text-amber-400 rounded-xl bg-amber-500/5">
                      Request Sent
                    </span>
                  ) : (
                    <button
                      id={`btn-accept-incoming-${student.id}`}
                      onClick={() => onAcceptConnection(relationship.id)}
                      className="py-1.5 px-3.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      Accept Invite
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  )}

  {/* MATCHMAKING BULLETIN BOARD SUBVIEW */}
  {activeSubView === 'lookingFor' && (
    <div className="space-y-6 text-left animate-fadeIn">
      
      {/* Dashboard Header Panel */}
      <div className={`p-6 rounded-2xl border border-neutral-200 dark:border-white/10 ${darkMode ? 'bg-[#121217]' : 'bg-white'}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5 font-bold">
              <Sparkles size={16} className="text-violet-500" /> Matchmaking Bulletin Board
            </h3>
            <p className={`text-xs mt-1 max-w-2xl leading-relaxed ${darkMode ? 'text-slate-400' : 'text-neutral-500'}`}>
              Post your micro-requests to find Friends, Co-Founders, Study Partners, or Hackathon Competitors across 200+ universities in India. Straight to the point, zero fluff.
            </p>
          </div>

          <button
            id="btn-trigger-publish-bulletin"
            type="button"
            onClick={() => {
              setShowAddBulletinForm(!showAddBulletinForm);
              setBulletinTitle('');
              setBulletinContent('');
            }}
            className="py-2 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shrink-0 self-start md:self-center"
          >
            <Plus size={14} /> {showAddBulletinForm ? 'Close Dispatch Form' : 'Publish Request'}
          </button>
        </div>

        {/* Inlined Add Bulletin Form inside collapsible wrapper */}
        {showAddBulletinForm && (
          <div className="mt-6 pt-5 border-t border-dashed border-neutral-200 dark:border-white/10 text-xs text-left animate-fadeIn">
            <h4 className="font-extrabold uppercase text-[10px] tracking-widest text-[#8F8F9F] mb-4 flex items-center gap-1">
              🎯 New Match Dispatch Listing
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-500">I am looking to find...</label>
                  <select
                    id="bulletin-category-select"
                    value={bulletinCategory}
                    onChange={(e: any) => setBulletinCategory(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 focus:outline-none cursor-pointer ${darkMode ? 'bg-zinc-900 text-slate-300' : 'bg-white text-neutral-800'}`}
                  >
                    <option value="Looking for Friends">Looking for Friends</option>
                    <option value="Looking for Co-Founder">Looking for Co-Founder</option>
                    <option value="Looking for Study Partner">Looking for Study Partner</option>
                    <option value="Looking for Hackathon Team">Looking for Hackathon Team</option>
                    <option value="Looking for Mentor">Looking for Mentor</option>
                    <option value="Looking for Research Collaborator">Looking for Research Collaborator</option>
                    <option value="Looking for Internship Referral">Looking for Internship Referral</option>
                    <option value="Looking for Project Partner">Looking for Project Partner</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-500">Title / Subject Pitch</label>
                  <input
                    id="bulletin-title-input"
                    type="text"
                    placeholder="e.g. Need frontend hacker for Smart India Hackathon tier-1 🚀"
                    value={bulletinTitle}
                    onChange={(e) => setBulletinTitle(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 focus:outline-none ${darkMode ? 'bg-zinc-900 text-white' : 'bg-white text-neutral-800'}`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-500">Full Description & Pitch</label>
                <textarea
                  id="bulletin-content-input"
                  rows={4}
                  placeholder="Be specific! Mention your university, current stack, tech preferences, and any specific goals you have so students can pitch themselves directly."
                  value={bulletinContent}
                  onChange={(e) => setBulletinContent(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 focus:outline-none ${darkMode ? 'bg-zinc-900 text-white' : 'bg-white text-slate-950'}`}
                />
              </div>
            </div>

            {/* Visual Attachment Uploader for Match Card */}
            <div className="mt-3.5 p-3.5 rounded-2xl border border-neutral-100 dark:border-white/5 bg-neutral-500/[0.02] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#8F8F9F] flex items-center gap-1.5">
                  <ImageIcon size={13} className="text-pink-500" />
                  <span>Attach Startup Photo / Pitch Visual Graphic</span>
                </span>
                {bulletinImage && (
                  <button
                    type="button"
                    onClick={() => setBulletinImage('')}
                    className="text-[9.5px] font-extrabold text-red-500 hover:underline uppercase cursor-pointer border-0 bg-transparent"
                  >
                    Remove Visual
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                {/* File Upload Selector and Preset selection */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <label 
                      htmlFor="bulletin-visual-file"
                      className="flex-1 py-1.5 px-3 rounded-lg border border-neutral-200 dark:border-white/10 flex items-center justify-center gap-1.5 font-bold uppercase text-[9px] cursor-pointer hover:bg-neutral-500/5 text-slate-800 dark:text-zinc-300 transition-all border-dashed"
                    >
                      <Plus size={12} />
                      <span>Upload Photo File</span>
                    </label>
                    <input
                      id="bulletin-visual-file"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 8 * 1024 * 1024) {
                            alert('This photo is larger than 8MB. Please use a smaller visual.');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setBulletinImage(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </div>

                  <div>
                    <input
                      id="bulletin-visual-url"
                      type="text"
                      placeholder="Or paste any custom startup photo URL..."
                      value={bulletinImage.startsWith('data:image/') ? '[Custom visual photo file uploaded]' : bulletinImage}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val !== '[Custom visual photo file uploaded]') {
                          setBulletinImage(val);
                        }
                      }}
                      className={`w-full px-3 py-1.5 text-[9.5px] rounded-lg border border-neutral-300 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${darkMode ? 'bg-zinc-950/80 text-white' : 'bg-white text-slate-800'}`}
                    />
                  </div>

                  {/* High Quality Preset Suggestion quick buttons */}
                  <div className="flex flex-wrap gap-1 pt-1.5">
                    <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide self-center mr-1">Vibe presets:</span>
                    {[
                      { l: '💻 Tech / Code', u: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=500' },
                      { l: '🚀 Pitch Deck', u: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=500' },
                      { l: '🎨 Design Mock', u: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=500' },
                      { l: '🌿 Social Team', u: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=500' }
                    ].map((item) => (
                      <button
                        key={item.l}
                        type="button"
                        onClick={() => setBulletinImage(item.u)}
                        className="text-[8px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all border-0 cursor-pointer"
                      >
                        {item.l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Preview of Attached visual */}
                <div className="h-28 rounded-xl border border-dashed border-neutral-200 dark:border-white/15 overflow-hidden flex items-center justify-center relative bg-neutral-900/10">
                  {bulletinImage ? (
                    <img 
                      src={bulletinImage} 
                      alt="Match Pitch Preview" 
                      className="w-full h-full object-cover rounded-xl"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="text-center p-3">
                      <ImageIcon className="mx-auto text-neutral-400 mb-1" size={20} />
                      <span className="text-[8.5px] text-neutral-500 font-bold uppercase tracking-wider block">No pitch graphic attached</span>
                      <span className="text-[7.5px] text-neutral-500 block">This visual will appear prominently on the matchmaking board</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-4">
              <button
                id="btn-cancel-bulletin"
                type="button"
                onClick={() => {
                  setShowAddBulletinForm(false);
                  setBulletinTitle('');
                  setBulletinContent('');
                  setBulletinImage('');
                }}
                className={`py-1.5 px-3.5 rounded-xl border border-neutral-200 dark:border-white/10 font-bold uppercase text-[9px] tracking-wider cursor-pointer transition-colors ${darkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-neutral-100'}`}
              >
                Cancel
              </button>
              <button
                id="btn-save-bulletin"
                type="button"
                onClick={() => {
                  if (!bulletinTitle.trim() || !bulletinContent.trim()) {
                    showNotification('Please fill in both the title and description body first.', 'info');
                    return;
                  }
                  const newB: BulletinCard = {
                    id: 'b-' + Date.now(),
                    studentId: currentUser.id,
                    category: bulletinCategory,
                    title: bulletinTitle.trim(),
                    content: bulletinContent.trim(),
                    createdAt: new Date().toISOString(),
                    bulletinImage: bulletinImage || undefined
                  };
                  setBulletins(prev => [newB, ...prev]);
                  setShowAddBulletinForm(false);
                  setBulletinTitle('');
                  setBulletinContent('');
                  setBulletinImage('');
                  showNotification('Dynamic match card successfully broadcast worldwide!');
                }}
                className="py-1.5 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold uppercase text-[9px] tracking-wider cursor-pointer transition-colors shadow-xs"
              >
                Publish Dispatch
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Filter Ribbon */}
      <div className="flex flex-wrap items-center gap-1.5 py-1 text-xs">
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-2">Filter Board:</span>
        <button
          id="filter-bulletin-all"
          onClick={() => setLookingForFilter('')}
          className={`py-1 px-3 py-1.5 rounded-full text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer ${
            lookingForFilter === ''
              ? 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-500/20 font-bold'
              : `border ${darkMode ? 'border-white/5 text-slate-400 hover:bg-white/5' : 'border-neutral-200 text-slate-700 hover:bg-neutral-100'}`
          }`}
        >
          All Matches
        </button>
        {[
          'Looking for Friends',
          'Looking for Co-Founder',
          'Looking for Study Partner',
          'Looking for Hackathon Team',
          'Looking for Mentor',
          'Looking for Research Collaborator',
          'Looking for Internship Referral',
          'Looking for Project Partner'
        ].map(cat => (
          <button
            id={`filter-bulletin-${cat.toLowerCase().replace(/\s+/g, '-')}`}
            key={cat}
            onClick={() => setLookingForFilter(cat)}
            className={`py-1 px-3 py-1.5 rounded-full text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer ${
              lookingForFilter === cat
                ? 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-500/20 font-bold'
                : `border ${darkMode ? 'border-white/5 text-slate-400 hover:bg-white/5' : 'border-neutral-200 text-slate-700 hover:bg-neutral-100'}`
            }`}
          >
            {cat.replace('Looking for ', '')}
          </button>
        ))}
      </div>

      {/* Bulletins Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {bulletins
          .filter(b => lookingForFilter === '' || b.category === lookingForFilter)
          .map(b => {
            const owner = allUsers.find(u => u.id === b.studentId) || currentUser;
            const relationship = b.studentId === currentUser.id ? null : checkConnectionStatus(b.studentId);
            const isOwner = b.studentId === currentUser.id;

            // Category colored accent line helper
            let colorClass = 'border-l-indigo-500';
            if (b.category.includes('Co-Founder')) colorClass = 'border-l-rose-500';
            else if (b.category.includes('Hackathon')) colorClass = 'border-l-amber-500';
            else if (b.category.includes('Research')) colorClass = 'border-l-emerald-500';
            else if (b.category.includes('Friends')) colorClass = 'border-l-sky-500';
            else if (b.category.includes('Mentor')) colorClass = 'border-l-violet-500';
            else if (b.category.includes('Project')) colorClass = 'border-l-teal-500';

            return (
              <div
                id={`bulletin-card-${b.id}`}
                key={b.id}
                className={`p-5 rounded-2xl border-y border-r border-l-4 ${colorClass} border-neutral-200/80 dark:border-white/10 flex flex-col justify-between gap-4 text-left shadow-xs transition-all hover:shadow-md ${darkMode ? 'bg-[#121217]' : 'bg-white'}`}
              >
                <div className="space-y-3.5">
                  {/* Subtitle category tag and time */}
                  <div className="flex items-center justify-between text-[10px] font-mono border-b border-neutral-100 dark:border-white/5 pb-2">
                    <span className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      {b.category}
                    </span>
                    <span className="opacity-60">
                      {new Date(b.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  {/* Title pitch */}
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 leading-snug line-clamp-1">
                    {b.title}
                  </h4>

                  {/* Attached visual photo */}
                  {b.bulletinImage && (
                    <div className="w-full h-36 rounded-xl overflow-hidden shadow-xs border border-neutral-100 dark:border-white/5 animate-none">
                      <img 
                        src={b.bulletinImage} 
                        alt={b.title} 
                        className="w-full h-full object-cover transition-transform hover:scale-[1.03] duration-500"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  {/* Content of prompt */}
                  <p className={`text-xs leading-relaxed line-clamp-3 ${darkMode ? 'text-slate-300' : 'text-neutral-600'}`}>
                    {b.content}
                  </p>

                  {/* Creator Profile snippet */}
                  <div className="flex items-center gap-2.5 pt-1.5">
                    <div className={`w-8 h-8 rounded-full border border-neutral-200 dark:border-white/10 flex items-center justify-center font-bold text-xs overflow-hidden ${darkMode ? 'bg-[#1C1C24] text-white' : 'bg-neutral-50 text-slate-800'}`}>
                      <Avatar avatar={owner.avatar} />
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1">
                        {owner.fullName}
                        {owner.id === currentUser.id && <span className="text-[7px] font-mono px-1 rounded-sm bg-neutral-200 dark:bg-white/10 text-neutral-500">YOU</span>}
                      </h5>
                      <p className="text-[8px] font-sans opacity-60 truncate">
                        {owner.college} • {getEducationDisplay(owner).compact}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions bar */}
                <div className="pt-3 border-t border-dashed border-neutral-100 dark:border-white/5 flex items-center justify-between text-xs">
                  <button
                    id={`btn-bulletin-owner-${b.id}`}
                    onClick={() => setPreviewUser(owner)}
                    className={`py-1 px-3 rounded-xl border border-neutral-200 dark:border-[#1C1C24] text-[9px] uppercase font-bold flex items-center gap-1 cursor-pointer transition-colors ${darkMode ? 'bg-[#09090C] text-[#8F8F9F] hover:bg-neutral-800' : 'bg-[#fff] text-slate-600 hover:bg-neutral-100'}`}
                  >
                    <Eye size={11} /> View Bio
                  </button>

                  {isOwner ? (
                    <button
                      id={`btn-delete-bulletin-${b.id}`}
                      onClick={() => {
                        setBulletins(prev => prev.filter(x => x.id !== b.id));
                        showNotification('Bulletin listing successfully deleted from the global directory!');
                      }}
                      className="text-[9px] uppercase tracking-wider font-extrabold text-red-500 hover:underline cursor-pointer font-sans"
                    >
                      Delete Listing
                </button>
                  ) : !relationship ? (
                    <button
                      id={`btn-bulletin-connect-${b.id}`}
                      onClick={() => {
                        setConnectModalUser(owner);
                        // Set suitable connection category default matching the Bulletin Category
                        if (b.category.includes('Co-Founder')) {
                          setConnectType('Startup Discussion');
                          setConnectMessage(`Hey ${owner.fullName.split(' ')[0]}, I saw your matching bulletin request for "${b.title}" and would love to collaborate on your tech startup vision!`);
                        } else if (b.category.includes('Study Partner')) {
                          setConnectType('Study Partner');
                          setConnectMessage(`Hi ${owner.fullName.split(' ')[0]}, let's team up to study together! I saw your post on the matchmaking bulletin. Let's start prepping!`);
                        } else if (b.category.includes('Hackathon')) {
                          setConnectType('Hackathon Team');
                          setConnectMessage(`Hey ${owner.fullName.split(' ')[0]}, saw your SIH / hackathon teammate match posting. I have skills that fit in perfectly! let know!`);
                        } else {
                          setConnectType('Friendship');
                          setConnectMessage(`Hello ${owner.fullName.split(' ')[0]}, let's connect! Saw your campus request card on the bulletin board.`);
                        }
                      }}
                      className="py-1 px-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 cursor-pointer rounded-xl transition-colors shadow-xs"
                    >
                      Pitch & Connect
                    </button>
                  ) : relationship.status === 'accepted' ? (
                    <span className="inline-flex items-center gap-1 py-1 px-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 text-[9px] uppercase font-bold tracking-wider">
                      <ShieldCheck size={11} /> Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 py-1 px-3 text-[9px] font-semibold uppercase tracking-wider border border-dashed border-neutral-300 dark:border-white/10 text-neutral-400 rounded-xl">
                      Pending Matches
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        {bulletins.filter(b => lookingForFilter === '' || b.category === lookingForFilter).length === 0 && (
          <div className="col-span-full py-12 px-6 border-2 border-dashed border-neutral-200 dark:border-white/10 rounded-2xl text-center">
            <FileText size={24} className="mx-auto text-slate-400 dark:text-white/15 mb-2.5" />
            <h4 className="text-xs font-bold uppercase tracking-wider mb-1">No Listings Found Under Category</h4>
            <p className={`text-xs max-w-xs mx-auto ${darkMode ? 'text-zinc-500' : 'text-neutral-600'}`}>
              Help populate this global match network! Be the very first to dispatch an open request card.
            </p>
          </div>
        )}
      </div>
    </div>
  )}

      {/* MODAL 1: Connect Request Setup */}
      {connectModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={`w-full max-w-sm p-6 rounded-2xl border border-neutral-300 dark:border-white/10 shadow-xl text-left ${darkMode ? 'bg-[#121217] text-slate-100' : 'bg-white text-slate-900'}`}>
            <h3 className="font-bold text-sm tracking-widest uppercase mb-3 flex items-center gap-1.5 text-indigo-500">
              <Sparkles size={16} /> CONNECT PEER DISPATCH
            </h3>
            <p className="text-xs mb-4 leading-relaxed text-slate-500">
              Identify the collaboration purpose and pitch. Personalized dispatches maximize mutual campus matches and project team responses.
            </p>

            <form onSubmit={handleSendRequestSubmit} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block font-bold mb-1.5 uppercase tracking-wider text-[9px] text-[#8F8F9F]">Collaboration Type</label>
                <select
                  id="connect-type-select"
                  value={connectType}
                  onChange={(e: any) => setConnectType(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 focus:outline-none cursor-pointer ${darkMode ? 'bg-[#09090C] text-slate-300' : 'bg-[#FFF] text-neutral-800'}`}
                >
                  <option value="Friendship">Friendship & General Networking</option>
                  <option value="Study Partner">Study Partner & Placements</option>
                  <option value="Startup Discussion">Startup Discussion & Co-Founding</option>
                  <option value="Hackathon Team">Hackathon Teammate Match</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1.5 uppercase tracking-wider text-[9px] text-[#8F8F9F]">Outreach Dispatch Message</label>
                <textarea
                  id="connect-message-input"
                  rows={3}
                  placeholder={`Hi ${connectModalUser.fullName}, I saw your focus on edge systems and would love to collaborate...`}
                  value={connectMessage}
                  onChange={(e) => setConnectMessage(e.target.value)}
                  className={`w-full p-3 rounded-xl border border-neutral-200 dark:border-white/10 focus:outline-none resize-none ${darkMode ? 'bg-[#09090C] text-[#F9F7F2]' : 'bg-[#FFF] text-neutral-900'}`}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  id="btn-cancel-connect"
                  type="button"
                  onClick={() => setConnectModalUser(null)}
                  className={`py-1.5 px-4 rounded-xl border border-neutral-200 dark:border-white/10 font-bold uppercase text-[10px] tracking-wider cursor-pointer hover:bg-neutral-100 dark:hover:bg-zinc-800 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-connect"
                  type="submit"
                  className="py-1.5 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold uppercase text-[10px] tracking-wider flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                >
                  <Send size={12} /> Dispatch Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Academic Profile Full Details */}
      {previewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={`w-full max-w-lg p-6 rounded-2xl border border-neutral-300 dark:border-white/10 shadow-xl text-left ${darkMode ? 'bg-[#121217] text-slate-100' : 'bg-white text-slate-900'}`}>
            <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-dashed border-neutral-200 dark:border-white/5">
              <div className="p-[2px] rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-600">
                <div className={`w-12 h-12 rounded-full border border-white dark:border-[#121217] flex items-center justify-center font-bold text-sm overflow-hidden ${darkMode ? 'bg-zinc-900 text-white' : 'bg-slate-100 text-slate-900'}`}>
                  <Avatar avatar={previewUser.avatar} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm flex flex-wrap items-center gap-1.5 uppercase tracking-normal">
                  <span>{previewUser.fullName}</span>
                  {previewUser.isVerified && (
                    <span className="py-0.5 px-2 rounded-full text-[8px] font-mono font-bold uppercase bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                      VERIFIED ACADEMIC SEAT
                    </span>
                  )}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-500 font-semibold">{previewUser.college}</p>
                <p className="text-[11px] font-mono text-zinc-400">
                   {getEducationDisplay(previewUser).compact}
                </p>
                {previewUser.id !== currentUser.id && (previewUser.interests.filter(i => currentUser.interests.includes(i)).length + previewUser.skills.filter(s => currentUser.skills.includes(s)).length) > 0 && (
                  <div className="mt-1.5 inline-flex items-center gap-1 py-0.5 px-2 rounded-lg bg-gradient-to-r from-violet-500/15 to-indigo-500/15 border border-indigo-500/10 text-[9px] font-mono text-indigo-600 dark:text-indigo-400 uppercase font-extrabold select-none">
                    <Sparkles size={10} className="text-indigo-600 animate-pulse" />
                    <span>Match Index: {previewUser.interests.filter(i => currentUser.interests.includes(i)).length + previewUser.skills.filter(s => currentUser.skills.includes(s)).length} Shared Dimensions</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1 text-xs font-sans font-normal">
              <div>
                <h4 className="font-bold uppercase text-[9px] text-indigo-500 tracking-wider mb-1">Peer Bio Statement</h4>
                <p className={`leading-relaxed italic p-3.5 rounded-xl border border-neutral-200 dark:border-white/5 ${darkMode ? 'bg-[#09090C] text-zinc-300' : 'bg-neutral-50 text-neutral-700'}`}>
                  "{previewUser.aboutMe}"
                </p>
              </div>

              <div>
                <h4 className="font-bold uppercase text-[8px] text-slate-400 tracking-wider mb-1.5">Affiliated Interests</h4>
                <div className="flex flex-wrap gap-1.5 font-normal">
                  {(previewInterestsExpanded ? previewUser.interests : previewUser.interests.slice(0, 3)).map(i => {
                    const isShared = currentUser.interests.includes(i);
                    return (
                      <span
                        key={i}
                        className={`py-1 px-3 rounded-full border text-[10px] font-bold ${
                          isShared
                            ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-xs flex items-center gap-0.5'
                            : 'border-neutral-200 dark:border-white/5 bg-neutral-50 dark:bg-[#09090C] text-slate-500 dark:text-slate-500'
                        }`}
                      >
                        #{i} {isShared && <Sparkles size={8} className="text-indigo-600 shrink-0" />}
                      </span>
                    );
                  })}
                  {previewUser.interests.length > 3 && (
                    <button
                      onClick={() => setPreviewInterestsExpanded(!previewInterestsExpanded)}
                      className="py-1 px-3 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 transition-colors cursor-pointer select-none"
                    >
                      {previewInterestsExpanded ? 'Show Less' : `+ ${previewUser.interests.length - 3} More`}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-bold uppercase text-[8px] text-slate-400 tracking-wider mb-1.5">Technical Skills & Methods</h4>
                <div className="flex flex-wrap gap-1.5 font-normal">
                  {previewUser.skills.map(s => {
                    const isShared = currentUser.skills.includes(s);
                    return (
                      <span
                        key={s}
                        className={`py-1 px-3 rounded-full border text-[10px] font-bold ${
                          isShared
                            ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-xs flex items-center gap-0.5'
                            : 'border-neutral-200 dark:border-white/5 bg-neutral-50 dark:bg-[#09090C] text-slate-500 dark:text-slate-500'
                        }`}
                      >
                        {s} {isShared && <Sparkles size={8} className="text-indigo-600 shrink-0" />}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 className="font-bold uppercase text-[8px] text-slate-400 tracking-wider mb-1.5">Seeking</h4>
                <div className="flex flex-wrap gap-1.5">
                  {(previewLookingForExpanded ? previewUser.lookingFor : previewUser.lookingFor.slice(0, 3)).map(lf => (
                    <span key={lf} className="py-1 px-3 rounded-full border border-emerald-500/20 text-emerald-600 bg-emerald-600/5 text-[10px] font-bold">
                      {lf}
                    </span>
                  ))}
                  {previewUser.lookingFor.length > 3 && (
                    <button
                      onClick={() => setPreviewLookingForExpanded(!previewLookingForExpanded)}
                      className="py-1 px-3 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600/10 transition-colors cursor-pointer select-none"
                    >
                      {previewLookingForExpanded ? 'Show Less' : `+ ${previewUser.lookingFor.length - 3} More`}
                    </button>
                  )}
                </div>
              </div>

              {previewUser.privacySettings.showEmail && (
                <div className="pt-2.5 border-t border-dashed border-neutral-100 dark:border-white/5">
                  <h4 className="font-bold uppercase text-[9px] text-indigo-500 tracking-wider mb-1">Institutional Coordinates</h4>
                  <p className="font-mono text-zinc-700 dark:text-zinc-300 font-semibold">{previewUser.email}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-5 mt-4 border-t border-neutral-100 dark:border-white/5">
              <button
                id="btn-close-preview"
                onClick={() => setPreviewUser(null)}
                className="py-2 px-5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold uppercase tracking-wider text-[11px] cursor-pointer shadow-sm transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Report/Flag Student Setup */}
      {reportModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={`w-full max-w-md p-6 rounded-2xl border border-neutral-300 dark:border-white/10 shadow-xl text-left ${darkMode ? 'bg-[#121217] text-slate-100' : 'bg-white text-slate-900'}`}>
            <h3 className="font-bold text-sm tracking-widest mb-3 text-red-500 uppercase flex items-center gap-1.5">
              <Flag size={15} /> Flag Student Profile
            </h3>
            <p className="text-xs mb-4 leading-relaxed text-slate-500">
              Ensure we maintain secure academic boundaries. Our admin takes report logs strictly. Action will be logged under faculty core rules.
            </p>

            <form onSubmit={handleReportSubmit} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block font-bold mb-1.5 uppercase tracking-wider text-[9px] text-[#8F8F9F]">Reason Category</label>
                <select
                  id="report-reason-select"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 focus:outline-none cursor-pointer ${darkMode ? 'bg-[#09090C] text-slate-300' : 'bg-[#FFF] text-neutral-800'}`}
                >
                  <option value="Spam">Spam, Self promotion, or Advertising</option>
                  <option value="Non-Student">Not a real student / Impersonation</option>
                  <option value="Harassment">Academic toxicity or harassment</option>
                  <option value="Dating-Behavior">Dating-style outreach or Swipe behavior</option>
                  <option value="Inappropriate">Inappropriate content or posting metrics</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1.5 uppercase tracking-wider text-[9px] text-[#8F8F9F]">Detailed Description</label>
                <textarea
                  id="report-description-input"
                  rows={3}
                  required
                  placeholder="Provide context on messages, posts, or emails that violate the welcoming atmosphere..."
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  className={`w-full p-3 rounded-xl border border-neutral-200 dark:border-white/10 focus:outline-none resize-none ${darkMode ? 'bg-[#09090C] text-[#F9F7F2]' : 'bg-[#FFF] text-neutral-800'}`}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  id="btn-cancel-report"
                  type="button"
                  onClick={() => setReportModalUser(null)}
                  className={`py-1.5 px-4 rounded-xl border border-neutral-200 dark:border-white/10 font-bold uppercase text-[10px] tracking-wider cursor-pointer hover:bg-neutral-100 dark:hover:bg-zinc-800 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-report"
                  type="submit"
                  className="py-1.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold uppercase text-[10px] tracking-wider cursor-pointer"
                >
                  File Complaint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
