import './_group.css';
import { useRef } from 'react';
import { ArrowLeft, ArrowRight, GraduationCap, UserCheck } from 'lucide-react';

type Student = {
  id: string;
  name: string;
  college: string;
  branch: string;
  year: string;
  interests: string[];
  verified: boolean;
  initials: string;
  tone: string;
  joined: string;
};

const students: Student[] = [
  { id: 'ajith', name: 'Ajith', college: 'KRCE Trichy', branch: 'CSE', year: '1st Year', interests: ['Web Dev', 'DSA'], verified: true, initials: 'A', tone: 'from-indigo-500 via-violet-500 to-sky-400', joined: 'Joined today' },
  { id: 'danya-sri', name: 'Danya Sri', college: 'K. Ramakrishnan College', branch: 'CSE', year: '1st Year', interests: ['AI/ML', 'Python'], verified: true, initials: 'DS', tone: 'from-fuchsia-400 via-violet-500 to-indigo-500', joined: 'Joined today' },
  { id: 'sri-lakshmi', name: 'Sri Lakshmi', college: 'K. Ramakrishnan College', branch: 'ECE', year: '1st Year', interests: ['Electronics', 'Robotics'], verified: true, initials: 'SL', tone: 'from-sky-400 via-blue-500 to-indigo-500', joined: 'Joined today' },
  { id: 'ritika', name: 'Ritika', college: 'NIT Trichy', branch: 'EEE', year: '2nd Year', interests: ['Design', 'Content'], verified: true, initials: 'R', tone: 'from-rose-400 via-fuchsia-500 to-violet-500', joined: 'Joined yesterday' },
  { id: 'varun', name: 'Varun', college: 'VIT', branch: 'CSE', year: '1st Year', interests: ['Web Dev', 'Gaming'], verified: false, initials: 'V', tone: 'from-amber-400 via-orange-500 to-rose-500', joined: 'Joined today' },
];

function StudentCard({ student }: { student: Student }) {
  return (
    <article className="group flex h-[168px] w-[320px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_4px_18px_rgba(36,31,79,0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(36,31,79,0.12)] lg:h-[294px] lg:w-[190px]">
      <button type="button" className="flex min-h-0 flex-1 items-center gap-3 p-3.5 text-left lg:hidden">
        <span className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${student.tone} text-lg font-black text-white shadow-inner`}>
          {student.initials}
          <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1">
            <span className="truncate text-sm font-extrabold text-slate-900">{student.name}</span>
            {student.verified && <UserCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}
          </span>
          <span className="mt-0.5 block truncate text-[11px] font-medium text-slate-500">{student.college} · {student.branch}</span>
          <span className="mt-2 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">{student.year}</span>
          <span className="ml-1.5 text-[10px] font-semibold text-amber-700">New</span>
        </span>
      </button>

      <button type="button" className={`relative hidden h-[108px] w-full items-center justify-center overflow-hidden bg-gradient-to-br ${student.tone} lg:flex`}>
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_24%_20%,rgba(255,255,255,0.35),transparent_36%),linear-gradient(180deg,transparent_48%,rgba(24,22,52,0.38))]" />
        <span className="relative flex h-[72px] w-[72px] items-center justify-center rounded-full border border-white/70 bg-white/20 text-2xl font-black text-white shadow-lg backdrop-blur-sm">
          {student.initials}
        </span>
        <span className="absolute left-2.5 top-2.5 rounded-full bg-white/90 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-emerald-700 shadow-sm">
          New
        </span>
      </button>

      <div className="hidden min-h-0 flex-1 flex-col px-3 pb-2.5 pt-2.5 lg:flex">
        <div className="flex items-center gap-1">
          <span className="truncate text-xs font-extrabold text-slate-900">{student.name}</span>
          {student.verified && <UserCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}
        </div>
        <p className="mt-0.5 truncate text-[10px] font-medium text-slate-500">{student.college} · {student.branch}</p>
        <span className="mt-1.5 w-fit rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700">{student.year}</span>
        <div className="mt-2 flex flex-wrap gap-1">
          {student.interests.slice(0, 2).map((interest, index) => (
            <span key={interest} className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${index === 0 ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {interest}
            </span>
          ))}
        </div>
      </div>

      <footer className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-3 py-2.5">
        <span className="min-w-0 truncate text-[10px] font-semibold text-slate-500">
          <span className="lg:hidden">{student.joined} · {student.interests[0]}</span>
          <span className="hidden lg:inline">{student.joined}</span>
        </span>
        <button type="button" className="shrink-0 rounded-xl bg-indigo-600 px-3 py-1.5 text-[10px] font-extrabold text-white shadow-sm transition-colors hover:bg-indigo-700">
          Connect
        </button>
      </footer>
    </article>
  );
}

export function Redesigned() {
  const railRef = useRef<HTMLDivElement>(null);

  return (
    <main className="min-h-screen bg-[#f8f8fc] p-5 sm:p-8">
      <section className="mx-auto max-w-6xl rounded-[28px] border border-amber-100 bg-gradient-to-br from-white via-white to-amber-50/60 p-4 shadow-[0_10px_32px_rgba(73,58,140,0.08)] sm:p-5">
        <header className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">Just joined</p>
              <h1 className="mt-0.5 text-sm font-black text-slate-900 sm:text-base">New on The Network</h1>
              <p className="mt-0.5 text-[11px] leading-4 text-slate-500">Meet students from your year and nearby communities.</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-1 sm:flex">
              <button type="button" aria-label="Previous students" onClick={() => railRef.current?.scrollBy({ left: -420, behavior: 'smooth' })} className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-200 hover:text-indigo-700">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button type="button" aria-label="Next students" onClick={() => railRef.current?.scrollBy({ left: 420, behavior: 'smooth' })} className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-200 hover:text-indigo-700">
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <button type="button" className="shrink-0 text-[11px] font-extrabold text-amber-700">Meet more</button>
          </div>
        </header>
        <div ref={railRef} className="no-scrollbar mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1">
          {students.map((student) => <StudentCard key={student.id} student={student} />)}
        </div>
        <div className="mt-3 flex items-center justify-center gap-1.5" aria-hidden="true">
          <span className="h-1.5 w-5 rounded-full bg-indigo-600" />
          <span className="h-1.5 w-3 rounded-full bg-slate-200" />
          <span className="h-1.5 w-3 rounded-full bg-slate-200" />
          <span className="h-1.5 w-3 rounded-full bg-slate-200" />
        </div>
      </section>
    </main>
  );
}
