import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Award,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Code2,
  Flame,
  Globe2,
  Info,
  Lightbulb,
  Medal,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Swords,
  Target,
  Trophy,
  UserPlus,
  Users,
  X,
  Zap,
} from 'lucide-react';
import type { Connection as CoreConnection } from '../../types';
import { api } from '../../api';
import { User } from '../types';
import { SafeAvatar } from './SafeAvatar';
import { CollegeChallengePanel } from './CollegeChallengePanel';

type CompeteTab = 'overview' | 'college-challenge' | 'competitions' | 'hackathons' | 'leaderboards' | 'my-teams';
type CompetitionCategory = 'All' | 'Hackathon' | 'Case Study' | 'Design' | 'Coding' | 'Quiz';
type CompetitionState = 'live' | 'upcoming';
type ConnectionKind = CoreConnection['type'];

type Competition = {
  id: string;
  source?: string;
  title: string;
  organizer: string;
  category: Exclude<CompetitionCategory, 'All'>;
  state: CompetitionState;
  startsIn: string;
  endsIn: string;
  dateLabel: string;
  location: string;
  eligibility: string;
  participationType: 'Individual' | 'Teams';
  prize: string;
  participants: number;
  teamSize: string;
  description: string;
  tags: string[];
  skills: string[];
  registrationLink?: string;
  featured?: boolean;
  accent: string;
};

type TeamMate = {
  user: User;
  role: string;
  sharedSkill: string;
  availability: string;
};

interface CompeteViewProps {
  currentUser: User;
  users: User[];
  initialTab?: CompeteTab;
  cachedCompetitions?: unknown[];
  onCacheCompetitions?: (competitions: unknown[]) => void;
  onOpenProfile: (user: User) => void;
  onToggleConnect: (
    userId: string,
    type?: ConnectionKind,
    message?: string,
  ) => void | Promise<void>;
  onOpenCreatePost?: (requestType?: string) => void;
}

const formatNumber = (value: number) => value.toLocaleString('en-IN');

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'N';

