import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Share2, Users, Gift, Star, Zap, ChevronRight } from 'lucide-react';
import { api, PUBLIC_APP_URL } from '../api';
import Avatar from './Avatar';

interface InviteModalProps {
  currentUser: { id: string; fullName: string; college?: string };
  darkMode: boolean;
  onClose: () => void;
}

const MILESTONES = [
  { count: 5,  badge: '🔗', label: 'Connector',        color: 'from-blue-500 to-indigo-600',  reward: 'Connector badge on your profile' },
  { count: 10, badge: '🌟', label: 'Campus Ambassador', color: 'from-amber-400 to-orange-500', reward: 'Ambassador badge + priority in search' },
];

export default function InviteModal({ currentUser, darkMode, onClose }: InviteModalProps) {
  const dm = darkMode;
  const [stats, setStats] = useState<{ code: string; count: number; invitedUsers: any[] } | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.referral.getStats(currentUser.id)
      .then(s => setStats(s))
      .catch(() => {
        const code = currentUser.id.slice(-8).toUpperCase();
        setStats({ code, count: 0, invitedUsers: [] });
      })
      .finally(() => setLoading(false));
  }, [currentUser.id]);

  const code = stats?.code ?? currentUser.id.slice(-8).toUpperCase();
  const inviteUrl = `${PUBLIC_APP_URL}?ref=${code}`;
  const inviteCount = stats?.count ?? 0;

  const whatsappText = encodeURIComponent(
    `Hey! 👋 I'm on The Network — a social app built just for Indian college students.\n\n` +
    `Find study partners 📚, join campus communities 🏛️, see what's trending at your college 🏆, and connect with students across India.\n\n` +
    `Join using my link and we both grow together 🤝\n👇\n${inviteUrl}\n\n` +
    `(Install it as an app: open link → share → Add to Home Screen)`
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'Join me on The Network',
        text: `Hey! Join The Network — a social app for Indian college students. Use my link:`,
        url: inviteUrl,
      }).catch(() => {});
    } else {
      handleCopy();
    }
  };

  const nextMilestone = MILESTONES.find(m => m.count > inviteCount) ?? MILESTONES[MILESTONES.length - 1];
  const progressToNext = Math.min((inviteCount / nextMilestone.count) * 100, 100);
  const reachedMilestone = MILESTONES.find(m => inviteCount >= m.count && inviteCount < (MILESTONES[MILESTONES.indexOf(m) + 1]?.count ?? Infinity));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl ${dm ? 'bg-[#121217] text-white' : 'bg-white text-slate-900'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`relative px-5 pt-5 pb-4 border-b ${dm ? 'border-white/8' : 'border-neutral-100'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xl shrink-0">🎁</div>
            <div>
              <h2 className="text-base font-extrabold leading-tight">Invite Friends</h2>
              <p className={`text-xs mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Invite 5–10 friends. Earn badges. Grow together.</p>
            </div>
          </div>
          <button onClick={onClose} className={`absolute top-4 right-4 p-1.5 rounded-full transition-all cursor-pointer border-0 ${dm ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-neutral-100 text-slate-500'}`}>
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[80vh] overflow-y-auto">

          {/* Progress card */}
          <div className={`rounded-2xl p-4 ${dm ? 'bg-white/5 border border-white/8' : 'bg-indigo-50/60 border border-indigo-100'}`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className={`text-[10px] font-mono uppercase tracking-widest ${dm ? 'text-slate-500' : 'text-indigo-400'}`}>Friends joined</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className={`text-3xl font-black ${dm ? 'text-white' : 'text-slate-900'}`}>{inviteCount}</span>
                  <span className={`text-sm font-bold ${dm ? 'text-slate-500' : 'text-slate-400'}`}>/ {nextMilestone.count} for next badge</span>
                </div>
              </div>
              {reachedMilestone && (
                <div className="text-right">
                  <span className="text-3xl">{reachedMilestone.badge}</span>
                  <p className={`text-[9px] font-bold mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{reachedMilestone.label}</p>
                </div>
              )}
            </div>
            <div className={`w-full h-2 rounded-full overflow-hidden ${dm ? 'bg-white/10' : 'bg-indigo-100'}`}>
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700"
                style={{ width: `${progressToNext}%` }}
              />
            </div>
            <p className={`text-[10px] mt-1.5 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
              {inviteCount >= nextMilestone.count
                ? `🎉 You've unlocked the ${nextMilestone.label} badge!`
                : `${nextMilestone.count - inviteCount} more friend${nextMilestone.count - inviteCount !== 1 ? 's' : ''} to unlock ${nextMilestone.badge} ${nextMilestone.label}`}
            </p>
          </div>

          {/* Milestones */}
          <div className="space-y-2">
            <p className={`text-[10px] font-bold uppercase tracking-widest ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Rewards</p>
            {MILESTONES.map(m => {
              const unlocked = inviteCount >= m.count;
              return (
                <div key={m.count} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${unlocked ? (dm ? 'border-amber-500/30 bg-amber-500/8' : 'border-amber-200 bg-amber-50') : (dm ? 'border-white/6 bg-white/3' : 'border-neutral-100 bg-neutral-50')}`}>
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center text-lg shrink-0 ${unlocked ? 'opacity-100' : 'opacity-30 grayscale'}`}>
                    {m.badge}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold ${unlocked ? (dm ? 'text-white' : 'text-slate-900') : (dm ? 'text-slate-500' : 'text-slate-400')}`}>{m.label}</p>
                    <p className={`text-[10px] ${dm ? 'text-slate-600' : 'text-slate-400'}`}>{m.count} friends · {m.reward}</p>
                  </div>
                  {unlocked
                    ? <span className="text-emerald-500 text-xs font-bold shrink-0">✓ Unlocked</span>
                    : <span className={`text-[10px] font-mono shrink-0 ${dm ? 'text-slate-600' : 'text-slate-400'}`}>{m.count - inviteCount} more</span>
                  }
                </div>
              );
            })}
          </div>

          {/* Invite link */}
          <div className="space-y-2">
            <p className={`text-[10px] font-bold uppercase tracking-widest ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Your invite link</p>
            <div className={`flex items-center gap-2 p-2 rounded-xl border ${dm ? 'border-white/8 bg-white/4' : 'border-neutral-200 bg-neutral-50'}`}>
              <p className={`flex-1 text-[11px] font-mono truncate ${dm ? 'text-slate-300' : 'text-slate-700'}`}>{inviteUrl}</p>
              <button
                onClick={handleCopy}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer border-0 ${copied ? 'bg-emerald-500 text-white' : 'bg-indigo-500 text-white hover:bg-indigo-600'}`}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] ${dm ? 'bg-white/3 text-slate-500' : 'bg-neutral-50 text-slate-400'}`}>
              <span className="text-base">🔑</span>
              <span>Your invite code: <span className={`font-mono font-bold text-xs tracking-wider ${dm ? 'text-white' : 'text-slate-800'}`}>{code}</span></span>
            </div>
          </div>

          {/* Share buttons */}
          <div className="grid grid-cols-2 gap-2">
            <a
              href={`https://wa.me/?text=${whatsappText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#25D366] text-white text-sm font-bold hover:bg-[#20bc5a] transition-all cursor-pointer no-underline"
            >
              <span className="text-lg">💬</span> WhatsApp
            </a>
            <button
              onClick={handleShare}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer border-0 ${dm ? 'bg-white/8 text-white hover:bg-white/12' : 'bg-neutral-100 text-slate-800 hover:bg-neutral-200'}`}
            >
              <Share2 size={15} /> Share
            </button>
          </div>

          {/* Who joined via your link */}
          {stats && stats.invitedUsers.length > 0 && (
            <div className="space-y-2">
              <p className={`text-[10px] font-bold uppercase tracking-widest ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Joined via your link ({stats.invitedUsers.length})</p>
              <div className="space-y-1.5">
                {stats.invitedUsers.map(u => (
                  <div key={u.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl ${dm ? 'bg-white/4' : 'bg-neutral-50'}`}>
                    <div className="w-7 h-7 rounded-full overflow-hidden shrink-0">
                      <Avatar avatar={u.avatar} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold truncate ${dm ? 'text-white' : 'text-slate-900'}`}>{u.fullName}</p>
                      <p className={`text-[9px] truncate ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{u.college}</p>
                    </div>
                    <span className="ml-auto text-emerald-500 text-xs shrink-0">✓ Joined</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tip */}
          <p className={`text-[10px] text-center pb-1 ${dm ? 'text-slate-600' : 'text-slate-400'}`}>
            Share in your college WhatsApp group for fastest results 🚀
          </p>
        </div>
      </div>
    </div>
  );
}
