import React, { useState, useEffect, useMemo } from 'react';
import { Story, UserProfile } from '../types';
import { Plus, X, Sparkles, Send, ArrowRight } from 'lucide-react';
import Avatar from './Avatar';
import { resolveAssetUrl } from '../api';

interface StoriesBubbleTrayProps {
  currentUser: UserProfile;
  stories: Story[];
  allUsers: UserProfile[];
  onAddStory: (content: string, image?: string) => void;
  darkMode: boolean;
  onViewUserProfile?: (userId: string) => void;
  onReactToStory?: (storyId: string, emoji: string) => void;
}

const STORY_PRESETS = [
  { name: 'Hardware & Lab', url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&q=80' },
  { name: 'Tech IDE & Code', url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&q=80' },
  { name: 'Team Hub Vibe', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&q=80' },
  { name: 'SaaS Figma UI', url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600&q=80' },
  { name: 'Coffee & Strategy', url: 'https://images.unsplash.com/photo-1507537297725-24a1c029d3ca?w=600&q=80' },
  { name: 'Research Intellect', url: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600&q=80' },
];

export default function StoriesBubbleTray({
  currentUser,
  stories,
  allUsers,
  onAddStory,
  darkMode,
  onViewUserProfile,
  onReactToStory,
}: StoriesBubbleTrayProps) {
  // ── Derived data (computed before hooks so effects can close over them) ──────
  const { groupedStories, flatStories } = useMemo(() => {
    const map = new Map<string, { author: UserProfile; stories: Story[] }>();
    for (const story of stories) {
      const author = allUsers.find((u) => u.id === story.authorId);
      if (!author) continue;
      if (!map.has(author.id)) map.set(author.id, { author, stories: [] });
      map.get(author.id)!.stories.push(story);
    }
    const grouped = Array.from(map.values());
    const flat = grouped.flatMap((g) => g.stories);
    return { groupedStories: grouped, flatStories: flat };
  }, [stories, allUsers]);

  // ── State ────────────────────────────────────────────────────────────────────
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [storyText, setStoryText] = useState('');
  const [selectedPresetUrl, setSelectedPresetUrl] = useState(STORY_PRESETS[0].url);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [useCustomUrl, setUseCustomUrl] = useState(false);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: string; emoji: string; left: number }[]>([]);

  // Clear floating emojis when story changes
  useEffect(() => { setFloatingEmojis([]); }, [activeStoryIndex]);

  // Auto-advance stories (Instagram style, 4s each)
  useEffect(() => {
    if (activeStoryIndex === null) return;
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (activeStoryIndex < flatStories.length - 1) {
            setActiveStoryIndex(activeStoryIndex + 1);
            return 0;
          } else {
            setActiveStoryIndex(null);
            return 0;
          }
        }
        return prev + 2.5;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [activeStoryIndex, flatStories]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleReact = (emoji: string) => {
    if (activeStoryIndex === null) return;
    const currentStory = flatStories[activeStoryIndex];
    if (!currentStory) return;
    onReactToStory?.(currentStory.id, emoji);
    const newId = `${Date.now()}-${Math.random()}`;
    const leftVal = 15 + Math.random() * 70;
    setFloatingEmojis((prev) => [...prev, { id: newId, emoji, left: leftVal }]);
    setTimeout(() => setFloatingEmojis((prev) => prev.filter((i) => i.id !== newId)), 1200);
  };

  const handleCreateStory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyText.trim()) return;
    const finalImage = useCustomUrl ? customImageUrl.trim() : selectedPresetUrl;
    onAddStory(storyText.trim(), finalImage || undefined);
    setStoryText('');
    setCustomImageUrl('');
    setUseCustomUrl(false);
    setIsAddOpen(false);
  };

  const getGroupStartIndex = (groupIdx: number) => {
    let start = 0;
    for (let i = 0; i < groupIdx; i++) start += groupedStories[i].stories.length;
    return start;
  };

  // ── Viewer helpers ────────────────────────────────────────────────────────────
  const currentActiveStory = activeStoryIndex !== null ? flatStories[activeStoryIndex] : null;
  const currentActiveAuthor = currentActiveStory
    ? allUsers.find((u) => u.id === currentActiveStory.authorId)
    : null;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Scrollable Bubble Row */}
      <div className={`p-4 rounded-2xl border border-neutral-200 dark:border-white/10 shadow-sm flex items-center gap-4 overflow-x-auto no-scrollbar scroll-smooth text-left transition-all ${darkMode ? 'bg-[#121217]' : 'bg-white'}`}>

        {/* My Story bubble */}
        <div className="flex flex-col items-center shrink-0 space-y-1">
          <div className="relative">
            <button
              onClick={() => setIsAddOpen(true)}
              className="w-14 h-14 rounded-full border border-dashed border-neutral-300 dark:border-white/30 flex items-center justify-center bg-neutral-100/50 dark:bg-zinc-800/50 hover:border-indigo-500 hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
            >
              <Plus size={16} className="text-[#1A1A1A] dark:text-[#F9F7F2]" />
            </button>
            <span className="absolute bottom-[-1px] right-[-1px] w-5 h-5 bg-gradient-to-tr from-pink-500 to-indigo-600 border border-white dark:border-[#121217] flex items-center justify-center text-[10px] text-white font-extrabold rounded-full shadow-sm">
              +
            </span>
          </div>
          <span className="text-[9px] font-sans tracking-tight font-extrabold text-neutral-400 dark:text-neutral-500 uppercase">My Story</span>
        </div>

        {/* One bubble per user */}
        {groupedStories.length === 0 ? (
          <div className="text-[10px] text-neutral-400 font-mono hidden sm:block uppercase tracking-widest pl-2">
            No live campus pitches shared today. Be the first!
          </div>
        ) : (
          groupedStories.map(({ author, stories: userStories }, groupIdx) => {
            const startIdx = getGroupStartIndex(groupIdx);
            const isActive =
              activeStoryIndex !== null &&
              activeStoryIndex >= startIdx &&
              activeStoryIndex < startIdx + userStories.length;
            return (
              <button
                key={author.id}
                onClick={() => setActiveStoryIndex(startIdx)}
                className="flex flex-col items-center shrink-0 space-y-1 focus:outline-none focus:ring-0 group cursor-pointer"
              >
                <div className={`p-[2px] rounded-full ${isActive ? 'bg-neutral-300 dark:bg-zinc-700' : 'bg-gradient-to-tr from-yellow-500 via-pink-500 to-indigo-600'} transition-all hover:scale-105`}>
                  <div className={`w-13 h-13 rounded-full flex items-center justify-center font-extrabold text-xs border-2 border-white dark:border-[#121217] overflow-hidden ${darkMode ? 'bg-zinc-900 text-white' : 'bg-slate-100 text-slate-900'}`}>
                    <Avatar avatar={author.avatar} />
                  </div>
                </div>
                <span className="text-[10px] font-medium tracking-tight max-w-[64px] truncate text-slate-700 dark:text-slate-300">
                  {author.fullName.split(' ')[0]}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* MODAL: ADD STORY */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className={`w-full max-w-md rounded-2xl border border-neutral-200/50 dark:border-white/15 p-6 shadow-xl ${darkMode ? 'bg-[#121217] text-slate-100' : 'bg-white text-[#1A1A1A]'} text-left space-y-4`}>
            <div className="flex justify-between items-center pb-2 border-b border-neutral-100 dark:border-white/10">
              <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 font-sans">
                <Sparkles size={14} className="text-amber-500 animate-pulse" /> Share Live Story Pitch
              </h3>
              <button onClick={() => setIsAddOpen(false)} className="opacity-70 hover:opacity-100 cursor-pointer p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-zinc-800">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateStory} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 text-neutral-400 dark:text-neutral-500">What is happening in your startup circle? (Max 100 Chars)</label>
                <textarea
                  required
                  maxLength={100}
                  value={storyText}
                  onChange={(e) => setStoryText(e.target.value)}
                  placeholder="e.g., Just coded our live Firebase login flow! Ready for alpha tests..."
                  className={`w-full p-3 font-sans text-xs rounded-xl border border-neutral-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none h-20 ${darkMode ? 'bg-[#09090C] text-white' : 'bg-neutral-50 text-slate-900'}`}
                />
                <span className="text-[9px] font-mono block text-right mt-1 opacity-60">{storyText.length}/100 characters</span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider opacity-75">Story Pitch Backdrop Style</label>
                  <button type="button" onClick={() => setUseCustomUrl(!useCustomUrl)} className="text-[9px] font-mono underline font-bold uppercase tracking-tighter">
                    {useCustomUrl ? 'Use Curated Presets' : 'Use Custom Image URL'}
                  </button>
                </div>

                {useCustomUrl ? (
                  <input
                    type="url"
                    required
                    placeholder="Enter image URL (e.g. https://...)"
                    value={customImageUrl}
                    onChange={(e) => setCustomImageUrl(e.target.value)}
                    className={`w-full px-3 py-2 rounded-none border-2 border-[#1A1A1A] dark:border-[#F9F7F2]/30 focus:outline-none ${darkMode ? 'bg-[#12110f] text-white' : 'bg-neutral-50 text-black'}`}
                  />
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {STORY_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => setSelectedPresetUrl(preset.url)}
                        className={`p-1 border text-[9px] font-bold uppercase text-center relative rounded-none flex flex-col justify-between h-14 overflow-hidden transition-all ${selectedPresetUrl === preset.url ? 'border-[#1A1A1A] dark:border-[#F9F7F2] ring-2 ring-emerald-500' : 'border-neutral-300 dark:border-zinc-800 opacity-70 hover:opacity-100'}`}
                        style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${preset.url})`, backgroundSize: 'cover', backgroundPosition: 'center', color: '#fff' }}
                      >
                        <span className="block truncate max-w-full drop-shadow-md text-white">{preset.name}</span>
                        {selectedPresetUrl === preset.url && (
                          <span className="bg-emerald-500 text-[8px] font-mono text-white px-1 self-center rounded-none shadow-xs mt-auto">ACTIVE</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-[#1A1A1A]/10">
                <button type="submit" className="w-full py-2.5 bg-[#1A1A1A] text-white dark:bg-[#F9F7F2] dark:text-[#1A1A1A] font-bold uppercase text-xs tracking-widest hover:opacity-90 cursor-pointer shadow-[3px_3px_0px_rgba(100,100,100,0.5)] flex items-center justify-center gap-1.5">
                  <Send size={12} /> Broadcast Story
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: IMMERSIVE STORY VIEWER */}
      {currentActiveStory && currentActiveAuthor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-0 sm:p-4 animate-fade-in text-left">
          <div className="absolute inset-0 cursor-pointer" onClick={() => setActiveStoryIndex(null)} />

          <div className="relative w-full max-w-md h-full sm:h-[80vh] bg-zinc-950 sm:border-4 border-zinc-800 text-white flex flex-col justify-between overflow-hidden shadow-2xl z-10 font-sans">

            {/* Background */}
            <div className="absolute inset-0 bg-cover bg-center filter brightness-[0.70] scale-105 transition-all duration-700" style={{ backgroundImage: `url(${resolveAssetUrl(currentActiveStory.image)})` }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/80 z-2" />

            {/* Top bar */}
            <div className="relative z-10 p-4 space-y-3">
              {/* Progress bars — one per story in flat list */}
              <div className="flex gap-1 h-1 w-full bg-white/20">
                {flatStories.map((s, idx) => {
                  let width = '0%';
                  if (activeStoryIndex !== null) {
                    if (idx < activeStoryIndex) width = '100%';
                    else if (idx === activeStoryIndex) width = `${progress}%`;
                  }
                  return (
                    <div key={s.id} className="h-full bg-white/30 flex-1 relative rounded-none overflow-hidden">
                      <div className="h-full bg-white transition-all duration-100 ease-linear" style={{ width }} />
                    </div>
                  );
                })}
              </div>

              {/* Author */}
              <div className="flex items-center justify-between">
                <div
                  onClick={() => { if (onViewUserProfile) { setActiveStoryIndex(null); onViewUserProfile(currentActiveAuthor.id); } }}
                  className={`flex items-center gap-2 ${onViewUserProfile ? 'cursor-pointer hover:opacity-80 transition-all' : ''}`}
                >
                  <div className="w-9 h-9 rounded-full bg-white text-black font-extrabold flex items-center justify-center border border-white overflow-hidden shrink-0">
                    <Avatar avatar={currentActiveAuthor.avatar} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-left">
                      <span className="font-bold uppercase tracking-wide text-xs hover:underline">{currentActiveAuthor.fullName}</span>
                      {currentActiveAuthor.isVerified && (
                        <span className="py-0.5 px-1 bg-white text-black text-[8px] font-bold font-mono">VERIFIED</span>
                      )}
                    </div>
                    <span className="text-[9px] font-mono opacity-80 block truncate max-w-[200px] text-left">{currentActiveAuthor.college}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono opacity-60">
                    {new Date(currentActiveStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button onClick={() => setActiveStoryIndex(null)} className="p-1.5 hover:bg-white/20 transition-colors rounded-none focus:outline-none">
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Prev / Next tap zones */}
            <div className="absolute top-1/2 left-2 right-2 transform -translate-y-1/2 flex justify-between z-10">
              <button
                onClick={() => activeStoryIndex !== null && activeStoryIndex > 0 && setActiveStoryIndex(activeStoryIndex - 1)}
                className={`p-2 bg-black/40 hover:bg-black/60 font-black text-lg w-8 h-8 flex items-center justify-center ${activeStoryIndex === 0 ? 'invisible' : ''}`}
              >‹</button>
              <button
                onClick={() => activeStoryIndex !== null && activeStoryIndex < flatStories.length - 1 && setActiveStoryIndex(activeStoryIndex + 1)}
                className={`p-2 bg-black/40 hover:bg-black/60 font-black text-lg w-8 h-8 flex items-center justify-center ${activeStoryIndex === flatStories.length - 1 ? 'invisible' : ''}`}
              >›</button>
            </div>

            {/* Story content */}
            <div className="relative z-10 px-6 py-8 flex-1 flex flex-col justify-center items-center text-center">
              <div className="p-4 bg-black/70 border border-white/10 rounded-none max-w-sm">
                <p className="text-sm md:text-base font-medium italic select-none leading-relaxed text-white">
                  "{currentActiveStory.content}"
                </p>
              </div>
              <div className="mt-4 inline-flex items-center gap-1 text-[8.5px] font-mono tracking-wider opacity-60 uppercase">
                <span>// Tap sides to flick student stack</span>
              </div>
            </div>

            {/* Reactions */}
            <div className="relative z-10 px-5 pb-3">
              {currentActiveStory.reactions && Object.entries(currentActiveStory.reactions).some(([, count]) => count > 0) ? (
                <div className="flex flex-wrap gap-1.5 justify-center mb-2 animate-fade-in">
                  {Object.entries(currentActiveStory.reactions).map(([emoji, count]) => {
                    if (count === 0) return null;
                    return (
                      <div key={emoji} className="px-2.5 py-1 bg-white/10 border border-white/10 rounded-full text-xs font-bold leading-none flex items-center gap-1.5 cursor-default select-none transition-all hover:scale-105">
                        <span>{emoji}</span>
                        <span className="text-[10px] font-mono text-zinc-300">{count}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-[9px] font-mono opacity-40 uppercase tracking-widest mb-2 select-none">Tap to react</div>
              )}

              <div className="bg-black/50 border border-white/10 p-2 rounded-xl flex items-center justify-around gap-1 backdrop-blur-md">
                {['❤️', '🔥', '🚀', '👏', '💡', '😂'].map((emoji) => (
                  <button key={emoji} onClick={() => handleReact(emoji)} className="text-xl hover:scale-130 active:scale-90 transition-all duration-150 cursor-pointer p-1" title={`React with ${emoji}`}>
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Floating emoji animations */}
            {floatingEmojis.map((fe) => (
              <span key={fe.id} className="absolute bottom-28 select-none text-3xl z-40 pointer-events-none" style={{ left: `${fe.left}%`, animation: 'floatUp 1.2s cubic-bezier(0.25, 1, 0.50, 1) forwards' }}>
                {fe.emoji}
              </span>
            ))}

            {/* Bottom profile snippet */}
            <div className="relative z-10 p-5 bg-black/80 border-t border-white/10 space-y-2">
              <span className="text-[9px] font-mono tracking-widest text-[#FFF]/60 uppercase block">Student Biography snippet</span>
              <p className="text-xs line-clamp-2 text-neutral-300 italic">
                "{currentActiveAuthor.aboutMe || 'No biography written by collaborator.'}"
              </p>
              <div className="pt-2 flex gap-2">
                <div className="flex-1 text-[10px] font-mono">
                  <span className="block text-neutral-400 font-bold">SEEKING:</span>
                  <span className="text-emerald-400 font-bold uppercase truncate">{currentActiveAuthor.lookingFor.join(' • ') || 'General Project Partner'}</span>
                </div>
                <button
                  onClick={() => { setActiveStoryIndex(null); window.location.hash = '#explorer-connect'; }}
                  className="py-1 px-3 bg-white text-black hover:bg-zinc-200 font-bold uppercase text-[9px] tracking-widest flex items-center gap-1 transition-all rounded-none self-center"
                >
                  Match <ArrowRight size={10} />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
