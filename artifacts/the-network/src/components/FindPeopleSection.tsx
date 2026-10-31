import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types';
import Avatar from './Avatar';
import { API_ORIGIN } from '../api';
import { getEducationDisplay } from '../utils/education';
import {
  getAvailableStudentExamOptions,
  getStudentClassLabel,
  getStudentExamLabels,
  matchesStudentSearch,
} from '../uploaded/studentSearch';
import { getPeopleRecommendations, recommendationHeading, type PeopleMatch } from '../utils/peopleMatching';
import {
  ArrowLeft, Plus, MapPin, Clock, Users, ChevronRight, Check, X,
  Star, Search, Calendar, Coffee, BookOpen, GraduationCap, Handshake,
  Laptop, Rocket, Dumbbell, Briefcase, Code, Plane, ChevronDown,
  LayoutDashboard, FileText, UserCheck, AlertCircle, Sparkles, Trash2,
  Wifi, BarChart3, TrendingUp, Bookmark, SlidersHorizontal, PenLine, Target
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface FindRequest {
  id: string;
  hostId: string;
  purpose: string;
  title: string;
  description: string;
  eligibilityCollege: string;
  eligibilityYear: string;
  eligibilityBranch: string;
  genderPreference: string;
  maxApplicants: number;
  preferredTime: string;
  meetingLocation: string;
  status: string;
  college: string;
  createdAt: string;
  host?: UserProfile | null;
  applicantCount?: number;
  hasApplied?: boolean;
  acceptedCount?: number;
}

interface FindApplication {
  id: string;
  requestId: string;
  applicantId: string;
  intro: string;
  status: string;
  createdAt: string;
  request?: FindRequest | null;
  applicant?: UserProfile | null;
}

// ─── Purpose Metadata ─────────────────────────────────────────────────────────
const PURPOSES = [
  { id: 'Coffee Chat',         emoji: '☕', desc: 'Meet new people over coffee',          color: 'amber'  },
  { id: 'Study Partner',       emoji: '📚', desc: 'Find someone to study with',            color: 'blue'   },
  { id: 'Senior Guidance',     emoji: '🎓', desc: 'Get guidance from seniors',             color: 'purple' },
  { id: 'Make New Friends',    emoji: '🤝', desc: 'Make new friends on campus',            color: 'green'  },
  { id: 'Project Partner',     emoji: '💻', desc: 'Find teammates for projects',           color: 'indigo' },
  { id: 'Hackathon Teammates', emoji: '🚀', desc: 'Find hackers for hackathons',           color: 'rose'   },
  { id: 'Sports Buddy',        emoji: '🏸', desc: 'Find someone for sports',              color: 'emerald'},
  { id: 'Internship Partner',  emoji: '💼', desc: 'Prepare for internships together',     color: 'slate'  },
  { id: 'Coding Partner',      emoji: '🖥️', desc: 'Code & level up together',             color: 'violet' },
  { id: 'Travel Buddy',        emoji: '✈️', desc: 'Travel together for trips',            color: 'sky'    },
  { id: 'Other',               emoji: '✨', desc: 'Find the right people for something else', color: 'slate' },
];

// Friendly labels used by the Connect page. Values match the request purposes
// currently stored in the database, while keeping the language from the product
// reference simple and familiar.
const CONNECT_FILTERS = [
  { value: 'Study Partner', label: 'DSA Partner', icon: Code, tone: 'violet' },
  { value: 'Project Partner', label: 'Project Teammate', icon: Users, tone: 'emerald' },
  { value: 'Hackathon Teammates', label: 'Hackathon Team', icon: Rocket, tone: 'amber' },
  { value: 'Study Partner', label: 'Study Group', icon: BookOpen, tone: 'blue' },
  { value: 'Senior Guidance', label: 'Mentor', icon: GraduationCap, tone: 'orange' },
  { value: 'Internship Partner', label: 'Internship Guidance', icon: Briefcase, tone: 'indigo' },
  { value: 'Other', label: 'Other', icon: LayoutDashboard, tone: 'slate' },
] as const;

const CONNECT_TONE_CLASSES: Record<string, { icon: string; selected: string; button: string; panel: string }> = {
  violet: { icon: 'text-violet-600 bg-violet-50', selected: 'border-violet-300 bg-violet-50 text-violet-700', button: 'bg-violet-600 hover:bg-violet-700', panel: 'bg-violet-50/70 border-violet-100' },
  emerald: { icon: 'text-emerald-600 bg-emerald-50', selected: 'border-emerald-300 bg-emerald-50 text-emerald-700', button: 'bg-emerald-600 hover:bg-emerald-700', panel: 'bg-emerald-50/70 border-emerald-100' },
  amber: { icon: 'text-amber-600 bg-amber-50', selected: 'border-amber-300 bg-amber-50 text-amber-700', button: 'bg-amber-500 hover:bg-amber-600', panel: 'bg-amber-50/70 border-amber-100' },
  blue: { icon: 'text-blue-600 bg-blue-50', selected: 'border-blue-300 bg-blue-50 text-blue-700', button: 'bg-blue-600 hover:bg-blue-700', panel: 'bg-blue-50/70 border-blue-100' },
  orange: { icon: 'text-orange-600 bg-orange-50', selected: 'border-orange-300 bg-orange-50 text-orange-700', button: 'bg-orange-500 hover:bg-orange-600', panel: 'bg-orange-50/70 border-orange-100' },
  indigo: { icon: 'text-indigo-600 bg-indigo-50', selected: 'border-indigo-300 bg-indigo-50 text-indigo-700', button: 'bg-indigo-600 hover:bg-indigo-700', panel: 'bg-indigo-50/70 border-indigo-100' },
  slate: { icon: 'text-slate-500 bg-slate-100', selected: 'border-slate-300 bg-slate-100 text-slate-700', button: 'bg-slate-700 hover:bg-slate-800', panel: 'bg-slate-50/70 border-slate-200' },
};

function connectFilterLabel(value: string) {
  return CONNECT_FILTERS.find(filter => filter.value === value)?.label
    ?? (value === 'All' ? 'All ways to connect' : value);
}

function connectLabelForPurpose(value: string) {
  return CONNECT_FILTERS.find(filter => filter.value === value)?.label ?? value;
}

function connectFilterTone(value: string) {
  return CONNECT_FILTERS.find(filter => filter.value === value)?.tone ?? 'violet';
}

const PURPOSE_BADGE: Record<string, string> = {
  'Coffee Chat':         'bg-amber-100   text-amber-700   border-amber-200',
  'Study Partner':       'bg-blue-100    text-blue-700    border-blue-200',
  'Senior Guidance':     'bg-purple-100  text-purple-700  border-purple-200',
  'Make New Friends':    'bg-green-100   text-green-700   border-green-200',
  'Project Partner':     'bg-indigo-100  text-indigo-700  border-indigo-200',
  'Hackathon Teammates': 'bg-rose-100    text-rose-700    border-rose-200',
  'Sports Buddy':        'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Internship Partner':  'bg-slate-100   text-slate-600   border-slate-200',
  'Coding Partner':      'bg-violet-100  text-violet-700  border-violet-200',
  'Travel Buddy':        'bg-sky-100     text-sky-700     border-sky-200',
};

// Purpose icon backgrounds for the new card design
// Gradient pairs per purpose — used in the detail hero banner
const PURPOSE_GRADIENT: Record<string, [string, string]> = {
  'Coffee Chat':         ['#f59e0b', '#f97316'],
  'Study Partner':       ['#3b82f6', '#6366f1'],
  'Senior Guidance':     ['#8b5cf6', '#a855f7'],
  'Make New Friends':    ['#10b981', '#34d399'],
  'Project Partner':     ['#6366f1', '#8b5cf6'],
  'Hackathon Teammates': ['#f43f5e', '#fb7185'],
  'Sports Buddy':        ['#10b981', '#059669'],
  'Internship Partner':  ['#64748b', '#94a3b8'],
  'Coding Partner':      ['#7c3aed', '#6366f1'],
  'Travel Buddy':        ['#0ea5e9', '#38bdf8'],
};

const PURPOSE_ICON_STYLE: Record<string, { bg: string; iconColor: string }> = {
  'Coffee Chat':         { bg: 'bg-amber-100',   iconColor: 'text-amber-600'   },
  'Study Partner':       { bg: 'bg-blue-100',    iconColor: 'text-blue-600'    },
  'Senior Guidance':     { bg: 'bg-purple-100',  iconColor: 'text-purple-600'  },
  'Make New Friends':    { bg: 'bg-green-100',   iconColor: 'text-green-600'   },
  'Project Partner':     { bg: 'bg-indigo-100',  iconColor: 'text-indigo-600'  },
  'Hackathon Teammates': { bg: 'bg-rose-100',    iconColor: 'text-rose-600'    },
  'Sports Buddy':        { bg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
  'Internship Partner':  { bg: 'bg-slate-100',   iconColor: 'text-slate-600'   },
  'Coding Partner':      { bg: 'bg-violet-100',  iconColor: 'text-violet-600'  },
  'Travel Buddy':        { bg: 'bg-sky-100',     iconColor: 'text-sky-600'     },
};

function purposeEmoji(p: string) { return PURPOSES.find(x => x.id === p)?.emoji ?? '🔍'; }
function purposeBadge(p: string, extra = '') {
  return `inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${PURPOSE_BADGE[p] || 'bg-gray-100 text-gray-600 border-gray-200'} ${extra}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TIMES   = ['Morning', 'Afternoon', 'Evening', 'Weekdays 7PM–9PM', 'Weekend', 'Flexible'];
const PLACES  = ['Campus Cafe', 'Library', 'Student Activity Centre', 'Food Court', 'Online / Remote', 'Custom'];
const YEARS   = ['Any', '1st Year', '2nd Year', '3rd Year', '4th Year'];
const GENDERS = ['Anyone', 'Male', 'Female'];
const MAX_OPTS = [1, 2, 3, 5, 10, 15, 20];
const EMPTY_REQUEST_FORM = {
  purpose: '', title: '', description: '',
  eligibilityCollege: 'same', eligibilityYear: 'Any', eligibilityBranch: 'Any',
  genderPreference: 'Anyone', maxApplicants: 5,
  preferredTime: 'Afternoon', meetingLocation: 'Campus Cafe',
};

function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Match Scoring ────────────────────────────────────────────────────────────
function computeMatchScore(currentUser: UserProfile, host: UserProfile): number {
  let score = 65;
  const cu = currentUser;
  const hu = host;
  // Same branch
  if (cu.branch && hu.branch && cu.branch.toLowerCase() === hu.branch.toLowerCase()) score += 12;
  // Same year
  if (cu.year && hu.year && cu.year === hu.year) score += 8;
  // Shared interests
  const cuI = (cu.interests || []).map((i: string) => i.toLowerCase());
  const huI = (hu.interests || []).map((i: string) => i.toLowerCase());
  const shared = cuI.filter((i: string) => huI.includes(i)).length;
  score += Math.min(shared * 5, 15);
  // Cap at 98
  return Math.min(score, 98);
}

function mutualCount(currentUser: UserProfile, host: UserProfile): number {
  const cuI = (currentUser.interests || []).map((i: string) => i.toLowerCase());
  const huI = (host.interests || []).map((i: string) => i.toLowerCase());
  return cuI.filter((i: string) => huI.includes(i)).length;
}

// ─── Recommended Card — compact person card ───────────────────────────────────
function RecommendedCard({
  req, host, matchPct, darkMode, onView,
}: {
  req: FindRequest; host: UserProfile; matchPct: number; mutual: number;
  darkMode: boolean; onView: () => void; allUsers: UserProfile[];
}) {
  const purposeStyle = PURPOSE_ICON_STYLE[req.purpose] ?? { bg: 'bg-indigo-100', iconColor: 'text-indigo-600' };
  const firstName = host.fullName?.split(' ')[0] ?? 'Student';
  const matchColor = matchPct >= 88 ? '#10b981' : matchPct >= 80 ? '#6366f1' : '#8b5cf6';

  return (
    <div
      onClick={onView}
      className={`relative flex-shrink-0 w-[148px] rounded-2xl border cursor-pointer transition-all active:scale-[0.97] select-none overflow-hidden ${
        darkMode
          ? 'bg-[#1a1a24] border-white/8 hover:border-white/15'
          : 'bg-white border-neutral-100 hover:border-indigo-100 hover:shadow-md hover:shadow-indigo-50'
      }`}
    >
      {/* Photo section with gradient overlay */}
      <div className="relative w-full h-[118px] overflow-hidden">
        {host.avatar && host.avatar.length > 4 ? (
          <img
            src={host.avatar.startsWith('http') ? host.avatar : undefined}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            className="w-full h-full object-cover"
          />
        ) : null}
        {/* Fallback gradient with initials */}
        <div className={`absolute inset-0 flex items-center justify-center text-3xl font-black ${purposeStyle.bg}`}>
          <Avatar avatar={host.avatar} className="w-full h-full object-cover" />
        </div>
        {/* Bottom gradient fade */}
        <div className={`absolute bottom-0 left-0 right-0 h-12 ${darkMode ? 'bg-gradient-to-t from-[#1a1a24]' : 'bg-gradient-to-t from-white'}`} />

        {/* Match pill — top right */}
        <div
          className="absolute top-2 right-2 flex items-center gap-0.5 px-2 py-0.5 rounded-full text-white text-[10px] font-black backdrop-blur-sm"
          style={{ background: matchColor }}
        >
          {matchPct}%
        </div>

        {/* Purpose emoji badge — bottom left overlapping boundary */}
        <div className={`absolute bottom-1.5 left-2.5 w-7 h-7 rounded-xl ${purposeStyle.bg} flex items-center justify-center text-base border-2 ${darkMode ? 'border-[#1a1a24]' : 'border-white'} shadow-sm`}>
          {purposeEmoji(req.purpose)}
        </div>
      </div>

      {/* Info section */}
      <div className="px-3 pt-1.5 pb-3">
        <p className={`font-black text-[14px] leading-tight truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          {firstName}
        </p>
        <p className={`text-[10px] mt-0.5 truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          {getEducationDisplay(host).compact}
        </p>

        {/* Purpose tag */}
        <div className={`mt-2 mb-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${PURPOSE_BADGE[req.purpose] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
          {req.purpose.split(' ').slice(0, 2).join(' ')}
        </div>

        {/* CTA */}
        <button
          onClick={e => { e.stopPropagation(); onView(); }}
          className="w-full py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white text-[11px] font-bold transition-all block text-center"
        >
          Connect →
        </button>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function PurposeBadge({ purpose }: { purpose: string }) {
  return (
    <span className={purposeBadge(purpose)}>
      {purposeEmoji(purpose)} {purpose}
    </span>
  );
}

// Request card — profile-centric: student photo + name prominent on left
function RequestCard({
  req, darkMode, onView, onApply, currentUserId,
}: { req: FindRequest; darkMode: boolean; onView: () => void; onApply: () => void; currentUserId: string }) {
  const style = PURPOSE_ICON_STYLE[req.purpose] ?? { bg: 'bg-indigo-100', iconColor: 'text-indigo-600' };
  const isRecent = Date.now() - new Date(req.createdAt).getTime() < 48 * 60 * 60 * 1000;
  const isFull = (req.applicantCount ?? 0) >= req.maxApplicants;
  const host = req.host;

  return (
    <div
      onClick={onView}
      className={`rounded-2xl border cursor-pointer transition-all active:scale-[0.99] ${
        darkMode ? 'bg-white/5 border-white/8 hover:bg-white/8' : 'bg-white border-neutral-100 hover:shadow-md hover:shadow-slate-100/80'
      }`}
    >
      <div className="p-4 flex gap-4">

        {/* Student profile photo — large on left */}
        <div className="relative shrink-0">
          <div className="w-[60px] h-[60px] rounded-2xl overflow-hidden">
            {host ? (
              <Avatar avatar={host.avatar} className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full flex items-center justify-center text-2xl ${style.bg}`}>
                {purposeEmoji(req.purpose)}
              </div>
            )}
          </div>
          {/* Purpose emoji badge on bottom-right of photo */}
          <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full ${style.bg} flex items-center justify-center text-[13px] border-2 ${darkMode ? 'border-[#09090C]' : 'border-white'}`}>
            {purposeEmoji(req.purpose)}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {/* Student name + year/branch */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className={`font-bold text-[15px] leading-snug truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {host?.fullName ?? req.purpose}
              </h3>
              {host && (
                <p className={`text-[11px] mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                   {getEducationDisplay(host).compact}
                  {host.isVerified && <span className="ml-1.5 text-emerald-500 font-bold">✓</span>}
                </p>
              )}
            </div>
            {isRecent && (
              <span className="shrink-0 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                New
              </span>
            )}
          </div>

          {/* Request description */}
          <p className={`text-[12px] mt-1.5 leading-snug line-clamp-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {req.title}
          </p>

          {/* Time + Location */}
          <div className={`flex flex-wrap gap-x-3 gap-y-0.5 mt-2 text-[11px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {req.preferredTime && (
              <span className="flex items-center gap-1">
                <Calendar size={10} className="shrink-0" />{req.preferredTime}
              </span>
            )}
            {req.meetingLocation && (
              <span className="flex items-center gap-1">
                <MapPin size={10} className="shrink-0" />{req.meetingLocation}
              </span>
            )}
          </div>

          {/* Bottom: joined count + Apply */}
          <div className="flex items-center justify-between mt-3">
            <span className={`flex items-center gap-1 text-[11px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              <Users size={10} />
              {req.applicantCount ?? 0}/{req.maxApplicants} joined
            </span>

            {req.hasApplied ? (
              <span className="text-[12px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-4 py-1.5 rounded-xl">
                ✓ Applied
              </span>
            ) : isFull ? (
              <span className="text-[12px] font-semibold text-slate-400 bg-slate-50 border border-slate-200 px-4 py-1.5 rounded-xl">
                Full
              </span>
            ) : (
              <button
                onClick={e => { e.stopPropagation(); onApply(); }}
                className="px-5 py-1.5 rounded-xl bg-indigo-500 text-white text-[13px] font-bold hover:bg-indigo-600 active:scale-95 transition-all shadow-sm shadow-indigo-500/25"
              >
                Apply
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// The compact profile card used by the Connect browse view.
function ConnectResultCard({
  req, host, allUsers, darkMode, onView, onConnect, tone, index,
}: {
  req: FindRequest;
  host: UserProfile;
  allUsers: UserProfile[];
  darkMode: boolean;
  onView: () => void;
  onConnect: () => void;
  tone: string;
  index: number;
}) {
  const colors = CONNECT_TONE_CLASSES[tone] ?? CONNECT_TONE_CLASSES.violet;
  const tags = [...(host.skills || []), ...(host.interests || [])].filter(Boolean).slice(0, 3);
  const displayTags = tags.length > 0 ? tags : [req.purpose, host.branch?.split(' ')[0] || 'Student'];
  const mutualUsers = allUsers.filter(user => user.id !== host.id).slice(0, 3);
  const firstName = host.fullName?.split(' ')[0] || 'Student';
  const education = getEducationDisplay(host);

  return (
    <article
      onClick={onView}
      className={`rounded-[18px] border overflow-hidden cursor-pointer transition-all active:scale-[0.995] ${
        darkMode
          ? 'bg-white/[0.04] border-white/10 hover:border-white/20'
          : 'bg-white border-slate-200/80 shadow-[0_2px_10px_rgba(15,23,42,0.045)] hover:border-indigo-200 hover:shadow-[0_8px_24px_rgba(79,70,229,0.08)]'
      }`}
    >
      <div className="p-3">
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <div className="w-[54px] h-[54px] rounded-full overflow-hidden ring-4 ring-slate-100 dark:ring-white/5">
              <Avatar avatar={host.avatar} className="w-full h-full object-cover" />
            </div>
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#101017]" aria-label="Online" />
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className={`font-black text-[14px] truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{host.fullName}</h3>
                  {host.isVerified && <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] shrink-0">✓</span>}
                </div>
                <p className={`text-[10px] mt-0.5 truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                   {host.college} · {education.compact}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Save ${firstName}`}
                onClick={e => e.stopPropagation()}
                className={`shrink-0 p-1 rounded-lg transition-colors ${darkMode ? 'text-slate-500 hover:bg-white/10 hover:text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-indigo-500'}`}
              >
                <Bookmark size={17} strokeWidth={1.8} />
              </button>
            </div>

            <div className="flex flex-wrap gap-1 mt-2">
              {displayTags.map(tag => (
                <span key={tag} className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                  darkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-indigo-50/70 border-indigo-100 text-indigo-600'
                }`}>
                  {tag}
                </span>
              ))}
              {((host.skills || []).length + (host.interests || []).length) > 3 && (
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${darkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                  +{(host.skills || []).length + (host.interests || []).length - 3}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={e => { e.stopPropagation(); onConnect(); }}
            disabled={req.hasApplied || (req.applicantCount ?? 0) >= req.maxApplicants}
            className={`shrink-0 self-center px-3.5 py-2 rounded-xl text-white text-[11px] font-black transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${colors.button}`}
          >
            {req.hasApplied ? 'Applied' : (req.applicantCount ?? 0) >= req.maxApplicants ? 'Full' : 'Connect'}
          </button>
        </div>

        <div className={`mt-3 rounded-xl border px-3 py-2.5 ${darkMode ? 'bg-white/[0.04] border-white/8' : colors.panel}`}>
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[12px] ${colors.icon}`}>✦</span>
            <p className={`text-[10px] font-black ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
              Looking for: <span className={darkMode ? 'text-indigo-300' : 'text-indigo-600'}>{connectFilterLabel(req.purpose)}</span>
            </p>
          </div>
          <p className={`text-[10px] leading-relaxed mt-1 pl-8 line-clamp-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {req.description || req.title}
          </p>
        </div>

        <div className={`flex items-center gap-2 mt-3 pl-1 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
          <div className="flex items-center">
            {mutualUsers.map((user, mutualIndex) => (
              <div key={user.id} className={`w-5 h-5 rounded-full overflow-hidden border-2 ${darkMode ? 'border-[#101017]' : 'border-white'} ${mutualIndex > 0 ? '-ml-1.5' : ''}`}>
                <Avatar avatar={user.avatar} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <span className="text-[10px]">
            {Math.max(mutualUsers.length, index + 1)} mutual communities
          </span>
          <ChevronRight size={14} className="ml-auto text-slate-400" />
        </div>
      </div>
    </article>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  darkMode: boolean;
  onNavigate?: (view: string) => void;
  onViewUserProfile?: (userId: string) => void;
  onSaveConnectPreference?: (preference: string | null) => Promise<void>;
}

// ─── Main Component ───────────────────────────────────────────────────────────
function StudyPartnerCard({
  match,
  darkMode,
  onViewProfile,
}: {
  match: PeopleMatch;
  darkMode: boolean;
  onViewProfile?: (userId: string) => void;
}) {
  const { user } = match;
  const education = getEducationDisplay(user);

  return (
    <article className={`rounded-[18px] border p-3.5 transition-all ${
      darkMode
        ? 'bg-white/[0.04] border-white/10 hover:border-indigo-400/30'
        : 'bg-white border-slate-200/80 shadow-[0_2px_10px_rgba(15,23,42,0.045)] hover:border-indigo-200 hover:shadow-[0_8px_24px_rgba(79,70,229,0.08)]'
    }`}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onViewProfile?.(user.id)}
          className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 ring-4 ring-indigo-50 dark:ring-white/5"
          aria-label={`View ${user.fullName}'s profile`}
        >
          <Avatar avatar={user.avatar} className="w-full h-full object-cover" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <h3 className={`font-black text-[14px] truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{user.fullName}</h3>
              <p className={`text-[10px] mt-0.5 truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {education.institution || user.college || 'Student'} · {education.compact}
              </p>
            </div>
            {match.isNew && (
              <span className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200">
                New
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {match.reasons.map(reason => (
              <span
                key={reason}
                className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                  darkMode
                    ? 'bg-indigo-500/10 border-indigo-400/20 text-indigo-200'
                    : 'bg-indigo-50 border-indigo-100 text-indigo-600'
                }`}
              >
                {reason}
              </span>
            ))}
          </div>
        </div>
      </div>
      {onViewProfile && (
        <button
          type="button"
          onClick={() => onViewProfile(user.id)}
          className={`w-full mt-3 py-2 rounded-xl text-[11px] font-black transition-colors ${
            darkMode
              ? 'bg-indigo-500/15 text-indigo-200 hover:bg-indigo-500/25'
              : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
          }`}
        >
          View profile and connect
        </button>
      )}
    </article>
  );
}

export default function FindPeopleSection({ currentUser, allUsers, darkMode, onNavigate, onViewUserProfile, onSaveConnectPreference }: Props) {
  type MainTab = 'browse' | 'my-applications' | 'host-dashboard';
  type DetailView = 'list' | 'create' | 'detail' | 'applicants';

  const [mainTab, setMainTab] = useState<MainTab>('browse');
  const [detailView, setDetailView] = useState<DetailView>('list');
  const [filterPurpose, setFilterPurpose] = useState('Study Partner');
  const [selectedConnectLabel, setSelectedConnectLabel] = useState('DSA Partner');
  const [searchQ, setSearchQ] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');
  const [skillFilter, setSkillFilter] = useState('All');
  const [classFilter, setClassFilter] = useState('All');
  const [examFilter, setExamFilter] = useState('All');
  // browse sub-views: 'picker' = category grid, 'list' = filtered requests
  const [browseSubView, setBrowseSubView] = useState<'picker' | 'list'>('list');

  // Data
  const [requests, setRequests] = useState<FindRequest[]>([]);
  const [myApplications, setMyApplications] = useState<FindApplication[]>([]);
  const [myRequests, setMyRequests] = useState<FindRequest[]>([]);
  const [applicants, setApplicants] = useState<FindApplication[]>([]);

  const [selectedRequest, setSelectedRequest] = useState<FindRequest | null>(null);
  const [selectedMyRequest, setSelectedMyRequest] = useState<FindRequest | null>(null);

  // Apply modal
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyIntro, setApplyIntro] = useState('');
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [applySuccess, setApplySuccess] = useState(false);

  // Create form
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [form, setForm] = useState(EMPTY_REQUEST_FORM);
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [loading, setLoading] = useState(false);

  // ── Fetch helpers ────────────────────────────────────────────────────────────
  const fetchBrowse = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_ORIGIN}/api/find-people/requests?userId=${currentUser.id}`);
      const data = await r.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [currentUser.id]);

  const fetchMyApplications = useCallback(async () => {
    try {
      const r = await fetch(`${API_ORIGIN}/api/find-people/my-applications?userId=${currentUser.id}`);
      const data = await r.json();
      setMyApplications(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
  }, [currentUser.id]);

  const fetchMyRequests = useCallback(async () => {
    try {
      const r = await fetch(`${API_ORIGIN}/api/find-people/my-requests?userId=${currentUser.id}`);
      const data = await r.json();
      setMyRequests(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
  }, [currentUser.id]);

  const fetchApplicants = useCallback(async (requestId: string) => {
    try {
      const r = await fetch(`${API_ORIGIN}/api/find-people/requests/${requestId}/applications?userId=${currentUser.id}`);
      const data = await r.json();
      setApplicants(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
  }, [currentUser.id]);

  useEffect(() => {
    fetchBrowse();
    fetchMyRequests();
  }, [fetchBrowse, fetchMyRequests]);
  useEffect(() => {
    if (mainTab === 'my-applications') fetchMyApplications();
    if (mainTab === 'host-dashboard') fetchMyRequests();
  }, [mainTab, fetchMyApplications, fetchMyRequests]);

  // Auto-refresh host dashboard every 20s so incoming applicants appear without manual tab switch
  useEffect(() => {
    if (mainTab !== 'host-dashboard') return;
    const id = setInterval(() => fetchMyRequests(), 20000);
    return () => clearInterval(id);
  }, [mainTab, fetchMyRequests]);

  // Auto-refresh applicants view every 15s when a host is looking at their applicant list
  useEffect(() => {
    if (detailView !== 'applicants' || !selectedMyRequest) return;
    const id = setInterval(() => fetchApplicants(selectedMyRequest.id), 15000);
    return () => clearInterval(id);
  }, [detailView, selectedMyRequest?.id, fetchApplicants]);

  // ── Filtered browse list ─────────────────────────────────────────────────────
  const filteredRequests = requests.filter(r => {
    const matchPurpose = filterPurpose === 'All' || r.purpose === filterPurpose;
    const matchSearch = matchesStudentSearch(
      r.host ?? {},
      searchQ,
      [
        r.title,
        r.description,
        r.purpose,
        r.eligibilityCollege,
        r.eligibilityYear,
        r.eligibilityBranch,
        r.meetingLocation,
      ],
    );
    const matchCollege = collegeFilter === 'All' || r.host?.college === collegeFilter;
    const matchBranch = branchFilter === 'All' || r.host?.branch === branchFilter;
    const matchYear = yearFilter === 'All' || String(r.host?.year ?? '') === yearFilter;
    const matchSkill = skillFilter === 'All' || Boolean(r.host?.skills?.includes(skillFilter));
    const matchClass = classFilter === 'All' || getStudentClassLabel(r.host ?? {}) === classFilter;
    const matchExam = examFilter === 'All' || getStudentExamLabels(r.host ?? {}).includes(examFilter);
    return matchPurpose && matchSearch && matchCollege && matchBranch && matchYear && matchSkill && matchClass && matchExam;
  });

  const activeMyRequests = myRequests.filter(request => request.status === 'active');
  const activeMyRequest = activeMyRequests[0] ?? null;

  const collegeOptions = Array.from(new Set(requests.map(r => r.host?.college).filter(Boolean) as string[])).sort();
  const branchOptions = Array.from(new Set(requests.map(r => r.host?.branch).filter(Boolean) as string[])).sort();
  const skillOptions = Array.from(new Set(requests.flatMap(r => r.host?.skills ?? []).filter(Boolean))).sort();
  const requestHosts = requests.flatMap(request => request.host ? [request.host] : []);
  const classOptions = Array.from(new Set(requestHosts.map(getStudentClassLabel).filter(Boolean)))
    .sort((a, b) => Number(a.replace(/\D/g, '')) - Number(b.replace(/\D/g, '')));
  const examOptions = getAvailableStudentExamOptions(requestHosts);
  const resetPeopleFilters = () => {
    setSearchQ('');
    setCollegeFilter('All');
    setBranchFilter('All');
    setYearFilter('All');
    setSkillFilter('All');
    setClassFilter('All');
    setExamFilter('All');
    setFilterPurpose('Study Partner');
    setSelectedConnectLabel('DSA Partner');
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────
  async function handleApply() {
    if (!selectedRequest) return;
    if (!applyIntro.trim()) { setApplyError('Please write a short introduction.'); return; }
    setApplying(true); setApplyError('');
    try {
      const r = await fetch(`${API_ORIGIN}/api/find-people/requests/${selectedRequest.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicantId: currentUser.id, intro: applyIntro }),
      });
      if (r.status === 409) { setApplyError('You have already applied to this request.'); return; }
      if (!r.ok) { const d = await r.json(); setApplyError(d.error || 'Failed to apply'); return; }
      // Show success state inside modal, then close
      setApplySuccess(true);
      fetchBrowse();
      setSelectedRequest(prev => prev ? { ...prev, hasApplied: true, applicantCount: (prev.applicantCount ?? 0) + 1 } : prev);
      setTimeout(() => {
        setShowApplyModal(false);
        setApplyIntro('');
        setApplySuccess(false);
      }, 2200);
    } catch { setApplyError('Network error. Please try again.'); }
    finally { setApplying(false); }
  }

  function beginEditRequest(request: FindRequest) {
    setEditingRequestId(request.id);
    setForm({
      purpose: request.purpose,
      title: request.title,
      description: request.description,
      eligibilityCollege: request.eligibilityCollege,
      eligibilityYear: request.eligibilityYear,
      eligibilityBranch: request.eligibilityBranch,
      genderPreference: request.genderPreference,
      maxApplicants: request.maxApplicants,
      preferredTime: request.preferredTime,
      meetingLocation: request.meetingLocation,
    });
    setCreateStep(2);
    setFormError('');
    setDetailView('create');
  }

  async function handleCreate() {
    if (!form.purpose || !form.title.trim() || !form.description.trim()) {
      setFormError('Please fill in all required fields.'); return;
    }
    const isEditing = Boolean(editingRequestId);
    setSubmitting(true); setFormError('');
    try {
      const endpoint = `${API_ORIGIN}/api/find-people/requests${isEditing ? `/${editingRequestId}` : ''}`;
      const r = await fetch(endpoint, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEditing ? { userId: currentUser.id, ...form } : { hostId: currentUser.id, ...form }),
      });
      if (!r.ok) {
        const d = await r.json();
        setFormError(d.error || (isEditing ? 'Failed to save changes' : 'Failed to create'));
        return;
      }
      setDetailView('list');
      setMainTab(isEditing ? 'host-dashboard' : 'browse');
      const savedPreference = connectLabelForPurpose(form.purpose);
      if (onSaveConnectPreference) {
        try {
          await onSaveConnectPreference(savedPreference);
        } catch {
          // The request itself was saved; the next profile refresh will
          // derive visibility from the active request.
        }
      }
      setSelectedConnectLabel(savedPreference);
      setFilterPurpose(form.purpose);
      setCreateStep(1);
      setEditingRequestId(null);
      setForm({ ...EMPTY_REQUEST_FORM });
      await Promise.all([fetchBrowse(), fetchMyRequests()]);
    } catch { setFormError('Network error.'); }
    finally { setSubmitting(false); }
  }

  async function handleApplicationAction(appId: string, status: 'accepted' | 'rejected') {
    await fetch(`${API_ORIGIN}/api/find-people/applications/${appId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, userId: currentUser.id }),
    });
    if (selectedMyRequest) fetchApplicants(selectedMyRequest.id);
    fetchMyRequests();
  }

  async function handleDeleteRequest(requestId: string) {
    if (!confirm('Delete this request? This cannot be undone.')) return;
    await fetch(`${API_ORIGIN}/api/find-people/requests/${requestId}?userId=${currentUser.id}`, { method: 'DELETE' });
    fetchMyRequests();
  }

  async function handleRequestStatus(request: FindRequest, status: 'active' | 'closed') {
    try {
      const response = await fetch(`${API_ORIGIN}/api/find-people/requests/${request.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, status }),
      });
      if (!response.ok) throw new Error('Could not update request status');
      if (status === 'closed') {
        await onSaveConnectPreference?.(null);
      } else {
        await onSaveConnectPreference?.(connectLabelForPurpose(request.purpose));
      }
      await Promise.all([fetchBrowse(), fetchMyRequests()]);
    } catch (error) {
      console.error('Failed to update looking-for status', error);
    }
  }

  async function handleStopLooking() {
    if (!activeMyRequests.length) return;
    await Promise.all(activeMyRequests.map(request => handleRequestStatus(request, 'closed')));
  }

  // ── Create Form ──────────────────────────────────────────────────────────────
  function renderCreate() {
    return (
      <div className="min-h-full">
        <div className={`sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b ${darkMode ? 'bg-[#09090C]/95 border-white/8' : 'bg-white/95 border-neutral-100'} backdrop-blur-md`}>
          <button onClick={() => { setDetailView('list'); setCreateStep(1); setEditingRequestId(null); setFormError(''); }}
            className={`p-2 rounded-xl ${darkMode ? 'hover:bg-white/8 text-slate-300' : 'hover:bg-neutral-100 text-slate-600'}`}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className={`font-bold text-[15px] ${darkMode ? 'text-white' : 'text-slate-900'}`}>{editingRequestId ? 'Edit Request' : 'Create a Request'}</h2>
            <p className={`text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Step {createStep} of 2</p>
          </div>
          <div className="ml-auto flex gap-1">
            {[1,2].map(s => (
              <span key={s} className={`w-6 h-1.5 rounded-full transition-all ${createStep >= s ? 'bg-indigo-500' : darkMode ? 'bg-white/10' : 'bg-neutral-200'}`} />
            ))}
          </div>
        </div>

        <div className="p-4 space-y-5">
          {createStep === 1 ? (
            <>
              <div>
                <p className={`text-[13px] font-semibold mb-1 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>Choose a Purpose</p>
                <p className={`text-[11px] mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>What are you looking for?</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {PURPOSES.map(p => (
                    <button key={p.id}
                      onClick={() => setForm(f => ({ ...f, purpose: p.id }))}
                      className={`flex items-start gap-2.5 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        form.purpose === p.id
                          ? 'border-indigo-500 bg-indigo-500/10 shadow-sm shadow-indigo-500/20'
                          : darkMode ? 'border-white/8 bg-white/4 hover:bg-white/8' : 'border-neutral-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/30'
                      }`}
                    >
                      <span className="text-xl leading-none mt-0.5">{p.emoji}</span>
                      <div>
                        <p className={`text-[12px] font-semibold leading-snug ${form.purpose === p.id ? 'text-indigo-600' : darkMode ? 'text-white' : 'text-slate-800'}`}>{p.id}</p>
                        <p className={`text-[10px] mt-0.5 leading-snug ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{p.desc}</p>
                      </div>
                      {form.purpose === p.id && <Check size={14} className="ml-auto text-indigo-500 shrink-0 mt-0.5" />}
                    </button>
                  ))}
                </div>
              </div>
              <button
                disabled={!form.purpose}
                onClick={() => setCreateStep(2)}
                className="w-full py-3 rounded-2xl bg-indigo-500 text-white font-bold text-[14px] disabled:opacity-40 hover:bg-indigo-600 transition-all"
              >
                Next →
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <PurposeBadge purpose={form.purpose} />
                <button onClick={() => setCreateStep(1)} className="text-[10px] text-slate-400 hover:text-indigo-500">Change</button>
              </div>

              <div>
                <label className={`block text-[12px] font-semibold mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder={form.purpose === 'Coffee Chat' ? 'e.g. Coffee this Saturday ☕' : form.purpose === 'Study Partner' ? 'e.g. DSA Study Partner for 6 Months' : 'Give your request a title'}
                  maxLength={80}
                  className={`w-full rounded-xl border px-3 py-2.5 text-[13px] outline-none focus:border-indigo-400 transition-all ${darkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500' : 'bg-white border-neutral-200 text-slate-900 placeholder:text-slate-400'}`}
                />
                <p className={`text-right text-[10px] mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{form.title.length}/80</p>
              </div>

              <div>
                <label className={`block text-[12px] font-semibold mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Description *</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={4}
                  maxLength={300}
                  placeholder="Introduce yourself and what you're looking for..."
                  className={`w-full rounded-xl border px-3 py-2.5 text-[13px] outline-none focus:border-indigo-400 resize-none transition-all ${darkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500' : 'bg-white border-neutral-200 text-slate-900 placeholder:text-slate-400'}`}
                />
                <p className={`text-right text-[10px] mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{form.description.length}/300</p>
              </div>

              <div className={`rounded-2xl border p-4 space-y-3 ${darkMode ? 'border-white/8 bg-white/3' : 'border-neutral-100 bg-neutral-50'}`}>
                <p className={`text-[12px] font-bold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>Eligibility</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-[10px] font-semibold mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>College</label>
                    <select value={form.eligibilityCollege} onChange={e => setForm(f => ({ ...f, eligibilityCollege: e.target.value }))}
                      className={`w-full rounded-xl border px-2.5 py-2 text-[12px] outline-none ${darkMode ? 'bg-white/8 border-white/10 text-white' : 'bg-white border-neutral-200 text-slate-800'}`}>
                      <option value="same">Same College Only</option>
                      <option value="nearby">Nearby Colleges</option>
                      <option value="any">All Colleges</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-[10px] font-semibold mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Year</label>
                    <select value={form.eligibilityYear} onChange={e => setForm(f => ({ ...f, eligibilityYear: e.target.value }))}
                      className={`w-full rounded-xl border px-2.5 py-2 text-[12px] outline-none ${darkMode ? 'bg-white/8 border-white/10 text-white' : 'bg-white border-neutral-200 text-slate-800'}`}>
                      {YEARS.map(y => <option key={y}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-[10px] font-semibold mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Branch</label>
                    <input value={form.eligibilityBranch} onChange={e => setForm(f => ({ ...f, eligibilityBranch: e.target.value }))}
                      placeholder="Any" className={`w-full rounded-xl border px-2.5 py-2 text-[12px] outline-none ${darkMode ? 'bg-white/8 border-white/10 text-white placeholder:text-slate-500' : 'bg-white border-neutral-200 text-slate-800 placeholder:text-slate-400'}`} />
                  </div>
                  <div>
                    <label className={`block text-[10px] font-semibold mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Gender Preference</label>
                    <select value={form.genderPreference} onChange={e => setForm(f => ({ ...f, genderPreference: e.target.value }))}
                      className={`w-full rounded-xl border px-2.5 py-2 text-[12px] outline-none ${darkMode ? 'bg-white/8 border-white/10 text-white' : 'bg-white border-neutral-200 text-slate-800'}`}>
                      {GENDERS.map(g => <option key={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-[10px] font-semibold mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Max Applicants</label>
                    <select value={form.maxApplicants} onChange={e => setForm(f => ({ ...f, maxApplicants: Number(e.target.value) }))}
                      className={`w-full rounded-xl border px-2.5 py-2 text-[12px] outline-none ${darkMode ? 'bg-white/8 border-white/10 text-white' : 'bg-white border-neutral-200 text-slate-800'}`}>
                      {MAX_OPTS.map(n => <option key={n}>{n}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[12px] font-semibold mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Preferred Time</label>
                  <select value={form.preferredTime} onChange={e => setForm(f => ({ ...f, preferredTime: e.target.value }))}
                    className={`w-full rounded-xl border px-3 py-2.5 text-[13px] outline-none ${darkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-neutral-200 text-slate-800'}`}>
                    {TIMES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-[12px] font-semibold mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Meeting Location</label>
                  <select value={form.meetingLocation} onChange={e => setForm(f => ({ ...f, meetingLocation: e.target.value }))}
                    className={`w-full rounded-xl border px-3 py-2.5 text-[13px] outline-none ${darkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-neutral-200 text-slate-800'}`}>
                    {PLACES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {formError && (
                <div className="flex items-center gap-2 text-rose-500 text-[12px] bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                  <AlertCircle size={13} /> {formError}
                </div>
              )}

              <div className="flex gap-2 pb-4">
                <button onClick={() => setCreateStep(1)} className={`flex-1 py-3 rounded-2xl border font-bold text-[14px] transition-all ${darkMode ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-neutral-200 text-slate-600 hover:bg-neutral-50'}`}>
                  Back
                </button>
                <button onClick={handleCreate} disabled={submitting}
                  className="flex-1 py-3 rounded-2xl bg-indigo-500 text-white font-bold text-[14px] hover:bg-indigo-600 disabled:opacity-60 transition-all">
                  {submitting ? (editingRequestId ? 'Saving...' : 'Posting...') : (editingRequestId ? 'Save Changes' : 'Post Request 🎉')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Detail View ──────────────────────────────────────────────────────────────
  function renderDetail() {
    const r = selectedRequest;
    if (!r) return null;
    const isOwn = r.hostId === currentUser.id;
    const isFull = (r.applicantCount ?? 0) >= r.maxApplicants;
    const [gradA, gradB] = PURPOSE_GRADIENT[r.purpose] ?? ['#6366f1', '#8b5cf6'];
    const filled = Math.min((r.applicantCount ?? 0) / Math.max(r.maxApplicants, 1), 1);
    const spotsLeft = r.maxApplicants - (r.applicantCount ?? 0);
    const suffix = (n: number) => ['st','nd','rd'][n-1] ?? 'th';

    const detailRows = [
      { label: 'Preferred Time',   value: r.preferredTime,      icon: <Clock size={14}/> },
      { label: 'Location',         value: r.meetingLocation,    icon: <MapPin size={14}/> },
      { label: 'Who can apply',    value: r.eligibilityCollege === 'same' ? 'Same College Only' : r.eligibilityCollege === 'nearby' ? 'Nearby Colleges' : 'All Colleges', icon: <UserCheck size={14}/> },
      { label: 'Year',             value: r.eligibilityYear,    icon: <GraduationCap size={14}/> },
      { label: 'Branch',           value: r.eligibilityBranch,  icon: <BookOpen size={14}/> },
      { label: 'Gender',           value: r.genderPreference,   icon: <Sparkles size={14}/> },
    ].filter(d => d.value && d.value !== 'Any' && d.value !== 'any');

    return (
      <div className="min-h-full pb-32">

        {/* ── Hero Banner ─────────────────────────────────────────────────── */}
        <div className="relative" style={{ background: `linear-gradient(135deg, ${gradA}, ${gradB})` }}>
          {/* Back button */}
          <button
            onClick={() => { setDetailView('list'); setSelectedRequest(null); }}
            className="absolute top-4 left-4 z-10 w-8 h-8 rounded-xl bg-black/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/30 transition-all"
          >
            <ArrowLeft size={16} />
          </button>

          {/* Purpose emoji — top right */}
          <div className="absolute top-4 right-4 text-2xl select-none">{purposeEmoji(r.purpose)}</div>

          {/* Profile photo — centered */}
          <div className="pt-14 pb-6 flex flex-col items-center">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-white/30 shadow-xl shadow-black/20 mb-3">
              {r.host ? <Avatar avatar={r.host.avatar} className="w-full h-full object-cover" /> : (
                <div className="w-full h-full bg-white/20 flex items-center justify-center text-3xl">👤</div>
              )}
            </div>
            {r.host && (
              <>
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-white font-black text-[18px] leading-tight drop-shadow-sm">{r.host.fullName}</p>
                  {r.host.isVerified && (
                    <span className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-white px-1.5 py-0.5 rounded-full">
                      <Check size={8} /> Verified
                    </span>
                  )}
                </div>
                <p className="text-white/80 text-[12px] font-medium">
                   {getEducationDisplay(r.host).compact}
                </p>
                <p className="text-white/60 text-[11px] mt-0.5">{r.host.college}</p>
              </>
            )}
          </div>

          {/* Wave bottom */}
          <div
            className={`h-6 ${darkMode ? 'bg-[#09090C]' : 'bg-[#f5f5f7]'}`}
            style={{ borderRadius: '24px 24px 0 0', marginTop: '-1px' }}
          />
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className={`px-4 space-y-4 ${darkMode ? 'bg-[#09090C]' : 'bg-[#f5f5f7]'}`}>

          {/* About the host */}
          {(r.host?.aboutMe || (r.host?.interests?.length ?? 0) > 0) && (
            <div className={`rounded-2xl p-4 ${darkMode ? 'bg-white/5 border border-white/8' : 'bg-white border border-neutral-100'}`}>
              <p className={`text-[11px] font-bold uppercase tracking-wide mb-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>About</p>
              {r.host?.aboutMe && (
                <p className={`text-[13px] leading-relaxed mb-3 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{r.host.aboutMe}</p>
              )}
              {(r.host?.interests?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {r.host!.interests.slice(0, 5).map(i => (
                    <span key={i} className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${darkMode ? 'bg-white/8 text-slate-300' : 'bg-neutral-100 text-slate-600'}`}>{i}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Request content */}
          <div className={`rounded-2xl p-4 ${darkMode ? 'bg-white/5 border border-white/8' : 'bg-white border border-neutral-100'}`}>
            {/* Purpose badge */}
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full mb-3 ${PURPOSE_BADGE[r.purpose] ?? 'bg-indigo-100 text-indigo-700 border-indigo-200'} border`}>
              {purposeEmoji(r.purpose)} {r.purpose}
            </span>
            <h2 className={`font-black text-[17px] leading-snug mb-2.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{r.title}</h2>
            <p className={`text-[13px] leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{r.description}</p>
          </div>

          {/* Spots progress */}
          <div className={`rounded-2xl p-4 ${darkMode ? 'bg-white/5 border border-white/8' : 'bg-white border border-neutral-100'}`}>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-[12px] font-bold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>Open Spots</p>
              <span className={`text-[12px] font-black ${isFull ? 'text-red-500' : spotsLeft <= 2 ? 'text-amber-500' : 'text-emerald-500'}`}>
                {isFull ? 'Full' : `${spotsLeft} left`}
              </span>
            </div>
            {/* Progress bar */}
            <div className={`w-full h-2 rounded-full overflow-hidden ${darkMode ? 'bg-white/10' : 'bg-neutral-100'}`}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${filled * 100}%`,
                  background: filled >= 1 ? '#ef4444' : filled >= 0.7 ? '#f59e0b' : `linear-gradient(90deg, ${gradA}, ${gradB})`,
                }}
              />
            </div>
            <p className={`text-[11px] mt-1.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {r.applicantCount ?? 0} of {r.maxApplicants} spots taken
            </p>
          </div>

          {/* Details grid */}
          {detailRows.length > 0 && (
            <div className={`rounded-2xl p-4 ${darkMode ? 'bg-white/5 border border-white/8' : 'bg-white border border-neutral-100'}`}>
              <p className={`text-[11px] font-bold uppercase tracking-wide mb-3 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Details</p>
              <div className="space-y-0">
                {detailRows.map((d, i) => (
                  <div key={d.label} className={`flex items-center justify-between py-2.5 ${i < detailRows.length - 1 ? `border-b ${darkMode ? 'border-white/6' : 'border-neutral-100'}` : ''}`}>
                    <span className={`flex items-center gap-2 text-[12px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      <span className={darkMode ? 'text-slate-600' : 'text-slate-400'}>{d.icon}</span>
                      {d.label}
                    </span>
                    <span className={`text-[12px] font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Sticky Apply ────────────────────────────────────────────────── */}
        {!isOwn && (
          <div className={`fixed bottom-16 left-0 right-0 px-4 py-3 z-[60] ${darkMode ? 'bg-[#09090C]/95 border-t border-white/8' : 'bg-[#f5f5f7]/95 border-t border-neutral-200/60'} backdrop-blur-md`}>
            {r.hasApplied ? (
              <div className="w-full py-3.5 rounded-2xl bg-emerald-500/12 border border-emerald-400/30 text-emerald-600 font-bold text-[14px] flex items-center justify-center gap-2">
                <Check size={16} /> Application Sent
              </div>
            ) : isFull ? (
              <div className={`w-full py-3.5 rounded-2xl border font-bold text-[14px] flex items-center justify-center gap-2 ${darkMode ? 'bg-white/5 border-white/10 text-slate-500' : 'bg-neutral-100 border-neutral-200 text-slate-400'}`}>
                <Users size={16} /> Request Full
              </div>
            ) : (
              <button
                onClick={() => setShowApplyModal(true)}
                className="w-full py-3.5 rounded-2xl text-white font-black text-[15px] flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg"
                style={{ background: `linear-gradient(135deg, ${gradA}, ${gradB})`, boxShadow: `0 8px 24px ${gradA}40` }}
              >
                Apply Now ✨
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Applicants view ──────────────────────────────────────────────────────────
  function renderApplicants() {
    const req = selectedMyRequest;
    if (!req) return null;
    const pending  = applicants.filter(a => a.status === 'pending');
    const accepted = applicants.filter(a => a.status === 'accepted');
    const rejected = applicants.filter(a => a.status === 'rejected');

    return (
      <div className="min-h-full">
        <div className={`sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b ${darkMode ? 'bg-[#09090C]/95 border-white/8' : 'bg-white/95 border-neutral-100'} backdrop-blur-md`}>
          <button onClick={() => { setDetailView('list'); setMainTab('host-dashboard'); setSelectedMyRequest(null); }}
            className={`p-2 rounded-xl ${darkMode ? 'hover:bg-white/8 text-slate-300' : 'hover:bg-neutral-100 text-slate-600'}`}>
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <h2 className={`font-bold text-[14px] truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>Applicants ({applicants.length})</h2>
            <p className={`text-[10px] truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{req.title}</p>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {applicants.length === 0 ? (
            <div className={`text-center py-12 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              <Users size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-[13px] font-medium">No applicants yet</p>
              <p className="text-[11px] mt-1">Share your request to attract applicants</p>
            </div>
          ) : (
            <>
              {pending.length > 0 && (
                <div>
                  <p className={`text-[11px] font-bold mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>PENDING ({pending.length})</p>
                  <div className="space-y-2.5">
                    {pending.map(a => <ApplicantCard key={a.id} app={a} onAccept={() => handleApplicationAction(a.id, 'accepted')} onReject={() => handleApplicationAction(a.id, 'rejected')} darkMode={darkMode} onChat={() => { if (a.applicant && onNavigate) onNavigate('messages'); }} />)}
                  </div>
                </div>
              )}
              {accepted.length > 0 && (
                <div>
                  <p className={`text-[11px] font-bold mb-2 text-emerald-500`}>ACCEPTED ({accepted.length})</p>
                  <div className="space-y-2.5">
                    {accepted.map(a => <ApplicantCard key={a.id} app={a} darkMode={darkMode} accepted onChat={() => { if (a.applicant && onNavigate) onNavigate('messages'); }} />)}
                  </div>
                </div>
              )}
              {rejected.length > 0 && (
                <div>
                  <p className={`text-[11px] font-bold mb-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>REJECTED ({rejected.length})</p>
                  <div className="space-y-2.5 opacity-60">
                    {rejected.map(a => <ApplicantCard key={a.id} app={a} darkMode={darkMode} rejected />)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Filter chips (top 5 visible, rest behind "More") ─────────────────────────
  const QUICK_FILTERS = ['All', 'Coffee Chat', 'Study Partner', 'Coding Partner', 'Internship Partner'];
  const MORE_FILTERS  = PURPOSES.map(p => p.id).filter(id => !QUICK_FILTERS.includes(id));

  // ── Main render ──────────────────────────────────────────────────────────────
  if (detailView === 'create') return renderCreate();
  if (detailView === 'detail') return renderDetail();
  if (detailView === 'applicants') return renderApplicants();

  // Scored recommendations
  const scoredRecommendations = requests
    .filter(r => r.hostId !== currentUser.id && r.host)
    .map(r => ({
      req: r,
      host: r.host as UserProfile,
      score: computeMatchScore(currentUser, r.host as UserProfile),
      mutual: mutualCount(currentUser, r.host as UserProfile),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  const studyRecommendations = getPeopleRecommendations(currentUser, allUsers);
  const studyRecommendationCopy = recommendationHeading(currentUser);

  return (
    <div className="space-y-0">
      {/* ── Connect header ── */}
      <header className="px-2 md:px-4 pt-4 md:pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-[28px] leading-none font-black tracking-[-0.04em] ${darkMode ? 'text-white' : 'text-[#101737]'}`}>Connect</h1>
            <p className={`text-[12px] mt-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Find people who are looking for the <span className="font-bold text-indigo-600">same things</span> as you.</p>
          </div>
          <button
            onClick={() => { setEditingRequestId(null); setForm({ ...EMPTY_REQUEST_FORM }); setDetailView('create'); setCreateStep(1); setFormError(''); }}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 text-white text-[11px] font-black shadow-sm shadow-indigo-600/25 hover:bg-indigo-700 transition-all"
          >
            <PenLine size={13} /> Post
          </button>
        </div>
        <div className={`hidden md:flex items-center gap-5 mt-4 border-b ${darkMode ? 'border-white/10' : 'border-slate-100'}`}>
          {([
            { id: 'browse', label: 'Discover' },
            { id: 'my-applications', label: 'Applied' },
            { id: 'host-dashboard', label: 'My requests' },
          ] as { id: MainTab; label: string }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setMainTab(tab.id)}
              className={`relative pb-2 text-[11px] font-bold transition-colors ${
                mainTab === tab.id
                  ? darkMode ? 'text-indigo-300' : 'text-indigo-600'
                  : darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab.label}
              {mainTab === tab.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-indigo-500" />}
            </button>
          ))}
        </div>
      </header>

      {mainTab === 'browse' && (
        <>
          {studyRecommendations.length > 0 && (
            <section className="px-2 md:px-4 mt-1 mb-5">
              <div className={`rounded-[22px] border p-4 ${
                darkMode
                  ? 'border-indigo-400/20 bg-gradient-to-br from-indigo-500/10 via-white/[0.03] to-transparent'
                  : 'border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-white'
              }`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${darkMode ? 'bg-indigo-500/20' : 'bg-white shadow-sm'}`}>
                      <BookOpen size={16} className="text-indigo-600" />
                    </div>
                    <div>
                      <h2 className={`text-[15px] font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{studyRecommendationCopy.title}</h2>
                      <p className={`text-[10px] mt-0.5 leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{studyRecommendationCopy.subtitle}</p>
                    </div>
                  </div>
                  <Sparkles size={16} className="text-amber-500 shrink-0 mt-1" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {studyRecommendations.map(match => (
                    <StudyPartnerCard
                      key={match.user.id}
                      match={match}
                      darkMode={darkMode}
                      onViewProfile={onViewUserProfile}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}
          {/* ── Purpose chips ── */}
           <section className="px-2 md:px-4">
             <div className="flex items-center justify-between mb-2.5">
               <p className={`text-[14px] font-black ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>What are you looking for?</p>
            </div>
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {CONNECT_FILTERS.map(filter => {
                const Icon = filter.icon;
                const colors = CONNECT_TONE_CLASSES[filter.tone];
                const selected = selectedConnectLabel === filter.label;
                return (
                  <button
                    key={filter.label}
                    onClick={() => {
                      setSelectedConnectLabel(filter.label);
                      setFilterPurpose(filter.value);
                      setEditingRequestId(null);
                      setForm({ ...EMPTY_REQUEST_FORM, purpose: filter.value });
                      setFormError('');
                      setCreateStep(1);
                      setDetailView('create');
                    }}
                     className={`min-w-0 min-h-11 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full border text-[10px] font-bold transition-all active:scale-95 ${
                      selected
                        ? colors.selected
                        : darkMode
                          ? 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/40'
                    }`}
                  >
                    <Icon size={13} className={selected ? '' : (darkMode ? 'text-slate-400' : colors.icon.split(' ')[0])} />
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Current looking-for request ── */}
          <section className="px-2 md:px-4 mt-3.5">
            {activeMyRequest ? (
              <div className={`rounded-[18px] border overflow-hidden ${
                darkMode ? 'border-indigo-400/25 bg-indigo-500/10' : 'border-indigo-100 bg-[#f7f5ff]'
              }`}>
                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${darkMode ? 'bg-indigo-500/20' : 'bg-white'}`}>
                        <Target size={16} className="text-indigo-600" />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-[9px] font-black uppercase tracking-wider ${darkMode ? 'text-indigo-300' : 'text-indigo-500'}`}>Your looking-for request</p>
                        <p className={`text-[14px] font-black truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{activeMyRequest.title}</p>
                        <p className={`text-[11px] mt-0.5 line-clamp-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{activeMyRequest.description}</p>
                      </div>
                    </div>
                    <PurposeBadge purpose={activeMyRequest.purpose} />
                  </div>
                  <div className={`flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {activeMyRequest.preferredTime && <span className="flex items-center gap-1"><Clock size={10} />{activeMyRequest.preferredTime}</span>}
                    {activeMyRequest.meetingLocation && <span className="flex items-center gap-1"><MapPin size={10} />{activeMyRequest.meetingLocation}</span>}
                    <span className="flex items-center gap-1"><Users size={10} />{activeMyRequest.applicantCount ?? 0} interested</span>
                  </div>
                </div>
                <div className={`flex border-t ${darkMode ? 'border-white/10' : 'border-indigo-100'}`}>
                  <button
                    type="button"
                    onClick={() => beginEditRequest(activeMyRequest)}
                    className={`flex-1 py-2.5 text-[11px] font-black flex items-center justify-center gap-1 ${darkMode ? 'text-indigo-300 hover:bg-white/5' : 'text-indigo-600 hover:bg-white'}`}
                  >
                    <PenLine size={12} /> Edit request
                  </button>
                  <div className={`w-px ${darkMode ? 'bg-white/10' : 'bg-indigo-100'}`} />
                  <button
                    type="button"
                    onClick={handleStopLooking}
                    className={`flex-1 py-2.5 text-[11px] font-black flex items-center justify-center gap-1 ${darkMode ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-white'}`}
                  >
                    <X size={12} /> I’m not looking
                  </button>
                </div>
              </div>
            ) : (
              <div className={`rounded-[18px] border px-3.5 py-3.5 flex items-center justify-between gap-3 ${
                darkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'
              }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${darkMode ? 'bg-white/10' : 'bg-slate-100'}`}>
                    <Target size={16} className={darkMode ? 'text-slate-400' : 'text-slate-500'} />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-[12px] font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>You’re not looking right now</p>
                    <p className={`text-[10px] mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Create a request so people can find and connect with you.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setEditingRequestId(null); setForm({ ...EMPTY_REQUEST_FORM, purpose: filterPurpose === 'All' ? '' : filterPurpose }); setDetailView('create'); setCreateStep(1); setFormError(''); }}
                  className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-indigo-600 text-white text-[10px] font-black hover:bg-indigo-700"
                >
                  <Plus size={12} /> Create request
                </button>
              </div>
            )}
          </section>

          {/* ── People heading and controls ── */}
           <section id="connect-filters" className="px-2 md:px-4 mt-5">
            <div className="flex items-end justify-between">
              <div>
                <h2 className={`text-[15px] font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>People looking for the same</h2>
                <p className={`text-[10px] mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Connect, collaborate and grow together.</p>
              </div>
               <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600">
                Filters <SlidersHorizontal size={13} />
               </div>
            </div>
             <div className={`flex items-center gap-2 mt-3 rounded-xl border px-3 py-2.5 text-[11px] ${
               darkMode ? 'border-white/10 bg-white/[0.04] text-slate-400' : 'border-slate-200 bg-white text-slate-500'
             }`}>
               <Search size={15} className="shrink-0" />
               <input
                 value={searchQ}
                 onChange={e => setSearchQ(e.target.value)}
                  placeholder="Search name, city, college, skills, class, exams..."
                 className={`min-w-0 flex-1 bg-transparent outline-none ${darkMode ? 'text-white placeholder:text-slate-600' : 'text-slate-800 placeholder:text-slate-400'}`}
               />
               {searchQ && <button onClick={() => setSearchQ('')} aria-label="Clear search"><X size={13} /></button>}
             </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mt-2">
               {[
                 { value: collegeFilter, set: setCollegeFilter, label: 'College', options: collegeOptions, id: 'connect-college-filter' },
                 { value: branchFilter, set: setBranchFilter, label: 'Branch', options: branchOptions, id: 'connect-branch-filter' },
                 { value: yearFilter, set: setYearFilter, label: 'Year', options: ['1', '2', '3', '4', '5'], id: 'connect-year-filter' },
                 { value: skillFilter, set: setSkillFilter, label: 'Skills', options: skillOptions, id: 'connect-skills-filter' },
                  { value: classFilter, set: setClassFilter, label: 'Class', options: classOptions, id: 'connect-class-filter' },
                  { value: examFilter, set: setExamFilter, label: 'Exam', options: examOptions, id: 'connect-exam-filter' },
               ].map(filter => (
                 <label key={filter.label} className="relative min-w-0">
                   <select
                     id={filter.id}
                     value={filter.value}
                     onChange={e => filter.set(e.target.value)}
                     aria-label={`${filter.label} filter`}
                     className={`w-full appearance-none rounded-xl border px-3 py-2.5 pr-7 text-[11px] font-medium outline-none ${
                       darkMode ? 'border-white/10 bg-white/[0.04] text-slate-300' : 'border-slate-200 bg-[#fcfcff] text-slate-600'
                     }`}
                   >
                     <option value="All">{filter.label}: All</option>
                     {filter.options.map(option => (
                       <option key={option} value={option}>
                          {filter.label}: {filter.label === 'Year' ? `${option} Year` : option}
                       </option>
                     ))}
                   </select>
                   <ChevronDown size={13} className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                 </label>
               ))}
              <button onClick={resetPeopleFilters} className="shrink-0 flex items-center gap-1 px-2 py-2 text-[10px] font-bold text-indigo-600">
                <X size={11} /> Reset
              </button>
            </div>
          </section>
        </>
      )}

      {/* ── Browse Tab ── */}
      {mainTab === 'browse' && browseSubView === 'picker' && (
        <div className="pb-6">
          {/* Recommended for you */}
          {scoredRecommendations.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center justify-between px-4 mb-3">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-500" />
                  <p className={`text-[15px] font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>Recommended for you</p>
                </div>
                <button
                  onClick={() => { setFilterPurpose('All'); setBrowseSubView('list'); }}
                  className="text-[12px] font-bold text-indigo-500 hover:text-indigo-600 transition-colors"
                >
                  See all
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 px-4 scrollbar-hide">
                {scoredRecommendations.map(({ req, host, score, mutual }) => (
                  <RecommendedCard
                    key={req.id}
                    req={req}
                    host={host}
                    matchPct={score}
                    mutual={mutual}
                    darkMode={darkMode}
                    allUsers={allUsers}
                    onView={() => { setSelectedRequest(req); setDetailView('detail'); }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Category grid */}
          <div className="px-4">
            <p className={`text-[13px] font-semibold mb-3 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              What are you looking for?
            </p>
            <div className="grid grid-cols-2 gap-3">
              {PURPOSES.map(p => {
                const isSelected = filterPurpose === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => { setFilterPurpose(p.id); setBrowseSubView('list'); }}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all active:scale-[0.98] ${
                      isSelected
                        ? darkMode
                          ? 'border-indigo-400 bg-indigo-500/15'
                          : 'border-indigo-400 bg-indigo-50/80'
                        : darkMode
                          ? 'border-white/8 bg-white/4 hover:bg-white/8'
                          : 'border-neutral-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/30'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${PURPOSE_ICON_STYLE[p.id]?.bg ?? 'bg-indigo-50'}`}>
                      {p.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-[13px] leading-snug ${
                        isSelected ? 'text-indigo-600' : darkMode ? 'text-white' : 'text-slate-900'
                      }`}>
                        {p.id}
                      </p>
                      <p className={`text-[10px] mt-0.5 leading-snug ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {p.desc}
                      </p>
                    </div>
                    {isSelected && <Check size={14} className="text-indigo-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Browse Tab — Connect results ── */}
      {mainTab === 'browse' && browseSubView === 'list' && (
        <div className="px-2 md:px-4 pt-3 pb-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className={`h-44 rounded-[20px] animate-pulse ${darkMode ? 'bg-white/5' : 'bg-slate-100'}`} />
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className={`text-center py-12 rounded-[20px] border ${darkMode ? 'border-white/10 bg-white/[0.03] text-slate-400' : 'border-slate-200 bg-white text-slate-500'}`}>
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <Users size={22} className="text-indigo-500" />
              </div>
              <p className={`text-[14px] font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>No matches just yet</p>
              <p className="text-[11px] mt-1 px-6">Be the first person to post a request for {connectFilterLabel(filterPurpose).toLowerCase()}.</p>
              <button
                onClick={() => { setEditingRequestId(null); setForm({ ...EMPTY_REQUEST_FORM, purpose: filterPurpose === 'All' ? '' : filterPurpose }); setDetailView('create'); setCreateStep(1); }}
                className="mt-4 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-[11px] font-black hover:bg-indigo-700 transition-all"
              >
                Post a request
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((r, index) => r.host ? (
                <ConnectResultCard
                  key={r.id}
                  req={r}
                  host={r.host}
                  allUsers={allUsers}
                  darkMode={darkMode}
                  tone={connectFilterTone(r.purpose)}
                  index={index}
                  onView={() => { setSelectedRequest(r); setDetailView('detail'); }}
                  onConnect={() => { setSelectedRequest(r); setShowApplyModal(true); }}
                />
              ) : (
                <RequestCard
                  key={r.id}
                  req={r}
                  darkMode={darkMode}
                  currentUserId={currentUser.id}
                  onView={() => { setSelectedRequest(r); setDetailView('detail'); }}
                  onApply={() => { setSelectedRequest(r); setShowApplyModal(true); }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── My Applications Tab ── */}
      {mainTab === 'my-applications' && (
        <div className="px-4 space-y-3 pb-4">
          {myApplications.length === 0 ? (
            <div className={`text-center py-14 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              <FileText size={36} className="mx-auto mb-3 opacity-25" />
              <p className="text-[14px] font-semibold">No applications yet</p>
              <p className="text-[12px] mt-1">Browse requests and apply to connect</p>
              <button onClick={() => setMainTab('browse')}
                className="mt-4 px-5 py-2.5 rounded-xl bg-indigo-500 text-white text-[13px] font-bold hover:bg-indigo-600 transition-all">
                Browse Requests
              </button>
            </div>
          ) : (
            myApplications.map(app => {
              const req = app.request;
              if (!req) return null;
              const statusColors: Record<string, string> = {
                pending:  'bg-amber-100 text-amber-700 border-amber-200',
                accepted: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                rejected: 'bg-red-100 text-red-600 border-red-200',
              };
              return (
                <div key={app.id} className={`rounded-2xl border p-4 ${darkMode ? 'bg-white/5 border-white/8' : 'bg-white border-neutral-200'}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <PurposeBadge purpose={req.purpose} />
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${statusColors[app.status] || 'bg-gray-100 text-gray-600'}`}>
                      {app.status === 'accepted' ? '✓ Accepted' : app.status === 'rejected' ? '✗ Rejected' : '⏳ Pending'}
                    </span>
                  </div>
                  <h3 className={`font-bold text-[14px] mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{req.title}</h3>
                  {req.host && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 rounded-full overflow-hidden shrink-0"><Avatar avatar={req.host.avatar} /></div>
                      <p className={`text-[11px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{req.host.fullName} · {req.host.college}</p>
                    </div>
                  )}
                  <div className={`flex gap-3 text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    {req.preferredTime && <span className="flex items-center gap-0.5"><Clock size={9} />{req.preferredTime}</span>}
                    {req.meetingLocation && <span className="flex items-center gap-0.5"><MapPin size={9} />{req.meetingLocation}</span>}
                    <span>Applied {timeAgo(app.createdAt)}</span>
                  </div>
                  {app.status === 'accepted' && onNavigate && (
                    <button onClick={() => onNavigate('messages')}
                      className="mt-3 w-full py-2 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-600 text-[12px] font-bold hover:bg-emerald-500/25 transition-all">
                      💬 Start Chatting
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Host Dashboard Tab ── */}
      {mainTab === 'host-dashboard' && (
        <div className="px-4 space-y-4 pb-4">
          {myRequests.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Total Requests', value: myRequests.length },
                { label: 'Total Applicants', value: myRequests.reduce((s, r) => s + (r.applicantCount ?? 0), 0) },
                { label: 'Accepted', value: myRequests.reduce((s, r) => s + (r.acceptedCount ?? 0), 0) },
              ].map(s => (
                <div key={s.label} className={`rounded-2xl border p-3 text-center ${darkMode ? 'bg-white/5 border-white/8' : 'bg-white border-neutral-100'}`}>
                  <p className={`text-[20px] font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{s.value}</p>
                  <p className={`text-[9px] font-semibold mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {myRequests.length === 0 ? (
            <div className={`text-center py-14 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              <Rocket size={36} className="mx-auto mb-3 opacity-25" />
              <p className="text-[14px] font-semibold">No requests yet</p>
              <p className="text-[12px] mt-1">Create your first request to start meeting people</p>
              <button onClick={() => { setEditingRequestId(null); setForm({ ...EMPTY_REQUEST_FORM }); setDetailView('create'); setCreateStep(1); }}
                className="mt-4 px-5 py-2.5 rounded-xl bg-indigo-500 text-white text-[13px] font-bold hover:bg-indigo-600 transition-all">
                Create a Request
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myRequests.map(r => (
                <div key={r.id} className={`rounded-2xl border ${darkMode ? 'bg-white/5 border-white/8' : 'bg-white border-neutral-200'}`}>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <PurposeBadge purpose={r.purpose} />
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${r.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {r.status === 'active' ? '● Active' : '○ Closed'}
                      </span>
                    </div>
                    <h3 className={`font-bold text-[14px] mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{r.title}</h3>
                    <div className={`flex gap-3 text-[10px] mb-3 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      {r.preferredTime && <span className="flex items-center gap-0.5"><Clock size={9} />{r.preferredTime}</span>}
                      {r.meetingLocation && <span className="flex items-center gap-0.5"><MapPin size={9} />{r.meetingLocation}</span>}
                    </div>
                    <div className={`flex items-center gap-4 text-[11px] ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      <span><span className="font-bold">{r.applicantCount ?? 0}</span> applicants</span>
                      <span><span className="font-bold text-emerald-500">{r.acceptedCount ?? 0}</span> accepted</span>
                    </div>
                  </div>
                  <div className={`flex border-t ${darkMode ? 'border-white/8' : 'border-neutral-100'}`}>
                    <button
                      onClick={() => { setSelectedMyRequest(r); setDetailView('applicants'); fetchApplicants(r.id); }}
                      className="flex-1 py-2.5 text-[12px] font-bold text-indigo-500 hover:bg-indigo-500/5 transition-all rounded-bl-2xl flex items-center justify-center gap-1"
                    >
                      <Users size={13} /> View Applicants
                    </button>
                    <div className={`w-px ${darkMode ? 'bg-white/8' : 'bg-neutral-100'}`} />
                    <button
                      onClick={() => beginEditRequest(r)}
                      className="px-4 py-2.5 text-[12px] font-bold text-slate-500 hover:bg-slate-500/5 transition-all flex items-center justify-center gap-1"
                    >
                      <PenLine size={13} /> Edit
                    </button>
                     <div className={`w-px ${darkMode ? 'bg-white/8' : 'bg-neutral-100'}`} />
                    <button
                      onClick={() => handleRequestStatus(r, r.status === 'active' ? 'closed' : 'active')}
                      className={`px-3 py-2.5 text-[11px] font-bold transition-all flex items-center justify-center ${
                        r.status === 'active'
                          ? 'text-slate-500 hover:bg-slate-500/5'
                          : 'text-emerald-600 hover:bg-emerald-500/5'
                      }`}
                    >
                      {r.status === 'active' ? 'Not looking' : 'Reopen'}
                    </button>
                    <div className={`w-px ${darkMode ? 'bg-white/8' : 'bg-neutral-100'}`} />
                    <button
                      onClick={() => handleDeleteRequest(r.id)}
                      className="px-4 py-2.5 text-[12px] font-bold text-red-400 hover:bg-red-500/5 transition-all rounded-br-2xl flex items-center justify-center gap-1"
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

      {/* ── Apply Modal ── */}
      {showApplyModal && (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center"
          onClick={() => { if (!applying && !applySuccess) { setShowApplyModal(false); setApplyIntro(''); setApplyError(''); } }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            onClick={e => e.stopPropagation()}
            className={`relative w-full max-w-lg rounded-t-3xl shadow-2xl overflow-hidden ${darkMode ? 'bg-[#131318]' : 'bg-white'}`}
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className={`w-10 h-1 rounded-full ${darkMode ? 'bg-white/20' : 'bg-neutral-300'}`} />
            </div>

            {applySuccess ? (
              /* ── Success state ── */
              <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 border-2 border-emerald-400/40 flex items-center justify-center mb-4">
                  <Check size={28} className="text-emerald-500" />
                </div>
                <h3 className={`font-black text-[18px] mb-1.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Application Sent! 🎉</h3>
                <p className={`text-[13px] leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Your intro was sent to the host. You'll get a notification when they respond.
                </p>
              </div>
            ) : (
              /* ── Form state ── */
              <div className="px-5 pt-2 pb-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className={`font-bold text-[16px] ${darkMode ? 'text-white' : 'text-slate-900'}`}>Apply to Request</h3>
                  <button
                    onClick={() => { setShowApplyModal(false); setApplyIntro(''); setApplyError(''); }}
                    className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-white/8 text-slate-400' : 'hover:bg-neutral-100 text-slate-500'}`}
                  >
                    <X size={16} />
                  </button>
                </div>

                {selectedRequest && (
                  <div className={`rounded-2xl p-3 flex items-center gap-3 ${darkMode ? 'bg-white/5 border border-white/8' : 'bg-neutral-50 border border-neutral-100'}`}>
                    <div className="text-xl">{purposeEmoji(selectedRequest.purpose)}</div>
                    <div className="min-w-0">
                      <PurposeBadge purpose={selectedRequest.purpose} />
                      <p className={`text-[12px] font-semibold mt-1 truncate ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{selectedRequest.title}</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className={`block text-[12px] font-semibold mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Your Introduction <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    value={applyIntro}
                    onChange={e => { setApplyIntro(e.target.value); if (applyError) setApplyError(''); }}
                    rows={4}
                    placeholder={`Hi! I'm ${currentUser.fullName?.split(' ')[0]}, a ${currentUser.year}${['st','nd','rd','th'][Math.min((currentUser.year||1)-1,3)]} year ${currentUser.branch} student. I'd love to connect because...`}
                    className={`w-full rounded-2xl border px-4 py-3 text-[14px] outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none transition-all ${darkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-white border-neutral-200 text-slate-900 placeholder:text-slate-400'}`}
                  />
                  <p className={`text-[11px] mt-1 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                    {applyIntro.trim().length}/300 characters
                  </p>
                </div>

                {applyError && (
                  <div className="flex items-center gap-2 text-rose-500 text-[12px] bg-rose-500/10 rounded-xl px-3 py-2 border border-rose-400/20">
                    <AlertCircle size={14} /> {applyError}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => { setShowApplyModal(false); setApplyIntro(''); setApplyError(''); }}
                    className={`flex-1 py-3.5 rounded-2xl border font-semibold text-[14px] transition-all ${darkMode ? 'border-white/10 text-slate-400 hover:bg-white/5' : 'border-neutral-200 text-slate-600 hover:bg-neutral-50'}`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApply}
                    disabled={applying || !applyIntro.trim()}
                    className="flex-2 px-6 py-3.5 rounded-2xl bg-indigo-500 text-white font-black text-[14px] hover:bg-indigo-600 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/25"
                    style={{ flex: 2 }}
                  >
                    {applying ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                        Sending...
                      </span>
                    ) : 'Send Application →'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Applicant Card ───────────────────────────────────────────────────────────
function ApplicantCard({
  app, darkMode, onAccept, onReject, accepted, rejected, onChat
}: {
  app: FindApplication; darkMode: boolean;
  onAccept?: () => void; onReject?: () => void;
  accepted?: boolean; rejected?: boolean;
  onChat?: () => void;
}) {
  const u = app.applicant;
  if (!u) return null;
  return (
    <div className={`rounded-2xl border p-3.5 ${darkMode ? 'bg-white/5 border-white/8' : 'bg-white border-neutral-200'}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0"><Avatar avatar={u.avatar} /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className={`font-bold text-[13px] ${darkMode ? 'text-white' : 'text-slate-900'}`}>{u.fullName}</p>
            {u.isVerified && <Check size={10} className="text-emerald-500" />}
          </div>
          <p className={`text-[11px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {getEducationDisplay(u).compact} · {u.college}
          </p>
          {u.interests?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {u.interests.slice(0, 3).map(i => (
                <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded-full border ${darkMode ? 'border-white/10 bg-white/5 text-slate-300' : 'border-neutral-200 bg-neutral-50 text-slate-600'}`}>{i}</span>
              ))}
            </div>
          )}
        </div>
      </div>
      {app.intro && (
        <p className={`text-[12px] mt-2.5 leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>"{app.intro}"</p>
      )}
      <p className={`text-[10px] mt-1.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Applied {new Date(app.createdAt).toLocaleDateString()}</p>
      {!accepted && !rejected && onAccept && onReject && (
        <div className="flex gap-2 mt-3">
          <button onClick={onReject} className={`flex-1 py-2 rounded-xl border text-[12px] font-semibold flex items-center justify-center gap-1 transition-all ${darkMode ? 'border-white/10 text-slate-400 hover:bg-white/5' : 'border-neutral-200 text-slate-600 hover:bg-neutral-50'}`}>
            <X size={12} /> Reject
          </button>
          <button onClick={onAccept} className="flex-1 py-2 rounded-xl bg-emerald-500 text-white text-[12px] font-bold flex items-center justify-center gap-1 hover:bg-emerald-600 transition-all">
            <Check size={12} /> Accept
          </button>
        </div>
      )}
      {accepted && (
        <div className="flex gap-2 mt-3">
          <div className="flex-1 py-2 rounded-xl bg-emerald-100 text-emerald-700 text-[12px] font-bold flex items-center justify-center gap-1 border border-emerald-200">
            <Check size={12} /> Accepted
          </div>
          {onChat && (
            <button onClick={onChat} className="flex-1 py-2 rounded-xl border text-[12px] font-semibold flex items-center justify-center gap-1 transition-all text-indigo-500 border-indigo-200 hover:bg-indigo-50">
              💬 Chat
            </button>
          )}
        </div>
      )}
    </div>
  );
}
