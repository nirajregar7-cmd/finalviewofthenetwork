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
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-base font-black text-white shadow-sm">
      {partner.initials}
    </span>
  );
}

function PartnerCard({ partner }: { partner: Partner }) {
  return (
    <article className="group flex h-[136px] w-[320px] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_4px_18px_rgba(36,31,79,0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(36,31,79,0.12)]">
      <button
        type="button"
        className="flex min-h-0 flex-1 w-full items-center gap-3 p-3.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
      >
        <PhotoAvatar partner={partner} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-extrabold text-slate-900">{partner.name}</span>
            {partner.verified && <UserCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}
          </span>
          <span className="mt-0.5 block truncate text-[10px] font-medium text-slate-500">{partner.college} · {partner.branch}</span>
          <span className="mt-1.5 block truncate text-[10px] font-extrabold text-amber-700">{partner.education}</span>
        </span>
      </button>
      <footer className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-3.5 py-2.5">
        <span className="min-w-0 truncate text-[10px] font-semibold text-slate-500">{partner.skills}</span>
        <button type="button" className="shrink-0 rounded-xl bg-amber-500 px-3.5 py-1.5 text-[10px] font-extrabold text-white shadow-sm transition-colors hover:bg-amber-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
          View profile
        </button>
      </footer>
    </article>
  );
}

export function Redesigned() {
  return (
    <main className="min-h-screen bg-[#f8f8fc] p-5 sm:p-8">
      <section className="mx-auto max-w-6xl rounded-[28px] border border-amber-100 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/50 p-4 shadow-[0_10px_32px_rgba(73,58,140,0.08)] sm:p-5">
        <header className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <BookOpen className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">Looking for study</p>
              <h1 className="mt-0.5 text-sm font-black text-slate-900 sm:text-base">Find a study partner</h1>
              <p className="mt-0.5 text-[11px] text-slate-500">Students who are ready to learn together.</p>
            </div>
          </div>
          <button type="button" className="shrink-0 text-[11px] font-extrabold text-amber-700">Meet more</button>
        </header>
        <div className="no-scrollbar mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1">
          {partners.map((partner) => <PartnerCard key={partner.id} partner={partner} />)}
        </div>
      </section>
    </main>
  );
}
