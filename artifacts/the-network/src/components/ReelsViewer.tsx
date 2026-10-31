import React, { useState, useRef, useEffect } from 'react';
import { Story, UserProfile } from '../types';
import { X, Heart, MessageCircle, Share2, Volume2, VolumeX, Play, Pause, UserPlus } from 'lucide-react';
import Avatar from './Avatar';
import { API_ORIGIN } from '../api';

function resolveMedia(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return url.startsWith('/') ? `${API_ORIGIN}${url}` : url;
}

interface ReelsViewerProps {
  reels: Story[];
  startIndex: number;
  allUsers: UserProfile[];
  currentUser: UserProfile;
  darkMode: boolean;
  onClose: () => void;
  onViewUserProfile?: (userId: string) => void;
  onReact?: (storyId: string, emoji: string) => void;
}

function isVideo(media?: string | null): boolean {
  if (!media) return false;
  return media.startsWith('data:video/') || /\.(mp4|webm|mov|ogg)($|\?)/i.test(media);
}

export default function ReelsViewer({
  reels, startIndex, allUsers, currentUser, darkMode, onClose, onViewUserProfile, onReact,
}: ReelsViewerProps) {
  const [current, setCurrent] = useState(startIndex);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showHeart, setShowHeart] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const reel = reels[current];
  const author = allUsers.find(u => u.id === reel?.authorId);
  const hasVideo = isVideo(reel?.image);

  useEffect(() => {
    setProgress(0);
    setPlaying(true);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [current]);

  useEffect(() => {
    if (hasVideo) return;
    clearInterval(progressTimer.current);
    if (playing) {
      progressTimer.current = setInterval(() => {
        setProgress(p => {
          if (p >= 100) {
            goNext();
            return 0;
          }
          return p + 0.5;
        });
      }, 50);
    }
    return () => clearInterval(progressTimer.current);
  }, [playing, current, hasVideo]);

  const goNext = () => { if (current < reels.length - 1) setCurrent(c => c + 1); else onClose(); };
  const goPrev = () => { if (current > 0) setCurrent(c => c - 1); };

  const handleVideoTime = () => {
    const v = videoRef.current;
    if (v && v.duration) setProgress((v.currentTime / v.duration) * 100);
  };

  const handleVideoEnd = () => goNext();

  const handleDoubleTap = () => {
    if (!reel) return;
    setLiked(prev => new Set([...prev, reel.id]));
    setShowHeart(true);
    onReact?.(reel.id, '❤️');
    setTimeout(() => setShowHeart(false), 800);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (playing) { videoRef.current.pause(); setPlaying(false); }
      else { videoRef.current.play(); setPlaying(true); }
    } else {
      setPlaying(p => !p);
    }
  };

  if (!reel) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90" onClick={onClose} />

      {/* Main reel container — phone-sized */}
      <div className="relative z-10 w-full max-w-sm h-[100dvh] md:h-[90vh] md:rounded-2xl overflow-hidden flex flex-col bg-black">

        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 px-3 pt-3">
          {reels.map((_, i) => (
            <div key={i} className="flex-1 h-[2px] rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{ width: i < current ? '100%' : i === current ? `${progress}%` : '0%' }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-8 pb-3 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/40 cursor-pointer" onClick={() => { onViewUserProfile?.(author?.id || ''); onClose(); }}>
              <Avatar avatar={author?.avatar} />
            </div>
            <div>
              <p className="text-white text-[11px] font-bold leading-none">{author?.fullName}</p>
              <p className="text-white/60 text-[9px] mt-0.5">{author?.college?.split(' ').slice(0,3).join(' ')}</p>
            </div>
            {author?.id !== currentUser.id && (
              <button className="ml-1 px-2.5 py-0.5 rounded-full border border-white/60 text-white text-[9px] font-bold flex items-center gap-1 cursor-pointer">
                <UserPlus size={9} /> Follow
              </button>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center cursor-pointer">
            <X size={16} className="text-white" />
          </button>
        </div>

        {/* Media area */}
        <div className="flex-1 relative" onDoubleClick={handleDoubleTap}>
          {hasVideo ? (
            <video
              ref={videoRef}
              src={resolveMedia(reel.image)}
              className="w-full h-full object-cover"
              loop={false}
              muted={muted}
              playsInline
              autoPlay
              onTimeUpdate={handleVideoTime}
              onEnded={handleVideoEnd}
              onClick={togglePlay}
            />
          ) : reel.image ? (
            <img src={resolveMedia(reel.image)} alt="" className="w-full h-full object-cover" onClick={togglePlay} />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-pink-600 via-violet-600 to-indigo-700 flex items-center justify-center p-8">
              <p className="text-white text-lg font-bold text-center leading-relaxed">{reel.content}</p>
            </div>
          )}

          {/* Double-tap heart animation */}
          {showHeart && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Heart size={80} className="text-white fill-white opacity-90 animate-ping" />
            </div>
          )}

          {/* Paused indicator */}
          {!playing && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center">
                <Play size={28} className="text-white ml-1" />
              </div>
            </div>
          )}

          {/* Tap left/right to navigate */}
          <div className="absolute inset-y-0 left-0 w-1/3" onClick={goPrev} />
          <div className="absolute inset-y-0 right-16 left-1/3" onClick={goNext} />
        </div>

        {/* Right action buttons */}
        <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5 z-30">
          <button
            onClick={() => { setLiked(prev => { const n = new Set(prev); n.has(reel.id) ? n.delete(reel.id) : n.add(reel.id); return n; }); onReact?.(reel.id, '❤️'); }}
            className="flex flex-col items-center gap-1 cursor-pointer"
          >
            <div className={`w-10 h-10 rounded-full bg-black/30 flex items-center justify-center transition-all ${liked.has(reel.id) ? 'scale-110' : ''}`}>
              <Heart size={22} className={liked.has(reel.id) ? 'text-red-500 fill-red-500' : 'text-white'} />
            </div>
            <span className="text-white text-[10px] font-bold">{liked.has(reel.id) ? '1' : '0'}</span>
          </button>

          <button className="flex flex-col items-center gap-1 cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center">
              <MessageCircle size={22} className="text-white" />
            </div>
            <span className="text-white text-[10px] font-bold">0</span>
          </button>

          <button className="flex flex-col items-center gap-1 cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center">
              <Share2 size={20} className="text-white" />
            </div>
            <span className="text-white text-[10px] font-bold">Share</span>
          </button>

          <button onClick={() => { setMuted(m => !m); if (videoRef.current) videoRef.current.muted = !muted; }} className="flex flex-col items-center gap-1 cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center">
              {muted ? <VolumeX size={20} className="text-white" /> : <Volume2 size={20} className="text-white" />}
            </div>
          </button>
        </div>

        {/* Bottom caption */}
        <div className="absolute bottom-0 left-0 right-0 z-30 px-4 pb-6 pt-12 bg-gradient-to-t from-black/80 to-transparent">
          {reel.content && (
            <p className="text-white text-xs leading-relaxed line-clamp-3">{reel.content}</p>
          )}
          <p className="text-white/50 text-[9px] mt-1">
            {new Date(reel.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Desktop prev/next arrows */}
      <button onClick={goPrev} disabled={current === 0} className="hidden md:flex absolute left-4 z-20 w-10 h-10 rounded-full bg-white/10 items-center justify-center cursor-pointer disabled:opacity-30 hover:bg-white/20 transition-all">
        <span className="text-white text-lg">‹</span>
      </button>
      <button onClick={goNext} disabled={current === reels.length - 1} className="hidden md:flex absolute right-4 z-20 w-10 h-10 rounded-full bg-white/10 items-center justify-center cursor-pointer disabled:opacity-30 hover:bg-white/20 transition-all">
        <span className="text-white text-lg">›</span>
      </button>
    </div>
  );
}
