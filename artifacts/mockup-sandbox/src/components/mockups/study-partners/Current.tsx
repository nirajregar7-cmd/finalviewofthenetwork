import { useState } from 'react';
import { BookOpen, UserCheck } from 'lucide-react';
import './_group.css';

type Partner = {
  id: string;
  name: string;
  initials: string;
  avatar?: string;
  college: string;
  branch: string;
  education: string;
  skills: string;
  verified?: boolean;
};

const partners: Partner[] = [
  {
    id: 'finn',
    name: 'Finn',
    initials: 'F',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7222f2d?w=160&auto=format&fit=crop&q=80',
    college: 'GGSIPU',
    branch: 'CSE',
    education: '1st Year · BTech / BE CSE · Study Partner',
    skills: 'Shared learning goals',
    verified: true,
  },
  {
    id: 'priyanshu',
    name: 'Priyanshu Mahajan',
    initials: 'PM',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&auto=format&fit=crop&q=80',
    college: 'NIT Tiruchirappalli',
    branch: 'Software Development',
    education: '3rd Year · BTech / BE Software Development · Study Partner',
    skills: 'React · C++',
    verified: true,
  },
  {
    id: 'harshan',
    name: 'Harshan H',
    initials: 'HH',
    college: 'NIT Tiruchirappalli',
    branch: 'Other',
    education: '1st Year · BTech / BE · Study Partner',
    skills: 'Shared learning goals',
    verified: true,
  },
];

function PhotoAvatar({ partner }: { partner: Partner }) {
  const [failed, setFailed] = useState(false);
  return partner.avatar && !failed ? (
    <img
      src={partner.avatar}
      alt={partner.name}
      onError={() => setFailed(true)}
      className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm"
    />
  ) : (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-base font-black text-white">
      {partner.initials}
    </span>
  );
}

function PartnerCard({ partner }: { partner: Partner }) {
  return (
    <article className="flex min-w-[275px] max-w-[360px] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-[0_3px_12px_rgba(15,23,42,0.04)] sm:min-w-[300px]">
      <button type="button" className="flex w-full items-center gap-3 p-3.5 text-left">
        <PhotoAvatar partner={partner} />
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-xs font-black text-slate-900">{partner.name}</span>
            {partner.verified && <UserCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
          </span>
          <span className="mt-0.5 block truncate text-[10px] text-slate-500">{partner.college} · {partner.branch}</span>
          <span className="mt-1 block truncate text-[10px] font-bold text-amber-700">{partner.education}</span>
        </span>
      </button>
      <div className="flex items-center justify-between gap-2 border-t border-amber-50 px-3.5 py-2.5">
        <span className="min-w-0 truncate text-[10px] text-slate-500">{partner.skills}</span>
        <button type="button" className="shrink-0 rounded-xl bg-amber-500 px-3.5 py-1.5 text-[10px] font-black text-white">
          View profile
        </button>
      </div>
    </article>
  );
}

export function Current() {
  return (
    <main className="min-h-screen bg-slate-50 p-5 sm:p-8">
      <section className="mx-auto max-w-6xl rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/50 p-4 shadow-[0_8px_30px_rgba(245,158,11,0.08)] sm:p-5">
        <header className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <BookOpen className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">Looking for study</p>
              <h1 className="mt-0.5 text-sm font-black text-slate-900">Find a study partner</h1>
              <p className="mt-0.5 text-[11px] text-slate-500">Students who are ready to learn together.</p>
            </div>
          </div>
          <button type="button" className="shrink-0 text-[11px] font-black text-amber-700">Meet more</button>
        </header>
        <div className="no-scrollbar mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1">
          {partners.map((partner) => <PartnerCard key={partner.id} partner={partner} />)}
        </div>
      </section>
    </main>
  );
}
