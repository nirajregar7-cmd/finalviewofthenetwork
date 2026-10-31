import React, { useState } from 'react';
import { Instagram, Linkedin, MessageCircle, Share2, Link2, Check, X, Download, ExternalLink, Copy, Users, ChevronDown, Loader2 } from 'lucide-react';
import type { Community } from '../types';

interface SocialShareMenuProps {
  postId: string;
  title: string;
  text?: string;
  communities?: Community[];
  onShareToCommunity?: (postId: string, communityId: string) => Promise<void>;
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const input = document.createElement('textarea');
  input.value = value;
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  input.remove();
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapText(value: string, maxChars: number, maxLines: number): string[] {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && next.length > maxChars) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else {
      line = next;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (words.join(' ').length > lines.join(' ').length && lines.length) {
    lines[lines.length - 1] = lines[lines.length - 1].replace(/[.…]*$/, '') + '…';
  }
  return lines;
}

export const SocialShareMenu: React.FC<SocialShareMenuProps> = ({
  postId,
  title,
  text,
  communities = [],
  onShareToCommunity,
}) => {
  const [open, setOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [communityPickerOpen, setCommunityPickerOpen] = useState(false);
  const [sharingCommunityId, setSharingCommunityId] = useState<string | null>(null);
  const [communityShareNotice, setCommunityShareNotice] = useState('');
  const [communityShareFailed, setCommunityShareFailed] = useState(false);
  const joinedCommunities = communities.filter((community) => community.isJoined && !community.isBlocked);
  const shareUrl = `https://the-network.web.app/#post-${encodeURIComponent(postId)}`;
  const description = text?.trim() || title.trim();
  const shareText = `${title}${description && description !== title ? `\n${description}` : ''}`;

  const openShare = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    setOpen(false);
  };

  const copyLink = async () => {
    await copyText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const shareToCommunity = async (community: Community) => {
    if (!onShareToCommunity || sharingCommunityId) return;
    setSharingCommunityId(community.id);
    setCommunityShareNotice('');
    setCommunityShareFailed(false);
    try {
      await onShareToCommunity(postId, community.id);
      setCommunityShareNotice(`Shared in ${community.displayName || community.name}`);
    } catch (error: any) {
      setCommunityShareNotice(error?.message || 'Could not share this post. Please try again.');
      setCommunityShareFailed(true);
    } finally {
      setSharingCommunityId(null);
    }
  };

  const shareToInstagram = async () => {
    setOpen(false);
    setCardOpen(true);
  };

  const shareToLinkedIn = () => {
    openShare(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`);
  };

  const createStoryCard = async (): Promise<Blob | null> => {
    const titleLines = wrapText(title, 25, 4).map(escapeXml);
    const descriptionLines = wrapText(description, 39, 10).map(escapeXml);
    const titleSvg = titleLines.map((line, index) =>
      `<text x="145" y="${615 + index * 72}" fill="#141328" font-family="Arial,sans-serif" font-size="58" font-weight="700">${line}</text>`
    ).join('');
    const descriptionStartY = 700 + Math.max(0, titleLines.length - 1) * 72;
    const descriptionSvg = descriptionLines.map((line, index) =>
      `<text x="145" y="${descriptionStartY + index * 50}" fill="#4b4860" font-family="Arial,sans-serif" font-size="34">${line}</text>`
    ).join('');
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
        <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#21135f"/><stop offset="1" stop-color="#6941e8"/></linearGradient></defs>
        <rect width="1080" height="1920" fill="url(#bg)"/>
        <circle cx="930" cy="160" r="230" fill="#ffffff" opacity=".08"/>
        <circle cx="100" cy="1770" r="300" fill="#12b981" opacity=".13"/>
        <text x="90" y="180" fill="#b9a9ff" font-family="Arial,sans-serif" font-size="34" font-weight="700" letter-spacing="5">THE NETWORK</text>
        <rect x="90" y="330" width="900" height="1060" rx="42" fill="#ffffff" opacity=".97"/>
        <text x="145" y="500" fill="#6d4aff" font-family="Arial,sans-serif" font-size="30" font-weight="700">SHARED BY A STUDENT</text>
        ${titleSvg}
        ${descriptionSvg}
        <text x="145" y="1320" fill="#6d4aff" font-family="Arial,sans-serif" font-size="28" font-weight="700">JOIN THE CONVERSATION</text>
        <text x="90" y="1645" fill="#ffffff" font-family="Arial,sans-serif" font-size="38" font-weight="700">Connect. Learn. Build.</text>
        <text x="90" y="1710" fill="#d7ceff" font-family="Arial,sans-serif" font-size="28">the-network.web.app</text>
      </svg>`;
    const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      canvas.getContext('2d')?.drawImage(image, 0, 0);
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png');
      };
      image.onerror = () => resolve(null);
      image.src = svgUrl;
    });
  };

