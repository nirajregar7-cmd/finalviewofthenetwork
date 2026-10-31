import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Copy, Link2, Share2, Trophy, UserPlus, X } from 'lucide-react';
import { api } from '../../api';
import { Community, User } from '../types';

type InviteStats = {
  code: string;
  count: number;
  invitedUsers: Array<{ id: string; fullName: string; college: string; avatar?: string }>;
};

type InviteSheetProps = {
  currentUser: User;
  community?: Community;
  onClose: () => void;
  onContinue?: () => void;
};

const MILESTONES = [
  { count: 3, icon: '🏅', title: 'Early Connector', detail: 'A badge for getting your network started.' },
  { count: 10, icon: '⭐', title: 'Founding Network Member', detail: 'Recognition for helping shape The Network.' },
  { count: 25, icon: '🚀', title: 'Community Builder', detail: 'A visible badge for growing your campus community.' },
  { count: 50, icon: '👑', title: 'Top Connector', detail: 'Recognition for leading the way.' },
];

function slugForCommunity(community: Community): string {
  return (community.slug || community.name)
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
    const input = document.createElement('textarea');
    input.value = value;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand('copy');
    input.remove();
    return copied;
  } catch {
    return false;
  }
}

export const InviteSheet: React.FC<InviteSheetProps> = ({ currentUser, community, onClose, onContinue }) => {
  const [stats, setStats] = useState<InviteStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareNotice, setShareNotice] = useState('');
  const [loading, setLoading] = useState(!community);

  useEffect(() => {
    if (community) return;
    let mounted = true;
    api.referral.getStats(currentUser.id)
      .then((result) => {
        if (mounted) setStats(result as InviteStats);
      })
      .catch(() => {
        if (mounted) {
          setStats({
            code: currentUser.id.slice(-8).toUpperCase(),
            count: 0,
            invitedUsers: [],
          });
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [community, currentUser.id]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const code = stats?.code || currentUser.id.slice(-8).toUpperCase();
  const communityName = community?.displayName || community?.name || '';
  const communitySlug = community ? slugForCommunity(community) : '';
  const inviteUrl = useMemo(() => {
    const origin = 'https://www.the-network.co.in';
    if (!community) return `${origin}/invite/${encodeURIComponent(code)}`;
    return `${origin}/community/${encodeURIComponent(communitySlug)}?ref=${encodeURIComponent(code)}`;
  }, [code, community, communitySlug]);
  const inviteCount = stats?.count || 0;
  const nextMilestone = MILESTONES.find((milestone) => milestone.count > inviteCount);
  const progressPercent = nextMilestone
    ? Math.min(100, (inviteCount / nextMilestone.count) * 100)
    : 100;
  const whatsappMessage = community
    ? `Join me in ${communityName} on The Network — a student community to learn, connect and grow together.\n\n${inviteUrl}`
    : `Hey! 👋 I'm on The Network — a social app built for Indian college students.\n\nFind study partners, join campus communities and connect with students across India.\n\nJoin me here:\n${inviteUrl}`;
  const encodedWhatsappMessage = encodeURIComponent(whatsappMessage);

  const showNotice = (notice: string) => {
    setShareNotice(notice);
    window.setTimeout(() => setShareNotice(''), 2200);
  };

  const handleCopy = async () => {
    const didCopy = await copyText(inviteUrl);
    setCopied(didCopy);
    showNotice(didCopy ? 'Invite link copied' : 'Could not copy the link');
    window.setTimeout(() => setCopied(false), 2200);
  };

  const handleMoreOptions = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: community ? `Join ${communityName}` : 'Join me on The Network',
          text: whatsappMessage.split('\n\n')[0],
          url: inviteUrl,
        });
        return;
      } catch {
        // Dismissing the native share sheet is not an error.
        return;
      }
    }
    await handleCopy();
  };

  const title = community ? `Invite students to ${community.slug}` : 'Invite students';
  const subtitle = community
    ? `Help ${communityName} become more useful by bringing the right students in.`
    : 'Grow your network. Unlock benefits.';

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <section
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[28px] bg-white text-slate-900 shadow-2xl sm:max-w-lg sm:rounded-[28px]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-sheet-title"
      >
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 px-5 pb-4 pt-5 backdrop-blur sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xl text-white shadow-lg shadow-indigo-500/20">
              {community ? <UserPlus className="h-5 w-5" /> : '🎁'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">
                {community ? 'Community invite' : 'The Network'}
              </p>
              <h2 id="invite-sheet-title" className="mt-0.5 text-lg font-black leading-tight text-slate-950">
                {title}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{subtitle}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close invite sheet"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          {!community && (
            <>
              <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-xl">🌐</div>
                  <div>
                    <p className="text-sm font-black text-slate-900">Your network becomes more useful when the people you know are here.</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                      Invite students from your college and help build a more active community.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Students joined through you</p>
                    <p className="mt-1 text-3xl font-black text-slate-950">{loading ? '—' : inviteCount}</p>
                  </div>
                  <Trophy className="h-6 w-6 text-amber-500" />
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] font-semibold text-slate-500">
                  {nextMilestone
                    ? `${nextMilestone.count - inviteCount} more to unlock ${nextMilestone.icon} ${nextMilestone.title}`
                    : '🎉 You have unlocked every invite milestone.'}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Invite & unlock recognition</p>
                {MILESTONES.map((milestone) => {
                  const unlocked = inviteCount >= milestone.count;
                  return (
                    <div
                      key={milestone.count}
                      className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 ${
                        unlocked ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-slate-50'
                      }`}
                    >
                      <span className={`text-xl ${unlocked ? '' : 'grayscale opacity-40'}`}>{milestone.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-black ${unlocked ? 'text-slate-900' : 'text-slate-500'}`}>{milestone.title}</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">{milestone.count} students · {milestone.detail}</p>
                      </div>
                      <span className={`shrink-0 text-[10px] font-bold ${unlocked ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {unlocked ? 'Unlocked' : `${milestone.count - inviteCount} more`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              {community ? 'Community invite link' : 'Your invite link'}
            </p>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
              <Link2 className="ml-1 h-4 w-4 shrink-0 text-indigo-500" />
              <p className="min-w-0 flex-1 truncate font-mono text-[11px] text-slate-700">{inviteUrl}</p>
              <button
                type="button"
                onClick={handleCopy}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-black text-white transition-colors ${
                  copied ? 'bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            {!community && (
              <p className="text-[10px] text-slate-400">
                Your personal code: <span className="font-mono font-bold tracking-wider text-slate-700">{code}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <a
              href={`https://wa.me/?text=${encodedWhatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl bg-[#25D366] text-[11px] font-black text-white no-underline transition-colors hover:bg-[#20bc5a]"
            >
              <span className="text-lg">💬</span>
              WhatsApp
            </a>
            <button
              type="button"
              onClick={handleCopy}
              className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl border border-indigo-100 bg-indigo-50 text-[11px] font-black text-indigo-700 transition-colors hover:bg-indigo-100"
            >
              <Copy className="h-4 w-4" />
              Copy link
            </button>
            <button
              type="button"
              onClick={handleMoreOptions}
              className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-slate-100 text-[11px] font-black text-slate-700 transition-colors hover:bg-slate-200"
            >
              <Share2 className="h-4 w-4" />
              More options
            </button>
          </div>

          <button
            type="button"
            onClick={handleMoreOptions}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-black text-white transition-colors hover:bg-slate-800"
          >
            Invite &amp; Earn
            <ArrowRight className="h-4 w-4" />
          </button>

          {shareNotice && <p className="text-center text-[11px] font-bold text-emerald-600">{shareNotice}</p>}
          <p className="pb-1 text-center text-[10px] leading-relaxed text-slate-400">
            {community
              ? 'Students can preview this community, create an account and join after signing up.'
              : 'Invite students who will actually participate — active communities grow stronger together.'}
          </p>

          <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-3 py-2 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            >
              Cancel
            </button>
            {onContinue && (
              <button
                type="button"
                onClick={onContinue}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-700"
              >
                Go for other
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default InviteSheet;