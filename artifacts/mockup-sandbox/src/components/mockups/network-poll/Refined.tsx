import React, { useState } from 'react';
import { BarChart3, Check } from 'lucide-react';
import './_group.css';

interface PostPollData {
  question: string;
  options: Array<{ id: string; text: string; votes: number }>;
  totalVotes: number;
  userVotedOptionId?: string;
}

const startingPoll: PostPollData = {
  question: 'When do your half-yearly exams start?',
  options: [
    { id: 'over', text: 'Already over', votes: 0 },
    { id: 'soon', text: 'Starting soon', votes: 0 },
    { id: 'month', text: 'Later this month', votes: 0 },
    { id: 'other', text: 'Other dates', votes: 0 },
  ],
  totalVotes: 0,
};

export function Refined() {
  const [pollData, setPollData] = useState(startingPoll);
  const [votingOptionId, setVotingOptionId] = useState<string | null>(null);
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
        const nextOption = current.options[optionIndex];
        const previousOptionId = current.userVotedOptionId;
        if (!nextOption || previousOptionId === nextOption.id) return current;

        return {
          ...current,
          totalVotes: current.totalVotes + (previousOptionId ? 0 : 1),
          userVotedOptionId: nextOption.id,
          options: current.options.map((option) => ({
            ...option,
            votes: option.votes + (option.id === nextOption.id ? 1 : 0) - (option.id === previousOptionId ? 1 : 0),
          })),
        };
      });
    } finally {
      setVotingOptionId(null);
    }
  };

  return (
    <main className="network-poll-preview flex min-h-screen items-center justify-center bg-[#f8f6f1] p-5 sm:p-8">
      <article className="w-full max-w-[760px] rounded-2xl border border-[#e5e2da] bg-[#fffefb] p-5 shadow-[0_8px_28px_rgba(43,55,43,0.06)] sm:p-6">
        <h2 className="text-base font-extrabold tracking-[-0.025em] text-[#283b32] sm:text-lg">
          Class 10th Squad — how’s the preparation going?
        </h2>
        <p className="mb-4 mt-2 text-sm leading-6 text-slate-600">
          When do your half-yearly exams start? Let’s compare everyone’s schedule.
        </p>

        <section
          aria-label="Poll"
          className="rounded-[20px] border border-[#d6e1d4] bg-[#eaf0e7] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] sm:p-4"
        >
          <div className="mb-3 flex items-center justify-between gap-3 px-0.5">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-xl border border-[#d9e4d7] bg-white/80 text-[#547363] shadow-sm">
                <BarChart3 aria-hidden="true" className="h-4 w-4" />
              </span>
              <span className="text-sm font-extrabold tracking-[-0.015em] text-[#365545]">
                Poll
              </span>
            </div>
            <span className="rounded-full border border-[#d8e3d6] bg-white/70 px-2.5 py-1 text-[11px] font-bold tabular-nums text-[#617b6c]">
              {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
            </span>
          </div>

          <div className="space-y-2.5">
            {pollData.options.map((option) => {
              const percentage = totalVotes > 0
                ? Math.round((option.votes / totalVotes) * 100)
                : 0;
              const isSelected = pollData.userVotedOptionId === option.id;
              const isVoting = votingOptionId === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={votingOptionId !== null}
                  onClick={() => void handleVote(option.id)}
                  aria-pressed={isSelected}
                  aria-label={`Vote for ${option.text}; ${percentage}% of votes`}
                  className={`group relative min-h-11 w-full overflow-hidden rounded-[15px] border bg-white/90 px-3.5 py-2.5 text-left shadow-[0_1px_2px_rgba(34,54,42,0.04)] transition duration-200 hover:-translate-y-px hover:border-[#9cb7a2] hover:bg-white hover:shadow-[0_5px_12px_rgba(39,71,51,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#648b73] focus-visible:ring-offset-2 focus-visible:ring-offset-[#eaf0e7] motion-reduce:transition-none ${
                    isSelected
                      ? 'border-[#8eae96] text-[#2f4d3c]'
                      : 'border-[#d9e3d7] text-[#34463c]'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute inset-y-0 left-0 rounded-r-full transition-[width] duration-500 ease-out motion-reduce:transition-none ${
                      isSelected ? 'bg-[#d4e4d3]' : 'bg-[#e6eee3]'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                  <span className="relative flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2.5">
                      {isSelected ? (
                        <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-[#5b8069] text-white shadow-sm">
                          <Check aria-hidden="true" className="h-3 w-3" strokeWidth={3} />
                        </span>
                      ) : (
                        <span aria-hidden="true" className="h-[18px] w-[18px] shrink-0 rounded-full border border-[#bdcdbd] bg-white/70 transition-colors group-hover:border-[#799882]" />
                      )}
                      <span className="truncate text-[13px] font-bold sm:text-sm">{option.text}</span>
                    </span>
                    <span className="shrink-0 text-xs font-extrabold tabular-nums text-[#587361]">
                      {isVoting ? 'Saving…' : `${percentage}%`}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <p aria-live="polite" className="mt-3 px-0.5 text-[11px] font-semibold text-[#678171]">
            {pollData.userVotedOptionId ? 'You can change your vote.' : 'Choose one option to vote.'}
          </p>
        </section>
      </article>
    </main>
  );
}
