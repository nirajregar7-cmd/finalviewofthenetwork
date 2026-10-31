import React, { useState, useRef, useEffect } from 'react';
import { PUBLIC_APP_URL } from '../api';
import { UserProfile, Post, Comment, Community, Story, Connection, CampusEvent, Project, GroupChat } from '../types';
import { getCollegeImage } from '../data/collegeImages';
import { getCommunityImage } from '../data/communityImages';
import { getEducationDisplay } from '../utils/education';
import { getStudentAudience, getStudentRecommendations, StudentRecommendation } from '../utils/studentRecommendations';
import {
  getNewNetworkRecommendations,
  isNewNetworkRecent,
  sameEducationValue,
} from '../utils/newNetworkRecommendations';
import * as LucideIcons from 'lucide-react';
import {
  Heart,
  MessageCircle,
  Send,
  Sparkles,
  Plus,
  Trash2,
  Clock,
  Image as ImageIcon,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  UserPlus,
  Sparkle,
  MapPin,
  X,
  CheckCircle2,
  ExternalLink,
  Share2,
  Linkedin,
  Instagram,
  Download,
  Copy,
  Check,
  Rocket,
  Users,
  Target,
  MessageSquare,
  CornerUpLeft,
  Globe,
  Zap,
  ChevronDown,
  Crown,
  BookOpen,
  CheckCircle,
  Search,
  GraduationCap,
  FileText,
} from 'lucide-react';

import Avatar from './Avatar';
import FeedCommentComposer, { type FeedCommentComposerHandle } from './FeedCommentComposer';
import { api, API_ORIGIN } from '../api';
import CreateModal from './CreateModal';

function CommIcon({ name, size = 18, className = '' }: { name: string; size?: number; className?: string }) {
  const IconComp = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>)[name];
  if (IconComp) return <IconComp size={size} className={className} />;
  return <span className="font-bold text-xs">{name.charAt(0)}</span>;
}

const COLLEGE_PROJECT_CATS = ['Engineering & Technology', 'Startups & Entrepreneurship', 'Higher Education & Research'];
const getHubType = (cat: string) => COLLEGE_PROJECT_CATS.includes(cat) ? 'project' : 'club';
function normalizeYear(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = String(value ?? '').trim().toLowerCase();
  if (!text) return null;
  if (/\b(first|1st)\b/.test(text)) return 1;
  if (/\b(second|2nd)\b/.test(text)) return 2;
  if (/\b(third|3rd)\b/.test(text)) return 3;
  if (/\b(fourth|4th|final)\b/.test(text)) return 4;
  const numeric = text.match(/\b([1-5])\b/);
  return numeric ? Number(numeric[1]) : null;
}

function sharedInterestNames(first: UserProfile, second: UserProfile): string[] {
  const secondInterests = new Set((second.interests ?? []).map(i => i.trim().toLowerCase()));
  return (first.interests ?? []).filter(i => secondInterests.has(i.trim().toLowerCase()));
}

function isStudyPartnerRequest(post: Post): boolean {
  const searchableText = [
    post.academicTag,
    post.projectTitle,
    post.content,
    ...(post.tags ?? []),
  ].filter(Boolean).join(' ').toLowerCase();

  return post.academicTag === 'Study Partner Wanted 📚'
    || /\blooking\s*for\s*:\s*(?:a\s+)?(?:study|dsa|library)\s+partner\b/i.test(searchableText)
    || /\b(?:study partner|study buddy|dsa practice partner|library partner|exam partner)\b/i.test(searchableText);
}

function connectPreferenceType(preference: string): 'Startup Discussion' | 'Friendship' | 'Study Partner' | 'Hackathon Team' {
  const normalized = preference.toLowerCase();
  if (normalized.includes('study') || normalized.includes('dsa')) return 'Study Partner';
  if (normalized.includes('hackathon')) return 'Hackathon Team';
  if (normalized.includes('project') || normalized.includes('teammate') || normalized.includes('collabor')) return 'Startup Discussion';
  return 'Friendship';
}

