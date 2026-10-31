import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, Post, Community, Connection, DirectMessage, UserReport, Comment, Story } from './types';
import { ApiRequestError, api, filterVisibleCommunities, sessionTracker } from './api';
import {
  clearOfflineScreenSnapshot,
  readOfflineScreenSnapshot,
  updateOfflineScreenSnapshot,
  type OfflineScreenSnapshot,
} from './offlineSnapshot';
import { getEducationDisplay } from './utils/education';

import CreateModal from './components/CreateModal';
import ReelsViewer from './components/ReelsViewer';
import AuthSection from './components/AuthSection';
import OnboardingSection from './components/OnboardingSection';
import ProfileCompletionPrompt from './components/ProfileCompletionPrompt';
import DashboardSection from './components/DashboardSection';
import DiscoverySection from './components/DiscoverySection';
import FeedSection from './components/FeedSection';
import MessagingSection from './components/MessagingSection';
import CommunitiesSection from './components/CommunitiesSection';
import ProfileSection from './components/ProfileSection';
import AdminSection from './components/AdminSection';
import CollegeAdminSection from './components/CollegeAdminSection';
import ProjectsSection from './components/ProjectsSection';
import CollegesSection from './components/CollegesSection';
import EventsSection from './components/EventsSection';
import AttendanceSection from './components/AttendanceSection';
import NotificationsDropdown from './components/NotificationsDropdown';
import Avatar from './components/Avatar';
import NetworkLogo from './components/NetworkLogo';
import InstallPrompt from './components/InstallPrompt';
import NotificationSetup from './components/NotificationSetup';
import NotificationBanner from './components/NotificationBanner';
import PushToast, { PushPayload } from './components/PushToast';
import NetworkLoadingScreen from './components/NetworkLoadingScreen';
import MyContentSection from './components/MyContentSection';
import InviteModal from './components/InviteModal';
import FindPeopleSection from './components/FindPeopleSection';
import LandingPage from './components/LandingPage';
import { playNetworkNotificationSound, unlockNetworkNotificationSound } from './lib/network-notification-sound';

import {
  GraduationCap,
  LayoutDashboard,
  Search,
  BookOpen,
  MessageSquare,
  Users,
  Settings,
  ShieldAlert,
  LogOut,
  Sparkles,
  Plus,
  X,
  Image as ImageIcon,
  Send,
  Sparkle,
  Heart,
  Check,
  Rocket,
  Building2,
  Calendar,
  Crown,
  ClipboardCheck,
  LayoutGrid,
  Gift,
  UserPlus,
} from 'lucide-react';

const loadUploadedNetworkApp = () => import('./uploaded/App');
const UploadedNetworkApp = React.lazy(loadUploadedNetworkApp);

type ThemeName = 'light' | 'dark' | 'ocean' | 'forest' | 'sunset' | 'midnight';

const THEMES: Record<ThemeName, { label: string; swatch: string; ring: string; isDark: boolean; bg: string }> = {
  light:    { label: 'Light',    swatch: '#E8E8EC', ring: '#94a3b8', isDark: false, bg: '#FAF7F2' },
  dark:     { label: 'Dark',     swatch: '#09090C', ring: '#475569', isDark: true,  bg: '#09090C' },
  ocean:    { label: 'Ocean',    swatch: '#06172A', ring: '#38BDF8', isDark: true,  bg: '#06172A' },
  forest:   { label: 'Forest',   swatch: '#061A0B', ring: '#34D399', isDark: true,  bg: '#061A0B' },
  sunset:   { label: 'Sunset',   swatch: '#FDF6EE', ring: '#F97316', isDark: false, bg: '#FDF6EE' },
  midnight: { label: 'Midnight', swatch: '#0E0720', ring: '#A855F7', isDark: true,  bg: '#0E0720' },
};

// Keep the browser/PWA chrome aligned with the app surface. The manifest covers
// the installed light-mode default; this updates the live tab and standalone
// shell when a user switches themes.
function applyBrowserChromeTheme(t: ThemeName) {
  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (themeColor) themeColor.content = THEMES[t].bg;

  const appleStatusBar = document.querySelector<HTMLMetaElement>(
    'meta[name="apple-mobile-web-app-status-bar-style"]',
  );
  if (appleStatusBar) appleStatusBar.content = THEMES[t].isDark ? 'black' : 'default';
}

// Apply theme class to <html> immediately (synchronous) so CSS vars resolve on first paint
function applyThemeClass(t: ThemeName) {
  const html = document.documentElement;
  html.classList.remove('theme-light', 'theme-dark', 'theme-ocean', 'theme-forest', 'theme-sunset', 'theme-midnight', 'dark');
  html.classList.add(`theme-${t}`);
  if (THEMES[t].isDark) html.classList.add('dark');
  applyBrowserChromeTheme(t);
}

// React Error Boundary — prevents a single component crash from blanking the whole app
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AppErrorBoundary = class extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    (this as any).state = { error: null as Error | null };
  }
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[AppErrorBoundary]', error, info.componentStack);
  }
  render() {
    const s = (this as any).state as { error: Error | null };
    const p = (this as any).props as { children: React.ReactNode };
    if (s.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-indigo-600 text-white p-8 text-center">
          <div>
            <div className="text-4xl mb-4">⚠️</div>
            <p className="font-semibold mb-2">Something went wrong</p>
            <p className="text-sm text-white/70 mb-6">{s.error.message}</p>
            <button
              onClick={() => { (this as any).setState({ error: null }); window.location.reload(); }}
              className="bg-white text-indigo-600 font-bold px-6 py-2 rounded-xl text-sm hover:bg-white/90"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return p.children;
  }
};

