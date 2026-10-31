import React, { useEffect, useState, useCallback } from 'react';
import {
  Users, Activity, Clock, TrendingUp, Eye, Calendar,
  RefreshCw, BarChart2, Wifi, WifiOff, UserPlus, Zap
} from 'lucide-react';
import { api } from '../api';
import Avatar from './Avatar';

interface Props { darkMode: boolean; }
type Period = 'today' | 'week' | 'alltime';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Get YYYY-MM-DD date string in IST (UTC+5:30). */
function toISTDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(date);
}

function fmtSeconds(s: number): string {
  if (!s || s <= 0) return '—';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function fmtTimeAgo(iso: string): string {
  if (!iso) return '—';
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function fmtHour(h: number): string {
  if (h === 0) return '12am';
  if (h < 12) return `${h}am`;
  if (h === 12) return '12pm';
  return `${h - 12}pm`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color, darkMode }: {
  icon: React.FC<{ size?: number; className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  darkMode: boolean;
}) {
  const card = darkMode ? 'bg-[#121217] border-white/10' : 'bg-white border-neutral-200';
  return (
    <div className={`p-4 rounded-2xl border ${card} flex flex-col gap-2`}>
      <Icon size={14} className={color} />
      <p className="text-2xl font-black leading-none">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 dark:text-slate-500">{sub}</p>}
    </div>
  );
}

interface BarItem { [key: string]: number | string | boolean }

function BarChart({ data, keyY, keyLabel, color, darkMode, height = 80 }: {
  data: BarItem[];
  keyY: string;
  keyLabel: string;
  color: string;
  darkMode: boolean;
  height?: number;
}) {
  const values = data.map(d => Number(d[keyY] ?? 0));
  const max = Math.max(...values, 1);
  const muted = darkMode ? 'text-slate-500' : 'text-slate-400';
  return (
    <div style={{ height }} className="flex items-end gap-1">
      {data.map((d, i) => {
        const val = Number(d[keyY] ?? 0);
        const pct = Math.max(3, (val / max) * 100);
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5 group relative h-full">
            <div className={`w-full rounded-t-md ${color} transition-all`} style={{ height: `${pct}%` }} />
            <div className={`absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-10 ${darkMode ? 'bg-white/10 text-white backdrop-blur-sm' : 'bg-slate-800 text-white'}`}>
              {String(d[keyLabel])}: {val}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminAnalytics({ darkMode }: Props) {
  const [period, setPeriod] = useState<Period>('today');
  const [overview, setOverview] = useState<Record<string, unknown> | null>(null);
  const [hourly, setHourly] = useState<{ hour: number; visitors: number; sessions: number; total_seconds: number }[]>([]);
  const [weekly, setWeekly] = useState<{
    days: { day: string; visitors: number; sessions: number; total_seconds: number }[];
    newUsersPerDay: { day: string; new_users: number }[];
    liveUsers: { user_id: string; full_name: string; college: string; avatar: string; started_at: string; last_heartbeat: string }[];
  } | null>(null);
  const [dailyActive, setDailyActive] = useState<{ day: string; dau: number; sessions: number }[]>([]);
  const [sessions, setSessions] = useState<{
    id: string; user_id: string; full_name: string; college: string; avatar: string;
    started_at: string; ended_at: string | null; last_heartbeat: string;
    duration_seconds: number; page: string;
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, hr, wk, da, sess] = await Promise.all([
        api.analytics.overview(),
        api.analytics.hourlyToday(),
        api.analytics.weeklyStats(),
        api.analytics.dailyActive(),
        api.analytics.sessions(300),
      ]);
      setOverview(ov && typeof ov === 'object' ? ov : null);
      setHourly(Array.isArray(hr) ? hr : []);
      setWeekly(wk && typeof wk === 'object' && !Array.isArray(wk) ? wk : null);
      setDailyActive(Array.isArray(da) ? da : []);
      setSessions(Array.isArray(sess) ? sess : []);
      setLastRefresh(new Date());
    } catch (e) {
      console.error('Analytics load failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  // Auto-refresh every 30s
  useEffect(() => {
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  // ─── Derived data ───────────────────────────────────────────────────────────

  // 24-hour grid for today (IST hours from SQL)
  const hourlyGrid = Array.from({ length: 24 }, (_, h) => {
    const row = hourly.find(r => Number(r.hour) === h);
    return { hour: h, label: fmtHour(h), visitors: row?.visitors ?? 0, sessions: row?.sessions ?? 0, total_seconds: row?.total_seconds ?? 0 };
  });

  // 30-day grid using IST date keys to match SQL grouping
  const allTimeGrid = Array.from({ length: 30 }, (_, offset) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - offset));
    const key = toISTDateKey(d);
    const row = dailyActive.find(r => toISTDateKey(new Date(r.day)) === key);
    return { label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), key, dau: row?.dau ?? 0, sessions: row?.sessions ?? 0 };
  });

  // 7-day grid using IST date keys
  const weekGrid = Array.from({ length: 7 }, (_, offset) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - offset));
    const key = toISTDateKey(d);
    const row = weekly?.days?.find(r => toISTDateKey(new Date(r.day)) === key);
    const nu = weekly?.newUsersPerDay?.find(r => toISTDateKey(new Date(r.day)) === key);
    const isToday = offset === 6;
    return {
      label: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
      key, isToday,
      visitors: row?.visitors ?? 0,
      sessions: row?.sessions ?? 0,
      total_seconds: row?.total_seconds ?? 0,
      new_users: nu?.new_users ?? 0,
    };
  });

  // Today sessions: filter using IST day boundary (same as SQL)
  const todayISTKey = toISTDateKey(new Date());
  const todaySessions = sessions.filter(s => toISTDateKey(new Date(s.started_at)) === todayISTKey);

  // Live users: no ended_at AND heartbeat within last 2 minutes
  const twoMinAgo = Date.now() - 2 * 60_000;
  const liveUsers = sessions.filter(s => !s.ended_at && new Date(s.last_heartbeat).getTime() >= twoMinAgo);

  // ─── Layout helpers ─────────────────────────────────────────────────────────
  const card = darkMode ? 'bg-[#121217] border-white/10' : 'bg-white border-neutral-200';
  const muted = darkMode ? 'text-slate-400' : 'text-slate-500';
  const subcard = darkMode ? 'bg-white/[0.03] border-white/5' : 'bg-neutral-50 border-neutral-100';

  const ov = overview ?? {};
  const n = (key: string) => Number((ov as Record<string, unknown>)[key] ?? 0);

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center py-24 gap-3">
        <RefreshCw size={18} className="animate-spin opacity-40" />
        <span className={`text-sm ${muted}`}>Loading analytics…</span>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <BarChart2 size={15} className="text-indigo-500" /> Admin Analytics
          </h3>
          <p className={`text-[11px] mt-0.5 ${muted}`}>
            Auto-refreshes every 30s · Last updated {fmtTimeAgo(lastRefresh.toISOString())}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${darkMode ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-neutral-200 text-slate-600 hover:bg-neutral-50'}`}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Period Tabs */}
      <div className={`flex gap-1 p-1 rounded-2xl border ${card}`}>
        {(['today', 'week', 'alltime'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              period === p
                ? 'bg-indigo-600 text-white shadow-sm'
                : `${muted} hover:text-slate-800 dark:hover:text-slate-200`
            }`}
          >
            {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'All Time'}
          </button>
        ))}
      </div>

      {/* ─── TODAY ──────────────────────────────────────────────────────── */}
      {period === 'today' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard icon={Zap} label="Live Right Now" value={liveUsers.length}
              sub="active in last 2 min" color="text-emerald-500" darkMode={darkMode} />
            <StatCard icon={Eye} label="Visitors Today" value={n('activeToday')}
              sub="unique users (IST)" color="text-indigo-500" darkMode={darkMode} />
            <StatCard icon={Activity} label="Sessions Today" value={n('sessionsToday')}
              sub="total app opens" color="text-sky-500" darkMode={darkMode} />
            <StatCard icon={Clock} label="Time Spent Today" value={fmtSeconds(n('timeTodaySeconds'))}
              sub="total across all users" color="text-amber-500" darkMode={darkMode} />
            <StatCard icon={UserPlus} label="New Signups Today" value={n('newToday')}
              sub="registered today (IST)" color="text-violet-500" darkMode={darkMode} />
            <StatCard icon={Clock} label="Avg Session" value={fmtSeconds(n('avgSessionSeconds'))}
              sub="all-time average" color="text-rose-500" darkMode={darkMode} />
          </div>

          {/* Hourly bar chart */}
          <div className={`rounded-2xl border ${card} p-4`}>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <TrendingUp size={13} className="text-indigo-500" /> Visitors by Hour (Today · IST)
            </h4>
            <BarChart data={hourlyGrid} keyY="visitors" keyLabel="label"
              color="bg-indigo-500/80 hover:bg-indigo-500" darkMode={darkMode} height={100} />
            <div className="flex gap-1 mt-1.5">
              {hourlyGrid.map((d, i) => (
                <div key={i} className={`flex-1 text-center text-[7px] ${muted} overflow-hidden`}>
                  {i % 3 === 0 ? d.label : ''}
                </div>
              ))}
            </div>
          </div>

          {/* Live Users */}
          <div className={`rounded-2xl border ${card} p-4`}>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
              <Wifi size={13} className="text-emerald-500" />
              Online Now
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black">
                {liveUsers.length}
              </span>
            </h4>
            {liveUsers.length === 0 ? (
              <p className={`text-xs text-center py-6 ${muted}`}>No one is online right now.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {liveUsers.slice(0, 20).map(s => (
                  <div key={s.id} className={`flex items-center gap-2.5 p-2.5 rounded-xl border ${subcard}`}>
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                      <Avatar avatar={s.avatar} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{s.full_name}</p>
                      <p className={`text-[10px] truncate ${muted}`}>{s.college}</p>
                    </div>
                    <span className="text-[10px] text-emerald-500 font-bold whitespace-nowrap">● LIVE</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's Session Feed */}
          <div className={`rounded-2xl border ${card} p-4`}>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
              <Activity size={13} className="text-sky-500" /> Today's Sessions ({todaySessions.length})
            </h4>
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {todaySessions.length === 0 ? (
                <p className={`text-xs text-center py-6 ${muted}`}>No sessions recorded today yet.</p>
              ) : todaySessions.slice(0, 60).map(s => (
                <div key={s.id} className={`flex items-center gap-3 p-2.5 rounded-xl border ${subcard}`}>
                  <div className="w-7 h-7 rounded-full overflow-hidden shrink-0">
                    <Avatar avatar={s.avatar} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{s.full_name}</p>
                    <p className={`text-[10px] ${muted}`}>{fmtTimeAgo(s.started_at)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold">{fmtSeconds(s.duration_seconds)}</p>
                    {!s.ended_at
                      ? <span className="text-[10px] text-emerald-500 font-bold">● LIVE</span>
                      : <span className={`text-[10px] ${muted}`}>ended</span>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ─── THIS WEEK ──────────────────────────────────────────────────── */}
      {period === 'week' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard icon={Users} label="Visitors This Week" value={n('activeWeek')}
              sub="unique users" color="text-indigo-500" darkMode={darkMode} />
            <StatCard icon={Activity} label="Sessions This Week" value={n('sessionsWeek')}
              sub="total app opens" color="text-sky-500" darkMode={darkMode} />
            <StatCard icon={UserPlus} label="New Signups" value={n('newWeek')}
              sub="this week" color="text-violet-500" darkMode={darkMode} />
            <StatCard icon={Clock} label="Total Time Spent"
              value={fmtSeconds(weekGrid.reduce((acc, d) => acc + d.total_seconds, 0))}
              sub="this week" color="text-amber-500" darkMode={darkMode} />
            <StatCard icon={Eye} label="Avg Daily Visitors"
              value={Math.round(n('activeWeek') / 7)}
              sub="per day this week" color="text-emerald-500" darkMode={darkMode} />
            <StatCard icon={TrendingUp} label="Peak Day"
              value={Math.max(...weekGrid.map(d => d.visitors), 0)}
              sub="max visitors in a day" color="text-rose-500" darkMode={darkMode} />
          </div>

          {/* Weekly bar chart */}
          <div className={`rounded-2xl border ${card} p-4`}>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <TrendingUp size={13} className="text-indigo-500" /> Daily Visitors — Last 7 Days (IST)
            </h4>
            <BarChart data={weekGrid} keyY="visitors" keyLabel="label"
              color="bg-indigo-500/80 hover:bg-indigo-500" darkMode={darkMode} height={100} />
            <div className="flex gap-1 mt-1.5">
              {weekGrid.map((d, i) => (
                <div key={i} className={`flex-1 text-center text-[9px] ${d.isToday ? 'text-indigo-500 font-bold' : muted}`}>
                  {d.label.split(' ')[0]}
                </div>
              ))}
            </div>
          </div>

          {/* Day-by-day table */}
          <div className={`rounded-2xl border ${card} p-4`}>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
              <Calendar size={13} className="text-sky-500" /> Day-by-Day Breakdown
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[400px]">
                <thead>
                  <tr className={`border-b ${darkMode ? 'border-white/10' : 'border-neutral-100'}`}>
                    {['Day', 'Visitors', 'Sessions', 'Time Spent', 'New Users'].map(h => (
                      <th key={h} className={`pb-2 pr-4 text-[10px] font-bold uppercase tracking-wider ${muted}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weekGrid.map(d => (
                    <tr key={d.key} className={`border-b last:border-0 ${darkMode ? 'border-white/5' : 'border-neutral-50'} ${d.isToday ? 'font-bold' : ''}`}>
                      <td className="py-2.5 pr-4">
                        <span className={d.isToday ? 'text-indigo-500' : ''}>{d.label}</span>
                        {d.isToday && <span className="ml-1.5 text-[9px] bg-indigo-500/10 text-indigo-500 px-1.5 py-0.5 rounded-full font-bold">TODAY</span>}
                      </td>
                      <td className="py-2.5 pr-4">{d.visitors}</td>
                      <td className="py-2.5 pr-4">{d.sessions}</td>
                      <td className="py-2.5 pr-4 text-amber-500">{fmtSeconds(d.total_seconds)}</td>
                      <td className="py-2.5 pr-4 text-violet-500">+{d.new_users}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top users this week */}
          {Array.isArray((ov as Record<string, unknown>).topUsersWeek) && ((ov as Record<string, unknown>).topUsersWeek as unknown[]).length > 0 && (
            <div className={`rounded-2xl border ${card} p-4`}>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                <Clock size={13} className="text-amber-500" /> Most Active This Week
              </h4>
              <div className="space-y-2">
                {((ov as Record<string, unknown>).topUsersWeek as {
                  user_id: string; full_name: string; college: string; avatar: string;
                  session_count: number; total_seconds: number;
                }[]).map((u, i) => (
                  <div key={u.user_id} className={`flex items-center gap-3 p-2.5 rounded-xl border ${subcard}`}>
                    <span className={`text-[10px] font-black w-5 text-right ${muted}`}>#{i + 1}</span>
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                      <Avatar avatar={u.avatar} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{u.full_name}</p>
                      <p className={`text-[10px] truncate ${muted}`}>{u.college}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-amber-500">{fmtSeconds(u.total_seconds)}</p>
                      <p className={`text-[10px] ${muted}`}>{u.session_count} sessions</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Currently online from weekly-stats live users */}
          <div className={`rounded-2xl border ${card} p-4`}>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
              <Wifi size={13} className="text-emerald-500" /> Currently Online
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black">
                {liveUsers.length}
              </span>
            </h4>
            {liveUsers.length === 0 ? (
              <p className={`text-xs text-center py-6 ${muted}`}>No one is online right now.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {liveUsers.slice(0, 20).map(u => (
                  <div key={u.id} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border ${subcard} text-xs`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span className="font-semibold">{u.full_name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── ALL TIME ──────────────────────────────────────────────────── */}
      {period === 'alltime' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard icon={Users} label="Total Users" value={n('totalUsers')}
              sub="ever registered" color="text-indigo-500" darkMode={darkMode} />
            <StatCard icon={Activity} label="Total Sessions" value={n('totalSessions')}
              sub="all time" color="text-sky-500" darkMode={darkMode} />
            <StatCard icon={Clock} label="Avg Session" value={fmtSeconds(n('avgSessionSeconds'))}
              sub="across all sessions" color="text-amber-500" darkMode={darkMode} />
            <StatCard icon={Eye} label="Total Posts" value={n('totalPosts')}
              sub="ever created" color="text-violet-500" darkMode={darkMode} />
            <StatCard icon={TrendingUp} label="Connections" value={n('totalConnections')}
              sub="accepted" color="text-emerald-500" darkMode={darkMode} />
            <StatCard icon={Calendar} label="Peak Daily Users"
              value={Math.max(...allTimeGrid.map(d => d.dau), 0)}
              sub="in last 30 days" color="text-rose-500" darkMode={darkMode} />
          </div>

          {/* 30-day chart */}
          <div className={`rounded-2xl border ${card} p-4`}>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <TrendingUp size={13} className="text-indigo-500" /> Daily Active Users — Last 30 Days (IST)
            </h4>
            <BarChart data={allTimeGrid} keyY="dau" keyLabel="label"
              color="bg-indigo-500/80 hover:bg-indigo-500" darkMode={darkMode} height={100} />
            <div className="flex gap-0.5 mt-1.5">
              {allTimeGrid.map((d, i) => (
                <div key={i} className={`flex-1 text-center text-[7px] ${muted} overflow-hidden`}>
                  {i % 5 === 0 ? d.label.split(' ')[0] : ''}
                </div>
              ))}
            </div>
          </div>

          {/* Top users all time */}
          {Array.isArray((ov as Record<string, unknown>).topUsers) && ((ov as Record<string, unknown>).topUsers as unknown[]).length > 0 && (
            <div className={`rounded-2xl border ${card} p-4`}>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                <Clock size={13} className="text-amber-500" /> Top Users by Time Spent (All Time)
              </h4>
              <div className="space-y-2">
                {((ov as Record<string, unknown>).topUsers as {
                  user_id: string; full_name: string; college: string; avatar: string;
                  session_count: number; total_seconds: number;
                }[]).map((u, i, arr) => {
                  const pct = arr[0].total_seconds > 0
                    ? Math.round((u.total_seconds / arr[0].total_seconds) * 100) : 0;
                  return (
                    <div key={u.user_id} className={`p-3 rounded-xl border ${subcard}`}>
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`text-[10px] font-black w-5 text-right ${muted}`}>#{i + 1}</span>
                        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                          <Avatar avatar={u.avatar} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">{u.full_name}</p>
                          <p className={`text-[10px] truncate ${muted}`}>{u.college}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-amber-500">{fmtSeconds(u.total_seconds)}</p>
                          <p className={`text-[10px] ${muted}`}>{u.session_count} sessions</p>
                        </div>
                      </div>
                      <div className={`h-1.5 rounded-full ${darkMode ? 'bg-white/5' : 'bg-neutral-200'}`}>
                        <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* All Visitors Table */}
          <div className={`rounded-2xl border ${card} p-4`}>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
              <Eye size={13} className="text-violet-500" /> All Visitors
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[560px]">
                <thead>
                  <tr className={`border-b ${darkMode ? 'border-white/10' : 'border-neutral-100'}`}>
                    {['User', 'College', 'Last Seen', 'Sessions', 'Total Time', 'Status'].map(h => (
                      <th key={h} className={`pb-2 pr-4 text-[10px] font-bold uppercase tracking-wider ${muted}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    interface UserRow {
                      info: typeof sessions[number];
                      sessCount: number;
                      totalSec: number;
                      lastSeen: string;
                      live: boolean;
                    }
                    const userMap: Record<string, UserRow> = {};
                    sessions.forEach(s => {
                      if (!userMap[s.user_id]) {
                        userMap[s.user_id] = { info: s, sessCount: 0, totalSec: 0, lastSeen: s.started_at, live: false };
                      }
                      userMap[s.user_id].sessCount++;
                      userMap[s.user_id].totalSec += s.duration_seconds ?? 0;
                      if (new Date(s.started_at) > new Date(userMap[s.user_id].lastSeen)) {
                        userMap[s.user_id].lastSeen = s.started_at;
                      }
                      // Mark live only if heartbeat is recent
                      if (!s.ended_at && new Date(s.last_heartbeat).getTime() >= twoMinAgo) {
                        userMap[s.user_id].live = true;
                      }
                    });
                    const rows = Object.values(userMap).sort(
                      (a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
                    );
                    if (rows.length === 0) return (
                      <tr>
                        <td colSpan={6} className={`py-8 text-center text-xs ${muted}`}>
                          No sessions recorded yet.
                        </td>
                      </tr>
                    );
                    return rows.map(({ info, sessCount, totalSec, lastSeen, live }) => (
                      <tr key={info.user_id} className={`border-b last:border-0 ${darkMode ? 'border-white/5' : 'border-neutral-50'}`}>
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full overflow-hidden shrink-0">
                              <Avatar avatar={info.avatar} />
                            </div>
                            <span className="font-semibold truncate max-w-[120px]">{info.full_name}</span>
                          </div>
                        </td>
                        <td className={`py-2.5 pr-4 truncate max-w-[120px] ${muted}`}>{info.college}</td>
                        <td className={`py-2.5 pr-4 ${muted}`}>{fmtTimeAgo(lastSeen)}</td>
                        <td className="py-2.5 pr-4 font-semibold">{sessCount}</td>
                        <td className="py-2.5 pr-4 font-bold text-amber-500">{fmtSeconds(totalSec)}</td>
                        <td className="py-2.5">
                          {live
                            ? <span className="flex items-center gap-1 text-emerald-500 font-bold text-[10px]"><Wifi size={10} /> Online</span>
                            : <span className={`flex items-center gap-1 text-[10px] ${muted}`}><WifiOff size={10} /> Offline</span>
                          }
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
