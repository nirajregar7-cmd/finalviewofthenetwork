import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { getEducationDisplay } from '../../utils/education';
import {
  getAvailableStudentExamOptions,
  getStudentClassLabel,
  getStudentExamLabels,
  matchesStudentSearch,
} from '../studentSearch';
import {
  Search,
  Users,
  Building,
  GraduationCap,
  Code2,
  Rocket,
  BookOpen,
  BriefcaseBusiness,
  Target,
  Sparkles,
  SlidersHorizontal,
  Check,
  Star,
  MessageCircle,
  Calendar,
  Award,
  ChevronDown,
  X,
  UserPlus,
  Bookmark,
  PenLine,
  MapPin,
} from 'lucide-react';
import { Community, User } from '../types';
import type { Connection } from '../../types';
import confetti from 'canvas-confetti';
import { SafeAvatar } from './SafeAvatar';

const CONNECT_GOALS = [
  { id: 'dsa', label: 'DSA Partner', icon: Code2, tone: 'violet', description: 'Practice problems and prepare together.' },
  { id: 'project', label: 'Project Teammate', icon: Users, tone: 'emerald', description: 'Build something useful with the right teammate.' },
  { id: 'hackathon', label: 'Hackathon Team', icon: Rocket, tone: 'amber', description: 'Find people for your next competition.' },
  { id: 'study', label: 'Study Group', icon: BookOpen, tone: 'blue', description: 'Stay consistent with a focused group.' },
  { id: 'mentor', label: 'Mentor', icon: GraduationCap, tone: 'orange', description: 'Learn from someone a step ahead.' },
  { id: 'internship', label: 'Internship Guidance', icon: BriefcaseBusiness, tone: 'indigo', description: 'Prepare for applications together.' },
] as const;

const CONNECT_REQUEST_TYPES: Record<(typeof CONNECT_GOALS)[number]['id'], string> = {
  dsa: 'DSA practice partner',
  project: 'Project teammate',
  hackathon: 'Hackathon team',
  study: 'Study partner',
  mentor: 'Mentor',
  internship: 'Anything else',
};

