import './_group.css';
import { Camera, GraduationCap, UserCheck } from 'lucide-react';

type Student = {
  id: string;
  name: string;
  avatar: string;
  hasProfilePhoto: boolean;
  college: string;
  branch: string;
  verified: boolean;
};

type Candidate = {
  user: Student;
  sharedTerms: string[];
  relevantCommunities: { name: string; displayName?: string }[];
  joined: { name: string; displayName?: string }[];
  year: string;
  createdAt: number;
};

const today = Date.now();
const students: Candidate[] = [
  {
    user: { id: 'ajith', name: 'Ajith', avatar: '', hasProfilePhoto: false, college: 'KRCE Trichy', branch: 'CSE', verified: true },
    sharedTerms: ['Web Dev', 'DSA'],
    relevantCommunities: [],
    joined: [],
    year: '1st Year',
    createdAt: today,
  },
  {
    user: { id: 'danya-sri', name: 'Danya Sri', avatar: '', hasProfilePhoto: false, college: 'K. Ramakrishnan College of Engineering', branch: 'CSE', verified: true },
    sharedTerms: ['AI/ML', 'Python'],
    relevantCommunities: [],
    joined: [],
    year: '1st Year',
    createdAt: today,
  },
  {
    user: { id: 'sri-lakshmi', name: 'Sri Lakshmi', avatar: '', hasProfilePhoto: false, college: 'K. Ramakrishnan College of Engineering', branch: 'ECE', verified: true },
    sharedTerms: ['Electronics', 'Robotics'],
    relevantCommunities: [],
    joined: [],
    year: '1st Year',
    createdAt: today,
  },
  {
    user: { id: 'ritika', name: 'Ritika', avatar: '', hasProfilePhoto: false, college: 'NIT Trichy', branch: 'EEE', verified: true },
    sharedTerms: ['Design', 'Content'],
    relevantCommunities: [],
    joined: [],
    year: '2nd Year',
    createdAt: today,
  },
];

function getInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'N';
}

function CurrentCard({ candidate }: { candidate: Candidate }) {
  const { user, sharedTerms, relevantCommunities, joined, year, createdAt } = candidate;
  const sharedLabel = sharedTerms.length > 0
    ? `${sharedTerms.length} shared ${sharedTerms.length === 1 ? 'interest' : 'interests'}`
    : relevantCommunities.length > 0
      ? relevantCommunities.map((community) => community.displayName || community.name).join(' · ')
      : 'Same student network';
  const days = Math.max(0, Math.floor((today - createdAt) / (24 * 60 * 60 * 1000)));
  const joinedLabel = days === 0 ? 'Joined today' : days === 1 ? 'Joined yesterday' : `Joined ${days} days ago`;

  return (
    <article className="min-w-[270px] max-w-[320px] shrink-0 snap-start overflow-hidden rounded-2xl border border-amber-100 bg-white">
      <button type="button" className="flex w-full items-start gap-3 p-3 text-left">
        {user.avatar && user.hasProfilePhoto ? (
          <span className="relative h-11 w-11 shrink-0">
            <img src={user.avatar} alt="" className="h-11 w-11 rounded-2xl object-cover ring-1 ring-slate-100" />
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-white">
              <Camera className="h-2.5 w-2.5" />
            </span>
          </span>
        ) : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-sm font-black text-indigo-700">
            {getInitials(user.name)}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-xs font-black text-slate-900">{user.name}</span>
            {user.verified && <UserCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}
          </span>
          <span className="mt-0.5 block truncate text-[10px] font-medium text-slate-500">
            {user.college || 'The Network'}{user.branch ? ` · ${user.branch}` : ''}
          </span>
          <span className="mt-1.5 inline-flex max-w-full truncate rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700">
            {year}
          </span>
        </span>
      </button>
      <div className="flex items-center justify-between gap-2 border-t border-amber-50 bg-amber-50/30 px-3 py-2.5">
        <span className="min-w-0 truncate text-[10px] font-semibold text-slate-500">
          {joinedLabel} · {sharedLabel}
        </span>
        <button type="button" className="shrink-0 rounded-xl bg-amber-500 px-3 py-1.5 text-[10px] font-black text-white">
          Connect
        </button>
      </div>
    </article>
  );
}

export function Current() {
  return (
    <main className="min-h-screen bg-slate-50 p-5 sm:p-8">
      <section className="mx-auto max-w-6xl rounded-3xl border border-amber-100 bg-gradient-to-br from-white via-white to-orange-50/70 p-4 shadow-[0_8px_30px_rgba(245,158,11,0.07)] sm:p-5">
        <header className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">Just joined</p>
              <h1 className="mt-0.5 text-sm font-black text-slate-900">New on The Network</h1>
              <p className="mt-0.5 text-[11px] text-slate-500">Meet newer students with profile photos, from your year and nearby communities.</p>
            </div>
          </div>
          <button type="button" className="shrink-0 text-[11px] font-bold text-amber-700">Meet more</button>
        </header>
        <div className="no-scrollbar mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1">
          {students.map((candidate) => <CurrentCard key={candidate.user.id} candidate={candidate} />)}
        </div>
      </section>
    </main>
  );
}
