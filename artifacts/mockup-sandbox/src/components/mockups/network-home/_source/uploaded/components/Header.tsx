import React, { useEffect, useRef, useState } from 'react';
import { Search, Bell, X, Sparkles, Building, Hash, UserCheck, Target, BookOpen, Users, CheckCircle2, ChevronRight, ShieldAlert, SlidersHorizontal, UserPlus } from 'lucide-react';
import { User, Community, Post, NavTab } from '../types';
import { SafeAvatar } from './SafeAvatar';
import NetworkLogo from '../../components/NetworkLogo';

interface HeaderProps {
  currentUser: User;
  unreadNotificationsCount?: number;
  onOpenNotifications?: () => void;
  onOpenProfile: (user: User) => void;
  onSelectCommunity: (slug: string) => void;
  onSelectPost?: (post: Post) => void;
  onSelectTab?: (tab: any) => void;
  onMarkAllNotificationsRead?: () => void;
  communities: Community[];
  posts: Post[];
  users: Record<string, User>;
  notifications?: any[];
  onMarkNotificationRead?: (id: string) => void;
  onOpenNotification?: (notification: any) => void;
  onLogout?: () => void;
  activeTab?: NavTab;
  onOpenInvite?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  unreadNotificationsCount = 0,
  onOpenNotifications,
  onOpenProfile,
  onSelectCommunity,
  onSelectPost,
  onSelectTab,
  onMarkAllNotificationsRead,
  communities,
  posts,
  users,
  notifications,
  onMarkNotificationRead,
  onOpenNotification,
  onLogout,
  activeTab,
  onOpenInvite,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  const profileKeywords = [
    ...(currentUser.interests || []),
    ...(currentUser.skills || []),
    ...(currentUser.goals || []),
  ].join(' ').toLowerCase();
  const suggestedCommunities = [...communities]
    .filter((community) => {
      const searchable = `${community.name} ${community.displayName} ${community.description} ${community.slug}`.toLowerCase();
      return profileKeywords && profileKeywords.split(/\s+/).some((keyword) => keyword.length > 2 && searchable.includes(keyword));
    })
    .sort((a, b) => b.membersCount - a.membersCount)
    .slice(0, 3);
  const suggestedStudents = (Object.values(users) as User[])
    .filter((user) => user.id !== currentUser.id)
    .map((user) => ({
      user,
      score: [...(user.interests || []), ...(user.skills || []), ...(user.goals || [])]
        .filter((item) => profileKeywords.includes(item.toLowerCase())).length,
    }))
    .sort((a, b) => b.score - a.score)
    .filter((item) => item.score > 0)
    .slice(0, 3)
    .map((item) => item.user);
  const suggestedCourses = profileKeywords.includes('gate') || profileKeywords.includes('dsa') || profileKeywords.includes('program')
    ? ['DSA & Interview Preparation', 'GATE Preparation', 'System Design']
    : profileKeywords.includes('ai') || profileKeywords.includes('machine') || profileKeywords.includes('python')
      ? ['AI & Machine Learning', 'Python Projects', 'Deep Learning']
      : ['Web Development', 'Data Structures & Algorithms', 'Career Preparation'];

