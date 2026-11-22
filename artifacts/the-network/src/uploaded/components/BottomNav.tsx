import React from 'react';
import { Home, Users, UserPlus, BookOpen, MessageCircle, Trophy } from 'lucide-react';
import { NavTab } from '../types';
import { InstallAppButton } from './InstallAppButton';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  unreadChatsCount: number;
  hideInstallAction?: boolean;
  showCompete?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  unreadChatsCount,
  hideInstallAction = false,
  showCompete = true,
}) => {
  const isLearnPage = currentTab === 'learn' ||
    currentTab === 'workshops' ||
    currentTab === 'resources' ||
    currentTab === 'mentors';

  return (
    <nav className="network-bottom-nav fixed bottom-0 left-0 right-0 z-40 bg-white/98 backdrop-blur-md border-t border-slate-200/80 py-1.5 px-2 pb-[calc(0.375rem+env(safe-area-inset-bottom))]">
       <div className={`max-w-2xl mx-auto grid ${showCompete ? 'grid-cols-6' : 'grid-cols-5'} items-end gap-0 relative`}>
        {!hideInstallAction && (
          <InstallAppButton
            id="floating-install-app-button"
            className="absolute right-3 -top-14 z-10 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 px-4 text-xs font-bold text-white shadow-lg shadow-indigo-500/30 transition-all duration-200 hover:from-indigo-500 hover:to-indigo-600 hover:scale-105 active:scale-95 disabled:cursor-wait disabled:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
          />
        )}

        {/* Home */}
        <button
          onClick={() => onSelectTab('home')}
          id="nav-tab-home"
            className={`flex flex-col items-center justify-center w-full py-1 gap-1 transition-colors cursor-pointer ${
            currentTab === 'home'
              ? 'text-indigo-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Home className={`w-5 h-5 ${currentTab === 'home' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[11px] leading-tight">Home</span>
        </button>

        {/* Communities */}
        <button
          onClick={() => onSelectTab('communities')}
          id="nav-tab-communities"
            className={`flex flex-col items-center justify-center w-full py-1 gap-1 transition-colors cursor-pointer ${
            currentTab === 'communities'
              ? 'text-indigo-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className={`w-5 h-5 ${currentTab === 'communities' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] leading-tight">Communities</span>
        </button>

        {/* Connect */}
        <button
          onClick={() => onSelectTab('connect')}
          id="nav-tab-connect"
            className={`flex flex-col items-center justify-center w-full py-1 gap-1 transition-colors cursor-pointer ${
            currentTab === 'connect'
              ? 'text-indigo-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserPlus className={`w-5 h-5 ${currentTab === 'connect' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] leading-tight">Connect</span>
        </button>

        {showCompete && (
          <button
            onClick={() => onSelectTab('compete')}
            id="nav-tab-compete"
            className={`flex flex-col items-center justify-center w-full py-1 gap-1 transition-colors cursor-pointer ${
              currentTab === 'compete'
                ? 'text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Trophy className={`w-5 h-5 ${currentTab === 'compete' ? 'stroke-[2.5]' : 'stroke-2'}`} />
            <span className="text-[10px] leading-tight">Compete</span>
          </button>
        )}

        {/* Learn */}
        <button
          onClick={() => onSelectTab('learn')}
          id="nav-tab-learn"
            className={`flex flex-col items-center justify-center w-full py-1 gap-1 transition-colors cursor-pointer ${
            isLearnPage
              ? 'text-indigo-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className={`w-5 h-5 ${isLearnPage ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] leading-tight">Learn</span>
        </button>

        {/* Chats */}
        <button
          onClick={() => onSelectTab('chats')}
          id="nav-tab-chats"
            className={`flex flex-col items-center justify-center w-full py-1 gap-1 relative transition-colors cursor-pointer ${
            currentTab === 'chats'
              ? 'text-indigo-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="relative">
            <MessageCircle className={`w-5 h-5 ${currentTab === 'chats' ? 'stroke-[2.5]' : 'stroke-2'}`} />
            {unreadChatsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white font-bold text-[9px] rounded-full flex items-center justify-center shadow-xs">
                {unreadChatsCount}
              </span>
            )}
          </div>
          <span className="text-[10px] leading-tight">Chats</span>
        </button>
      </div>
    </nav>
  );
};