function ConnectPreferenceFeedCard({
  student,
  currentUser,
  darkMode,
  isPending,
  isConnected,
  onViewUserProfile,
  onSendConnectionRequest,
  onNavigate,
}: {
  student: UserProfile;
  currentUser: UserProfile;
  darkMode: boolean;
  isPending: boolean;
  isConnected: boolean;
  onViewUserProfile?: (userId: string) => void;
  onSendConnectionRequest?: (
    receiverId: string,
    type?: 'Startup Discussion' | 'Friendship' | 'Study Partner' | 'Hackathon Team',
  ) => void;
  onNavigate?: (view: string, extra?: string) => void;
  key?: React.Key;
}) {
  const preference = student.connectPreference?.trim();
  if (!preference) return null;
  const isSelf = student.id === currentUser.id;

  return (
    <article className={`rounded-2xl border overflow-hidden shadow-sm ${darkMode ? 'bg-[#121217] border-indigo-400/20' : 'bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/50 border-indigo-100'}`}>
      <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
      <div className="p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${darkMode ? 'bg-indigo-500/15' : 'bg-indigo-100'}`}>
              <Target size={15} className="text-indigo-500" />
            </div>
            <div>
              <p className={`text-[9px] font-black uppercase tracking-widest ${darkMode ? 'text-indigo-300' : 'text-indigo-500'}`}>Campus Match</p>
              <p className={`text-[11px] font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>A student is looking for...</p>
            </div>
          </div>
          <span className={`text-[9px] font-bold px-2 py-1 rounded-full ${darkMode ? 'bg-white/8 text-slate-400' : 'bg-white text-slate-500 border border-slate-100'}`}>
            Saved preference
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onViewUserProfile?.(student.id)}
            className={`w-11 h-11 rounded-full overflow-hidden shrink-0 border-2 ${darkMode ? 'border-indigo-400/30' : 'border-white shadow-sm'} ${onViewUserProfile ? 'cursor-pointer' : ''}`}
            aria-label={`View ${student.fullName}'s profile`}
          >
            <Avatar avatar={student.avatar} />
          </button>
          <div className="min-w-0 flex-1">
            <p className={`text-[13px] font-black truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{student.fullName}</p>
            <p className={`text-[10px] truncate ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {student.college} · {getEducationDisplay(student).compact}
            </p>
            <p className={`mt-1 text-[13px] font-black ${darkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>{preference}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <button
            type="button"
            onClick={() => isSelf
              ? onNavigate?.('find-people')
              : onViewUserProfile?.(student.id)}
            className={`flex-1 py-2 rounded-xl border text-[10px] font-bold transition-all ${darkMode ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-indigo-100 text-indigo-600 hover:bg-indigo-50'}`}
          >
            {isSelf ? 'Edit preference' : 'View profile'}
          </button>
          {!isSelf && (
            <button
              type="button"
              disabled={isPending || isConnected || !onSendConnectionRequest}
              onClick={() => onSendConnectionRequest?.(student.id, connectPreferenceType(preference))}
              className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${
                isConnected
                  ? 'bg-emerald-500/15 text-emerald-600'
                  : isPending
                    ? 'bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-500'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {isConnected ? 'Connected ✓' : isPending ? 'Requested ✓' : 'Connect'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function HubSuggestionCard({
  communities,
  currentUser,
  darkMode: dm,
  onNavigate,
  onJoinCommunity,
  onDismiss,
}: {
  communities: Community[];
  currentUser: UserProfile;
  darkMode: boolean;
  onNavigate?: (v: string, extra?: string) => void;
  onJoinCommunity?: (communityId: string) => void | Promise<void>;
  onDismiss: () => void;
  key?: React.Key;
}) {
  const [hubSearch, setHubSearch] = useState('');
  const [hubFilter, setHubFilter] = useState<'all' | 'club' | 'project'>('all');
  const [joinedHubs, setJoinedHubs] = useState<Set<string>>(
    () => new Set(communities.filter(c => c.memberIds.includes(currentUser.id)).map(c => c.id))
  );

  const clubCount = communities.filter(c => getHubType(c.category) === 'club').length;
  const projectCount = communities.filter(c => getHubType(c.category) === 'project').length;

  const filtered = communities.filter(c => {
    const q = hubSearch.toLowerCase();
    const matchQ = !q || c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q);
    const matchF = hubFilter === 'all' || getHubType(c.category) === hubFilter;
    return matchQ && matchF;
  }).slice(0, 6);

  const CLUB_GRADIENTS = [
    'from-indigo-500 via-violet-500 to-purple-600',
    'from-teal-400 via-cyan-500 to-blue-600',
    'from-rose-400 via-pink-500 to-fuchsia-600',
    'from-amber-400 via-orange-500 to-rose-500',
    'from-emerald-400 via-green-500 to-teal-600',
    'from-violet-500 via-purple-500 to-pink-500',
  ];
  const PROJECT_GRADIENTS = [
    'from-rose-500 via-orange-500 to-amber-400',
    'from-fuchsia-500 via-violet-500 to-indigo-500',
    'from-cyan-500 via-blue-500 to-indigo-600',
    'from-green-400 via-emerald-500 to-teal-600',
  ];

  return (
    <div className={`rounded-2xl border overflow-hidden shadow-lg ${dm ? 'bg-[#0d0d12] border-white/10' : 'bg-white border-neutral-200/80'}`}>
      {/* ── Hero header ── */}
      <div className="relative overflow-hidden px-5 pt-5 pb-4">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/8 via-violet-500/5 to-rose-500/8 pointer-events-none" />
        <div className="relative flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-violet-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-rose-500">✦ Recommended for You</p>
              <h3 className={`text-base font-black leading-tight mt-0.5 tracking-tight ${dm ? 'text-white' : 'text-slate-900'}`}>Communities for You</h3>
              <p className={`text-[9px] mt-0.5 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Based on your interests, skills, and goals</p>
            </div>
          </div>
          <button onClick={() => onNavigate?.('colleges')} className="shrink-0 text-[10px] font-bold text-indigo-500 hover:text-indigo-400 cursor-pointer flex items-center gap-1 mt-1">
            Browse all →
          </button>
        </div>

        {/* Search */}
        <div className={`mt-4 flex items-center gap-2 px-3 py-2 rounded-xl border ${dm ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-neutral-200'}`}>
          <Search size={11} className="text-slate-400 shrink-0" />
          <input
            value={hubSearch}
            onChange={e => setHubSearch(e.target.value)}
            placeholder="Search DSA, web development, placements…"
            className={`bg-transparent outline-none text-[11px] flex-1 placeholder-slate-400 ${dm ? 'text-slate-200' : 'text-slate-700'}`}
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mt-3">
          {([
            { key: 'all', label: `All (${communities.length})` },
            { key: 'club', label: `🏫 Clubs (${clubCount})` },
            { key: 'project', label: `🚀 Projects (${projectCount})` },
          ] as { key: 'all' | 'club' | 'project'; label: string }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setHubFilter(t.key)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                hubFilter === t.key
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20'
                  : dm ? 'bg-white/8 text-slate-400 hover:bg-white/12' : 'bg-neutral-100 text-slate-500 hover:bg-neutral-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 pb-5">
        {filtered.length === 0 ? (
          <p className={`col-span-2 text-xs text-center py-6 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>No hubs match your search.</p>
        ) : filtered.map((c, idx) => {
          const isJoined = joinedHubs.has(c.id);
          const type = getHubType(c.category);
          const gradients = type === 'project' ? PROJECT_GRADIENTS : CLUB_GRADIENTS;
          const grad = gradients[idx % gradients.length];
          return (
            <div key={c.id} onClick={() => onNavigate?.('communities', c.id)} className={`rounded-2xl overflow-hidden flex flex-col border cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] ${dm ? 'border-white/8 bg-[#111118]' : 'border-neutral-200/60 bg-white'}`} style={{ boxShadow: dm ? 'none' : '0 4px 20px rgba(0,0,0,0.06)' }}>
              {/* Gradient banner with icon */}
              <div className={`relative h-20 bg-gradient-to-br ${grad} flex items-center justify-center`}>
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                  <CommIcon name={c.icon} size={22} className="text-white" />
                </div>
                <div className="absolute top-2 right-2">
                  <span className={`text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${type === 'project' ? 'bg-white/20 text-white' : 'bg-white/20 text-white'}`}>
                    {type === 'project' ? 'PROJECT' : 'CLUB'}
                  </span>
                </div>
                <div className="absolute bottom-2 left-2 flex items-center gap-0.5">
                  <Users size={8} className="text-white/70" />
                  <span className="text-[8px] text-white/70 font-semibold">{c.memberIds.length} members</span>
                </div>
              </div>

              <div className="p-3 flex flex-col gap-2 flex-1">
                <div>
                  <p className={`text-[11px] font-black leading-tight tracking-tight ${dm ? 'text-white' : 'text-slate-900'}`}>{c.name}</p>
                </div>

                <p className={`text-[9px] leading-relaxed line-clamp-2 flex-1 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{c.description}</p>

                {c.tags && c.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {c.tags.slice(0, 2).map(t => (
                      <span key={t} className={`text-[8px] px-1.5 py-0.5 rounded-full font-semibold ${dm ? 'bg-white/8 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>#{t}</span>
                    ))}
                  </div>
              )}

                <button
                  onClick={async () => {
                    if (isJoined) return;
                    setJoinedHubs(prev => new Set([...prev, c.id]));
                    try {
                      if (onJoinCommunity) {
                        await onJoinCommunity(c.id);
                      } else {
                        await api.communities.update(c.id, { memberIds: [...c.memberIds, currentUser.id] });
                      }
                    } catch {}
                  }}
                  className={`w-full py-2 rounded-xl text-[10px] font-black tracking-wide transition-all cursor-pointer ${
                    isJoined
                      ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/20'
                      : `bg-gradient-to-r ${grad} text-white shadow-md hover:opacity-90`
                  }`}
                >
                  {isJoined ? '✓ Joined' : '⚡ Join Community'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className={`px-5 pb-4 pt-2 flex items-center justify-between border-t ${dm ? 'border-white/5' : 'border-neutral-100'}`}>
        <button onClick={onDismiss} className={`text-[10px] cursor-pointer transition-all ${dm ? 'text-slate-700 hover:text-slate-500' : 'text-slate-300 hover:text-slate-500'}`}>Not interested</button>
        <button onClick={() => onNavigate?.('communities')} className="text-[10px] font-bold text-indigo-500 hover:text-indigo-400 cursor-pointer">Explore all hubs →</button>
      </div>
    </div>
  );
}

function PathwayRecommendationsCard({
  recommendations,
  currentUser,
  darkMode,
  onViewUserProfile,
  onSendConnectionRequest,
  onNavigate,
}: {
  recommendations: StudentRecommendation[];
  currentUser: UserProfile;
  darkMode: boolean;
  onViewUserProfile?: (userId: string) => void;
  onSendConnectionRequest?: (
    receiverId: string,
    type?: 'Startup Discussion' | 'Friendship' | 'Study Partner' | 'Hackathon Team',
  ) => void;
  onNavigate?: (view: string, extra?: string) => void;
}) {
  const groups: Array<{ kind: StudentRecommendation['kind']; label: string; description: string; icon: string; color: string }> = [
    { kind: 'study-partner', label: 'Study partners', description: 'Same class or exam path', icon: '📚', color: 'blue' },
    { kind: 'tech-peer', label: 'Tech learners', description: 'AI/ML, DSA, web and coding', icon: '💻', color: 'violet' },
    { kind: 'iit-nit-guide', label: 'IIT/NIT guides', description: 'Ask seniors about the path', icon: '🎓', color: 'emerald' },
  ];
  const colorClasses: Record<string, { panel: string; text: string; button: string }> = {
    blue: { panel: 'bg-blue-50/80 border-blue-100', text: 'text-blue-700', button: 'bg-blue-600 hover:bg-blue-700' },
    violet: { panel: 'bg-violet-50/80 border-violet-100', text: 'text-violet-700', button: 'bg-violet-600 hover:bg-violet-700' },
    emerald: { panel: 'bg-emerald-50/80 border-emerald-100', text: 'text-emerald-700', button: 'bg-emerald-600 hover:bg-emerald-700' },
  };

  return (
    <section className={`rounded-2xl border overflow-hidden shadow-sm ${darkMode ? 'bg-[#121217] border-white/10' : 'bg-white border-neutral-200'}`}>
      <div className={`px-4 py-4 border-b ${darkMode ? 'border-white/5' : 'border-neutral-100'}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-indigo-500">✦ Recommended for your path</p>
            <h3 className={`mt-1 text-base font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              People who can help you learn and grow
            </h3>
            <p className={`mt-1 text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {getStudentAudience(currentUser).classLevel || getStudentAudience(currentUser).examTargets.join(' + ') || 'Your study path'} · real student profiles
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate?.('find-people')}
            className="shrink-0 text-[10px] font-bold text-indigo-500 hover:text-indigo-400"
          >
            Find more →
          </button>
        </div>
      </div>

      <div className="grid gap-3 p-4 md:grid-cols-3">
        {groups.map(group => {
          const matches = recommendations.filter(recommendation => recommendation.kind === group.kind);
          if (matches.length === 0) return null;
          const tone = colorClasses[group.color];
          return (
            <div key={group.kind} className={`rounded-2xl border p-3 ${darkMode ? 'border-white/8 bg-white/[0.03]' : tone.panel}`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{group.icon}</span>
                <div className="min-w-0">
                  <p className={`text-[11px] font-black ${darkMode ? 'text-white' : tone.text}`}>{group.label}</p>
                  <p className={`text-[9px] ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{group.description}</p>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {matches.map(recommendation => {
                  const student = recommendation.user;
                  const connectionType = group.kind === 'tech-peer' ? 'Friendship' : 'Study Partner';
                  return (
                    <div key={`${group.kind}-${student.id}`} className={`rounded-xl border p-2.5 ${darkMode ? 'border-white/8 bg-black/10' : 'border-white/80 bg-white/80'}`}>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onViewUserProfile?.(student.id)}
                          className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-white/30"
                          aria-label={`View ${student.fullName}'s profile`}
                        >
                          <Avatar avatar={student.avatar} />
                        </button>
                        <button type="button" onClick={() => onViewUserProfile?.(student.id)} className="min-w-0 flex-1 text-left">
                          <p className={`truncate text-[11px] font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{student.fullName}</p>
                          <p className={`truncate text-[9px] ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{getEducationDisplay(student).compact}</p>
                        </button>
                      </div>
                      <p className={`mt-2 line-clamp-2 text-[9px] font-semibold ${darkMode ? 'text-indigo-300' : tone.text}`}>{recommendation.reason}</p>
                      <button
                        type="button"
                        onClick={() => onSendConnectionRequest?.(student.id, connectionType)}
                        className={`mt-2 w-full rounded-lg py-1.5 text-[9px] font-black text-white ${darkMode ? 'bg-indigo-600 hover:bg-indigo-500' : tone.button}`}
                      >
                        Connect
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function isVideoReel(media?: string | null) {
  if (!media) return false;
  return media.startsWith('data:video/') || /\.(mp4|webm|mov|ogg)($|\?)/i.test(media);
}

function ShareCardModal({ post, author, darkMode, onClose }: {
  post: Post;
  author?: UserProfile;
  darkMode: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const title = post.projectTitle || post.academicTag || 'A post from The Network';
  const shareUrl = `${PUBLIC_APP_URL}/#post-${encodeURIComponent(post.id)}`;
  const shareText = `${title}\n${post.content}`;
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const input = document.createElement('textarea');
      input.value = value;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  const buildStoryCard = async (): Promise<Blob | null> => {
    const clean = (value: string, max: number) => value.replace(/[<>&"]/g, '').slice(0, max);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">
      <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#21135f"/><stop offset="1" stop-color="#6941e8"/></linearGradient></defs>
      <rect width="1080" height="1920" fill="url(#bg)"/><circle cx="930" cy="160" r="230" fill="#fff" opacity=".08"/>
      <text x="90" y="180" fill="#b9a9ff" font-family="Arial" font-size="34" font-weight="700" letter-spacing="5">THE NETWORK</text>
      <rect x="90" y="330" width="900" height="1060" rx="42" fill="#fff"/>
      <text x="145" y="500" fill="#6d4aff" font-family="Arial" font-size="30" font-weight="700">SHARED BY ${clean(author?.fullName || 'A STUDENT', 24).toUpperCase()}</text>
      <text x="145" y="615" fill="#141328" font-family="Arial" font-size="58" font-weight="700">${clean(title, 60)}</text>
      <foreignObject x="145" y="700" width="790" height="570"><div xmlns="http://www.w3.org/1999/xhtml" style="font:34px Arial;line-height:1.45;color:#4b4860;overflow:hidden">${clean(post.content, 260)}</div></foreignObject>
      <text x="145" y="1320" fill="#6d4aff" font-family="Arial" font-size="28" font-weight="700">JOIN THE CONVERSATION</text>
      <text x="90" y="1645" fill="#fff" font-family="Arial" font-size="38" font-weight="700">Connect. Learn. Build.</text><text x="90" y="1710" fill="#d7ceff" font-family="Arial" font-size="28">thenetwork.app</text>
    </svg>`;
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1080; canvas.height = 1920;
      canvas.getContext('2d')?.drawImage(image, 0, 0);
      canvas.toBlob((blob) => resolve(blob), 'image/png');
      };
      image.onerror = () => resolve(null);
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    });
  };
  const downloadStoryCard = async () => {
    const blob = await buildStoryCard();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `the-network-story-${post.id}.png`; link.click();
    URL.revokeObjectURL(url);
  };
  const openLinkedIn = () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener,noreferrer');
  const nativeShare = async () => {
    const blob = await buildStoryCard();
    if (!blob) return;
    const file = new File([blob], `the-network-story-${post.id}.png`, { type: 'image/png' });
    const canShareFile = Boolean(navigator.share && navigator.canShare?.({ files: [file] }));
    if (canShareFile) {
      try { await navigator.share({ title, text: shareText, files: [file] }); onClose(); return; } catch (_) {}
    }
    await copy(shareText);
    await downloadStoryCard();
    window.alert('The card was downloaded and the description was copied. Open Instagram to create your Story.');
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="share-card-title" className={`max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl p-4 shadow-2xl sm:p-6 ${darkMode ? 'bg-[#17171f] text-white' : 'bg-white text-slate-900'}`} onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-500">Ready to share</p><h2 id="share-card-title" className="mt-1 text-xl font-black">Turn this post into a card</h2><p className={`mt-1 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Share it on LinkedIn or save it for your Instagram Story.</p></div>
          <button type="button" aria-label="Close share card" onClick={onClose} className={`rounded-full p-2 ${darkMode ? 'text-slate-400 hover:bg-white/10' : 'text-slate-400 hover:bg-slate-100'}`}><X size={19} /></button>
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-[220px_1fr]">
          <div className="mx-auto w-full max-w-[220px] rounded-[1.4rem] bg-gradient-to-br from-[#21135f] via-indigo-600 to-violet-500 p-3 shadow-lg">
            <div className="flex aspect-[9/16] flex-col rounded-[1rem] bg-white p-4 text-slate-900"><div className="flex items-center gap-1.5 text-[8px] font-black tracking-[0.15em] text-indigo-600"><span className="h-2 w-2 rounded-full bg-indigo-600" /> THE NETWORK</div><div className="my-auto"><p className="text-[8px] font-black uppercase tracking-widest text-indigo-600">Shared by {author?.fullName?.split(' ')[0] || 'a student'}</p><h3 className="mt-3 line-clamp-4 text-lg font-black leading-tight">{title}</h3><p className="mt-3 line-clamp-8 whitespace-pre-wrap text-[10px] leading-relaxed text-slate-500">{post.content}</p></div><div><p className="text-[10px] font-black">Connect. Learn. Build.</p><p className="mt-1 text-[8px] text-indigo-600">thenetwork.app</p></div></div>
          </div>
          <div className="flex flex-col justify-center gap-3">
            <div className={`rounded-2xl border p-4 ${darkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'}`}><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Post description</p><p className={`mt-2 max-h-28 overflow-y-auto whitespace-pre-wrap text-sm leading-6 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{post.content}</p></div>
            <button type="button" onClick={openLinkedIn} className="flex items-center justify-center gap-2 rounded-xl bg-[#0a66c2] px-4 py-3 text-sm font-bold text-white hover:bg-[#0959a8]"><Linkedin size={16} /> Post on LinkedIn <ExternalLink size={14} /></button>
            <button type="button" onClick={nativeShare} className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-orange-500 px-4 py-3 text-sm font-bold text-white hover:opacity-90"><Instagram size={16} /> Share card + description to Instagram <Share2 size={14} /></button>
            <button type="button" onClick={downloadStoryCard} className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold ${darkMode ? 'border-white/10 text-slate-200 hover:bg-white/5' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}><Download size={16} /> Download card only</button>
            <button type="button" onClick={() => copy(shareText)} className="flex items-center justify-center gap-2 py-1 text-xs font-bold text-slate-400 hover:text-indigo-500">{copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />} {copied ? 'Description copied' : 'Copy description'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface FeedSectionProps {
  currentUser: UserProfile;
  posts: Post[];
  allUsers: UserProfile[];
  communities: Community[];
  connections: Connection[];
  onAddPost: (
    content: string,
    academicTag: string,
    communityId?: string,
    projectTitle?: string,
    postImage?: string,
    feeling?: string,
    websiteUrl?: string,
    tags?: string[],
    attachment?: { name: string; data: string; mimeType: string }
  ) => void;
  onLikePost: (postId: string) => void;
  onAddComment: (postId: string, content: string) => void | Promise<void>;
  onDeletePost?: (postId: string) => void;
  onDeleteComment?: (commentId: string, postId: string) => void;
  onDeleteReel?: (reelId: string) => void;
  darkMode: boolean;
  activeCommunityId?: string;
  stories: Story[];
  onAddStory: (content: string, image?: string) => void;
  registeredEvents?: string[];
  onRegisterEvent?: (eventId: string) => void;
  onViewUserProfile?: (userId: string) => void;
  onReactToStory?: (storyId: string, emoji: string) => void;
  onLikeReel?: (reelId: string) => void;
  onSendConnectionRequest?: (
    receiverId: string,
    type?: 'Startup Discussion' | 'Friendship' | 'Study Partner' | 'Hackathon Team',
  ) => void;
  onJoinCommunity?: (communityId: string) => void | Promise<void>;
  onNavigate?: (view: string, extra?: string) => void;
  onOpenReel?: (reels: Story[], index: number) => void;
  onRefresh?: () => void;
}

const POST_PRESETS = [
  { name: '🦾 Hardware Lab', url: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80' },
  { name: '💻 MoE Neural Model', url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80' },
  { name: '👥 Startup Boardroom', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80' },
  { name: '🎨 Figma Blueprint', url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&q=80' },
  { name: '☕ Cafe Launchpad', url: 'https://images.unsplash.com/photo-1507537297725-24a1c029d3ca?w=800&q=80' }
];

export default function FeedSection({
  currentUser,
  posts,
  allUsers,
  communities,
  connections,
  onAddPost,
  onLikePost,
  onAddComment,
  onDeletePost,
  onDeleteComment,
  onDeleteReel,
  darkMode,
  activeCommunityId,
  stories,
  onAddStory,
  registeredEvents = [],
  onRegisterEvent,
  onViewUserProfile,
  onReactToStory,
  onLikeReel,
  onSendConnectionRequest,
  onJoinCommunity,
  onNavigate,
  onOpenReel,
  onRefresh,
}: FeedSectionProps) {
  const [expandedComments, setExpandedComments] = useState<{ [postId: string]: boolean }>({});
  const commentInputRefs = useRef<Record<string, FeedCommentComposerHandle | null>>({});
  const [shareCardPostId, setShareCardPostId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentFileInputRef = useRef<HTMLInputElement>(null);
  // Optimistic poll votes: postId → optionIndex
  const [localPollVotes, setLocalPollVotes] = useState<Record<string, Record<string, number>>>({});
  const [joinedCommunityIds, setJoinedCommunityIds] = useState<Set<string>>(() => new Set());

  const [newPostContent, setNewPostContent] = useState('');
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  const [feedFilter, setFeedFilter] = useState<'all' | 'questions' | 'opportunities' | 'resources'>('all');
  const [postImage, setPostImage] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [selectedTag, setSelectedTag] = useState('Question ❓');
  const [selectedCommunity, setSelectedCommunity] = useState('');
  const [selectedFeeling, setSelectedFeeling] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [postTags, setPostTags] = useState('');
  const [attachment, setAttachment] = useState<{ name: string; data: string; mimeType: string } | null>(null);
  const [imageUploadType, setImageUploadType] = useState<'upload' | 'preset' | 'url'>('upload');

  const ACADEMIC_TAGS = [
    'Question ❓',
    'Study Partner Wanted 📚',
    'Notes & Resources 📖',
    'Exam Prep 📝',
    'Research Collaborator 🔬',
    'Academic Discussion 🎓',
    'Assignment Help 🧩',
    'Hackathon Squad 💻',
    'Idea Drop 💡',
    'Startup Pitch 🚀',
    'Co-Founder Search 🤝',
    'Career & Internships 💼',
    'Campus Life 🏫',
    'General 💬'
  ];

  const FEELING_PRESETS = [
    { emoji: '🚀', label: 'Building' },
    { emoji: '💡', label: 'Ideating' },
    { emoji: '🔥', label: 'Hustling' },
    { emoji: '🧠', label: 'Deep Work' },
    { emoji: '🤝', label: 'Networking' },
    { emoji: '📈', label: 'Grinding' },
    { emoji: '🤯', label: 'Pivoting' },
    { emoji: '🎯', label: 'Focused' },
    { emoji: '💭', label: 'Brainstorming' }
  ];

  const [campusEvents, setCampusEvents] = useState<CampusEvent[]>([]);
  const [eventDetailPopup, setEventDetailPopup] = useState<CampusEvent | null>(null);
  const [feedProjects, setFeedProjects] = useState<Project[]>([]);
  const [feedGroups, setFeedGroups] = useState<GroupChat[]>([]);
  const [collegeCoverImages, setCollegeCoverImages] = useState<Record<string, string | null>>({});
  const [campusMatchRequests, setCampusMatchRequests] = useState<any[]>([]);
  const [anonymousChatPost, setAnonymousChatPost] = useState<Post | null>(null);
  const [anonymousChatMessage, setAnonymousChatMessage] = useState('');
  const [anonymousChatSending, setAnonymousChatSending] = useState(false);
  const [anonymousChatError, setAnonymousChatError] = useState('');

  useEffect(() => {
    api.events.getAll().then((data: CampusEvent[]) => setCampusEvents(data)).catch(() => {});
    api.projects.getAll().then((data: Project[]) => setFeedProjects(data)).catch(() => {});
    api.groupChats.getAll().then((data: GroupChat[]) => setFeedGroups(data)).catch(() => {});
    api.collegeSettings.getAll().then(setCollegeCoverImages).catch(() => {});
    fetch(`${API_ORIGIN}/api/find-people/requests?userId=${currentUser.id}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => setCampusMatchRequests(data))
      .catch(() => {});
  }, [currentUser.id]);

  const closeAnonymousChat = () => {
    if (anonymousChatSending) return;
    setAnonymousChatPost(null);
    setAnonymousChatMessage('');
    setAnonymousChatError('');
  };

  const handleAnonymousChatSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!anonymousChatPost || !anonymousChatMessage.trim() || anonymousChatSending) return;

    setAnonymousChatSending(true);
    setAnonymousChatError('');
    try {
      await api.messages.sendAnonymous(anonymousChatPost.id, currentUser.id, anonymousChatMessage.trim());
      setAnonymousChatPost(null);
      setAnonymousChatMessage('');
      onNavigate?.('messages');
    } catch (error: any) {
      setAnonymousChatError(error?.message || 'Could not send the anonymous message. Please try again.');
    } finally {
      setAnonymousChatSending(false);
    }
  };

  const handleEventRegister = async (ev: CampusEvent) => {
    const isRegistered = ev.registeredIds.includes(currentUser.id);
    try {
      const updated = isRegistered
        ? await api.events.unregister(ev.id, currentUser.id)
        : await api.events.register(ev.id, currentUser.id);
      setCampusEvents(prev => prev.map(e => e.id === ev.id ? updated : e));
      if (eventDetailPopup?.id === ev.id) setEventDetailPopup(updated);
    } catch {}
  };

  // Client-side local file uploader converts custom image to Base64
  const handleLocalImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        alert('File size too large. Please select an image under 8MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPostImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('Files must be 10 MB or smaller.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setAttachment({
      name: file.name,
      data: reader.result as string,
      mimeType: file.type || 'application/octet-stream',
    });
    reader.readAsDataURL(file);
  };

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    const finalImage = showMediaOptions && postImage ? postImage.trim() : undefined;
    const finalTitle = showMediaOptions && projectTitle.trim() ? projectTitle.trim() : undefined;
    const finalWebsiteUrl = showMediaOptions && websiteUrl.trim() ? websiteUrl.trim() : undefined;
    const finalTags = showMediaOptions
      ? postTags.split(',').map(tag => tag.trim()).filter(Boolean).slice(0, 12)
      : [];

    onAddPost(
      newPostContent.trim(),
      selectedTag,
      selectedCommunity || undefined,
      finalTitle,
      finalImage,
      selectedFeeling || undefined,
      finalWebsiteUrl,
      finalTags,
      showMediaOptions ? attachment ?? undefined : undefined
    );

    setNewPostContent('');
    setProjectTitle('');
    setPostImage('');
    setWebsiteUrl('');
    setPostTags('');
    setAttachment(null);
    setSelectedFeeling('');
    setShowMediaOptions(false);
  };

  const handleCommentReply = (postId: string, user: UserProfile) => {
    setExpandedComments(prev => ({ ...prev, [postId]: true }));
    window.requestAnimationFrame(() => commentInputRefs.current[postId]?.mentionUser(user.fullName));
  };

  // Filter posts based on community selection context
  const filteredPosts = posts.filter(p => {
    if (activeCommunityId) {
      return p.communityId === activeCommunityId;
    }
    return true;
  });

  const visibleFeedPosts = filteredPosts.filter(post => {
    if (feedFilter === 'all') return true;
    const tag = (post.academicTag ?? '').toLowerCase();
    if (feedFilter === 'questions') return tag.includes('question') || tag.includes('help');
    if (feedFilter === 'opportunities') {
      return tag.includes('career') || tag.includes('intern') || tag.includes('hackathon')
        || tag.includes('startup') || tag.includes('co-founder') || tag.includes('research');
    }
    return tag.includes('notes') || tag.includes('resource') || tag.includes('exam')
      || tag.includes('academic') || tag.includes('study');
  });

  const connectedUserIds = new Set(
    connections
      .filter(c => (c.senderId === currentUser.id || c.receiverId === currentUser.id) && c.status === 'accepted')
      .map(c => c.senderId === currentUser.id ? c.receiverId : c.senderId)
  );

  // Hide accepted or pending relationships from recommendation cards. Rejected
  // requests remain eligible so students can reconnect later.
  const relatedUserIds = new Set(
    connections
      .filter(c => (c.senderId === currentUser.id || c.receiverId === currentUser.id) && c.status !== 'rejected')
      .map(c => c.senderId === currentUser.id ? c.receiverId : c.senderId)
  );

  // Track users to whom current user has already sent a pending request.
  const pendingUserIds = new Set(
    connections
      .filter(c => c.senderId === currentUser.id && c.status === 'pending')
      .map(c => c.receiverId)
  );

  const dm = darkMode;

  const STUDY_KEYWORDS = ['study', 'research', 'exam', 'notes', 'academics', 'learn', 'tutor', 'peer'];
  const STARTUP_KEYWORDS = ['startup', 'founder', 'venture', 'product', 'business', 'entrepreneur', 'mvp', 'saas'];

  const eligibleUsers = allUsers.filter(u => u.id !== currentUser.id && !u.isSuspended && !relatedUserIds.has(u.id));
  const pathwayRecommendations = getStudentRecommendations(currentUser, allUsers, connections);
  const currentYear = normalizeYear(currentUser.year);
  const connectPreferenceUsers = activeCommunityId
    ? []
    : allUsers.filter(u => Boolean(u.connectPreference?.trim()) && !u.isSuspended);

  // Smart match for sidebar "People You Should Meet"
  const scoredMatches = eligibleUsers
    .map(u => {
      let score = 0;
      score += sharedInterestNames(u, currentUser).length * 2;
      score += u.lookingFor.filter(l => currentUser.lookingFor.includes(l)).length * 2;
      score += u.skills.filter(s => !currentUser.skills.includes(s) && currentUser.lookingFor.some(l => s.toLowerCase().includes(l.toLowerCase().substring(0, 4)))).length;
      if (u.college === currentUser.college) score += 1;
      return { user: u, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(m => m.user);

  // TYPE 6 — Study Partners: same college + study interests + lookingFor Study Partner
  const studyPartners = eligibleUsers
    .map(u => {
      let score = 0;
      if (u.college === currentUser.college) score += 5;
      score += u.interests.filter(i => STUDY_KEYWORDS.some(k => i.toLowerCase().includes(k))).length * 3;
      score += u.lookingFor.filter(l => l.toLowerCase().includes('study') || l.toLowerCase().includes('partner') || l.toLowerCase().includes('research')).length * 4;
      score += u.interests.filter(i => currentUser.interests.includes(i)).length * 2;
      if (u.branch && u.branch === currentUser.branch) score += 3;
      return { u, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(x => x.u);

  // TYPE 7 — Friendship: shared hobbies + same batch/year
  const friendSuggestions = eligibleUsers
    .map(u => {
      let score = 0;
      score += sharedInterestNames(u, currentUser).length * 4;
      if (u.college === currentUser.college) score += 3;
      if (normalizeYear(u.year) !== null && normalizeYear(u.year) === currentYear) score += 2;
      score += u.lookingFor.filter(l => l.toLowerCase().includes('friend') || l.toLowerCase().includes('network') || l.toLowerCase().includes('connect')).length * 2;
      return { u, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(x => x.u);

  // TYPE 13 — real feed posts asking for a study partner. Keep this separate
  // from profile matches so a post can be answered without pretending it is a
  // generic people recommendation.
  const studyPartnerPosts = filteredPosts
    .filter(post => {
      const author = allUsers.find(u => u.id === post.authorId);
      return post.authorId !== currentUser.id
        && Boolean(author)
        && !author?.isSuspended
        && isStudyPartnerRequest(post);
    })
    .map(post => {
      const author = allUsers.find(u => u.id === post.authorId)!;
      const shared = sharedInterestNames(author, currentUser);
      const ageMs = Math.max(0, Date.now() - new Date(post.createdAt).getTime());
      const freshnessScore = Number.isFinite(ageMs) ? Math.max(0, 4 - ageMs / (24 * 60 * 60 * 1000)) : 0;
      return {
        post,
        author,
        shared,
        score: (author.college === currentUser.college ? 8 : 0) + shared.length * 3 + freshnessScore,
      };
    })
    .sort((a, b) => b.score - a.score || new Date(b.post.createdAt).getTime() - new Date(a.post.createdAt).getTime())
    .slice(0, 4);

  // TYPE 9 — "What's happening at your college" trending data
  const myCollegePosts = posts.filter(p => {
    const author = allUsers.find(u => u.id === p.authorId);
    return author?.college === currentUser.college;
  });
  const tagCounts: Record<string, number> = {};
  myCollegePosts.forEach(p => {
    if (p.academicTag) tagCounts[p.academicTag] = (tagCounts[p.academicTag] || 0) + 1;
  });
  const trendingTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const collegeStudentCount = allUsers.filter(u => u.college === currentUser.college).length;
  const collegeConnectedCount = allUsers.filter(u =>
    u.college === currentUser.college && connectedUserIds.has(u.id)
  ).length;
  const hotCommunities = communities
    .map(c => ({
      c,
      collegeMembers: c.memberIds.filter(id => {
        const u = allUsers.find(x => x.id === id);
        return u?.college === currentUser.college;
      }).length
    }))
    .filter(x => x.collegeMembers > 0)
    .sort((a, b) => b.collegeMembers - a.collegeMembers)
    .slice(0, 4);
  const recentCollegePost = myCollegePosts.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];

  // TYPE 10 — College Leaderboard
  const collegeUsers = allUsers.filter(u => u.college === currentUser.college && !u.isSuspended);
  const leaderboard = collegeUsers.map(u => {
    const userPosts = posts.filter(p => p.authorId === u.id);
    const postCount = userPosts.length;
    const likesReceived = userPosts.reduce((sum, p) => sum + p.likes.length, 0);
    const connectionCount = connections.filter(
      c => (c.senderId === u.id || c.receiverId === u.id) && c.status === 'accepted'
    ).length;
    const score = postCount * 3 + likesReceived * 2 + connectionCount;
    return { u, postCount, likesReceived, connectionCount, score };
  })
  .sort((a, b) => b.score - a.score)
  .slice(0, 5);

  // TYPE 8 — Co-Founders: startup focus + complementary skills
  const coFounderSuggestions = eligibleUsers
    .map(u => {
      let score = 0;
      score += u.interests.filter(i => STARTUP_KEYWORDS.some(k => i.toLowerCase().includes(k))).length * 3;
      score += u.lookingFor.filter(l => l.toLowerCase().includes('co-founder') || l.toLowerCase().includes('cofounder') || l.toLowerCase().includes('startup') || l.toLowerCase().includes('partner')).length * 5;
      const complementarySkills = u.skills.filter(s => !currentUser.skills.includes(s)).length;
      score += complementarySkills;
      if (u.isVerified) score += 1;
      return { u, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(x => x.u);

  // Topic recommendations use the same profile signals students choose during
  // onboarding/profile editing. If there is no exact match yet, popular
  // unjoined communities still provide a useful fallback.
  const profileSignals = [
    ...(currentUser.interests ?? []),
    ...(currentUser.skills ?? []),
    ...(currentUser.lookingFor ?? []),
  ].map(signal => signal.toLowerCase());
  const studentAudience = getStudentAudience(currentUser);
  const topicBundles = [
    ['dsa', 'data structures', 'algorithms', 'competitive programming', 'coding interview', 'problem solving'],
    ['web development', 'web dev', 'frontend', 'front end', 'backend', 'full stack', 'react', 'javascript', 'html', 'css'],
    ['placement', 'placements', 'placement preparation', 'interview', 'aptitude', 'resume', 'career', 'internship', 'job'],
    ['ai', 'machine learning', 'ml', 'data science', 'python'],
    ['startup', 'entrepreneurship', 'founder', 'business', 'product'],
  ];
  const communitySuggestions = communities
    .filter(c => !c.memberIds.includes(currentUser.id) && c.category !== 'Club')
    .map(c => {
      const text = [c.name, c.description, c.category, ...(c.tags ?? [])].join(' ').toLowerCase();
      const matchedSignals = profileSignals.filter(signal => signal.length > 2 && text.includes(signal)).length;
         const matchedPathwayTerms = studentAudience.communityTerms.filter(term => text.includes(term)).length;
      const matchedBundles = topicBundles.reduce((score, bundle) => {
        const inCommunity = bundle.some(term => text.includes(term));
        const inProfile = profileSignals.some(signal => bundle.some(term => signal.includes(term) || term.includes(signal)));
        return score + (inCommunity && inProfile ? 12 : inCommunity ? 3 : 0);
      }, 0);
         return { community: c, score: matchedSignals * 4 + matchedBundles + matchedPathwayTerms * 7 };
    })
    .sort((a, b) => b.score - a.score || b.community.memberIds.length - a.community.memberIds.length)
    .map(({ community }) => community)
    .slice(0, 8);

  const suggestCommunities = communitySuggestions.length > 0
    ? communitySuggestions
    : communities.filter(c => !c.memberIds.includes(currentUser.id) && c.category !== 'Club')
      .sort((a, b) => b.memberIds.length - a.memberIds.length)
      .slice(0, 8);
  const suggestProjects = feedProjects
    .filter(p => p.creatorId !== currentUser.id && !p.memberIds.includes(currentUser.id))
    .slice(0, 6);

  const suggestGroups = feedGroups
    .filter(g => !g.memberIds.includes(currentUser.id) && !g.pendingIds.includes(currentUser.id))
    .slice(0, 6);

  const suggestEvents = campusEvents
    .filter(e => !e.registeredIds.includes(currentUser.id))
    .slice(0, 5);

  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [joinedProjects, setJoinedProjects] = useState<Set<string>>(new Set());
  const [joinedGroups, setJoinedGroups] = useState<Set<string>>(new Set());
  const [joinedFeedComms, setJoinedFeedComms] = useState<Set<string>>(new Set());

  const CAMPUS_MATCH_DISMISSED_KEY = `campus_match_promo_v1_${currentUser.id}`;
  const [campusMatchDismissed, setCampusMatchDismissed] = useState(
    () => localStorage.getItem(CAMPUS_MATCH_DISMISSED_KEY) === '1'
  );
  const dismissCampusMatchPromo = () => {
    localStorage.setItem(CAMPUS_MATCH_DISMISSED_KEY, '1');
    setCampusMatchDismissed(true);
  };

  const SuggCard = ({ children, posKey, accentColor = 'text-indigo-400' }: { children: React.ReactNode; posKey: string; accentColor?: string; key?: React.Key }) => {
    const dismiss = () => setDismissedSuggestions(prev => new Set([...prev, posKey]));
    return (
      <div className={`rounded-2xl border overflow-hidden shadow-sm ${dm ? 'bg-[#121217] border-white/10' : 'bg-white border-neutral-200'}`}>
        {children}
        <div className={`px-4 pb-3 pt-0 flex items-center justify-between`}>
          <button onClick={dismiss} className={`text-[10px] ${dm ? 'text-slate-600 hover:text-slate-400' : 'text-slate-300 hover:text-slate-500'} transition-all cursor-pointer`}>
            Not interested
          </button>
        </div>
      </div>
    );
  };

  const renderSuggestionCard = (typeIndex: number, key: string, posKey: string) => {
    if (dismissedSuggestions.has(posKey)) return null;

    // TYPE 8 — College Communities
    if (typeIndex === 8) {
      const collegeCommunities = communities.filter(c => c.category === 'College Community');
      if (collegeCommunities.length === 0) return null;
      const myComm = collegeCommunities.find(c => c.name === currentUser.college);
      const others = collegeCommunities.filter(c => c.name !== currentUser.college).slice(0, 5);
      const display = myComm ? [myComm, ...others] : collegeCommunities.slice(0, 6);

      const GRAD_PAIRS = [
        'from-emerald-500 to-teal-600',
        'from-indigo-500 to-violet-600',
        'from-rose-500 to-pink-600',
        'from-amber-500 to-orange-600',
        'from-sky-500 to-blue-600',
        'from-fuchsia-500 to-purple-600',
      ];

      return (
        <div key={key} className={`rounded-2xl border overflow-hidden shadow-md ${dm ? 'bg-[#0d0d12] border-white/10' : 'bg-white border-neutral-200/80'}`}>
          {/* Header — mint gradient background like the screenshot */}
          <div className={`relative overflow-hidden px-4 pt-4 pb-4 ${dm ? 'bg-emerald-900/20' : 'bg-gradient-to-br from-emerald-50 via-teal-50/60 to-white'}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
                  <GraduationCap size={19} className="text-white" />
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.18em] text-emerald-600">✦ Official Campus Spaces</p>
                  <h3 className={`text-[15px] font-black leading-tight tracking-tight ${dm ? 'text-white' : 'text-slate-900'}`}>College Communities</h3>
                  <p className={`text-[10px] mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{collegeCommunities.length} registered colleges on the platform</p>
                </div>
              </div>
              <button onClick={() => onNavigate?.('communities')} className="shrink-0 text-[11px] font-bold text-emerald-600 hover:text-emerald-500 cursor-pointer whitespace-nowrap">
                Browse all →
              </button>
            </div>
          </div>

          {/* College cards — tall images like the screenshot */}
          <div className="flex gap-3 overflow-x-auto px-4 pb-4 pt-3 no-scrollbar">
            {display.map((comm, idx) => {
              const isMyCollege = comm.name === currentUser.college;
              const localJoined = joinedFeedComms.has(comm.id) || comm.memberIds.includes(currentUser.id);
              return (
                <div
                  key={comm.id}
                  style={{ touchAction: 'manipulation' }}
                  onClick={() => onNavigate?.('communities')}
                  className={`shrink-0 w-[155px] rounded-2xl border overflow-hidden flex flex-col cursor-pointer active:scale-[0.98] transition-transform ${dm ? 'border-white/10 bg-[#111118]' : 'border-neutral-200 bg-white shadow-sm'}`}
                >
                  {/* Tall image area */}
                  <div className="h-[100px] relative overflow-hidden">
                    <img
                      src={collegeCoverImages[comm.name] || getCollegeImage(comm.name)}
                      alt={comm.name}
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = getCommunityImage(comm.name, 'College Community', comm.id);
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/50 pointer-events-none" />
                    {/* Graduation cap icon centered */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-10 h-10 rounded-xl bg-black/30 backdrop-blur-sm flex items-center justify-center">
                        <GraduationCap size={17} className="text-white" />
                      </div>
                    </div>
                    {isMyCollege && (
                      <span className="absolute top-2 left-2 text-[8px] font-black bg-white/90 text-slate-800 px-2 py-0.5 rounded-full pointer-events-none tracking-wide uppercase">YOUR COLLEGE</span>
                    )}
                    {localJoined && !isMyCollege && (
                      <span className="absolute top-2 right-2 text-[8px] font-bold bg-emerald-500/90 text-white px-1.5 py-0.5 rounded-full pointer-events-none">✓ Joined</span>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="flex flex-col flex-1 px-3 pt-2.5 pb-3 gap-1">
                    <p className={`text-[12px] font-extrabold leading-tight line-clamp-2 ${dm ? 'text-white' : 'text-slate-900'}`}>{comm.name}</p>
                    <p className={`text-[10px] ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
                      {comm.memberIds.length} joined · {(comm as any).realMemberCount ?? '?'} students
                    </p>
                    <button
                      style={{ touchAction: 'manipulation' }}
                      onClick={async (e) => {
                        e.stopPropagation();
                        const wasJoined = localJoined;
                        setJoinedFeedComms(prev => {
                          const next = new Set(prev);
                          wasJoined ? next.delete(comm.id) : next.add(comm.id);
                          return next;
                        });
                        const newIds = wasJoined
                          ? comm.memberIds.filter(id => id !== currentUser.id)
                          : [...comm.memberIds, currentUser.id];
                        try {
                          await fetch(`${API_ORIGIN}/api/communities/${comm.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ memberIds: newIds }),
                          });
                          comm.memberIds = newIds;
                        } catch {
                          setJoinedFeedComms(prev => {
                            const next = new Set(prev);
                            wasJoined ? next.add(comm.id) : next.delete(comm.id);
                            return next;
                          });
                        }
                      }}
                      className={`mt-2 w-full h-[38px] text-[11px] font-extrabold rounded-xl cursor-pointer transition-all active:scale-95 ${
                        localJoined
                          ? `border ${dm ? 'border-rose-500/50 text-rose-400' : 'border-rose-400 text-rose-500'} bg-transparent hover:bg-rose-50`
                          : 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25 hover:bg-emerald-600'
                      }`}
                    >
                      {localJoined ? 'Leave' : '⚡ Join'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className={`px-4 pb-3 pt-2 flex items-center justify-between border-t ${dm ? 'border-white/5' : 'border-neutral-100'}`}>
            <button onClick={() => setDismissedSuggestions(prev => new Set([...prev, posKey]))} className={`text-[10px] cursor-pointer transition-all ${dm ? 'text-slate-700 hover:text-slate-500' : 'text-slate-400 hover:text-slate-600'}`}>Not interested</button>
            <button onClick={() => onNavigate?.('communities')} className="text-[11px] font-bold text-emerald-600 hover:text-emerald-500 cursor-pointer">All college communities →</button>
          </div>
        </div>
      );
    }

    // TYPE 13 — Study Partner Requests from the live feed
    if (typeIndex === 13) {
      if (studyPartnerPosts.length === 0) return null;
      return (
        <SuggCard key={key} posKey={posKey}>
          <div className="flex items-center justify-between px-4 pt-4 pb-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <span className="text-sm">📚</span>
              </div>
              <div>
                <p className={`text-[9px] font-mono uppercase tracking-widest ${dm ? 'text-slate-500' : 'text-slate-400'}`}>From the community</p>
                <h3 className={`text-sm font-extrabold leading-none mt-0.5 ${dm ? 'text-white' : 'text-slate-900'}`}>Study Partner Requests</h3>
              </div>
            </div>
            <button
              onClick={() => onNavigate?.('explore')}
              className="text-[10px] font-semibold text-blue-500 hover:text-blue-400 cursor-pointer"
            >
              See all →
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto px-4 py-3 no-scrollbar">
            {studyPartnerPosts.map(({ post, author, shared }) => {
              const isPending = pendingUserIds.has(author.id);
              const date = new Date(post.createdAt);
              const timeLabel = Number.isFinite(date.getTime())
                ? date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                : 'Recently';

              return (
                <article
                  key={post.id}
                  className={`shrink-0 w-56 rounded-2xl border p-3 flex flex-col gap-2 ${dm ? 'border-white/8 bg-white/4' : 'border-neutral-100 bg-slate-50/80'}`}
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => !post.isAnonymous && onViewUserProfile?.(author.id)}
                      className={`w-8 h-8 rounded-full overflow-hidden shrink-0 border-0 ${post.isAnonymous ? 'bg-blue-500/15 text-blue-500 flex items-center justify-center font-black text-xs' : 'cursor-pointer'}`}
                      aria-label={post.isAnonymous ? 'Anonymous student' : `View ${author.fullName}'s profile`}
                    >
                      {post.isAnonymous ? '?' : <Avatar avatar={author.avatar} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <p className={`text-[11px] font-bold truncate ${dm ? 'text-white' : 'text-slate-900'}`}>
                          {post.isAnonymous ? 'Anonymous student' : author.fullName}
                        </p>
                        {!post.isAnonymous && author.isVerified && <span className="text-[9px] text-indigo-500 shrink-0">✓</span>}
                      </div>
                      <p className={`text-[9px] truncate ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
                        {author.college}{author.branch ? ` · ${author.branch}` : ''}
                      </p>
                    </div>
                    <span className={`text-[8px] shrink-0 ${dm ? 'text-slate-600' : 'text-slate-400'}`}>{timeLabel}</span>
                  </div>

                  <div className={`rounded-xl px-2.5 py-2 min-h-[54px] ${dm ? 'bg-blue-500/8' : 'bg-white'}`}>
                    <p className={`text-[10px] font-bold text-blue-600 dark:text-blue-400 mb-0.5`}>
                      Looking for: Study partner
                    </p>
                    <p className={`text-[10px] leading-relaxed line-clamp-3 ${dm ? 'text-slate-300' : 'text-slate-600'}`}>
                      {post.content}
                    </p>
                  </div>

                  {shared.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {shared.slice(0, 2).map(interest => (
                        <span key={interest} className={`text-[8px] px-1.5 py-0.5 rounded-full font-semibold ${dm ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-50 text-blue-600'}`}>
                          {interest}
                        </span>
                      ))}
                    </div>
                  )}

                  {post.isAnonymous ? (
                    <button
                      onClick={() => {
                        setAnonymousChatError('');
                        setAnonymousChatMessage('');
                        setAnonymousChatPost(post);
                      }}
                      className="w-full min-h-[34px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold transition-all cursor-pointer"
                    >
                      Chat anonymously
                    </button>
                  ) : isPending ? (
                    <button
                      type="button"
                      disabled
                      className="w-full min-h-[34px] rounded-xl bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-slate-500 text-[10px] font-bold cursor-not-allowed"
                    >
                      Requested ✓
                    </button>
                  ) : (
                    <button
                      onClick={() => onSendConnectionRequest?.(author.id, 'Study Partner')}
                      className="w-full min-h-[34px] rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold transition-all cursor-pointer"
                    >
                      Connect to study
                    </button>
                  )}
                </article>
              );
            })}
          </div>

          <div className={`px-4 pb-3 pt-1 flex items-center justify-between border-t ${dm ? 'border-white/5' : 'border-neutral-100'}`}>
            <span className={`text-[9px] ${dm ? 'text-slate-600' : 'text-slate-400'}`}>Real requests from your feed</span>
            <button onClick={() => onNavigate?.('explore')} className="text-[10px] font-semibold text-blue-500 hover:text-blue-400 cursor-pointer">
              Find study partners →
            </button>
          </div>
        </SuggCard>
      );
    }

    // TYPE 6 — Study Partners
    if (typeIndex === 6) {
      const people = studyPartners.length > 0 ? studyPartners : eligibleUsers.slice(0, 8);
      return (
        <section key={key} className={`overflow-hidden rounded-3xl border p-3.5 shadow-sm sm:p-4 ${dm ? 'border-amber-500/15 bg-[#151411]' : 'border-amber-100 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/50 shadow-[0_8px_30px_rgba(245,158,11,0.08)]'}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300">📚</span>
              <div className="min-w-0">
                <p className={`text-[9px] font-black uppercase tracking-[0.16em] ${dm ? 'text-amber-300' : 'text-amber-700'}`}>Looking for study</p>
                <h3 className={`mt-0.5 truncate text-sm font-extrabold leading-tight sm:text-base ${dm ? 'text-white' : 'text-slate-900'}`}>Find a study partner</h3>
                <p className={`mt-0.5 truncate text-[10px] sm:text-[11px] ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Students who are ready to learn together.</p>
              </div>
            </div>
            <button onClick={() => onNavigate?.('explore')} className="shrink-0 text-[10px] font-bold text-amber-800 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-200 cursor-pointer">Meet more</button>
          </div>
          <div className="mt-3 flex gap-3 overflow-x-auto px-0.5 py-1 no-scrollbar">
            {people.length === 0 ? (
              <p className={`w-full rounded-2xl border border-dashed px-4 py-5 text-center text-xs ${dm ? 'border-white/10 text-slate-500' : 'border-amber-200 text-slate-500'}`}>No study partners found yet.</p>
            ) : people.map(u => {
              const sharedInterests = sharedInterestNames(u, currentUser);
              const isPending = pendingUserIds.has(u.id);
              const education = getEducationDisplay(u);
              const studyDetails = [education.compact, 'Study Partner'].filter(Boolean).join(' · ');
              return (
                <article key={u.id} className={`flex h-[138px] w-[min(320px,calc(100vw-72px))] shrink-0 flex-col justify-between overflow-hidden rounded-2xl border bg-white shadow-[0_4px_18px_rgba(36,31,79,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(36,31,79,0.12)] sm:w-[320px] ${dm ? 'border-white/10 bg-[#1b1a17]' : 'border-slate-200/90'}`}>
                  <button
                    type="button"
                    onClick={() => onViewUserProfile?.(u.id)}
                    aria-label={`View ${u.fullName}'s profile`}
                    className="flex min-h-0 flex-1 items-center gap-3 p-3.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-indigo-600 shadow-sm ring-2 ring-white">
                      <Avatar avatar={u.avatar} fallbackText={u.fullName} className="h-full w-full rounded-full object-cover" />
                      {u.isVerified && <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-[8px] font-bold text-white">✓</span>}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-black text-slate-900 dark:text-white">{u.fullName}</span>
                      <span className="mt-0.5 block truncate text-[10px] text-slate-500 dark:text-slate-400">{u.college?.split(' ').slice(0, 3).join(' ') || 'Student'}{u.branch ? ` · ${u.branch}` : ''}</span>
                      <span className="mt-1.5 block truncate text-[10px] font-bold text-amber-700 dark:text-amber-300">{studyDetails}</span>
                    </span>
                  </button>
                  <div className={`flex items-center justify-between gap-2 border-t px-3 py-2 ${dm ? 'border-white/8 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/70'}`}>
                    <span className="min-w-0 flex-1 truncate text-[9px] font-semibold text-slate-500 dark:text-slate-400">
                      {sharedInterests.length ? sharedInterests.slice(0, 2).join(' · ') : 'Shared learning goals'}
                    </span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {isPending
                        ? <button disabled className="rounded-lg bg-slate-100 px-2 py-1.5 text-[9px] font-bold text-slate-400 dark:bg-white/10 dark:text-slate-500">Requested</button>
                        : <button onClick={() => onSendConnectionRequest?.(u.id, 'Study Partner')} className="rounded-lg border border-amber-200 px-2 py-1.5 text-[9px] font-bold text-amber-800 transition hover:bg-amber-50 dark:border-amber-300/20 dark:text-amber-300 dark:hover:bg-amber-300/10">Connect</button>
                      }
                      <button onClick={() => onViewUserProfile?.(u.id)} className="rounded-lg bg-amber-500 px-2.5 py-1.5 text-[9px] font-black text-white transition hover:bg-amber-600">View profile</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="mt-2 border-t border-amber-100/80 pt-2 dark:border-white/5">
            <button onClick={() => setDismissedSuggestions(prev => new Set([...prev, posKey]))} className={`text-[10px] transition ${dm ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-600'} cursor-pointer`}>Not interested</button>
          </div>
        </section>
      );
    }

    // TYPE 7 — Friendship Suggestions
    if (typeIndex === 7) {
      const people = friendSuggestions.length > 0 ? friendSuggestions : eligibleUsers.slice(0, 8);
      return (
        <div key={key} className={`rounded-2xl border overflow-hidden shadow-sm ${dm ? 'bg-[#121217] border-white/10' : 'bg-white border-neutral-200'}`}>
          <div className="flex items-center justify-between px-4 pt-4 pb-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-pink-500/10 flex items-center justify-center"><span className="text-sm">👋</span></div>
              <div>
                <p className={`text-[9px] font-mono uppercase tracking-widest ${dm ? 'text-slate-500' : 'text-slate-400'}`}>People like you</p>
                <h3 className={`text-sm font-extrabold leading-none mt-0.5 ${dm ? 'text-white' : 'text-slate-900'}`}>Make Friends</h3>
              </div>
            </div>
            <button onClick={() => onNavigate?.('explore')} className="text-[10px] font-semibold text-pink-500 hover:text-pink-400 cursor-pointer">See all →</button>
          </div>
          <div className="flex gap-3 overflow-x-auto px-4 py-3 no-scrollbar">
            {people.length === 0 ? (
              <p className={`text-xs py-4 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>You know everyone! 🎉</p>
            ) : people.map(u => {
              const sharedInterests = sharedInterestNames(u, currentUser);
              const isPending = pendingUserIds.has(u.id);
              return (
                <div key={u.id} className={`shrink-0 w-40 rounded-2xl border overflow-hidden flex flex-col ${dm ? 'border-white/8 bg-white/4' : 'border-neutral-100 bg-white'}`} style={{boxShadow: dm ? 'none' : '0 1px 8px rgba(0,0,0,0.06)'}}>
                  <div className="relative h-24 bg-gradient-to-br from-pink-400 to-rose-600 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/40 shadow-lg flex items-center justify-center bg-white/20">
                      <Avatar avatar={u.avatar} />
                    </div>
                    {u.isVerified && <span className="absolute top-2 right-2 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center text-[9px] text-white font-bold shadow">✓</span>}
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-pink-500 text-white text-[8px] font-bold">👋 Friendship</span>
                  </div>
                  <div className="p-3 flex flex-col gap-2 flex-1">
                    <div>
                      <p className={`text-xs font-bold truncate cursor-pointer hover:underline ${dm ? 'text-white' : 'text-slate-900'}`} onClick={() => onViewUserProfile?.(u.id)}>{u.fullName}</p>
                      <p className={`text-[10px] truncate mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{u.college?.split(' ').slice(0,3).join(' ')}</p>
                      {sharedInterests.length > 0 && <p className="text-[9px] text-pink-500 font-semibold">{sharedInterests.length} shared interest{sharedInterests.length > 1 ? 's' : ''}</p>}
                    </div>
                    {sharedInterests.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {sharedInterests.slice(0,2).map(i => (
                          <span key={i} className="text-[8px] px-1.5 py-0.5 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400 font-medium">{i}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-1.5 mt-auto">
                      {isPending
                        ? <button disabled className="flex-1 min-h-[36px] rounded-xl bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-slate-500 text-[10px] font-bold cursor-not-allowed">Requested ✓</button>
                        : <button onClick={() => onSendConnectionRequest?.(u.id, 'Friendship')} className="flex-1 min-h-[36px] rounded-xl bg-pink-500 text-white text-[10px] font-bold active:bg-pink-700 hover:bg-pink-600 transition-all cursor-pointer touch-manipulation">Connect</button>
                      }
                      <button onClick={() => onViewUserProfile?.(u.id)} className={`px-3 min-h-[36px] rounded-xl text-[10px] font-bold transition-all cursor-pointer border touch-manipulation ${dm ? 'border-white/10 text-slate-300 hover:bg-white/5 active:bg-white/10' : 'border-neutral-200 text-slate-600 hover:bg-slate-50 active:bg-slate-100'}`}>View</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className={`px-4 pb-3 pt-1 flex items-center justify-between border-t ${dm ? 'border-white/5' : 'border-neutral-100'}`}>
            <button onClick={() => setDismissedSuggestions(prev => new Set([...prev, posKey]))} className={`text-[10px] ${dm ? 'text-slate-600 hover:text-slate-400' : 'text-slate-300 hover:text-slate-500'} transition-all cursor-pointer`}>Not interested</button>
            <button onClick={() => onNavigate?.('explore')} className="text-[10px] font-semibold text-pink-500 hover:text-pink-400 cursor-pointer">Find friends →</button>
          </div>
        </div>
      );
    }

    // TYPE 8 — Co-Founders
    if (typeIndex === 8) {
      const people = coFounderSuggestions;
      return (
        <div key={key} className={`rounded-2xl border overflow-hidden shadow-sm ${dm ? 'bg-[#121217] border-white/10' : 'bg-white border-neutral-200'}`}>
          <div className="flex items-center justify-between px-4 pt-4 pb-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-violet-500/10 flex items-center justify-center"><span className="text-sm">🚀</span></div>
              <div>
                <p className={`text-[9px] font-mono uppercase tracking-widest ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Build together</p>
                <h3 className={`text-sm font-extrabold leading-none mt-0.5 ${dm ? 'text-white' : 'text-slate-900'}`}>Find Co-Founders</h3>
              </div>
            </div>
            <button onClick={() => onNavigate?.('explore')} className="text-[10px] font-semibold text-violet-500 hover:text-violet-400 cursor-pointer">See all →</button>
          </div>
          <div className="flex gap-3 overflow-x-auto px-4 py-3 no-scrollbar">
            {people.length === 0 ? (
              <p className={`text-xs py-4 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>No co-founder matches yet.</p>
            ) : people.map(u => {
              const complementarySkills = u.skills.filter(s => !currentUser.skills.includes(s)).slice(0, 2);
              const isPending = pendingUserIds.has(u.id);
              return (
                <div key={u.id} className={`shrink-0 w-40 rounded-2xl border overflow-hidden flex flex-col ${dm ? 'border-white/8 bg-white/4' : 'border-neutral-100 bg-white'}`} style={{boxShadow: dm ? 'none' : '0 1px 8px rgba(0,0,0,0.06)'}}>
                  <div className="relative h-24 bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/40 shadow-lg flex items-center justify-center bg-white/20">
                      <Avatar avatar={u.avatar} />
                    </div>
                    {u.isVerified && <span className="absolute top-2 right-2 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center text-[9px] text-white font-bold shadow">✓</span>}
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-violet-600 text-white text-[8px] font-bold">🚀 Co-Founder</span>
                  </div>
                  <div className="p-3 flex flex-col gap-2 flex-1">
                    <div>
                      <p className={`text-xs font-bold truncate cursor-pointer hover:underline ${dm ? 'text-white' : 'text-slate-900'}`} onClick={() => onViewUserProfile?.(u.id)}>{u.fullName}</p>
                      <p className={`text-[10px] truncate mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{u.college?.split(' ').slice(0,3).join(' ')}</p>
                      {complementarySkills.length > 0 && <p className="text-[9px] text-violet-500 font-semibold">Has skills you need</p>}
                    </div>
                    {complementarySkills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {complementarySkills.map(s => (
                          <span key={s} className="text-[8px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium">{s}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-1.5 mt-auto">
                      {isPending
                        ? <button disabled className="flex-1 min-h-[36px] rounded-xl bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-slate-500 text-[10px] font-bold cursor-not-allowed">Requested ✓</button>
                        : <button onClick={() => onSendConnectionRequest?.(u.id, 'Startup Discussion')} className="flex-1 min-h-[36px] rounded-xl bg-violet-600 text-white text-[10px] font-bold active:bg-violet-800 hover:bg-violet-700 transition-all cursor-pointer touch-manipulation">Connect</button>
                      }
                      <button onClick={() => onViewUserProfile?.(u.id)} className={`px-3 min-h-[36px] rounded-xl text-[10px] font-bold transition-all cursor-pointer border touch-manipulation ${dm ? 'border-white/10 text-slate-300 hover:bg-white/5 active:bg-white/10' : 'border-neutral-200 text-slate-600 hover:bg-slate-50 active:bg-slate-100'}`}>View</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className={`px-4 pb-3 pt-1 flex items-center justify-between border-t ${dm ? 'border-white/5' : 'border-neutral-100'}`}>
            <button onClick={() => setDismissedSuggestions(prev => new Set([...prev, posKey]))} className={`text-[10px] ${dm ? 'text-slate-600 hover:text-slate-400' : 'text-slate-300 hover:text-slate-500'} transition-all cursor-pointer`}>Not interested</button>
            <button onClick={() => onNavigate?.('explore')} className="text-[10px] font-semibold text-violet-500 hover:text-violet-400 cursor-pointer">Find co-founders →</button>
          </div>
        </div>
      );
    }

    // TYPE 9 — What's happening at your college
    if (typeIndex === 9) {
      const collegeName = currentUser.college;
      const shortName = collegeName.length > 30 ? collegeName.split(' ').slice(0, 3).join(' ') : collegeName;
      const TAG_COLORS = [
        'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
        'bg-rose-500/10 text-rose-600 dark:text-rose-400',
        'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        'bg-violet-500/10 text-violet-600 dark:text-violet-400',
        'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
      ];
      return (
        <div key={key} className={`rounded-2xl border overflow-hidden shadow-sm ${dm ? 'bg-[#121217] border-white/10' : 'bg-white border-neutral-200'}`}>
          {/* Header */}
          <div className={`px-4 pt-4 pb-3 border-b ${dm ? 'border-white/5' : 'border-neutral-100'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-base shrink-0">🏫</div>
                <div>
                  <p className={`text-[9px] font-mono uppercase tracking-widest ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Your college</p>
                  <h3 className={`text-sm font-extrabold leading-tight ${dm ? 'text-white' : 'text-slate-900'}`}>What's happening at</h3>
                  <p className="text-[11px] font-bold text-indigo-500 truncate max-w-[200px]">{shortName}</p>
                </div>
              </div>
              <div className={`shrink-0 text-right`}>
                <p className={`text-lg font-black ${dm ? 'text-white' : 'text-slate-900'}`}>{collegeStudentCount}</p>
                <p className={`text-[9px] font-mono ${dm ? 'text-slate-500' : 'text-slate-400'}`}>students here</p>
              </div>
            </div>

            {/* Stats bar */}
            <div className={`flex items-center gap-3 mt-3 pt-3 border-t ${dm ? 'border-white/5' : 'border-neutral-100'}`}>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className={`text-[10px] font-semibold ${dm ? 'text-slate-300' : 'text-slate-700'}`}>{myCollegePosts.length} posts</span>
              </div>
              <span className={`text-[9px] ${dm ? 'text-slate-600' : 'text-slate-300'}`}>·</span>
              <span className={`text-[10px] ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{collegeConnectedCount} connections</span>
              {recentCollegePost && (
                <>
                  <span className={`text-[9px] ${dm ? 'text-slate-600' : 'text-slate-300'}`}>·</span>
                  <span className={`text-[10px] ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Active recently</span>
                </>
              )}
            </div>
          </div>

          {/* Trending Tags */}
          {trendingTags.length > 0 && (
            <div className="px-4 pt-3 pb-2">
              <p className={`text-[9px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
                <TrendingUp size={9} /> Trending topics
              </p>
              <div className="flex flex-wrap gap-1.5">
                {trendingTags.map(([tag, count], i) => (
                  <span key={tag} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold ${TAG_COLORS[i % TAG_COLORS.length]}`}>
                    <span>{tag.split(' ').slice(0, 2).join(' ')}</span>
                    <span className="opacity-60 text-[8px] font-bold">×{count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Hot Communities */}
          {hotCommunities.length > 0 && (
            <div className={`px-4 py-3 border-t ${dm ? 'border-white/5' : 'border-neutral-100'}`}>
              <p className={`text-[9px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
                <Users size={9} /> Active hubs at your college
              </p>
              <div className="flex flex-col gap-1.5">
                {hotCommunities.map(({ c, collegeMembers }) => (
                  <button
                    key={c.id}
                    onClick={() => onNavigate?.('communities')}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all cursor-pointer border-0 ${dm ? 'bg-white/4 hover:bg-white/8' : 'bg-neutral-50 hover:bg-indigo-50/60'}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm shrink-0">{c.icon || '🏛️'}</span>
                      <span className={`text-[11px] font-semibold truncate ${dm ? 'text-slate-200' : 'text-slate-800'}`}>{c.name}</span>
                    </div>
                    <span className={`text-[9px] font-mono shrink-0 ml-2 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{collegeMembers} from your college</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {trendingTags.length === 0 && hotCommunities.length === 0 && (
            <div className="px-4 py-5 text-center">
              <p className={`text-xs ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Be the first from {shortName} to post! 🎉</p>
            </div>
          )}

          <div className={`px-4 pb-3 pt-2 flex items-center justify-between border-t ${dm ? 'border-white/5' : 'border-neutral-100'}`}>
            <button onClick={() => setDismissedSuggestions(prev => new Set([...prev, posKey]))} className={`text-[10px] ${dm ? 'text-slate-600 hover:text-slate-400' : 'text-slate-300 hover:text-slate-500'} transition-all cursor-pointer`}>Dismiss</button>
            <button onClick={() => onNavigate?.('colleges')} className="text-[10px] font-semibold text-indigo-500 hover:text-indigo-400 cursor-pointer">View college →</button>
          </div>
        </div>
      );
    }

    // TYPE 10 — College Leaderboard
    if (typeIndex === 10) {
      const RANK_STYLES = [
        { bg: 'from-amber-400 to-yellow-500', text: 'text-amber-900', badge: '🥇' },
        { bg: 'from-slate-300 to-slate-400', text: 'text-slate-800', badge: '🥈' },
        { bg: 'from-amber-600 to-orange-600', text: 'text-amber-100', badge: '🥉' },
        { bg: 'from-indigo-400 to-blue-500', text: 'text-white', badge: '4' },
        { bg: 'from-violet-400 to-purple-500', text: 'text-white', badge: '5' },
      ];
      const shortCollege = (currentUser.college || '').length > 28
        ? (currentUser.college || '').split(' ').slice(0, 3).join(' ')
        : (currentUser.college || '');
      const myRank = leaderboard.findIndex(e => e.u.id === currentUser.id);
      return (
        <div key={key} className={`rounded-2xl border overflow-hidden shadow-sm ${dm ? 'bg-[#121217] border-white/10' : 'bg-white border-neutral-200'}`}>
          {/* Header */}
          <div className={`px-4 pt-4 pb-3 border-b ${dm ? 'border-white/5' : 'border-neutral-100'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-base shrink-0">🏆</div>
                <div>
                  <p className={`text-[9px] font-mono uppercase tracking-widest ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Top students at</p>
                  <h3 className={`text-sm font-extrabold leading-tight ${dm ? 'text-white' : 'text-slate-900'}`}>{shortCollege}</h3>
                </div>
              </div>
              {myRank >= 0 && (
                <div className={`shrink-0 text-right`}>
                  <p className={`text-xl font-black ${dm ? 'text-amber-400' : 'text-amber-500'}`}>#{myRank + 1}</p>
                  <p className={`text-[9px] font-mono ${dm ? 'text-slate-500' : 'text-slate-400'}`}>your rank</p>
                </div>
              )}
            </div>
          </div>

          {/* Leaderboard rows */}
          <div className="px-4 py-3 flex flex-col gap-2">
            {leaderboard.length === 0 ? (
              <p className={`text-xs py-3 text-center ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Post and connect to climb the board!</p>
            ) : leaderboard.map((entry, i) => {
              const rs = RANK_STYLES[i] ?? RANK_STYLES[4];
              const isMe = entry.u.id === currentUser.id;
              return (
                <button
                  key={entry.u.id}
                  onClick={() => onViewUserProfile?.(entry.u.id)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all cursor-pointer text-left border-0 w-full ${isMe ? (dm ? 'bg-amber-500/10 ring-1 ring-amber-500/30' : 'bg-amber-50 ring-1 ring-amber-200') : (dm ? 'bg-white/4 hover:bg-white/8' : 'bg-neutral-50 hover:bg-neutral-100')}`}
                >
                  {/* Rank badge */}
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${rs.bg} flex items-center justify-center shrink-0`}>
                    <span className={`text-[11px] font-black ${rs.text}`}>{i < 3 ? rs.badge : i + 1}</span>
                  </div>
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border-2 border-white/20">
                    <Avatar avatar={entry.u.avatar} />
                  </div>
                  {/* Name + stats */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-[11px] font-bold truncate ${dm ? 'text-white' : 'text-slate-900'}`}>{entry.u.fullName}</p>
                      {isMe && <span className="text-[8px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full shrink-0">You</span>}
                      {entry.u.isVerified && <span className="text-[9px] text-indigo-500 shrink-0">✓</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[9px] ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{entry.postCount} posts</span>
                      <span className={`text-[9px] ${dm ? 'text-slate-600' : 'text-slate-300'}`}>·</span>
                      <span className={`text-[9px] ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{entry.likesReceived} likes</span>
                      <span className={`text-[9px] ${dm ? 'text-slate-600' : 'text-slate-300'}`}>·</span>
                      <span className={`text-[9px] ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{entry.connectionCount} connections</span>
                    </div>
                  </div>
                  {/* Score */}
                  <div className="shrink-0 text-right">
                    <p className={`text-sm font-black ${i === 0 ? 'text-amber-500' : (dm ? 'text-slate-300' : 'text-slate-700')}`}>{entry.score}</p>
                    <p className={`text-[8px] font-mono ${dm ? 'text-slate-600' : 'text-slate-400'}`}>pts</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer hint */}
          <div className={`px-4 pb-3 pt-1 border-t ${dm ? 'border-white/5' : 'border-neutral-100'}`}>
            <p className={`text-[9px] ${dm ? 'text-slate-600' : 'text-slate-400'}`}>Score = posts ×3 + likes ×2 + connections. Post more to rise! 🚀</p>
          </div>
        </div>
      );
    }

    // TYPE 1 — Recommended Campus Hubs
    if (typeIndex === 1) {
      return (
        <HubSuggestionCard
          key={key}
          communities={suggestCommunities}
          currentUser={currentUser}
          darkMode={dm}
          onNavigate={onNavigate}
          onJoinCommunity={onJoinCommunity}
          onDismiss={() => setDismissedSuggestions(prev => new Set([...prev, posKey]))}
        />
      );
    }

    // TYPE 2 — Open Projects
    if (typeIndex === 2) {
      const STAGE_COLORS: Record<string, string> = {
        Idea: 'bg-amber-500/15 text-amber-500',
        Building: 'bg-blue-500/15 text-blue-500',
        MVP: 'bg-violet-500/15 text-violet-500',
        Launched: 'bg-emerald-500/15 text-emerald-500',
      };
      return (
        <SuggCard key={key} posKey={posKey}>
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center"><Rocket size={12} className="text-amber-500" /></div>
              <div>
                <p className={`text-[9px] font-mono uppercase tracking-wider ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Collaborate</p>
                <h3 className={`text-xs font-bold leading-none mt-0.5 ${dm ? 'text-white' : 'text-slate-900'}`}>Open Projects 🛠️</h3>
              </div>
            </div>
            <button onClick={() => onNavigate?.('projects')} className="text-[10px] font-semibold text-amber-500 hover:text-amber-400 cursor-pointer">See all</button>
          </div>
          {suggestProjects.length === 0 ? (
            <div className="px-4 pb-4">
              <p className={`text-xs text-center py-3 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>No open projects right now. <button onClick={() => onNavigate?.('projects')} className="text-amber-500 font-semibold cursor-pointer">Start one →</button></p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto px-4 pb-4 no-scrollbar">
              {suggestProjects.map(p => {
                const isJoined = joinedProjects.has(p.id);
                return (
                  <div key={p.id} className={`shrink-0 w-44 rounded-xl border p-3 flex flex-col gap-2 ${dm ? 'border-white/8 bg-white/4' : 'border-neutral-100 bg-slate-50/80'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md ${STAGE_COLORS[p.stage] || 'bg-slate-100 text-slate-500'}`}>{p.stage}</span>
                      <span className={`text-[9px] ${dm ? 'text-slate-600' : 'text-slate-400'}`}>{p.memberIds.length} members</span>
                    </div>
                    <p className={`text-[11px] font-bold leading-snug ${dm ? 'text-white' : 'text-slate-900'}`}>{p.title}</p>
                    <p className={`text-[9px] leading-relaxed line-clamp-2 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{p.description}</p>
                    {p.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {p.tags.slice(0,2).map(t => (
                          <span key={t} className={`text-[8px] px-1 py-0.5 rounded ${dm ? 'bg-white/8 text-slate-400' : 'bg-neutral-200 text-slate-500'}`}>{t}</span>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={async () => {
                        if (isJoined) return;
                        try { await api.projects.join(p.id, currentUser.id); setJoinedProjects(prev => new Set([...prev, p.id])); } catch {}
                      }}
                      className={`mt-auto w-full py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${isJoined ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
                    >
                      {isJoined ? '✓ Joined' : 'Join Project'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </SuggCard>
      );
    }

    // TYPE 3 — Campus Groups
    if (typeIndex === 3) {
      const TYPE_COLORS: Record<string, string> = {
        college: 'bg-blue-500/15 text-blue-500',
        batch: 'bg-violet-500/15 text-violet-500',
        branch: 'bg-pink-500/15 text-pink-500',
        course: 'bg-cyan-500/15 text-cyan-500',
        exam: 'bg-rose-500/15 text-rose-500',
        interest: 'bg-amber-500/15 text-amber-500',
      };
      return (
        <SuggCard key={key} posKey={posKey}>
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-violet-500/10 flex items-center justify-center"><MessageSquare size={12} className="text-violet-500" /></div>
              <div>
                <p className={`text-[9px] font-mono uppercase tracking-wider ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Campus circles</p>
                <h3 className={`text-xs font-bold leading-none mt-0.5 ${dm ? 'text-white' : 'text-slate-900'}`}>Groups to Join 💬</h3>
              </div>
            </div>
            <button onClick={() => onNavigate?.('messages')} className="text-[10px] font-semibold text-violet-500 hover:text-violet-400 cursor-pointer">See all</button>
          </div>
          {suggestGroups.length === 0 ? (
            <div className="px-4 pb-4">
              <p className={`text-xs text-center py-3 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>You're in all relevant groups! <button onClick={() => onNavigate?.('messages')} className="text-violet-500 font-semibold cursor-pointer">Create one →</button></p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto px-4 pb-4 no-scrollbar">
              {suggestGroups.map(g => {
                const isRequested = joinedGroups.has(g.id);
                return (
                  <div key={g.id} className={`shrink-0 w-40 rounded-xl border p-3 flex flex-col gap-2 ${dm ? 'border-white/8 bg-white/4' : 'border-neutral-100 bg-slate-50/80'}`}>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                      <MessageSquare size={16} className="text-white" />
                    </div>
                    <div>
                      <p className={`text-[11px] font-bold leading-snug ${dm ? 'text-white' : 'text-slate-900'}`}>{g.name}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className={`text-[8px] px-1.5 py-0.5 rounded-md font-bold ${TYPE_COLORS[g.type] || 'bg-slate-100 text-slate-500'}`}>{g.type}</span>
                      </div>
                      <p className={`text-[9px] mt-1 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{g.memberIds.length} members · {g.college.split(' ').slice(0,2).join(' ')}</p>
                    </div>
                    <button
                      onClick={() => { setJoinedGroups(prev => new Set([...prev, g.id])); onNavigate?.('messages'); }}
                      className={`mt-auto w-full py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${isRequested ? 'bg-violet-500/15 text-violet-500' : 'bg-violet-500 text-white hover:bg-violet-600'}`}
                    >
                      {isRequested ? '→ Open Chats' : 'Join Group'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </SuggCard>
      );
    }

    // TYPE 4 — Upcoming Events
    if (typeIndex === 4) {
      const catColors: Record<string, string> = {
        Hackathon: 'from-orange-500 to-rose-500',
        'Study Group': 'from-blue-500 to-indigo-500',
        Seminar: 'from-violet-500 to-purple-600',
        Workshop: 'from-cyan-500 to-teal-500',
        Social: 'from-pink-500 to-rose-400',
        Sports: 'from-green-500 to-emerald-500',
      };
      return (
        <SuggCard key={key} posKey={posKey}>
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-rose-500/10 flex items-center justify-center"><Calendar size={12} className="text-rose-500" /></div>
              <div>
                <p className={`text-[9px] font-mono uppercase tracking-wider ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Don't miss out</p>
                <h3 className={`text-xs font-bold leading-none mt-0.5 ${dm ? 'text-white' : 'text-slate-900'}`}>Upcoming Events 📅</h3>
              </div>
            </div>
            <button onClick={() => onNavigate?.('events')} className="text-[10px] font-semibold text-rose-500 hover:text-rose-400 cursor-pointer">See all</button>
          </div>
          {suggestEvents.length === 0 ? (
            <div className="px-4 pb-4">
              <p className={`text-xs text-center py-3 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>You're all caught up on events! 🎉</p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto px-4 pb-4 no-scrollbar">
              {suggestEvents.map(ev => {
                const grad = catColors[ev.category] || 'from-indigo-500 to-violet-600';
                return (
                  <div key={ev.id} className={`shrink-0 w-44 rounded-xl border overflow-hidden ${dm ? 'border-white/8' : 'border-neutral-100'}`}>
                    <div className={`h-10 bg-gradient-to-r ${grad} flex items-center px-3 gap-2`}>
                      <span className="text-[8px] font-bold text-white/90 uppercase tracking-wide">{ev.category}</span>
                      {ev.isOnline && <Globe size={9} className="text-white/80 ml-auto shrink-0" />}
                    </div>
                    <div className={`p-3 flex flex-col gap-1.5 ${dm ? 'bg-white/4' : 'bg-slate-50/80'}`}>
                      <p className={`text-[11px] font-bold leading-snug ${dm ? 'text-white' : 'text-slate-900'}`}>{ev.title}</p>
                      <p className={`text-[9px] ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{ev.date}{ev.time ? ` · ${ev.time}` : ''}</p>
                      {ev.venue && <p className={`text-[9px] truncate ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{ev.venue}</p>}
                      <p className={`text-[9px] ${dm ? 'text-slate-600' : 'text-slate-400'}`}>{ev.registeredIds.length}{ev.maxSeats ? `/${ev.maxSeats}` : ''} going</p>
                      <button
                        onClick={() => { handleEventRegister(ev); }}
                        className="mt-1 w-full py-1.5 rounded-lg bg-rose-500 text-white text-[10px] font-bold hover:bg-rose-600 transition-all cursor-pointer"
                      >
                        Register →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SuggCard>
      );
    }

    // TYPE 5 — Campus Colleges Card (full-width banner cards)
    if (typeIndex === 5) {
      const campusColleges = Array.from(
        new Map(
          allUsers
            .filter(u => u.college)
            .map(u => [u.college, u])
        ).values()
      ).slice(0, 4);

      return (
        <div key={key} className={`rounded-2xl border overflow-hidden shadow-sm ${dm ? 'bg-[#121217] border-white/10' : 'bg-white border-neutral-200'}`}>
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-indigo-500/10 flex items-center justify-center"><span className="text-sm">🏛️</span></div>
              <div>
                <p className={`text-[9px] font-mono uppercase tracking-widest ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Campus Network</p>
                <h3 className={`text-sm font-extrabold leading-none mt-0.5 ${dm ? 'text-white' : 'text-slate-900'}`}>Colleges on Platform</h3>
              </div>
            </div>
            <button onClick={() => onNavigate?.('colleges')} className="text-[10px] font-semibold text-indigo-500 hover:text-indigo-400 cursor-pointer">See All →</button>
          </div>

          <div className="px-4 pb-2 space-y-3">
            {campusColleges.map((u) => {
              const collegeName = u.college!;
              const imgUrl = collegeCoverImages[collegeName] || getCollegeImage(collegeName);
              const isMyCollege = collegeName === currentUser.college;
              const studentsHere = allUsers.filter(x => x.college === collegeName).length;
              const clubsHere = communities.filter(c => (c as any).college === collegeName).length;
              const postsHere = posts.filter(p => allUsers.find(x => x.id === p.authorId)?.college === collegeName).length;
              const adminUser = allUsers.find(x => x.college === collegeName && (x.role === 'college_admin'));
              const initials = collegeName.split(' ').filter((w: string) => w.length > 2).map((w: string) => w[0]).join('').toUpperCase().slice(0, 3) || collegeName.slice(0, 3).toUpperCase();

              return (
                <div
                  key={collegeName}
                  onClick={() => onNavigate?.('colleges')}
                  className={`rounded-2xl overflow-hidden cursor-pointer border transition-all hover:shadow-md ${isMyCollege ? (dm ? 'border-indigo-400/30' : 'border-indigo-400/40') : (dm ? 'border-white/8' : 'border-neutral-200')}`}
                >
                  {/* Banner image */}
                  <div className="relative h-36 overflow-hidden">
                    <img
                      src={imgUrl}
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = getCommunityImage(collegeName, 'College Community', collegeName);
                      }}
                      alt={collegeName}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />

                    {/* Expand / chevron top-right */}
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center" onClick={e => e.stopPropagation()}>
                      <ChevronDown size={13} className="text-white" />
                    </div>

                    {/* Admin badge — bottom of image, above avatar */}
                    {adminUser && (
                      <div className="absolute bottom-10 left-3 flex items-center gap-1 bg-black/55 backdrop-blur-sm px-2 py-0.5 rounded-full">
                        <Crown size={9} className="text-amber-400" />
                        <span className="text-[9px] text-white font-semibold">Admin: {adminUser.fullName.split(' ')[0]}</span>
                      </div>
                    )}

                    {/* College initials avatar overlapping bottom */}
                    <div className={`absolute -bottom-5 left-3 w-11 h-11 rounded-full border-[2.5px] ${dm ? 'border-[#121217]' : 'border-white'} overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-extrabold text-[11px] text-white shadow-lg z-10`}>
                      {initials}
                    </div>

                    {/* My College pill */}
                    {isMyCollege && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-indigo-500 text-white text-[8px] font-bold shadow">My College</span>
                    )}
                  </div>

                  {/* Card body */}
                  <div className={`pt-7 pb-3 px-3 ${dm ? 'bg-[#1a1a24]' : 'bg-white'}`}>
                    <h4 className={`font-extrabold text-[13px] leading-tight truncate ${dm ? 'text-white' : 'text-slate-900'}`}>{collegeName}</h4>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                      <span className={`flex items-center gap-1 text-[10px] ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
                        <Users size={9} />{studentsHere} student{studentsHere !== 1 ? 's' : ''} on platform
                      </span>
                      <span className={`flex items-center gap-1 text-[10px] ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
                        <BookOpen size={9} />{clubsHere} {clubsHere === 1 ? 'club' : 'clubs'}
                      </span>
                      <span className={`flex items-center gap-1 text-[10px] ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
                        <MessageCircle size={9} />{postsHere} posts
                      </span>
                      {isMyCollege && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                          <CheckCircle size={9} />Joined
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={`px-4 pb-3 pt-2 flex items-center justify-between border-t ${dm ? 'border-white/5' : 'border-neutral-100'}`}>
            <button onClick={() => setDismissedSuggestions(prev => new Set([...prev, posKey]))} className={`text-[10px] ${dm ? 'text-slate-600 hover:text-slate-400' : 'text-slate-300 hover:text-slate-500'} transition-all cursor-pointer`}>Not interested</button>
            <button onClick={() => onNavigate?.('colleges')} className="text-[10px] font-semibold text-indigo-500 hover:text-indigo-400 cursor-pointer">Browse all colleges →</button>
          </div>
        </div>
      );
    }

    // TYPE 11 — New on The Network
    if (typeIndex === 11) {
      // This is a discovery card, so it introduces real students while keeping
      // same-stage and same-institution profiles ranked first.
      const newPeople = getNewNetworkRecommendations(
        currentUser,
        allUsers,
        connections,
        pathwayRecommendations.map(recommendation => recommendation.user),
      );

      if (newPeople.length === 0) return null;

      return (
        <SuggCard key={key} posKey={posKey}>
          <div className={`px-4 pt-4 pb-3 ${dm ? 'bg-[#17171f]' : 'bg-gradient-to-br from-amber-50/70 via-white to-yellow-50/20'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${dm ? 'bg-amber-400/15' : 'bg-amber-100'}`}>
                  <BookOpen size={19} className={dm ? 'text-amber-300' : 'text-amber-700'} />
                </div>
                <div className="min-w-0">
                  <p className={`text-[9px] font-black uppercase tracking-[0.18em] ${dm ? 'text-amber-300' : 'text-amber-700'}`}>Just joined</p>
                  <h3 className={`mt-1 text-[15px] font-black leading-tight ${dm ? 'text-white' : 'text-slate-900'}`}>New on The Network</h3>
                  <p className={`mt-0.5 text-[10px] ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Meet students from your year and nearby communities.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate?.('connect')}
                className={`shrink-0 pt-1 text-[11px] font-black cursor-pointer ${dm ? 'text-amber-300 hover:text-amber-200' : 'text-amber-700 hover:text-amber-800'}`}
              >
                Meet more
              </button>
            </div>
          </div>

          <div
            data-preserve-horizontal-scroll="new-on-network"
            className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 pt-3 scroll-smooth no-scrollbar"
          >
            {newPeople.slice(0, 8).map(u => {
              const education = getEducationDisplay(u);
              const audience = getStudentAudience(u);
              const details = [u.branch || u.academicStream, audience.examTargets[0] ? `${audience.examTargets[0]} Aspirant` : undefined]
                .filter(Boolean)
                .slice(0, 1)
                .join(' · ');
              const initials = u.fullName
                .split(/\s+/)
                .filter(Boolean)
                .map(part => part[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();
              const sharedInterests = sharedInterestNames(u, currentUser).length;
              const interestTags = [...new Set([...(u.interests || []), ...(u.skills || [])])].slice(0, 2);
              const isPending = pendingUserIds.has(u.id);
              const viewerEducation = getEducationDisplay(currentUser);
              const isSameInstitution = viewerEducation.kind === 'college'
                ? sameEducationValue(u.college, currentUser.college)
                : sameEducationValue(u.schoolName, currentUser.schoolName)
                  || sameEducationValue(u.coachingName, currentUser.coachingName);

              return (
                <article
                  key={u.id}
                  className={`flex h-[366px] w-[238px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg sm:h-[350px] sm:w-[200px] lg:w-[190px] ${dm ? 'border-white/10 bg-[#121217] hover:border-amber-300/30' : 'border-slate-200 bg-white hover:border-amber-200'}`}
                >
                  <button
                    type="button"
                    onClick={() => onViewUserProfile?.(u.id)}
                    className="flex min-h-0 flex-1 flex-col text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400"
                    aria-label={`View ${u.fullName}'s profile`}
                  >
                    <div className="relative flex h-[136px] w-full shrink-0 items-center justify-center bg-gradient-to-br from-violet-500 via-purple-600 to-sky-600">
                      <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[9px] font-black tracking-wide ${dm ? 'bg-emerald-300 text-emerald-950' : 'bg-white/95 text-emerald-700 shadow-sm'}`}>NEW</span>
                      <span className="relative h-[88px] w-[88px] overflow-hidden rounded-full border border-white/50 bg-white/20 shadow-lg">
                        <Avatar
                          avatar={u.avatar}
                          fallbackText={u.fullName || initials}
                          className="h-full w-full rounded-full object-cover"
                          fallbackClassName="!bg-transparent !text-white"
                        />
                      </span>
                      {isSameInstitution && <span className="absolute bottom-3 right-3 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-[10px] font-bold text-white shadow">✓</span>}
                    </div>
                    <div className="min-h-0 flex-1 px-3.5 pb-3 pt-3">
                      <div className="flex items-center gap-1">
                        <p className={`min-w-0 truncate text-[13px] font-black ${dm ? 'text-white' : 'text-slate-900'}`}>{u.fullName}</p>
                        {u.isVerified && <CheckCircle size={13} className="shrink-0 text-emerald-500" />}
                      </div>
                      <p className={`mt-0.5 truncate text-[10px] ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{u.college || education.institution || 'Student'}{details ? ` · ${details}` : ''}</p>
                      <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[9px] font-bold ${dm ? 'bg-amber-400/10 text-amber-300' : 'bg-amber-50 text-amber-700'}`}>
                        {education.compact || 'Student'}
                      </span>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {interestTags.length > 0 ? interestTags.map((tag, index) => (
                          <span key={tag} className={`max-w-full truncate rounded-full px-2 py-1 text-[9px] font-bold ${index % 2 === 0 ? 'bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300'}`}>{tag}</span>
                        )) : <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${dm ? 'bg-violet-400/10 text-violet-300' : 'bg-violet-50 text-violet-700'}`}>New here</span>}
                      </div>
                      {sharedInterests > 0 && (
                        <p className={`mt-3 truncate text-[9px] ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
                          {sharedInterests} shared interest{sharedInterests !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </button>

                  <div className={`flex shrink-0 items-center justify-between gap-2 border-t px-3 py-2.5 ${dm ? 'border-white/8 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/90'}`}>
                    <span className="truncate text-[10px] text-slate-500">
                      {isNewNetworkRecent(u) ? 'Joined recently' : 'New to The Network'}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSendConnectionRequest?.(u.id, 'Friendship')}
                      disabled={isPending}
                      className="shrink-0 rounded-full bg-violet-600 px-3.5 py-2 text-[10px] font-black text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {isPending ? 'Requested' : 'Connect'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </SuggCard>
      );
    }

    // TYPE 12 — Campus Match activity from your college
    if (typeIndex === 12) {
      const PURPOSE_EMOJI: Record<string, string> = {
        'Coffee Chat': '☕', 'Study Partner': '📚', 'Hackathon Team': '🚀',
        'Project Collaborator': '🤝', 'Mentor': '🧑‍🏫', 'Mentee': '🌱',
        'Sports Buddy': '🏸', 'Startup Co-founder': '💼', 'Event Partner': '🎉', 'Friends': '👋',
      };

      // Same college first, then others to fill up to 6
      const sameCollegeReqs = campusMatchRequests.filter(r => r.host?.college === currentUser.college).slice(0, 6);
      const otherReqs = campusMatchRequests.filter(r => r.host?.college !== currentUser.college).slice(0, Math.max(0, 3 - sameCollegeReqs.length));
      const featured = [...sameCollegeReqs, ...otherReqs];

      if (featured.length === 0) return null;

      return (
        <SuggCard key={key} posKey={posKey}>
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-indigo-500/10 flex items-center justify-center"><span className="text-sm">🎯</span></div>
              <div>
                <p className={`text-[9px] font-mono uppercase tracking-widest ${dm ? 'text-slate-500' : 'text-slate-400'}`}>From your campus</p>
                <h3 className={`text-sm font-extrabold leading-none mt-0.5 ${dm ? 'text-white' : 'text-slate-900'}`}>Campus Match Requests</h3>
              </div>
            </div>
            <button onClick={() => onNavigate?.('find-people')} className="text-[10px] font-semibold text-indigo-500 hover:text-indigo-400 cursor-pointer">See all →</button>
          </div>

          <div className="flex gap-3 overflow-x-auto px-4 pb-4 no-scrollbar">
            {featured.map((req: any) => {
              const emoji = PURPOSE_EMOJI[req.purpose] ?? '🎯';
              const isSameCollege = req.host?.college === currentUser.college;
              return (
                <div
                  key={req.id}
                  onClick={() => onNavigate?.('find-people')}
                  className={`shrink-0 w-48 rounded-2xl border p-3 flex flex-col gap-2 cursor-pointer transition-all hover:shadow-md active:scale-[0.98] ${dm ? 'border-white/8 bg-white/4 hover:bg-white/7' : 'border-neutral-100 bg-slate-50/80 hover:bg-white'}`}
                >
                  {/* Host row */}
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0">
                      <Avatar avatar={req.host?.avatar} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-[11px] truncate leading-tight ${dm ? 'text-white' : 'text-slate-900'}`}>{req.host?.fullName}</p>
                      <p className={`text-[9px] truncate ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
                        {isSameCollege ? <span className="text-emerald-500 font-semibold">Your college</span> : req.host?.college}
                      </p>
                    </div>
                  </div>

                  {/* Purpose badge */}
                  <span className={`self-start text-[10px] font-bold px-2 py-0.5 rounded-full ${dm ? 'bg-indigo-500/15 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                    {emoji} {req.purpose}
                  </span>

                  {/* Title */}
                  <p className={`text-[11px] font-semibold leading-snug line-clamp-2 ${dm ? 'text-slate-300' : 'text-slate-700'}`}>{req.title}</p>

                  {/* Footer */}
                  <div className={`flex items-center justify-between mt-auto pt-1 border-t ${dm ? 'border-white/6' : 'border-neutral-100'}`}>
                    <span className={`text-[9px] ${dm ? 'text-slate-600' : 'text-slate-400'}`}>
                      {req.applicantCount ?? 0} applied
                    </span>
                    <span className="text-[10px] font-semibold text-indigo-500">View →</span>
                  </div>
                </div>
              );
            })}
          </div>
        </SuggCard>
      );
    }

    // ── Domain community grid card helper (used by types 14–18) ──────────────
    const renderDomainCard = (cfg: {
      label: string; emoji: string; subtitle: string;
      tags: string[]; grad: string; headerBg: string; accentText: string;
      cardGrads: string[];
    }) => {
      const domainComms = communities.filter(c => c.category !== 'College Community');
      const wordMatch = (text: string, term: string) => {
        const t = text.toLowerCase();
        const re = new RegExp('(^|[\\s/])' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[\\s/,&])', 'i');
        return re.test(t);
      };
      const matched = domainComms.filter(c =>
        cfg.tags.some(t =>
          c.tags?.some((ct: string) => ct.toLowerCase() === t || ct.toLowerCase().startsWith(t + ' ') || ct.toLowerCase().includes(' ' + t)) ||
          wordMatch(c.name, t)
        )
      );
      if (matched.length === 0) return null;
      const display = matched.slice(0, 4);
      const PROJECT_CATS = ['Engineering & Technology', 'Startups & Entrepreneurship', 'Higher Education & Research'];

      return (
        <div key={key} className={`rounded-2xl border overflow-hidden shadow-md ${dm ? 'bg-[#0d0d12] border-white/10' : 'bg-white border-neutral-200/80'}`}>
          {/* Header */}
          <div className={`relative px-4 pt-4 pb-4 ${dm ? 'bg-white/4' : cfg.headerBg}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${cfg.grad} flex items-center justify-center shadow-lg shrink-0`}>
                  <span className="text-xl">{cfg.emoji}</span>
                </div>
                <div>
                  <p className={`text-[8px] font-black uppercase tracking-[0.18em] ${cfg.accentText}`}>✦ Recommended for You</p>
                  <h3 className={`text-[15px] font-black leading-tight tracking-tight ${dm ? 'text-white' : 'text-slate-900'}`}>{cfg.label}</h3>
                  <p className={`text-[10px] mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{cfg.subtitle}</p>
                </div>
              </div>
              <button onClick={() => onNavigate?.('communities')} className={`shrink-0 text-[11px] font-bold ${cfg.accentText} hover:opacity-80 cursor-pointer whitespace-nowrap`}>
                Browse all →
              </button>
            </div>
          </div>

          {/* 2-column community grid */}
          <div className="grid grid-cols-2 gap-3 px-4 py-4">
            {display.map((c, idx) => {
              const isJoined = joinedFeedComms.has(c.id) || c.memberIds.includes(currentUser.id);
              const cardGrad = cfg.cardGrads[idx % cfg.cardGrads.length];
              const commType = PROJECT_CATS.includes(c.category) ? 'PROJECT' : 'CLUB';
              return (
                <div
                  key={c.id}
                  onClick={() => onNavigate?.('communities', c.id)}
                  className={`rounded-2xl overflow-hidden flex flex-col border cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] ${dm ? 'border-white/8 bg-[#111118]' : 'border-neutral-200/70 bg-white'}`}
                  style={{ boxShadow: dm ? 'none' : '0 4px 20px rgba(0,0,0,0.06)' }}
                >
                  {/* Gradient banner */}
                  <div className={`relative h-[80px] bg-gradient-to-br ${cardGrad} flex items-center justify-center`}>
                    <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                      <CommIcon name={c.icon} size={20} className="text-white" />
                    </div>
                    {/* Badge top-right */}
                    <div className="absolute top-2 right-2">
                      <span className="text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-black/30 backdrop-blur-sm text-white">
                        {commType}
                      </span>
                    </div>
                    {/* Member count top-left */}
                    <div className="absolute top-2 left-2 flex items-center gap-0.5">
                      <Users size={8} className="text-white/80" />
                      <span className="text-[8px] text-white/80 font-semibold">{c.memberIds.length} members</span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-3 flex flex-col gap-1.5 flex-1">
                    <p className={`text-[11px] font-black leading-tight tracking-tight ${dm ? 'text-white' : 'text-slate-900'}`}>{c.name}</p>
                    <p className={`text-[9px] leading-relaxed line-clamp-2 flex-1 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{c.description}</p>
                    {c.tags && c.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {c.tags.slice(0, 2).map((t: string) => (
                          <span key={t} className={`text-[8px] px-1.5 py-0.5 rounded-full font-semibold ${dm ? 'bg-white/8 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>#{t}</span>
                        ))}
                      </div>
                    )}
                    <button
                      style={{ touchAction: 'manipulation' }}
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (isJoined) return;
                        setJoinedFeedComms(prev => new Set([...prev, c.id]));
                        try {
                          await fetch(`${API_ORIGIN}/api/communities/${c.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ memberIds: [...c.memberIds, currentUser.id] }),
                          });
                          c.memberIds = [...c.memberIds, currentUser.id];
                        } catch { setJoinedFeedComms(prev => { const n = new Set(prev); n.delete(c.id); return n; }); }
                      }}
                      className={`mt-1 w-full py-2 rounded-xl text-[10px] font-black tracking-wide transition-all cursor-pointer active:scale-95 ${
                        isJoined
                          ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/25'
                          : `bg-gradient-to-r ${cardGrad} text-white shadow-md hover:opacity-90`
                      }`}
                    >
                      {isJoined ? '✓ Joined' : '⚡ Join Community'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className={`px-4 pb-3 pt-1 flex items-center justify-between border-t ${dm ? 'border-white/5' : 'border-neutral-100'}`}>
            <button onClick={() => setDismissedSuggestions(prev => new Set([...prev, posKey]))} className={`text-[10px] cursor-pointer ${dm ? 'text-slate-700 hover:text-slate-500' : 'text-slate-400 hover:text-slate-600'}`}>Not interested</button>
            <button onClick={() => onNavigate?.('communities')} className={`text-[11px] font-bold ${cfg.accentText} hover:opacity-80 cursor-pointer`}>Explore all →</button>
          </div>
        </div>
      );
    };

    // TYPE 14 — Coding Communities (DSA, Web, AI/ML)
    if (typeIndex === 14) {
      return renderDomainCard({
        label: 'Coding Communities', emoji: '💻',
        subtitle: 'DSA, Web Dev, AI/ML & more',
        tags: ['dsa', 'web', 'ai', 'ml', 'cp', 'code', 'dev', 'react', 'python'],
        grad: 'from-blue-500 to-cyan-600', headerBg: 'bg-gradient-to-br from-blue-50 via-cyan-50/60 to-white',
        accentText: 'text-blue-600',
        cardGrads: ['from-blue-500 to-cyan-600', 'from-indigo-500 to-blue-600', 'from-teal-400 to-cyan-500', 'from-sky-500 to-blue-600'],
      });
    }

    // TYPE 15 — Placement Communities
    if (typeIndex === 15) {
      return renderDomainCard({
        label: 'Placement Communities', emoji: '💼',
        subtitle: 'Internships, interviews & off-campus',
        tags: ['placement', 'interview', 'internship', 'off campus', 'job', 'career', 'hiring'],
        grad: 'from-emerald-500 to-teal-600', headerBg: 'bg-gradient-to-br from-emerald-50 via-teal-50/60 to-white',
        accentText: 'text-emerald-600',
        cardGrads: ['from-emerald-500 to-teal-600', 'from-green-400 to-emerald-500', 'from-teal-500 to-cyan-600', 'from-emerald-400 to-green-600'],
      });
    }

    // TYPE 16 — Engineering & Medical Entrance (JEE, NEET, BITSAT)
    if (typeIndex === 16) {
      return renderDomainCard({
        label: 'College Entrance Exams', emoji: '🎓',
        subtitle: 'JEE, NEET, BITSAT, AIIMS prep',
        tags: ['jee', 'jee mains', 'neet', 'bitsat', 'aiims', 'iit jee', 'mbbs'],
        grad: 'from-violet-500 to-indigo-600', headerBg: 'bg-gradient-to-br from-violet-50 via-indigo-50/60 to-white',
        accentText: 'text-violet-600',
        cardGrads: ['from-violet-500 to-indigo-600', 'from-purple-500 to-violet-600', 'from-indigo-400 to-violet-500', 'from-fuchsia-500 to-violet-600'],
      });
    }

    // TYPE 19 — Government & Management Exams (UPSC, GATE, CAT, CLAT)
    if (typeIndex === 19) {
      return renderDomainCard({
        label: 'Gov & Management Exams', emoji: '🏛️',
        subtitle: 'UPSC, GATE, CAT, CLAT & IAS',
        tags: ['upsc', 'gate', 'cat', 'clat', 'ias', 'ips', 'civil services', 'psu'],
        grad: 'from-amber-600 to-yellow-500', headerBg: 'bg-gradient-to-br from-amber-50 via-yellow-50/60 to-white',
        accentText: 'text-amber-700',
        cardGrads: ['from-amber-500 to-yellow-500', 'from-orange-500 to-amber-600', 'from-yellow-500 to-amber-500', 'from-amber-600 to-orange-500'],
      });
    }

    // TYPE 17 — Startup Communities
    if (typeIndex === 17) {
      return renderDomainCard({
        label: 'Startup Communities', emoji: '🚀',
        subtitle: 'Founders, builders & entrepreneurs',
        tags: ['startup', 'founder', 'entrepreneur', 'venture', 'pitch', 'gtm'],
        grad: 'from-orange-500 to-amber-500', headerBg: 'bg-gradient-to-br from-orange-50 via-amber-50/60 to-white',
        accentText: 'text-orange-600',
        cardGrads: ['from-orange-500 to-amber-500', 'from-rose-500 to-orange-500', 'from-amber-400 to-orange-500', 'from-orange-400 to-red-500'],
      });
    }

    // TYPE 18 — Design Communities
    if (typeIndex === 18) {
      return renderDomainCard({
        label: 'Design Communities', emoji: '🎨',
        subtitle: 'UI/UX, graphics & creative work',
        tags: ['ui', 'ux', 'design', 'figma', 'creative', 'graphic', 'product design'],
        grad: 'from-pink-500 to-rose-600', headerBg: 'bg-gradient-to-br from-pink-50 via-rose-50/60 to-white',
        accentText: 'text-pink-600',
        cardGrads: ['from-pink-500 to-rose-600', 'from-fuchsia-500 to-pink-500', 'from-rose-400 to-pink-500', 'from-purple-500 to-pink-500'],
      });
    }

    return null;
  };

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_18rem] gap-8 text-left">
      
      {/* Campus desk: useful updates and actions */}
      <div className="min-w-0 space-y-6">

        {/* Pinned: campus directory — intentionally not a story rail */}
        {(() => {
          const collegeCommunities = communities.filter(c => c.category === 'College Community');
          if (collegeCommunities.length === 0) return null;
          const myComm = collegeCommunities.find(c => c.name === currentUser.college);
          const others = collegeCommunities.filter(c => c.name !== currentUser.college);
          const display = (myComm ? [myComm, ...others] : collegeCommunities).slice(0, 6);
          return (
            <section className={`rounded-[1.35rem] border shadow-sm ${dm ? 'bg-[#0d0d12] border-white/10' : 'bg-white border-neutral-200/80'}`}>
              <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${dm ? 'bg-emerald-500/15' : 'bg-emerald-50'}`}>
                    <GraduationCap size={18} className="text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-600">Campus directory</p>
                    <h2 className={`mt-1 text-base font-black leading-tight tracking-tight ${dm ? 'text-white' : 'text-slate-900'}`}>Where people are learning</h2>
                    <p className={`mt-1 text-[10px] leading-relaxed ${dm ? 'text-slate-500' : 'text-slate-500'}`}>Find your campus space, chapter updates, and people nearby.</p>
                  </div>
                </div>
                <button onClick={() => onNavigate?.('communities')} className="shrink-0 text-[10px] font-bold text-emerald-600 hover:text-emerald-500 cursor-pointer whitespace-nowrap">
                  Directory →
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 px-5 pb-4">
                {display.map((comm) => {
                  const isMyCollege = comm.name === currentUser.college;
                  const imgSrc = collegeCoverImages[comm.name] || getCollegeImage(comm.name);
                  return (
                    <button
                      key={comm.id}
                      type="button"
                      onClick={() => onNavigate?.('communities')}
                      className={`group flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-all cursor-pointer ${
                        isMyCollege
                          ? dm ? 'border-emerald-400/35 bg-emerald-500/10' : 'border-emerald-200 bg-emerald-50/70'
                          : dm ? 'border-white/8 bg-white/4 hover:bg-white/8' : 'border-neutral-100 bg-slate-50 hover:bg-white hover:border-neutral-200'
                      }`}
                    >
                      <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0">
                        <div className={`absolute inset-0 flex items-center justify-center ${dm ? 'bg-emerald-900/50' : 'bg-emerald-100'}`}>
                          <GraduationCap size={14} className={dm ? 'text-emerald-300' : 'text-emerald-600'} />
                        </div>
                        <img
                          src={imgSrc}
                          alt={comm.name}
                          className="absolute inset-0 z-10 h-full w-full object-cover transition-transform group-hover:scale-105"
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = getCommunityImage(comm.name, 'College Community', comm.id);
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className={`truncate text-[10px] font-bold leading-tight ${dm ? 'text-slate-200' : 'text-slate-800'}`}>{comm.name}</p>
                        <p className={`mt-1 truncate text-[9px] ${isMyCollege ? 'font-bold text-emerald-600' : dm ? 'text-slate-500' : 'text-slate-400'}`}>
                          {isMyCollege ? 'Your campus' : `${comm.memberIds.length} members`}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className={`flex items-center justify-between border-t px-5 py-3 ${dm ? 'border-white/5' : 'border-neutral-100'}`}>
                <span className={`text-[9px] ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{collegeStudentCount} students in your campus network</span>
                <button onClick={() => onNavigate?.('communities')} className="text-[10px] font-bold text-indigo-500 hover:text-indigo-400 cursor-pointer">Open spaces →</button>
              </div>
            </section>
          );
        })()}

        {/* Events and discovery blocks are intentionally interleaved with updates below. */}

        <section className={`rounded-[1.35rem] border px-5 py-5 shadow-sm ${dm ? 'bg-[#121217] border-white/10' : 'bg-white border-neutral-200/80'}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-500">Campus desk · {currentUser.college}</p>
              <h1 className={`mt-1 text-xl font-black leading-tight tracking-tight ${dm ? 'text-white' : 'text-slate-900'}`}>Useful updates from your network.</h1>
              <p className={`mt-1.5 max-w-xl text-[11px] leading-relaxed ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
                Questions to answer, opportunities to join, and resources worth keeping.
              </p>
            </div>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className={`shrink-0 rounded-xl border px-3 py-2 text-[10px] font-bold transition-colors cursor-pointer ${dm ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-neutral-200 text-slate-600 hover:bg-slate-50'}`}
              >
                Refresh
              </button>
            )}
          </div>

          <div className={`mt-4 flex gap-1.5 overflow-x-auto border-t pt-3 no-scrollbar ${dm ? 'border-white/8' : 'border-neutral-100'}`} role="tablist" aria-label="Filter campus updates">
            {([
              { key: 'all', label: 'All updates' },
              { key: 'questions', label: 'Questions' },
              { key: 'opportunities', label: 'Opportunities' },
              { key: 'resources', label: 'Resources' },
            ] as const).map(option => (
              <button
                key={option.key}
                type="button"
                role="tab"
                aria-selected={feedFilter === option.key}
                onClick={() => setFeedFilter(option.key)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-[10px] font-bold transition-all cursor-pointer ${
                  feedFilter === option.key
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : dm ? 'text-slate-400 hover:bg-white/6 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        {/* Inline compose card removed — use the Create button instead */}
        {false && !currentUser.isSuspended && (
          <form onSubmit={handlePostSubmit} className={`p-4 rounded-2xl border border-neutral-200 dark:border-white/10 shadow-sm transition-all ${darkMode ? 'bg-[#121217]' : 'bg-white'}`}>
            <div className="flex gap-3">
              <div className="p-[2.5px] rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-600 shrink-0 self-start">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border border-white dark:border-[#121217] overflow-hidden ${darkMode ? 'bg-zinc-900 text-white' : 'bg-slate-100 text-slate-900'}`}>
                  <Avatar avatar={currentUser.avatar} />
                </div>
              </div>
              <div className="flex-1 min-w-0 space-y-3">
                <textarea
                  id="feed-post-input"
                  rows={2}
                  required
                  placeholder={`What are you building, ${currentUser.fullName.split(' ')[0]}? Pitch an idea, find a co-founder, or post a study group request...`}
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  className={`w-full p-2.5 text-xs rounded-xl border border-neutral-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none transition-all ${darkMode ? 'bg-[#09090C] text-slate-100' : 'bg-neutral-50 text-slate-900'}`}
                />

                {/* Instant Life Vibe / Feeling Picker */}
                <div className="space-y-1.5 pt-0.5 pb-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1">
                      <Sparkle size={10} className="text-pink-500 animate-spin-slow" />
                      <span>Builder status / What mode are you in?</span>
                    </span>
                    {selectedFeeling && (
                      <button
                        type="button"
                        onClick={() => setSelectedFeeling('')}
                        className="text-[8.5px] font-bold text-rose-500 hover:underline uppercase bg-transparent border-0 cursor-pointer"
                      >
                        Clear ×
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {FEELING_PRESETS.map((preset) => {
                      const feelingString = `${preset.emoji} ${preset.label}`;
                      const isSelected = selectedFeeling === feelingString;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setSelectedFeeling(isSelected ? '' : feelingString)}
                          className={`px-2.5 py-1 rounded-xl border text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                            isSelected
                              ? 'bg-gradient-to-r from-indigo-500 to-pink-500 border-transparent text-white font-extrabold scale-[1.04] shadow-xs'
                              : darkMode
                              ? 'bg-[#09090C] border-white/5 text-[#F9F7F2] hover:bg-neutral-800'
                              : 'bg-slate-50 border-neutral-300/60 text-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          <span>{preset.emoji}</span>
                          <span className="text-[9.5px] font-medium">{preset.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Real-time media attachments tray */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMediaOptions(!showMediaOptions);
                      if(!showMediaOptions && !postImage) {
                        setImageUploadType('upload');
                      }
                    }}
                    className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 hover:text-indigo-500 transition-colors py-1 cursor-pointer bg-transparent border-0 shrink-0"
                  >
                    <ImageIcon size={13} className="text-pink-500" />
                    <span>{showMediaOptions ? 'Hide ↑' : 'Attach Media ↓'}</span>
                  </button>

                  <select
                    id="feed-tag-select"
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                    className={`max-w-[150px] text-[9.5px] font-bold uppercase px-2 py-1 rounded-lg border border-neutral-300 dark:border-white/10 focus:outline-none cursor-pointer shrink-0 ${darkMode ? 'bg-[#09090C] text-slate-300' : 'bg-white text-slate-700'}`}
                  >
                    {ACADEMIC_TAGS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Expandable media attachment area */}
                {showMediaOptions && (
                  <div className={`p-4 border border-dashed rounded-xl space-y-3 ${darkMode ? 'bg-[#09090C] border-zinc-700/50' : 'bg-neutral-50/50 border-neutral-200'}`}>
                    
                    <div className="space-y-1">
                      <label className="block text-[8.5px] font-mono font-bold uppercase tracking-wider opacity-60">Startup / Project Name (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. AeroCrops Autonomous Drone"
                        value={projectTitle}
                        onChange={(e) => setProjectTitle(e.target.value)}
                        className={`w-full px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 border border-neutral-300 dark:border-white/10 text-xs rounded-xl ${darkMode ? 'bg-[#121217] text-white' : 'bg-white text-black'}`}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[8.5px] font-mono font-bold uppercase tracking-wider opacity-60">Website Link (Optional)</label>
                      <div className="relative">
                        <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500" />
                        <input
                          type="url"
                          placeholder="https://your-project.com"
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                          className={`w-full pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 border border-neutral-300 dark:border-white/10 text-xs rounded-xl ${darkMode ? 'bg-[#121217] text-white' : 'bg-white text-black'}`}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[8.5px] font-mono font-bold uppercase tracking-wider opacity-60">Tags (comma separated)</label>
                      <input
                        type="text"
                        placeholder="e.g. DSA, placements, beginner-friendly"
                        value={postTags}
                        onChange={(e) => setPostTags(e.target.value)}
                        className={`w-full px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 border border-neutral-300 dark:border-white/10 text-xs rounded-xl ${darkMode ? 'bg-[#121217] text-white' : 'bg-white text-black'}`}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[8.5px] font-mono font-bold uppercase tracking-wider opacity-60">PDF / File Attachment (Optional)</label>
                      {attachment ? (
                        <div className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${darkMode ? 'border-white/10 bg-white/5 text-slate-200' : 'border-neutral-200 bg-white text-slate-700'}`}>
                          <span className="flex min-w-0 items-center gap-2 truncate"><FileText size={14} className="shrink-0 text-rose-500" />{attachment.name}</span>
                          <button type="button" onClick={() => setAttachment(null)} className="shrink-0 text-[9px] font-bold text-rose-500 hover:underline">Remove</button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => attachmentFileInputRef.current?.click()}
                          className={`w-full px-3 py-2 border border-dashed rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${darkMode ? 'border-zinc-700 text-slate-400 hover:bg-white/5' : 'border-neutral-300 text-slate-600 hover:bg-white'}`}
                        >
                          <FileText size={13} className="inline mr-1.5" /> Choose PDF or file
                        </button>
                      )}
                      <input ref={attachmentFileInputRef} type="file" accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={handleAttachmentChange} className="hidden" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center bg-neutral-100/60 dark:bg-white/5 p-1 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setImageUploadType('upload')}
                          className={`flex-1 py-1 text-[8.5px] font-bold uppercase tracking-tight rounded-md ${imageUploadType === 'upload' ? 'bg-indigo-500 text-white' : 'opacity-65 text-neutral-400'}`}
                        >
                          Upload File
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageUploadType('preset')}
                          className={`flex-1 py-1 text-[8.5px] font-bold uppercase tracking-tight rounded-md ${imageUploadType === 'preset' ? 'bg-indigo-500 text-white' : 'opacity-65 text-neutral-400'}`}
                        >
                          Stock Preset
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageUploadType('url')}
                          className={`flex-1 py-1 text-[8.5px] font-bold uppercase tracking-tight rounded-md ${imageUploadType === 'url' ? 'bg-indigo-500 text-white' : 'opacity-65 text-neutral-400'}`}
                        >
                          Paste Link
                        </button>
                      </div>

                      {imageUploadType === 'upload' && (
                        <div className="text-center p-3 border border-dashed border-neutral-300 dark:border-zinc-700 rounded-xl">
                          <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleLocalImageChange}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-[10px] font-semibold bg-indigo-500/10 text-indigo-500 px-3 py-1.5 rounded-lg hover:bg-indigo-500 hover:text-white transition-all cursor-pointer"
                          >
                            📷 Choose Local Photo
                          </button>
                          <p className="text-[8px] font-mono opacity-50 mt-1">Accepts PNG, JPG, GIF up to 8MB</p>
                        </div>
                      )}

                      {imageUploadType === 'preset' && (
                        <div className="flex flex-wrap gap-1">
                          {POST_PRESETS.map((preset) => (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() => setPostImage(preset.url)}
                              className={`px-2 py-1 text-[8.5px] border font-bold uppercase cursor-pointer rounded-lg tracking-tight transition-all ${postImage === preset.url ? 'bg-indigo-500 text-white border-transparent' : 'border-neutral-200 dark:border-white/10 bg-transparent text-neutral-500 hover:text-slate-900 dark:hover:text-white'}`}
                            >
                              {preset.name}
                            </button>
                          ))}
                        </div>
                      )}

                      {imageUploadType === 'url' && (
                        <input
                          type="url"
                          placeholder="https://images.unsplash.com/photo-..."
                          value={postImage}
                          onChange={(e) => setPostImage(e.target.value)}
                          className={`w-full px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 border border-neutral-200 dark:border-white/10 text-xs rounded-xl ${darkMode ? 'bg-[#121217] text-white' : 'bg-white text-black'}`}
                        />
                      )}

                      {postImage && (
                        <div className="relative pt-1">
                          <img
                            src={postImage}
                            alt="Preview Showcase"
                            className="h-32 w-full object-cover rounded-xl border border-neutral-300 dark:border-zinc-700/60"
                          />
                          <button
                            type="button"
                            onClick={() => setPostImage('')}
                            className="absolute bottom-2 right-2 px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white font-mono uppercase text-[8px] font-bold rounded-lg shadow-sm cursor-pointer border-0"
                          >
                            Remove Photo ×
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-100 dark:border-white/5">
                  <span className="text-[9px] text-slate-400 font-mono truncate min-w-0">
                    Posting to {selectedCommunity ? communities.find(c => c.id === selectedCommunity)?.name : 'General Campus Desk'}
                  </span>
                  
                  <button
                    id="btn-submit-post"
                    type="submit"
                    className="shrink-0 py-1.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-600 text-white font-bold uppercase text-[10px] tracking-wider flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                  >
                    <Plus size={13} />
                    <span>Launch Post</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* ── Campus Match Promo Card ── */}
        {!campusMatchDismissed && (
          <div className={`relative rounded-2xl overflow-hidden shadow-md border ${darkMode ? 'border-white/10' : 'border-indigo-100'}`}>
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-pink-500" />
            {/* Subtle dot pattern overlay */}
            <div className="absolute inset-0 opacity-10" style={{backgroundImage:'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize:'20px 20px'}} />

            <div className="relative p-5">
              {/* Dismiss */}
              <button
                onClick={dismissCampusMatchPromo}
                className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer border-0"
              >
                <span className="text-[12px] font-bold leading-none">×</span>
              </button>

              {/* Header */}
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Users size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-white/70 text-[10px] font-semibold uppercase tracking-widest">New on The Network</p>
                  <h3 className="text-white font-black text-[18px] leading-tight">Campus Match 🎯</h3>
                </div>
              </div>

              <p className="text-white/85 text-[12px] leading-relaxed mb-4 mt-2">
                Find the right people for your college journey — coffee chats, study buddies, hackathon teams, mentors &amp; more. All from your campus community.
              </p>

              {/* Feature pills */}
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  { emoji: '☕', label: 'Coffee Chat' },
                  { emoji: '📚', label: 'Study Partner' },
                  { emoji: '🚀', label: 'Hackathon Team' },
                  { emoji: '🧑‍🏫', label: 'Find a Mentor' },
                  { emoji: '🤝', label: 'Collaborator' },
                ].map(f => (
                  <span key={f.label} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 text-white text-[11px] font-semibold backdrop-blur-sm">
                    {f.emoji} {f.label}
                  </span>
                ))}
              </div>

              {/* CTA */}
              <button
                onClick={() => { onNavigate?.('find-people'); dismissCampusMatchPromo(); }}
                className="w-full py-2.5 rounded-xl bg-white text-indigo-600 font-extrabold text-[13px] hover:bg-indigo-50 active:scale-[0.98] transition-all cursor-pointer border-0 shadow-sm"
              >
                Explore Campus Match →
              </button>
            </div>
          </div>
        )}

        {/* ── UNIFIED FEED: Reels + Posts merged chronologically ── */}
        <div className="space-y-5">
          {pathwayRecommendations.length > 0 && (
            <PathwayRecommendationsCard
              recommendations={pathwayRecommendations}
              currentUser={currentUser}
              darkMode={darkMode}
              onViewUserProfile={onViewUserProfile}
              onSendConnectionRequest={onSendConnectionRequest}
              onNavigate={onNavigate}
            />
          )}
          {(() => {
            const allReels = stories.filter(s => s.image);
            const postItems = visibleFeedPosts.map(p => ({ kind: 'post' as const, item: p }));
            // The home surface is a campus desk, not an entertainment timeline.
            // Media remains supported on posts, while story/reel content stays
            // out of the primary stream so useful campus context stays clear.
            const unified = [...postItems].sort(
              (a, b) => new Date(b.item.createdAt).getTime() - new Date(a.item.createdAt).getTime()
            );
            const preferenceCards = connectPreferenceUsers.map(student => (
              <ConnectPreferenceFeedCard
                key={`connect-preference-${student.id}`}
                student={student}
                currentUser={currentUser}
                darkMode={darkMode}
                isPending={pendingUserIds.has(student.id)}
                isConnected={connectedUserIds.has(student.id)}
                onViewUserProfile={onViewUserProfile}
                onSendConnectionRequest={onSendConnectionRequest}
                onNavigate={onNavigate}
              />
            ));
            if (unified.length === 0 && preferenceCards.length > 0) return preferenceCards;
            if (unified.length === 0) return (
              <div className={`p-8 rounded-2xl border border-neutral-200 dark:border-white/10 text-center shadow-sm ${darkMode ? 'bg-[#121217]' : 'bg-white'}`}>
                <Clock className="mx-auto text-neutral-400 mb-2 animate-spin-slow" size={24} />
                <h3 className="text-xs font-bold uppercase tracking-widest mb-1.5 text-slate-800 dark:text-slate-200">No Postings Yet</h3>
                <p className={`text-xs max-w-sm mx-auto mb-4 ${darkMode ? 'text-zinc-500' : 'text-neutral-500'}`}>
                  Be the first to share a live startup photo or collaborative query onto this board.
                </p>
                {onRefresh && (
                  <button
                    onClick={onRefresh}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-500 text-white hover:bg-indigo-600 transition-colors cursor-pointer border-0"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                    Refresh Feed
                  </button>
                )}
              </div>
            );
            // Keep the requested discovery blocks inline with posts in the
            // order shown in the feed reference. Reels remain uninterrupted
            // feed content and do not affect this sequence.
            const FEED_TYPES = [6, 8];
            let feedIdx = 0;
            let visiblePostCount = 0;
            let preferenceCardsInserted = false;
            const insertPreferenceCards = () => {
              if (preferenceCardsInserted || preferenceCards.length === 0 || visiblePostCount !== 4) return [];
              preferenceCardsInserted = true;
              return preferenceCards;
            };
            const renderedFeed = unified.flatMap((entry) => {
              if ((entry as { kind: string }).kind === 'reel') {
                const reel = entry.item as unknown as typeof allReels[number];
                const reelAuthor = allUsers.find(u => u.id === reel.authorId);
                const isVid = isVideoReel(reel.image);
                const diff = Date.now() - new Date(reel.createdAt).getTime();
                const h = Math.floor(diff / 3_600_000);
                const m = Math.floor(diff / 60_000);
                const timeAgo = h > 23
                  ? new Date(reel.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                  : h > 0 ? `${h}h ago` : m > 0 ? `${m}m ago` : 'Just now';
                const reelCard = (
                  <div
                    key={`reel-${reel.id}`}
                    className={`rounded-2xl border overflow-hidden shadow-sm transition-all ${darkMode ? 'bg-zinc-950 border-white/8' : 'bg-white border-neutral-200/80'}`}
                  >
                    <div className="flex items-center gap-3 px-4 py-3">
                      <button type="button" onClick={() => onViewUserProfile?.(reelAuthor?.id || '')} className="p-[2px] rounded-full bg-gradient-to-tr from-pink-500 to-rose-400 cursor-pointer border-0 shrink-0">
                        <div className="w-9 h-9 rounded-full overflow-hidden"><Avatar avatar={reelAuthor?.avatar} /></div>
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className={`font-bold text-sm truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{reelAuthor?.fullName}</p>
                          <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-pink-500/10 text-pink-500">REEL</span>
                          {isVid && <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-violet-500/10 text-violet-500 flex items-center gap-0.5"><svg viewBox="0 0 24 24" fill="currentColor" className="w-2 h-2"><path d="M8 5v14l11-7L8 5z"/></svg>VIDEO</span>}
                        </div>
                        <p className={`text-[11px] truncate ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{reelAuthor?.college}</p>
                      </div>
                      <span className={`text-[10px] shrink-0 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>{timeAgo}</span>
                      {onDeleteReel && currentUser.role === 'admin' && (
                        <button
                          onClick={() => onDeleteReel(reel.id)}
                          className="p-1 rounded-full hover:bg-rose-500/10 text-rose-500 transition-colors cursor-pointer border-0 bg-transparent shrink-0"
                          title="Delete Reel"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    <div className="relative cursor-pointer bg-black group" onClick={() => onOpenReel?.(allReels, allReels.indexOf(reel))}>
                      {isVid ? (
                        <video src={reel.image!.startsWith('/') ? `${API_ORIGIN}${reel.image}` : reel.image!} className="w-full max-h-[500px] object-cover" muted playsInline preload="metadata" />
                      ) : (
                        <img src={reel.image!.startsWith('/') ? `${API_ORIGIN}${reel.image}` : reel.image!} alt="" className="w-full max-h-[500px] object-cover" />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/35 transition-all">
                        <div className="w-16 h-16 rounded-full bg-black/40 border-2 border-white/70 flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
                          <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7 ml-1"><path d="M8 5v14l11-7L8 5z"/></svg>
                        </div>
                      </div>
                    </div>
                    {reel.content && <div className={`px-4 pt-3 pb-1 text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{reel.content}</div>}
                    <div className={`flex items-center gap-1 px-3 py-2.5 border-t mt-2 ${darkMode ? 'border-white/6' : 'border-neutral-100'}`}>
                      {(() => {
                        const reelLikes = Array.isArray(reel.likes) ? reel.likes : [];
                        const isReelLiked = reelLikes.includes(currentUser.id);
                        return (
                          <button
                            onClick={() => onLikeReel?.(reel.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer border-0 ${isReelLiked ? 'text-rose-500 font-bold' : darkMode ? 'text-slate-400 hover:bg-white/5 hover:text-rose-400' : 'text-slate-500 hover:bg-rose-50 hover:text-rose-500'}`}
                          >
                            <Heart size={15} fill={isReelLiked ? 'currentColor' : 'none'} />
                            {reelLikes.length > 0 ? `${reelLikes.length} Like${reelLikes.length !== 1 ? 's' : ''}` : 'Like'}
                          </button>
                        );
                      })()}
                      <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer border-0 ${darkMode ? 'text-slate-400 hover:bg-white/5 hover:text-indigo-400' : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-500'}`}><MessageCircle size={15} /> Comment</button>
                      <button onClick={() => onOpenReel?.(allReels, allReels.indexOf(reel))} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer border-0 ml-auto ${darkMode ? 'bg-pink-500/10 text-pink-400 hover:bg-pink-500/20' : 'bg-pink-50 text-pink-500 hover:bg-pink-100'}`}>
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M8 5v14l11-7L8 5z"/></svg> Watch Reel
                      </button>
                      <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer border-0 ${darkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-50'}`}><Share2 size={14} /></button>
                    </div>
                  </div>
                );
                return [reelCard];
              }

              // POST
              const post = entry.item as typeof filteredPosts[number];
              const author = allUsers.find(u => u.id === post.authorId);
              const postCommunity = post.communityId
                ? communities.find(c => c.id === post.communityId)
                : undefined;
              const communityLabel = postCommunity
                ? `In ${postCommunity.name.replace(/\s+community$/i, '').trim()}`
                : null;
              const authorLabel = post.isAnonymous ? 'Posted anonymously' : author ? `Posted by ${author.fullName}` : '';
              const isCommunityJoined = postCommunity
                ? postCommunity.memberIds.includes(currentUser.id) || joinedCommunityIds.has(postCommunity.id)
                : false;
              const handlePostCommunityJoin = async () => {
                if (!postCommunity || isCommunityJoined || !onJoinCommunity) return;
                setJoinedCommunityIds(prev => new Set(prev).add(postCommunity.id));
                try {
                  await onJoinCommunity(postCommunity.id);
                } catch {
                  setJoinedCommunityIds(prev => {
                    const next = new Set(prev);
                    next.delete(postCommunity.id);
                    return next;
                  });
                }
              };
              const isLiked = post.likes.includes(currentUser.id);
              const dateStr = new Date(post.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
              if (!author || author.isSuspended) return [];
              visiblePostCount++;

              // ── QUESTION CARD — special layout for Question ❓ posts ──
              if (post.academicTag === 'Question ❓') {
                const isLikedQ = post.likes.includes(currentUser.id);
                const questionCard = (
                  <div
                    id={`feed-post-card-${post.id}`}
                    key={post.id}
                    className={`rounded-2xl overflow-hidden shadow-sm border transition-all ${darkMode ? 'bg-[#0e1021] border-indigo-500/30' : 'bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/60 border-indigo-200/70'}`}
                  >
                    {/* Top accent bar */}
                    <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-blue-500 to-violet-500" />

                    <div className="p-4">
                      {/* Header row: asker info + QUESTION label + date */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div
                            onClick={() => !post.isAnonymous && onViewUserProfile && onViewUserProfile(author.id)}
                            className={`flex items-center gap-1.5 ${!post.isAnonymous && onViewUserProfile ? 'cursor-pointer' : ''}`}
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border border-white dark:border-[#121217] overflow-hidden ${darkMode ? 'bg-zinc-900 text-white' : 'bg-slate-100 text-slate-900'}`}>
                              {post.isAnonymous ? '?' : <Avatar avatar={author.avatar} />}
                            </div>
                            <span className={`text-xs font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                              {post.isAnonymous ? 'Anonymous student' : author.fullName}
                              {!post.isAnonymous && author.isVerified && <span className="ml-1 text-indigo-500">✓</span>}
                            </span>
                          </div>
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${darkMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-600'}`}>
                            ❓ Question
                          </span>
                        </div>
                         <div className="flex items-center gap-2 shrink-0">
                           {postCommunity && onJoinCommunity && !isCommunityJoined && (
                             <button
                               type="button"
                               onClick={handlePostCommunityJoin}
                               className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black transition-colors cursor-pointer border-0 shadow-sm"
                             >
                               <UserPlus size={10} /> Join community
                             </button>
                           )}
                           {postCommunity && onJoinCommunity && isCommunityJoined && (
                             <span className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[9px] font-bold ${darkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}`}>
                               <CheckCircle2 size={10} /> Joined
                             </span>
                           )}
                           <span className={`text-[9px] font-mono ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>{dateStr}</span>
                         </div>
                      </div>
                      {postCommunity && (
                        <div className={`mb-3 flex items-center gap-1.5 text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          <button
                            type="button"
                            onClick={() => onNavigate?.('communities', postCommunity.id)}
                            className={`font-black tracking-wide ${darkMode ? 'text-indigo-300 hover:text-indigo-200' : 'text-indigo-600 hover:text-indigo-700'} hover:underline cursor-pointer`}
                          >
                            {communityLabel}
                          </button>
                          <span>·</span>
                           <span>{authorLabel}</span>
                        </div>
                      )}

                      {/* Question text — big and prominent */}
                      <div className="flex gap-3 items-start mb-4">
                        <div className={`shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center text-2xl font-black select-none ${darkMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-600'}`}>
                          ?
                        </div>
                        <p className={`text-sm font-semibold leading-snug pt-1 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                          {post.content}
                        </p>
                      </div>

                      {/* Tags row */}
                      {post.communityId && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${darkMode ? 'bg-white/5 text-slate-400' : 'bg-indigo-100/60 text-indigo-500'}`}>
                            #{communities.find(c => c.id === post.communityId)?.name.split(' ')[0]}
                          </span>
                        </div>
                      )}

                      {/* Action row */}
                      <div className={`flex items-center gap-3 pt-3 border-t ${darkMode ? 'border-white/8' : 'border-indigo-100'}`}>
                        <button
                          onClick={() => onLikePost(post.id)}
                          className={`flex items-center gap-1.5 text-[11px] font-bold transition-colors cursor-pointer border-0 bg-transparent ${isLikedQ ? 'text-rose-500' : darkMode ? 'text-slate-500 hover:text-rose-400' : 'text-slate-400 hover:text-rose-500'}`}
                        >
                          <Heart size={13} fill={isLikedQ ? 'currentColor' : 'none'} />
                          {post.likes.length}
                        </button>

                        <button
                          type="button"
                          onClick={() => setExpandedComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                          className={`flex items-center gap-1.5 text-[11px] font-bold transition-colors cursor-pointer border-0 bg-transparent ${darkMode ? 'text-slate-500 hover:text-indigo-400' : 'text-slate-400 hover:text-indigo-500'}`}
                        >
                          <MessageCircle size={13} />
                          {post.comments.length} {post.comments.length === 1 ? 'Answer' : 'Answers'}
                        </button>

                        {/* Answer CTA */}
                        <button
                          type="button"
                          onClick={() => setExpandedComments(prev => ({ ...prev, [post.id]: true }))}
                          className={`ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer border-0 shadow-sm ${darkMode ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                        >
                          ✏ Answer
                        </button>

                        <button
                          onClick={async () => {
                            if (navigator.share) {
                              try { await navigator.share({ title: 'Question on The Network', text: post.content, url: window.location.href }); } catch (_) {}
                            } else {
                              await navigator.clipboard.writeText(window.location.href);
                            }
                          }}
                          className={`p-1.5 rounded-full transition-colors cursor-pointer border-0 bg-transparent ${darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          <Share2 size={13} />
                        </button>
                      </div>

                      {/* Answers section */}
                      {expandedComments[post.id] && (
                        <div className={`mt-3 pt-3 border-t space-y-2.5 ${darkMode ? 'border-white/8' : 'border-indigo-100'}`}>
                          {post.comments.length === 0 ? (
                            <p className={`text-[10.5px] italic text-center py-2 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                              No answers yet — be the first to help! 👋
                            </p>
                          ) : post.comments.map((comment) => {
                            const commAuthor = allUsers.find(u => u.id === comment.authorId);
                            if (!commAuthor || commAuthor.isSuspended) return null;
                            return (
                              <div key={comment.id} className={`flex items-start gap-2 p-2 rounded-xl ${darkMode ? 'bg-white/4' : 'bg-white/70'}`}>
                                <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-indigo-100">
                                  <Avatar avatar={commAuthor.avatar} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span
                                    onClick={() => onViewUserProfile && onViewUserProfile(commAuthor.id)}
                                    className={`text-[10px] font-bold cursor-pointer hover:underline ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}
                                  >
                                    {commAuthor.fullName.split(' ')[0]}
                                  </span>
                                  <p className={`text-[11px] leading-relaxed mt-0.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{comment.content}</p>
                                   <button
                                     type="button"
                                     onClick={() => handleCommentReply(post.id, commAuthor)}
                                     className={`mt-1 inline-flex items-center gap-1 text-[9px] font-bold transition-colors cursor-pointer border-0 bg-transparent p-0 ${darkMode ? 'text-slate-500 hover:text-indigo-300' : 'text-slate-400 hover:text-indigo-600'}`}
                                   >
                                     <CornerUpLeft size={10} /> Reply
                                   </button>
                                </div>
                                {onDeleteComment && currentUser.role === 'admin' && (
                                  <button
                                    onClick={() => onDeleteComment(comment.id, post.id)}
                                    className="p-1 rounded-full hover:bg-rose-500/10 text-rose-400 transition-colors cursor-pointer border-0 bg-transparent shrink-0"
                                    title="Delete Comment"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                )}
                              </div>
                            );
                          })}

                          {!currentUser.isSuspended && (
                            <FeedCommentComposer
                              ref={(composer) => { commentInputRefs.current[post.id] = composer; }}
                              postId={post.id}
                              currentUserId={currentUser.id}
                              allUsers={allUsers}
                              darkMode={darkMode}
                              placeholder="Write your answer… Use @name to mention"
                              formClassName="flex flex-col gap-1 pt-1"
                              inputClassName={`w-full px-3 py-2 text-[11px] rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-400 ${darkMode ? 'bg-white/6 border-white/10 text-white placeholder-slate-500' : 'bg-white border-indigo-200 text-slate-900 placeholder-slate-400'}`}
                              buttonClassName="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] cursor-pointer transition-colors border-0 flex items-center gap-1"
                              buttonLabel="Post"
                              onSubmit={onAddComment}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );

                const posKeyQ = `f-${feedIdx}`;
                const suggTypeIndexQ = FEED_TYPES[feedIdx % FEED_TYPES.length];
                feedIdx++;
                const suggCardQ = renderSuggestionCard(suggTypeIndexQ, `sugg-${posKeyQ}`, posKeyQ);
                const newOnNetworkCard = visiblePostCount === 3
                  ? renderSuggestionCard(11, 'sugg-new-on-network-after-third', 'new-on-network-after-third')
                  : null;
                return [
                  questionCard,
                  ...(newOnNetworkCard ? [newOnNetworkCard] : []),
                  ...(suggCardQ ? [suggCardQ] : []),
                  ...insertPreferenceCards(),
                ];
              }

              const postCard = (
                <div
                  id={`feed-post-card-${post.id}`}
                  key={post.id}
                    className={`rounded-[1.25rem] border overflow-hidden shadow-sm transition-all ${darkMode ? 'bg-[#121217] border-zinc-800/90 hover:border-zinc-700 text-slate-100' : 'bg-white border-neutral-200/90 hover:border-neutral-300 text-slate-900'}`}
                >
                  {/* Card Header (Profile & Startup Association) */}
                      <div className="p-4 flex items-center justify-between gap-3 border-b border-neutral-100 dark:border-white/5">
                    <div 
                      onClick={() => !post.isAnonymous && onViewUserProfile && onViewUserProfile(author.id)}
                      className={`flex items-center gap-2.5 ${!post.isAnonymous && onViewUserProfile ? 'cursor-pointer hover:opacity-85 transition-all' : ''}`}
                      title="View Student Profile"
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${darkMode ? 'bg-indigo-500/15' : 'bg-indigo-50'}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs overflow-hidden ${darkMode ? 'bg-zinc-900 text-white' : 'bg-slate-100 text-slate-900'}`}>
                          {post.isAnonymous ? '?' : <Avatar avatar={author.avatar} />}
                        </div>
                      </div>
                      <div>
                         {postCommunity && (
                           <div className="flex items-center gap-1.5 mb-1">
                             <button
                               type="button"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 onNavigate?.('communities', postCommunity.id);
                               }}
                               className={`text-xs font-black tracking-wide hover:underline cursor-pointer ${darkMode ? 'text-indigo-300' : 'text-indigo-600'}`}
                               title={`Open ${postCommunity.name}`}
                             >
                               {communityLabel}
                             </button>
                             <span className="text-[9px] text-slate-400">·</span>
                           <span className="text-[9px] text-slate-400">{authorLabel}</span>
                           </div>
                         )}
                        <h4 className="text-xs font-bold flex flex-wrap items-center gap-1 text-slate-900 dark:text-white">
                           <span className="hover:underline" style={{ color: darkMode ? '#fff' : '#0f172a' }}>{post.isAnonymous ? 'Anonymous student' : author.fullName}</span>
                           {!post.isAnonymous && author.isVerified && (
                            <span className="inline-flex items-center gap-0.5 py-[3px] px-2 rounded-full border border-emerald-400/60 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[8px] font-bold uppercase tracking-wide">
                              ✓ Verified
                            </span>
                          )}
                           {!post.isAnonymous && author.role === 'college_admin' && (
                            <span className="inline-flex items-center gap-0.5 py-[3px] px-2 rounded-full bg-violet-500 text-white text-[8px] font-bold uppercase tracking-wide">
                              ✦ College Admin
                            </span>
                          )}
                          {post.feeling && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500/10 to-pink-500/10 text-indigo-600 dark:text-pink-300 text-[9px] font-bold">
                              {post.feeling}
                            </span>
                          )}
                        </h4>
                         {!post.isAnonymous && (
                           <p className="text-[10px] text-slate-400 font-mono truncate max-w-[240px]">
                             {getEducationDisplay(author).compact} • {author.college}
                           </p>
                         )}
                      </div>
                    </div>

                     <div className="flex items-center gap-2 shrink-0">
                       {postCommunity && onJoinCommunity && !isCommunityJoined && (
                         <button
                           type="button"
                           onClick={(e) => {
                             e.stopPropagation();
                             handlePostCommunityJoin();
                           }}
                           className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black transition-colors cursor-pointer border-0 shadow-sm"
                         >
                           <UserPlus size={10} /> Join community
                         </button>
                       )}
                       {postCommunity && onJoinCommunity && isCommunityJoined && (
                         <span className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[9px] font-bold ${darkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}`}>
                           <CheckCircle2 size={10} /> Joined
                         </span>
                       )}
                      <span className="text-[9px] font-mono opacity-50 bg-[#09090c]/5 dark:bg-white/5 px-2 py-0.5 rounded">
                        {dateStr}
                      </span>
                      {onDeletePost && currentUser.role === 'admin' && (
                        <button
                          id={`btn-delete-post-${post.id}`}
                          onClick={() => onDeletePost(post.id)}
                          className="p-1 rounded-full hover:bg-rose-500/10 text-rose-500 transition-colors cursor-pointer border-0 bg-transparent"
                          title="Delete Post"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Optional Project Showcase Ribbon */}
                  {post.projectTitle && (
                    <div className="bg-gradient-to-r from-indigo-50 to-pink-50/30 dark:from-indigo-950/20 dark:to-transparent px-4 py-2 flex items-center justify-between border-b border-neutral-100 dark:border-white/5">
                      <div className="flex items-center gap-1.5">
                        <Sparkles size={11} className="text-indigo-500 shrink-0" />
                        <span className="text-[10px] uppercase font-mono font-extrabold text-indigo-600 dark:text-indigo-400 tracking-wider">
                          Startup Showcase: {post.projectTitle}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Optional project evidence */}
                  {post.postImage && (
                    <div className="relative bg-neutral-900 border-b border-neutral-100 dark:border-white/5">
                      <img
                        src={post.postImage.startsWith('/') ? `${API_ORIGIN}${post.postImage}` : post.postImage}
                        alt="Post image"
                        className="w-full h-auto max-h-[380px] object-cover mx-auto"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  {/* Content & Description Caption Area */}
                  <div className="p-4 space-y-3">
                    <p className={`text-xs leading-relaxed whitespace-pre-wrap ${darkMode ? 'text-zinc-200' : 'text-neutral-800'}`}>
                      {post.content}
                    </p>

                    {(post.websiteUrl || (post.tags && post.tags.length > 0) || post.attachment) && (
                      <div className="space-y-2">
                        {post.websiteUrl && (
                          <a
                            href={post.websiteUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-semibold transition-colors ${darkMode ? 'border-indigo-400/20 bg-indigo-400/10 text-indigo-300 hover:bg-indigo-400/15' : 'border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}
                          >
                            <Globe size={13} className="shrink-0" />
                            <span className="min-w-0 truncate">{post.websiteUrl}</span>
                            <ExternalLink size={12} className="ml-auto shrink-0" />
                          </a>
                        )}
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {post.tags.map((tag) => (
                              <span key={tag} className={`rounded-full px-2 py-1 text-[10px] font-bold ${darkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {post.attachment && (
                          <a
                            href={post.attachment.url.startsWith('/') ? `${API_ORIGIN}${post.attachment.url}` : post.attachment.url}
                            target="_blank"
                            rel="noreferrer"
                            className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 transition-colors ${darkMode ? 'border-rose-400/20 bg-rose-400/10 hover:bg-rose-400/15' : 'border-rose-100 bg-rose-50 hover:bg-rose-100'}`}
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <FileText size={15} className="shrink-0 text-rose-500" />
                              <span className={`truncate text-[11px] font-bold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{post.attachment.name}</span>
                            </span>
                            <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-rose-600"><Download size={12} /> Open</span>
                          </a>
                        )}
                      </div>
                    )}

                    {/* ── POLL UI ── */}
                    {post.pollOptions && post.pollOptions.length >= 2 && (() => {
                      const votes: Record<string, number> = (post.pollVotes as Record<string, number>) || {};
                      const threadId = post.resharedFromId || post.id;
                      const effectiveVotes = localPollVotes[threadId] || votes;
                      const totalVotes = Object.keys(effectiveVotes).length;
                      const myVote = effectiveVotes[currentUser.id];
                      const hasVoted = myVote !== undefined;

                      const handlePollVote = async (optIdx: number) => {
                        if (myVote === optIdx) return; // already voted same option
                        const previousVotes = effectiveVotes;
                        setLocalPollVotes(prev => ({
                          ...prev,
                          [threadId]: { ...previousVotes, [currentUser.id]: optIdx },
                        }));
                        try {
                          const savedPost = await api.posts.votePoll(threadId, currentUser.id, optIdx);
                          const savedVotes = savedPost?.pollVotes &&
                            typeof savedPost.pollVotes === 'object' &&
                            !Array.isArray(savedPost.pollVotes)
                            ? savedPost.pollVotes as Record<string, number>
                            : { ...previousVotes, [currentUser.id]: optIdx };
                          setLocalPollVotes(prev => ({ ...prev, [threadId]: savedVotes }));
                        } catch {
                          // Roll back on error
                          setLocalPollVotes(prev => ({ ...prev, [threadId]: previousVotes }));
                        }
                      };

                      return (
                        <div>
                          {/* Poll label row */}
                          <div className="flex items-center justify-between mb-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">🗳️</span>
                              <span className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Poll</span>
                            </div>
                            <span className={`text-[10px] font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                              {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
                            </span>
                          </div>

                          {/* Each option as its own card */}
                          <div className="space-y-2">
                            {post.pollOptions.map((option: string, optIdx: number) => {
                              const voteCount = Object.values(effectiveVotes).filter(v => v === optIdx).length;
                              const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                              const isMyChoice = myVote === optIdx;
                              const maxVotes = Math.max(...post.pollOptions!.map((_: string, i: number) => Object.values(effectiveVotes).filter(v => v === i).length));
                              const isLeading = totalVotes > 0 && voteCount === maxVotes && maxVotes > 0;

                              const voterIds = Object.entries(effectiveVotes)
                                .filter(([, v]) => v === optIdx)
                                .map(([uid]) => uid);
                              const visibleVoters = voterIds
                                .slice(0, 3)
                                .map(uid => allUsers.find(u => u.id === uid))
                                .filter(Boolean) as typeof allUsers;
                              const overflow = voterIds.length - visibleVoters.length;
                              const meFirst = [...visibleVoters].sort((a) => a.id === currentUser.id ? -1 : 1);

                              // Distinct color per option index
                              const optColors = [
                                { light: 'bg-violet-100 hover:bg-violet-200', dark: 'bg-violet-500/15 hover:bg-violet-500/25', text: 'text-violet-700', darkText: 'text-violet-300', sel: 'bg-violet-500', selShadow: 'shadow-violet-300/40' },
                                { light: 'bg-sky-100 hover:bg-sky-200', dark: 'bg-sky-500/15 hover:bg-sky-500/25', text: 'text-sky-700', darkText: 'text-sky-300', sel: 'bg-sky-500', selShadow: 'shadow-sky-300/40' },
                                { light: 'bg-emerald-100 hover:bg-emerald-200', dark: 'bg-emerald-500/15 hover:bg-emerald-500/25', text: 'text-emerald-700', darkText: 'text-emerald-300', sel: 'bg-emerald-500', selShadow: 'shadow-emerald-300/40' },
                                { light: 'bg-amber-100 hover:bg-amber-200', dark: 'bg-amber-500/15 hover:bg-amber-500/25', text: 'text-amber-700', darkText: 'text-amber-300', sel: 'bg-amber-500', selShadow: 'shadow-amber-300/40' },
                                { light: 'bg-rose-100 hover:bg-rose-200', dark: 'bg-rose-500/15 hover:bg-rose-500/25', text: 'text-rose-700', darkText: 'text-rose-300', sel: 'bg-rose-500', selShadow: 'shadow-rose-300/40' },
                                { light: 'bg-fuchsia-100 hover:bg-fuchsia-200', dark: 'bg-fuchsia-500/15 hover:bg-fuchsia-500/25', text: 'text-fuchsia-700', darkText: 'text-fuchsia-300', sel: 'bg-fuchsia-500', selShadow: 'shadow-fuchsia-300/40' },
                              ];
                              const col = optColors[optIdx % optColors.length];

                              return (
                                <button
                                  key={optIdx}
                                  onClick={() => handlePollVote(optIdx)}
                                  className={`w-full text-left rounded-2xl shadow-sm transition-all duration-200 cursor-pointer touch-manipulation ${
                                    isMyChoice
                                      ? `${col.sel} shadow-md ${col.selShadow}`
                                      : darkMode
                                        ? `${col.dark}`
                                        : `${col.light}`
                                  }`}
                                >
                                  <div className="px-4 py-3">
                                    {/* Top row: text + pct */}
                                    <div className="flex items-start justify-between gap-2">
                                      <span className={`text-[13px] font-semibold leading-snug flex-1 ${
                                        isMyChoice ? 'text-white' : darkMode ? col.darkText : col.text
                                      }`}>
                                        {option}
                                      </span>
                                      <div className="flex items-center gap-1 shrink-0 pt-0.5">
                                        {isLeading && <span className="text-[11px]">🏆</span>}
                                        {hasVoted && (
                                          <span className={`text-xs font-black font-mono ${
                                            isMyChoice ? 'text-white' : darkMode ? col.darkText : col.text
                                          }`}>
                                            {pct}%
                                          </span>
                                        )}
                                        {!hasVoted && (
                                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                            darkMode ? 'border-white/20' : 'border-slate-300'
                                          }`} />
                                        )}
                                      </div>
                                    </div>

                                    {/* Voter avatars */}
                                    {hasVoted && voteCount > 0 && (
                                      <div className="flex items-center gap-1.5 mt-2">
                                        <div className="flex items-center -space-x-1">
                                          {meFirst.map(voter => (
                                            <div
                                              key={voter.id}
                                              title={voter.fullName}
                                              className={`w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center text-[7px] font-bold shrink-0 ${
                                                isMyChoice ? 'border-white/40' : darkMode ? 'border-[#121217]' : 'border-white'
                                              }`}
                                              style={{
                                                background: voter.id === currentUser.id
                                                  ? isMyChoice ? 'rgba(255,255,255,0.35)' : '#6366f1'
                                                  : `hsl(${(voter.fullName.charCodeAt(0) * 47 + voter.fullName.charCodeAt(1) * 13) % 360},55%,52%)`,
                                                color: '#fff',
                                              }}
                                            >
                                              {(typeof voter.avatar === 'string' && voter.avatar.length <= 2)
                                                ? voter.avatar
                                                : voter.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                                            </div>
                                          ))}
                                        </div>
                                        <span className={`text-[9px] truncate max-w-[120px] ${
                                          isMyChoice ? 'text-indigo-100' : darkMode ? 'text-slate-500' : 'text-slate-400'
                                        }`}>
                                          {(() => {
                                            const names = meFirst.map(v => v.id === currentUser.id ? 'You' : v.fullName.split(' ')[0]);
                                            if (overflow > 0) return names.join(', ') + ` +${overflow}`;
                                            if (names.length === 1) return names[0];
                                            return names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1];
                                          })()}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {!hasVoted && (
                            <p className={`text-center text-[10px] mt-2 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                              Tap a card to vote
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    {/* Meta Hashtags and Categories */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {post.academicTag && (
                        <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 text-[9px] font-bold uppercase tracking-wider">
                          #{post.academicTag.replace(/\s+/g, '')}
                        </span>
                      )}
                      {post.communityId && (
                        <span className="inline-flex items-center py-0.5 px-1.5 rounded bg-pink-500/10 text-pink-500 dark:bg-pink-500/20 text-[9px] font-bold uppercase tracking-wider">
                          #{communities.find(c => c.id === post.communityId)?.name.split(' ')[0]}
                        </span>
                      )}
                    </div>

                    {/* Practical response row */}
                    <div className="flex items-center gap-4 pt-1 py-2 border-t border-b border-neutral-100 dark:border-white/5 text-xs">
                      <button
                        id={`btn-like-${post.id}`}
                        onClick={() => onLikePost(post.id)}
                        className={`flex items-center gap-1.5 transition-colors cursor-pointer border-0 bg-transparent ${isLiked ? 'text-rose-500 font-bold' : 'text-[#8E8E8F] hover:text-slate-900 dark:hover:text-white'}`}
                      >
                        <Heart size={15} fill={isLiked ? 'currentColor' : 'none'} />
                        <span className="text-[10px] font-bold font-mono tracking-tighter">{post.likes.length} Helpful</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setExpandedComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                        className="flex items-center gap-1.5 text-[#8E8E8F] hover:text-indigo-500 transition-colors cursor-pointer border-0 bg-transparent"
                      >
                        <MessageCircle size={15} />
                        <span className="text-[10px] font-bold font-mono tracking-tighter">{post.comments.length} Responses</span>
                        {post.comments.length > 0 && (
                          <span className="text-[9px] font-bold opacity-70">{expandedComments[post.id] ? '▲ Hide' : '▼ Show'}</span>
                        )}
                      </button>

                      <button
                        onClick={() => setShareCardPostId(post.id)}
                        className="flex items-center gap-1.5 text-[#8E8E8F] hover:text-indigo-500 transition-colors cursor-pointer border-0 bg-transparent ml-auto"
                      >
                        <Share2 size={14} />
                        <span className="text-[10px] font-bold font-mono tracking-tighter">Export</span>
                      </button>
                    </div>

                    {/* Comment Feed list — collapsed by default, click "Comments" above to open */}
                    {expandedComments[post.id] && (
                      <>
                        <div className="space-y-2.5 mt-2 max-h-48 overflow-y-auto no-scrollbar pr-1">
                          {post.comments.length === 0 ? (
                            <p className={`text-[10.5px] italic ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                              No comments yet — be the first to answer or reply.
                            </p>
                          ) : post.comments.map((comment) => {
                            const commAuthor = allUsers.find(u => u.id === comment.authorId);
                            if (!commAuthor || commAuthor.isSuspended) return null;

                            return (
                              <div key={comment.id} className="text-[11px] leading-relaxed flex items-start gap-1.5 min-w-0 overflow-hidden">
                                <span 
                                  onClick={() => onViewUserProfile && onViewUserProfile(commAuthor.id)}
                                  className={`font-extrabold shrink-0 transition-all ${
                                    onViewUserProfile ? 'cursor-pointer hover:underline text-indigo-500 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-100'
                                  }`}
                                  title={`View ${commAuthor.fullName}'s Profile`}
                                >
                                  {commAuthor.fullName.split(' ')[0]}:
                                </span>
                                <span className={`break-words min-w-0 overflow-hidden ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                  {comment.content}
                                </span>
                                 <button
                                   type="button"
                                   onClick={() => handleCommentReply(post.id, commAuthor)}
                                   className={`shrink-0 inline-flex items-center gap-1 text-[9px] font-bold transition-colors cursor-pointer border-0 bg-transparent p-0 ${darkMode ? 'text-slate-500 hover:text-indigo-300' : 'text-slate-400 hover:text-indigo-600'}`}
                                 >
                                   <CornerUpLeft size={10} /> Reply
                                 </button>
                              </div>
                            );
                          })}
                        </div>

                        {/* Direct Comment Submission Form — anyone can answer/reply here */}
                        {!currentUser.isSuspended && (
                          <FeedCommentComposer
                            ref={(composer) => { commentInputRefs.current[post.id] = composer; }}
                            postId={post.id}
                            currentUserId={currentUser.id}
                            allUsers={allUsers}
                            darkMode={darkMode}
                            placeholder={post.academicTag === 'Question ❓'
                              ? 'Write an answer or reply... Use @name to mention'
                              : 'Type feedback... Use @name to mention'}
                            formClassName="flex flex-col gap-1 pt-2 border-t border-neutral-100 dark:border-white/5"
                            inputClassName={`w-full px-3 py-1.5 text-[11px] rounded-lg border border-neutral-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${darkMode ? 'bg-[#09090C] text-white' : 'bg-neutral-50 text-slate-900'}`}
                            buttonClassName="p-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-600 text-white font-bold flex items-center justify-center cursor-pointer transition-colors border-0"
                            buttonId={`btn-comment-${post.id}`}
                            onSubmit={onAddComment}
                          />
                        )}
                      </>
                    )}
                  </div>
                </div>
              );

              const posKey = `f-${feedIdx}`;
              const suggTypeIndex = FEED_TYPES[feedIdx % FEED_TYPES.length];
              feedIdx++;
              const suggCard = renderSuggestionCard(suggTypeIndex, `sugg-${posKey}`, posKey);
              const newOnNetworkCard = visiblePostCount === 3
                ? renderSuggestionCard(11, 'sugg-new-on-network-after-third', 'new-on-network-after-third')
                : null;
              return [
                postCard,
                ...(newOnNetworkCard ? [newOnNetworkCard] : []),
                ...(suggCard ? [suggCard] : []),
                ...insertPreferenceCards(),
              ];
            });
            // Keep the feature useful for a new feed with fewer than four posts.
            if (!preferenceCardsInserted && preferenceCards.length > 0 && visiblePostCount < 4) {
              renderedFeed.push(...preferenceCards);
            }
            return renderedFeed;
          })()}
        </div>
      </div>

      {/* 1-Column Segment: Instantly Loaded Desktop Campus Events & Top suggestions */}
      <div className="hidden lg:block space-y-6">
        
        {/* User Mini Card Dashboard */}
        <div className={`p-4 rounded-2xl border border-neutral-200/80 dark:border-white/10 text-left ${darkMode ? 'bg-[#121217]' : 'bg-white'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-gradient-to-tr from-pink-500 to-amber-500 text-white shrink-0 overflow-hidden`}>
              <Avatar avatar={currentUser.avatar} />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-xs uppercase text-slate-800 dark:text-white leading-none">{currentUser.fullName}</h3>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{currentUser.college}</p>
              <div className="mt-1 pb-0.5">
                <span className="text-[8px] bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 font-mono py-0.5 px-1.5 rounded uppercase font-bold">
                  {currentUser.role} Account
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Campus Events Sidebar Hub - Always prominent on the upper side */}
        <div className={`p-5 rounded-2xl border border-neutral-200 dark:border-white/10 ${darkMode ? 'bg-[#121217]' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-4 border-b border-neutral-100 dark:border-white/5 pb-2">
            <h3 className="text-[10px] font-sans font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-400 flex items-center gap-1.5">
              <Calendar size={13} className="text-rose-500" />
              <span>Live Campus events</span>
            </h3>
            <span className="text-[9px] font-mono opacity-50">Happening now</span>
          </div>

          {campusEvents.length === 0 ? (
            <p className="text-[10px] text-slate-400 text-center py-4">No events posted yet. Go to Events to post one!</p>
          ) : (
            <div className="space-y-4">
              {campusEvents.slice(0, 4).map((event) => {
                const isRegistered = event.registeredIds.includes(currentUser.id);
                const spotsLeft = event.maxSeats ? event.maxSeats - event.registeredIds.length : null;
                const isFull = spotsLeft !== null && spotsLeft <= 0 && !isRegistered;
                return (
                  <div key={event.id} className="text-xs group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-indigo-500/10 text-indigo-600 dark:bg-indigo-600/30 dark:text-indigo-400">
                        {event.category}
                      </span>
                      <span className="text-[9px] font-mono opacity-50">{event.date}{event.time ? ` · ${event.time}` : ''}</span>
                    </div>
                    <button
                      onClick={() => setEventDetailPopup(event)}
                      className="block w-full text-left cursor-pointer"
                    >
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 transition-colors group-hover:text-indigo-500">{event.title}</h4>
                      <p className="text-[10px] text-slate-400/90 leading-relaxed mt-1 text-left line-clamp-2">{event.description}</p>
                    </button>
                    
                    <div className="mt-2.5 flex items-center justify-between text-[9px] font-mono">
                      <span className="opacity-60 text-slate-400">by {event.organizer}</span>
                      <button
                        onClick={() => handleEventRegister(event)}
                        disabled={isFull}
                        className={`px-2 py-1 text-[8.5px] uppercase font-bold rounded cursor-pointer transition-all ${isRegistered ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : isFull ? 'bg-neutral-100 dark:bg-white/5 text-slate-400 cursor-not-allowed' : 'bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white'}`}
                      >
                        {isRegistered ? '✓ Reserved' : isFull ? 'Full' : 'Register Seat'}
                      </button>
                    </div>
                    <div className="mt-3.5 border-b border-dashed border-neutral-100 dark:border-white/5" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Smart Co-Founder Matching */}
        <div className={`p-5 rounded-2xl border border-neutral-200 dark:border-white/10 ${darkMode ? 'bg-[#121217]' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-4 border-b border-neutral-100 dark:border-white/5 pb-2">
            <h3 className="text-[10px] font-sans font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-400 flex items-center gap-1.5">
              <Sparkle size={13} className="text-amber-500" />
              <span>People You Should Meet</span>
            </h3>
            <span className="text-[9px] font-mono text-indigo-400 opacity-70">AI Match</span>
          </div>

          {scoredMatches.length === 0 ? (
            <p className="text-[11px] text-slate-400 text-center py-4">You're connected with everyone! 🎉</p>
          ) : (
            <div className="space-y-3">
              {scoredMatches.map((user) => {
                const sharedCount = user.interests.filter(i => currentUser.interests.includes(i)).length
                  + user.lookingFor.filter(l => currentUser.lookingFor.includes(l)).length;
                return (
                  <div key={user.id} className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => onViewUserProfile?.(user.id)}
                      className={`flex items-center gap-2 min-w-0 flex-1 p-1.5 rounded-xl transition-all text-left ${onViewUserProfile ? 'cursor-pointer hover:bg-neutral-500/5' : ''}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                        <Avatar avatar={user.avatar} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-[11px] text-slate-800 dark:text-white leading-none truncate">{user.fullName}</h4>
                        <p className="text-[9px] text-slate-400 mt-0.5 truncate">{getEducationDisplay(user).compact}</p>
                        {sharedCount > 0 && (
                          <p className="text-[8px] text-indigo-500 mt-0.5 font-semibold">{sharedCount} shared interest{sharedCount > 1 ? 's' : ''}</p>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={() => onSendConnectionRequest?.(user.id, 'Friendship')}
                      className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-[9px] font-bold transition-all cursor-pointer"
                    >
                      <UserPlus size={10} />
                      Connect
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>

    {anonymousChatPost && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
        <form
          onSubmit={handleAnonymousChatSubmit}
          className={`w-full max-w-md rounded-3xl border shadow-2xl p-5 ${dm ? 'bg-[#121217] border-white/10 text-slate-100' : 'bg-white border-neutral-200 text-slate-900'}`}
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-500">Study partner request</p>
              <h3 className="text-base font-black mt-1">Start an anonymous chat</h3>
              <p className={`text-[10px] leading-relaxed mt-1 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
                Your identity stays hidden from the student who posted this request.
              </p>
            </div>
            <button
              type="button"
              onClick={closeAnonymousChat}
              className={`p-1.5 rounded-full cursor-pointer ${dm ? 'text-slate-400 hover:bg-white/10' : 'text-slate-400 hover:bg-neutral-100'}`}
              aria-label="Close anonymous chat"
            >
              <X size={15} />
            </button>
          </div>

          <div className={`rounded-2xl px-3 py-2.5 mb-3 ${dm ? 'bg-white/5' : 'bg-blue-50'}`}>
            <p className={`text-[10px] font-bold ${dm ? 'text-blue-300' : 'text-blue-700'}`}>
              {anonymousChatPost.content}
            </p>
          </div>

          <textarea
            autoFocus
            required
            minLength={2}
            maxLength={500}
            value={anonymousChatMessage}
            onChange={event => setAnonymousChatMessage(event.target.value)}
            placeholder="Say hello and share what you want to study…"
            className={`w-full min-h-28 resize-none rounded-2xl border px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-400 ${dm ? 'bg-[#09090C] border-white/10 text-white placeholder-slate-500' : 'bg-slate-50 border-neutral-200 text-slate-900 placeholder-slate-400'}`}
          />

          {anonymousChatError && (
            <p className="text-[10px] text-rose-500 mt-2">{anonymousChatError}</p>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={closeAnonymousChat}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold cursor-pointer ${dm ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-neutral-100 text-slate-600 hover:bg-neutral-200'}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={anonymousChatSending || !anonymousChatMessage.trim()}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[10px] font-bold cursor-pointer disabled:cursor-not-allowed"
            >
              {anonymousChatSending ? 'Sending…' : 'Send anonymously'}
            </button>
          </div>
        </form>
      </div>
    )}

    {eventDetailPopup && <EventDetailModal ev={eventDetailPopup} darkMode={darkMode} currentUser={currentUser} onClose={() => setEventDetailPopup(null)} onRegister={handleEventRegister} />}

    {shareCardPostId && (() => {
      const sharedPost = posts.find((post) => post.id === shareCardPostId);
      if (!sharedPost) return null;
      return (
        <ShareCardModal
          post={sharedPost}
          author={allUsers.find((user) => user.id === sharedPost.authorId)}
          darkMode={darkMode}
          onClose={() => setShareCardPostId(null)}
        />
      );
    })()}

    </>
  );
}

function EventDetailModal({ ev, darkMode, currentUser, onClose, onRegister }: {
  ev: CampusEvent;
  darkMode: boolean;
  currentUser: UserProfile;
  onClose: () => void;
  onRegister: (ev: CampusEvent) => void;
}) {
  const isRegistered = ev.registeredIds.includes(currentUser.id);
  const spotsLeft = ev.maxSeats ? ev.maxSeats - ev.registeredIds.length : null;
  const isFull = spotsLeft !== null && spotsLeft <= 0 && !isRegistered;
  const bannerColor = ev.category === 'Hackathon' ? 'from-orange-500 to-rose-500'
    : ev.category === 'Study Group' ? 'from-blue-500 to-indigo-500'
    : ev.category === 'Seminar' ? 'from-violet-500 to-purple-600'
    : ev.category === 'Workshop' ? 'from-cyan-500 to-teal-500'
    : 'from-indigo-500 to-purple-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className={`relative w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${darkMode ? 'bg-[#121217] border-white/10' : 'bg-white border-neutral-200'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className={`h-16 bg-gradient-to-r ${bannerColor} flex items-center px-5 gap-3`}>
          <span className="px-2 py-0.5 rounded bg-white/20 text-white text-[10px] font-bold">{ev.category}</span>
          {ev.isOnline && <span className="text-[10px] font-bold text-white/80">🌐 Online</span>}
          <button onClick={onClose} className="ml-auto text-white/80 hover:text-white cursor-pointer"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-3">
          <h3 className={`font-bold text-sm leading-snug ${darkMode ? 'text-white' : 'text-slate-900'}`}>{ev.title}</h3>

          <div className="grid grid-cols-2 gap-2">
            <div className={`flex items-center gap-1.5 text-xs ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              <Calendar size={11} className="text-indigo-500 shrink-0" />{ev.date}
            </div>
            {ev.time && (
              <div className={`flex items-center gap-1.5 text-xs ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                <Clock size={11} className="text-indigo-500 shrink-0" />{ev.time}
              </div>
            )}
            {ev.venue && (
              <div className={`flex items-center gap-1.5 text-xs col-span-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                <MapPin size={11} className="text-rose-500 shrink-0" />{ev.venue}
              </div>
            )}
          </div>

          <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{ev.description}</p>

          <div className="flex items-center justify-between text-[10px]">
            <span className={`font-mono ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {ev.registeredIds.length}{ev.maxSeats ? `/${ev.maxSeats}` : ''} going
              {isFull && <span className="ml-1 text-rose-500 font-bold">· FULL</span>}
            </span>
            <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>by {ev.organizer}</span>
          </div>

          <div className="flex gap-2 pt-1">
            {ev.link && (
              <a
                href={ev.link}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer ${darkMode ? 'border-white/10 text-slate-400 hover:bg-white/5' : 'border-neutral-200 text-slate-500 hover:bg-neutral-50'}`}
              >
                <ExternalLink size={11} />Link
              </a>
            )}
            <button
              onClick={() => onRegister(ev)}
              disabled={isFull}
              className={`flex-1 py-2 rounded-xl font-bold text-xs cursor-pointer transition-all ${isRegistered ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20' : isFull ? 'bg-neutral-100 dark:bg-white/5 text-slate-400 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600 text-white'}`}
            >
              {isRegistered ? '✓ Registered — Click to cancel' : isFull ? 'Event Full' : '🎟 Register for this Event'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
