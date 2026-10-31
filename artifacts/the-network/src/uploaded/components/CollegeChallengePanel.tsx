import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  ExternalLink,
  Github,
  Loader2,
  Medal,
  Send,
  ThumbsUp,
  Trophy,
  Users,
} from 'lucide-react';
import { api } from '../../api';
import type { User } from '../types';
import { SafeAvatar } from './SafeAvatar';

type ChallengeSubmission = {
  id: string;
  title: string;
  summary: string;
  githubUrl: string;
  demoUrl: string;
  videoUrl: string;
  techStack: string[];
  communityVotes: number;
  readinessScore: number;
  score: number;
  hasVoted: boolean;
};

type ChallengeTeam = {
  id: string;
  name: string;
  college: string;
  captainId: string;
  memberIds: string[];
  members: Array<{ id: string; name: string; college: string; branch: string; avatar: string }>;
  submission: ChallengeSubmission | null;
};

type ChallengeSnapshot = {
  competition: {
    title: string;
    description: string;
    track: string;
    status: string;
    teamSize: number;
    registrationDeadline: string;
    buildStartsAt: string;
    submissionDeadline: string;
    judgingEndsAt: string;
  };
  teams: ChallengeTeam[];
  leaderboard: Array<ChallengeTeam & { rank: number }>;
  myTeamId: string | null;
};

interface CollegeChallengePanelProps {
  currentUser: User;
  users: User[];
  compact?: boolean;
  onOpenProfile: (user: User) => void;
}

const dateLabel = (value: string) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));

const normalizeCollege = (value: string | undefined) =>
  String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

