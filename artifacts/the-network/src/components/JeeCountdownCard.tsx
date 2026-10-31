import React, { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';

const TARGET_TIME = Date.parse('2027-01-21T09:00:00+05:30');

interface JeeCountdownCardProps {
  darkMode: boolean;
}

function getRemaining() {
  return Math.max(0, TARGET_TIME - Date.now());
}

function splitRemaining(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function twoDigits(value: number) {
  return value.toString().padStart(2, '0');
}

export default function JeeCountdownCard({ darkMode }: JeeCountdownCardProps) {
  const [remaining, setRemaining] = useState(getRemaining);
  const countdown = splitRemaining(remaining);
  const isComplete = remaining <= 0;

  useEffect(() => {
    const update = () => setRemaining(getRemaining());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section
      aria-label="JEE Mains 2027 Session 1 countdown"
      className={`relative overflow-hidden rounded-2xl border px-4 py-5 sm:px-8 sm:py-7 ${
        darkMode
          ? 'border-emerald-400/20 bg-[#0d111c]'
          : 'border-emerald-500/20 bg-[#0d111c]'
      }`}
    >
      <div className="pointer-events-none absolute -left-16 -bottom-20 h-44 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-3 text-base font-black tracking-tight text-emerald-300 sm:text-lg">
            <span className="h-7 w-1.5 rounded-full bg-gradient-to-b from-emerald-300 to-emerald-500" />
            JEE Mains 2027 Session 1
          </h3>
          <span className="h-3.5 w-3.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.9)]" />
        </div>

        <div className="mt-6 grid grid-cols-4 gap-2 sm:mx-auto sm:max-w-[560px] sm:gap-4">
          {[
            { label: 'DAYS', value: countdown.days.toString() },
            { label: 'HOURS', value: twoDigits(countdown.hours) },
            { label: 'MIN', value: twoDigits(countdown.minutes) },
            { label: 'SEC', value: twoDigits(countdown.seconds) },
          ].map(item => (
            <div key={item.label} className="text-center">
              <div className="flex h-[66px] items-center justify-center rounded-2xl border border-emerald-300/15 bg-[#111624]/90 px-1 shadow-inner shadow-emerald-400/[0.03] sm:h-[82px]">
                <span className="font-mono text-2xl font-medium tracking-tight text-emerald-300 sm:text-4xl">
                  {item.value}
                </span>
              </div>
              <span className="mt-2 block text-[8px] font-bold tracking-[0.18em] text-slate-400 sm:text-[10px]">
                {item.label}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-300">
          <CalendarDays size={15} className="text-slate-400" />
          <span>
            {isComplete
              ? 'JEE Mains 2027 Session 1 target time has arrived'
              : 'January 21, 2027 · 9:00 AM IST'}
          </span>
        </div>
        <p className="mt-2 text-center text-[10px] text-slate-500">
          {isComplete ? 'Keep going and give your best.' : 'Expected exam target · Every second counts.'}
        </p>
      </div>
    </section>
  );
}