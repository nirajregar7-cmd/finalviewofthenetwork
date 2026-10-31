import React, { useState, useEffect } from 'react';
import { UserProfile, Connection, Post, Community, DirectMessage, Story, CampusEvent } from '../types';
import { api } from '../api';
import { Users, BookOpen, MessageSquare, GraduationCap, Award, ShieldCheck, ArrowRight, Compass, Sparkles, AlertCircle } from 'lucide-react';
import StoriesBubbleTray from './StoriesBubbleTray';
import Avatar from './Avatar';
import { getEducationDisplay } from '../utils/education';

interface DashboardSectionProps {
  currentUser: UserProfile;
  connections: Connection[];
  posts: Post[];
  communities: Community[];
  messages: DirectMessage[];
  allUsers: UserProfile[];
  onNavigate: (view: string) => void;
  darkMode: boolean;
  stories: Story[];
  onAddStory: (content: string, image?: string) => void;
  registeredEvents: string[];
  onRegisterEvent: (eventId: string) => void;
  onReactToStory?: (storyId: string, emoji: string) => void;
}

export default function DashboardSection({
  currentUser,
  connections,
  posts,
  communities,
  messages,
  allUsers,
  onNavigate,
  darkMode,
  stories,
  onAddStory,
  registeredEvents,
  onRegisterEvent,
  onReactToStory
}: DashboardSectionProps) {
  
  // Calculate stats
  const activeConnections = connections.filter(
    c => (c.senderId === currentUser.id || c.receiverId === currentUser.id) && c.status === 'accepted'
  );
  
  const pendingIncoming = connections.filter(
    c => c.receiverId === currentUser.id && c.status === 'pending'
  );

  const pendingOutgoing = connections.filter(
    c => c.senderId === currentUser.id && c.status === 'pending'
  );

  const authoredPosts = posts.filter(p => p.authorId === currentUser.id);

  const joinedCommunities = communities.filter(c => c.memberIds.includes(currentUser.id));

  // Determine unique active chat buddies
  const chatPartnerIds = Array.from(
    new Set(
      messages
        .filter(m => m.senderId === currentUser.id || m.receiverId === currentUser.id)
        .map(m => (m.senderId === currentUser.id ? m.receiverId : m.senderId))
    )
  );
  const recentChatsCount = chatPartnerIds.length;

  // Find recommended peers based on interest overlaps
  const recommendedPeers = allUsers
    .filter(u => u.id !== currentUser.id && !u.isSuspended)
    .map(u => {
      const overlapInterest = u.interests.filter(i => currentUser.interests.includes(i)).length;
      const overlapSkills = u.skills.filter(s => currentUser.skills.includes(s)).length;
      return { user: u, matches: overlapInterest * 2 + overlapSkills };
    })
    .sort((a, b) => b.matches - a.matches)
    .slice(0, 3);

  // Hardcoded academic events relevant for student discovery & welcoming hub
  const [campusEvents, setCampusEvents] = useState<CampusEvent[]>([]);

  useEffect(() => {
    api.events.getAll().then((data: CampusEvent[]) => setCampusEvents(data)).catch(() => {});
  }, []);

  const handleDashboardRegister = async (ev: CampusEvent) => {
    const isReg = ev.registeredIds.includes(currentUser.id);
    try {
      const updated = isReg
        ? await api.events.unregister(ev.id, currentUser.id)
        : await api.events.register(ev.id, currentUser.id);
      setCampusEvents(prev => prev.map(e => e.id === ev.id ? updated : e));
    } catch {}
  };

  return (
    <div className="space-y-6">
      
      {/* Immersive Startup Stories Bubble Tray */}
      <StoriesBubbleTray
        currentUser={currentUser}
        stories={stories}
        allUsers={allUsers}
        onAddStory={onAddStory}
        darkMode={darkMode}
        onReactToStory={onReactToStory}
      />
      
      {/* Visual greeting and banner */}
      <div className={`p-6 lg:p-8 rounded-2xl border border-neutral-200 dark:border-white/10 shadow-sm transition-all ${darkMode ? 'bg-[#121217]' : 'bg-white'}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 text-left">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-serif italic font-extrabold tracking-tight uppercase">
                Welcome back, {currentUser.fullName}.
              </h1>
              {currentUser.isVerified ? (
                <span className="inline-flex items-center gap-1 py-0.5 px-2.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                  <ShieldCheck size={11} /> Verified Peer
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 py-0.5 px-2.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider bg-amber-500/15 text-amber-600">
                  <AlertCircle size={11} /> Unverified
                </span>
              )}
            </div>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-neutral-500'}`}>
              Institutional Seat: <span className="font-bold underline text-indigo-500 dark:text-indigo-400">{currentUser.college}</span> • {getEducationDisplay(currentUser).compact}
            </p>
          </div>
          
          <button
            id="dash-explore-btn"
            onClick={() => onNavigate('explore')}
            className="inline-flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm"
          >
            <span>Explore Peer Network</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* Grid statistics metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className={`p-4 rounded-2xl border border-neutral-200 dark:border-white/10 shadow-sm flex items-center justify-between transition-all ${darkMode ? 'bg-[#121217]' : 'bg-white'}`}>
          <div className="space-y-1 text-left">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#8F8F9F]">
              Team Connections
            </span>
            <p className="text-2xl font-sans font-black">{activeConnections.length}</p>
            {pendingIncoming.length > 0 ? (
              <span onClick={() => onNavigate('explore')} className="text-[9px] text-rose-500 font-bold hover:underline cursor-pointer block uppercase tracking-wide">
                [{pendingIncoming.length} Needs Review]
              </span>
            ) : (
              <span className="text-[9px] text-slate-400 font-mono">Real-time status</span>
            )}
          </div>
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
            <Users size={15} />
          </div>
        </div>

        <div className={`p-4 rounded-2xl border border-neutral-200 dark:border-white/10 shadow-sm flex items-center justify-between transition-all ${darkMode ? 'bg-[#121217]' : 'bg-white'}`}>
          <div className="space-y-1 text-left">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#8F8F9F]">
              Startup Pitches
            </span>
            <p className="text-2xl font-sans font-black">{authoredPosts.length}</p>
            <span onClick={() => onNavigate('feed')} className="text-[9px] hover:text-indigo-500 cursor-pointer block font-bold text-slate-500 dark:text-slate-500">
              Share a dispatch →
            </span>
          </div>
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
            <BookOpen size={15} />
          </div>
        </div>

        <div className={`p-4 rounded-2xl border border-neutral-200 dark:border-white/10 shadow-sm flex items-center justify-between transition-all ${darkMode ? 'bg-[#121217]' : 'bg-white'}`}>
          <div className="space-y-1 text-left">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#8F8F9F]">
              Hub Chapters
            </span>
            <p className="text-2xl font-sans font-black">{joinedCommunities.length}</p>
            <span onClick={() => onNavigate('communities')} className="text-[9px] hover:text-indigo-500 cursor-pointer block font-bold text-slate-500 dark:text-slate-500">
              Lookup new hubs
            </span>
          </div>
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
            <Award size={15} />
          </div>
        </div>

        <div className={`p-4 rounded-2xl border border-neutral-200 dark:border-white/10 shadow-sm flex items-center justify-between transition-all ${darkMode ? 'bg-[#121217]' : 'bg-white'}`}>
          <div className="space-y-1 text-left">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#8F8F9F]">
              Total Chats
            </span>
            <p className="text-2xl font-sans font-black">{recentChatsCount}</p>
            <span onClick={() => onNavigate('messages')} className="text-[9px] hover:text-indigo-500 cursor-pointer block font-bold text-slate-500 dark:text-slate-500">
              Refreshed active list
            </span>
          </div>
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
            <MessageSquare size={15} />
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        
        {/* Recommended Peers Block */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-200 dark:border-white/10 pb-2">
            <h2 className="text-xs font-bold tracking-widest uppercase flex items-center gap-1.5 opacity-80 text-slate-500 dark:text-slate-500 font-sans">
              <Sparkles size={14} className="text-indigo-500 animate-pulse" /> Recommended Peer Overlaps
            </h2>
            <span onClick={() => onNavigate('explore')} className="text-xs text-indigo-500 dark:text-indigo-400 cursor-pointer hover:underline font-bold">
              See list
            </span>
          </div>

          <div className="space-y-3">
            {recommendedPeers.map(({ user, matches }) => {
              const matchedInterests = user.interests.filter(i => currentUser.interests.includes(i));
              return (
                <div
                  id={`match-card-${user.id}`}
                  key={user.id}
                  className={`p-4 rounded-2xl border border-neutral-200/80 dark:border-white/10 flex items-start gap-4 transition-all hover:shadow-xs ${darkMode ? 'bg-[#121217] hover:bg-[#1C1C24]' : 'bg-white hover:bg-neutral-50'}`}
                >
                  <div className="p-[2px] rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-600 shrink-0">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm border border-white dark:border-[#121217] overflow-hidden ${darkMode ? 'bg-zinc-900 text-white' : 'bg-slate-100 text-slate-900'}`}>
                      <Avatar avatar={user.avatar} />
                    </div>
                  </div>
                  
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">{user.fullName}</h4>
                      <span className="text-[10px] font-mono font-bold text-indigo-500">
                        {matches > 0 ? `${matches} Overlaps` : 'New Peer Joined'}
                      </span>
                    </div>
                    
                    <p className="text-[10px] font-mono text-neutral-500">
                      {user.college} • {getEducationDisplay(user).compact}
                    </p>
                    
                    <p className={`text-xs italic leading-relaxed py-0.5 line-clamp-2 ${darkMode ? 'text-slate-300' : 'text-neutral-600'}`}>
                      "{user.aboutMe}"
                    </p>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {matchedInterests.slice(0, 3).map((interest) => (
                        <span key={interest} className="text-[9px] font-semibold py-0.5 px-2 rounded-full border border-neutral-300 dark:border-white/5 bg-neutral-50 dark:bg-white/5 text-slate-500 dark:text-slate-400">
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    id={`btn-match-view-${user.id}`}
                    onClick={() => onNavigate('explore')}
                    className="py-1 px-3 rounded-lg border border-neutral-200 dark:border-white/10 text-[10px] font-bold text-indigo-500 dark:text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all cursor-pointer bg-neutral-50 dark:bg-white/5 shrink-0"
                  >
                    Details
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Campus Events block and Study Groups */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold tracking-widest uppercase flex items-center gap-1.5 opacity-80 text-slate-500 dark:text-slate-500 border-b border-neutral-200 dark:border-white/10 pb-2">
            <Compass size={14} className="text-indigo-400" /> Live Campus Events
          </h2>

          <div className="space-y-3">
            {campusEvents.length === 0 ? (
              <p className="text-[11px] text-slate-400 text-center py-4">No events yet — post one in the Events tab!</p>
            ) : campusEvents.map((event) => {
              const isRegistered = event.registeredIds.includes(currentUser.id);
              const spotsLeft = event.maxSeats ? event.maxSeats - event.registeredIds.length : null;
              const isFull = spotsLeft !== null && spotsLeft <= 0 && !isRegistered;
              return (
                <div
                  id={`event-card-${event.id}`}
                  key={event.id}
                  className={`p-4 rounded-2xl border border-neutral-200 dark:border-white/10 flex flex-col justify-between transition-all ${darkMode ? 'bg-[#121217]' : 'bg-white'}`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="inline-block py-0.5 px-2 text-[8px] font-bold uppercase tracking-wider rounded-full bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                        {event.category}
                      </span>
                      <span className="text-[10px] font-mono opacity-50">
                        {event.date}{event.time ? ` · ${event.time}` : ''}
                      </span>
                    </div>
                    
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{event.title}</h4>
                    
                    <p className={`text-xs opacity-75 leading-relaxed text-left ${darkMode ? 'text-slate-300' : 'text-neutral-600'}`}>
                      {event.description}
                    </p>
                    {event.venue && (
                      <p className="text-[10px] text-slate-400 font-mono">📍 {event.venue}</p>
                    )}
                  </div>

                  <div className="mt-3.5 pt-2.5 border-t border-dashed border-neutral-100 dark:border-white/5 flex items-center justify-between text-[10px]">
                    <span className="italic opacity-50 truncate max-w-[110px]">
                      by {event.organizer}
                    </span>
                    <button
                      id={`btn-join-event-${event.id}`}
                      onClick={() => handleDashboardRegister(event)}
                      disabled={isFull}
                      className={`text-[9px] font-bold uppercase tracking-wider cursor-pointer font-sans px-2.5 py-1 rounded-md transition-all ${isRegistered ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : isFull ? 'bg-neutral-100 dark:bg-white/5 text-slate-400 cursor-not-allowed' : 'bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white'}`}
                    >
                      {isRegistered ? '✓ Seat Reserved' : isFull ? 'Full' : 'Register Seat'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
