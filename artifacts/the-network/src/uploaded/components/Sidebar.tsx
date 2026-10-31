import React from 'react';
import { Home, Users, UserPlus, BookOpen, MessageCircle, ChevronRight, ShieldAlert, Trophy } from 'lucide-react';
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
  showCompete = true,
}) => {
  const myCommunities = communities.filter((c) => c.isJoined || currentUser.communities.includes(c.slug));
  const isLearningPage = activeTab === 'learn' ||
    activeTab === 'workshops' ||
    activeTab === 'resources' ||
    activeTab === 'mentors';

  const navLinks: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'home', label: 'Home / Discover', icon: <Home className="w-4 h-4" /> },
    { id: 'communities', label: 'Communities', icon: <Users className="w-4 h-4" /> },
    { id: 'connect', label: 'Connect', icon: <UserPlus className="w-4 h-4" /> },
    ...(showCompete
      ? [{ id: 'compete' as NavTab, label: 'Compete', icon: <Trophy className="w-4 h-4" /> }]
      : []),
    { id: 'learn', label: 'Learn', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'chats', label: 'Chats', icon: <MessageCircle className="w-4 h-4" />, badge: unreadChatsCount },
    ...(currentUser.role === 'admin'
      ? [{ id: 'admin' as NavTab, label: 'Admin Center', icon: <ShieldAlert className="w-4 h-4" /> }]
      : []),
  ];

  return (
    <aside className="glass-sidebar network-sidebar hidden lg:flex flex-col h-screen sticky top-0 shrink-0 select-none z-30 justify-between">
      {/* Top section: Logo & Nav */}
      <div className="flex flex-col pt-6 overflow-y-auto no-scrollbar">
        {/* Brand Header */}
        <div
          onClick={() => onSelectTab('home')}
          className="px-6 mb-6 cursor-pointer group flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-indigo-200">
              N
            </div>
            <div>
              <span className="text-base font-black tracking-tight text-slate-900 block leading-tight">
                THE NETWORK
              </span>
              <span className="text-[10px] font-semibold text-indigo-600 block leading-none">
                India's Student Network
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navLinks.map((item) => {
            const isActive = activeTab === item.id || (item.id === 'learn' && isLearningPage);
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`nav-item w-[calc(100%-24px)] text-left cursor-pointer transition-all ${
                  isActive ? 'active' : ''
                }`}
              >
                <span className={isActive ? 'text-indigo-600' : 'text-slate-400'}>{item.icon}</span>
                <span className="text-xs font-semibold flex-1">{item.label}</span>
                {item.badge && item.badge > 0 ? (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
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
            className="mt-2 w-full rounded-lg px-2 py-2 text-left text-[11px] font-semibold text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
          >
            Sign out
          </button>
        )}
      </div>
    </aside>
  );
};
