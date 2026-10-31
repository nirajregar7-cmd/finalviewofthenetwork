import React, { useState } from 'react';
import { BarChart3, Check } from 'lucide-react';

type PollPalette = 'sage' | 'violet';

interface PollData {
  options: Array<{
    id: string;
    text: string;
    votes: number;
    voters?: Array<{ id: string; name: string }>;
  }>;
  totalVotes: number;
  userVotedOptionId?: string;
}

const startingPoll: PollData = {
  options: [
    {
      id: 'over',
      text: 'Already over',
      votes: 4,
      voters: [
        { id: 'student-1', name: 'Student One' },
        { id: 'student-2', name: 'Student Two' },
        { id: 'student-3', name: 'Student Three' },
      ],
    },
    {
      id: 'soon',
      text: 'Starting soon',
      votes: 2,
      voters: [
        { id: 'student-4', name: 'Student Four' },
        { id: 'student-5', name: 'Student Five' },
      ],
    },
    {
      id: 'month',
      text: 'Later this month',
      votes: 1,
      voters: [{ id: 'student-6', name: 'Student Six' }],
    },
    {
      id: 'other',
      text: 'Other dates',
      votes: 1,
      voters: [{ id: 'student-7', name: 'Student Seven' }],
    },
  ],
  totalVotes: 8,
  userVotedOptionId: 'over',
};

const palettes = {
  sage: {
    panel: 'border-[#d6e1d4] bg-[#eaf0e7]',
    icon: 'border-[#d9e4d7] text-[#547363]',
    title: 'text-[#365545]',
    count: 'border-[#d8e3d6] text-[#617b6c]',
    selected: 'border-[#8eae96] text-[#2f4d3c]',
    option: 'border-[#d9e3d7] text-[#34463c]',
    focus: 'focus-visible:ring-[#648b73]',
    selectedFill: 'bg-[#d4e4d3]',
    optionFill: 'bg-[#e6eee3]',
    check: 'bg-[#5b8069]',
    radio: 'border-[#bdcdbd] group-hover:border-[#799882]',
    percent: 'text-[#587361]',
    voterRow: 'border-[#e5ebe3] text-[#607366]',
    voterLabel: 'text-[#547363]',
    initials: 'bg-[#d9e5d7] text-[#45604e]',
    more: 'text-[#3f7050]',
    hint: 'text-[#678171]',
  },
  violet: {
    panel: 'border-[#d3c2f0] bg-[#eee5fb]',
    icon: 'border-[#d8caf3] text-[#6847b8]',
    title: 'text-[#3e286e]',
    count: 'border-[#d5c4f0] bg-[#e4d8fa] text-[#583394]',
    selected: 'border-[#926cdb] bg-[#faf7ff] text-[#3e286e]',
    option: 'border-[#dfd6ed] bg-white/95 text-[#3d3947]',
    focus: 'focus-visible:ring-[#6540bc]',
    selectedFill: 'bg-[#cbb6f1]',
    optionFill: 'bg-[#ece4f7]',
    check: 'bg-[#6540bc]',
    radio: 'border-[#bba8da] group-hover:border-[#8664c5]',
    percent: 'text-[#57368f]',
    voterRow: 'border-[#e5dcf0] text-[#625978]',
    voterLabel: 'text-[#5d408f]',
    initials: 'bg-[#e2d5f5] text-[#573d88]',
    more: 'text-[#5d408f]',
    hint: 'text-[#65508a]',
  },
} satisfies Record<string, Record<string, string>>;

