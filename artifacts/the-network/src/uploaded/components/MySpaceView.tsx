import React, { useMemo } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  CirclePlus,
  Compass,
  Crown,
  MessagesSquare,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type { ChatConversation, Community, User } from '../types';

interface MySpaceViewProps {
  communities: Community[];
  conversations: ChatConversation[];
  currentUser: User;
  onSelectCommunity: (slug: string) => void;
  onBrowseCommunities: () => void;
  onOpenGroup: (conversationId: string) => void;
  onCreateCommunity: () => void;
  onCreateGroup: () => void;
}

function isCommunityManager(community: Community, userId: string) {
  return Boolean(
    community.isAdmin ||
    community.creatorId === userId ||
    community.adminIds?.includes(userId),
  );
}

function shortCount(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return value.toLocaleString();
}

function activityLabel(timestamp?: string) {
  if (!timestamp) return 'No recent activity';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;

  const elapsed = Date.now() - date.getTime();
  if (elapsed < 60_000) return 'Just now';
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m ago`;
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h ago`;
  if (elapsed < 604_800_000) return `${Math.floor(elapsed / 86_400_000)}d ago`;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function SectionHeading({
  kicker,
  title,
  count,
  action,
  onAction,
}: {
  kicker: string;
  title: string;
  count: number;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.19em] text-indigo-600">{kicker}</p>
        <h2 className="font-display text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200/80">
          {count}
        </span>
        <button
          type="button"
          onClick={onAction}
          className="inline-flex min-h-9 items-center gap-1 rounded-xl px-2 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          {action}<ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export const MySpaceView: React.FC<MySpaceViewProps> = ({
  communities,
  conversations,
  currentUser,
  onSelectCommunity,
  onBrowseCommunities,
  onOpenGroup,
  onCreateCommunity,
  onCreateGroup,
}) => {
  const myCommunities = useMemo(
    () => communities.filter((community) =>
      community.isJoined ||
      community.memberIds?.includes(currentUser.id) ||
      isCommunityManager(community, currentUser.id),
    ),
    [communities, currentUser.id],
  );

  const studyGroups = useMemo(
    () => conversations.filter((conversation) =>
      conversation.type === 'study_group' &&
      !conversation.isInvitePending &&
      (conversation.creatorId === currentUser.id || conversation.memberIds?.includes(currentUser.id)),
    ),
    [conversations, currentUser.id],
  );

  const managedCount = myCommunities.filter((community) => isCommunityManager(community, currentUser.id)).length;
  const ownedGroupsCount = studyGroups.filter((conversation) => conversation.creatorId === currentUser.id).length;

  return (
    <section aria-label="My Space" className="mx-auto min-h-[100dvh] w-full max-w-6xl px-4 pb-24 pt-6 sm:px-7 sm:pt-9">
      <header className="relative mb-8 overflow-hidden rounded-[28px] border border-indigo-100 bg-[#eef0ff] px-5 py-6 sm:px-8 sm:py-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border-[34px] border-white/40" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-24 h-44 w-44 rounded-full bg-[#d9ddff]/70" />
        <div className="relative z-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-xl">
            <p className="mb-2 inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-indigo-700">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" /> Your corner of The Network
            </p>
            <h1 className="font-display text-3xl font-black leading-[1.05] tracking-tight text-slate-950 sm:text-[2.7rem]">
              My Space<span className="text-indigo-600">.</span>
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-600 sm:text-[15px]">
              The communities you learn in and the study groups you build, all in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onCreateCommunity}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/90 bg-white px-4 text-xs font-extrabold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <CirclePlus className="h-4 w-4 text-indigo-600" /> New community
            </button>
            <button
              type="button"
              onClick={onCreateGroup}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-700 px-4 text-xs font-extrabold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-800 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
            >
              <CirclePlus className="h-4 w-4" /> Start a study group
            </button>
          </div>
        </div>
        <div className="relative z-10 mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-indigo-200/70 pt-4 text-xs font-semibold text-slate-600">
          <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-indigo-600" /> {myCommunities.length} communities</span>
          <span className="inline-flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5 text-indigo-600" /> {studyGroups.length} study groups</span>
          {(managedCount + ownedGroupsCount) > 0 && (
            <span className="inline-flex items-center gap-1.5"><Crown className="h-3.5 w-3.5 text-amber-600" /> {managedCount + ownedGroupsCount} you manage</span>
          )}
        </div>
      </header>

      <div className="grid gap-9 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.8fr)] lg:gap-8">
        <section aria-labelledby="my-communities-title" className="min-w-0">
          <SectionHeading
            kicker="Your circles"
            title="Communities"
            count={myCommunities.length}
            action="Explore"
            onAction={onBrowseCommunities}
          />
          {myCommunities.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {myCommunities.map((community) => {
                const manages = isCommunityManager(community, currentUser.id);
                return (
                  <article
                    key={community.id}
                    className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-[#fffefa] p-4 shadow-[0_2px_12px_rgba(35,42,69,0.035)] transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_10px_28px_rgba(35,42,69,0.09)]"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] text-sm font-black ring-1 ring-black/5"
                        style={{ backgroundColor: community.iconBg || '#e7e9ff', color: community.iconColor || '#4c50a4' }}
                        aria-hidden="true"
                      >
                        {community.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <h3 className="truncate text-sm font-extrabold tracking-tight text-slate-900">
                          {community.displayName || community.name}
                        </h3>
                        <p className="mt-1 line-clamp-2 min-h-8 text-[11px] leading-relaxed text-slate-500">
                          {community.description || 'A place to learn and share with other students.'}
                        </p>
                      </div>
                      {manages && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[9px] font-extrabold text-amber-800 ring-1 ring-amber-200/70">
                          <ShieldCheck className="h-3 w-3" /> Manage
                        </span>
                      )}
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                      <span className="text-[10px] font-semibold text-slate-400">
                        {shortCount(community.membersCount)} {community.membersCount === 1 ? 'member' : 'members'}
                        {manages && community.creatorId === currentUser.id ? ' · Created by you' : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => onSelectCommunity(community.slug)}
                        aria-label={`${manages ? 'Manage' : 'Open'} ${community.displayName || community.name}`}
                        className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2.5 text-[11px] font-extrabold text-indigo-700 transition-colors hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                      >
                        {manages ? 'Manage' : 'Open'} <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/50 px-5 py-8 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm"><Compass className="h-5 w-5" /></span>
              <h3 className="mt-3 text-sm font-extrabold text-slate-800">Your communities will show up here</h3>
              <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-slate-500">Join a space around your subjects, campus or goals to keep it close.</p>
              <button type="button" onClick={onBrowseCommunities} className="mt-4 rounded-xl bg-indigo-700 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-indigo-800">
                Find a community
              </button>
            </div>
          )}
        </section>

        <section aria-labelledby="study-groups-title" className="min-w-0">
          <SectionHeading
            kicker="Study together"
            title="Study groups"
            count={studyGroups.length}
            action="Start one"
            onAction={onCreateGroup}
          />
          {studyGroups.length > 0 ? (
            <div className="space-y-3">
              {studyGroups.map((conversation) => {
                const ownsGroup = conversation.creatorId === currentUser.id;
                return (
                  <article key={conversation.id} className="rounded-2xl border border-slate-200/80 bg-[#fffefa] p-4 shadow-[0_2px_12px_rgba(35,42,69,0.035)] transition hover:border-indigo-200 hover:shadow-md">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${ownsGroup ? 'bg-amber-50 text-amber-700' : 'bg-[#e8f5f1] text-emerald-800'}`}>
                        {ownsGroup ? <Crown className="h-[18px] w-[18px]" /> : <MessagesSquare className="h-[18px] w-[18px]" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-extrabold text-slate-900">{conversation.title || 'Study group'}</h3>
                        <div className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                          <Users className="h-3 w-3" /> {conversation.memberIds?.length || 0} members
                          <span aria-hidden="true">·</span>{activityLabel(conversation.lastMessageTime || conversation.lastTimestamp)}
                        </div>
                      </div>
                    </div>
                    {conversation.lastMessage && (
                      <p className="mt-3 line-clamp-2 rounded-xl bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
                        {conversation.lastMessage}
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-between gap-3">
                      {ownsGroup ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-amber-800"><ShieldCheck className="h-3.5 w-3.5" /> You own this group</span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-400">Member</span>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenGroup(conversation.id)}
                        aria-label={`${ownsGroup ? 'Manage' : 'Open'} ${conversation.title || 'study group'}`}
                        className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2.5 text-[11px] font-extrabold text-indigo-700 transition-colors hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                      >
                        {ownsGroup ? 'Manage group' : 'Open group'} <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-emerald-200 bg-[#f1f8f5] px-5 py-8 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm"><BookOpen className="h-5 w-5" /></span>
              <h3 className="mt-3 text-sm font-extrabold text-slate-800">Make room for a study session</h3>
              <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-slate-500">Start a group for a subject, exam or project and bring your people together.</p>
              <button type="button" onClick={onCreateGroup} className="mt-4 rounded-xl bg-emerald-800 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-emerald-900">
                Create a study group
              </button>
            </div>
          )}
        </section>
      </div>
    </section>
  );
};

export default MySpaceView;