const STOCK_PRESETS = [
  { url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=400&q=80', label: 'Collab 🤝' },
  { url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80', label: 'Tech Space 💻' },
  { url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=400&q=80', label: 'Coffee Vibe ☕' },
  { url: 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&w=400&q=80', label: 'Relax / Chill 🌿' }
];

const ACTIVE_ACADEMIC_TAGS = [
  'Question ❓',
  'Study Partner Wanted 📚',
  'Notes & Resources 📖',
  'Exam Prep 📝',
  'Research Collaborator 🔬',
  'Academic Discussion 🎓',
  'Assignment Help 🧩',
  'Hackathon Squad 💻',
  'Idea Drop 💡',
  'Startup Pitch 🚀',
  'Co-Founder Search 🤝',
  'Career & Internships 💼',
  'Campus Life 🏫',
  'General 💬'
];

const ACTIVE_FEELING_PRESETS = [
  { emoji: '🚀', label: 'Building' },
  { emoji: '💡', label: 'Ideating' },
  { emoji: '🔥', label: 'Hustling' },
  { emoji: '🧠', label: 'Deep Work' },
  { emoji: '🤝', label: 'Networking' },
  { emoji: '📈', label: 'Grinding' },
  { emoji: '🤯', label: 'Pivoting' },
  { emoji: '🎯', label: 'Focused' },
  { emoji: '💭', label: 'Brainstorming' }
];

function normalizeCommunitySlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function communityMatchesSlug(name: string, requestedSlug: string): boolean {
  const canonical = normalizeCommunitySlug(name);
  const requested = normalizeCommunitySlug(requestedSlug);
  if (canonical === requested) return true;
  const compactCanonical = canonical.replace(/-/g, '');
  const compactRequested = requested.replace(/-/g, '');
  return compactCanonical.length >= 4 && compactRequested.startsWith(compactCanonical);
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [reports, setReports] = useState<UserReport[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [hasSavedSession, setHasSavedSession] = useState(() => Boolean(localStorage.getItem('network_auth_token')));
  const [isLoading, setIsLoading] = useState(() => hasSavedSession);
  const [sessionRestored, setSessionRestored] = useState(() => !hasSavedSession);
  const hasOfflineSnapshotRef = useRef(false);
  const hasFreshBootstrapRef = useRef(false);
  const [offlineScreenSnapshot, setOfflineScreenSnapshot] = useState<OfflineScreenSnapshot | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');

  // LandingPage is a long scrolling surface. Reset its scroll position when
  // replacing it with auth/onboarding so the new card never opens mid-page.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [showLanding, showOnboarding, currentUser?.id]);

  const [theme, setTheme] = useState<ThemeName>(() => {
    const saved = localStorage.getItem('network_theme') as ThemeName;
    const t = (saved && THEMES[saved]) ? saved : 'light';
    applyThemeClass(t); // synchronous — CSS vars available on first paint
    return t;
  });
  const darkMode = THEMES[theme].isDark;

  const [activeView, setActiveView] = useState<string>('feed');
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null);
  const [slideKey, setSlideKey] = useState(0);
  const prevViewRef = useRef<string>('feed');
  const [showNewPostModal, setShowNewPostModal] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeReelData, setActiveReelData] = useState<{ reels: Story[]; index: number } | null>(null);
  const [viewingUserProfileId, setViewingUserProfileId] = useState<string | null>(null);
  const [preSelectedMsgUserId, setPreSelectedMsgUserId] = useState<string | null>(null);
  const [preSelectedGroupId, setPreSelectedGroupId] = useState<string | null>(null);
  const [initialCommId, setInitialCommId] = useState<string | null>(null);
  const [pendingCommunitySlug, setPendingCommunitySlug] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('community');
  });
  const [pendingCommunityId, setPendingCommunityId] = useState<string | null>(null);
  const [profileActiveTab, setProfileActiveTab] = useState<'card' | 'shares'>('card');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [manageMenuOpen, setManageMenuOpen] = useState(false);
  const [profileInterestsExpanded, setProfileInterestsExpanded] = useState<boolean>(false);
  const [profileLookingForExpanded, setProfileLookingForExpanded] = useState<boolean>(false);
  const [openOwnProfileRequest, setOpenOwnProfileRequest] = useState(0);
  const [pushNavigationRequest, setPushNavigationRequest] = useState<{
    view: string;
    targetId?: string;
    requestId: number;
  } | null>(null);

  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const SWIPE_VIEWS = ['feed', 'find-people', 'explore', 'messages', 'colleges', 'attendance', 'mycontent', 'profile'];

  const isPhoneViewport = () =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;

  const navigateToView = (view: string) => {
    setActiveView(view === 'dashboard' && isPhoneViewport() ? 'feed' : view);
  };

  const [modalPostContent, setModalPostContent] = useState('');
  const [modalSelectedTag, setModalSelectedTag] = useState('Question ❓');
  const [modalSelectedFeeling, setModalSelectedFeeling] = useState('');
  const [modalSelectedCommunity, setModalSelectedCommunity] = useState('');
  const [modalProjectTitle, setModalProjectTitle] = useState('');
  const [modalPostImage, setModalPostImage] = useState('');
  const [registeredEvents, setRegisteredEvents] = useState<string[]>([]);
  const [pushToast, setPushToast] = useState<PushPayload | null>(null);

  useEffect(() => {
    setProfileInterestsExpanded(false);
    setProfileLookingForExpanded(false);
    // Fire profile view notification (fire-and-forget, skip own profile)
    if (viewingUserProfileId && currentUser && viewingUserProfileId !== currentUser.id) {
      api.users.recordView(viewingUserProfileId, currentUser.id).catch(() => {});
    }
  }, [viewingUserProfileId]);

  // ── Restore session from localStorage on page load ────────────────────────
  useEffect(() => {
    const savedToken = localStorage.getItem('network_auth_token');
    if (!savedToken) {
      localStorage.removeItem('network_uid');
      setHasSavedSession(false);
      setSessionRestored(true);
      return;
    }
    let active = true;
    let snapshotLoaded = false;
    let authValidationFinished = false;
    const savedId = localStorage.getItem('network_uid');
    const clearSavedSession = () => {
      const userId = localStorage.getItem('network_uid') || savedId;
      void clearOfflineScreenSnapshot(userId);
      localStorage.removeItem('network_auth_token');
      localStorage.removeItem('network_uid');
      hasOfflineSnapshotRef.current = false;
      hasFreshBootstrapRef.current = false;
      setOfflineScreenSnapshot(null);
      setHasSavedSession(false);
      setCurrentUser(null);
      setAllUsers([]);
      setPosts([]);
      setConnections([]);
      setMessages([]);
      setCommunities([]);
      setStories([]);
      setIsLoading(false);
    };

    if (savedId) {
      void readOfflineScreenSnapshot(savedId).then((snapshot) => {
        if (!active || !snapshot) return;
        hasOfflineSnapshotRef.current = true;
        snapshotLoaded = true;
        setOfflineScreenSnapshot(snapshot);
        if (!hasFreshBootstrapRef.current) {
          setCurrentUser(snapshot.currentUser);
          setAllUsers(snapshot.users);
          setPosts(snapshot.posts);
          setConnections(snapshot.connections ?? []);
          setStories(snapshot.stories ?? []);
          setCommunities(filterVisibleCommunities(snapshot.communities ?? []));
        }
        setIsLoading(false);
        setSessionRestored(true);
      });
    }

    // A slow or unavailable connection must not erase a saved session or hide
    // a screen that has already been restored from this device.
    const timeout = setTimeout(() => {
      if (!active || authValidationFinished) return;
      if (!snapshotLoaded) setIsLoading(false);
      setSessionRestored(true);
    }, 5000);

    api.auth.me()
      .then(({ user }: { user: UserProfile }) => {
        if (!active) return;
        if (user && !user.isSuspended) {
          if (savedId && savedId !== user.id) void clearOfflineScreenSnapshot(savedId);
          localStorage.setItem('network_uid', user.id);
          // Start loading the signed-in bundle while auth restoration finishes.
          void loadUploadedNetworkApp().catch(() => {});
          setCurrentUser(user);
          setHasSavedSession(true);
          setIsLoading(false);
        } else {
          clearSavedSession();
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiRequestError && (error.status === 401 || error.status === 403)) {
          clearSavedSession();
        } else if (!snapshotLoaded) {
          setIsLoading(false);
        }
      })
      .finally(() => {
        if (!active) return;
        authValidationFinished = true;
        clearTimeout(timeout);
        setSessionRestored(true);
      });
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, []);

  // ── Read ?view= URL param on load (from push notification click) ──────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    const userId = params.get('userId');
    const community = params.get('community');
    const communityId = params.get('communityId');
    if (view === 'login' || view === 'security') {
      setAuthInitialMode('login');
      setShowLanding(false);
    }
    if (communityId) {
      setPendingCommunityId(communityId);
      setInitialCommId(communityId);
      setActiveView('communities');
      setShowLanding(false);
    }
    if (community) {
      setPendingCommunitySlug(community);
      setAuthInitialMode('register');
      setShowLanding(false);
    }
    if (view) {
      navigateToView(view);
      if (userId && view === 'messages') setPreSelectedMsgUserId(userId);
      // Clean URL without reload
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Mobile browsers unlock audio only after an explicit user interaction.
  useEffect(() => {
    const unlock = () => { void unlockNetworkNotificationSound(); };
    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // ── Listen for SW messages (navigation, foreground push, sounds) ────────────
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'SW_NAVIGATE' && e.data.view) {
        navigateToView(e.data.view);
        if (e.data.userId && e.data.view === 'messages') {
          setPreSelectedMsgUserId(e.data.userId);
        }
        if (e.data.groupId && e.data.view === 'messages') {
          setPreSelectedGroupId(e.data.groupId);
        }
      }
      // Foreground push: show in-app toast + play sound
      if (e.data?.type === 'PUSH_FOREGROUND' && e.data.payload) {
        setPushToast(e.data.payload);
        playNetworkNotificationSound();
      }
      // Legacy SW sound trigger
      if (e.data?.type === 'PLAY_SOUND') {
        playNetworkNotificationSound();
      }
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, []);

  // ── Session tracking (start on login, end on logout/tab close) ──────────────
  useEffect(() => {
    if (!currentUser) return;
    sessionTracker.start(currentUser.id);
    const handleUnload = () => sessionTracker.end();
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      sessionTracker.end();
    };
  }, [currentUser?.id]);

  // ── Notifications polling (every 25s) ─────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    const fetchNotifs = () => api.notifications.getForUser(currentUser.id).catch(() => null);
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 25000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  useEffect(() => {
    localStorage.setItem('network_theme', theme);
    applyThemeClass(theme);
    document
      .querySelector<HTMLMetaElement>('meta[name="color-scheme"]')
      ?.setAttribute('content', THEMES[theme].isDark ? 'dark' : 'light');
  }, [theme]);

  useEffect(() => {
    const prev = prevViewRef.current;
    if (prev === activeView) return;
    const prevIdx = SWIPE_VIEWS.indexOf(prev);
    const currIdx = SWIPE_VIEWS.indexOf(activeView);
    if (prevIdx !== -1 && currIdx !== -1) {
      setSlideDir(currIdx > prevIdx ? 'left' : 'right');
      setSlideKey(k => k + 1);
    }
    prevViewRef.current = activeView;
  }, [activeView]);

  const loadAppData = useCallback(async () => {
    // Public visitors should see the landing page immediately. Logged-in
    // sessions still show the loading state while their data is restored.
    if (!hasSavedSession) {
      setIsLoading(false);
      return;
    }
    if (hasSavedSession && !hasOfflineSnapshotRef.current) setIsLoading(true);
    let cancelled = false;

    // Timeout — never block the UI forever
    const timeoutId = setTimeout(() => {
      if (!cancelled) { cancelled = true; setIsLoading(false); }
    }, 15000);

    try {
      // Single bootstrap call — server runs all DB queries in parallel
      let data: any = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        if (cancelled) return;
        data = await (api as any).bootstrap().catch((err: any) => {
          console.error(`[bootstrap] attempt ${attempt + 1} failed:`, String(err?.message ?? err));
          return null;
        });
        if (data?.users?.length > 0) break;
        if (attempt < 1) await new Promise(r => setTimeout(r, 500));
      }

      if (cancelled || !data) return;

      hasFreshBootstrapRef.current = true;
      setAllUsers(data.users ?? []);
      // Keep the feed viewer profile in the same shape as the bootstrap
      // candidates. This matters for school/coaching accounts because their
      // audience is determined by schoolName, coachingName, and programGroup.
      const savedId = localStorage.getItem('network_uid');
      if (savedId) {
        const bootstrapUser = (data.users ?? []).find((user: UserProfile) => user.id === savedId);
        if (bootstrapUser) {
          setCurrentUser(previous => previous?.id === savedId ? bootstrapUser : previous ?? bootstrapUser);
          void updateOfflineScreenSnapshot({
              userId: savedId,
              currentUser: bootstrapUser,
              users: data.users ?? [],
              posts: data.posts ?? [],
              communities: data.communities ?? [],
              connections: data.connections ?? [],
              stories: data.stories ?? [],
            }).then((snapshot) => {
              if (!cancelled && snapshot) setOfflineScreenSnapshot(snapshot);
            });
        }
      }
      setPosts(data.posts ?? []);
      setConnections(data.connections ?? []);
      setStories(data.stories ?? []);
      setCommunities(filterVisibleCommunities(data.communities ?? []));

      // Seed and load official college communities (one per registered college)
      api.collegeCommunities.ensureAll().then((collegeCommunities: any[]) => {
        if (!cancelled) {
          setCommunities(prev => {
            const existingIds = new Set(prev.map((c: any) => c.id));
            const merged = prev.map((community: any) =>
              collegeCommunities.find((collegeCommunity: any) => collegeCommunity.id === community.id) || community
            );
            const newOnes = collegeCommunities.filter((c: any) => !existingIds.has(c.id));
            return newOnes.length ? [...merged, ...newOnes] : merged;
          });
        }
      }).catch(() => {});

      // Messages and reports fetched lazily — only load if user is logged in
      if (savedId) {
        api.messages.getForUser(savedId).then(setMessages).catch(() => {});
        api.reports.getAll().then(setReports).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to load app data', err);
    } finally {
      clearTimeout(timeoutId);
      if (!cancelled) setIsLoading(false);
    }
  }, [hasSavedSession]);

  const isNewUser = (user: UserProfile) =>
    !user.aboutMe && user.interests.length === 0 && user.skills.length === 0 && user.lookingFor.length === 0;

  const handleLogin = (user: UserProfile) => {
    void loadUploadedNetworkApp().catch(() => {});
    localStorage.setItem('network_uid', user.id);
    setHasSavedSession(true);
    setCurrentUser(user);
    setAllUsers(prev => {
      if (prev.some(u => u.id === user.id)) {
        return prev.map(u => u.id === user.id ? user : u);
      }
      return [...prev, user];
    });
    // Auto-join batch group
    api.batchGroup.ensure(user.id).catch(() => {});
    if (pendingCommunitySlug) {
      api.communities.getAll().then(async (all: Community[]) => {
        const community = all.find(c => communityMatchesSlug(c.name, pendingCommunitySlug));
        if (!community) return;
        try {
          const updated = await api.communities.join(community.id, user.id);
          setCommunities(prev => prev.map(c => c.id === community.id ? { ...c, ...updated } : c));
          setInitialCommId(community.id);
          setPendingCommunityId(community.id);
          setPendingCommunitySlug(null);
          setActiveView('communities');
          window.history.replaceState({}, '', '/');
        } catch (err) {
          console.error('Failed to join invited community', err);
        }
      }).catch(() => {});
    }
    if (isNewUser(user)) {
      setShowOnboarding(true);
    } else {
      setActiveView(pendingCommunityId ? 'communities' : 'feed');
    }
  };

  const handleOnboardingComplete = async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    const saved = await api.users.update(currentUser.id, { ...currentUser, ...updates });
    setCurrentUser(saved);
    setAllUsers(prev => prev.map(u => u.id === saved.id ? saved : u));
    setShowOnboarding(false);
    setActiveView(pendingCommunityId ? 'communities' : 'feed');
  };

  const handleLogout = () => {
    const logoutUserId = localStorage.getItem('network_uid');
    api.auth.logout().catch(() => {});
    void clearOfflineScreenSnapshot(logoutUserId);
    localStorage.removeItem('network_auth_token');
    localStorage.removeItem('network_uid');
    hasOfflineSnapshotRef.current = false;
    hasFreshBootstrapRef.current = false;
    setOfflineScreenSnapshot(null);
    setHasSavedSession(false);
    setCurrentUser(null);
    setAllUsers([]);
    setPosts([]);
    setConnections([]);
    setMessages([]);
    setCommunities([]);
    setStories([]);
    setActiveView('feed');
  };

  const handleUpdateProfile = async (updatedProfile: UserProfile) => {
    try {
      const saved = await api.users.update(updatedProfile.id, updatedProfile);
      setCurrentUser(saved);
      setAllUsers(prev => prev.map(u => u.id === saved.id ? saved : u));
    } catch (err) {
      console.error('Failed to update profile', err);
    }
  };

  const handleSaveConnectPreference = async (preference: string | null) => {
    if (!currentUser) return;
    const saved = await api.users.update(currentUser.id, {
      ...currentUser,
      connectPreference: preference,
    });
    setCurrentUser(saved);
    setAllUsers(prev => prev.map(u => u.id === saved.id ? saved : u));
  };

  const handleSendConnectionRequest = async (
    receiverId: string,
    type: 'Startup Discussion' | 'Friendship' | 'Study Partner' | 'Hackathon Team',
    message: string
  ) => {
    if (!currentUser) return;
    // Optimistic — show pending immediately so UI feels instant
    const tempId = `temp-${Date.now()}`;
    const optimistic: Connection = {
      id: tempId, senderId: currentUser.id, receiverId, type,
      message, status: 'pending', createdAt: new Date().toISOString(),
    };
    setConnections(prev => [...prev, optimistic]);
    try {
      const newConn = await api.connections.create({ senderId: currentUser.id, receiverId, type, message });
      setConnections(prev => prev.map(c => c.id === tempId ? newConn : c));
    } catch (err) {
      setConnections(prev => prev.filter(c => c.id !== tempId)); // rollback
      console.error('Failed to send connection request', err);
    }
  };

  const handleAcceptConnection = async (requestId: string) => {
    // Optimistic — flip to accepted immediately
    setConnections(prev => prev.map(c => c.id === requestId ? { ...c, status: 'accepted' } : c));
    try {
      const updated = await api.connections.update(requestId, 'accepted');
      setConnections(prev => prev.map(c => c.id === requestId ? updated : c));
    } catch (err) {
      setConnections(prev => prev.map(c => c.id === requestId ? { ...c, status: 'pending' } : c)); // rollback
      console.error('Failed to accept connection', err);
    }
  };

  const handleRejectConnection = async (requestId: string) => {
    // Optimistic — flip to rejected immediately
    setConnections(prev => prev.map(c => c.id === requestId ? { ...c, status: 'rejected' } : c));
    try {
      const updated = await api.connections.update(requestId, 'rejected');
      setConnections(prev => prev.map(c => c.id === requestId ? updated : c));
    } catch (err) {
      setConnections(prev => prev.map(c => c.id === requestId ? { ...c, status: 'pending' } : c)); // rollback
      console.error('Failed to reject connection', err);
    }
  };

  const handleJoinCommunity = async (communityId: string) => {
    if (!currentUser) return;
    const comm = communities.find(c => c.id === communityId);
    if (!comm) return;
    try {
      const updated = await api.communities.join(communityId, currentUser.id);
      setCommunities(prev => prev.map(c => c.id === communityId ? { ...c, ...updated } : c));
    } catch (err) {
      console.error('Failed to join community', err);
    }
  };

  const handleLeaveCommunity = async (communityId: string) => {
    if (!currentUser) return;
    const comm = communities.find(c => c.id === communityId);
    if (!comm) return;
    const newMemberIds = (comm.memberIds as string[]).filter(id => id !== currentUser.id);
    try {
      const updated = await api.communities.update(communityId, { memberIds: newMemberIds });
      setCommunities(prev => prev.map(c => c.id === communityId ? { ...c, ...updated } : c));
    } catch (err) {
      console.error('Failed to leave community', err);
    }
  };

  const handleCreateCommunity = async (community: { name: string; description: string; icon: string; tags: string[]; category: string; college?: string }) => {
    if (!currentUser) return;
    try {
      const newComm = await api.communities.create({ ...community, creatorId: currentUser.id });
      setCommunities(prev => [newComm, ...prev]);
    } catch (err) {
      console.error('Failed to create community', err);
    }
  };

  const handleInviteToCommunity = async (communityId: string, userIds: string[]) => {
    if (!currentUser) throw new Error('Please sign in again');
    return api.communities.invite(communityId, userIds, currentUser.id);
  };

  const announceCommunityChatItem = async (communityId: string, content: string) => {
    if (!currentUser) return;
    try {
      await api.entityMessages.send('community', communityId, currentUser.id, content);
    } catch (err) {
      // The community item is already saved. Keep that success intact if chat
      // announcement delivery is temporarily unavailable.
      console.error('Failed to announce community item in chat', err);
    }
  };

  const handleAddCommunityResource = async (communityId: string, title: string, link: string, description: string) => {
    if (!currentUser) return;
    const comm = communities.find(c => c.id === communityId);
    if (!comm) return;
    const newResource = {
      id: `res-${Date.now()}`,
      title, link, description,
      authorId: currentUser.id,
      createdAt: new Date().toISOString()
    };
    const newResources = [...(comm.resources || []), newResource];
    try {
      const updated = await api.communities.update(communityId, { resources: newResources });
      setCommunities(prev => prev.map(c => c.id === communityId ? { ...c, ...updated } : c));
      await announceCommunityChatItem(
        communityId,
        `📚 RESOURCE • ${title.trim()}\n${description.trim() || 'A new resource was shared with the chapter.'}\n🔗 ${link.trim()}\n[[community-item:resource:${newResource.id}]]`
      );
    } catch (err) {
      console.error('Failed to add resource', err);
    }
  };

  const handleAddCommunityThread = async (communityId: string, title: string, content: string) => {
    if (!currentUser) return;
    const comm = communities.find(c => c.id === communityId);
    if (!comm) return;
    const newThread = {
      id: `thread-${Date.now()}`,
      title, content,
      authorId: currentUser.id,
      createdAt: new Date().toISOString(),
      replies: []
    };
    const newThreads = [...(comm.threads || []), newThread];
    try {
      const updated = await api.communities.update(communityId, { threads: newThreads });
      setCommunities(prev => prev.map(c => c.id === communityId ? { ...c, ...updated } : c));
      await announceCommunityChatItem(
        communityId,
        `🧵 DISCUSSION • ${title.trim()}\n${content.trim()}\n[[community-item:discussion:${newThread.id}]]`
      );
    } catch (err) {
      console.error('Failed to add thread', err);
    }
  };

  const handleAddThreadReply = async (communityId: string, threadId: string, content: string) => {
    if (!currentUser) return;
    const comm = communities.find(c => c.id === communityId);
    if (!comm) return;
    const newThreads = (comm.threads || []).map((t: any) => {
      if (t.id === threadId) {
        return {
          ...t,
          replies: [...t.replies, {
            id: `rep-${Date.now()}`,
            authorId: currentUser.id,
            content,
            createdAt: new Date().toISOString()
          }]
        };
      }
      return t;
    });
    try {
      const updated = await api.communities.update(communityId, { threads: newThreads });
      setCommunities(prev => prev.map(c => c.id === communityId ? { ...c, ...updated } : c));
    } catch (err) {
      console.error('Failed to add reply', err);
    }
  };

  const handleAddCommunityPoll = async (communityId: string, question: string, options: string[]) => {
    if (!currentUser) return;
    const comm = communities.find(c => c.id === communityId);
    if (!comm) return;
    const newPoll = {
      id: `poll-${Date.now()}`,
      question, options,
      votes: {},
      authorId: currentUser.id,
      createdAt: new Date().toISOString(),
    };
    const newPolls = [...(comm.polls || []), newPoll];
    try {
      const updated = await api.communities.update(communityId, { polls: newPolls });
      setCommunities(prev => prev.map(c => c.id === communityId ? { ...c, ...updated, polls: (updated as any).polls ?? newPolls } : c));
      await announceCommunityChatItem(
        communityId,
        `🗳️ POLL • ${question.trim()}\nOptions: ${options.map(option => option.trim()).join(' • ')}\n[[community-item:poll:${newPoll.id}]]`
      );
    } catch (err) { console.error('Failed to add poll', err); }
  };

  const handleVoteCommunityPoll = async (communityId: string, pollId: string, optionIndex: number) => {
    if (!currentUser) return;
    // Optimistic update
    setCommunities(prev => prev.map(c => {
      if (c.id !== communityId) return c;
      const polls = (c.polls || []).map((p: any) =>
        p.id === pollId ? { ...p, votes: { ...(p.votes || {}), [currentUser.id]: optionIndex } } : p
      );
      return { ...c, polls };
    }));
    try {
      const updated = await api.communities.votePoll(communityId, pollId, currentUser.id, optionIndex);
      setCommunities(prev => prev.map(c => c.id === communityId ? { ...c, ...updated, polls: (updated as any).polls ?? (c.polls || []) } : c));
    } catch (err) { console.error('Failed to vote', err); }
  };

  const handleAddPost = async (
    content: string,
    academicTag: string,
    communityId?: string,
    projectTitle?: string,
    postImage?: string,
    feeling?: string,
    websiteUrl?: string,
    tags?: string[],
    attachment?: { name: string; data: string; mimeType: string }
  ) => {
    if (!currentUser) return;
    try {
      const newPost = await api.posts.create({
        authorId: currentUser.id,
        content, academicTag,
        communityId: communityId || null,
        projectTitle: projectTitle || null,
        postImage: postImage || null,
        feeling: feeling || null,
        websiteUrl: websiteUrl || null,
        tags: tags || [],
        attachmentName: attachment?.name || null,
        attachmentData: attachment?.data || null,
        attachmentMimeType: attachment?.mimeType || null,
      });
      setPosts(prev => [newPost, ...prev]);
    } catch (err) {
      console.error('Failed to create post', err);
    }
  };

  const handleModalPostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!modalPostContent.trim()) return;

    handleAddPost(
      modalPostContent,
      modalSelectedTag,
      modalSelectedCommunity || undefined,
      modalProjectTitle || undefined,
      modalPostImage || undefined,
      modalSelectedFeeling || undefined
    );

    setModalPostContent('');
    setModalSelectedTag('Question ❓');
    setModalSelectedFeeling('');
    setModalSelectedCommunity('');
    setModalProjectTitle('');
    setModalPostImage('');
    setShowNewPostModal(false);
  };

  const handleModalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setModalPostImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddStory = async (content: string, image?: string) => {
    if (!currentUser) return;
    try {
      const newStory = await api.stories.create(currentUser.id, content, image);
      setStories(prev => [newStory, ...prev]);
    } catch (err) {
      console.error('Failed to create story', err);
    }
  };

  const handleReactToStory = async (storyId: string, emoji: string) => {
    try {
      const updated = await api.stories.react(storyId, emoji);
      setStories(prev => prev.map(s => s.id === storyId ? { ...s, reactions: updated.reactions } : s));
    } catch (err) {
      console.error('Failed to react to story', err);
    }
  };

  const handleLikeReel = async (reelId: string) => {
    if (!currentUser) return;
    // Optimistic update
    setStories(prev => prev.map(s => {
      if (s.id !== reelId) return s;
      const likes = Array.isArray(s.likes) ? s.likes : [];
      const isLiked = likes.includes(currentUser.id);
      return { ...s, likes: isLiked ? likes.filter(id => id !== currentUser.id) : [...likes, currentUser.id] };
    }));
    try {
      const updated = await api.stories.like(reelId, currentUser.id);
      setStories(prev => prev.map(s => s.id === reelId ? { ...s, likes: updated.likes ?? [] } : s));
    } catch (err) {
      // Roll back on failure
      setStories(prev => prev.map(s => {
        if (s.id !== reelId) return s;
        const likes = Array.isArray(s.likes) ? s.likes : [];
        const wasLiked = likes.includes(currentUser.id);
        return { ...s, likes: wasLiked ? likes.filter(id => id !== currentUser.id) : [...likes, currentUser.id] };
      }));
      console.error('Failed to like reel', err);
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!currentUser) return;
    const threadId = posts.find(post => post.id === postId)?.resharedFromId || postId;
    const previousLikes = new Map(
      posts
        .filter(post => post.id === threadId || post.resharedFromId === threadId)
        .map(post => [post.id, post.likes]),
    );
    // Optimistic update — flip immediately so mobile feels instant
    setPosts(prev => prev.map(p => {
      if (p.id !== threadId && p.resharedFromId !== threadId) return p;
      const isLiked = p.likes.includes(currentUser.id);
      return { ...p, likes: isLiked ? p.likes.filter(id => id !== currentUser.id) : [...p.likes, currentUser.id] };
    }));
    try {
      const updated = await api.posts.like(threadId, currentUser.id);
      // Reconcile with server truth
      setPosts(prev => prev.map(p =>
        p.id === threadId || p.resharedFromId === threadId
          ? { ...p, likes: updated.likes }
          : p
      ));
    } catch (err) {
      // Roll back optimistic update on failure
      setPosts(prev => prev.map(p => previousLikes.has(p.id)
        ? { ...p, likes: previousLikes.get(p.id) || [] }
        : p
      ));
      console.error('Failed to like post', err);
    }
  };

  const handleAddComment = async (postId: string, content: string) => {
    if (!currentUser) throw new Error('Sign in to comment.');
    const threadId = posts.find(post => post.id === postId)?.resharedFromId || postId;
    const optimisticId = `pending-comment-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const optimisticComment: Comment = {
      id: optimisticId,
      postId: threadId,
      authorId: currentUser.id,
      content,
      createdAt: new Date().toISOString(),
    };
    setPosts(prev => prev.map(post => post.id === threadId || post.resharedFromId === threadId
      ? { ...post, comments: [...post.comments, optimisticComment] }
      : post
    ));
    try {
      const savedComment = await api.posts.addComment(threadId, currentUser.id, content);
      setPosts(prev => prev.map(p => {
        if (p.id !== threadId && p.resharedFromId !== threadId) return p;
        const withoutDuplicate = p.comments.filter(comment =>
          comment.id !== optimisticId && comment.id !== savedComment.id
        );
        return { ...p, comments: [...withoutDuplicate, savedComment] };
      }));
    } catch (err) {
      console.error('Failed to add comment', err);
      setPosts(prev => prev.map(post => post.id === threadId || post.resharedFromId === threadId
        ? { ...post, comments: post.comments.filter(comment => comment.id !== optimisticId) }
        : post
      ));
      throw err;
    }
  };

  const handleReportUser = async (reportedUserId: string, reason: string, description: string) => {
    if (!currentUser) return;
    try {
      const newReport = await api.reports.create({
        reporterId: currentUser.id,
        reportedUserId,
        reason,
        description
      });
      setReports(prev => [newReport, ...prev]);
    } catch (err) {
      console.error('Failed to report user', err);
    }
  };

  const handleToggleUserSuspension = async (userId: string) => {
    try {
      const updated = await api.users.toggleSuspend(userId);
      setAllUsers(prev => prev.map(u => u.id === userId ? updated : u));
      if (currentUser?.id === userId) {
        alert('This profile is under suspension. Logging you out...');
        handleLogout();
      }
    } catch (err) {
      console.error('Failed to toggle suspension', err);
    }
  };

  const handleResolveReport = async (reportId: string, status: 'suspended' | 'dismissed') => {
    try {
      const updated = await api.reports.update(reportId, status);
      setReports(prev => prev.map(r => r.id === reportId ? updated : r));
    } catch (err) {
      console.error('Failed to resolve report', err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      if (!currentUser) return;
      await api.posts.delete(postId, currentUser.id);
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) {
      console.error('Failed to delete post', err);
    }
  };

  const handleDeleteComment = async (commentId: string, postId: string) => {
    try {
      await api.comments.delete(commentId);
      setPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, comments: p.comments.filter((c: any) => c.id !== commentId) }
          : p
      ));
    } catch (err) {
      console.error('Failed to delete comment', err);
    }
  };

  const handleDeleteReel = async (reelId: string) => {
    try {
      await api.stories.delete(reelId);
      setStories(prev => prev.filter(s => s.id !== reelId));
    } catch (err) {
      console.error('Failed to delete reel', err);
    }
  };

  const handleRegisterEvent = (eventId: string) => {
    if (!registeredEvents.includes(eventId)) {
      setRegisteredEvents(prev => [...prev, eventId]);
    }
  };

  const onSwipeStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const onSwipeEnd = useCallback((e: React.TouchEvent) => {
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(dx) < Math.abs(dy) * 1.5 || Math.abs(dx) < 55) return;
    const idx = SWIPE_VIEWS.indexOf(activeView);
    if (dx > 0 && idx < SWIPE_VIEWS.length - 1) {
      setActiveView(SWIPE_VIEWS[idx + 1]);
    } else if (dx < 0 && idx > 0) {
      setActiveView(SWIPE_VIEWS[idx - 1]);
    }
  }, [activeView]);

  const handleMobileScroll = useCallback(() => {
    const el = mobileScrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    const view = SWIPE_VIEWS[idx];
    if (view && view !== activeView) setActiveView(view);
  }, [activeView]);

  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);

  if (isLoading || !sessionRestored) {
    return <NetworkLoadingScreen />;
  }

  if (!currentUser) {
    if (showLanding) {
      return (
        <>
          <LandingPage
            onJoin={() => { setAuthInitialMode('register'); setShowLanding(false); }}
            onLogin={() => { setAuthInitialMode('login'); setShowLanding(false); }}
          />
          <InstallPrompt darkMode={false} />
        </>
      );
    }
    return (
      <>
        <AuthSection
          onLogin={handleLogin}
          darkMode={darkMode}
          initialMode={authInitialMode}
          onBackToLanding={() => setShowLanding(true)}
        />
        <InstallPrompt darkMode={darkMode} />
      </>
    );
  }

  if (showOnboarding) {
    return (
      <OnboardingSection
        user={currentUser}
        onComplete={handleOnboardingComplete}
        darkMode={darkMode}
      />
    );
  }

  return (
    <>
      <React.Suspense fallback={<NetworkLoadingScreen />}>
        <UploadedNetworkApp
          key={currentUser.id}
          authenticatedUser={currentUser}
          offlineSnapshot={offlineScreenSnapshot}
          onLogout={handleLogout}
          openOwnProfileRequest={openOwnProfileRequest}
          pushNavigationRequest={pushNavigationRequest || undefined}
        />
      </React.Suspense>
      <ProfileCompletionPrompt
        currentUser={currentUser}
        darkMode={darkMode}
        onOpenProfile={() => setOpenOwnProfileRequest((value) => value + 1)}
      />
      <InstallPrompt darkMode={darkMode} />
      {/* The uploaded app is the active product shell. Keep push registration
          and foreground toasts mounted alongside it, not in the legacy view
          renderer below (which is no longer reached). */}
      <NotificationSetup
        userId={currentUser.id}
        darkMode={darkMode}
        onForegroundPush={(p) => {
          setPushToast(p as PushPayload);
          playNetworkNotificationSound();
        }}
      />
      {currentUser && typeof Notification !== 'undefined' && Notification.permission !== 'granted' && (
        <NotificationBanner userId={currentUser.id} darkMode={darkMode} />
      )}
      <PushToast
        darkMode={darkMode}
        payload={pushToast}
        onNavigate={(view, userId) => {
          setPushNavigationRequest((previous) => ({
            view,
            targetId: userId,
            requestId: (previous?.requestId || 0) + 1,
          }));
          setPushToast(null);
        }}
        onDismiss={() => setPushToast(null)}
      />
    </>
  );

  const renderSection = (view: string) => {
    // The old dashboard is intentionally unavailable on phones. Redirect old
    // mobile links/notification payloads to the Home feed instead.
    if (view === 'dashboard' && isPhoneViewport()) return renderSection('feed');

    if (view === 'feed') return (
      <FeedSection
        currentUser={currentUser}
        posts={posts}
        allUsers={allUsers}
        communities={communities}
        connections={connections}
        onAddPost={handleAddPost}
        onLikePost={handleLikePost}
        onAddComment={handleAddComment}
        onDeletePost={handleDeletePost}
        onDeleteComment={handleDeleteComment}
        onDeleteReel={handleDeleteReel}
        darkMode={darkMode}
        stories={stories}
        onAddStory={handleAddStory}
        registeredEvents={registeredEvents}
        onRegisterEvent={handleRegisterEvent}
        onViewUserProfile={setViewingUserProfileId}
        onReactToStory={handleReactToStory}
        onLikeReel={handleLikeReel}
        onSendConnectionRequest={(receiverId, type = 'Friendship') => {
          const message = type === 'Study Partner'
            ? `Hi! I'd love to study together.`
            : type === 'Startup Discussion'
              ? `Hi! I'd love to discuss ideas and collaborate.`
              : `Hi! I'd love to connect with you.`;
          return handleSendConnectionRequest(receiverId, type, message);
        }}
        onJoinCommunity={handleJoinCommunity}
        onNavigate={(v: string, extra?: string) => {
          if (v === 'communities' && extra) {
            setInitialCommId(extra);
          }
          setActiveView(v);
        }}
        onOpenReel={(reels, index) => setActiveReelData({ reels, index })}
        onRefresh={loadAppData}
      />
    );
    if (view === 'dashboard') return (
      <DashboardSection
        currentUser={currentUser}
        connections={connections}
        posts={posts}
        communities={communities}
        messages={messages}
        allUsers={allUsers}
        onNavigate={setActiveView}
        darkMode={darkMode}
        stories={stories}
        onAddStory={handleAddStory}
        registeredEvents={registeredEvents}
        onRegisterEvent={handleRegisterEvent}
        onReactToStory={handleReactToStory}
      />
    );
    if (view === 'explore') return (
      <DiscoverySection
        currentUser={currentUser}
        allUsers={allUsers}
        connections={connections}
        onSendConnectionRequest={handleSendConnectionRequest}
        onAcceptConnection={handleAcceptConnection}
        onRejectConnection={handleRejectConnection}
        onReportUser={handleReportUser}
        darkMode={darkMode}
        onNavigate={(v, extra) => {
          if (v === 'messages' && extra) { setPreSelectedMsgUserId(extra); setPreSelectedGroupId(null); }
          setActiveView(v);
        }}
      />
    );
    if (view === 'messages') return (
      <MessagingSection
        currentUser={currentUser}
        connections={connections}
        allUsers={allUsers}
        darkMode={darkMode}
        preSelectedUserId={preSelectedMsgUserId || undefined}
        preSelectedGroupId={preSelectedGroupId || undefined}
        onViewUserProfile={setViewingUserProfileId}
        communities={communities}
        onUnreadCountChange={setTotalUnreadMessages}
      />
    );
    if (view === 'colleges') return (
      <CollegesSection
        currentUser={currentUser}
        allUsers={allUsers}
        communities={communities}
        connections={connections}
        posts={posts}
        darkMode={darkMode}
        onCommunitiesChange={setCommunities}
        onViewUserProfile={setViewingUserProfileId}
      />
    );
    if (view === 'attendance') return (
      <AttendanceSection currentUser={currentUser} darkMode={darkMode} />
    );
    if (view === 'mycontent') return (
      <MyContentSection
        currentUser={currentUser}
        darkMode={darkMode}
        posts={posts}
        allUsers={allUsers}
        onDeletePost={handleDeletePost}
        onNavigate={(v, extra) => {
          if (v === 'messages' && extra?.startsWith('group:')) {
            setPreSelectedGroupId(extra.slice(6));
            setPreSelectedMsgUserId(null);
          } else if (v === 'messages' && extra) {
            setPreSelectedMsgUserId(extra);
            setPreSelectedGroupId(null);
          }
          setActiveView(v);
        }}
      />
    );
    if (view === 'profile') return (
      <ProfileSection
        currentUser={currentUser}
        onUpdateProfile={handleUpdateProfile}
        darkMode={darkMode}
        communities={communities}
        connections={connections}
        allUsers={allUsers}
        onLogout={handleLogout}
      />
    );
    if (view === 'find-people') return (
      <FindPeopleSection
        currentUser={currentUser}
        allUsers={allUsers}
        darkMode={darkMode}
        onSaveConnectPreference={handleSaveConnectPreference}
        onViewUserProfile={setViewingUserProfileId}
        onNavigate={(v: string, extra?: string) => {
          if (v === 'messages' && extra) { setPreSelectedMsgUserId(extra); setPreSelectedGroupId(null); }
          setActiveView(v);
        }}
      />
    );
    if (view === 'projects') return (
      <ProjectsSection
        currentUser={currentUser}
        allUsers={allUsers}
        connections={connections}
        darkMode={darkMode}
        onViewUserProfile={setViewingUserProfileId}
      />
    );
    if (view === 'events') return (
      <EventsSection
        currentUser={currentUser}
        allUsers={allUsers}
        darkMode={darkMode}
        onViewUserProfile={setViewingUserProfileId}
      />
    );
    if (view === 'communities') return (
      <CommunitiesSection
        currentUser={currentUser}
        communities={communities}
        posts={posts}
        allUsers={allUsers}
        connections={connections}
        initialCommunityId={initialCommId ?? undefined}
        onJoinCommunity={handleJoinCommunity}
        onLeaveCommunity={handleLeaveCommunity}
        onInviteToCommunity={handleInviteToCommunity}
        onAddPost={handleAddPost}
        onLikePost={handleLikePost}
        onAddComment={handleAddComment}
        onDeletePost={handleDeletePost}
        darkMode={darkMode}
        onViewUserProfile={setViewingUserProfileId}
        onAddResource={handleAddCommunityResource}
        onAddThread={handleAddCommunityThread}
        onAddThreadReply={handleAddThreadReply}
        onCreateCommunity={handleCreateCommunity}
        onAddPoll={handleAddCommunityPoll}
        onVotePoll={handleVoteCommunityPoll}
        onOpenGroupChat={(groupId) => {
          setPreSelectedGroupId(groupId);
          setPreSelectedMsgUserId(null);
          setActiveView('messages');
        }}
      />
    );
    if (view === 'admin') return (
      <AdminSection
        currentUser={currentUser}
        allUsers={allUsers}
        reports={reports}
        posts={posts}
        communities={communities}
        onToggleUserSuspension={handleToggleUserSuspension}
        onResolveReport={handleResolveReport}
        onDeletePost={handleDeletePost}
        onAllUsersChange={setAllUsers}
        onCommunitiesChange={setCommunities}
        darkMode={darkMode}
      />
    );
    if (view === 'college_admin' && currentUser.role === 'college_admin') return (
      <CollegeAdminSection
        currentUser={currentUser}
        allUsers={allUsers}
        communities={communities}
        darkMode={darkMode}
        onCommunitiesChange={setCommunities}
        onAllUsersChange={setAllUsers}
      />
    );
    return null;
  };

  return (
    <div className={`h-screen overflow-hidden flex flex-col md:h-auto md:min-h-screen md:overflow-x-hidden md:block w-full font-sans transition-all duration-300 ${darkMode ? 'text-slate-100' : 'text-slate-950'}`} style={{ backgroundColor: `var(--t-bg, ${THEMES[theme].bg})` }}>
      
      {/* ── Top Header ── */}
      <header className="shrink-0 md:fixed md:top-0 md:left-0 md:right-0 z-30 transition-all backdrop-blur-xl" style={{ backgroundColor: 'var(--t-header)' }}>

        {/* Main header row */}
        <div className="flex items-center justify-between px-4 lg:px-8 border-b border-neutral-200/70 dark:border-white/8 py-2 md:h-14 md:py-0">

          {/* Left — App logo and wordmark */}
          <div className="flex items-center gap-3">
            <NetworkLogo size={34} className="shrink-0 rounded-[9px] shadow-sm" />
            <div className="flex flex-col">
              <h1 className="font-sans font-black tracking-tight normal-case select-none bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent leading-[1.1] text-[13px] md:font-serif md:italic md:uppercase md:text-xl">
                <span>The Network</span>
              </h1>
              <span className="md:hidden mt-0.5 text-[9px] font-medium leading-tight text-slate-400">Connect. Learn. Grow.</span>
            </div>
            <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/8 border border-indigo-500/15 text-[9px] font-mono font-bold text-indigo-500/70 tracking-widest uppercase">
              Campus Co-founder Hub
            </span>
          </div>

          {/* Right — Actions */}
          <div className="flex items-center gap-1 sm:gap-1.5">

            {/* Live DB pill — desktop only */}
            <div className="hidden md:flex items-center gap-1.5 bg-emerald-500/8 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/15 text-[10px] font-mono font-bold">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Live
            </div>

            {/* Explore / Peer Search — mobile only */}
            <button
              onClick={() => setActiveView('explore')}
              className={`md:hidden relative p-2 rounded-xl border transition-all cursor-pointer ${
                activeView === 'explore'
                  ? 'border-indigo-400 bg-indigo-500/10 text-indigo-500'
                  : darkMode
                    ? 'border-white/10 hover:bg-white/6 text-slate-300'
                    : 'border-neutral-200 hover:bg-neutral-100 text-slate-600'
              }`}
              title="Explore students"
            >
              <Search size={15} />
              {activeView === 'explore' && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-500" />
              )}
            </button>

            {/* Notifications */}
            <NotificationsDropdown
              userId={currentUser.id}
              darkMode={darkMode}
              onNavigate={(view, targetId) => {
                if (view === 'messages' && targetId) setPreSelectedMsgUserId(targetId);
                if (view === 'communities' && targetId) {
                  setInitialCommId(targetId);
                  setPendingCommunityId(null);
                }
                navigateToView(view);
              }}
            />

            {/* Create pill — desktop only */}
            {!currentUser.isSuspended && (
              <button
                id="header-post-trigger"
                onClick={() => setShowCreateModal(true)}
                className="hidden md:flex items-center gap-1.5 py-1.5 px-4 rounded-full bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-pink-500 hover:to-indigo-600 font-extrabold text-[11px] uppercase tracking-wider text-white shadow-sm hover:shadow-indigo-500/20 hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer border-0 shrink-0"
                title="Create"
              >
                <Plus size={12} strokeWidth={2.5} />
                Create
              </button>
            )}

            {/* Avatar */}
            <button
              onClick={() => setActiveView('profile')}
              className="p-[2.5px] rounded-full bg-gradient-to-tr from-rose-500 via-amber-500 to-indigo-600 cursor-pointer hover:scale-105 transition-transform shrink-0"
              title="My profile"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 border-white dark:border-zinc-900 overflow-hidden ${darkMode ? 'bg-zinc-900 text-white' : 'bg-slate-100 text-slate-900'}`}>
                <Avatar avatar={currentUser.avatar} />
              </div>
            </button>
          </div>
        </div>

      </header>

      {/* ── Responsive app content: one active section mount for mobile and desktop ── */}
      <div
        className={`flex-1 min-h-0 w-full md:max-w-5xl md:mx-auto md:flex md:flex-row md:gap-6 md:p-4 md:pt-14 ${
          activeView === 'messages'
            ? 'flex flex-col overflow-hidden md:h-screen md:pb-0'
            : 'overflow-y-auto md:min-h-screen md:pb-6'
        }`}
        onTouchStart={onSwipeStart}
        onTouchEnd={onSwipeEnd}
      >

        <aside className={`hidden md:flex md:flex-col md:w-60 shrink-0 space-y-4 ${activeView === 'messages' ? 'md:overflow-y-auto md:max-h-full' : ''}`}>
          <div className="p-4 rounded-2xl border border-neutral-200/80 dark:border-white/10 shadow-sm transition-all overflow-x-auto md:overflow-hidden" style={{ backgroundColor: 'var(--t-card)' }}>
            <div className="hidden md:flex items-center gap-2 mb-4 pb-2 border-b border-neutral-100 dark:border-white/10">
              <span className="p-1 text-white bg-indigo-500 rounded-lg">
                <GraduationCap size={14} />
              </span>
              <span className="font-sans font-bold text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Sections
              </span>
            </div>

            <nav className="flex md:flex-col gap-1 md:space-y-0.5 overflow-x-auto md:overflow-visible no-scrollbar pb-1 md:pb-0 text-xs">
              <button
                id="view-feed-tab"
                onClick={() => setActiveView('feed')}
                className={`shrink-0 md:w-full py-2 px-3 rounded-xl flex items-center gap-3 font-semibold transition-all cursor-pointer border ${activeView === 'feed' ? 'bg-indigo-500 text-white border-transparent shadow-sm' : (darkMode ? 'text-slate-400 border-transparent hover:bg-white/5 hover:text-white' : 'text-slate-600 border-transparent hover:bg-neutral-100 hover:text-slate-950')}`}
              >
                <BookOpen size={14} />
                <span>Home Feed</span>
              </button>

              <button
                id="view-find-people-tab"
                onClick={() => setActiveView('find-people')}
                className={`shrink-0 md:w-full py-2 px-3 rounded-xl flex items-center gap-3 font-semibold transition-all cursor-pointer border ${activeView === 'find-people' ? 'bg-indigo-500 text-white border-transparent shadow-sm' : (darkMode ? 'text-slate-400 border-transparent hover:bg-white/5 hover:text-white' : 'text-slate-600 border-transparent hover:bg-neutral-100 hover:text-slate-950')}`}
              >
                <Users size={14} />
                <span>Campus Match</span>
              </button>

              <button
                id="view-explore-tab"
                onClick={() => setActiveView('explore')}
                className={`shrink-0 md:w-full py-2 px-3 rounded-xl flex items-center gap-3 font-semibold transition-all cursor-pointer border ${activeView === 'explore' ? 'bg-indigo-500 text-white border-transparent shadow-sm' : (darkMode ? 'text-slate-400 border-transparent hover:bg-white/5 hover:text-white' : 'text-slate-600 border-transparent hover:bg-neutral-100 hover:text-slate-950')}`}
              >
                <Search size={14} />
                <span className="flex-1 text-left">Connect &amp; Discover</span>
                {connections.filter(c => c.receiverId === currentUser.id && c.status === 'pending').length > 0 && (
                  <span className={`min-w-5 h-5 px-1 rounded-full flex items-center justify-center text-[9px] font-black ${activeView === 'explore' ? 'bg-white text-indigo-600' : 'bg-rose-500 text-white'}`}>
                    {connections.filter(c => c.receiverId === currentUser.id && c.status === 'pending').length}
                  </span>
                )}
              </button>

              <button
                id="view-messages-tab"
                onClick={() => setActiveView('messages')}
                className={`shrink-0 md:w-full py-2 px-3 rounded-xl flex items-center justify-between font-semibold transition-all cursor-pointer border ${activeView === 'messages' ? 'bg-indigo-500 text-white border-transparent shadow-sm' : (darkMode ? 'text-slate-400 border-transparent hover:bg-white/5 hover:text-white' : 'text-slate-600 border-transparent hover:bg-neutral-100 hover:text-slate-950')}`}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare size={14} />
                  <span>College Chats</span>
                </div>
                {totalUnreadMessages > 0 && (
                  <span className="py-0.5 px-2 rounded-full bg-rose-500 text-white text-[9px] font-bold">
                    {totalUnreadMessages}
                  </span>
                )}
              </button>

              <button
                id="view-communities-tab"
                onClick={() => setActiveView('communities')}
                className={`shrink-0 md:w-full py-2 px-3 rounded-xl flex items-center gap-3 font-semibold transition-all cursor-pointer border ${activeView === 'communities' ? 'bg-emerald-500 text-white border-transparent shadow-sm' : (darkMode ? 'text-slate-400 border-transparent hover:bg-white/5 hover:text-white' : 'text-slate-600 border-transparent hover:bg-neutral-100 hover:text-slate-950')}`}
              >
                <GraduationCap size={14} />
                <span>Communities</span>
              </button>

              <button
                id="view-colleges-tab"
                onClick={() => setActiveView('colleges')}
                className={`shrink-0 md:w-full py-2 px-3 rounded-xl flex items-center gap-3 font-semibold transition-all cursor-pointer border ${activeView === 'colleges' ? 'bg-indigo-500 text-white border-transparent shadow-sm' : (darkMode ? 'text-slate-400 border-transparent hover:bg-white/5 hover:text-white' : 'text-slate-600 border-transparent hover:bg-neutral-100 hover:text-slate-950')}`}
              >
                <Building2 size={14} />
                <span>Colleges</span>
              </button>

              <button
                id="view-attendance-tab"
                onClick={() => setActiveView('attendance')}
                className={`shrink-0 md:w-full py-2 px-3 rounded-xl flex items-center gap-3 font-semibold transition-all cursor-pointer border ${activeView === 'attendance' ? 'bg-indigo-500 text-white border-transparent shadow-sm' : (darkMode ? 'text-slate-400 border-transparent hover:bg-white/5 hover:text-white' : 'text-slate-600 border-transparent hover:bg-neutral-100 hover:text-slate-950')}`}
              >
                <ClipboardCheck size={14} />
                <span>Attendance</span>
              </button>

              <button
                id="view-mycontent-tab"
                onClick={() => setActiveView('mycontent')}
                className={`shrink-0 md:w-full py-2 px-3 rounded-xl flex items-center gap-3 font-semibold transition-all cursor-pointer border ${activeView === 'mycontent' ? 'bg-indigo-500 text-white border-transparent shadow-sm' : (darkMode ? 'text-slate-400 border-transparent hover:bg-white/5 hover:text-white' : 'text-slate-600 border-transparent hover:bg-neutral-100 hover:text-slate-950')}`}
              >
                <LayoutGrid size={14} />
                <span>My Content</span>
              </button>

              <button
                id="view-profile-tab"
                onClick={() => setActiveView('profile')}
                className={`shrink-0 md:w-full py-2 px-3 rounded-xl flex items-center gap-3 font-semibold transition-all cursor-pointer border ${activeView === 'profile' ? 'bg-indigo-500 text-white border-transparent shadow-sm' : (darkMode ? 'text-slate-400 border-transparent hover:bg-white/5 hover:text-white' : 'text-slate-600 border-transparent hover:bg-neutral-100 hover:text-slate-950')}`}
              >
                <Settings size={14} />
                <span>My Profile</span>
              </button>

              {currentUser.role === 'admin' && (
                <button
                  id="view-admin-tab"
                  onClick={() => setActiveView('admin')}
                  className={`shrink-0 md:w-full py-2 px-3 rounded-xl flex items-center gap-3 font-semibold transition-all cursor-pointer border ${activeView === 'admin' ? 'bg-rose-600 text-white border-transparent shadow-sm' : 'text-rose-600 border-transparent hover:bg-rose-500/10'}`}
                >
                  <ShieldAlert size={14} />
                  <span>Admin Center</span>
                </button>
              )}

              {currentUser.role === 'college_admin' && (
                <button
                  onClick={() => setActiveView('college_admin')}
                  className={`shrink-0 md:w-full py-2 px-3 rounded-xl flex items-center gap-3 font-semibold transition-all cursor-pointer border ${activeView === 'college_admin' ? 'bg-amber-500 text-white border-transparent shadow-sm' : 'text-amber-600 border-transparent hover:bg-amber-500/10'}`}
                >
                  <Crown size={14} />
                  <span>College Panel</span>
                </button>
              )}
            </nav>

            <div className="hidden md:block mt-6 pt-4 border-t border-neutral-100 dark:border-white/10 space-y-3">
              {/* Invite Friends CTA */}
              <button
                onClick={() => setShowInviteModal(true)}
                className="w-full py-2.5 px-3 rounded-xl flex items-center gap-3 text-xs font-bold cursor-pointer border-0 transition-all bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:opacity-90 shadow-sm shadow-indigo-500/20"
              >
                <Gift size={14} />
                <span>Invite Friends 🎁</span>
                <span className="ml-auto text-[9px] bg-white/20 px-1.5 py-0.5 rounded-full font-mono">+badge</span>
              </button>
              <button
                id="btn-logout"
                onClick={handleLogout}
                className="w-full py-2 px-3 rounded-xl flex items-center gap-3 text-xs font-semibold cursor-pointer text-rose-500 hover:bg-rose-500/10 transition-all text-left"
              >
                <LogOut size={13} />
                <span>Log Out</span>
              </button>
            </div>
          </div>

          <div className="hidden md:flex p-4 rounded-2xl border border-neutral-200/80 dark:border-white/10 shadow-sm text-left items-center gap-3" style={{ backgroundColor: 'var(--t-card)' }}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-slate-900 text-white dark:bg-white dark:text-slate-900 shrink-0 overflow-hidden`}>
              <Avatar avatar={currentUser.avatar} />
            </div>
            <div className="min-w-0 text-xs">
              <p className="font-extrabold truncate leading-none uppercase tracking-wide">{currentUser.fullName}</p>
              <p className={`text-[10px] truncate mt-1 opacity-70 font-mono`}>{currentUser.college}</p>
            </div>
          </div>
        </aside>

        <main className={`flex-1 min-w-0 ${activeView === 'messages' ? 'flex flex-col min-h-0 overflow-hidden' : 'md:space-y-6'}`}>
          <div
            key={slideKey}
            className={
              activeView === 'admin' || activeView === 'college_admin'
                ? 'fixed inset-0 z-40 overflow-y-auto pt-[108px] pb-24 px-3 md:static md:inset-auto md:z-auto md:overflow-visible md:p-0'
                : activeView === 'messages'
                  ? 'flex flex-col flex-1 h-full overflow-hidden'
                  : 'p-3 pb-4 space-y-4 md:p-0 md:space-y-6'
            }
            style={{
              backgroundColor:
                activeView === 'admin' || activeView === 'college_admin'
                  ? 'var(--t-bg)'
                  : undefined,
              overflowX: activeView === 'messages' ? 'clip' : undefined,
              animation: slideDir
                ? `${slideDir === 'left' ? 'slideInFromRight' : 'slideInFromLeft'} 0.28s cubic-bezier(0.25,0.46,0.45,0.94) both`
                : undefined,
            }}
          >
            {renderSection(activeView)}
          </div>
        </main>

      </div>

      {/* Root-level Reels Viewer — renders above everything including fixed header & bottom nav */}
      {activeReelData && (
        <ReelsViewer
          reels={activeReelData.reels}
          startIndex={activeReelData.index}
          allUsers={allUsers}
          currentUser={currentUser}
          darkMode={darkMode}
          onClose={() => setActiveReelData(null)}
          onViewUserProfile={(id) => { setActiveReelData(null); setViewingUserProfileId(id); }}
          onReact={handleReactToStory}
        />
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal
          currentUser={currentUser}
          darkMode={darkMode}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {/* New Post Modal */}
      {showCreateModal && (
        <CreateModal
          onClose={() => setShowCreateModal(false)}
          currentUser={currentUser}
          communities={communities}
          darkMode={darkMode}
          onPostCreated={(post) => setPosts(prev => [post, ...prev])}
          onEventCreated={(event) => { /* events live in EventsSection local state; navigate there */ setActiveView('events'); }}
          onProjectCreated={(proj) => { setActiveView('projects'); }}
          onCommunityCreated={(comm) => setCommunities(prev => [comm, ...prev])}
          onGroupCreated={(group) => { setActiveView('messages'); }}
          onStoryCreated={(story) => setStories(prev => [story, ...prev])}
        />
      )}

      {showNewPostModal && (
        <div className="fixed inset-0 bg-neutral-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all animate-fade-in font-sans">
          <div className={`relative w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl border border-neutral-200/90 dark:border-white/10 flex flex-col md:flex-row max-h-[90vh] md:h-[620px] transition-all duration-300 ${darkMode ? 'bg-[#0E0E12] text-[#F9F7F2]' : 'bg-white text-slate-900'}`}>
            
            <div className="w-full md:w-5/12 bg-neutral-950 text-white flex flex-col justify-between p-5 relative border-b md:border-b-0 md:border-r border-neutral-200/10 shrink-0">
              <div className="absolute inset-0 bg-radial-gradient opacity-15 pointer-events-none"></div>
              
              <div>
                <div className="flex items-center justify-between pb-3.5 border-b border-white/10 mb-4">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                    <Sparkle size={11} className="animate-spin-slow text-pink-500" />
                    <span>Instant Live Preview</span>
                  </span>
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="p-[1.5px] rounded-full bg-gradient-to-tr from-rose-500 via-amber-500 to-indigo-600">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-[#0E0E12] border border-white/10 overflow-hidden animate-none">
                      <Avatar avatar={currentUser.avatar} />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-black tracking-wide flex items-center gap-1">
                      <span className="truncate">{currentUser.fullName}</span>
                      {modalSelectedFeeling && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-pink-500/20 text-pink-300 text-[8.5px] font-bold shrink-0">
                          is feeling {modalSelectedFeeling}
                        </span>
                      )}
                    </div>
                    <div className="text-[8px] opacity-50 font-mono">
                      {currentUser.college} • {modalSelectedTag}
                    </div>
                  </div>
                </div>

                {modalProjectTitle && (
                  <div className="mt-3 bg-gradient-to-r from-indigo-500/10 via-pink-500/10 to-indigo-500/10 border border-indigo-500/30 rounded-lg p-2">
                    <div className="text-[7.5px] font-mono uppercase text-indigo-400 font-extrabold tracking-widest">🚀 Project showcase</div>
                    <div className="text-[10px] font-extrabold text-white truncate">{modalProjectTitle}</div>
                  </div>
                )}

                <p className="mt-3.5 text-[11px] font-sans leading-relaxed text-neutral-400 max-h-24 overflow-y-auto no-scrollbar break-words italic">
                  "{modalPostContent || 'Type something beautiful to preview your update in real-time on the campus timeline...'}"
                </p>
              </div>

              <div className="mt-4 flex-1 min-h-[120px] md:min-h-0 bg-[#060608] rounded-2xl border border-white/5 overflow-hidden flex items-center justify-center relative">
                {modalPostImage ? (
                  <>
                    <img
                      src={modalPostImage}
                      alt="Preview upload"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      type="button"
                      onClick={() => setModalPostImage('')}
                      className="absolute top-2 right-2 p-1 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all border-0 cursor-pointer"
                      title="Remove image"
                    >
                      <X size={10} />
                    </button>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <ImageIcon className="mx-auto text-neutral-600 mb-2" size={24} strokeWidth={1.5} />
                    <span className="text-[9px] text-neutral-500 block uppercase tracking-wide">No Media Attached</span>
                    <span className="text-[8px] text-neutral-600 block">Unsplash stock presets or uploads appear here</span>
                  </div>
                )}
              </div>

              <div className="pt-3 text-[8.2px] font-mono text-zinc-500 flex items-center justify-between">
                <span>POST PREVIEW — LIVE HUB</span>
                <span>JUST NOW</span>
              </div>
            </div>

            <form onSubmit={handleModalPostSubmit} className="flex-1 p-6 flex flex-col justify-between overflow-y-auto min-h-0">
              
              <div className="flex items-center justify-between pb-3.5 border-b border-neutral-200/80 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
                    <Sparkles size={14} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider">Launch a Pitch / Find a Collaborator</h3>
                    <p className="text-[9.5px] text-slate-400 dark:text-zinc-500">Reach co-founders, study partners & mentors instantly</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewPostModal(false)}
                  className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-all text-slate-500 hover:text-slate-600 dark:hover:text-white border-0 cursor-pointer bg-transparent"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="py-4 space-y-4 flex-1 overflow-y-auto pr-1 no-scrollbar text-xs">
                
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wide font-extrabold text-slate-400 dark:text-zinc-500">What are you building or looking for? <span className="text-rose-500">*</span></label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Pitch your startup idea, describe the co-founder you need, post a study group request, or share a research opportunity..."
                    value={modalPostContent}
                    onChange={(e) => setModalPostContent(e.target.value)}
                    className={`w-full p-3 rounded-xl border focus:ring-1 focus:ring-indigo-500 focus:outline-none resize-none transition-all text-xs ${darkMode ? 'bg-[#09090C] border-white/5 text-slate-100' : 'bg-neutral-50 border-neutral-200 text-slate-900'}`}
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase tracking-wide font-extrabold text-slate-400 dark:text-zinc-500 block">Current builder status — what mode are you in?</span>
                  <div className="flex flex-wrap gap-1.5">
                    {ACTIVE_FEELING_PRESETS.map((preset) => {
                      const feelingString = `${preset.emoji} ${preset.label}`;
                      const isSelected = modalSelectedFeeling === feelingString;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setModalSelectedFeeling(isSelected ? '' : feelingString)}
                          className={`px-2.5 py-1 rounded-xl text-[10.5px] border cursor-pointer transition-all flex items-center gap-1 ${
                            isSelected
                              ? 'bg-gradient-to-r from-indigo-500 to-pink-600 border-transparent text-white font-black scale-[1.03] shadow-xs'
                              : darkMode
                              ? 'bg-[#09090C] border-white/5 text-[#F9F7F2] hover:bg-neutral-800'
                              : 'bg-slate-50 border-neutral-200 text-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          <span>{preset.emoji}</span>
                          <span className="text-[9.5px]">{preset.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wide font-extrabold text-slate-400 dark:text-zinc-500">Academic Category</label>
                    <select
                      value={modalSelectedTag}
                      onChange={(e) => setModalSelectedTag(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-indigo-500 text-xs focus:outline-none cursor-pointer transition-all ${darkMode ? 'bg-[#09090C] border-white/5 text-slate-100' : 'bg-neutral-50 border-neutral-200 text-slate-900'}`}
                    >
                      {ACTIVE_ACADEMIC_TAGS.map(tag => (
                        <option key={tag} value={tag}>{tag}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wide font-extrabold text-slate-400 dark:text-zinc-500">Post to Community</label>
                    <select
                      value={modalSelectedCommunity}
                      onChange={(e) => setModalSelectedCommunity(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-indigo-500 text-xs focus:outline-none cursor-pointer transition-all ${darkMode ? 'bg-[#09090C] border-white/5 text-slate-100' : 'bg-neutral-50 border-neutral-200 text-slate-900'}`}
                    >
                      <option value="">General Feed</option>
                      {communities.map(comm => (
                        <option key={comm.id} value={comm.id}>{comm.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wide font-extrabold text-slate-400 dark:text-zinc-500">Project / Pitch Title (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. EcoDrone Autonomous Pitch Seed..."
                    value={modalProjectTitle}
                    onChange={(e) => setModalProjectTitle(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-indigo-500 text-xs focus:outline-none transition-all ${darkMode ? 'bg-[#09090C] border-white/5 text-slate-100' : 'bg-neutral-50 border-neutral-200 text-slate-900'}`}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wide font-extrabold text-slate-400 dark:text-zinc-500 block">Attach Image (Optional)</label>
                  
                  <div className="space-y-1">
                    <span className="text-[8.5px] text-slate-400 dark:text-zinc-500 block">Pick a stock theme:</span>
                    <div className="flex gap-2">
                      {STOCK_PRESETS.map((stock) => (
                        <button
                          key={stock.label}
                          type="button"
                          onClick={() => setModalPostImage(stock.url)}
                          className={`relative w-14 h-10 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${modalPostImage === stock.url ? 'border-indigo-500 scale-[1.04]' : 'border-neutral-300 dark:border-zinc-800 opacity-60 hover:opacity-100'}`}
                        >
                          <img src={stock.url} alt={stock.label} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <div className="absolute inset-x-0 bottom-0 bg-black/65 text-[7px] text-white text-center truncate py-0.2 font-mono">{stock.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <input
                        type="text"
                        placeholder="Or paste custom image URL..."
                        value={modalPostImage.startsWith('data:') ? '' : modalPostImage}
                        onChange={(e) => setModalPostImage(e.target.value)}
                        className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-indigo-500 text-xs focus:outline-none transition-all ${darkMode ? 'bg-[#09090C] border-white/5 text-slate-100' : 'bg-neutral-50 border-neutral-200 text-slate-900'}`}
                      />
                    </div>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        id="modal-image-file-input"
                        onChange={handleModalImageUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="modal-image-file-input"
                        className={`w-full p-2.5 rounded-xl border border-dashed text-center block text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all hover:bg-neutral-100 dark:hover:bg-zinc-800 ${darkMode ? 'border-zinc-800 text-[#F9F7F2]' : 'border-neutral-300 text-slate-700'}`}
                      >
                        Upload Photo
                      </label>
                    </div>
                  </div>
                </div>

              </div>

              <div className="pt-4 border-t border-neutral-200/80 dark:border-white/10 flex items-center justify-end gap-3 pointer-events-auto">
                <button
                  type="button"
                  id="btn-close-composer"
                  onClick={() => setShowNewPostModal(false)}
                  className={`px-4 py-2 rounded-full font-bold uppercase tracking-wider text-[10px] border-0 cursor-pointer transition-all ${darkMode ? 'bg-zinc-900 text-slate-300 hover:bg-zinc-800' : 'bg-neutral-100 text-slate-700 hover:bg-neutral-200'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-post-publish"
                  className="px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-pink-500 hover:from-pink-500 hover:to-indigo-600 text-white font-extrabold uppercase tracking-wider text-[10px] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm flex items-center gap-1.5 border-0 cursor-pointer"
                >
                  <Send size={11} />
                  <span>Share Update</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Peer Profile Overlay Modal */}
      {viewingUserProfileId && (() => {
        const selectedUser = allUsers.find(u => u.id === viewingUserProfileId);
        if (!selectedUser) return null;

        const sharedPosts = posts.filter(p => p.authorId === selectedUser.id);
        const currentRelations = connections.filter(
          c => (c.senderId === currentUser.id && c.receiverId === selectedUser.id) ||
               (c.senderId === selectedUser.id && c.receiverId === currentUser.id)
        );
        const activeRelation = currentRelations[0];
        const sharedInterests = (selectedUser.interests as string[]).filter(tag => (currentUser.interests as string[]).includes(tag));
        const sharedSkills = (selectedUser.skills as string[]).filter(tag => (currentUser.skills as string[]).includes(tag));
        const overlapCount = sharedInterests.length + sharedSkills.length;

        const handleQuickConnect = () => {
          handleSendConnectionRequest(selectedUser.id, 'Friendship', `Hi ${selectedUser.fullName}! I saw your profile and wanted to connect.`);
        };

        const handleStartChat = () => {
          setPreSelectedMsgUserId(selectedUser.id);
          setViewingUserProfileId(null);
          setActiveView('messages');
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2 sm:p-4 backdrop-blur-xs text-left overflow-hidden">
            <div className={`relative w-full max-w-2xl rounded-3xl border border-neutral-200/50 dark:border-white/10 shadow-2xl overflow-hidden transition-all flex flex-col h-[90vh] sm:h-[85vh] max-h-[90vh] min-h-0 ${
              darkMode ? 'bg-[#121217] text-slate-100' : 'bg-white text-slate-900'
            }`}>
              
              <div className="h-28 shrink-0 bg-gradient-to-r from-indigo-500 via-indigo-600 to-pink-500 relative flex items-end p-4">
                <button
                  onClick={() => setViewingUserProfileId(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white transition-all cursor-pointer border-0"
                >
                  <X size={16} />
                </button>
                <div className="absolute -bottom-8 left-6 p-[2px] rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-600 shadow-lg animate-none">
                  <div className={`w-18 h-18 rounded-full border-4 border-white dark:border-[#121217] flex items-center justify-center font-black text-xl bg-[#1A1A1A] text-white overflow-hidden`}>
                    <Avatar avatar={selectedUser.avatar} />
                  </div>
                </div>
              </div>

              <div className="pt-10 px-6 pb-4 shrink-0 border-b border-dashed border-neutral-100 dark:border-white/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black tracking-tight flex items-center gap-1.5 font-sans">
                      <span>{selectedUser.fullName}</span>
                      {selectedUser.isVerified && (
                        <span className="py-0.5 px-2 rounded bg-indigo-500/15 text-indigo-500 dark:bg-indigo-500/25 text-[9px] font-mono font-bold uppercase tracking-wide">
                          VERIFIED
                        </span>
                      )}
                    </h3>
                    <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                      {getEducationDisplay(selectedUser).compact}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {getEducationDisplay(selectedUser).institution || 'Student'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {selectedUser.id !== currentUser.id && (
                      <>
                        {activeRelation ? (
                          <span className={`py-1.5 px-3.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            activeRelation.status === 'accepted' 
                              ? 'bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/15' 
                              : 'bg-amber-500/10 text-amber-500 dark:bg-amber-500/15'
                          }`}>
                            {activeRelation.status === 'accepted' ? 'Connected' : 'Pending'}
                          </span>
                        ) : (
                          <button
                            onClick={handleQuickConnect}
                            className="py-1.5 px-4 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold uppercase tracking-wider text-[10px] border-0 cursor-pointer transition-colors shadow-xs"
                          >
                            Connect
                          </button>
                        )}

                        <button
                          onClick={handleStartChat}
                          className="py-1.5 px-4 rounded-full bg-pink-500 hover:bg-pink-600 text-white font-bold uppercase tracking-wider text-[10px] border-0 cursor-pointer transition-colors shadow-xs"
                        >
                          Message
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {selectedUser.id !== currentUser.id && overlapCount > 0 && (
                  <div className="mt-3.5 inline-flex items-center gap-1.5 py-1 px-3 rounded-lg border border-indigo-400/20 bg-indigo-500/[0.03] dark:bg-indigo-500/[0.05] text-[10px] font-mono uppercase font-bold text-indigo-600 dark:text-indigo-400">
                    <Sparkles size={11} className="text-indigo-500" />
                    <span>{overlapCount} shared dimension{overlapCount > 1 ? 's' : ''}: {[...sharedInterests, ...sharedSkills].join(', ')}</span>
                  </div>
                )}
              </div>

              <div className="flex border-b border-neutral-100 dark:border-white/5 bg-slate-50/20 dark:bg-zinc-950/20 shrink-0">
                <button
                  type="button"
                  onClick={() => setProfileActiveTab('card')}
                  className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider border-0 cursor-pointer border-b-2 transition-all ${
                    profileActiveTab === 'card' 
                      ? 'border-indigo-500 text-indigo-500 dark:text-indigo-400' 
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Profile 📑
                </button>
                <button
                  type="button"
                  onClick={() => setProfileActiveTab('shares')}
                  className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider border-0 cursor-pointer border-b-2 transition-all ${
                    profileActiveTab === 'shares' 
                      ? 'border-indigo-500 text-indigo-500 dark:text-indigo-400' 
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Posts ({sharedPosts.length}) 📢
                </button>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0">
                {profileActiveTab === 'card' && (
                  <div className="p-6 space-y-5 text-xs">
                    {selectedUser.aboutMe && (
                      <div>
                        <h4 className="text-[9px] uppercase tracking-widest font-extrabold text-slate-400 mb-2">About</h4>
                        <p className="leading-relaxed text-xs">{selectedUser.aboutMe}</p>
                      </div>
                    )}

                    {(selectedUser.interests as string[]).length > 0 && (
                      <div>
                        <h4 className="text-[9px] uppercase tracking-widest font-extrabold text-slate-400 mb-2">Interests</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {(selectedUser.interests as string[]).map(interest => (
                            <span key={interest} className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold ${sharedInterests.includes(interest) ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-400/20' : darkMode ? 'bg-white/5 text-slate-300' : 'bg-neutral-100 text-slate-700'}`}>
                              {interest} {sharedInterests.includes(interest) && '✓'}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {(selectedUser.skills as string[]).length > 0 && (
                      <div>
                        <h4 className="text-[9px] uppercase tracking-widest font-extrabold text-slate-400 mb-2">Skills</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {(selectedUser.skills as string[]).map(skill => (
                            <span key={skill} className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold ${sharedSkills.includes(skill) ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-400/20' : darkMode ? 'bg-white/5 text-slate-300' : 'bg-neutral-100 text-slate-700'}`}>
                              {skill} {sharedSkills.includes(skill) && '✓'}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {(selectedUser.lookingFor as string[]).length > 0 && (
                      <div>
                        <h4 className="text-[9px] uppercase tracking-widest font-extrabold text-slate-400 mb-2">Looking For</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {(selectedUser.lookingFor as string[]).map(item => (
                            <span key={item} className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold ${darkMode ? 'bg-pink-500/10 text-pink-400' : 'bg-pink-50 text-pink-600 border border-pink-200/50'}`}>
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {profileActiveTab === 'shares' && (
                  <div className="p-4 space-y-3">
                    {sharedPosts.length === 0 ? (
                      <div className="text-center py-12 text-slate-400">
                        <p className="text-sm">No posts yet</p>
                      </div>
                    ) : (
                      sharedPosts.map(post => (
                        <div key={post.id} className={`p-4 rounded-xl border text-xs ${darkMode ? 'bg-white/3 border-white/5' : 'bg-neutral-50 border-neutral-200'}`}>
                          {post.projectTitle && (
                            <div className="text-[9px] font-mono text-indigo-500 uppercase font-bold mb-1">{post.projectTitle}</div>
                          )}
                          <p className="leading-relaxed">{post.content}</p>
                          <div className="flex items-center gap-3 mt-2 text-[9px] text-slate-400">
                            <span className="flex items-center gap-1"><Heart size={10} /> {(post.likes as string[]).length}</span>
                            <span>{post.academicTag}</span>
                            <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

    <InstallPrompt darkMode={darkMode} />
    {currentUser && <NotificationSetup userId={currentUser.id} darkMode={darkMode} onForegroundPush={(p) => {
      setPushToast(p as any);
      playNetworkNotificationSound();
    }} />}
    {currentUser && (typeof Notification !== 'undefined') && Notification.permission !== 'granted' && (
      <NotificationBanner userId={currentUser.id} darkMode={darkMode} />
    )}
    <PushToast
      darkMode={darkMode}
      payload={pushToast}
      onNavigate={(view, userId) => {
        setActiveView(view);
        if (userId && view === 'messages') setPreSelectedMsgUserId(userId);
        if (userId && view === 'communities') setInitialCommId(userId);
      }}
      onDismiss={() => setPushToast(null)}
    />

    {/* Mobile Bottom Navigation Bar */}
    <nav className={`md:hidden relative shrink-0 z-50 border-t flex items-center px-1 py-2 ${darkMode ? 'bg-[#09090C]/95 border-white/10 backdrop-blur-xl' : 'bg-white/95 border-neutral-200 backdrop-blur-xl'}`}
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      {manageMenuOpen && (
        <div className={`absolute bottom-full right-2 mb-2 w-48 rounded-2xl border p-2 shadow-xl ${
          darkMode
            ? 'bg-[#121217]/98 border-white/10 text-slate-100'
            : 'bg-white/98 border-neutral-200 text-slate-800'
        }`}>
          <div className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest ${
            darkMode ? 'text-slate-500' : 'text-slate-400'
          }`}>
            Manage
          </div>
          {[
            { view: 'colleges', icon: <Building2 size={16} />, label: 'Campus' },
            { view: 'attendance', icon: <ClipboardCheck size={16} />, label: 'Attendance' },
            { view: 'mycontent', icon: <LayoutGrid size={16} />, label: 'My Content' },
            ...(currentUser.role === 'admin'
              ? [{ view: 'admin', icon: <ShieldAlert size={16} />, label: 'Admin Center' }]
              : []),
          ].map(item => (
            <button
              key={item.view}
              onClick={() => {
                setActiveView(item.view);
                setManageMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition-colors ${
                activeView === item.view
                  ? 'bg-indigo-500 text-white'
                  : darkMode
                    ? 'text-slate-300 hover:bg-white/8'
                    : 'text-slate-600 hover:bg-neutral-100'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Create — kept on the general app navigation, but Connect uses the
          focused five-item phone navigation from its product design. */}
      {activeView !== 'find-people' && !currentUser.isSuspended && (
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex-1 flex flex-col items-center gap-0.5 py-1 cursor-pointer"
        >
          <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 -mt-5">
            <Plus size={20} className="text-white" strokeWidth={2.5} />
          </span>
          <span className={`text-[9px] font-semibold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Create</span>
        </button>
      )}

      {(activeView === 'find-people'
        ? [
            { view: 'feed',        icon: <BookOpen size={18} />,       label: 'Home' },
            { view: 'communities', icon: <GraduationCap size={18} />, label: 'Communities' },
            { view: 'find-people', icon: <UserPlus size={18} />,      label: 'Connect' },
            { view: 'colleges',    icon: <BookOpen size={18} />,      label: 'Learn' },
            { view: 'messages',    icon: <MessageSquare size={18} />, label: 'Chats', badge: totalUnreadMessages },
          ]
        : [
            { view: 'feed',        icon: <BookOpen size={18} />,       label: 'Home' },
            { view: 'communities', icon: <GraduationCap size={18} />, label: 'Communities' },
            { view: 'find-people', icon: <Users size={18} />,         label: 'Campus Match' },
            { view: 'messages',    icon: <MessageSquare size={18} />, label: 'Chats', badge: totalUnreadMessages },
          ]
      ).map(item => (
        <button
          key={item.view}
          onClick={() => setActiveView(item.view)}
          className={`flex-1 relative flex flex-col items-center gap-0.5 py-1 rounded-xl transition-all cursor-pointer ${
            activeView === item.view
              ? 'text-indigo-500'
              : darkMode ? 'text-slate-500' : 'text-slate-400'
          }`}
        >
          {item.badge && item.badge > 0 ? (
            <span className="relative">
              {item.icon}
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[7px] font-bold flex items-center justify-center">{item.badge > 9 ? '9+' : item.badge}</span>
            </span>
          ) : item.icon}
          <span className={`text-[9px] font-semibold leading-none ${activeView === item.view ? 'text-indigo-500' : ''}`}>{item.label}</span>
          {activeView === item.view && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-500" />}
        </button>
      ))}

      {activeView !== 'find-people' && (
        <button
          onClick={() => setManageMenuOpen(open => !open)}
          className={`flex-1 relative flex flex-col items-center gap-0.5 py-1 rounded-xl transition-all cursor-pointer ${
             manageMenuOpen || ['colleges', 'attendance', 'mycontent', 'admin'].includes(activeView)
              ? 'text-indigo-500'
              : darkMode ? 'text-slate-500' : 'text-slate-400'
          }`}
          aria-expanded={manageMenuOpen}
          aria-label="Manage campus tools"
        >
          <Settings size={18} />
          <span className={`text-[9px] font-semibold leading-none ${
             manageMenuOpen || ['colleges', 'attendance', 'mycontent', 'admin'].includes(activeView) ? 'text-indigo-500' : ''
          }`}>Manage</span>
           {(manageMenuOpen || ['colleges', 'attendance', 'mycontent', 'admin'].includes(activeView)) && (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-500" />
          )}
        </button>
      )}
    </nav>
    </div>
  );
}