function PollCard({ palette }: { palette: PollPalette }) {
  const [pollData, setPollData] = useState(startingPoll);
  const [votingOptionId, setVotingOptionId] = useState<string | null>(null);
  const [expandedVoterOptions, setExpandedVoterOptions] = useState<Set<string>>(() => new Set());
  const colors = palettes[palette];
  const totalVotes = Math.max(
    pollData.totalVotes,
    pollData.options.reduce((total, option) => total + option.votes, 0),
  );

  const handleVote = async (optionId: string) => {
    if (votingOptionId !== null) return;
    const optionIndex = pollData.options.findIndex((option) => option.id === optionId);
    if (optionIndex < 0) return;

    setVotingOptionId(optionId);
    try {
      setPollData((current) => {
        const selectedOption = current.options[optionIndex];
        const previousOptionId = current.userVotedOptionId;
        if (!selectedOption || previousOptionId === selectedOption.id) return current;

        return {
          ...current,
          totalVotes: current.totalVotes + (previousOptionId ? 0 : 1),
          userVotedOptionId: selectedOption.id,
          options: current.options.map((option) => ({
            ...option,
            votes: option.votes
              + (option.id === selectedOption.id ? 1 : 0)
              - (option.id === previousOptionId ? 1 : 0),
          })),
        };
      });
    } finally {
      setVotingOptionId(null);
    }
  };

  return (
    <section
      aria-label="Poll"
      className={`rounded-[20px] border p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] sm:p-4 ${colors.panel}`}
    >
      <div className="mb-3 flex items-center justify-between gap-3 px-0.5">
        <div className="flex items-center gap-2.5">
            <span className={`grid h-8 w-8 place-items-center rounded-xl border bg-white/85 shadow-sm ${colors.icon}`}>
            <BarChart3 aria-hidden="true" className="h-4 w-4" />
          </span>
          <span className={`text-sm font-extrabold tracking-[-0.015em] ${colors.title}`}>Poll</span>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold tabular-nums ${colors.count}`}>
          {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
        </span>
      </div>

      <div role="group" aria-label="Poll options" className="space-y-2.5">
        {pollData.options.map((option) => {
          const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
          const voters = option.voters || [];
          const votersExpanded = expandedVoterOptions.has(option.id);
          const visibleVoters = votersExpanded ? voters : voters.slice(0, 3);
          const isSelected = pollData.userVotedOptionId === option.id;
          const isVoting = votingOptionId === option.id;

          return (
            <div
              key={option.id}
              className={`overflow-hidden rounded-[15px] border shadow-[0_1px_2px_rgba(34,54,42,0.04)] ${
                isSelected ? colors.selected : colors.option
              }`}
            >
              <button
                type="button"
                disabled={votingOptionId !== null}
                onClick={() => void handleVote(option.id)}
                aria-pressed={isSelected}
                aria-label={`Vote for ${option.text}; ${percentage}% of votes from ${voters.length} voters`}
                className={`group relative flex min-h-11 w-full items-center justify-between gap-3 overflow-hidden bg-transparent px-3.5 py-2.5 text-left transition duration-200 hover:bg-white focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset ${colors.focus} motion-reduce:transition-none disabled:cursor-wait`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute inset-y-0 left-0 rounded-r-full transition-[width] duration-500 ease-out motion-reduce:transition-none ${
                    isSelected ? colors.selectedFill : colors.optionFill
                  }`}
                  style={{ width: `${percentage}%` }}
                />
                <span className="relative flex min-w-0 items-center gap-2.5">
                  {isSelected ? (
                    <span className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full text-white shadow-sm ${colors.check}`}>
                      <Check aria-hidden="true" className="h-3 w-3" strokeWidth={3} />
                    </span>
                  ) : (
                    <span
                      aria-hidden="true"
                      className={`h-[18px] w-[18px] shrink-0 rounded-full border bg-white/70 transition-colors ${colors.radio}`}
                    />
                  )}
                  <span className="truncate text-[13px] font-bold sm:text-sm">{option.text}</span>
                </span>
                <span className={`relative flex shrink-0 items-center gap-1.5 text-xs font-extrabold tabular-nums ${colors.percent}`}>
                  {isVoting && <span className="text-[10px] font-semibold">Saving…</span>}
                  {`${percentage}%`}
                </span>
              </button>

              {voters.length > 0 && (
                <div className={`relative flex flex-wrap items-center gap-x-2 gap-y-1 border-t bg-white/65 px-3.5 py-2 text-[10px] ${colors.voterRow}`}>
                  <span className={`font-bold ${colors.voterLabel}`}>Voted by</span>
                  {visibleVoters.map((voter) => (
                    <span key={voter.id} className="inline-flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className={`grid h-5 w-5 place-items-center rounded-full text-[8px] font-bold ${colors.initials}`}
                      >
                        {voter.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                      <span>{voter.name}</span>
                    </span>
                  ))}
                  {voters.length > 3 && (
                    <button
                      type="button"
                      aria-expanded={votersExpanded}
                      onClick={() => {
                        setExpandedVoterOptions((previous) => {
                          const next = new Set(previous);
                          if (next.has(option.id)) next.delete(option.id);
                          else next.add(option.id);
                          return next;
                        });
                      }}
                      className={`font-bold underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 ${colors.focus} ${colors.more}`}
                    >
                      {votersExpanded ? 'Show fewer' : `+${voters.length - 3} more`}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p aria-live="polite" className={`mt-3 px-0.5 text-[11px] font-semibold ${colors.hint}`}>
        {pollData.userVotedOptionId ? 'You can change your vote.' : 'Choose one option to vote.'}
      </p>
    </section>
  );
}

export function PollPreview({ palette }: { palette: PollPalette }) {
  return (
    <main className="network-poll-color-preview flex min-h-screen items-center justify-center bg-[#faf7f2] p-5 sm:p-8">
      <article className="w-full max-w-[760px] rounded-2xl border border-[#e5e2da] bg-[#fffefb] p-4 shadow-[0_8px_28px_rgba(43,55,43,0.06)] sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-full bg-[#f2efff] px-2.5 py-1 text-[10px] font-bold text-[#6546b7]">#question</span>
          <span className="text-xs font-semibold text-slate-500">How are your semester exams going?</span>
        </div>
        <PollCard palette={palette} />
      </article>
    </main>
  );
}
