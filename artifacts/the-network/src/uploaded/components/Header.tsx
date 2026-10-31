import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Bell, X, Sparkles, Hash, UserCheck, ChevronRight, SlidersHorizontal, Trophy, CalendarDays, FileText, UsersRound, Send, LayoutDashboard, Plus, LogOut } from 'lucide-react';
import { User, Community, Post, NavTab } from '../types';
import { SafeAvatar } from './SafeAvatar';
import NetworkLogo from '../../components/NetworkLogo';

type LauncherDestination = 'compete' | 'workshops' | 'resources' | 'mentors' | 'my-space';

const APP_LAUNCHER_ITEMS: {
  id: LauncherDestination;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}[] = [
  {
    id: 'compete',
    title: 'Compete',
    description: 'Hackathons, contests and project challenges',
    icon: Trophy,
  },
  {
    id: 'workshops',
    title: 'Workshops & Events',
    description: 'Technical workshops, webinars and college events',
    icon: CalendarDays,
  },
  {
    id: 'resources',
    title: 'Resources',
    description: 'Notes, roadmaps, papers and useful learning material',
    icon: FileText,
  },
  {
    id: 'mentors',
    title: 'Guidance & Mentorship',
    description: 'Career advice, internship guidance and learn from seniors',
    icon: UsersRound,
  },
  {
    id: 'my-space',
    title: 'My Space',
    description: 'Manage your communities and groups',
    icon: LayoutDashboard,
  },
];

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
  activeTab?: NavTab;
  onOpenInvite?: () => void;
  onOpenCreatePost?: () => void;
  onLogout: () => void;
  showCompete?: boolean;
  onNavigateFromLauncher?: (destination: LauncherDestination) => void;
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
  activeTab,
  onOpenInvite,
  onOpenCreatePost,
  onLogout,
  showCompete = true,
  onNavigateFromLauncher,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const launcherTriggerRef = useRef<HTMLButtonElement>(null);

  // Defer filtering the larger student and feed collections so the input
  // updates immediately while results catch up in the background.
  const deferredSearchQuery = useDeferredValue(searchQuery).trim().toLocaleLowerCase();
  const matchingCommunities = useMemo(() => deferredSearchQuery
    ? communities.filter((community) =>
        community.name.toLowerCase().includes(deferredSearchQuery) ||
        community.displayName.toLowerCase().includes(deferredSearchQuery) ||
        community.slug.toLowerCase().includes(deferredSearchQuery))
    : [], [communities, deferredSearchQuery]);

  const matchingUsers = useMemo(() => deferredSearchQuery
    ? (Object.values(users) as User[]).filter((user) =>
        user.name.toLowerCase().includes(deferredSearchQuery) ||
        user.college.toLowerCase().includes(deferredSearchQuery) ||
        user.skills.some((skill) => skill.toLowerCase().includes(deferredSearchQuery)))
    : [], [deferredSearchQuery, users]);

  const matchingPosts = useMemo(() => deferredSearchQuery
    ? posts.filter((post) =>
        post.title.toLowerCase().includes(deferredSearchQuery) ||
        post.content.toLowerCase().includes(deferredSearchQuery) ||
        post.tags?.some((tag) => tag.toLowerCase().includes(deferredSearchQuery)))
    : [], [deferredSearchQuery, posts]);

  const hasResults =
    matchingCommunities.length > 0 || matchingUsers.length > 0 || matchingPosts.length > 0;

  const closeLauncher = () => {
    setIsLauncherOpen(false);
    launcherTriggerRef.current?.focus();
  };

  useEffect(() => {
    if (!isLauncherOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeLauncher();
    };
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isLauncherOpen]);

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
    <header ref={headerRef} className={`top-nav network-top-nav h-14 lg:h-[72px] sticky top-0 ${isLauncherOpen ? 'z-[210]' : 'z-40'} px-3 sm:px-8 flex items-center justify-between shadow-xs ${isSearchOpen ? 'search-open' : ''}`}>
      <div className="network-header-inner w-full max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand mark opens the app launcher. */}
        <div className="network-header-brand relative flex shrink-0 items-center">
          <button
            ref={launcherTriggerRef}
            type="button"
            onClick={() => {
              closeSearch();
              setIsNotificationsOpen(false);
              setIsLauncherOpen((open) => !open);
            }}
            className="flex items-center gap-2 rounded-xl p-1 text-left transition-colors hover:bg-slate-100 cursor-pointer"
            aria-label="Open The Network menu"
            aria-expanded={isLauncherOpen}
            aria-controls="network-app-launcher"
            data-testid="button-open-app-launcher"
          >
            <NetworkLogo size={32} className="rounded-lg shadow-sm" />
            <span className="block">
              <span className="block text-xs font-black leading-tight text-slate-900">The Network</span>
              <span className="mt-0.5 block text-[9px] font-medium leading-tight text-slate-400">Connect. Learn. Grow.</span>
            </span>
          </button>
          {isLauncherOpen && createPortal(
            <div className="fixed inset-0 z-[200] flex" data-testid="network-app-launcher">
              <button
                type="button"
                aria-label="Close app menu"
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px]"
                onClick={closeLauncher}
                data-testid="button-close-app-launcher-backdrop"
              />
              <aside
                id="network-app-launcher"
                role="dialog"
                aria-modal="true"
                aria-labelledby="network-app-launcher-title"
                className="relative z-10 flex h-[100dvh] w-[min(88vw,420px)] shrink-0 flex-col overflow-hidden overscroll-contain bg-gradient-to-b from-white via-white to-violet-50/60 px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-[max(24px,env(safe-area-inset-top))] shadow-2xl"
              >
                <div className="mb-5 flex items-center justify-between gap-3 px-1.5">
                  <div className="flex min-w-0 items-center gap-4">
                    <NetworkLogo size={50} className="shrink-0 rounded-[13px] shadow-sm" />
                    <div className="min-w-0">
                      <h2 id="network-app-launcher-title" className="truncate text-[18px] font-black leading-tight text-slate-950">
                        The Network
                      </h2>
                      <p className="mt-1 text-[13px] leading-tight text-slate-500">Connect. Learn. Grow.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={closeLauncher}
                    aria-label="Close app menu"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-800"
                    data-testid="button-close-app-launcher"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <nav aria-label="The Network sections" className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pb-4">
                  {APP_LAUNCHER_ITEMS
                  .filter((item) => item.id !== 'compete' || showCompete)
                    .map(({ id, title, description, icon: Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          closeLauncher();
                          onNavigateFromLauncher?.(id);
                        }}
                        className="group flex min-h-[88px] w-full items-center gap-3.5 rounded-[20px] border border-slate-200/80 bg-white/90 px-3.5 py-3 text-left shadow-[0_2px_10px_rgba(15,23,42,0.025)] transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:bg-white hover:shadow-md active:scale-[0.99]"
                        data-testid={`button-launcher-${id}`}
                      >
                        <span className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[17px] bg-gradient-to-br from-violet-50 to-indigo-50 text-violet-600 ring-1 ring-violet-100/80 transition-colors group-hover:from-violet-100 group-hover:to-indigo-100">
                          <Icon className="h-[26px] w-[26px]" strokeWidth={1.9} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-extrabold leading-tight text-slate-950">{title}</span>
                          <span className="mt-1.5 block text-[12px] leading-[1.35] text-slate-500">{description}</span>
                        </span>
                        <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-violet-500" />
                      </button>
                    ))}
                  <button
                    type="button"
                    onClick={() => {
                      closeLauncher();
                      onOpenInvite?.();
                    }}
                    className="group mt-1 flex min-h-[84px] w-full items-center gap-3.5 rounded-[20px] border border-slate-200/80 bg-white/90 px-3.5 py-3 text-left shadow-[0_2px_10px_rgba(15,23,42,0.025)] transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md active:scale-[0.99]"
                    data-testid="button-launcher-invite"
                  >
                    <span className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[17px] bg-gradient-to-br from-violet-50 to-indigo-50 text-violet-600 ring-1 ring-violet-100/80 transition-colors group-hover:from-violet-100 group-hover:to-indigo-100">
                      <Send className="h-[26px] w-[26px]" strokeWidth={1.9} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-extrabold leading-tight text-slate-950">Invite Friends</span>
                      <span className="mt-1.5 block text-[12px] leading-[1.35] text-slate-500">Bring your friends to The Network</span>
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-violet-500" />
                  </button>
                </nav>
                <div className="mt-auto shrink-0 border-t border-violet-100/80 bg-gradient-to-t from-white via-white to-white/90 pt-3 pb-[max(4px,env(safe-area-inset-bottom))]">
                  <button
                    type="button"
                    onClick={() => {
                      closeLauncher();
                      onOpenProfile(currentUser);
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/90 p-3 text-left shadow-sm transition-colors hover:border-violet-200 hover:bg-white"
                    data-testid="button-launcher-profile"
                  >
                    <SafeAvatar
                      src={currentUser.avatar}
                      name={currentUser.name}
                      className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-violet-100"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-slate-900">{currentUser.name}</span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">{currentUser.college}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      closeLauncher();
                      onLogout();
                    }}
                    className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-bold text-rose-700 shadow-sm transition-colors hover:border-rose-300 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                    data-testid="button-launcher-logout"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </aside>
            </div>,
            document.body,
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
          {/* Create post */}
          <button
            type="button"
            onClick={() => {
              setIsSearchOpen(false);
              setIsSearchFocused(false);
              setIsNotificationsOpen(false);
              onOpenCreatePost?.();
            }}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-indigo-600 px-3 text-white shadow-sm transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            title="Create a post"
            aria-label="Create a post"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden text-sm font-semibold sm:inline">Create</span>
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
