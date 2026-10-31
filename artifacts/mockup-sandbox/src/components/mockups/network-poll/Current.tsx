import React, { useState } from 'react';
import { BarChart3, Check } from 'lucide-react';
import './_group.css';

interface PostPollData {
  question: string;
  options: Array<{ id: string; text: string; votes: number }>;
  totalVotes: number;
  userVotedOptionId?: string;
}

interface PostPollProps {
  postId: string;
  pollData: PostPollData;
  onVote?: (postId: string, optionIndex: number) => Promise<void> | void;
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

const ExistingPostPoll: React.FC<PostPollProps> = ({ postId, pollData, onVote }) => {
  const [votingOptionId, setVotingOptionId] = useState<string | null>(null);
  const totalVotes = Math.max(
    pollData.totalVotes,
    pollData.options.reduce((total, option) => total + option.votes, 0),
  );

  const handleVote = async (optionId: string) => {
    if (!onVote || votingOptionId !== null) return;
    const optionIndex = pollData.options.findIndex((option) => option.id === optionId);
    if (optionIndex < 0) return;

    setVotingOptionId(optionId);
    try {
      await onVote(postId, optionIndex);
    } finally {
      setVotingOptionId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-black text-indigo-900">
          <BarChart3 className="h-4 w-4 text-indigo-600" />
          Poll
        </div>
        <span className="text-[10px] font-bold text-indigo-600">
          {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
        </span>
      </div>
      <div className="space-y-2">
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
              disabled={!onVote || votingOptionId !== null}
              onClick={() => void handleVote(option.id)}
              className={`relative w-full overflow-hidden rounded-xl border px-3 py-2 text-left transition ${
                isSelected
                  ? 'border-indigo-400 bg-white text-indigo-900'
                  : 'border-indigo-100 bg-white/80 text-slate-700 hover:border-indigo-300 hover:bg-white'
              } ${!onVote ? 'cursor-default' : 'cursor-pointer'} disabled:cursor-wait`}
              aria-label={`Vote for ${option.text}`}
            >
              <span
                className={`absolute inset-y-0 left-0 transition-all ${isSelected ? 'bg-indigo-100' : 'bg-indigo-50'}`}
                style={{ width: `${percentage}%` }}
              />
              <span className="relative flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-indigo-600" />}
                  <span className="truncate text-xs font-bold">{option.text}</span>
                </span>
                <span className="shrink-0 text-[10px] font-black text-indigo-600">
                  {isVoting ? 'Saving…' : `${percentage}%`}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] font-medium text-indigo-700">
        {pollData.userVotedOptionId ? 'You can change your vote.' : 'Choose one option to vote.'}
      </p>
    </div>
  );
};

export function Current() {
  const [pollData, setPollData] = useState(startingPoll);

  const handleVote = async (_postId: string, optionIndex: number) => {
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
        <ExistingPostPoll postId="preview-post" pollData={pollData} onVote={handleVote} />
      </article>
    </main>
  );
}