  const downloadStoryCard = async () => {
    const blob = await createStoryCard();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `the-network-story-${postId}.png`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const shareInstagramStory = async () => {
    const blob = await createStoryCard();
    if (!blob) return;
    const file = new File([blob], `the-network-story-${postId}.png`, { type: 'image/png' });
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      try {
        await navigator.share({
          title: 'The Network Story',
          text: shareText,
          files: [file],
        });
        setCardOpen(false);
        return;
      } catch (_) {
        // The user may have dismissed the chooser; keep the card open.
        return;
      }
    }
    await downloadStoryCard();
  };

  const nativeShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({ title, text: shareText, url: shareUrl });
      setCardOpen(false);
    } catch (_) {}
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-800"
        aria-expanded={open}
        aria-label="Share post"
      >
        <Share2 className="h-4 w-4" />
        <span>Share</span>
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-30 mb-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Share this post</p>
          <button
            type="button"
            onClick={() => { setOpen(false); setCardOpen(true); }}
            className="mb-1 flex w-full items-center gap-2 rounded-lg bg-indigo-50 px-2 py-2 text-left text-xs font-bold text-indigo-700 hover:bg-indigo-100"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-600 text-[10px] text-white">✦</span>
            Create share card
          </button>
          <button
            type="button"
            onClick={() =>
              openShare(`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`)
            }
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
          >
            <MessageCircle className="h-4 w-4 text-emerald-600" /> WhatsApp
          </button>
          <button
            type="button"
            onClick={shareToLinkedIn}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700"
          >
            <Linkedin className="h-4 w-4 text-blue-600" /> LinkedIn
          </button>
          <button
            type="button"
            onClick={shareToInstagram}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-pink-50 hover:text-pink-700"
          >
            <Instagram className="h-4 w-4 text-pink-600" /> Instagram
            <span className="ml-auto text-[9px] font-normal text-slate-400">copy link</span>
          </button>
          {onShareToCommunity && joinedCommunities.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setCommunityPickerOpen((value) => !value)}
                aria-expanded={communityPickerOpen}
                className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-slate-100 px-2 pt-2 text-left text-xs font-semibold text-slate-700 hover:text-indigo-700"
              >
                <Users className="h-4 w-4 text-indigo-600" />
                Share to community chat
                <ChevronDown className={`ml-auto h-3.5 w-3.5 transition-transform ${communityPickerOpen ? 'rotate-180' : ''}`} />
              </button>
              {communityPickerOpen && (
                <div className="mt-1 max-h-40 space-y-0.5 overflow-y-auto rounded-lg bg-slate-50 p-1" aria-label="Choose a community chat">
                  {joinedCommunities.map((community) => (
                    <button
                      key={community.id}
                      type="button"
                      disabled={Boolean(sharingCommunityId)}
                      onClick={() => void shareToCommunity(community)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[11px] font-semibold text-slate-700 hover:bg-white hover:text-indigo-700 disabled:cursor-wait disabled:opacity-60"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[9px] font-black text-emerald-700">
                        {(community.displayName || community.name).replace(/^\/+/, '').slice(0, 2).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{community.displayName || community.name}</span>
                      {sharingCommunityId === community.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    </button>
                  ))}
                </div>
              )}
              {communityShareNotice && (
                <p role="status" className={`px-2 pt-1.5 text-[10px] font-semibold ${communityShareFailed ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {communityShareNotice}
                </p>
              )}
            </>
          )}
          <button
            type="button"
            onClick={copyLink}
            className="mt-1 flex w-full items-center gap-2 border-t border-slate-100 px-2 pt-2 text-left text-xs font-semibold text-slate-500 hover:text-indigo-600"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Link2 className="h-4 w-4" />}
            {copied ? 'Link copied' : 'Copy link'}
          </button>
        </div>
      )}
      {cardOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onClick={() => setCardOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-card-title"
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">Ready to share</p>
                <h2 id="share-card-title" className="mt-1 text-xl font-black text-slate-900">Turn this post into a card</h2>
                 <p className="mt-1 text-xs text-slate-500">The card includes this post’s description. Save it, then add it from Instagram’s Story camera.</p>
              </div>
              <button type="button" aria-label="Close share card" onClick={() => setCardOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-[220px_1fr]">
              <div className="mx-auto w-full max-w-[220px] rounded-[1.4rem] bg-gradient-to-br from-[#21135f] via-indigo-600 to-violet-500 p-3 shadow-lg">
                <div className="flex aspect-[9/16] flex-col rounded-[1rem] bg-white p-4">
                  <div className="flex items-center gap-1.5 text-[8px] font-black tracking-[0.15em] text-indigo-600"><span className="h-2 w-2 rounded-full bg-indigo-600" /> THE NETWORK</div>
                  <div className="my-auto">
                    <p className="text-[8px] font-black uppercase tracking-widest text-indigo-600">Shared by a student</p>
                    <h3 className="mt-3 line-clamp-4 text-lg font-black leading-tight text-slate-900">{title}</h3>
                   <p className="mt-3 line-clamp-8 whitespace-pre-wrap text-[10px] leading-relaxed text-slate-500">{description}</p>
                  </div>
                 <div><p className="text-[10px] font-black text-slate-900">Connect. Learn. Build.</p><p className="mt-1 text-[8px] text-indigo-600">the-network.web.app</p></div>
                </div>
              </div>

              <div className="flex flex-col justify-center gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Post description</p>
                 <p className="mt-2 max-h-28 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-slate-700">{description}</p>
                </div>
                <button type="button" onClick={shareToLinkedIn} className="flex items-center justify-center gap-2 rounded-xl bg-[#0a66c2] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#0959a8]"><Linkedin className="h-4 w-4" /> Post on LinkedIn <ExternalLink className="h-3.5 w-3.5" /></button>
                 <button type="button" onClick={shareInstagramStory} className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-orange-500 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-90"><Instagram className="h-4 w-4" /> Share card to Instagram</button>
                 <p className="text-center text-[10px] leading-4 text-slate-400">If Instagram opens Messages, choose Stories there or use “Save card to device” and upload it from Instagram Stories.</p>
                 <button type="button" onClick={downloadStoryCard} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50"><Download className="h-4 w-4" /> Save card to device</button>
                <button type="button" onClick={nativeShare} disabled={!Boolean((navigator as Navigator & { share?: unknown }).share)} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"><Share2 className="h-4 w-4" /> {Boolean((navigator as Navigator & { share?: unknown }).share) ? 'Share from this device' : 'Device sharing unavailable'}</button>
                <button type="button" onClick={async () => { await copyText(shareText); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }} className="flex items-center justify-center gap-2 py-1 text-xs font-bold text-slate-500 hover:text-indigo-600">{copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Description copied' : 'Copy description'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};