  // Filtered search items
  const matchingCommunities = searchQuery.trim()
    ? communities.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.slug.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const matchingUsers = searchQuery.trim()
    ? (Object.values(users) as User[]).filter(
        (u) =>
          u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.college.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  const matchingPosts = searchQuery.trim()
    ? posts.filter(
        (p) =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  const hasResults =
    matchingCommunities.length > 0 || matchingUsers.length > 0 || matchingPosts.length > 0;

  const closeSearch = () => {
    setSearchQuery('');
    setIsSearchFocused(false);
    setIsSearchOpen(false);
    searchInputRef.current?.blur();
  };

  const openSearch = () => {
    setIsSearchOpen(true);
    setIsSearchFocused(true);
    setIsNotificationsOpen(false);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  useEffect(() => {
    if (activeTab === undefined || activeTab === 'home') return;
    setSearchQuery('');
    setIsSearchFocused(false);
    setIsSearchOpen(false);
    searchInputRef.current?.blur();
  }, [activeTab]);

  useEffect(() => {
    if (!isSearchOpen) return;
    const closeSearchOnOutsideTap = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        closeSearch();
      }
    };
    document.addEventListener('pointerdown', closeSearchOnOutsideTap);
    return () => document.removeEventListener('pointerdown', closeSearchOnOutsideTap);
  }, [isSearchOpen]);

  return (
    <header ref={headerRef} className={`top-nav network-top-nav h-14 lg:h-[72px] sticky top-0 z-40 px-3 sm:px-8 flex items-center justify-between shadow-xs ${isSearchOpen ? 'search-open' : ''}`}>
      <div className="network-header-inner w-full max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand mark also opens the profile and personalization menu. */}
        <div className="network-header-brand relative flex shrink-0 items-center">
          <button
            onClick={() => {
              setIsSearchOpen(false);
              setIsSearchFocused(false);
              setIsProfileMenuOpen((open) => !open);
            }}
            className="flex items-center gap-2 rounded-xl p-1 text-left transition-colors hover:bg-slate-100 cursor-pointer"
            aria-label="Manage profile and personalize feed"
            aria-expanded={isProfileMenuOpen}
          >
            <NetworkLogo size={32} className="rounded-lg shadow-sm" />
            <span className="block">
              <span className="block text-xs font-black leading-tight text-slate-900">The Network</span>
              <span className="mt-0.5 block text-[9px] font-medium leading-tight text-slate-400">Connect. Learn. Grow.</span>
            </span>
          </button>
          {isProfileMenuOpen && (
            <>
              <button
                aria-label="Close profile menu"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setIsProfileMenuOpen(false)}
              />
              <aside className={`fixed left-0 right-0 bottom-0 z-50 ${isSearchOpen ? 'top-[104px] h-[calc(100dvh-104px)]' : 'top-[60px] h-[calc(100dvh-60px)]'} max-h-none overflow-y-auto overscroll-contain rounded-none border-0 bg-white p-3 pb-[calc(5.75rem+env(safe-area-inset-bottom))] shadow-none sm:left-3 sm:right-auto sm:bottom-auto sm:top-16 sm:h-auto sm:max-h-[calc(100dvh-72px)] sm:w-[390px] sm:rounded-3xl sm:border sm:border-slate-200 sm:p-4 sm:shadow-2xl`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Your feed setup</p>
                    <h2 className="text-lg font-black text-slate-900 mt-1">Manage your profile</h2>
                    <p className="text-[11px] text-slate-500 mt-1">Tell Network what you are doing so we can show better communities, courses and students.</p>
                  </div>
                  <button onClick={() => setIsProfileMenuOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer" aria-label="Close">
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </div>

                <div className="mt-4 rounded-2xl bg-indigo-50 border border-indigo-100 p-3">
                  <div className="flex items-center gap-3">
                    <SafeAvatar src={currentUser.avatar} name={currentUser.name} className="w-11 h-11 rounded-full object-cover ring-2 ring-white" />
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900 truncate">{currentUser.name}</p>
                      <p className="text-[10px] text-slate-600 truncate">{currentUser.college} · {currentUser.branch}</p>
                    </div>
                    {currentUser.verified && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto shrink-0" />}
                  </div>
                  <button
                    onClick={() => { setIsProfileMenuOpen(false); onOpenProfile(currentUser); }}
                    className="w-full mt-3 py-2 rounded-xl bg-white border border-indigo-100 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100/60 cursor-pointer"
                  >
                    Edit full profile
                  </button>
                  {currentUser.role === 'admin' && (
                    <button
                      onClick={() => { setIsProfileMenuOpen(false); onSelectTab?.('admin'); }}
                      className="w-full mt-2 py-2 rounded-xl bg-rose-600 text-white text-[11px] font-bold hover:bg-rose-700 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Open Admin Center
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-2 mt-3">
                  <div className="rounded-2xl border border-slate-200 p-2.5 sm:p-3">
                    <div className="flex items-center gap-1.5 text-indigo-600"><Sparkles className="w-3.5 h-3.5" /><span className="text-[10px] font-black uppercase">Doing</span></div>
                    <p className="text-[11px] font-semibold text-slate-700 mt-2 line-clamp-3">{currentUser.bio || 'Add what you are working on.'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-2.5 sm:p-3">
                    <div className="flex items-center gap-1.5 text-amber-600"><Target className="w-3.5 h-3.5" /><span className="text-[10px] font-black uppercase">Goals</span></div>
                    <p className="text-[11px] font-semibold text-slate-700 mt-2 line-clamp-3">{currentUser.goals?.join(' · ') || currentUser.interests?.join(' · ') || 'Add your goals.'}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /><h3 className="text-xs font-black text-slate-900">What you have done</h3></div>
                  {(currentUser.projects || []).slice(0, 2).map((project) => (
                    <div key={project.title} className="rounded-xl bg-slate-50 border border-slate-100 p-2.5">
                      <p className="text-[11px] font-bold text-slate-800">{project.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{project.description}</p>
                    </div>
                  ))}
                  {(!currentUser.projects || currentUser.projects.length === 0) && <p className="text-[11px] text-slate-500 rounded-xl bg-slate-50 p-2.5">Add projects and achievements to improve your suggestions.</p>}
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><Users className="w-4 h-4 text-indigo-500" /><h3 className="text-xs font-black text-slate-900">Suggested communities</h3></div><button onClick={() => { setIsProfileMenuOpen(false); onSelectTab?.('communities'); }} className="text-[10px] font-bold text-indigo-600 cursor-pointer">See all</button></div>
                  <div className="space-y-1.5">
                    {(suggestedCommunities.length ? suggestedCommunities : communities.slice(0, 3)).map((community) => (
                      <button key={community.id} onClick={() => { setIsProfileMenuOpen(false); onSelectCommunity(community.slug); }} className="w-full flex items-center gap-2.5 rounded-xl p-2 hover:bg-slate-50 text-left cursor-pointer">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black ${community.iconBg}`}>{community.name.slice(0, 2).toUpperCase()}</span>
                        <span className="min-w-0 flex-1"><span className="block text-[11px] font-bold text-slate-800 truncate">{community.displayName || community.name}</span><span className="block text-[10px] text-slate-400">{community.membersCount.toLocaleString()} students</span></span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-purple-500" /><h3 className="text-xs font-black text-slate-900">Courses for you</h3></div><button onClick={() => { setIsProfileMenuOpen(false); onSelectTab?.('learn'); }} className="text-[10px] font-bold text-indigo-600 cursor-pointer">Explore</button></div>
                  <div className="flex flex-wrap gap-1.5">{suggestedCourses.map((course) => <button key={course} onClick={() => { setIsProfileMenuOpen(false); onSelectTab?.('learn'); }} className="px-2.5 py-1.5 rounded-lg bg-purple-50 border border-purple-100 text-[10px] font-bold text-purple-700 cursor-pointer">{course}</button>)}</div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2"><UserCheck className="w-4 h-4 text-emerald-500" /><h3 className="text-xs font-black text-slate-900">Students to connect with</h3></div>
                  <div className="space-y-1.5">
                    {(suggestedStudents.length ? suggestedStudents : (Object.values(users) as User[]).filter((u) => u.id !== currentUser.id).slice(0, 3)).map((student) => (
                      <button key={student.id} onClick={() => { setIsProfileMenuOpen(false); onOpenProfile(student); }} className="w-full flex items-center gap-2.5 rounded-xl p-2 hover:bg-slate-50 text-left cursor-pointer">
                        <SafeAvatar src={student.avatar} name={student.name} className="w-7 h-7 rounded-full object-cover" />
                        <span className="min-w-0 flex-1"><span className="block text-[11px] font-bold text-slate-800 truncate">{student.name}</span><span className="block text-[10px] text-slate-400 truncate">{student.college} · {student.branch}</span></span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                      </button>
                    ))}
                  </div>
                </div>

                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onLogout();
                    }}
                    className="mt-4 w-full rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-left text-[11px] font-black text-rose-600 transition-colors hover:bg-rose-100 cursor-pointer"
                  >
                    Sign out
                  </button>
                )}
              </aside>
            </>
          )}
        </div>

        {/* Global Search Bar */}
        <form
          className={`network-header-search relative flex min-w-0 flex-1 max-w-xl items-center gap-2 ${isSearchOpen ? 'mobile-search-open' : 'mobile-search-closed'}`}
          onSubmit={(event) => {
            event.preventDefault();
            closeSearch();
          }}
        >
          <button
            type="button"
            className="network-filter-button order-first hidden shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer"
            aria-label="Search filters"
            title="Search filters"
            onClick={openSearch}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>

          <div
            className={`search-bar flex min-w-0 flex-1 items-center gap-2.5 px-4 py-2.5 transition-all duration-200 border ${
              isSearchFocused
                ? 'bg-white border-indigo-400 ring-2 ring-indigo-100 shadow-sm'
                : 'border-transparent hover:bg-slate-100/90'
            }`}
          >
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              id="global-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={openSearch}
              onFocus={openSearch}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
              placeholder="Search people, communities, colleges, students..."
              className="w-full text-xs sm:text-sm text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete dropdown */}
          {isSearchFocused && searchQuery.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden z-50 animate-in fade-in duration-150">
              {hasResults ? (
                <div className="max-h-96 overflow-y-auto p-2 space-y-3 divide-y divide-slate-50">
                  {/* Communities */}
                  {matchingCommunities.length > 0 && (
                    <div className="pt-1">
                      <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Hash className="w-3 h-3 text-indigo-500" /> Communities
                      </div>
                      {matchingCommunities.slice(0, 3).map((comm) => (
                        <div
                          key={comm.id}
                          onClick={() => {
                            closeSearch();
                            onSelectCommunity(comm.slug);
                          }}
                          className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 font-mono font-bold text-xs flex items-center justify-center">
                              {comm.slug}
                            </span>
                            <div>
                              <p className="text-xs font-semibold text-slate-800">
                                {comm.slug}
                              </p>
                              <p className="text-[11px] text-slate-500 line-clamp-1">
                                {comm.displayName}
                              </p>
                            </div>
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {(comm.membersCount / 1000).toFixed(1)}k members
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* People */}
                  {matchingUsers.length > 0 && (
                    <div className="pt-2">
                      <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <UserCheck className="w-3 h-3 text-emerald-500" /> Students & Mentors
                      </div>
                      {matchingUsers.slice(0, 3).map((u) => (
                        <div
                          key={u.id}
                          onClick={() => {
                            closeSearch();
                            onOpenProfile(u);
                          }}
                          className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <img
                              src={u.avatar}
                              alt={u.name}
                              className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-100"
                            />
                            <div>
                              <div className="flex items-center gap-1">
                                <p className="text-xs font-semibold text-slate-800">
                                  {u.name}
                                </p>
                                {u.verified && (
                                  <span className="text-[10px] text-emerald-600 font-bold">
                                    ✓
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500">
                                {u.college} · {u.branch}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Posts */}
                  {matchingPosts.length > 0 && (
                    <div className="pt-2">
                      <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-amber-500" /> Discussions & Posts
                      </div>
                      {matchingPosts.slice(0, 3).map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            closeSearch();
                            onSelectPost?.(p);
                          }}
                          className="px-3 py-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <p className="text-xs font-semibold text-slate-800 line-clamp-1">
                            {p.title}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            in <span className="font-semibold text-indigo-600">{p.communitySlug}</span> by {p.author.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400 text-xs">
                  No matching people, communities or discussions found for "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </form>

        {/* Right Nav Icons */}
        <div className="network-header-actions flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Mobile Search Toggle */}
          <button
            type="button"
            onClick={openSearch}
            className="network-search-toggle flex sm:hidden relative p-2 rounded-full hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            title="Open search"
            aria-label="Open search"
            aria-expanded={isSearchOpen}
          >
            <Search className="w-5 h-5 text-slate-700" />
          </button>
          {/* Invite students */}
          <button
            type="button"
            onClick={() => {
              setIsSearchOpen(false);
              setIsSearchFocused(false);
              setIsNotificationsOpen(false);
              onOpenInvite?.();
            }}
            className="relative rounded-full p-2 text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
            title="Invite students"
            aria-label="Invite students"
          >
            <UserPlus className="h-5 w-5 text-indigo-600" />
          </button>
          {/* Notification Bell with Badge */}
          <button
            onClick={() => {
              setIsSearchOpen(false);
              setIsSearchFocused(false);
              setIsNotificationsOpen((open) => !open);
            }}
            id="header-notification-button"
            className="relative p-2 rounded-full hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-slate-700" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute 1 top-1 right-1 w-4 h-4 bg-rose-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center shadow-sm">
                {unreadNotificationsCount}
              </span>
            )}
          </button>
          {isNotificationsOpen && (
            <div className="absolute right-2 sm:right-8 top-12 lg:top-16 z-50 w-[min(360px,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-black text-slate-900">Notifications</h2>
                  {unreadNotificationsCount > 0 && <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-black text-white">{unreadNotificationsCount}</span>}
                </div>
                {unreadNotificationsCount > 0 && (
                  <button onClick={onMarkAllNotificationsRead} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-[min(60vh,420px)] overflow-y-auto">
                {(notifications || []).length === 0 ? (
                  <div className="px-4 py-12 text-center">
                    <Bell className="mx-auto h-7 w-7 text-slate-300" />
                    <p className="mt-2 text-xs font-bold text-slate-600">You’re all caught up</p>
                    <p className="mt-1 text-[11px] text-slate-400">Likes, messages and connections will appear here.</p>
                  </div>
                ) : (
                  (notifications || []).map((notification: any) => (
                    <button
                      key={notification.id}
                      onClick={() => {
                        if (notification.unread) onMarkNotificationRead?.(notification.id);
                        if (onOpenNotification) {
                          // Older community-message notifications predate the
                          // stored community marker. Resolve those by title so
                          // the existing notification history remains useful.
                          const title = String(notification.title || '').toLowerCase();
                          const legacyCommunity = communities.find((community) => {
                            const names = [community.name, community.displayName]
                              .filter(Boolean)
                              .map((name) => name.toLowerCase());
                            return names.some((name) => name.length > 2 && title.includes(name));
                          });
                          onOpenNotification({
                            ...notification,
                            communityId: notification.communityId || (
                              notification.type === 'community' ? legacyCommunity?.id : undefined
                            ),
                          });
                          setIsNotificationsOpen(false);
                          return;
                        }
                        if (notification.type === 'connection_request') onSelectTab?.('connect');
                        setIsNotificationsOpen(false);
                      }}
                      className={`flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 cursor-pointer ${notification.unread ? 'bg-indigo-50/60' : 'bg-white'}`}
                    >
                       <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${notification.unread ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                          {notification.type === 'message' ? '💬' : notification.type === 'upvote' ? '♥' : notification.type === 'connection_request' ? '👋' : notification.type === 'poll' ? '📊' : notification.type === 'community_post' ? '📢' : '🔔'}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-bold text-slate-800">{notification.title}</span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">{notification.subtitle}</span>
                        <span className="mt-1 block text-[10px] text-slate-400">{notification.timestamp}</span>
                      </span>
                      {notification.unread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-indigo-600" />}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* User Profile Avatar with Online Status */}
          <button
            onClick={() => onOpenProfile(currentUser)}
            id="header-user-profile-button"
            className="relative flex items-center gap-2 p-0.5 rounded-full hover:ring-2 hover:ring-indigo-300 transition-all cursor-pointer"
            title="My Student Profile"
          >
            <SafeAvatar
              src={currentUser.avatar}
              name={currentUser.name}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-100 shadow-sm"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
          </button>
        </div>
      </div>
    </header>
  );
};
