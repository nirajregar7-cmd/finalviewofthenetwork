import React from 'react';
import {
  Home,
  Users,
  UserPlus,
  MessageCircle,
  ChevronRight,
  ShieldAlert,
  Trophy,
  CalendarDays,
  FileText,
  LayoutDashboard,
  Send,
  LogOut,
} from 'lucide-react';
import { NavTab, User, Community } from '../types';
import { SafeAvatar } from './SafeAvatar';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  currentUser: User;
  communities: Community[];
  onSelectCommunity: (slug: string) => void;
  onOpenProfile: (user: User) => void;
  unreadChatsCount?: number;
  onLogout?: () => void;
  onOpenInvite?: () => void;
  showCompete?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  communities,
  onSelectCommunity,
  onOpenProfile,
  unreadChatsCount = 2,
  onLogout,
  onOpenInvite,
  showCompete = true,
}) => {
  const myCommunities = communities.filter((c) => c.isJoined || currentUser.communities.includes(c.slug));
  const isLearningPage = activeTab === 'learn' ||
    activeTab === 'workshops' ||
    activeTab === 'resources' ||
    activeTab === 'mentors';

  const coreLinks: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'home', label: 'Home / Discover', icon: <Home className="h-5 w-5" /> },
    { id: 'communities', label: 'Communities', icon: <Users className="h-5 w-5" /> },
    { id: 'connect', label: 'Connect', icon: <UserPlus className="h-5 w-5" /> },
    { id: 'chats', label: 'Chats', icon: <MessageCircle className="h-5 w-5" />, badge: unreadChatsCount },
  ];
  const featureSections: {
    title: string;
    links: { id: NavTab; label: string; icon: React.ReactNode }[];
  }[] = [
    {
      title: 'Explore',
      links: [
        ...(showCompete ? [{ id: 'compete' as NavTab, label: 'Compete', icon: <Trophy className="h-5 w-5" /> }] : []),
        { id: 'workshops', label: 'Workshops & Events', icon: <CalendarDays className="h-5 w-5" /> },
        { id: 'resources', label: 'Resources', icon: <FileText className="h-5 w-5" /> },
      ],
    },
    {
      title: 'Support',
      links: [{ id: 'mentors', label: 'Guidance & Mentorship', icon: <Users className="h-5 w-5" /> }],
    },
    {
      title: 'Your Network',
      links: [{ id: 'my-space', label: 'My Space', icon: <LayoutDashboard className="h-5 w-5" /> }],
    },
  ];
  const renderNavLink = (item: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }) => {
    const isActive = activeTab === item.id || (item.id === 'learn' && isLearningPage);
    return (
      <button
        key={item.id}
        onClick={() => onSelectTab(item.id)}
        className={`nav-item w-[calc(100%-24px)] text-left cursor-pointer transition-all ${isActive ? 'active' : ''}`}
      >
        <span className={isActive ? 'text-indigo-600' : 'text-slate-400'}>{item.icon}</span>
        <span className="text-sm font-medium flex-1">{item.label}</span>
        {item.badge && item.badge > 0 ? (
          <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
            {item.badge}
          </span>
        ) : null}
      </button>
    );
  };
  const renderSectionHeading = (title: string) => (
    <div className="flex items-center gap-3 px-6 pb-1 pt-5">
      <p className="shrink-0 text-[11px] font-bold text-slate-500 uppercase tracking-wider">{title}</p>
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  );

  return (
    <aside className="glass-sidebar network-sidebar hidden lg:flex flex-col h-screen sticky top-0 shrink-0 select-none z-30 justify-between">
      {/* Top section: Logo & Nav */}
      <div className="flex flex-col pt-6 overflow-y-auto no-scrollbar">
        {/* Brand Header */}
        <div
          onClick={() => onSelectTab('home')}
          className="px-6 mb-3 cursor-pointer group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-indigo-200">
              N
            </div>
            <div className="border-l border-slate-300 pl-3">
              <span className="text-base font-black tracking-tight text-slate-900 block leading-tight">
                THE NETWORK
              </span>
              <span className="text-xs font-medium text-slate-500 block leading-tight mt-1">
                Connect. Learn. Grow.
              </span>
            </div>
          </div>
        </div>

        <nav aria-label="The Network navigation" className="space-y-1">
          {renderSectionHeading('Your Campus')}
          {coreLinks.map(renderNavLink)}
          {featureSections.map((section) => (
            <section key={section.title} aria-label={section.title}>
              {renderSectionHeading(section.title)}
              {section.links.map(renderNavLink)}
              {section.title === 'Your Network' && onOpenInvite && (
                <button
                  type="button"
                  onClick={onOpenInvite}
                  className="nav-item w-[calc(100%-24px)] text-left cursor-pointer transition-all"
                >
                  <span className="text-slate-400"><Send className="h-5 w-5" /></span>
                  <span className="text-sm font-medium flex-1">Invite Friends</span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </section>
          ))}
          {currentUser.role === 'admin' && (
            <section aria-label="Administration">
              {renderSectionHeading('Administration')}
              {renderNavLink({ id: 'admin', label: 'Admin access', icon: <ShieldAlert className="h-5 w-5" /> })}
            </section>
          )}
        </nav>

        {/* My Communities List */}
        <div className="mt-8 px-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              My Communities
            </p>
            <button
              onClick={() => onSelectTab('communities')}
              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700"
            >
              Browse
            </button>
          </div>

          <div className="space-y-2">
            {myCommunities.slice(0, 5).map((comm) => (
              <div
                key={comm.id}
                onClick={() => {
                  onSelectCommunity(comm.slug);
                  onSelectTab('communities');
                }}
                className="text-xs font-medium flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer group"
              >
                <span className="group-hover:text-indigo-600 font-semibold truncate max-w-[140px]">
                  {comm.slug}
                </span>
                <span className="stat-pill">
                  {comm.membersCount > 999
                    ? `${(comm.membersCount / 1000).toFixed(0)}k`
                    : comm.membersCount}
                </span>
              </div>
            ))}
            <div
              onClick={() => onSelectTab('communities')}
              className="text-xs font-medium text-slate-400 hover:text-indigo-600 italic px-2 py-1 cursor-pointer transition-colors"
            >
              Browse more...
            </div>
          </div>
        </div>
      </div>

      {/* Bottom User Mini Profile */}
      <div className="p-4 border-t border-slate-100 bg-white">
        <div
          onClick={() => onOpenProfile(currentUser)}
          className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <SafeAvatar
            src={currentUser.avatar}
            name={currentUser.name}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-50"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center">
              <p className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</p>
              {currentUser.verified && <span className="verified-badge">✓</span>}
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              {currentUser.college} · {currentUser.branch}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
        </div>
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="mt-2 flex min-h-12 w-full items-center gap-3 rounded-xl bg-rose-50 px-3 text-left text-sm font-bold text-rose-700 transition-colors hover:bg-rose-100"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        )}
      </div>
    </aside>
  );
};
