import React, { useState } from 'react';
import { BarChart3, Check } from 'lucide-react';
import { SafeAvatar } from './SafeAvatar';

export interface PostPollData {
  question: string;
  options: Array<{
    id: string;
    text: string;
    votes: number;
    voters?: Array<{ id: string; name: string; avatar?: string }>;
  }>;
  totalVotes: number;
  userVotedOptionId?: string;
}

interface PostPollProps {
  postId: string;
  pollData: PostPollData;
  onVote?: (postId: string, optionIndex: number) => Promise<void> | void;
}

export const PostPoll: React.FC<PostPollProps> = ({ postId, pollData, onVote }) => {
  const [votingOptionId, setVotingOptionId] = useState<string | null>(null);
  const [optimisticOptionId, setOptimisticOptionId] = useState<string | null>(null);
  const [expandedVoterOptions, setExpandedVoterOptions] = useState<Set<string>>(() => new Set());
  const totalVotes = Math.max(
    pollData.totalVotes,
    pollData.options.reduce((total, option) => total + option.votes, 0),
  );

  const handleVote = async (optionId: string) => {
    if (!onVote || votingOptionId !== null) return;
    const optionIndex = pollData.options.findIndex((option) => option.id === optionId);
    if (optionIndex < 0) return;

    setVotingOptionId(optionId);
    setOptimisticOptionId(optionId);
    try {
      // Give the selected state one frame to paint before the persistence
      // callback can trigger more expensive feed updates.
      await new Promise<void>((resolve) => {
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve());
        else resolve();
      });
      await onVote(postId, optionIndex);
    } finally {
      setVotingOptionId(null);
      setOptimisticOptionId(null);
    }
  };

  return (
    <section
      aria-labelledby={`poll-title-${postId}`}
      className="rounded-[20px] border border-[#d3c2f0] bg-[#eee5fb] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] sm:p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-3 px-0.5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-xl border border-[#d8caf3] bg-white/85 text-[#6847b8] shadow-sm">
            <BarChart3 aria-hidden="true" className="h-4 w-4" />
          </span>
          <span id={`poll-title-${postId}`} className="text-sm font-extrabold tracking-[-0.015em] text-[#3e286e]">
          Poll
          </span>
        </div>
        <span className="rounded-full border border-[#d5c4f0] bg-[#e4d8fa] px-2.5 py-1 text-[11px] font-bold tabular-nums text-[#583394]">
          {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
        </span>
      </div>
      <div role="group" aria-label="Poll options" className="space-y-2.5">
        {pollData.options.map((option) => {
          const percentage = totalVotes > 0
            ? Math.round((option.votes / totalVotes) * 100)
            : 0;
          const voters = option.voters || [];
          const votersExpanded = expandedVoterOptions.has(option.id);
          const visibleVoters = votersExpanded ? voters : voters.slice(0, 3);
          const isSelected = (optimisticOptionId ?? pollData.userVotedOptionId) === option.id;
          const isVoting = votingOptionId === option.id;

          return (
            <div
              key={option.id}
              className={`overflow-hidden rounded-[15px] border shadow-[0_1px_2px_rgba(54,35,90,0.06)] ${
                isSelected
                  ? 'border-[#926cdb] bg-[#faf7ff] text-[#3e286e]'
                  : 'border-[#dfd6ed] bg-white/95 text-[#3d3947]'
              }`}
            >
              <button
                type="button"
                disabled={!onVote || votingOptionId !== null}
                onClick={() => void handleVote(option.id)}
                aria-pressed={isSelected}
                aria-label={`Vote for ${option.text}; ${percentage}% of votes from ${voters.length} voter${voters.length === 1 ? '' : 's'}`}
                className={`group relative flex min-h-11 w-full items-center justify-between gap-3 overflow-hidden bg-transparent px-3.5 py-2.5 text-left transition duration-200 hover:bg-white focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7452c7] motion-reduce:transition-none ${
                  !onVote ? 'cursor-default' : 'cursor-pointer'
                } disabled:cursor-wait`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute inset-y-0 left-0 rounded-r-full transition-[width] duration-500 ease-out motion-reduce:transition-none ${
                    isSelected ? 'bg-[#cbb6f1]' : 'bg-[#ece4f7]'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
                <span className="relative flex min-w-0 items-center gap-2.5">
                  {isSelected ? (
                    <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-[#6540bc] text-white shadow-sm">
                      <Check aria-hidden="true" className="h-3 w-3" strokeWidth={3} />
                    </span>
                  ) : (
                    <span
                      aria-hidden="true"
                      className="h-[18px] w-[18px] shrink-0 rounded-full border border-[#bba8da] bg-white/80 transition-colors group-hover:border-[#8664c5]"
                    />
                  )}
                  <span className="truncate text-[13px] font-bold sm:text-sm">{option.text}</span>
                </span>
                <span className="relative flex shrink-0 items-center gap-1.5 text-xs font-extrabold tabular-nums text-[#57368f]">
                  {isVoting && <span className="text-[10px] font-semibold">Saving…</span>}
                  {`${percentage}%`}
                </span>
              </button>
              {voters.length > 0 && (
                <div className="relative flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-[#e5dcf0] bg-white/75 px-3.5 py-2 text-[10px] text-[#625978]">
                  <span className="font-bold text-[#5d408f]">Voted by</span>
                  {visibleVoters.map((voter) => (
                    <span key={voter.id} className="inline-flex items-center gap-1.5">
                      <SafeAvatar
                        src={voter.avatar}
                        name={voter.name}
                        className="h-5 w-5 rounded-full object-cover ring-1 ring-white"
                      />
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
                      className="font-bold text-[#5d408f] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6540bc]"
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
      <p aria-live="polite" className="mt-3 px-0.5 text-[11px] font-semibold text-[#65508a]">
        {(optimisticOptionId ?? pollData.userVotedOptionId) ? 'You can change your vote.' : 'Choose one option to vote.'}
      </p>
    </section>
  );
};