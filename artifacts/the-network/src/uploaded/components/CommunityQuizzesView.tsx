import { useMemo, useState } from 'react';
import { ArrowRight, Brain, Search, Users } from 'lucide-react';
import type { Community, User } from '../types';

interface CommunityQuizzesViewProps {
  communities: Community[];
  currentUser: User;
  onOpenCommunity: (community: Community, openQuiz: boolean) => void;
}

export function CommunityQuizzesView({
  communities,
  currentUser,
  onOpenCommunity,
}: CommunityQuizzesViewProps) {
  const [query, setQuery] = useState('');
  const quizCommunities = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return communities
      .filter((community) =>
        !normalizedQuery ||
        `${community.name} ${community.displayName} ${community.description} ${community.slug}`
          .toLowerCase()
          .includes(normalizedQuery),
      )
      .sort((a, b) => {
        const aJoined = a.isJoined || currentUser.communities.includes(a.slug);
        const bJoined = b.isJoined || currentUser.communities.includes(b.slug);
        return Number(bJoined) - Number(aJoined) || b.membersCount - a.membersCount;
      });
  }, [communities, currentUser.communities, query]);

  return (
    <section className="mx-auto w-full max-w-5xl space-y-5 px-4 py-6 sm:px-6" aria-labelledby="community-quizzes-title">
      <header className="rounded-3xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 p-6 text-white shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
            <Brain className="h-7 w-7" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-100">Learn by taking a challenge</p>
            <h1 id="community-quizzes-title" className="mt-1 text-2xl font-black sm:text-3xl">Daily community quizzes</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">
              Choose a learning community to try its daily quiz. Your joined communities appear first.
            </p>
          </div>
        </div>
      </header>

      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
        <Search className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
        <span className="sr-only">Search communities for quizzes</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search quizzes or communities..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
      </label>

      {quizCommunities.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {quizCommunities.map((community) => {
            const isJoined = community.isJoined || currentUser.communities.includes(community.slug);
            return (
              <article key={community.id} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Brain className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-bold text-slate-900">{community.displayName || community.name}</h2>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    {community.membersCount.toLocaleString()} members
                    {isJoined && <span className="font-semibold text-emerald-700">· Joined</span>}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenCommunity(community, isJoined)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                >
                  {isJoined ? 'Open quiz' : 'Explore'}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No learning communities match that search. Try another name or topic.
        </p>
      )}
    </section>
  );
}
