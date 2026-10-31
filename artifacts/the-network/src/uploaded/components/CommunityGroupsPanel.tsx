import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  LoaderCircle,
  LockKeyhole,
  MessageCircle,
  Plus,
  Users,
  X,
} from 'lucide-react';
import type { GroupChat } from '../../types';
import { api } from '../../api';
import type { Community, User } from '../types';

interface CommunityGroupsPanelProps {
  community: Community;
  currentUser: User;
  onJoinCommunity: () => void;
  onOpenGroupChat: (group: GroupChat) => void;
}

type GroupPurpose = 'study' | 'chat';
type GroupVisibility = 'public' | 'private';

export const CommunityGroupsPanel: React.FC<CommunityGroupsPanelProps> = ({
  community,
  currentUser,
  onJoinCommunity,
  onOpenGroupChat,
}) => {
  const isCommunityMember = Boolean(community.memberIds?.includes(currentUser.id));
  const canBrowseCommunityGroups = isCommunityMember || community.isAdmin;
  const [groups, setGroups] = useState<GroupChat[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [purpose, setPurpose] = useState<GroupPurpose>('study');
  const [visibility, setVisibility] = useState<GroupVisibility>('public');
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!canBrowseCommunityGroups) {
      setGroups([]);
      return;
    }

    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      api.groupChats.getCommunityGroups(community.id) as Promise<GroupChat[]>,
      api.groupChats.getAll() as Promise<GroupChat[]>,
    ]).then(([communityGroups, personalGroups]) => {
      if (!active) return;
      const visiblePersonalGroups = personalGroups.filter((group) =>
        group.communityId === community.id &&
        (group.memberIds?.includes(currentUser.id) || group.pendingIds?.includes(currentUser.id)),
      );
      const merged = new Map<string, GroupChat>();
      communityGroups.forEach((group) => merged.set(group.id, group));
      visiblePersonalGroups.forEach((group) => {
        merged.set(group.id, { ...merged.get(group.id), ...group });
      });
      setGroups(Array.from(merged.values()).sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      ));
    }).catch(() => {
      if (active) setError('Groups could not be loaded. Please try again.');
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [community.id, currentUser.id, canBrowseCommunityGroups, reload]);

  const resetForm = () => {
    setGroupName('');
    setDescription('');
    setPurpose('study');
    setVisibility('public');
    setShowForm(false);
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!groupName.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      const created = await api.groupChats.create({
        name: groupName.trim(),
        creatorId: currentUser.id,
        college: currentUser.college,
        type: purpose === 'study' ? 'course' : 'interest',
        branch: currentUser.branch || null,
        communityId: community.id,
        description: description.trim(),
        purpose,
        visibility,
      }) as GroupChat;
      setGroups((previous) => [
        { ...created, isMember: true },
        ...previous.filter((group) => group.id !== created.id),
      ]);
      resetForm();
    } catch (createError) {
      setError(createError instanceof Error
        ? createError.message
        : 'This group could not be created. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleJoin = async (group: GroupChat) => {
    if (joiningId) return;
    setJoiningId(group.id);
    setError('');
    try {
      const joined = await api.groupChats.joinCommunityGroup(group.id) as GroupChat;
      setGroups((previous) => previous.map((item) =>
        item.id === joined.id ? { ...item, ...joined, isMember: true } : item,
      ));
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : 'Could not join this group. Please try again.');
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <section className="space-y-4" data-testid="community-groups-view">
      <div className="rounded-2xl border border-emerald-900/10 bg-[#f1f5ee] p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-800/75">
              <Users className="h-3.5 w-3.5" /> {community.displayName || community.name} / student groups
            </p>
            <h2 className="text-2xl font-black tracking-tight text-stone-900 sm:text-3xl">
              Study together. Stay connected.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-600">
              {community.isAdmin
                ? 'Create a focused study circle or a casual chat group for this community.'
                : 'Community groups are started by admins. To create your own group, go to Chats → Study Groups.'}
            </p>
          </div>
          {canBrowseCommunityGroups && community.isAdmin && (
            <button
              type="button"
              data-testid="button-create-community-group"
              onClick={() => setShowForm((open) => !open)}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              <Plus className="h-4 w-4" /> Start a group
            </button>
          )}
        </div>
        <div className="mt-5 flex flex-wrap gap-3 border-t border-emerald-900/10 pt-4 text-[11px] text-stone-600">
          <span className="inline-flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Study groups</span>
          <span className="inline-flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5" /> Chat groups</span>
          <span className="inline-flex items-center gap-1.5"><LockKeyhole className="h-3.5 w-3.5" /> Public or private</span>
        </div>
      </div>

      {!canBrowseCommunityGroups ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-7 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-900/5 text-emerald-800">
            <Users className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-stone-900">Join this community to see its groups</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-stone-600">
            Community groups are available to members. Join {community.displayName || community.name} to browse or create one.
          </p>
          <button
            type="button"
            data-testid="button-join-community-for-groups"
            onClick={onJoinCommunity}
            className="mt-4 rounded-xl bg-emerald-800 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700"
          >
            Join community
          </button>
        </div>
      ) : (
        <>
          {showForm && (
            <form
              onSubmit={handleCreate}
              className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6"
              data-testid="form-create-community-group"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-800">New group</p>
                  <h3 className="mt-1 text-lg font-bold text-stone-900">Set up your group</h3>
                </div>
                <button
                  type="button"
                  data-testid="button-close-group-form"
                  aria-label="Close group form"
                  onClick={resetForm}
                  className="rounded-lg p-2 text-stone-500 hover:bg-stone-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 sm:col-span-2">
                  <span className="block text-xs font-semibold text-stone-700">Group name</span>
                  <input
                    autoFocus
                    required
                    maxLength={64}
                    value={groupName}
                    onChange={(event) => setGroupName(event.target.value)}
                    placeholder="e.g. DSA problem-solving circle"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                    data-testid="input-community-group-name"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="block text-xs font-semibold text-stone-700">Group type</span>
                  <select
                    value={purpose}
                    onChange={(event) => setPurpose(event.target.value as GroupPurpose)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    data-testid="select-community-group-purpose"
                  >
                    <option value="study">Study group</option>
                    <option value="chat">Chat group</option>
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="block text-xs font-semibold text-stone-700">Who can join?</span>
                  <select
                    value={visibility}
                    onChange={(event) => setVisibility(event.target.value as GroupVisibility)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    data-testid="select-community-group-visibility"
                  >
                    <option value="public">Public — community members</option>
                    <option value="private">Private — invite only</option>
                  </select>
                </label>
                <label className="space-y-1.5 sm:col-span-2">
                  <span className="block text-xs font-semibold text-stone-700">Description <span className="font-normal text-stone-400">(optional)</span></span>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="What will this group work on or talk about?"
                    className="w-full resize-y rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                    data-testid="input-community-group-description"
                  />
                </label>
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-stone-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={resetForm}
                  className="min-h-10 rounded-xl px-4 text-sm font-semibold text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !groupName.trim()}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  data-testid="button-submit-community-group"
                >
                  {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  {saving ? 'Creating…' : 'Create group'}
                </button>
              </div>
            </form>
          )}

          {error && (
            <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setReload((value) => value + 1)}
                className="shrink-0 font-bold underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white p-10 text-sm font-medium text-stone-500" role="status">
              <LoaderCircle className="h-4 w-4 animate-spin" /> Loading groups…
            </div>
          ) : groups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center">
              <Users className="mx-auto h-7 w-7 text-emerald-800/60" />
              <h3 className="mt-3 text-sm font-bold text-stone-900">No groups yet</h3>
              <p className="mt-1 text-sm text-stone-600">A community admin can start the first study or chat group here.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {groups.map((group) => {
                const isMember = group.isMember ?? Boolean(group.memberIds?.includes(currentUser.id));
                const invitePending = !isMember && Boolean(group.pendingIds?.includes(currentUser.id));
                const isPrivate = group.visibility === 'private';
                const isStudy = group.purpose ? group.purpose === 'study' : group.type === 'course';
                const memberCount = group.memberCount ?? group.memberIds?.length ?? 0;
                return (
                  <article
                    key={group.id}
                    className="flex min-h-52 flex-col rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
                    data-testid={`card-community-group-${group.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isStudy ? 'bg-emerald-50 text-emerald-800' : 'bg-indigo-50 text-indigo-700'}`}>
                          {isStudy ? <BookOpen className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-bold text-stone-900" data-testid={`text-community-group-name-${group.id}`}>
                            {group.name}
                          </h3>
                          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                            {isStudy ? 'Study group' : 'Chat group'} <span className="mx-1 text-stone-300">·</span> {isPrivate ? 'Private' : 'Public'}
                          </p>
                        </div>
                      </div>
                      {isPrivate ? <LockKeyhole className="mt-1 h-4 w-4 shrink-0 text-stone-400" /> : <Users className="mt-1 h-4 w-4 shrink-0 text-stone-400" />}
                    </div>
                    <p className="mt-3 line-clamp-2 min-h-9 text-xs leading-relaxed text-stone-600" data-testid={`text-community-group-description-${group.id}`}>
                      {group.description || (isStudy ? 'A focused space to study together.' : 'A space to chat with fellow community members.')}
                    </p>
                    <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                      <span className="text-[11px] font-medium text-stone-500">
                        {invitePending ? 'Invite waiting · accept in Chats' : isMember ? `${memberCount} ${memberCount === 1 ? 'member' : 'members'} · You’re in` : isPrivate ? 'Invite only' : `${memberCount} ${memberCount === 1 ? 'member' : 'members'}`}
                      </span>
                      {isMember ? (
                        <button
                          type="button"
                          onClick={() => onOpenGroupChat(group)}
                          className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg bg-emerald-800 px-3 text-xs font-bold text-white transition hover:bg-emerald-700"
                          data-testid={`button-open-community-group-${group.id}`}
                        >
                          Open chat <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      ) : !isPrivate && !invitePending ? (
                        <button
                          type="button"
                          disabled={joiningId === group.id}
                          onClick={() => void handleJoin(group)}
                          className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg border border-emerald-800/20 px-3 text-xs font-bold text-emerald-900 transition hover:bg-emerald-50 disabled:opacity-60"
                          data-testid={`button-join-community-group-${group.id}`}
                        >
                          {joiningId === group.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                          {joiningId === group.id ? 'Joining…' : 'Join group'}
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
};