const GOAL_TONE_CLASSES: Record<string, { icon: string; selected: string }> = {
  violet: { icon: 'text-violet-600', selected: 'border-violet-300 bg-violet-50 text-violet-700' },
  emerald: { icon: 'text-emerald-600', selected: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
  amber: { icon: 'text-amber-600', selected: 'border-amber-300 bg-amber-50 text-amber-700' },
  blue: { icon: 'text-blue-600', selected: 'border-blue-300 bg-blue-50 text-blue-700' },
  orange: { icon: 'text-orange-600', selected: 'border-orange-300 bg-orange-50 text-orange-700' },
  indigo: { icon: 'text-indigo-600', selected: 'border-indigo-300 bg-indigo-50 text-indigo-700' },
  slate: { icon: 'text-slate-500', selected: 'border-slate-300 bg-slate-100 text-slate-700' },
};

interface ConnectViewProps {
  users: Record<string, User>;
  communities: Community[];
  currentUser: User;
  connections: Connection[];
  onOpenCreatePost?: (requestType?: string) => void;
  onOpenProfile: (user: User) => void;
  onSelectCommunity: (slug: string) => void;
  onToggleConnect: (
    userId: string,
    type?: Connection['type'],
    message?: string,
  ) => void | Promise<void>;
  onAcceptConnection: (connectionId: string) => void | Promise<void>;
  onRejectConnection: (connectionId: string) => void | Promise<void>;
  onToggleJoinCommunity: (slug: string) => void;
  onBookMentor: (mentor: User) => void;
  onStartDirectChat: (user: User) => void;
  onUpdateCurrentUserProfile: (updatedUser: Partial<User>) => void | Promise<void>;
}

export const ConnectView: React.FC<ConnectViewProps> = ({
  users,
  communities,
  currentUser,
  connections,
  onOpenCreatePost,
  onOpenProfile,
  onSelectCommunity,
  onToggleConnect,
  onAcceptConnection,
  onRejectConnection,
  onToggleJoinCommunity,
  onBookMentor,
  onStartDirectChat,
  onUpdateCurrentUserProfile,
}) => {
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | 'students' | 'communities' | 'mentors'>('students');
  const [selectedGoal, setSelectedGoal] = useState('DSA Partner');
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('All');
  const [collegeFilter, setCollegeFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');
  const [skillFilter, setSkillFilter] = useState('All');
  const [classFilter, setClassFilter] = useState('All');
  const [examFilter, setExamFilter] = useState('All');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showAllStudents, setShowAllStudents] = useState(false);
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null);
  const [cityEditorOpen, setCityEditorOpen] = useState(false);
  const [cityDraft, setCityDraft] = useState(currentUser.location || '');
  const [savingCity, setSavingCity] = useState(false);
  const [cityError, setCityError] = useState('');
  useEffect(() => {
    setCityDraft(currentUser.location || '');
    setCityFilter('All');
    setCityEditorOpen(false);
    setCityError('');
  }, [currentUser.id]);
  const normalizeCity = (city?: string) => (city || '').trim().toLocaleLowerCase();
  const currentCity = currentUser.location?.trim() || '';
  const userList = useMemo(() => Object.values(users) as User[], [users]);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const cityOptions = useMemo(() => {
    const cityOptionMap = new Map<string, string>();
    for (const user of userList) {
      const city = user.location?.trim();
      const normalizedCity = normalizeCity(city);
      if (city && !cityOptionMap.has(normalizedCity)) cityOptionMap.set(normalizedCity, city);
    }
    return [...cityOptionMap.values()].sort((a, b) => a.localeCompare(b));
  }, [userList]);
  const saveCity = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const city = cityDraft.trim();
    if (!city) {
      setCityError('Enter your city to find nearby students.');
      return;
    }
    setSavingCity(true);
    setCityError('');
    try {
      await onUpdateCurrentUserProfile({ location: city });
      setCityDraft(city);
      setCityEditorOpen(false);
    } catch {
      setCityError('Could not save your city. Please try again.');
    } finally {
      setSavingCity(false);
    }
  };
  const incomingRequests = connections
    .filter((connection) => connection.receiverId === currentUser.id && connection.status === 'pending')
    .map((connection) => ({ connection, requester: users[connection.senderId] }))
    .filter((item): item is { connection: Connection; requester: User } => Boolean(item.requester));
  const connectionFor = (userId: string) => connections.find((connection) =>
    connection.status === 'pending' || connection.status === 'accepted'
      ? (connection.senderId === currentUser.id && connection.receiverId === userId) ||
        (connection.receiverId === currentUser.id && connection.senderId === userId)
      : false,
  );
  const connectionLabelFor = (user: User) => {
    const connection = connectionFor(user.id);
    if (connection?.status === 'accepted' || user.isConnected) return 'Connected ✓';
    if (connection?.status === 'pending' && connection.senderId === currentUser.id) return 'Requested';
    if (connection?.status === 'pending') return 'Review request';
    return 'Connect';
  };
  const handleRequestAction = async (
    connectionId: string,
    action: 'accept' | 'reject',
  ) => {
    setUpdatingRequestId(connectionId);
    try {
      if (action === 'accept') await onAcceptConnection(connectionId);
      else await onRejectConnection(connectionId);
    } finally {
      setUpdatingRequestId(null);
    }
  };
  const profileTerms = useMemo(() => [
    ...(currentUser.academicCategory ? [currentUser.academicCategory] : []),
    ...(currentUser.goals || []),
    ...(currentUser.interests || []),
    ...(currentUser.skills || []),
  ].map((term) => term.toLowerCase()), [
    currentUser.academicCategory,
    currentUser.goals,
    currentUser.interests,
    currentUser.skills,
  ]);
  const matchScoreFor = useCallback((user: User) => {
    const candidateTerms = [
      ...(user.academicCategory ? [user.academicCategory] : []),
      ...(user.goals || []),
      ...(user.interests || []),
      ...(user.skills || []),
    ].map((term) => term.toLowerCase());
    const sharedTerms = profileTerms.filter((term) => candidateTerms.includes(term));
    const collegeMatch = user.college.toLowerCase() === currentUser.college.toLowerCase() ? 1 : 0;
    return Math.min(99, 55 + sharedTerms.length * 7 + collegeMatch * 8);
  }, [currentUser.college, profileTerms]);

  // Filter students
  const studentList = useMemo(() => userList.filter((user) => {
    if (user.id === currentUser.id) return false;
    if (user.mentorInfo?.isMentor && activeCategoryFilter === 'students') return false;
    if (!matchesStudentSearch(user, deferredSearchQuery)) return false;
    if (cityFilter !== 'All' && normalizeCity(user.location) !== normalizeCity(cityFilter)) return false;
    if (collegeFilter !== 'All' && !user.college.includes(collegeFilter)) return false;
    if (branchFilter !== 'All' && !user.branch.includes(branchFilter)) return false;
    if (yearFilter !== 'All' && String(user.year || '') !== yearFilter) return false;
    if (skillFilter !== 'All' && !(user.skills || []).some((skill) => skill.toLocaleLowerCase() === skillFilter.toLocaleLowerCase())) return false;
    if (classFilter !== 'All' && getStudentClassLabel(user) !== classFilter) return false;
    if (examFilter !== 'All' && !getStudentExamLabels(user).includes(examFilter)) return false;
    return true;
  }).sort((a, b) => matchScoreFor(b) - matchScoreFor(a)), [
    activeCategoryFilter,
    branchFilter,
    classFilter,
    cityFilter,
    collegeFilter,
    currentUser.id,
    deferredSearchQuery,
    examFilter,
    matchScoreFor,
    skillFilter,
    userList,
    yearFilter,
  ]);
  const hasActiveStudentSearchOrFilter = Boolean(
    deferredSearchQuery.trim() ||
    cityFilter !== 'All' ||
    collegeFilter !== 'All' ||
    branchFilter !== 'All' ||
    yearFilter !== 'All' ||
    skillFilter !== 'All' ||
    classFilter !== 'All' ||
    examFilter !== 'All',
  );
  const visibleStudentList = showAllStudents || hasActiveStudentSearchOrFilter
    ? studentList
    : studentList.slice(0, 3);

  const mentorsList = useMemo(() => userList.filter((user) => user.mentorInfo?.isMentor), [userList]);
  const collegeOptions = useMemo(() => Array.from(new Set(userList.map((user) => user.college).filter(Boolean))).sort(), [userList]);
  const branchOptions = useMemo(() => Array.from(new Set(userList.map((user) => user.branch).filter(Boolean))).sort(), [userList]);
  const skillOptions = useMemo(() => Array.from(new Set(userList.flatMap((user) => user.skills || []).filter(Boolean))).sort(), [userList]);
  const classOptions = useMemo(() => Array.from(new Set(userList.map(getStudentClassLabel).filter(Boolean)))
    .sort((a, b) => Number(a.replace(/\D/g, '')) - Number(b.replace(/\D/g, ''))), [userList]);
  const examOptions = useMemo(() => getAvailableStudentExamOptions(userList), [userList]);
  const selectedGoalMeta = CONNECT_GOALS.find((goal) => goal.label === selectedGoal) ?? CONNECT_GOALS[0];
  const mutualCommunitiesFor = (student: User) =>
    communities.filter((community) =>
      currentUser.communities.includes(community.slug) &&
      student.communities.includes(community.slug),
    );

  return (
    <div className="connect-view network-connect-view w-full max-w-7xl mx-auto px-5 sm:px-8 pt-5 pb-28 space-y-5">
      {/* 1. Page Header */}
      <div className="connect-page-header">
        <div>
          <h1 className="text-[30px] leading-none font-black tracking-[-0.045em] text-[#101737]">Connect</h1>
        </div>
        <p className="mt-1.5 text-[12px] leading-5 text-slate-500 font-medium">
          Find people who are looking for the <span className="font-bold text-indigo-600">same things</span> as you.
        </p>
      </div>

      {!currentCity && (
        <section className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-violet-50 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
              <MapPin className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-black text-slate-900">Find students near you</h2>
              <p className="mt-1 text-[11px] leading-5 text-slate-600">
                Add your city to discover and connect with nearby students.
              </p>
              {!cityEditorOpen ? (
                <button
                  type="button"
                  onClick={() => {
                    setCityError('');
                    setCityEditorOpen(true);
                  }}
                  className="mt-3 rounded-xl bg-indigo-600 px-3.5 py-2 text-[11px] font-bold text-white hover:bg-indigo-700"
                >
                  Update my city
                </button>
              ) : (
                <form onSubmit={saveCity} className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <label className="sr-only" htmlFor="connect-city">Your city</label>
                  <input
                    id="connect-city"
                    type="text"
                    value={cityDraft}
                    onChange={(event) => setCityDraft(event.target.value)}
                    placeholder="Enter your city"
                    autoComplete="address-level2"
                    maxLength={100}
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-400"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={savingCity || !cityDraft.trim()}
                      className="rounded-xl bg-indigo-600 px-3.5 py-2 text-[11px] font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingCity ? 'Saving…' : 'Save city'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCityDraft('');
                        setCityError('');
                        setCityEditorOpen(false);
                      }}
                      disabled={savingCity}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                  {cityError && <p role="alert" className="text-[11px] font-medium text-rose-600 sm:self-center">{cityError}</p>}
                </form>
              )}
            </div>
          </div>
        </section>
      )}

      {incomingRequests.length > 0 && (
        <section className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/60 p-4 shadow-[0_8px_30px_rgba(79,70,229,0.06)] sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                <UserPlus className="h-5 w-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-600">Live requests</p>
                  <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Live
                  </span>
                </div>
                <h2 className="mt-0.5 text-sm font-black text-slate-900">Students want to connect</h2>
                <p className="mt-0.5 text-[11px] text-slate-500">New requests appear here automatically.</p>
              </div>
            </div>
            <span className="rounded-full bg-indigo-600 px-2 py-1 text-[10px] font-black text-white">{incomingRequests.length}</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {incomingRequests.map(({ connection, requester }) => {
              const isUpdating = updatingRequestId === connection.id;
              return (
                <article key={connection.id} className="connect-request-card flex items-center gap-3 rounded-2xl border border-indigo-100 bg-white p-3">
                  <button type="button" onClick={() => onOpenProfile(requester)} className="shrink-0">
                    <SafeAvatar src={requester.avatar} name={requester.name} className="h-11 w-11 rounded-2xl object-cover ring-1 ring-indigo-100" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <button type="button" onClick={() => onOpenProfile(requester)} className="block max-w-full truncate text-left text-xs font-black text-slate-900 hover:text-indigo-700">
                      {requester.name}
                    </button>
                    <p className="truncate text-[10px] text-slate-500">{requester.college} · {requester.branch}</p>
                    <p className="mt-1 truncate text-[10px] font-semibold text-indigo-600">{connection.type || 'Friendship'}</p>
                    {connection.message && (
                      <p className="mt-1 line-clamp-1 text-[10px] text-slate-400">“{connection.message}”</p>
                    )}
                  </div>
                  <div className="connect-request-actions flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleRequestAction(connection.id, 'accept')}
                      className="rounded-xl bg-indigo-600 px-3 py-1.5 text-[10px] font-black text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {isUpdating ? '…' : 'Accept'}
                    </button>
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleRequestAction(connection.id, 'reject')}
                      aria-label={`Decline ${requester.name}'s request`}
                      className="rounded-xl bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200 disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* 2. Goal picker — the primary Connect experience on mobile. */}
      {activeCategoryFilter === 'students' && (
        <section>
          <p className="mb-2.5 text-[12px] font-black text-slate-800">What are you looking for?</p>
          <div className="grid grid-cols-3 gap-2">
            {CONNECT_GOALS.map((goal) => {
              const Icon = goal.icon;
              const isSelected = selectedGoal === goal.label;
              const tone = GOAL_TONE_CLASSES[goal.tone];
              return (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => {
                    setSelectedGoal(goal.label);
                    onOpenCreatePost?.(CONNECT_REQUEST_TYPES[goal.id]);
                  }}
                  className={`min-w-0 flex items-center justify-center gap-1.5 rounded-full border px-2 py-2.5 text-[9px] font-bold leading-tight transition-all active:scale-95 ${
                    isSelected ? tone.selected : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/40'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${isSelected ? '' : tone.icon}`} />
                  <span className="truncate">{goal.label}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between rounded-[15px] border border-indigo-100 bg-[#f7f5ff] px-3.5 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600">
                <Target className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[9px] text-slate-500">Showing people looking for</p>
                <p className="truncate text-[13px] font-black text-indigo-700">{selectedGoal}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedGoal('DSA Partner')}
              className="flex shrink-0 items-center gap-1 rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50"
            >
              <PenLine className="h-3 w-3" /> Change
            </button>
          </div>
        </section>
      )}

      {/* 3. Students Section */}
      {(activeCategoryFilter === 'all' || activeCategoryFilter === 'students') && (
        <section className="space-y-3">
          <div className="flex items-end justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 fill-indigo-600 text-indigo-600" />
                <h2 className="text-[14px] font-black text-slate-900">Find students</h2>
              </div>
              <p className="mt-0.5 text-[10px] text-slate-500">Choose a city to meet and connect with students nearby.</p>
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
              aria-controls="connect-filter-toolbar"
              aria-label={filtersOpen ? 'Hide student filters' : 'Show student filters'}
              className="flex items-center gap-1 text-[10px] font-bold text-indigo-600"
            >
              Filters <SlidersHorizontal className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Keep search available without opening the optional filters. */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, city, college, skills, class, exams..."
              className="w-full pl-8 pr-3 py-2 text-[11px] bg-white border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-400 focus:outline-none placeholder:text-slate-400"
            />
          </div>

          {/* Filter Controls */}
          <div id="connect-filter-toolbar" hidden={!filtersOpen} className="connect-filter-toolbar space-y-2">
            {currentCity && (
              <button
                type="button"
                onClick={() => setCityFilter((selected) => (
                  selected !== 'All' && normalizeCity(selected) === normalizeCity(currentCity)
                    ? 'All'
                    : currentCity
                ))}
                className={`inline-flex items-center gap-1.5 self-start rounded-full border px-3 py-1.5 text-[10px] font-bold transition-colors ${
                  cityFilter !== 'All' && normalizeCity(cityFilter) === normalizeCity(currentCity)
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                }`}
              >
                <MapPin className="h-3 w-3" />
                {cityFilter !== 'All' && normalizeCity(cityFilter) === normalizeCity(currentCity)
                  ? `Showing students in ${currentCity}`
                  : `Students in my city · ${currentCity}`}
              </button>
            )}

            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {[
                  { value: cityFilter, set: setCityFilter, label: 'City', options: cityOptions },
                  { value: collegeFilter, set: setCollegeFilter, label: 'College', options: collegeOptions },
                  { value: branchFilter, set: setBranchFilter, label: 'Branch', options: branchOptions },
                  { value: yearFilter, set: setYearFilter, label: 'Year', options: ['1', '2', '3', '4', '5'] },
                  { value: skillFilter, set: setSkillFilter, label: 'Skills', options: skillOptions },
                  { value: classFilter, set: setClassFilter, label: 'Class', options: classOptions },
                  { value: examFilter, set: setExamFilter, label: 'Exam', options: examOptions },
                ].map((filter) => (
                  <select key={filter.label} aria-label={`${filter.label} filter`} value={filter.value} onChange={(e) => filter.set(e.target.value)} className="min-w-0 rounded-xl border border-slate-200 bg-white px-1.5 py-2 text-[9px] font-medium text-slate-700 focus:outline-none">
                    <option value="All">{filter.label}: All</option>
                    {filter.options.map((option) => <option key={option} value={option}>{filter.label}: {filter.label === 'Year' ? `${option} Year` : option}</option>)}
                  </select>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  setCityFilter('All');
                  setCollegeFilter('All');
                  setBranchFilter('All');
                  setYearFilter('All');
                  setSkillFilter('All');
                    setClassFilter('All');
                    setExamFilter('All');
                  setSearchQuery('');
                }}
                className="shrink-0 self-end text-[10px] font-bold text-indigo-600 hover:text-indigo-700 sm:self-auto"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Student Cards List */}
          <div className="connect-student-list space-y-3">
            <p className="text-[10px] text-slate-500" aria-live="polite">
              {studentList.length} student{studentList.length === 1 ? '' : 's'} match{studentList.length === 1 ? 'es' : ''}
            </p>
            {visibleStudentList.length === 0 ? (
              <div role="status" className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-7 text-center">
                <p className="text-xs font-bold text-slate-700">No students match your search</p>
                <p className="mt-1 text-[10px] text-slate-500">Try another skill, class, exam, or clear a filter.</p>
              </div>
            ) : visibleStudentList.map((student) => (
              <div
                key={student.id}
                className="connect-student-card rounded-[18px] border border-slate-200/80 bg-white p-3 shadow-[0_2px_10px_rgba(15,23,42,0.045)] transition-all hover:border-indigo-200 hover:shadow-[0_8px_24px_rgba(79,70,229,0.08)]"
              >
                <div className="flex items-start gap-3">
                  <button type="button" onClick={() => onOpenProfile(student)} className="relative shrink-0" aria-label={`Open ${student.name}'s profile`}>
                    <SafeAvatar src={student.avatar} name={student.name} className="h-14 w-14 rounded-full object-cover ring-4 ring-slate-100 shadow-xs" />
                    {student.isOnline !== false && <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <button type="button" onClick={() => onOpenProfile(student)} className="truncate text-left text-[12px] font-black text-slate-900 hover:text-indigo-600">
                            {student.name}
                          </button>
                          {student.verified && <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[8px] font-black text-white">✓</span>}
                        </div>
                        <p className="mt-0.5 truncate text-[10px] text-slate-500">{student.college} · {getEducationDisplay(student).compact}</p>
                        {student.location?.trim() && (
                          <p className="mt-0.5 flex items-center gap-1 truncate text-[9px] font-medium text-slate-400">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {student.location.trim()}
                          </p>
                        )}
                      </div>
                      <button type="button" className="shrink-0 p-1 text-slate-400 hover:text-indigo-600" aria-label={`Save ${student.name}`}>
                        <Bookmark className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      {student.skills.slice(0, 3).map((skill) => (
                        <span key={skill} className="rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[9px] font-bold text-indigo-600">{skill}</span>
                      ))}
                      {student.skills.length > 3 && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-500">+{student.skills.length - 3}</span>}
                    </div>
                  </div>

                  <div className="mt-5 flex shrink-0 items-center gap-1.5">
                    {(connectionFor(student.id)?.status === 'accepted' || student.isConnected) && (
                      <button
                        type="button"
                        onClick={() => onStartDirectChat(student)}
                        className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-2 text-[10px] font-black text-indigo-700 transition-colors hover:bg-indigo-100"
                        aria-label={`Message ${student.name}`}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Chat
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        onToggleConnect(student.id);
                        if (!student.isConnected && !connectionFor(student.id)) confetti({ particleCount: 30, spread: 50 });
                      }}
                      className={`shrink-0 rounded-xl px-3 py-2 text-[10px] font-black transition-all ${
                        Boolean(connectionFor(student.id))
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700'
                      }`}
                      disabled={Boolean(connectionFor(student.id))}
                    >
                      {connectionLabelFor(student)}
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-black text-emerald-600">{student.matchScore || matchScoreFor(student)}% match</p>
                    <p className="text-[9px] text-slate-400">
                      {mutualCommunitiesFor(student).length} mutual communities
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {mutualCommunitiesFor(student).slice(0, 3).map((community) => (
                      <span
                        key={community.id}
                        title={community.displayName}
                        className="rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-600"
                      >
                        {community.displayName.slice(0, 2).toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-2.5 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-indigo-600"><Target className="h-3.5 w-3.5" /></span>
                    <div className="min-w-0">
                      <p className="text-[9px] text-slate-500">
                        Looking for:{' '}
                        <span className="font-black text-indigo-700">
                          {student.goals?.[0] || 'No preference shared'}
                        </span>
                      </p>
                      <p className="truncate text-[9px] text-slate-500">
                        {student.goals && student.goals.length > 1
                          ? student.goals.slice(1, 3).join(' · ')
                          : student.goals?.length
                            ? 'Profile preference'
                            : 'This student has not shared a goal yet.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center gap-2 border-t border-slate-100 pt-2">
                  <div className="flex items-center">
                    {mutualCommunitiesFor(student).slice(0, 3).map((community, communityIndex) => (
                      <span
                        key={community.id}
                        title={community.displayName}
                        className={`flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-indigo-50 text-[8px] font-bold text-indigo-700 ${communityIndex > 0 ? '-ml-1.5' : ''}`}
                      >
                        {community.displayName.slice(0, 2).toUpperCase()}
                      </span>
                    ))}
                  </div>
                  <span className="text-[9px] text-slate-500">
                    {mutualCommunitiesFor(student).length} mutual communities
                  </span>
                  <ChevronDown className="ml-auto h-3.5 w-3.5 -rotate-90 text-slate-400" />
                </div>
              </div>
            ))}
          </div>

          {studentList.length > 3 && !hasActiveStudentSearchOrFilter && (
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setShowAllStudents((previous) => !previous)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
              >
                {showAllStudents ? 'Show fewer students' : `Show more students (${studentList.length - 3})`}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAllStudents ? 'rotate-180' : ''}`} />
              </button>
            </div>
          )}
        </section>
      )}

      {/* 4. Communities Section */}
      {(activeCategoryFilter === 'all' || activeCategoryFilter === 'communities') && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Building className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Communities</h2>
            </div>
            <button
              onClick={() => setActiveCategoryFilter('communities')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              View all
            </button>
          </div>

          <div className="connect-community-grid grid grid-cols-2 sm:grid-cols-5 gap-3">
            {communities.slice(0, 5).map((comm) => (
              <div
                key={comm.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-3.5 flex flex-col justify-between space-y-3 hover:border-indigo-300 transition-all"
              >
                <div
                  onClick={() => onSelectCommunity(comm.slug)}
                  className="space-y-1.5 cursor-pointer"
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${comm.iconBg}`}
                  >
                    {comm.slug.slice(1, 3).toUpperCase()}
                  </div>
                  <h3 className="text-xs font-bold text-slate-900">{comm.slug}</h3>
                  <p className="text-[10px] text-slate-500">
                    {(comm.membersCount / 1000).toFixed(1)}K members
                  </p>
                </div>
                <button
                  onClick={() => onToggleJoinCommunity(comm.slug)}
                  className={`w-full py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    comm.isJoined
                      ? 'bg-slate-100 text-indigo-700 border border-slate-200'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {comm.isJoined ? 'Joined' : 'Join'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. Top Mentors Section */}
      {(activeCategoryFilter === 'all' || activeCategoryFilter === 'mentors') && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <GraduationCap className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Top Mentors</h2>
            </div>
            <button
              onClick={() => setActiveCategoryFilter('mentors')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              View all
            </button>
          </div>

          <div className="connect-mentor-grid grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {mentorsList.map((mentor) => (
              <div
                key={mentor.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-col justify-between space-y-3.5 shadow-xs hover:border-amber-200 transition-all"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={mentor.avatar}
                        alt={mentor.name}
                        onClick={() => onOpenProfile(mentor)}
                        className="w-11 h-11 rounded-full object-cover ring-1 ring-slate-100 cursor-pointer"
                      />
                      <div>
                        <h3
                          onClick={() => onOpenProfile(mentor)}
                          className="text-xs font-bold text-slate-900 hover:text-indigo-600 cursor-pointer"
                        >
                          {mentor.name}
                        </h3>
                        <p className="text-[10px] text-slate-500">{mentor.college}</p>
                        <div className="flex items-center gap-1 text-[10px] text-amber-600 font-semibold mt-0.5">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{mentor.mentorInfo?.rating}</span>
                          <span className="text-slate-400">· {mentor.mentorInfo?.studentsHelped} helped</span>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        mentor.mentorInfo?.price === 'Free'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {mentor.mentorInfo?.price}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-800 leading-tight">
                      {mentor.mentorInfo?.speciality}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {mentor.mentorInfo?.companyOrRole}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onBookMentor(mentor)}
                  className="w-full py-2 bg-white border border-indigo-600 hover:bg-indigo-50 active:scale-[0.98] text-indigo-600 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Book / Connect
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