export const CompeteView: React.FC<CompeteViewProps> = ({
  currentUser,
  users,
  initialTab = 'overview',
  cachedCompetitions,
  onCacheCompetitions,
  onOpenProfile,
  onToggleConnect,
  onOpenCreatePost,
}) => {
  const [activeTab, setActiveTab] = useState<CompeteTab>(initialTab);
  const [activeCategory, setActiveCategory] = useState<CompetitionCategory>('All');
  const [query, setQuery] = useState('');
  const [savedCompetitionIds, setSavedCompetitionIds] = useState<string[]>([]);
  const [requestedUserIds, setRequestedUserIds] = useState<string[]>([]);
  const [connectingUserId, setConnectingUserId] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [competitions, setCompetitions] = useState<Competition[]>(
    () => Array.isArray(cachedCompetitions) ? cachedCompetitions as Competition[] : [],
  );
  const [competitionsLoading, setCompetitionsLoading] = useState(
    () => !(Array.isArray(cachedCompetitions) && cachedCompetitions.length > 0),
  );
  const [competitionsError, setCompetitionsError] = useState<string | null>(null);
  const [competitionRefreshKey, setCompetitionRefreshKey] = useState(0);
  const hasFreshCompetitionsRef = useRef(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (hasFreshCompetitionsRef.current || !Array.isArray(cachedCompetitions)) return;
    setCompetitions(cachedCompetitions as Competition[]);
    setCompetitionsLoading(false);
  }, [cachedCompetitions]);

  useEffect(() => {
    let cancelled = false;
    if (!hasFreshCompetitionsRef.current) setCompetitionsLoading(competitions.length === 0);
    setCompetitionsError(null);
    api.competitions.getAll()
      .then((result) => {
        if (cancelled) return;
        if (!Array.isArray(result)) throw new Error('The official competition response was invalid.');
        const nextCompetitions = result as Competition[];
        hasFreshCompetitionsRef.current = true;
        setCompetitions(nextCompetitions);
        onCacheCompetitions?.(nextCompetitions);
      })
      .catch((error) => {
        if (cancelled) return;
        if (competitions.length === 0) {
          setCompetitionsError(error instanceof Error ? error.message : 'Official competition listings are unavailable.');
          setCompetitions([]);
        }
      })
      .finally(() => {
        if (!cancelled) setCompetitionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [competitionRefreshKey, onCacheCompetitions]);

  const visibleUsers = useMemo(
    () => users.filter((user) => user.id !== currentUser.id && user.role !== 'admin'),
    [users, currentUser.id],
  );

  const teamMates: TeamMate[] = visibleUsers
    .filter((user) => user.college && user.college !== currentUser.college)
    .sort((first, second) => {
      const firstPriority = first.availableFor && !Array.isArray(first.availableFor) && first.availableFor.hackathons ? 1 : 0;
      const secondPriority = second.availableFor && !Array.isArray(second.availableFor) && second.availableFor.hackathons ? 1 : 0;
      return secondPriority - firstPriority;
    })
    .slice(0, 4)
    .map((user, index) => ({
      user,
      role: user.branch || user.programGroup || 'Student',
      sharedSkill: (user.skills && user.skills[0]) || (user.interests && user.interests[0]) || 'Problem solving',
      availability: user.availableFor && !Array.isArray(user.availableFor) && user.availableFor.hackathons
        ? 'Open to hackathons'
        : 'Check profile',
    }));

  const filteredCompetitions = competitions.filter((competition) => {
    const matchesCategory = activeCategory === 'All' || competition.category === activeCategory;
    const searchable = `${competition.title} ${competition.organizer} ${competition.tags.join(' ')}`.toLowerCase();
    return matchesCategory && searchable.includes(query.trim().toLowerCase());
  });

  const liveCompetitions = filteredCompetitions.filter((competition) => competition.state === 'live');
  const upcomingCompetitions = filteredCompetitions.filter((competition) => competition.state === 'upcoming');
  const showInfo = (message: string) => {
    setInfoMessage(message);
    setSelectedCompetition(null);
  };

  const handleConnect = async (user: User) => {
    if (requestedUserIds.includes(user.id) || connectingUserId) return;
    setConnectingUserId(user.id);
    try {
      await onToggleConnect(
        user.id,
        'Hackathon Team',
        `Hi ${user.name.split(' ')[0]}, want to explore a competition team together?`,
      );
      setRequestedUserIds((previous) => [...previous, user.id]);
    } catch {
      setInfoMessage('The connection could not be sent yet. Try again from this profile.');
    } finally {
      setConnectingUserId(null);
    }
  };

  const toggleSave = (competitionId: string) => {
    setSavedCompetitionIds((saved) =>
      saved.includes(competitionId)
        ? saved.filter((id) => id !== competitionId)
        : [...saved, competitionId],
    );
  };

  const openCompetition = (competition: Competition) => {
    setSelectedCompetition(competition);
    setInfoMessage(null);
  };

  const renderStatePill = (state: CompetitionState) => (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
        state === 'live'
          ? 'bg-[#fff0eb] text-[#d5543e]'
          : 'bg-[#edf4ff] text-[#3f5db5]'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${state === 'live' ? 'bg-[#e35d45] animate-pulse' : 'bg-[#5872cb]'}`} />
      {state === 'live' ? 'Open' : 'Upcoming'}
    </span>
  );

  const CompetitionCard = ({ competition, featured = false }: { competition: Competition; featured?: boolean }) => {
    const isSaved = savedCompetitionIds.includes(competition.id);
    return (
      <article
        className={`group overflow-hidden rounded-[1.45rem] border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(47,53,94,0.05)] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(47,53,94,0.1)] ${
          featured ? 'lg:grid lg:grid-cols-[1.12fr_0.88fr]' : ''
        }`}
      >
        <div className={`relative overflow-hidden bg-gradient-to-br ${competition.accent} ${featured ? 'min-h-[230px] lg:min-h-[310px]' : 'min-h-[154px]'}`}>
          <div className="absolute -right-7 -top-10 h-36 w-36 rounded-full border border-white/15" />
          <div className="absolute -bottom-16 -left-10 h-44 w-44 rounded-full border border-white/10" />
          <div className="relative flex h-full min-h-[inherit] flex-col justify-between p-5 text-white sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10">
                {competition.category === 'Hackathon' ? <Code2 className="h-5 w-5" /> : competition.category === 'Design' ? <Sparkles className="h-5 w-5" /> : <Swords className="h-5 w-5" />}
              </span>
              {renderStatePill(competition.state)}
            </div>
            <div className="mt-8">
              {featured && (
                <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#ffd7bb]">
                  <Flame className="h-3.5 w-3.5" /> Featured challenge
                </p>
              )}
              <h3 className={`max-w-md font-black leading-[1.05] tracking-tight ${featured ? 'text-2xl sm:text-3xl' : 'text-lg'}`}>
                {competition.title}
              </h3>
              <p className="mt-2 text-[11px] font-medium text-white/70">{competition.organizer}</p>
            </div>
          </div>
        </div>
        <div className={`flex flex-col p-5 sm:p-6 ${featured ? 'justify-center' : ''}`}>
          <div className="flex flex-wrap gap-1.5">
            {competition.tags.map((tag) => (
              <span key={tag} className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                {tag}
              </span>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">{competition.description}</p>
            <div className="mt-5 grid grid-cols-2 gap-3 border-y border-slate-100 py-4 text-[11px]">
            <div>
              <p className="font-bold uppercase tracking-wider text-slate-400">Prize</p>
              <p className="mt-1 font-black text-slate-900">{competition.prize}</p>
            </div>
            <div>
                <p className="font-bold uppercase tracking-wider text-slate-400">Eligibility</p>
                <p className="mt-1 font-black text-slate-900">{competition.eligibility}</p>
            </div>
            <div>
              <p className="font-bold uppercase tracking-wider text-slate-400">Timing</p>
                <p className="mt-1 font-black text-slate-900">{competition.dateLabel}</p>
            </div>
            <div>
                <p className="font-bold uppercase tracking-wider text-slate-400">Format</p>
                <p className="mt-1 font-black text-slate-900">{competition.participationType} · {competition.teamSize}</p>
            </div>
          </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold text-slate-400">
              <span className="inline-flex items-center gap-1"><Globe2 className="h-3 w-3 text-[#5e6dcc]" /> {competition.location}</span>
              <span className="inline-flex items-center gap-1"><Users className="h-3 w-3 text-[#5e6dcc]" /> {formatNumber(competition.participants)} participating</span>
            </div>
          <div className="mt-5 flex items-center gap-2">
            <a
              href={competition.registrationLink}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#4c58b8] px-3 text-xs font-black text-white transition-colors hover:bg-[#3c489e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8590e2]"
            >
              Open official listing <ArrowRight className="h-3.5 w-3.5" />
            </a>
            <button
              type="button"
              onClick={() => toggleSave(competition.id)}
              aria-label={isSaved ? `Remove ${competition.title} from saved` : `Save ${competition.title}`}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                isSaved ? 'border-[#cdd2ff] bg-[#f0f1ff] text-[#4c58b8]' : 'border-slate-200 text-slate-400 hover:border-[#cdd2ff] hover:text-[#4c58b8]'
              }`}
            >
              {isSaved ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </article>
    );
  };

  const SectionHeading = ({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) => (
    <div className="flex items-end justify-between gap-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5e6dcc]">{eyebrow}</p>
        <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900 sm:text-xl">{title}</h2>
      </div>
      {action}
    </div>
  );

  const tabItems: { id: CompeteTab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: Target },
    { id: 'college-challenge', label: 'Network Challenge', icon: Award },
    { id: 'competitions', label: 'Competitions', icon: Trophy },
    { id: 'hackathons', label: 'Hackathons', icon: Code2 },
    { id: 'leaderboards', label: 'Leaderboards', icon: Medal },
    { id: 'my-teams', label: 'My Teams', icon: Users },
  ];

  const renderCollegeChallenge = () => (
    <CollegeChallengePanel
      currentUser={currentUser}
      users={users}
      onOpenProfile={onOpenProfile}
    />
  );

  const renderTabs = () => (
    <nav aria-label="Compete sections" className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {tabItems.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => setActiveTab(id)}
          className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-[11px] font-black transition-colors ${
            activeTab === id
              ? 'bg-[#4c58b8] text-white shadow-[0_7px_18px_rgba(76,88,184,0.22)]'
              : 'bg-white text-slate-500 hover:bg-[#eef0ff] hover:text-[#4c58b8]'
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </nav>
  );

  const renderFilters = () => (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5">
        {(['All', 'Hackathon', 'Case Study', 'Design', 'Coding', 'Quiz'] as CompetitionCategory[]).map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={`shrink-0 rounded-full border px-3.5 py-2 text-[10px] font-black transition-colors ${
              activeCategory === category
                ? 'border-[#4c58b8] bg-[#4c58b8] text-white'
                : 'border-slate-200 bg-white text-slate-500 hover:border-[#b8bdf0] hover:text-[#4c58b8]'
            }`}
          >
            {category}
          </button>
        ))}
      </div>
      <label className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-400 sm:w-56">
        <Search className="h-3.5 w-3.5 shrink-0" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search challenges"
          className="min-w-0 w-full bg-transparent text-[11px] font-semibold text-slate-700 outline-none placeholder:text-slate-400"
        />
      </label>
    </div>
  );

  const renderCompetitionStatus = (compact = false) => {
    if (competitionsLoading) {
      return (
        <div className={`rounded-[1.45rem] border border-slate-200 bg-white px-6 py-10 text-center ${compact ? '' : 'sm:px-10'}`}>
          <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-[#cfd4ff] border-t-[#4c58b8]" />
          <p className="mt-3 text-xs font-bold text-slate-500">Loading official Devpost listings…</p>
        </div>
      );
    }

    if (competitionsError) {
      return (
        <div className={`rounded-[1.45rem] border border-dashed border-[#e4b4aa] bg-[#fff8f6] px-6 py-10 text-center ${compact ? '' : 'sm:px-10'}`}>
          <Info className="mx-auto h-7 w-7 text-[#d5543e]" />
          <h3 className="mt-3 text-sm font-black text-slate-800">Official listings are unavailable</h3>
          <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">{competitionsError}</p>
          <p className="mt-2 text-[10px] font-bold text-slate-400">Source: Devpost · no mock listings are shown</p>
          <button
            type="button"
            onClick={() => setCompetitionRefreshKey((value) => value + 1)}
            className="mt-4 rounded-xl bg-[#4c58b8] px-4 py-2.5 text-xs font-black text-white hover:bg-[#3c489e]"
          >
            Try again
          </button>
        </div>
      );
    }

    if (competitions.length === 0) {
      return (
        <div className={`rounded-[1.45rem] border border-dashed border-slate-300 bg-white px-6 py-10 text-center ${compact ? '' : 'sm:px-10'}`}>
          <Trophy className="mx-auto h-7 w-7 text-slate-300" />
          <h3 className="mt-3 text-sm font-black text-slate-800">No open competitions right now</h3>
          <p className="mt-1 text-xs text-slate-500">Devpost did not return any verified open listings.</p>
          <button
            type="button"
            onClick={() => setCompetitionRefreshKey((value) => value + 1)}
            className="mt-4 text-xs font-black text-[#4c58b8]"
          >
            Refresh official feed
          </button>
        </div>
      );
    }

    return null;
  };

  const renderCompetitionCollection = (showFeatured: boolean) => (
    <section className="space-y-4">
      <SectionHeading
        eyebrow={showFeatured ? 'Find your next edge' : 'Open challenges'}
        title={showFeatured ? 'Compete with purpose' : activeTab === 'hackathons' ? 'Build something people remember' : 'Challenges worth showing up for'}
        action={<span className="text-[10px] font-bold text-slate-400">{filteredCompetitions.length} opportunities</span>}
      />
      {renderFilters()}
      {renderCompetitionStatus()}
      {!competitionsLoading && !competitionsError && showFeatured && activeCategory === 'All' && !query && competitions[0] && (
        <CompetitionCard competition={competitions[0]} featured />
      )}
      {!competitionsLoading && !competitionsError && (activeTab !== 'hackathons' ? liveCompetitions : liveCompetitions.filter((competition) => competition.category === 'Hackathon')).length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 pt-2">
            <span className="h-2 w-2 rounded-full bg-[#e35d45]" />
            <h3 className="text-xs font-black uppercase tracking-[0.16em] text-slate-700">Open now</h3>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {(activeTab !== 'hackathons' ? liveCompetitions : liveCompetitions.filter((competition) => competition.category === 'Hackathon')).map((competition) => (
              <CompetitionCard key={competition.id} competition={competition} />
            ))}
          </div>
        </div>
      )}
      {!competitionsLoading && !competitionsError && (activeTab !== 'hackathons' ? upcomingCompetitions : upcomingCompetitions.filter((competition) => competition.category === 'Hackathon')).length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 pt-2">
            <CalendarDays className="h-3.5 w-3.5 text-[#5e6dcc]" />
            <h3 className="text-xs font-black uppercase tracking-[0.16em] text-slate-700">Coming up</h3>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {(activeTab !== 'hackathons' ? upcomingCompetitions : upcomingCompetitions.filter((competition) => competition.category === 'Hackathon')).map((competition) => (
              <CompetitionCard key={competition.id} competition={competition} />
            ))}
          </div>
        </div>
      )}
      {!competitionsLoading && !competitionsError && filteredCompetitions.length === 0 && (
        <div className="rounded-[1.45rem] border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <Search className="mx-auto h-7 w-7 text-slate-300" />
          <h3 className="mt-3 text-sm font-black text-slate-800">No challenges match that search</h3>
          <p className="mt-1 text-xs text-slate-500">Try a different category or clear your search.</p>
          <button type="button" onClick={() => { setQuery(''); setActiveCategory('All'); }} className="mt-4 text-xs font-black text-[#4c58b8]">Reset filters</button>
        </div>
      )}
    </section>
  );

  const renderLeaderboard = () => (
    <section className="rounded-[1.45rem] border border-[#d9dcfa] bg-[#f6f7ff] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5e6dcc]">Represent your campus</p>
          <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900">College leaderboard</h2>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">This will use verified competition results from The Network.</p>
        </div>
        <Trophy className="h-6 w-6 shrink-0 text-[#c99432]" />
      </div>
      <div className="mt-5 rounded-xl border border-dashed border-[#cfd4ff] bg-white p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#5e6dcc]" />
          <div>
            <p className="text-xs font-black text-slate-800">No verified rankings yet</p>
            <p className="mt-1 text-[11px] leading-5 text-slate-500">
              Devpost provides the official challenge listings, but it does not provide The Network’s college scores or result history.
            </p>
          </div>
        </div>
      </div>
      <button type="button" onClick={() => setActiveTab('leaderboards')} className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#d2d7ff] bg-white py-2.5 text-[11px] font-black text-[#4c58b8] hover:bg-[#eef0ff]">
        See how rankings will work <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </section>
  );

  const renderTeamFinder = () => (
    <section className="rounded-[1.45rem] border border-[#f2dfc3] bg-[#fffaf1] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#b4772b]">Cross-college teammates</p>
          <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900">Build your crew</h2>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">The strongest teams are rarely from one campus.</p>
        </div>
        <Users className="h-6 w-6 shrink-0 text-[#c99432]" />
      </div>
      <div className="mt-4 space-y-2.5">
        {teamMates.slice(0, 3).map(({ user, role, sharedSkill, availability }) => {
          const requested = requestedUserIds.includes(user.id) || Boolean(user.connectionPending);
          return (
            <div key={user.id} className="flex items-center gap-2.5 rounded-xl border border-[#f4e7d2] bg-white p-2.5">
              <button type="button" onClick={() => onOpenProfile(user)} className="shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c99432]">
                <SafeAvatar src={user.avatar} name={user.name} className="h-9 w-9 rounded-full object-cover" />
              </button>
              <button type="button" onClick={() => onOpenProfile(user)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-[11px] font-black text-slate-800">{user.name}</p>
                <p className="truncate text-[10px] text-slate-500">{role} · {user.college || 'The Network'}</p>
                <span className="mt-1 inline-flex max-w-full items-center gap-1 truncate rounded-full bg-[#fff3dc] px-1.5 py-0.5 text-[9px] font-bold text-[#9b6827]">
                  <Zap className="h-2.5 w-2.5 shrink-0" /> {sharedSkill}
                </span>
              </button>
              <button
                type="button"
                disabled={requested || connectingUserId === user.id}
                onClick={() => handleConnect(user)}
                className={`shrink-0 rounded-lg px-2.5 py-2 text-[10px] font-black ${
                  requested ? 'bg-slate-100 text-slate-400' : 'bg-[#c99432] text-white hover:bg-[#ac7a26]'
                }`}
              >
                {connectingUserId === user.id ? 'Sending' : requested ? 'Requested' : 'Connect'}
              </button>
            </div>
          );
        })}
      </div>
      <button type="button" onClick={() => onOpenCreatePost?.('competition-team')} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#ebc98f] bg-white py-2.5 text-[11px] font-black text-[#9b6827] hover:bg-[#fff3dc]">
        <Plus className="h-3.5 w-3.5" /> Post a team request
      </button>
      {teamMates.length === 0 && (
        <p className="mt-4 rounded-xl bg-white p-3 text-center text-[11px] text-slate-500">More student profiles will appear here as the network grows.</p>
      )}
    </section>
  );

  const renderRepresentationBanner = () => (
    <section className="relative overflow-hidden rounded-[1.45rem] bg-[#263269] p-5 text-white shadow-[0_14px_35px_rgba(38,50,105,0.18)] sm:p-6">
      <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full border border-white/10" />
      <div className="absolute -bottom-20 left-1/3 h-44 w-44 rounded-full border border-[#f18a69]/20" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <div className="flex items-center gap-2 text-[#ffd5bd]">
            <Building2 className="h-4 w-4" />
            <p className="text-[10px] font-black uppercase tracking-[0.18em]">College representation</p>
          </div>
          <h2 className="mt-2 text-xl font-black tracking-tight sm:text-2xl">{currentUser.college || 'Your college'} can be represented here.</h2>
          <p className="mt-2 text-xs leading-5 text-indigo-100">College points and rankings will be shown after The Network records verified entries and official results.</p>
        </div>
        <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f07a5b] text-lg font-black">{getInitials(currentUser.college || 'CN')}</div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">Current standing</p>
            <p className="mt-0.5 text-sm font-black">Not available</p>
            <p className="text-[10px] text-indigo-200">Results not connected</p>
          </div>
        </div>
      </div>
      <div className="relative mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-4 text-[10px] font-bold text-indigo-100">
        <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-[#ffd5bd]" /> Verified results will power points</span>
        <span className="flex items-center gap-1.5"><Globe2 className="h-3.5 w-3.5 text-[#ffd5bd]" /> Team up across campuses</span>
      </div>
    </section>
  );

  const renderInfoDialog = () => {
    if (!infoMessage && !selectedCompetition) return null;
    const competition = selectedCompetition;
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#182044]/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" role="presentation" onClick={() => { setInfoMessage(null); setSelectedCompetition(null); }}>
        <div className="w-full max-w-lg rounded-t-[1.75rem] border border-slate-200 bg-[#fffdfa] p-5 shadow-2xl sm:rounded-[1.75rem] sm:p-6" role="dialog" aria-modal="true" aria-label={competition ? competition.title : 'Competition information'} onClick={(event) => event.stopPropagation()}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5e6dcc]">{competition ? 'Challenge details' : 'A quick note'}</p>
              <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900">{competition?.title || 'Team requests are coming together'}</h2>
            </div>
            <button type="button" onClick={() => { setInfoMessage(null); setSelectedCompetition(null); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close information">
              <X className="h-4 w-4" />
            </button>
          </div>
          {competition ? (
            <>
              <div className="mt-4 flex flex-wrap gap-2">
                {renderStatePill(competition.state)}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600"><Clock3 className="h-3 w-3" /> {competition.dateLabel}</span>
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-600">{competition.description}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-[11px]">
                <p><span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Prize</span><strong className="mt-1 block text-slate-900">{competition.prize}</strong></p>
                <p><span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Team size</span><strong className="mt-1 block text-slate-900">{competition.teamSize}</strong></p>
              </div>
              <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-slate-500"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#5e6dcc]" /> Challenge registration is not connected to this screen yet. Open the official brief when the organiser link is available.</p>
              <button type="button" onClick={() => { setInfoMessage('The official organiser link will appear here once this competition is connected.'); setSelectedCompetition(null); }} className="mt-5 w-full rounded-xl border border-[#cfd4ff] bg-[#f1f2ff] py-3 text-xs font-black text-[#4c58b8]">Keep this challenge on my radar</button>
            </>
          ) : (
            <>
              <p className="mt-4 text-xs leading-5 text-slate-600">{infoMessage || 'You can use this space to find teammates without sending a fake confirmation.'}</p>
              <button type="button" onClick={() => { setInfoMessage(null); onOpenCreatePost?.('competition-team'); }} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#4c58b8] py-3 text-xs font-black text-white hover:bg-[#3c489e]">
                <MessageCircle className="h-3.5 w-3.5" /> Draft a team request
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="network-compete-view min-h-[100dvh] bg-[#f8f8fc] px-4 py-5 pb-28 sm:px-8 sm:py-7 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="compete-masthead flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[#5e6dcc]">
              <Swords className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">The Network / Compete</span>
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-900 sm:text-4xl">Compete with purpose.</h1>
             <p className="mt-1 max-w-xl text-xs font-medium leading-5 text-slate-500 sm:text-sm">Show your skills. Represent your college. Compete with India.</p>
          </div>
           <button
             type="button"
             onClick={() => setInfoMessage('Your participation history will appear here when competition registration and results are connected.')}
             className="flex items-center gap-2 rounded-2xl border border-[#dfe1fb] bg-white px-3 py-2.5 text-left shadow-[0_5px_20px_rgba(47,53,94,0.04)] transition-colors hover:border-[#c5cbff] hover:bg-[#fafaff]"
           >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#fff0d4] text-[#b4772b]"><Award className="h-4 w-4" /></div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">My participations</p>
               <p className="text-xs font-black text-slate-900">Track entries and results</p>
            </div>
            <ChevronRight className="ml-2 h-4 w-4 text-slate-300" />
           </button>
        </header>

        {renderTabs()}

        {activeTab === 'overview' && (
          <>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.75fr)]">
              <div className="space-y-6">
                <section className="rounded-[1.45rem] border border-[#e0e2ff] bg-[#f0f1ff] p-5 sm:p-6">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="max-w-lg">
                      <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#5e6dcc]"><Sparkles className="h-3.5 w-3.5" /> Your competition path</p>
                      <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">Discover <span className="text-[#e26e52]">→</span> connect <span className="text-[#e26e52]">→</span> compete.</h2>
                      <p className="mt-2 text-xs leading-5 text-slate-600">Earn points for every serious attempt, represent your college, and climb together.</p>
                    </div>
                    <div className="grid shrink-0 grid-cols-3 gap-2">
                      {[
                        { value: String(competitions.filter((item) => item.state === 'live').length), label: 'Open now' },
                        { value: String(savedCompetitionIds.length), label: 'Saved' },
                        { value: currentUser.college || '—', label: 'Your campus' },
                      ].map((stat) => (
                        <div key={stat.label} className="rounded-xl border border-white/80 bg-white/75 px-2.5 py-3 text-center">
                          <p className="text-base font-black text-[#4c58b8]">{stat.value}</p>
                          <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
                {renderCompetitionStatus(true)}
                {!competitionsLoading && !competitionsError && competitions.length > 0 && (
                  <>
                    <div className="flex items-center justify-between rounded-xl border border-[#dfe1fb] bg-white px-3 py-2.5 text-[10px] font-bold text-slate-500">
                      <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Verified feed from Devpost</span>
                      <a href="https://devpost.com/hackathons" target="_blank" rel="noreferrer" className="font-black text-[#4c58b8] hover:underline">View source</a>
                    </div>
                    <CompetitionCard competition={competitions[0]} featured />
                    <div className="grid gap-6 lg:grid-cols-2">
                      <section className="space-y-4">
                        <SectionHeading eyebrow="Happening now" title="Live competitions" action={<button type="button" onClick={() => setActiveTab('competitions')} className="text-[10px] font-black text-[#4c58b8]">See all</button>} />
                        {competitions[1] ? <CompetitionCard competition={competitions[1]} /> : <p className="rounded-xl bg-white p-4 text-xs text-slate-500">More verified listings will appear here when available.</p>}
                      </section>
                      <section className="space-y-4">
                        <SectionHeading eyebrow="Mark your calendar" title="More open listings" action={<button type="button" onClick={() => setActiveTab('competitions')} className="text-[10px] font-black text-[#4c58b8]">Browse</button>} />
                        {competitions[2] ? <CompetitionCard competition={competitions[2]} /> : <p className="rounded-xl bg-white p-4 text-xs text-slate-500">More verified listings will appear here when available.</p>}
                      </section>
                    </div>
                  </>
                )}
              </div>
              <div className="space-y-6">
                {renderLeaderboard()}
                {renderTeamFinder()}
              </div>
            </div>
            {renderRepresentationBanner()}
          </>
        )}

        {activeTab === 'college-challenge' && renderCollegeChallenge()}
        {activeTab === 'competitions' && renderCompetitionCollection(true)}
        {activeTab === 'hackathons' && renderCompetitionCollection(false)}
        {activeTab === 'leaderboards' && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]">
            <div className="space-y-4">
              <SectionHeading eyebrow="The campus race" title="Who is climbing?" action={<span className="text-[10px] font-bold text-slate-400">Updated today</span>} />
              {renderLeaderboard()}
              {renderRepresentationBanner()}
            </div>
            <div className="rounded-[1.45rem] border border-slate-200 bg-white p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5e6dcc]">How points work</p>
              <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900">Small moves, visible momentum.</h2>
              <div className="mt-5 space-y-3">
                {[
                  { icon: Trophy, label: 'Enter a challenge', points: '+20' },
                  { icon: Users, label: 'Form a cross-college team', points: '+35' },
                  { icon: Medal, label: 'Make the shortlist', points: '+120' },
                  { icon: ShieldCheck, label: 'Win for your college', points: '+300' },
                ].map(({ icon: Icon, label, points }) => (
                  <div key={label} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eef0ff] text-[#5e6dcc]"><Icon className="h-4 w-4" /></span>
                    <span className="flex-1 text-[11px] font-bold text-slate-700">{label}</span>
                    <span className="text-xs font-black text-emerald-600">{points}</span>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-[11px] leading-5 text-slate-500">Points are provisional until competition results are connected to The Network.</p>
            </div>
          </div>
        )}
        {activeTab === 'my-teams' && renderCollegeChallenge()}
      </div>
      {renderInfoDialog()}
    </div>
  );
};

export default CompeteView;