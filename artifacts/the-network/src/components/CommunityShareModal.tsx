import React, { useMemo, useState } from 'react';
import { Check, Copy, Instagram, Linkedin, Search, Share2, UserPlus, X } from 'lucide-react';
import { Community, UserProfile } from '../types';
import { PUBLIC_APP_URL, resolveAssetUrl } from '../api';

interface CommunityShareModalProps {
  community: Community;
  currentUser: UserProfile;
  allUsers: UserProfile[];
  canInvite: boolean;
  darkMode: boolean;
  onClose: () => void;
  onInvite: (userIds: string[]) => Promise<{ invitedIds: string[] }>;
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
}

export default function CommunityShareModal({ community, currentUser, allUsers, canInvite, darkMode, onClose, onInvite }: CommunityShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [inviting, setInviting] = useState(false);
  const shareUrl = `${PUBLIC_APP_URL}/community/${toSlug(community.name)}`;
  const shareText = `Join ${community.name} on The Network — a community for Indian college students.`;
  const encodedText = encodeURIComponent(`${shareText}\n${shareUrl}`);
  const availableUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allUsers
      .filter(user =>
        user.id !== currentUser.id &&
        !user.isSuspended &&
        !community.memberIds.includes(user.id) &&
        !invitedIds.has(user.id) &&
        (!query || user.fullName.toLowerCase().includes(query) || user.college.toLowerCase().includes(query))
      )
      .slice(0, 12);
  }, [allUsers, community.memberIds, currentUser.id, invitedIds, search]);

  const copyLink = async (message = 'Link copied') => {
    await navigator.clipboard?.writeText(shareUrl).catch(() => {});
    setCopied(true);
    setNotice(message);
    window.setTimeout(() => {
      setCopied(false);
      setNotice('');
    }, 2200);
  };

  const nativeShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: `Join ${community.name}`, text: shareText, url: shareUrl }).catch(() => {});
    } else {
      await copyLink();
    }
  };

  const shareInstagram = async () => {
    await copyLink('Link copied — paste it in Instagram');
    window.setTimeout(() => window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer'), 120);
  };

  const toggleSelected = (userId: string) => {
    setSelectedIds(previous => {
      const next = new Set(previous);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const inviteSelected = async () => {
    if (selectedIds.size === 0 || inviting) return;
    setInviting(true);
    try {
      const result = await onInvite([...selectedIds]);
      setInvitedIds(previous => new Set([...previous, ...result.invitedIds]));
      setSelectedIds(new Set());
      setNotice(`${result.invitedIds.length} invite${result.invitedIds.length === 1 ? '' : 's'} sent`);
    } catch (error: any) {
      setNotice(error?.message || 'Could not send invites');
    } finally {
      setInviting(false);
    }
  };

  const dm = darkMode;
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div
        className={`w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden ${dm ? 'bg-[#121217] text-white' : 'bg-white text-slate-900'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className={`px-5 py-4 border-b ${dm ? 'border-white/8' : 'border-neutral-100'}`}>
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 shrink-0 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xl">🤝</div>
            <div className="min-w-0 flex-1">
              <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${dm ? 'text-indigo-300' : 'text-indigo-500'}`}>Invite to community</p>
              <h2 className="text-base font-black truncate mt-0.5">{community.name}</h2>
              <p className={`text-[11px] mt-1 line-clamp-2 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{community.description}</p>
            </div>
            <button onClick={onClose} className={`p-1.5 rounded-full cursor-pointer ${dm ? 'text-slate-400 hover:bg-white/10' : 'text-slate-500 hover:bg-neutral-100'}`} aria-label="Close share dialog">
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {canInvite ? (
            <div className={`rounded-2xl border p-3.5 ${dm ? 'border-white/10 bg-white/[0.03]' : 'border-indigo-100 bg-indigo-50/50'}`}>
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <div>
                <p className={`text-[11px] font-black uppercase tracking-wider ${dm ? 'text-white' : 'text-slate-800'}`}>Invite people on The Network</p>
                <p className={`text-[10px] mt-0.5 ${dm ? 'text-slate-500' : 'text-slate-500'}`}>They’ll get a notification and choose whether to join.</p>
              </div>
              <UserPlus size={16} className="text-indigo-500 shrink-0" />
            </div>
            <div className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 ${dm ? 'border-white/10 bg-black/10' : 'border-neutral-200 bg-white'}`}>
              <Search size={14} className={dm ? 'text-slate-500' : 'text-slate-400'} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or college"
                className={`w-full bg-transparent outline-none text-[11px] ${dm ? 'text-white placeholder:text-slate-600' : 'text-slate-800 placeholder:text-slate-400'}`}
              />
            </div>
            {availableUsers.length > 0 && (
              <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto">
                {availableUsers.map(user => {
                  const selected = selectedIds.has(user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => toggleSelected(user.id)}
                      className={`w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left border cursor-pointer transition-colors ${
                        selected
                          ? (dm ? 'border-indigo-400/50 bg-indigo-500/15' : 'border-indigo-300 bg-indigo-50')
                          : (dm ? 'border-transparent hover:bg-white/5' : 'border-transparent hover:bg-white')
                      }`}
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center text-[10px] font-black shrink-0 overflow-hidden">
                        {user.avatar?.startsWith('data:') || user.avatar?.startsWith('http') || user.avatar?.startsWith('/api/')
                          ? <img src={resolveAssetUrl(user.avatar)} alt="" className="w-full h-full object-cover" />
                          : (user.avatar || user.fullName.slice(0, 1)).slice(0, 2).toUpperCase()}
                      </div>
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-[11px] font-bold ${dm ? 'text-slate-200' : 'text-slate-800'}`}>{user.fullName}</span>
                        <span className={`block truncate text-[9px] ${dm ? 'text-slate-500' : 'text-slate-500'}`}>{user.college}</span>
                      </span>
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-black ${selected ? 'bg-indigo-500 border-indigo-500 text-white' : (dm ? 'border-white/20' : 'border-neutral-300')}`}>
                        {selected ? '✓' : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {search.trim() && availableUsers.length === 0 && (
              <p className={`text-[10px] py-2 text-center ${dm ? 'text-slate-500' : 'text-slate-500'}`}>No eligible students found.</p>
            )}
            <button
              type="button"
              onClick={inviteSelected}
              disabled={selectedIds.size === 0 || inviting}
              className="w-full mt-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed py-2.5 text-[11px] font-extrabold text-white cursor-pointer border-0"
            >
              {inviting ? 'Sending invites…' : selectedIds.size ? `Send ${selectedIds.size} invite${selectedIds.size === 1 ? '' : 's'}` : 'Select people to invite'}
            </button>
            </div>
          ) : (
            <div className={`rounded-2xl border px-3.5 py-3 text-center ${dm ? 'border-white/10 bg-white/[0.03]' : 'border-neutral-200 bg-neutral-50'}`}>
              <p className={`text-[10px] ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
                Join this community first to invite people from The Network.
              </p>
            </div>
          )}

          <div className={`flex items-center gap-2 p-2 rounded-xl border ${dm ? 'bg-white/5 border-white/10' : 'bg-neutral-50 border-neutral-200'}`}>
            <p className={`flex-1 min-w-0 truncate text-[11px] font-mono ${dm ? 'text-slate-300' : 'text-slate-700'}`}>{shareUrl}</p>
            <button onClick={() => copyLink()} className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold text-white cursor-pointer ${copied ? 'bg-emerald-500' : 'bg-indigo-500 hover:bg-indigo-600'}`}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
          </div>

          {notice && <p className="text-center text-[11px] font-bold text-emerald-500">{notice}</p>}

          <div className="grid grid-cols-2 gap-2.5">
            <a
              href={`https://wa.me/?text=${encodedText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-xs font-extrabold text-white no-underline hover:bg-[#20bc5a]"
            >
              <span className="text-base">💬</span> WhatsApp
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-[#0A66C2] py-3 text-xs font-extrabold text-white no-underline hover:bg-[#0959a8]"
            >
              <Linkedin size={15} /> LinkedIn
            </a>
            <button onClick={shareInstagram} className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 via-rose-500 to-amber-400 py-3 text-xs font-extrabold text-white cursor-pointer border-0">
              <Instagram size={15} /> Instagram
            </button>
            <button onClick={nativeShare} className={`flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-extrabold cursor-pointer border ${dm ? 'bg-white/8 border-white/10 text-white hover:bg-white/12' : 'bg-neutral-100 border-neutral-200 text-slate-800 hover:bg-neutral-200'}`}>
              <Share2 size={15} /> More options
            </button>
          </div>

          <p className={`text-center text-[10px] leading-relaxed ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
            Anyone with this link can preview the community. Existing members join instantly; new students can create an account and join after signing up.
          </p>
        </div>
      </div>
    </div>
  );
}