export const CollegeChallengePanel: React.FC<CollegeChallengePanelProps> = ({
  currentUser,
  users,
  compact = false,
  onOpenProfile,
}) => {
  const [snapshot, setSnapshot] = useState<ChallengeSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [teamName, setTeamName] = useState('');
  const [selectedTeammateIds, setSelectedTeammateIds] = useState<string[]>([]);
  const [submission, setSubmission] = useState({
    title: '',
    summary: '',
    githubUrl: '',
    demoUrl: '',
    videoUrl: '',
    techStack: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const next = await api.collegeCompetition.get(currentUser.id) as ChallengeSnapshot;
      setSnapshot(next);
      const existing = next.teams.find((team) => team.id === next.myTeamId)?.submission;
      if (existing) {
        setSubmission({
          title: existing.title,
          summary: existing.summary,
          githubUrl: existing.githubUrl,
          demoUrl: existing.demoUrl,
          videoUrl: existing.videoUrl,
          techStack: existing.techStack.join(', '),
        });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'The challenge could not be loaded.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [currentUser.id]);

  const myTeam = snapshot?.teams.find((team) => team.id === snapshot.myTeamId) || null;
  const collegeMembers = useMemo(() => {
    const college = normalizeCollege(currentUser.college);
    return users
      .filter((user) =>
        user.id !== currentUser.id &&
        user.role !== 'admin' &&
        normalizeCollege(user.college) === college,
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users, currentUser.college, currentUser.id]);

  const toggleTeammate = (id: string) => {
    setSelectedTeammateIds((previous) =>
      previous.includes(id)
        ? previous.filter((memberId) => memberId !== id)
        : previous.length < 2 ? [...previous, id] : previous,
    );
  };

  const createTeam = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setBusy(true);
    try {
      const result = await api.collegeCompetition.createTeam({
        userId: currentUser.id,
        name: teamName,
        memberIds: [currentUser.id, ...selectedTeammateIds],
      }) as { snapshot: ChallengeSnapshot };
      setSnapshot(result.snapshot);
      setTeamName('');
      setSelectedTeammateIds([]);
      setMessage({ type: 'success', text: 'Your three-student team is registered.' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Team registration failed.' });
    } finally {
      setBusy(false);
    }
  };

  const saveSubmission = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!myTeam) return;
    setMessage(null);
    setBusy(true);
    try {
      const result = await api.collegeCompetition.saveSubmission({
        userId: currentUser.id,
        teamId: myTeam.id,
        title: submission.title,
        summary: submission.summary,
        githubUrl: submission.githubUrl,
        demoUrl: submission.demoUrl,
        videoUrl: submission.videoUrl,
        techStack: submission.techStack.split(',').map((value) => value.trim()).filter(Boolean),
      }) as { snapshot: ChallengeSnapshot };
      setSnapshot(result.snapshot);
      setMessage({ type: 'success', text: 'Project submission saved. You can keep improving it until the deadline.' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Project submission failed.' });
    } finally {
      setBusy(false);
    }
  };

  const vote = async (submissionId: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const next = await api.collegeCompetition.vote(submissionId, currentUser.id) as ChallengeSnapshot;
      setSnapshot(next);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'That vote could not be recorded.' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-[1.45rem] border border-slate-200 bg-white p-8 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#4c58b8]" />
        <p className="mt-3 text-xs font-bold text-slate-500">Loading The Network challenge…</p>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="rounded-[1.45rem] border border-dashed border-[#e4b4aa] bg-[#fff8f6] p-8 text-center">
        <p className="text-sm font-black text-slate-800">Challenge unavailable</p>
        <p className="mt-1 text-xs text-slate-500">Refresh this section to try again.</p>
        <button type="button" onClick={() => void load()} className="mt-4 rounded-xl bg-[#4c58b8] px-4 py-2 text-xs font-black text-white">Retry</button>
      </div>
    );
  }

  const challenge = snapshot.competition;
  const panelClass = compact
    ? 'rounded-[1.45rem] border border-[#d9dcfa] bg-[#f6f7ff] p-4'
    : 'space-y-5';

  return (
    <div className={panelClass}>
      {!compact && (
        <section className="relative overflow-hidden rounded-[1.45rem] bg-[#263269] p-5 text-white shadow-[0_14px_35px_rgba(38,50,105,0.18)] sm:p-7">
          <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full border border-white/10" />
          <div className="absolute -bottom-24 left-1/3 h-48 w-48 rounded-full border border-[#f18a69]/20" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2 text-[#ffd5bd]">
              <Trophy className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.18em]">The Network official challenge</span>
            </div>
            <h1 className="mt-3 max-w-3xl text-2xl font-black tracking-tight sm:text-3xl">{challenge.title}</h1>
            <p className="mt-3 max-w-2xl text-xs leading-5 text-indigo-100">{challenge.description}</p>
            <div className="mt-5 grid gap-2 text-[10px] font-bold sm:grid-cols-4">
              {[
                ['Register by', challenge.registrationDeadline],
                ['Build starts', challenge.buildStartsAt],
                ['Submit by', challenge.submissionDeadline],
                ['Results by', challenge.judgingEndsAt],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-white/10 bg-white/10 p-3">
                  <p className="uppercase tracking-wider text-indigo-200">{label}</p>
                  <p className="mt-1 text-xs font-black text-white">{dateLabel(value)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {message && (
        <div className={`rounded-xl border px-3 py-2.5 text-xs font-bold ${
          message.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-[#e4b4aa] bg-[#fff8f6] text-[#b34f3d]'
        }`}>
          {message.text}
        </div>
      )}

      {!myTeam ? (
        <section className="rounded-[1.45rem] border border-[#f2dfc3] bg-[#fffaf1] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#b4772b]">Step 1 · represent your college</p>
              <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900">Create a team of three</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">All three members must be active students from the same college so the college leaderboard stays fair.</p>
            </div>
            <Users className="h-6 w-6 shrink-0 text-[#c99432]" />
          </div>
          <form onSubmit={createTeam} className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Team name</span>
              <input value={teamName} onChange={(event) => setTeamName(event.target.value)} required maxLength={80} placeholder="e.g. Graph Gurus" className="w-full rounded-xl border border-[#eadfcf] bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#c99432]" />
            </label>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Choose two teammates</span>
                <span className="text-[10px] font-black text-[#b4772b]">{selectedTeammateIds.length}/2 selected</span>
              </div>
              {collegeMembers.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[#ebc98f] bg-white p-3 text-xs text-slate-500">No eligible students from {currentUser.college || 'your college'} are available yet.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {collegeMembers.map((user) => {
                    const selected = selectedTeammateIds.includes(user.id);
                    return (
                      <button key={user.id} type="button" onClick={() => toggleTeammate(user.id)} className={`flex items-center gap-2 rounded-xl border p-2.5 text-left transition-colors ${selected ? 'border-[#c99432] bg-[#fff3dc]' : 'border-[#eadfcf] bg-white hover:border-[#ebc98f]'}`}>
                        <SafeAvatar src={user.avatar} name={user.name} className="h-8 w-8 rounded-full object-cover" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[11px] font-black text-slate-800">{user.name}</span>
                          <span className="block truncate text-[10px] text-slate-500">{user.branch || 'Student'}</span>
                        </span>
                        {selected && <Check className="h-4 w-4 shrink-0 text-[#b4772b]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <button type="submit" disabled={busy || selectedTeammateIds.length !== 2 || !currentUser.college} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#c99432] py-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
              Register team
            </button>
          </form>
        </section>
      ) : (
        <section className="rounded-[1.45rem] border border-[#d9dcfa] bg-white p-5 shadow-[0_8px_30px_rgba(47,53,94,0.05)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5e6dcc]">Your registered team</p>
              <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900">{myTeam.name}</h2>
              <p className="mt-1 text-[11px] font-bold text-slate-500">{myTeam.college}</p>
            </div>
            <span className="rounded-full bg-[#eef0ff] px-2.5 py-1 text-[10px] font-black text-[#4c58b8]">3 / 3 members</span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {myTeam.members.map((member) => (
              <button key={member.id} type="button" onClick={() => { const user = users.find((item) => item.id === member.id); if (user) onOpenProfile(user); }} className="flex items-center gap-2 rounded-xl bg-slate-50 p-2 text-left">
                <SafeAvatar src={member.avatar} name={member.name} className="h-8 w-8 rounded-full object-cover" />
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-black text-slate-800">{member.name}</span>
                  <span className="block truncate text-[10px] text-slate-500">{member.id === myTeam.captainId ? 'Captain' : member.branch || 'Student'}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {myTeam && (
        <section className="rounded-[1.45rem] border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5e6dcc]">Step 2 · ship the project</p>
              <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900">{myTeam.submission ? 'Improve your submission' : 'Submit your project'}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">Describe the problem, show the build, and make the DSA choices easy to understand.</p>
            </div>
            <Send className="h-5 w-5 text-[#5e6dcc]" />
          </div>
          <form onSubmit={saveSubmission} className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Project title</span>
              <input value={submission.title} onChange={(event) => setSubmission({ ...submission, title: event.target.value })} required maxLength={120} placeholder="e.g. CampusRoute" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold outline-none focus:border-[#8991db]" />
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">What did you build?</span>
              <textarea value={submission.summary} onChange={(event) => setSubmission({ ...submission, summary: event.target.value })} required minLength={80} maxLength={5000} rows={5} placeholder="Problem, users, approach, and where DSA made the product better…" className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold leading-5 outline-none focus:border-[#8991db]" />
            </label>
            <label>
              <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">GitHub link</span>
              <div className="flex items-center rounded-xl border border-slate-200 px-3 focus-within:border-[#8991db]"><Github className="mr-2 h-3.5 w-3.5 text-slate-400" /><input value={submission.githubUrl} onChange={(event) => setSubmission({ ...submission, githubUrl: event.target.value })} required type="url" placeholder="https://github.com/…" className="min-w-0 flex-1 py-2.5 text-xs font-semibold outline-none" /></div>
            </label>
            <label>
              <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Live demo link</span>
              <div className="flex items-center rounded-xl border border-slate-200 px-3 focus-within:border-[#8991db]"><ExternalLink className="mr-2 h-3.5 w-3.5 text-slate-400" /><input value={submission.demoUrl} onChange={(event) => setSubmission({ ...submission, demoUrl: event.target.value })} required type="url" placeholder="https://your-demo…" className="min-w-0 flex-1 py-2.5 text-xs font-semibold outline-none" /></div>
            </label>
            <label>
              <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Demo video (optional)</span>
              <input value={submission.videoUrl} onChange={(event) => setSubmission({ ...submission, videoUrl: event.target.value })} type="url" placeholder="https://youtube.com/…" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold outline-none focus:border-[#8991db]" />
            </label>
            <label>
              <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Tech stack</span>
              <input value={submission.techStack} onChange={(event) => setSubmission({ ...submission, techStack: event.target.value })} placeholder="React, PostgreSQL, Redis" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold outline-none focus:border-[#8991db]" />
            </label>
            <button type="submit" disabled={busy} className="sm:col-span-2 flex items-center justify-center gap-2 rounded-xl bg-[#4c58b8] py-3 text-xs font-black text-white disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {myTeam.submission ? 'Update submission' : 'Publish project submission'}
            </button>
          </form>
        </section>
      )}

      <section className="rounded-[1.45rem] border border-[#d9dcfa] bg-[#f6f7ff] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5e6dcc]">Step 3 · discover the field</p>
            <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900">Project leaderboard</h2>
            <p className="mt-1 text-[11px] leading-5 text-slate-500">Provisional score = submission readiness + five points per community vote. Final judge scores will be added by The Network.</p>
          </div>
          <Medal className="h-6 w-6 shrink-0 text-[#c99432]" />
        </div>
        {snapshot.leaderboard.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-[#cfd4ff] bg-white p-5 text-center">
            <Trophy className="mx-auto h-6 w-6 text-slate-300" />
            <p className="mt-2 text-xs font-black text-slate-700">The first project can take the top spot.</p>
            <p className="mt-1 text-[11px] text-slate-500">Registered teams will appear here after they publish a submission.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {snapshot.leaderboard.map((team) => (
              <div key={team.id} className="rounded-xl border border-[#e1e3f7] bg-white p-3">
                <div className="flex items-start gap-3">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black ${team.rank === 1 ? 'bg-[#fff0d4] text-[#b4772b]' : 'bg-slate-100 text-slate-500'}`}>#{team.rank}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="truncate text-xs font-black text-slate-900">{team.submission?.title}</p>
                      <span className="text-[10px] font-bold text-slate-400">· {team.name} · {team.college}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-500">{team.submission?.summary}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-400">
                      <span>{team.submission?.readinessScore}/60 ready</span>
                      <span>·</span>
                      <span>{team.submission?.communityVotes} votes</span>
                      {team.submission?.githubUrl && <a href={team.submission.githubUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#4c58b8] hover:underline"><Github className="h-3 w-3" /> Code</a>}
                      {team.submission?.demoUrl && <a href={team.submission.demoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#4c58b8] hover:underline"><ArrowRight className="h-3 w-3" /> Demo</a>}
                    </div>
                  </div>
                  <button type="button" disabled={busy || team.memberIds.includes(currentUser.id)} onClick={() => team.submission && void vote(team.submission.id)} className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-2 text-[10px] font-black ${team.submission?.hasVoted ? 'bg-[#eef0ff] text-[#4c58b8]' : 'bg-slate-100 text-slate-500 hover:bg-[#eef0ff] hover:text-[#4c58b8]'} disabled:cursor-not-allowed disabled:opacity-50`} title={team.memberIds.includes(currentUser.id) ? 'You cannot vote for your own team' : 'Vote for this project'}>
                    <ThumbsUp className="h-3 w-3" /> {team.submission?.hasVoted ? 'Voted' : 'Vote'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};