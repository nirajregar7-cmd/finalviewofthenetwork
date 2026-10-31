import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, Community, Post, CampusEvent, CommunityPoll, Connection, GroupChat } from '../types';
import {
  Rocket, Cpu, Code, Briefcase, Palette, Users, ArrowRight, ShieldCheck, Sparkles,
  MessageSquare, Plus, Search, Globe, Shield, Database, Zap, Github, Package,
  DollarSign, Megaphone, Cloud, ShoppingBag, GraduationCap, BookOpen, FileText,
  Activity, Heart, Award, TrendingUp, Sliders, Bookmark, Train, Scale, Layers,
  Image, Video, Camera, Tv, Hash, Home, Map, Play, Book, Laptop, MessageCircle, Check, Send, Sparkle, Link as LinkIcon,
  CalendarDays, Vote, UserCheck, X, ChevronRight, MapPin, Clock, Trash2, Share2, Settings,
  LockKeyhole, BookMarked, MessagesSquare, SearchCheck, LoaderCircle
} from 'lucide-react';
import FeedSection from './FeedSection';
import Avatar from './Avatar';
import JeeCountdownCard from './JeeCountdownCard';
import { api } from '../api';
import { getCollegeImage } from '../data/collegeImages';
import { getCommunityImage } from '../data/communityImages';
import CommunityShareModal from './CommunityShareModal';
import CommunityDiscovery from './CommunityDiscovery';
import { getEducationDisplay } from '../utils/education';

interface CommunitiesSectionProps {
  currentUser: UserProfile;
  communities: Community[];
  posts: Post[];
  allUsers: UserProfile[];
  connections?: Connection[];
  initialCommunityId?: string;
  onJoinCommunity: (communityId: string) => void;
  onLeaveCommunity: (communityId: string) => void;
  onShareCommunity?: (community: Community) => void;
  onInviteToCommunity: (communityId: string, userIds: string[]) => Promise<{ invitedIds: string[] }>;
  onAddPost: (
    content: string,
    academicTag: string,
    communityId?: string,
    projectTitle?: string,
    postImage?: string,
    feeling?: string
  ) => void;
  onLikePost: (postId: string) => void;
  onAddComment: (postId: string, content: string) => void;
  onDeletePost?: (postId: string) => void;
  darkMode: boolean;
  onViewUserProfile?: (userId: string) => void;
  onAddResource?: (communityId: string, title: string, link: string, description: string) => void;
  onAddThread?: (communityId: string, title: string, content: string) => void;
  onAddThreadReply?: (communityId: string, threadId: string, content: string) => void;
  onCreateCommunity?: (community: { name: string; description: string; icon: string; tags: string[]; category: string; college?: string }) => void;
  onAddPoll?: (communityId: string, question: string, options: string[]) => void;
  onVotePoll?: (communityId: string, pollId: string, optionIndex: number) => void;
  onOpenGroupChat?: (groupId: string) => void;
}

export default function CommunitiesSection({
  currentUser,
  communities,
  posts,
  allUsers,
  connections = [],
  initialCommunityId,
  onJoinCommunity,
  onLeaveCommunity,
  onShareCommunity,
  onInviteToCommunity,
  onAddPost,
  onLikePost,
  onAddComment,
  onDeletePost,
  darkMode,
  onViewUserProfile,
  onAddResource,
  onAddThread,
  onAddThreadReply,
  onCreateCommunity,
  onAddPoll,
  onVotePoll,
  onOpenGroupChat,
}: CommunitiesSectionProps) {
  // Option to view a specific community's details
  const [activeCommunityId, setActiveCommunityId] = useState<string | null>(initialCommunityId ?? null);

  // Open the community passed from feed card clicks
  useEffect(() => {
    if (initialCommunityId) {
      setActiveCommunityId(initialCommunityId);
    }
  }, [initialCommunityId]);

  // Specific community workspace tabs
  const [activeTab, setActiveTab] = useState<'feed' | 'members' | 'events' | 'polls' | 'resources' | 'threads' | 'chat' | 'groups'>('feed');

  const [communityGroups, setCommunityGroups] = useState<GroupChat[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState('');
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupPurpose, setGroupPurpose] = useState<'study' | 'chat'>('study');
  const [groupVisibility, setGroupVisibility] = useState<'public' | 'private'>('public');
  const [groupSaving, setGroupSaving] = useState(false);
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);
  const [groupsFilter, setGroupsFilter] = useState<'all' | 'study' | 'chat'>('all');
  const [groupsReload, setGroupsReload] = useState(0);

  // Group chat state
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const [chatConnection, setChatConnection] = useState<'connecting' | 'live' | 'polling' | 'offline'>('offline');
  const [feedbackOpenId, setFeedbackOpenId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Events tab state
  const [communityEvents, setCommunityEvents] = useState<CampusEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsFetched, setEventsFetched] = useState(false);

  // Polls tab state
  const [showPollForm, setShowPollForm] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollOptionInput, setPollOptionInput] = useState('');

  // Search, filter, category state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string>('All');
  const [directoryMode, setDirectoryMode] = useState<'browse' | 'joined'>('browse');

  // Expanded discussion thread state
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  // New resource form state
  const [showAddResourceForm, setShowAddResourceForm] = useState(false);
  const [resTitle, setResTitle] = useState('');
  const [resLink, setResLink] = useState('');
  const [resDesc, setResDesc] = useState('');

  // New thread form state
  const [showAddThreadForm, setShowAddThreadForm] = useState(false);
  const [threadTitle, setThreadTitle] = useState('');
  const [threadContent, setThreadContent] = useState('');

  // Reply input state
  const [replyText, setReplyText] = useState('');

  // Create club modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [shareCommunity, setShareCommunity] = useState<Community | null>(null);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createCategory, setCreateCategory] = useState('Club');
  const [createIcon, setCreateIcon] = useState('Users');
  const [createTagInput, setCreateTagInput] = useState('');
  const [createTags, setCreateTags] = useState<string[]>([]);

  const ICON_OPTIONS = [
    { name: 'Users', label: 'General' },
    { name: 'Rocket', label: 'Startup' },
    { name: 'Code', label: 'Coding' },
    { name: 'Briefcase', label: 'Business' },
    { name: 'BookOpen', label: 'Study' },
    { name: 'GraduationCap', label: 'Academic' },
    { name: 'Zap', label: 'Hackathon' },
    { name: 'Heart', label: 'Wellness' },
    { name: 'Globe', label: 'Network' },
    { name: 'Cpu', label: 'Engineering' },
    { name: 'Award', label: 'Competitive' },
    { name: 'Palette', label: 'Creative' },
    { name: 'TrendingUp', label: 'Growth' },
    { name: 'Layers', label: 'Research' },
    { name: 'Hash', label: 'Topic' },
    { name: 'Database', label: 'Data' },
  ];

  const handleAddCreateTag = () => {
    const tag = createTagInput.trim().replace(/^#/, '');
    if (tag && !createTags.includes(tag) && createTags.length < 6) {
      setCreateTags(prev => [...prev, tag]);
      setCreateTagInput('');
    }
  };

  const handleCreateTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddCreateTag();
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim() || !createDesc.trim()) return;
    if (onCreateCommunity) {
      onCreateCommunity({
        name: createName.trim().toUpperCase(),
        description: createDesc.trim(),
        category: createCategory,
        icon: createIcon,
        tags: createTags.length > 0 ? createTags : [createCategory.split(' ')[0]],
        college: createCategory === 'Club' ? currentUser.college : undefined,
      });
    }
    setCreateName('');
    setCreateDesc('');
    setCreateCategory('Club');
    setCreateIcon('Users');
    setCreateTags([]);
    setCreateTagInput('');
    setShowCreateModal(false);
  };

  // Map icon strings to Lucide components
  const renderIcon = (iconName: string) => {
    const props = { size: 18, className: "text-indigo-600 dark:text-indigo-400" };
    switch (iconName) {
      case 'Rocket': return <Rocket {...props} />;
      case 'Cpu': return <Cpu {...props} />;
      case 'Code': return <Code {...props} />;
      case 'Briefcase': return <Briefcase {...props} />;
      case 'Palette': return <Palette {...props} />;
      case 'Globe': return <Globe {...props} />;
      case 'Shield': return <Shield {...props} />;
      case 'Database': return <Database {...props} />;
      case 'Zap': return <Zap {...props} />;
      case 'Github': return <Github {...props} />;
      case 'Package': return <Package {...props} />;
      case 'DollarSign': return <DollarSign {...props} />;
      case 'Megaphone': return <Megaphone {...props} />;
      case 'Cloud': return <Cloud {...props} />;
      case 'ShoppingBag': return <ShoppingBag {...props} />;
      case 'GraduationCap': return <GraduationCap {...props} />;
      case 'BookOpen': return <BookOpen {...props} />;
      case 'FileText': return <FileText {...props} />;
      case 'Activity': return <Activity {...props} />;
      case 'Heart': return <Heart {...props} />;
      case 'Award': return <Award {...props} />;
      case 'TrendingUp': return <TrendingUp {...props} />;
      case 'Sliders': return <Sliders {...props} />;
      case 'Bookmark': return <Bookmark {...props} />;
      case 'Train': return <Train {...props} />;
      case 'Scale': return <Scale {...props} />;
      case 'Layers': return <Layers {...props} />;
      case 'Settings': return <Settings {...props} />;
      case 'Image': return <Image {...props} />;
      case 'Video': return <Video {...props} />;
      case 'Camera': return <Camera {...props} />;
      case 'Tv': return <Tv {...props} />;
      case 'Hash': return <Hash {...props} />;
      case 'Home': return <Home {...props} />;
      case 'Map': return <Map {...props} />;
      case 'Play': return <Play {...props} />;
      case 'Book': return <Book {...props} />;
      case 'Laptop': return <Laptop {...props} />;
      default: return <Users {...props} />;
    }
  };

  // Get User details helper
  const getUserDetails = (userId: string): { name: string; avatar: string; college: string } => {
    const user = allUsers.find(u => u.id === userId);
    if (user) {
      return {
        name: user.fullName,
        avatar: user.avatar,
        college: user.college
      };
    }
    return {
      name: 'Verified Student',
      avatar: 'VS',
      college: 'The Network'
    };
  };

  // Categories list
  const categoriesList = [
    'All',
    'Club',
    'Engineering & Technology',
    'Startups & Entrepreneurship',
    'Medical & Healthcare',
    'Management & Business',
    'Government Exams',
    'Higher Education & Research',
    'Law & Public Policy',
    'Design & Creativity',
    'Campus Life & Social',
    'Opportunities'
  ];

  // Selected Community
  const selectedComm = communities.find(c => c.id === activeCommunityId);
  const hasJoinedSelectedCommunity = Boolean(selectedComm?.memberIds.includes(currentUser.id));

  useEffect(() => {
    if (activeTab !== 'groups' || !selectedComm || !hasJoinedSelectedCommunity) return;
    let active = true;
    setGroupsLoading(true);
    setGroupsError('');
    setCommunityGroups([]);
    Promise.all([
      api.groupChats.getCommunityGroups(selectedComm.id) as Promise<GroupChat[]>,
      api.groupChats.getAll() as Promise<GroupChat[]>,
    ]).then(([directoryGroups, userGroups]) => {
      if (!active) return;
      const personalGroups = userGroups.filter(group =>
        group.communityId === selectedComm.id &&
        (group.isMember === true || group.memberIds?.includes(currentUser.id) ||
          group.pendingIds?.includes(currentUser.id))
      );
      const merged = new globalThis.Map<string, GroupChat>();
      directoryGroups.forEach(group => merged.set(group.id, group));
      personalGroups.forEach(group => merged.set(group.id, { ...merged.get(group.id), ...group }));
      setCommunityGroups(Array.from(merged.values()));
    }).catch(() => {
      if (active) setGroupsError('Groups could not be loaded right now.');
    }).finally(() => {
      if (active) setGroupsLoading(false);
    });
    return () => { active = false; };
  }, [activeTab, selectedComm?.id, hasJoinedSelectedCommunity, currentUser.id, groupsReload]);

  const isGroupMember = (group: GroupChat) =>
    group.isMember ?? Boolean(group.memberIds?.includes(currentUser.id));
  const isGroupInvitePending = (group: GroupChat) =>
    !isGroupMember(group) && Boolean(group.pendingIds?.includes(currentUser.id));

  const resetGroupForm = () => {
    setGroupName('');
    setGroupDescription('');
    setGroupPurpose('study');
    setGroupVisibility('public');
    setShowGroupForm(false);
  };

  const handleCreateCommunityGroup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedComm || !hasJoinedSelectedCommunity || !groupName.trim() || groupSaving) return;
    setGroupSaving(true);
    setGroupsError('');
    try {
      const created = await api.groupChats.create({
        name: groupName.trim(),
        creatorId: currentUser.id,
        college: currentUser.college,
        type: groupPurpose === 'study' ? 'course' : 'interest',
        branch: currentUser.branch || null,
        communityId: selectedComm.id,
        description: groupDescription.trim(),
        purpose: groupPurpose,
        visibility: groupVisibility,
      }) as GroupChat;
      setCommunityGroups(previous => [{ ...created, isMember: true }, ...previous.filter(group => group.id !== created.id)]);
      resetGroupForm();
    } catch {
      setGroupsError('This group could not be created. Please try again.');
    } finally {
      setGroupSaving(false);
    }
  };

  const handleJoinCommunityGroup = async (group: GroupChat) => {
    if (joiningGroupId) return;
    setJoiningGroupId(group.id);
    setGroupsError('');
    try {
      const joined = await api.groupChats.joinCommunityGroup(group.id) as GroupChat;
      setCommunityGroups(previous => previous.some(item => item.id === joined.id)
        ? previous.map(item => item.id === joined.id ? { ...item, ...joined, isMember: true } : item)
        : [{ ...joined, isMember: true }, ...previous]);
    } catch {
      setGroupsError('Could not join this group. Please try again.');
    } finally {
      setJoiningGroupId(null);
    }
  };

  const openCommunityGroup = (group: GroupChat) => {
    if (isGroupMember(group)) onOpenGroupChat?.(group.id);
  };
  const isCourseCommunity = selectedComm?.category === 'Course Community';
  const normalizedCourseText = selectedComm
    ? `${selectedComm.name} ${selectedComm.description} ${selectedComm.tags.join(' ')}`.toLowerCase()
    : '';
  const seniorGuides = isCourseCommunity
    ? allUsers
        .filter(user => {
          if (user.id === currentUser.id || user.year <= currentUser.year) return false;
          const branchText = `${user.branch} ${user.degree}`.toLowerCase();
          const aliases = [
            ['computer', 'cse', 'software', 'information technology', 'it'].some(term => branchText.includes(term) && normalizedCourseText.includes(term)),
            ['electronic', 'ece', 'telecommunication', 'embedded'].some(term => branchText.includes(term) && normalizedCourseText.includes(term)),
            ['mechanical', 'automobile', 'production'].some(term => branchText.includes(term) && normalizedCourseText.includes(term)),
            ['civil', 'construction'].some(term => branchText.includes(term) && normalizedCourseText.includes(term)),
            ['business', 'commerce', 'management', 'bba', 'bcom', 'mba'].some(term => branchText.includes(term) && normalizedCourseText.includes(term)),
            ['medical', 'mbbs', 'health', 'nursing', 'pharmacy'].some(term => branchText.includes(term) && normalizedCourseText.includes(term)),
            ['law', 'legal', 'llb', 'llm'].some(term => branchText.includes(term) && normalizedCourseText.includes(term)),
          ];
          return aliases.some(Boolean);
        })
        .sort((a, b) => b.year - a.year)
        .slice(0, 6)
    : [];

  const mergeChatMessages = (existing: any[], incoming: any[]) => {
    const byId = new globalThis.Map<string, any>();
    [...existing, ...incoming].forEach(message => byId.set(message.id, message));
    return Array.from(byId.values()).sort(
      (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  };

  // Load the persisted history once, then receive new messages over SSE.
  // Polling remains as a recovery path if the stream is unavailable.
  const loadChat = async (commId: string, showLoading = true): Promise<boolean> => {
    if (showLoading) setChatLoading(true);
    try {
      const msgs = await api.entityMessages.get('community', commId, currentUser.id);
      setChatMessages(msgs);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      return true;
    } catch {
      return false;
    } finally {
      if (showLoading) setChatLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'chat' && activeCommunityId) {
      const communityId = activeCommunityId;
      let disposed = false;
      let fallbackInterval: ReturnType<typeof setInterval> | null = null;
      let stream: EventSource | null = null;

      setChatMessages([]);
      setChatConnection('connecting');
      void loadChat(communityId).then(ok => {
        if (!disposed && !ok) setChatConnection('offline');
      });

      const startFallbackPolling = () => {
        if (disposed || fallbackInterval) return;
        setChatConnection('polling');
        fallbackInterval = setInterval(() => {
          void loadChat(communityId, false);
        }, 2500);
      };

      if (typeof EventSource !== 'undefined') {
        stream = api.entityMessages.stream('community', communityId, currentUser.id);
        stream.onopen = () => {
          if (!disposed) {
            setChatConnection('live');
            // Keep the database reconciliation timer running. On Vercel,
            // this stream may be connected to a different serverless
            // instance than the one that receives the next message.
          }
        };
        stream.onmessage = event => {
          if (disposed) return;
          try {
            const message = JSON.parse(event.data);
            setChatMessages(prev => mergeChatMessages(prev, [message]));
            setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
          } catch {
            // Ignore malformed events; the next history refresh will recover.
          }
        };
        stream.onerror = () => {
          if (!disposed) startFallbackPolling();
        };
      } else {
        startFallbackPolling();
      }

      return () => {
        disposed = true;
        stream?.close();
        if (fallbackInterval) clearInterval(fallbackInterval);
      };
    }
    setChatConnection('offline');
  }, [activeTab, activeCommunityId, currentUser.id]);

  // Load events when events tab opens (fetch once per community open)
  useEffect(() => {
    if (activeTab === 'events' && !eventsFetched) {
      setEventsLoading(true);
      api.events.getAll().then((evs: CampusEvent[]) => {
        setCommunityEvents(evs);
        setEventsFetched(true);
      }).catch(() => {}).finally(() => setEventsLoading(false));
    }
  }, [activeTab, eventsFetched]);

  // Reset events fetch flag when switching communities
  useEffect(() => {
    setEventsFetched(false);
    setCommunityEvents([]);
  }, [activeCommunityId]);

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !activeCommunityId || chatSending) return;
    setChatSending(true);
    try {
      const msg = await api.entityMessages.send('community', activeCommunityId, currentUser.id, chatInput.trim());
      setChatMessages(prev => mergeChatMessages(prev, [msg]));
      setChatInput('');
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch {}
    setChatSending(false);
  };

  const parseChatAnnouncement = (content: string) => {
    const match = content.match(/^(📚 RESOURCE|🧵 DISCUSSION|🗳️ POLL) • ([^\n]+)\n?([\s\S]*)$/);
    if (!match) return null;
    const [, kind, title, details] = match;
    const itemMarker = details.match(/\[\[community-item:(poll|discussion|resource):([^\]]+)\]\]/);
    const itemType = itemMarker?.[1];
    const itemId = itemMarker?.[2];
    const visibleDetails = details.replace(/\n?\[\[community-item:(?:poll|discussion|resource):[^\]]+\]\]/, '').trim();
    const resourceLink = kind === '📚 RESOURCE'
      ? visibleDetails.match(/(?:^|\n)🔗\s*(https?:\/\/\S+)\s*$/)?.[1]
      : undefined;
    const detailText = resourceLink
      ? visibleDetails.replace(new RegExp(`(?:^|\\n)🔗\\s*${resourceLink.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`), '').trim()
      : visibleDetails;
    const normalizedKind = kind === '📚 RESOURCE' ? 'resource' : kind === '🧵 DISCUSSION' ? 'discussion' : 'poll';
    const resolvedType = itemType || normalizedKind;
    const resolvedItemId = itemId || undefined;
    const poll = resolvedType === 'poll'
      ? (selectedComm?.polls || []).find(p => p.id === resolvedItemId || p.question === title)
      : undefined;
    const thread = resolvedType === 'discussion'
      ? (selectedComm?.threads || []).find(t => t.id === resolvedItemId || t.title === title)
      : undefined;
    const resource = resolvedType === 'resource'
      ? (selectedComm?.resources || []).find(r => r.id === resolvedItemId || r.title === title)
      : undefined;
    const fallbackOptions = normalizedKind === 'poll'
      ? (detailText.replace(/^Options:\s*/i, '').split(' • ').map(option => option.trim()).filter(Boolean))
      : [];
    return {
      kind: normalizedKind,
      title,
      detailText,
      resourceLink: resource?.link || resourceLink,
      poll,
      thread,
      resource,
      options: poll?.options || fallbackOptions,
      itemId: resolvedItemId,
    } as const;
  };

  const sendAnnouncementFeedback = async (feedbackId: string, title: string) => {
    const text = feedbackText.trim();
    if (!text || !activeCommunityId || feedbackSending) return;
    setFeedbackSending(true);
    try {
      const msg = await api.entityMessages.send(
        'community',
        activeCommunityId,
        currentUser.id,
        `💬 FEEDBACK • ${title}\n${text}`
      );
      setChatMessages(prev => [...prev, msg]);
      setFeedbackText('');
      setFeedbackOpenId(null);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch {}
    setFeedbackSending(false);
  };

  // Domain tabs definition
  const DOMAIN_TABS = [
    { id: 'All',        label: 'All',           emoji: '🌐' },
    { id: 'College',    label: 'All Colleges',  emoji: '🎓' },
    { id: 'Clubs',      label: 'Clubs & Societies', emoji: '🏛️' },
    { id: 'Coding',     label: 'Coding',        emoji: '💻' },
    { id: 'Placements', label: 'Placements',    emoji: '💼' },
    { id: 'Academics',  label: 'Academics',     emoji: '📚' },
    { id: 'Interests',  label: 'Interests',     emoji: '🎯' },
    { id: 'Medical',    label: 'Medical',       emoji: '🏥' },
    { id: 'Design',     label: 'Design',        emoji: '🎨' },
  ];

  // Domain → category group mapping
  const DOMAIN_CATEGORIES: Record<string, string[]> = {
    Coding:     ['Engineering & Technology'],
    Placements: ['Management & Business', 'Opportunities'],
    Academics:  ['Government Exams', 'Higher Education & Research', 'Law & Public Policy'],
    Interests:  ['Campus Life & Social', 'Startups & Entrepreneurship'],
    Medical:    ['Medical & Healthcare'],
    Design:     ['Design & Creativity'],
  };

  // Separate college communities from regular chapters
  const collegeCommunities = communities.filter(c => c.category === 'College Community');
  const clubCommunities = communities.filter(c => c.category === 'Club');
  const visibleClubCommunities = clubCommunities.filter(c => {
    const q = searchQuery.trim().toLowerCase();
    return !q ||
      c.name.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.tags.some(tag => tag.toLowerCase().includes(q));
  });
  const myCollegeCommunity = collegeCommunities.find(c => c.name === currentUser.college);

  // Dynamic search filtering — exclude college communities (shown in dedicated section)
  const filteredCommunities = communities.filter(comm => {
    if (comm.category === 'College Community' || comm.category === 'Club') return false;
    // Domain filter (skip for All/College — College domain hides this grid entirely)
    if (selectedDomain !== 'All' && selectedDomain !== 'College') {
      const allowed = DOMAIN_CATEGORIES[selectedDomain] ?? [];
      if (!allowed.includes(comm.category)) return false;
    }
    const matchesCategory = selectedCategory === 'All' || comm.category === selectedCategory;
    const matchesSearch = 
      comm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comm.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comm.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTag = !selectedTag || comm.tags.includes(selectedTag);

    return matchesCategory && matchesSearch && matchesTag;
  });

  // Extract all unique interest tags across the communities for filter suggestions
  const popularTags = Array.from(
    new Set(communities.flatMap(c => c.tags))
  ).slice(0, 12);

  const handleJoinLeaveClick = (commId: string) => {
    const comm = communities.find(c => c.id === commId);
    if (!comm) return;
    if (comm.memberIds.includes(currentUser.id)) {
      onLeaveCommunity(commId);
    } else {
      onJoinCommunity(commId);
    }
  };

  const directoryQuery = searchQuery.trim().toLowerCase();
  const joinedCommunities = communities.filter(comm => comm.memberIds.includes(currentUser.id));
  const universalDirectoryResults = communities
    .filter(comm => {
      if (directoryMode === 'joined' && !comm.memberIds.includes(currentUser.id)) return false;
      if (!directoryQuery) return true;
      const searchableText = [
        comm.name,
        comm.description,
        comm.category,
        comm.college || '',
        ...comm.tags,
      ].join(' ').toLowerCase();
      return searchableText.includes(directoryQuery);
    })
    .sort((a, b) => {
      const joinedDiff = Number(b.memberIds.includes(currentUser.id)) - Number(a.memberIds.includes(currentUser.id));
      return joinedDiff || a.name.localeCompare(b.name);
    });

  const showUniversalDirectory = directoryMode === 'joined' || Boolean(directoryQuery);

  const renderDirectoryCard = (comm: Community) => {
    const hasJoined = comm.memberIds.includes(currentUser.id);
    const isCollege = comm.category === 'College Community';
    const isClub = comm.category === 'Club';
    const cardGradient = isCollege
      ? 'from-emerald-500 to-teal-600'
      : isClub
        ? 'from-fuchsia-500 to-rose-500'
        : 'from-indigo-500 to-violet-600';
    const coverImage = isCollege
      ? getCollegeImage(comm.name)
      : getCommunityImage(comm.name, comm.category, comm.id);

    return (
      <div
        key={comm.id}
        style={{ touchAction: 'manipulation' }}
        className={`rounded-2xl border overflow-hidden flex flex-col cursor-pointer transition-all hover:-translate-y-0.5 ${
          darkMode
            ? 'border-white/10 bg-[#111118] hover:border-indigo-500/30'
            : 'border-neutral-200 bg-white shadow-sm hover:shadow-md'
        }`}
        onClick={() => { setActiveCommunityId(comm.id); setActiveTab('feed'); }}
      >
        <div className="h-16 relative overflow-hidden flex items-center px-3 gap-2.5">
          <img
            src={coverImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = getCommunityImage(comm.name, comm.category, comm.id);
            }}
          />
          <div className={`absolute inset-0 bg-gradient-to-br ${cardGradient} opacity-65 pointer-events-none`} />
          <div className="relative w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
            {isCollege ? <GraduationCap size={16} className="text-white" /> : renderIcon(comm.icon)}
          </div>
          <div className="relative min-w-0 pr-10">
            <p className="text-white text-[11px] font-extrabold leading-tight line-clamp-2">{comm.name}</p>
            <p className="text-white/75 text-[9px] mt-0.5">
              {isCollege ? 'Official campus space' : isClub ? 'Student club' : comm.category}
            </p>
          </div>
          {hasJoined && (
            <span className="absolute top-2 right-2 text-[8px] font-bold bg-black/25 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-full">
              ✓ Joined
            </span>
          )}
        </div>
        <div className="flex flex-col flex-1 p-3 gap-2">
          <p className={`text-[10px] leading-relaxed line-clamp-2 flex-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {comm.description || 'A verified student space on The Network.'}
          </p>
          <div className="flex items-center justify-between gap-2">
            <p className={`text-[9px] font-mono ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
              {comm.memberIds.length} members
            </p>
            {comm.college && !isCollege && (
              <span className={`text-[8px] font-bold truncate max-w-[120px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {comm.college}
              </span>
            )}
          </div>
          <div className="flex gap-1.5 mt-1">
            {shareButton(comm, true)}
            <button
              style={{ touchAction: 'manipulation' }}
              onClick={e => { e.stopPropagation(); handleJoinLeaveClick(comm.id); }}
              className={`flex-1 text-[9px] font-extrabold py-1.5 rounded-lg cursor-pointer transition-all active:scale-95 ${
                hasJoined
                  ? 'border border-rose-500/30 text-rose-500 hover:bg-rose-500/5'
                  : `bg-gradient-to-r ${cardGradient} text-white shadow-sm hover:opacity-90`
              }`}
            >
              {hasJoined ? 'Leave' : isClub ? 'Join Club' : 'Join'}
            </button>
            <button
              style={{ touchAction: 'manipulation' }}
              onClick={e => { e.stopPropagation(); setActiveCommunityId(comm.id); setActiveTab('feed'); }}
              className={`px-2.5 text-[9px] font-bold rounded-lg cursor-pointer border transition-all active:scale-95 ${
                darkMode
                  ? 'border-white/10 text-slate-400 hover:bg-white/5'
                  : 'border-neutral-200 text-slate-500 hover:bg-neutral-50'
              }`}
            >
              View
            </button>
          </div>
        </div>
      </div>
    );
  };

  const openCommunityShare = (community: Community) => {
    if (onShareCommunity) onShareCommunity(community);
    else setShareCommunity(community);
  };

  const shareButton = (community: Community, compact = false) => (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); openCommunityShare(community); }}
      aria-label={`Share ${community.name}`}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border transition-all cursor-pointer ${
        compact ? 'px-2.5 py-1.5 text-[9px]' : 'px-3 py-2 text-[10px]'
      } font-extrabold ${
        darkMode
          ? 'border-white/10 text-slate-300 hover:bg-white/8'
          : 'border-neutral-200 text-slate-600 hover:bg-neutral-50'
      }`}
    >
      <Share2 size={compact ? 12 : 13} /> {compact ? 'Share' : 'Share invite'}
    </button>
  );

  // Submissions
  const handleResourceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCommunityId || !resTitle || !resLink) return;
    if (onAddResource) {
      onAddResource(activeCommunityId, resTitle, resLink, resDesc);
    }
    setResTitle('');
    setResLink('');
    setResDesc('');
    setShowAddResourceForm(false);
  };

  const handleThreadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCommunityId || !threadTitle || !threadContent) return;
    if (onAddThread) {
      onAddThread(activeCommunityId, threadTitle, threadContent);
    }
    setThreadTitle('');
    setThreadContent('');
    setShowAddThreadForm(false);
  };

  const handleReplySubmit = (e: React.FormEvent, threadId: string) => {
    e.preventDefault();
    if (!activeCommunityId || !replyText) return;
    if (onAddThreadReply) {
      onAddThreadReply(activeCommunityId, threadId, replyText);
    }
    setReplyText('');
  };

  const handlePollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCommunityId || !pollQuestion.trim()) return;
    const validOpts = pollOptions.filter(o => o.trim());
    if (validOpts.length < 2) return;
    if (onAddPoll) onAddPoll(activeCommunityId, pollQuestion.trim(), validOpts);
    setPollQuestion('');
    setPollOptions(['', '']);
    setPollOptionInput('');
    setShowPollForm(false);
  };

  const getConnStatus = (userId: string) => {
    if (!connections) return 'none';
    const c = connections.find(
      (cn: Connection) => (cn.senderId === currentUser.id && cn.receiverId === userId) ||
                          (cn.senderId === userId && cn.receiverId === currentUser.id)
    );
    return c ? c.status : 'none';
  };

  return (
    <div className="space-y-6 text-left">
      {selectedComm ? (
        /* ======================== CHAPTER WORKSPACE VIEW ======================== */
        <div className="space-y-6">
          {/* Back & Title Header */}
          <div className={`p-6 rounded-2xl border border-neutral-200/80 dark:border-white/10 ${darkMode ? 'bg-[#0E0E12]' : 'bg-white'} space-y-4 shadow-sm`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <button
                id="btn-back-to-community-list"
                onClick={() => {
                  setActiveCommunityId(null);
                  setSelectedThreadId(null);
                }}
                className={`py-1.5 px-3.5 rounded-xl border border-neutral-200 dark:border-white/10 text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all hover:scale-98 ${darkMode ? 'bg-zinc-900 hover:bg-zinc-800 text-slate-300' : 'bg-neutral-50 hover:bg-neutral-100 text-slate-700'}`}
              >
                ← Back to Chapters
              </button>

              <div className="flex items-center gap-2">
                <span className={`text-[9.5px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full ${darkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-700'}`}>
                  {selectedComm.category}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                  {selectedComm.memberIds.length} Members
                </span>
              </div>
            </div>

            <div className="flex items-start gap-4 text-left">
              <div className={`p-3.5 rounded-2xl border ${darkMode ? 'bg-zinc-900 border-white/5' : 'bg-neutral-50 border-neutral-200'}`}>
                {renderIcon(selectedComm.icon)}
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-black tracking-tight uppercase text-slate-800 dark:text-slate-100">
                    {selectedComm.name}
                  </h2>
                  {selectedComm.memberIds.includes(currentUser.id) ? (
                    <span className="inline-flex items-center gap-1.5 text-[9px] font-bold tracking-wider uppercase text-emerald-600 bg-emerald-500/5 dark:bg-emerald-500/10 dark:text-emerald-500 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <ShieldCheck size={11} /> Member
                    </span>
                  ) : (
                    <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">
                      Spectating Hub
                    </span>
                  )}
                </div>
                {selectedComm.creatorId && (() => {
                  const creator = getUserDetails(selectedComm.creatorId);
                  return (
                    <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
                      <span>🏅 Run by</span>
                      <span className="font-bold text-slate-600 dark:text-slate-300">{creator.name}</span>
                      <span className="opacity-60">· {creator.college}</span>
                    </p>
                  );
                })()}
                <p className={`text-xs leading-relaxed max-w-3xl ${darkMode ? 'text-zinc-500' : 'text-slate-700'}`}>
                  {selectedComm.description}
                </p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {selectedComm.tags.map(t => (
                    <span key={t} className={`py-0.5 px-2 rounded-full text-[9px] font-medium font-mono border ${darkMode ? 'bg-[#09090C] border-white/5 text-slate-400' : 'bg-neutral-100 border-neutral-200 text-slate-600'}`}>
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {shareButton(selectedComm)}
                <button
                  id={`btn-join-toggle-workspace-${selectedComm.id}`}
                  onClick={() => handleJoinLeaveClick(selectedComm.id)}
                  className={`py-2 px-5 rounded-xl text-xs uppercase font-extrabold tracking-wider cursor-pointer shadow-sm transition-all hover:scale-98 ${
                    selectedComm.memberIds.includes(currentUser.id)
                      ? 'border border-rose-500/30 text-rose-500 hover:bg-rose-500/10'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {selectedComm.memberIds.includes(currentUser.id) ? 'Leave Chapter' : 'Join Chapter'}
                </button>
              </div>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex overflow-x-auto scrollbar-hide border-t border-neutral-200/80 dark:border-white/5 pt-3 mt-2 gap-1">
              {([
                { id: 'feed',      label: 'Feed',        emoji: '💬', active: 'border-indigo-500 text-indigo-500' },
                { id: 'chat',      label: 'Chat',        emoji: '🗨️',  active: 'border-violet-500 text-violet-500' },
                { id: 'members',   label: `Members (${selectedComm.memberIds.length})`, emoji: '👥', active: 'border-sky-500 text-sky-500' },
                { id: 'events',    label: 'Events',      emoji: '📅', active: 'border-amber-500 text-amber-500' },
                { id: 'polls',     label: `Polls (${(selectedComm.polls || []).length})`, emoji: '🗳️', active: 'border-emerald-500 text-emerald-500' },
                { id: 'resources', label: `Resources (${selectedComm.resources?.length || 0})`, emoji: '📁', active: 'border-indigo-500 text-indigo-500' },
                { id: 'threads',   label: `Discussions (${selectedComm.threads?.length || 0})`, emoji: '🧵', active: 'border-indigo-500 text-indigo-500' },
                { id: 'groups',    label: 'Groups', emoji: '', active: 'border-emerald-500 text-emerald-600 dark:text-emerald-400' },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  id={`btn-tab-${tab.id}`}
                  data-testid={`tab-${tab.id}`}
                  onClick={() => { setActiveTab(tab.id as any); setSelectedThreadId(null); }}
                  className={`flex-shrink-0 flex items-center gap-1.5 pb-2.5 px-2 text-[11px] uppercase font-extrabold tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === tab.id
                      ? tab.active
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.id === 'groups' ? <Users size={13} /> : `${tab.emoji} `}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* TAB CONTENTS */}
          <div className="space-y-4">
            {activeTab === 'groups' && (
              <section className="space-y-4" data-testid="community-groups-view">
                <div className={`relative overflow-hidden rounded-2xl border p-5 sm:p-7 ${
                  darkMode ? 'border-emerald-400/15 bg-[#101713]' : 'border-emerald-900/10 bg-[#f1f5ee]'
                }`}>
                  <div className="pointer-events-none absolute -right-8 -top-12 h-44 w-44 rounded-full border-[28px] border-emerald-500/[0.06]" />
                  <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div className="max-w-2xl">
                      <p className={`mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] ${darkMode ? 'text-emerald-300/70' : 'text-emerald-800/70'}`}>
                        <MessagesSquare size={14} /> {selectedComm.name} / student circles
                      </p>
                      <h3 className={`text-2xl font-black tracking-tight sm:text-3xl ${darkMode ? 'text-stone-100' : 'text-stone-900'}`}>
                        Find your people. Focus together.
                      </h3>
                      <p className={`mt-2 max-w-xl text-sm leading-relaxed ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>
                        Small groups for the work on your desk and the conversations that happen after class.
                      </p>
                    </div>
                    {hasJoinedSelectedCommunity && (
                      <button
                        type="button"
                        data-testid="button-create-community-group"
                        onClick={() => setShowGroupForm(value => !value)}
                        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300"
                      >
                        <Plus size={16} /> Start a group
                      </button>
                    )}
                  </div>
                  <div className={`relative mt-5 flex flex-wrap gap-2 border-t pt-4 text-[11px] ${darkMode ? 'border-white/10 text-stone-400' : 'border-emerald-900/10 text-stone-600'}`}>
                    <span className="inline-flex items-center gap-1.5"><BookMarked size={13} /> Study circles</span>
                    <span aria-hidden="true" className="opacity-40">/</span>
                    <span className="inline-flex items-center gap-1.5"><MessagesSquare size={13} /> Casual chats</span>
                    <span aria-hidden="true" className="opacity-40">/</span>
                    <span className="inline-flex items-center gap-1.5"><LockKeyhole size={13} /> Public or invite-only</span>
                  </div>
                </div>

                {!hasJoinedSelectedCommunity ? (
                  <div className={`rounded-2xl border border-dashed p-7 text-center ${darkMode ? 'border-white/15 bg-white/[0.02]' : 'border-stone-300 bg-white/70'}`} data-testid="status-groups-community-membership">
                    <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl ${darkMode ? 'bg-emerald-400/10 text-emerald-300' : 'bg-emerald-900/5 text-emerald-800'}`}><Users size={21} /></div>
                    <h4 className={`text-base font-bold ${darkMode ? 'text-stone-100' : 'text-stone-900'}`}>Join this community to see its groups</h4>
                    <p className={`mx-auto mt-1 max-w-md text-sm ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>
                      Groups live inside {selectedComm.name}. Become part of the community to browse or start a circle.
                    </p>
                    <button
                      type="button"
                      data-testid="button-join-community-for-groups"
                      onClick={() => onJoinCommunity(selectedComm.id)}
                      className="mt-4 rounded-xl bg-emerald-800 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700 dark:bg-emerald-400 dark:text-emerald-950"
                    >
                      Join {selectedComm.name}
                    </button>
                  </div>
                ) : (
                  <>
                    {showGroupForm && (
                      <form
                        onSubmit={handleCreateCommunityGroup}
                        className={`rounded-2xl border p-5 sm:p-6 ${darkMode ? 'border-white/10 bg-[#11141a]' : 'border-stone-200 bg-white shadow-sm'}`}
                        data-testid="form-create-community-group"
                      >
                        <div className="mb-5 flex items-start justify-between gap-3">
                          <div>
                            <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${darkMode ? 'text-emerald-300' : 'text-emerald-800'}`}>New circle</p>
                            <h4 className={`mt-1 text-lg font-bold ${darkMode ? 'text-stone-100' : 'text-stone-900'}`}>Give the group a starting point</h4>
                          </div>
                          <button type="button" data-testid="button-close-group-form" aria-label="Close group form" onClick={resetGroupForm} className={`rounded-lg p-2 ${darkMode ? 'text-stone-400 hover:bg-white/5' : 'text-stone-500 hover:bg-stone-100'}`}><X size={16} /></button>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="space-y-1.5 sm:col-span-2">
                            <span className={`block text-xs font-semibold ${darkMode ? 'text-stone-300' : 'text-stone-700'}`}>Group name</span>
                            <input
                              autoFocus
                              required
                              maxLength={64}
                              value={groupName}
                              onChange={event => setGroupName(event.target.value)}
                              placeholder={groupPurpose === 'study' ? 'e.g. Organic Chemistry — Tuesday review' : 'e.g. Film club after lectures'}
                              data-testid="input-community-group-name"
                              className={`w-full rounded-xl border px-3.5 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 ${darkMode ? 'border-white/10 bg-black/20 text-stone-100 placeholder:text-stone-600' : 'border-stone-200 bg-stone-50 text-stone-900 placeholder:text-stone-400'}`}
                            />
                          </label>
                          <label className="space-y-1.5">
                            <span className={`block text-xs font-semibold ${darkMode ? 'text-stone-300' : 'text-stone-700'}`}>Purpose</span>
                            <select value={groupPurpose} onChange={event => setGroupPurpose(event.target.value as 'study' | 'chat')} data-testid="select-community-group-purpose" className={`w-full rounded-xl border px-3.5 py-3 text-sm outline-none focus:border-emerald-500 ${darkMode ? 'border-white/10 bg-[#171a20] text-stone-100' : 'border-stone-200 bg-stone-50 text-stone-900'}`}>
                              <option value="study">Study group</option>
                              <option value="chat">Casual chat</option>
                            </select>
                          </label>
                          <label className="space-y-1.5">
                            <span className={`block text-xs font-semibold ${darkMode ? 'text-stone-300' : 'text-stone-700'}`}>Who can join?</span>
                            <select value={groupVisibility} onChange={event => setGroupVisibility(event.target.value as 'public' | 'private')} data-testid="select-community-group-visibility" className={`w-full rounded-xl border px-3.5 py-3 text-sm outline-none focus:border-emerald-500 ${darkMode ? 'border-white/10 bg-[#171a20] text-stone-100' : 'border-stone-200 bg-stone-50 text-stone-900'}`}>
                              <option value="public">Public — listed in this community</option>
                              <option value="private">Private — invite only</option>
                            </select>
                          </label>
                          <label className="space-y-1.5 sm:col-span-2">
                            <span className={`block text-xs font-semibold ${darkMode ? 'text-stone-300' : 'text-stone-700'}`}>A little context <span className="font-normal opacity-60">optional</span></span>
                            <textarea
                              value={groupDescription}
                              maxLength={240}
                              onChange={event => setGroupDescription(event.target.value)}
                              placeholder={groupPurpose === 'study' ? 'What are you working through together?' : 'What kind of conversations belong here?'}
                              rows={2}
                              data-testid="input-community-group-description"
                              className={`w-full resize-y rounded-xl border px-3.5 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 ${darkMode ? 'border-white/10 bg-black/20 text-stone-100 placeholder:text-stone-600' : 'border-stone-200 bg-stone-50 text-stone-900 placeholder:text-stone-400'}`}
                            />
                          </label>
                        </div>
                        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                          <button type="button" data-testid="button-cancel-group-create" onClick={resetGroupForm} className={`rounded-xl px-4 py-2.5 text-xs font-bold ${darkMode ? 'text-stone-300 hover:bg-white/5' : 'text-stone-600 hover:bg-stone-100'}`}>Cancel</button>
                          <button type="submit" disabled={!groupName.trim() || groupSaving} data-testid="button-submit-community-group" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-400 dark:text-emerald-950">
                            {groupSaving && <LoaderCircle size={14} className="animate-spin" />}
                            {groupSaving ? 'Starting…' : 'Create group'}
                          </button>
                        </div>
                      </form>
                    )}

                    {groupsError && (
                      <div role="alert" data-testid="status-community-groups-error" className={`flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${darkMode ? 'border-rose-400/20 bg-rose-400/[0.06] text-rose-200' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
                        <p className="text-sm">{groupsError}</p>
                        <button type="button" data-testid="button-retry-community-groups" onClick={() => setGroupsReload(value => value + 1)} className="shrink-0 rounded-lg border border-current/20 px-3 py-2 text-xs font-bold">Try again</button>
                      </div>
                    )}

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className={`text-base font-bold ${darkMode ? 'text-stone-100' : 'text-stone-900'}`}>Around {selectedComm.name}</h4>
                        <p className={`mt-0.5 text-xs ${darkMode ? 'text-stone-500' : 'text-stone-500'}`}>Public groups are open to community members; private groups are visible to members and invitees only.</p>
                      </div>
                      <div className={`flex w-fit gap-1 rounded-xl p-1 ${darkMode ? 'bg-white/[0.04]' : 'bg-stone-100'}`} role="group" aria-label="Filter groups by purpose">
                        {(['all', 'study', 'chat'] as const).map(filter => (
                          <button key={filter} type="button" data-testid={`filter-community-groups-${filter}`} aria-pressed={groupsFilter === filter} onClick={() => setGroupsFilter(filter)} className={`rounded-lg px-3 py-2 text-[11px] font-bold capitalize transition ${groupsFilter === filter ? (darkMode ? 'bg-emerald-400 text-emerald-950' : 'bg-white text-emerald-900 shadow-sm') : (darkMode ? 'text-stone-400 hover:text-stone-200' : 'text-stone-500 hover:text-stone-800')}`}>
                            {filter === 'all' ? 'All groups' : filter === 'study' ? 'Study' : 'Chat'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {groupsLoading ? (
                      <div className="grid gap-3 md:grid-cols-2" aria-label="Loading groups" data-testid="loading-community-groups">
                        {[0, 1, 2, 3].map(index => <div key={index} className={`h-40 animate-pulse rounded-2xl border ${darkMode ? 'border-white/5 bg-white/[0.03]' : 'border-stone-200 bg-stone-100'}`} />)}
                      </div>
                    ) : (() => {
                      const visibleGroups = communityGroups
                        .filter(group => groupsFilter === 'all' || (group.purpose || (group.type === 'course' ? 'study' : 'chat')) === groupsFilter)
                        .sort((a, b) => {
                          const memberDifference = Number(isGroupMember(b)) - Number(isGroupMember(a));
                          return memberDifference || a.name.localeCompare(b.name);
                        });
                      if (!visibleGroups.length) {
                        return (
                          <div className={`rounded-2xl border border-dashed px-6 py-10 text-center ${darkMode ? 'border-white/10 bg-white/[0.015]' : 'border-stone-200 bg-white/60'}`} data-testid="empty-community-groups">
                            <div className={`mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl ${darkMode ? 'bg-emerald-400/10 text-emerald-300' : 'bg-emerald-900/5 text-emerald-800'}`}><SearchCheck size={19} /></div>
                            <h5 className={`font-bold ${darkMode ? 'text-stone-200' : 'text-stone-800'}`}>{groupsFilter === 'all' ? 'No groups here yet' : `No ${groupsFilter} groups yet`}</h5>
                            <p className={`mt-1 text-sm ${darkMode ? 'text-stone-500' : 'text-stone-500'}`}>Start a small circle around a subject, project, or shared campus interest.</p>
                            {!showGroupForm && <button type="button" data-testid="button-create-first-community-group" onClick={() => setShowGroupForm(true)} className={`mt-4 text-xs font-bold underline underline-offset-4 ${darkMode ? 'text-emerald-300' : 'text-emerald-800'}`}>Create the first group</button>}
                          </div>
                        );
                      }
                      return (
                        <div className="grid gap-3 md:grid-cols-2" data-testid="community-groups-list">
                          {visibleGroups.map(group => {
                            const member = isGroupMember(group);
                            const invitePending = isGroupInvitePending(group);
                            const purpose = group.purpose || (group.type === 'course' ? 'study' : 'chat');
                            const privateGroup = group.visibility === 'private';
                            const memberCount = group.memberCount ?? group.memberIds?.length ?? 0;
                            return (
                              <article key={group.id} data-testid={`card-community-group-${group.id}`} className={`flex min-h-[174px] flex-col rounded-2xl border p-4 transition-colors ${darkMode ? 'border-white/[0.09] bg-[#11141a] hover:border-emerald-400/25' : 'border-stone-200 bg-white hover:border-emerald-800/25 hover:shadow-sm'}`}>
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex min-w-0 items-start gap-3">
                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${purpose === 'study' ? (darkMode ? 'bg-sky-400/10 text-sky-300' : 'bg-sky-50 text-sky-800') : (darkMode ? 'bg-orange-300/10 text-orange-200' : 'bg-orange-50 text-orange-800')}`}>
                                      {purpose === 'study' ? <BookMarked size={18} /> : <MessagesSquare size={18} />}
                                    </div>
                                    <div className="min-w-0">
                                      <h5 data-testid={`text-community-group-name-${group.id}`} className={`truncate text-sm font-bold ${darkMode ? 'text-stone-100' : 'text-stone-900'}`}>{group.name}</h5>
                                      <p className={`mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide ${darkMode ? 'text-stone-500' : 'text-stone-500'}`}>
                                        <span>{purpose === 'study' ? 'Study group' : 'Casual chat'}</span>
                                        <span aria-hidden="true">·</span>
                                        <span className="inline-flex items-center gap-1">{privateGroup ? <><LockKeyhole size={10} /> Private</> : 'Public'}</span>
                                      </p>
                                    </div>
                                  </div>
                                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${darkMode ? 'bg-white/[0.05] text-stone-400' : 'bg-stone-100 text-stone-600'}`} data-testid={`text-community-group-members-${group.id}`}>
                                    {memberCount} {memberCount === 1 ? 'member' : 'members'}
                                  </span>
                                </div>
                                <p data-testid={`text-community-group-description-${group.id}`} className={`mt-3 line-clamp-2 min-h-9 text-xs leading-relaxed ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>{group.description || (purpose === 'study' ? 'A focused space to study together.' : 'A space to chat with fellow community members.')}</p>
                                <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                                  {invitePending ? (
                                    <p data-testid={`status-community-group-invite-${group.id}`} className={`text-[11px] font-semibold ${darkMode ? 'text-amber-300' : 'text-amber-800'}`}>Invite waiting · accept in Chats</p>
                                  ) : member ? (
                                    <p className={`text-[11px] font-semibold ${darkMode ? 'text-emerald-300' : 'text-emerald-800'}`}>You’re in this group</p>
                                  ) : privateGroup ? (
                                    <p className={`text-[11px] font-semibold ${darkMode ? 'text-stone-500' : 'text-stone-500'}`}>Invite only</p>
                                  ) : (
                                    <p className={`text-[11px] ${darkMode ? 'text-stone-500' : 'text-stone-500'}`}>Open to community members</p>
                                  )}
                                  {member ? (
                                    <button type="button" data-testid={`button-open-community-group-${group.id}`} onClick={() => openCommunityGroup(group)} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-emerald-800 px-3 text-xs font-bold text-white transition hover:bg-emerald-700 dark:bg-emerald-400 dark:text-emerald-950">
                                      Open chat <ArrowRight size={13} />
                                    </button>
                                  ) : !privateGroup && !invitePending ? (
                                    <button type="button" data-testid={`button-join-community-group-${group.id}`} disabled={joiningGroupId === group.id} onClick={() => void handleJoinCommunityGroup(group)} className={`inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs font-bold transition disabled:opacity-60 ${darkMode ? 'border-emerald-300/25 text-emerald-300 hover:bg-emerald-300/10' : 'border-emerald-800/20 text-emerald-900 hover:bg-emerald-50'}`}>
                                      {joiningGroupId === group.id ? <LoaderCircle size={13} className="animate-spin" /> : <Plus size={13} />}
                                      {joiningGroupId === group.id ? 'Joining…' : 'Join group'}
                                    </button>
                                  ) : null}
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </>
                )}
              </section>
            )}
            {isCourseCommunity && (
              <section className={`rounded-2xl border p-5 ${darkMode ? 'border-amber-500/20 bg-amber-500/[0.04]' : 'border-amber-200 bg-amber-50/60'}`}>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🧭</span>
                      <h3 className={`text-sm font-black uppercase tracking-wide ${darkMode ? 'text-amber-200' : 'text-amber-900'}`}>Senior guides</h3>
                    </div>
                    <p className={`text-[11px] mt-1 max-w-2xl ${darkMode ? 'text-amber-100/60' : 'text-amber-800/70'}`}>
                      Students ahead of you in a matching course. Ask about subjects, projects, internships, and the choices they wish they had known earlier.
                    </p>
                  </div>
                  <span className={`shrink-0 text-[9px] font-bold px-2 py-1 rounded-full ${darkMode ? 'bg-amber-500/15 text-amber-300' : 'bg-white text-amber-700'}`}>
                    {seniorGuides.length} found
                  </span>
                </div>
                {seniorGuides.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {seniorGuides.map(senior => (
                      <div key={senior.id} className={`flex items-center gap-3 p-3 rounded-xl border ${darkMode ? 'border-white/10 bg-black/10' : 'border-amber-200/70 bg-white/80'}`}>
                        <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-amber-100 dark:bg-amber-500/15">
                          <Avatar avatar={senior.avatar} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-[11px] font-extrabold truncate ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{senior.fullName}</p>
                          <p className="text-[9px] text-slate-500 truncate">{getEducationDisplay(senior).compact}</p>
                          <button
                            type="button"
                            onClick={() => onViewUserProfile?.(senior.id)}
                            className="mt-1 text-[9px] font-bold text-amber-700 dark:text-amber-300 hover:underline cursor-pointer"
                          >
                            View profile →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`rounded-xl border border-dashed p-4 text-center text-[11px] ${darkMode ? 'border-amber-500/20 text-amber-100/50' : 'border-amber-300 text-amber-800/60'}`}>
                    No matching senior profiles yet. Join this course community and add your branch and year so the right people can find you.
                  </div>
                )}
              </section>
            )}
            {activeTab === 'feed' && (
              <div className="space-y-4">
                {selectedComm.id === 'domain-jee-prep' && (
                  <JeeCountdownCard darkMode={darkMode} />
                )}
                {!selectedComm.memberIds.includes(currentUser.id) && (
                  <div className={`p-4 rounded-xl border border-amber-500/20 text-left text-xs ${darkMode ? 'bg-amber-950/10 text-amber-400' : 'bg-amber-500/[0.03] text-amber-700'}`}>
                    ⚠️ <strong>Spectator Mode:</strong> You must join this chapter block to participate, post, or leave comment suggestions!
                  </div>
                )}
                <FeedSection
                  currentUser={currentUser}
                  posts={posts}
                  allUsers={allUsers}
                  communities={communities}
                  connections={connections}
                  onAddPost={onAddPost}
                  onLikePost={onLikePost}
                  onAddComment={onAddComment}
                  onDeletePost={onDeletePost}
                  darkMode={darkMode}
                  activeCommunityId={selectedComm.id}
                  stories={[]}
                  onAddStory={() => {}}
                  onViewUserProfile={onViewUserProfile}
                />
              </div>
            )}

            {activeTab === 'resources' && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 text-left">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800 dark:text-slate-200">
                      Shared College & Study Resources
                    </h3>
                    <p className={`text-[11px] ${darkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                      Access textbooks, mock exams, code repositories, design templates, and research drafts submitted by peers.
                    </p>
                  </div>
                  {selectedComm.memberIds.includes(currentUser.id) && (
                    <button
                      id="btn-toggle-add-resource"
                      onClick={() => setShowAddResourceForm(!showAddResourceForm)}
                      className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] uppercase font-bold tracking-wider rounded-xl cursor-pointer flex items-center gap-1 transition-all"
                    >
                      <Plus size={12} /> Share Resource
                    </button>
                  )}
                </div>

                {/* Add Resource Slide Box */}
                {showAddResourceForm && (
                  <form
                    onSubmit={handleResourceSubmit}
                    className={`p-4 rounded-xl border border-neutral-200 dark:border-white/15 ${darkMode ? 'bg-[#121217]' : 'bg-[#FFF]'} space-y-3`}
                  >
                    <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Upload Resource Record
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9.5px] font-bold uppercase text-slate-400 mb-1">Resource Title</label>
                        <input
                          id="res-title-input"
                          type="text"
                          required
                          value={resTitle}
                          onChange={e => setResTitle(e.target.value)}
                          placeholder="e.g. Stanford CS229 Deep Learning Handouts"
                          className={`w-full p-2 text-xs rounded-xl border border-neutral-200 dark:border-white/10 ${darkMode ? 'bg-[#09090C] text-white' : 'bg-white text-slate-800'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-[9.5px] font-bold uppercase text-slate-400 mb-1">Resource Link / URL</label>
                        <input
                          id="res-link-input"
                          type="url"
                          required
                          value={resLink}
                          onChange={e => setResLink(e.target.value)}
                          placeholder="https://drive.google.com/..."
                          className={`w-full p-2 text-xs rounded-xl border border-neutral-200 dark:border-white/10 ${darkMode ? 'bg-[#09090C] text-white' : 'bg-white text-slate-800'}`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9.5px] font-bold uppercase text-slate-400 mb-1 font-mono">Short Description / Guidelines</label>
                      <textarea
                        id="res-desc-input"
                        rows={2}
                        value={resDesc}
                        onChange={e => setResDesc(e.target.value)}
                        placeholder="Mention instructions, file version, syllabus references, etc."
                        className={`w-full p-2 text-xs rounded-xl border border-neutral-200 dark:border-white/10 ${darkMode ? 'bg-[#09090C] text-white' : 'bg-white text-slate-800'}`}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        id="btn-cancel-resource"
                        onClick={() => setShowAddResourceForm(false)}
                        className={`py-1.5 px-3 rounded-xl border text-[10px] font-bold uppercase tracking-wider cursor-pointer ${darkMode ? 'bg-zinc-900 border-white/5 text-slate-300' : 'bg-white border-neutral-200 text-slate-600'}`}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        id="btn-confirm-resource"
                        className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl cursor-pointer"
                      >
                        Publish Resource
                      </button>
                    </div>
                  </form>
                )}

                {/* List resources */}
                {(!selectedComm.resources || selectedComm.resources.length === 0) ? (
                  <div className={`p-8 rounded-2xl text-center border border-dashed border-neutral-200 dark:border-white/5 ${darkMode ? 'bg-zinc-900/10' : 'bg-neutral-50'}`}>
                    <p className="text-xs text-slate-500 font-medium">No resources shared here yet. Be the first to add one!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedComm.resources.slice().reverse().map((res) => {
                      const author = getUserDetails(res.authorId);
                      return (
                        <div
                          key={res.id}
                          className={`p-4 rounded-xl border border-neutral-200/80 dark:border-white/10 flex flex-col justify-between gap-3 text-left ${darkMode ? 'bg-[#121217]' : 'bg-white'} shadow-xs`}
                        >
                          <div className="space-y shadow-sm">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-300 truncate">
                                {res.title}
                              </h4>
                              <a
                                href={res.link}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 px-1.5 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 cursor-pointer flex items-center justify-center transition-all"
                                title="Open resource link"
                              >
                                <LinkIcon size={12} />
                              </a>
                            </div>
                            <p className="text-[11px] text-slate-400 dark:text-slate-400 line-clamp-2 mt-1 min-h-[32px]">
                              {res.description || 'No guidance remarks available.'}
                            </p>
                          </div>

                          <div className="pt-2.5 border-t border-dashed border-neutral-200 dark:border-white/5 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-[7.5px] font-black text-indigo-500 overflow-hidden">
                                <Avatar avatar={author.avatar} />
                              </div>
                              <span className="font-bold">{author.name}</span>
                            </div>
                            <span>
                              {new Date(res.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'threads' && (
              <div className="space-y-4">
                {selectedThreadId ? (
                  /* --- Thread Details Panel --- */
                  (() => {
                    const threadObj = (selectedComm.threads || []).find(t => t.id === selectedThreadId);
                    if (!threadObj) {
                      setSelectedThreadId(null);
                      return null;
                    }
                    const threadAuthor = getUserDetails(threadObj.authorId);
                    return (
                      <div className="space-y-4 text-left">
                        <button
                          id="btn-exit-thread"
                          onClick={() => setSelectedThreadId(null)}
                          className={`py-1 px-3 rounded-lg border border-neutral-200 dark:border-white/10 text-[9.5px] uppercase font-bold tracking-wider cursor-pointer ${darkMode ? 'bg-zinc-900 text-slate-300' : 'bg-white text-slate-700'}`}
                        >
                          ← Back to Board
                        </button>

                        <div className={`p-5 rounded-2xl border border-neutral-200 dark:border-white/10 ${darkMode ? 'bg-[#121217]' : 'bg-white'} space-y-4`}>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-indigo-500/10 flex items-center justify-center text-[10px] font-black text-indigo-500 overflow-hidden">
                                <Avatar avatar={threadAuthor.avatar} />
                              </div>
                              <div>
                                <span className="font-bold text-slate-700 dark:text-slate-300">{threadAuthor.name}</span>
                                <span className="mx-1.5 text-zinc-700">•</span>
                                <span className="text-[9px]">{threadAuthor.college}</span>
                              </div>
                            </div>
                            <span>{new Date(threadObj.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</span>
                          </div>

                          <div className="space-y-1">
                            <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-800 dark:text-white">
                              {threadObj.title}
                            </h3>
                            <p className={`text-xs leading-relaxed whitespace-pre-wrap ${darkMode ? 'text-zinc-300' : 'text-slate-600'}`}>
                              {threadObj.content}
                            </p>
                          </div>
                        </div>

                        {/* Thread Replies List */}
                        <div className="space-y-3 pl-4 border-l border-neutral-200 dark:border-white/5 text-left">
                          <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            Replies ({threadObj.replies.length})
                          </h4>

                          {threadObj.replies.length === 0 ? (
                            <p className="text-[10.5px] text-slate-500 font-medium py-2">No answers posted to this board yet. Post below!</p>
                          ) : (
                            <div className="space-y-3">
                              {threadObj.replies.map((reply) => {
                                const replyAuthor = getUserDetails(reply.authorId);
                                return (
                                  <div
                                    key={reply.id}
                                    className={`p-3.5 rounded-xl border border-neutral-200/80 dark:border-white/10 ${darkMode ? 'bg-zinc-900/30' : 'bg-neutral-50/50'}`}
                                  >
                                    <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono mb-1.5">
                                      <span className="font-bold text-slate-700 dark:text-slate-200">{replyAuthor.name} ({replyAuthor.college})</span>
                                      <span>{new Date(reply.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <p className={`text-xs ${darkMode ? 'text-zinc-300' : 'text-slate-700'}`}>
                                      {reply.content}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Post Reply Form */}
                        {selectedComm.memberIds.includes(currentUser.id) ? (
                          <form
                            onSubmit={(e) => handleReplySubmit(e, threadObj.id)}
                            className="flex items-stretch gap-2"
                          >
                            <input
                              id="reply-input"
                              type="text"
                              required
                              value={replyText}
                              onChange={e => setReplyText(e.target.value)}
                              placeholder="Write a supportive response or solution..."
                              className={`flex-1 p-2.5 text-xs rounded-xl border border-neutral-200 dark:border-white/10 ${darkMode ? 'bg-[#121217] text-white' : 'bg-white text-slate-800'}`}
                            />
                            <button
                              type="submit"
                              id="btn-post-reply"
                              className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs uppercase font-extrabold tracking-wider rounded-xl cursor-pointer flex items-center justify-center gap-1 transition-colors"
                            >
                              <Send size={12} /> Reply
                            </button>
                          </form>
                        ) : (
                          <div className={`p-3 rounded-lg border border-neutral-200/40 dark:border-white/5 text-[11px] text-slate-500 text-center`}>
                            You must join this chapter block to contribute responses.
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  /* --- List of Threads --- */
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 text-left">
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800 dark:text-slate-200">
                          Active Discussion Threads & Q&A
                        </h3>
                        <p className={`text-[11px] ${darkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                          Participate in collaborative peer discussions, seek mock review guides, and exchange preparation syllabus.
                        </p>
                      </div>
                      {selectedComm.memberIds.includes(currentUser.id) && (
                        <button
                          id="btn-toggle-add-thread"
                          onClick={() => setShowAddThreadForm(!showAddThreadForm)}
                          className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] uppercase font-bold tracking-wider rounded-xl cursor-pointer flex items-center gap-1 transition-all"
                        >
                          <Plus size={12} /> New Topic Thread
                        </button>
                      )}
                    </div>

                    {/* New Thread Slide Form */}
                    {showAddThreadForm && (
                      <form
                        onSubmit={handleThreadSubmit}
                        className={`p-4 rounded-xl border border-neutral-200 dark:border-white/15 ${darkMode ? 'bg-[#121217]' : 'bg-[#FFF]'} space-y-3`}
                      >
                        <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          Initiate Discussion Topic
                        </h4>
                        <div>
                          <label className="block text-[9.5px] font-bold uppercase text-slate-400 mb-1">Thread Subject</label>
                          <input
                            id="thread-title-input"
                            type="text"
                            required
                            value={threadTitle}
                            onChange={e => setThreadTitle(e.target.value)}
                            placeholder="e.g. Recommended resources for standard preparation"
                            className={`w-full p-2.5 text-xs rounded-xl border border-neutral-200 dark:border-white/10 ${darkMode ? 'bg-[#09090C] text-white' : 'bg-white text-slate-800'}`}
                          />
                        </div>
                        <div>
                          <label className="block text-[9.5px] font-bold uppercase text-slate-400 mb-1">Detailed Description / Context</label>
                          <textarea
                            id="thread-content-input"
                            rows={3}
                            required
                            value={threadContent}
                            onChange={e => setThreadContent(e.target.value)}
                            placeholder="Detail your question or study plan to get helpful guidelines of student ledger participants."
                            className={`w-full p-2.5 text-xs rounded-xl border border-neutral-200 dark:border-white/10 ${darkMode ? 'bg-[#09090C] text-white' : 'bg-white text-slate-800'}`}
                          />
                        </div>
                        <div className="flex justify-end gap-2 font-mono text-[9.5px]">
                          <button
                            type="button"
                            id="btn-cancel-thread"
                            onClick={() => setShowAddThreadForm(false)}
                            className={`py-1.5 px-3.5 rounded-xl border font-bold uppercase tracking-wider cursor-pointer ${darkMode ? 'bg-zinc-900 border-white/5 text-slate-300' : 'bg-white border-neutral-200 text-slate-700'}`}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            id="btn-confirm-thread"
                            className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-wider rounded-xl cursor-pointer"
                          >
                            Launch Thread
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Display active threads list */}
                    {(!selectedComm.threads || selectedComm.threads.length === 0) ? (
                      <div className={`p-8 rounded-2xl text-center border border-dashed border-neutral-200 dark:border-white/5 ${darkMode ? 'bg-zinc-900/10' : 'bg-neutral-50'}`}>
                        <p className="text-xs text-slate-500 font-medium">No discussions generated yet. Spark a question or feedback!</p>
                      </div>
                    ) : (
                      <div className="space-y-3 font-sans">
                        {selectedComm.threads.slice().reverse().map((thread) => {
                          const author = getUserDetails(thread.authorId);
                          return (
                            <div
                              key={thread.id}
                              id={`thread-board-${thread.id}`}
                              onClick={() => setSelectedThreadId(thread.id)}
                              className={`p-4 rounded-xl border border-neutral-200/85 dark:border-white/10 text-left cursor-pointer transition-all hover:border-indigo-500/30 ${
                                darkMode ? 'bg-[#121217] hover:bg-zinc-900/40' : 'bg-white hover:bg-neutral-50/50'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                  <h4 className="text-xs font-bold uppercase tracking-wide text-indigo-500 dark:text-indigo-400">
                                    {thread.title}
                                  </h4>
                                  <p className={`text-[11px] line-clamp-2 leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-slate-600'}`}>
                                    {thread.content}
                                  </p>
                                </div>
                                <div className="py-1 px-3.5 rounded-lg bg-indigo-500/5 border border-indigo-500/10 text-center font-mono">
                                  <span className="block text-xs font-extrabold text-indigo-500 dark:text-indigo-400">
                                    {thread.replies.length}
                                  </span>
                                  <span className="text-[7.5px] uppercase font-bold block text-slate-400">
                                    replies
                                  </span>
                                </div>
                              </div>

                              <div className="pt-3 mt-3 border-t border-dashed border-neutral-200 dark:border-white/5 flex flex-wrap items-center justify-between text-[10px] text-slate-500 font-mono">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-4 h-4 rounded-full bg-slate-300 dark:bg-zinc-800 flex items-center justify-center text-[7px] font-black font-sans text-indigo-500 overflow-hidden">
                                    <Avatar avatar={author.avatar} />
                                  </div>
                                  <span>{author.name} ({author.college})</span>
                                </div>
                                <span>{new Date(thread.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── GROUP CHAT TAB ─────────────────────────────────── */}
            {activeTab === 'chat' && (
              <div className={`rounded-2xl border flex flex-col ${darkMode ? 'bg-[#0D0D12] border-white/10' : 'bg-white border-neutral-200'}`} style={{ height: '520px' }}>
                {/* Chat header */}
                <div className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${darkMode ? 'border-white/10' : 'border-neutral-100'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">💬</span>
                    <div>
                      <p className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{selectedComm.name} — Group Chat</p>
                      <p className="text-[9px] text-slate-400 font-mono">
                        {selectedComm.memberIds.length} members
                        <span className={`ml-2 ${chatConnection === 'live' ? 'text-emerald-500' : chatConnection === 'polling' ? 'text-amber-500' : 'text-slate-400'}`}>
                          {chatConnection === 'live' ? '● Live' : chatConnection === 'polling' ? '● Reconnecting' : chatConnection === 'connecting' ? '○ Connecting…' : '○ Offline'}
                        </span>
                      </p>
                    </div>
                  </div>
                  {!selectedComm.memberIds.includes(currentUser.id) && (
                    <span className={`text-[9px] font-bold px-2 py-1 rounded-lg ${darkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>Join to chat</span>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
                  {chatLoading && chatMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-xs text-slate-400">Loading messages…</p>
                    </div>
                  ) : chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2">
                      <span className="text-3xl">💬</span>
                      <p className={`text-xs font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>No messages yet — say hello!</p>
                    </div>
                  ) : (
                    chatMessages.map((msg, i) => {
                      const sender = allUsers.find(u => u.id === msg.senderId);
                      const isMe = msg.senderId === currentUser.id;
                      const showAvatar = i === 0 || chatMessages[i - 1].senderId !== msg.senderId;
                      const announcement = parseChatAnnouncement(msg.content);
                      const announcementColors = announcement?.kind === 'poll'
                        ? 'border-emerald-500/25 bg-emerald-500/[0.06]'
                        : announcement?.kind === 'resource'
                          ? 'border-indigo-500/25 bg-indigo-500/[0.06]'
                          : 'border-violet-500/25 bg-violet-500/[0.06]';
                      return (
                        <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                          <div className="shrink-0 w-6 h-6 mt-0.5">
                            {showAvatar && (
                              <div className="w-6 h-6 rounded-full bg-indigo-500/10 flex items-center justify-center text-[9px] font-bold overflow-hidden border border-indigo-500/20">
                                <Avatar avatar={sender?.avatar || ''} />
                              </div>
                            )}
                          </div>
                          <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                            {showAvatar && (
                              <span className={`text-[9px] font-bold text-slate-400 ${isMe ? 'text-right' : ''}`}>
                                {isMe ? 'You' : (sender?.fullName?.split(' ')[0] || 'Student')}
                              </span>
                            )}
                            {announcement ? (
                              <div className={`w-full min-w-[230px] max-w-[360px] rounded-2xl border px-3 py-2.5 text-left ${announcementColors}`}>
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                                    {announcement.kind === 'poll' ? 'Community poll' : announcement.kind === 'resource' ? 'Shared resource' : 'New discussion'}
                                  </span>
                                </div>
                                <p className={`text-xs font-bold leading-snug ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                  {announcement.title}
                                </p>
                                {announcement.kind === 'poll' && announcement.options.length > 0 ? (
                                  <div className="mt-2 space-y-1.5">
                                    {announcement.options.map((option, optionIndex) => {
                                      const myVote = announcement.poll?.votes?.[currentUser.id];
                                      const hasVoted = myVote !== undefined;
                                      const isMyChoice = myVote === optionIndex;
                                      const voteCount = announcement.poll
                                        ? Object.values(announcement.poll.votes || {}).filter(v => v === optionIndex).length
                                        : 0;
                                      const totalVotes = announcement.poll ? Object.keys(announcement.poll.votes || {}).length : 0;
                                      const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                                      return (
                                        <button
                                          key={`${msg.id}-option-${optionIndex}`}
                                          type="button"
                                          disabled={!announcement.poll || !selectedComm.memberIds.includes(currentUser.id)}
                                          onClick={() => {
                                            if (announcement.poll) onVotePoll?.(selectedComm.id, announcement.poll.id, optionIndex);
                                          }}
                                          className={`relative w-full overflow-hidden rounded-lg border px-2.5 py-2 text-left text-[11px] transition-all ${
                                            isMyChoice
                                              ? 'border-emerald-500/50 bg-emerald-500/10'
                                              : darkMode
                                                ? 'border-white/10 hover:border-emerald-500/35'
                                                : 'border-emerald-700/10 bg-white/60 hover:border-emerald-500/40'
                                          } disabled:cursor-not-allowed`}
                                        >
                                          {hasVoted && (
                                            <span
                                              className={`absolute inset-y-0 left-0 ${isMyChoice ? 'bg-emerald-500/15' : 'bg-black/[0.03] dark:bg-white/[0.04]'}`}
                                              style={{ width: `${percentage}%` }}
                                            />
                                          )}
                                          <span className="relative flex items-center justify-between gap-2">
                                            <span className={`font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                                              {isMyChoice ? '✓ ' : ''}{option}
                                            </span>
                                            {hasVoted && <span className="shrink-0 text-[9px] font-bold text-slate-400">{percentage}%</span>}
                                          </span>
                                        </button>
                                      );
                                    })}
                                    <p className="text-[9px] text-slate-500">
                                      {announcement.poll
                                        ? `${Object.keys(announcement.poll.votes || {}).length} vote${Object.keys(announcement.poll.votes || {}).length === 1 ? '' : 's'} · ${announcement.poll.votes[currentUser.id] !== undefined ? 'You voted — tap to change' : 'Tap an option to vote'}`
                                        : 'Open Polls to vote on this older poll'}
                                    </p>
                                  </div>
                                ) : announcement.detailText && (
                                  <p className={`mt-1.5 text-[11px] leading-relaxed whitespace-pre-wrap ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                    {announcement.detailText}
                                  </p>
                                )}
                                {announcement.resourceLink && (
                                  <a
                                    href={announcement.resourceLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-2 inline-flex max-w-full items-center gap-1 rounded-lg bg-indigo-500/10 px-2 py-1 text-[10px] font-bold text-indigo-600 hover:bg-indigo-500/20 dark:text-indigo-300"
                                  >
                                    Open resource ↗
                                  </a>
                                )}
                                {announcement.kind === 'discussion' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveTab('threads');
                                      setSelectedThreadId(announcement.thread?.id || announcement.itemId || null);
                                    }}
                                    className="mt-2 inline-flex items-center gap-1 rounded-lg bg-violet-500/10 px-2 py-1 text-[10px] font-bold text-violet-600 hover:bg-violet-500/20 dark:text-violet-300"
                                  >
                                    Open discussion ↗
                                  </button>
                                )}
                                <div className="mt-2 flex items-center gap-2 border-t border-black/5 pt-2 dark:border-white/10">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const id = `${msg.id}-feedback`;
                                      setFeedbackOpenId(prev => prev === id ? null : id);
                                    }}
                                    className="text-[10px] font-bold text-slate-500 hover:text-indigo-500"
                                  >
                                    {feedbackOpenId === `${msg.id}-feedback` ? 'Close feedback' : 'Give feedback'}
                                  </button>
                                  {announcement.kind === 'poll' && (
                                    <button
                                      type="button"
                                      onClick={() => setActiveTab('polls')}
                                      className="text-[10px] font-bold text-slate-500 hover:text-emerald-500"
                                    >
                                      Open full poll
                                    </button>
                                  )}
                                </div>
                                {feedbackOpenId === `${msg.id}-feedback` && (
                                  <form
                                    onSubmit={e => { e.preventDefault(); sendAnnouncementFeedback(`${msg.id}-feedback`, announcement.title); }}
                                    className="mt-2 flex gap-1.5"
                                  >
                                    <input
                                      value={feedbackText}
                                      onChange={e => setFeedbackText(e.target.value)}
                                      placeholder="Share your feedback…"
                                      className={`min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-[10px] outline-none focus:ring-1 focus:ring-indigo-400 ${darkMode ? 'border-white/10 bg-black/20 text-white placeholder:text-slate-500' : 'border-neutral-200 bg-white text-slate-700 placeholder:text-slate-400'}`}
                                    />
                                    <button
                                      type="submit"
                                      disabled={!feedbackText.trim() || feedbackSending}
                                      className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[10px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                      Send
                                    </button>
                                  </form>
                                )}
                              </div>
                            ) : (
                              <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${isMe
                                ? 'bg-violet-500 text-white rounded-tr-sm'
                                : darkMode ? 'bg-white/8 text-slate-200 rounded-tl-sm' : 'bg-neutral-100 text-slate-800 rounded-tl-sm'
                              }`}>
                                {msg.content}
                              </div>
                            )}
                            <span className="text-[8px] text-slate-400 font-mono">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div className={`px-3 py-3 border-t shrink-0 ${darkMode ? 'border-white/10' : 'border-neutral-100'}`}>
                  {selectedComm.memberIds.includes(currentUser.id) ? (
                    <div className="flex gap-2">
                      <input
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                        placeholder={`Message ${selectedComm.name}…`}
                        className={`flex-1 px-3 py-2 text-xs rounded-xl border outline-none focus:ring-1 focus:ring-violet-500 ${darkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500' : 'bg-neutral-50 border-neutral-200 text-slate-800 placeholder:text-slate-400'}`}
                      />
                      <button
                        onClick={sendChatMessage}
                        disabled={!chatInput.trim() || chatSending}
                        className="p-2 rounded-xl bg-violet-500 hover:bg-violet-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                      >
                        <Send size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleJoinLeaveClick(selectedComm.id)}
                      className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      Join {selectedComm.name} to chat
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── MEMBERS TAB ──────────────────────────────────────── */}
            {activeTab === 'members' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800 dark:text-slate-200">
                      Community Members
                    </h3>
                    <p className={`text-[11px] ${darkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                      {selectedComm.memberIds.length} student{selectedComm.memberIds.length !== 1 ? 's' : ''} in this community
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedComm.memberIds.map(memberId => {
                    const member = allUsers.find(u => u.id === memberId);
                    if (!member) return null;
                    const isMe = member.id === currentUser.id;
                    const connStatus = getConnStatus(member.id);
                    return (
                      <div
                        key={memberId}
                        className={`p-3.5 rounded-xl border flex items-center gap-3 ${darkMode ? 'bg-[#121217] border-white/10' : 'bg-white border-neutral-200'}`}
                      >
                        <div
                          className="w-9 h-9 rounded-full bg-indigo-500/10 flex items-center justify-center text-[13px] font-black text-indigo-500 overflow-hidden border border-indigo-500/20 shrink-0 cursor-pointer"
                          onClick={() => onViewUserProfile?.(member.id)}
                        >
                          <Avatar avatar={member.avatar} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-xs font-bold truncate cursor-pointer hover:text-indigo-500 transition-colors ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}
                            onClick={() => onViewUserProfile?.(member.id)}
                          >
                            {member.fullName}
                            {memberId === selectedComm.creatorId && (
                              <span className="ml-1.5 text-[8px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-bold uppercase">Admin</span>
                            )}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">{member.college} · {member.branch}</p>
                        </div>
                        {!isMe && (
                          <div className="shrink-0">
                            {connStatus === 'accepted' ? (
                              <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
                                <UserCheck size={10} /> Connected
                              </span>
                            ) : connStatus === 'pending' ? (
                              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg">Pending</span>
                            ) : (
                              <button
                                onClick={() => onViewUserProfile?.(member.id)}
                                className="text-[9px] font-bold text-indigo-500 border border-indigo-500/30 hover:bg-indigo-500/10 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                              >
                                View
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── EVENTS TAB ───────────────────────────────────────── */}
            {activeTab === 'events' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800 dark:text-slate-200">Campus Events</h3>
                  <p className={`text-[11px] ${darkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                    Events happening across the network — relevant to your community
                  </p>
                </div>
                {eventsLoading ? (
                  <div className={`p-8 text-center rounded-xl border border-dashed ${darkMode ? 'border-white/5' : 'border-neutral-200'}`}>
                    <p className="text-xs text-slate-400">Loading events…</p>
                  </div>
                ) : (() => {
                  // Show events relevant to this community (match tags/category) first, then rest
                  const commTags = selectedComm.tags.map(t => t.toLowerCase());
                  const commCat = selectedComm.category.toLowerCase();
                  const relevant = communityEvents.filter(ev =>
                    commTags.some(t => ev.title.toLowerCase().includes(t) || ev.category.toLowerCase().includes(t) || ev.description.toLowerCase().includes(t)) ||
                    ev.category.toLowerCase().split(/[\s&/]+/).some((w: string) => commCat.includes(w) || commTags.includes(w))
                  );
                  const other = communityEvents.filter(ev => !relevant.find(r => r.id === ev.id));
                  const displayEvents = [...relevant, ...other];
                  return displayEvents.length === 0 ? (
                    <div className={`p-8 text-center rounded-xl border border-dashed ${darkMode ? 'border-white/5 bg-zinc-900/10' : 'border-neutral-200 bg-neutral-50'}`}>
                      <CalendarDays size={24} className="mx-auto mb-2 text-slate-300" />
                      <p className="text-xs text-slate-400 font-medium">No events found. Check back soon!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {relevant.length > 0 && (
                        <p className="text-[9.5px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
                          ✨ Relevant to {selectedComm.name}
                        </p>
                      )}
                      {displayEvents.map((ev, idx) => {
                        const isRelevantEnd = idx === relevant.length - 1 && other.length > 0;
                        const isRegistered = ev.registeredIds.includes(currentUser.id);
                        const isFull = ev.maxSeats != null && ev.registeredIds.length >= ev.maxSeats;
                        return (
                          <React.Fragment key={ev.id}>
                            {idx === relevant.length && other.length > 0 && relevant.length > 0 && (
                              <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 pt-1">Other Events</p>
                            )}
                            <div className={`p-4 rounded-xl border transition-all ${darkMode ? 'bg-[#121217] border-white/10 hover:border-white/20' : 'bg-white border-neutral-200 hover:border-neutral-300'}`}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0 space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                      ev.category === 'Hackathon' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' :
                                      ev.category === 'Fest' ? 'bg-pink-500/10 text-pink-600 dark:text-pink-400' :
                                      ev.category === 'Sports' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
                                      'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                    }`}>{ev.category}</span>
                                    {ev.isOnline && <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400">Online</span>}
                                  </div>
                                  <h4 className={`text-xs font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{ev.title}</h4>
                                  <p className={`text-[11px] line-clamp-2 ${darkMode ? 'text-zinc-400' : 'text-slate-500'}`}>{ev.description}</p>
                                  <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono flex-wrap">
                                    <span className="flex items-center gap-1"><CalendarDays size={10} />{ev.date}</span>
                                    <span className="flex items-center gap-1"><Clock size={10} />{ev.time}</span>
                                    <span className="flex items-center gap-1"><MapPin size={10} />{ev.venue}</span>
                                  </div>
                                </div>
                                <div className="shrink-0 text-center">
                                  <div className="text-[10px] text-slate-400 mb-1 font-mono">{ev.registeredIds.length}{ev.maxSeats ? `/${ev.maxSeats}` : ''}</div>
                                  {isRegistered ? (
                                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg flex items-center gap-1">
                                      <Check size={9} /> Going
                                    </span>
                                  ) : (
                                    <button
                                      disabled={isFull}
                                      onClick={async () => {
                                        if (isFull) return;
                                        try {
                                          await api.events.register(ev.id, currentUser.id);
                                          setCommunityEvents(prev => prev.map(e =>
                                            e.id === ev.id ? { ...e, registeredIds: [...e.registeredIds, currentUser.id] } : e
                                          ));
                                        } catch {}
                                      }}
                                      className="text-[9px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                                    >
                                      {isFull ? 'Full' : 'Register'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ── POLLS TAB ────────────────────────────────────────── */}
            {activeTab === 'polls' && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800 dark:text-slate-200">Community Polls</h3>
                    <p className={`text-[11px] ${darkMode ? 'text-zinc-500' : 'text-slate-500'}`}>Vote on questions from fellow members</p>
                  </div>
                  {selectedComm.memberIds.includes(currentUser.id) && (
                    <button
                      onClick={() => setShowPollForm(!showPollForm)}
                      className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] uppercase font-bold tracking-wider rounded-xl cursor-pointer flex items-center gap-1 transition-all"
                    >
                      <Plus size={12} /> Create Poll
                    </button>
                  )}
                </div>

                {/* New Poll Form */}
                {showPollForm && (
                  <form onSubmit={handlePollSubmit} className={`p-4 rounded-xl border space-y-3 ${darkMode ? 'bg-[#121217] border-white/10' : 'bg-white border-neutral-200'}`}>
                    <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">New Poll</h4>
                    <div>
                      <label className="block text-[9.5px] font-bold uppercase text-slate-400 mb-1">Question</label>
                      <input
                        type="text"
                        required
                        value={pollQuestion}
                        onChange={e => setPollQuestion(e.target.value)}
                        placeholder="e.g. What's the best resource for DSA?"
                        className={`w-full p-2.5 text-xs rounded-xl border ${darkMode ? 'bg-[#09090C] border-white/10 text-white' : 'bg-white border-neutral-200 text-slate-800'}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[9.5px] font-bold uppercase text-slate-400">Options (min 2)</label>
                      {pollOptions.map((opt, i) => (
                        <div key={i} className="flex gap-2">
                          <input
                            type="text"
                            value={opt}
                            onChange={e => setPollOptions(prev => prev.map((o, j) => j === i ? e.target.value : o))}
                            placeholder={`Option ${i + 1}`}
                            className={`flex-1 p-2 text-xs rounded-xl border ${darkMode ? 'bg-[#09090C] border-white/10 text-white' : 'bg-white border-neutral-200 text-slate-800'}`}
                          />
                          {pollOptions.length > 2 && (
                            <button type="button" onClick={() => setPollOptions(prev => prev.filter((_, j) => j !== i))}
                              className="p-2 text-rose-400 hover:text-rose-600 cursor-pointer">
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                      {pollOptions.length < 6 && (
                        <button type="button" onClick={() => setPollOptions(prev => [...prev, ''])}
                          className={`text-[10px] font-bold text-indigo-500 hover:text-indigo-400 flex items-center gap-1 cursor-pointer`}>
                          <Plus size={10} /> Add option
                        </button>
                      )}
                    </div>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setShowPollForm(false)}
                        className={`py-1.5 px-3 rounded-xl border text-[10px] font-bold uppercase cursor-pointer ${darkMode ? 'bg-zinc-900 border-white/5 text-slate-300' : 'bg-white border-neutral-200 text-slate-600'}`}>
                        Cancel
                      </button>
                      <button type="submit" disabled={!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2}
                        className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] font-bold uppercase rounded-xl cursor-pointer">
                        Launch Poll
                      </button>
                    </div>
                  </form>
                )}

                {/* Polls list */}
                {(selectedComm.polls || []).length === 0 ? (
                  <div className={`p-8 text-center rounded-xl border border-dashed ${darkMode ? 'border-white/5 bg-zinc-900/10' : 'border-neutral-200 bg-neutral-50'}`}>
                    <Vote size={24} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-xs text-slate-400 font-medium">No polls yet. Create one to hear from the community!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {[...(selectedComm.polls || [])].reverse().map((poll: CommunityPoll) => {
                      const totalVotes = Object.keys(poll.votes || {}).length;
                      const myVote = (poll.votes || {})[currentUser.id];
                      const hasVoted = myVote !== undefined;
                      const author = allUsers.find(u => u.id === poll.authorId);
                      return (
                        <div key={poll.id} className={`p-4 rounded-xl border space-y-3 ${darkMode ? 'bg-[#121217] border-white/10' : 'bg-white border-neutral-200'}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className={`text-xs font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{poll.question}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                by {author?.fullName || 'Member'} · {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
                              </p>
                            </div>
                            {hasVoted && (
                              <span className="shrink-0 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Voted</span>
                            )}
                          </div>
                          <div className="space-y-2">
                            {poll.options.map((option, optIdx) => {
                              const voteCount = Object.values(poll.votes || {}).filter((v: any) => v === optIdx).length;
                              const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                              const isMyChoice = myVote === optIdx;
                              return (
                                <button
                                  key={optIdx}
                                  onClick={() => {
                                    if (!selectedComm.memberIds.includes(currentUser.id)) return;
                                    onVotePoll?.(selectedComm.id, poll.id, optIdx);
                                  }}
                                  disabled={!selectedComm.memberIds.includes(currentUser.id)}
                                  className={`w-full text-left rounded-xl border overflow-hidden transition-all cursor-pointer ${
                                    isMyChoice
                                      ? 'border-emerald-500/40 bg-emerald-500/5'
                                      : darkMode ? 'border-white/10 hover:border-white/20' : 'border-neutral-200 hover:border-neutral-300'
                                  } disabled:cursor-not-allowed`}
                                >
                                  <div className="relative px-3 py-2">
                                    {/* Progress bar */}
                                    {hasVoted && (
                                      <div
                                        className={`absolute inset-0 rounded-xl transition-all ${isMyChoice ? 'bg-emerald-500/15' : darkMode ? 'bg-white/5' : 'bg-neutral-100'}`}
                                        style={{ width: `${pct}%` }}
                                      />
                                    )}
                                    <div className="relative flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        {isMyChoice && <Check size={10} className="text-emerald-500 shrink-0" />}
                                        <span className={`text-xs ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{option}</span>
                                      </div>
                                      {hasVoted && (
                                        <span className="text-[10px] font-bold font-mono text-slate-400 shrink-0">{pct}%</span>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                          {!selectedComm.memberIds.includes(currentUser.id) && (
                            <p className="text-[10px] text-slate-400 italic">Join this community to vote</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      ) : (
        <>
          <CommunityDiscovery
            currentUser={currentUser}
            communities={communities}
            posts={posts}
            allUsers={allUsers}
            onJoinLeave={handleJoinLeaveClick}
            onOpen={(communityId) => { setActiveCommunityId(communityId); setActiveTab('feed'); }}
            onShare={openCommunityShare}
            onCreate={() => setShowCreateModal(true)}
          />
          {false && (
        /* ======================== DISCOVER COMMUNITIES DASHBOARD ======================== */
        <div className="space-y-5">

          {/* ── DOMAIN FILTER TABS (top of page) ── */}
          <div className={`sticky top-0 z-10 -mx-1 px-1 py-3 ${darkMode ? 'bg-[#09090D]' : 'bg-slate-50'}`}>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {DOMAIN_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setSelectedDomain(tab.id);
                    setSelectedCategory('All');
                    setSelectedTag(null);
                  }}
                  className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedDomain === tab.id
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                      : darkMode
                        ? 'bg-[#0E0E12] border border-white/10 text-slate-300 hover:border-indigo-500/40 hover:text-white'
                        : 'bg-white border border-neutral-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-700 shadow-sm'
                  }`}
                >
                  <span>{tab.emoji}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

           {/* ── UNIVERSAL COMMUNITY SEARCH ── */}
           <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-[#0E0E12] border-white/10' : 'bg-white border-neutral-200 shadow-sm'}`}>
             <div className="flex flex-col lg:flex-row gap-3">
               <div className="relative flex-1">
                 <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                   <Search size={15} />
                 </span>
                 <input
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value)}
                   aria-label="Search communities"
                   placeholder="Search communities, clubs, colleges, or topics..."
                   className={`w-full pl-10 pr-4 py-3 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
                     darkMode
                       ? 'bg-[#121217] border-white/10 text-white placeholder:text-slate-600'
                       : 'bg-slate-50 border-neutral-200 text-slate-800 placeholder:text-slate-400'
                   }`}
                 />
                 {searchQuery && (
                   <button
                     type="button"
                     onClick={() => setSearchQuery('')}
                     aria-label="Clear community search"
                     className="absolute inset-y-0 right-0 px-3 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                   >
                     <X size={14} />
                   </button>
                 )}
               </div>
               <div className="flex gap-2 shrink-0">
                 <button
                   type="button"
                   onClick={() => setDirectoryMode('browse')}
                   className={`flex-1 lg:flex-none px-4 py-2.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider border cursor-pointer transition-all ${
                     directoryMode === 'browse'
                       ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                       : darkMode
                         ? 'border-white/10 text-slate-400 hover:bg-white/5'
                         : 'border-neutral-200 text-slate-600 hover:bg-neutral-50'
                   }`}
                 >
                   Browse all
                 </button>
                 <button
                   type="button"
                   onClick={() => setDirectoryMode('joined')}
                   className={`flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider border cursor-pointer transition-all ${
                     directoryMode === 'joined'
                       ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                       : darkMode
                         ? 'border-white/10 text-slate-400 hover:bg-white/5'
                         : 'border-neutral-200 text-slate-600 hover:bg-neutral-50'
                   }`}
                 >
                   <ShieldCheck size={13} /> Joined
                   <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${
                     directoryMode === 'joined' ? 'bg-white/20' : darkMode ? 'bg-white/10' : 'bg-slate-100'
                   }`}>
                     {joinedCommunities.length}
                   </span>
                 </button>
                 <button
                   type="button"
                   onClick={() => setShowCreateModal(true)}
                   className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] uppercase font-extrabold tracking-wider rounded-xl cursor-pointer transition-all shadow-sm"
                 >
                   <Plus size={14} /> Create
                 </button>
               </div>
             </div>
             {(directoryMode === 'joined' || searchQuery) && (
               <p className={`mt-2.5 text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                 {directoryMode === 'joined'
                   ? `${universalDirectoryResults.length} ${universalDirectoryResults.length === 1 ? 'community' : 'communities'} you have joined`
                   : `${universalDirectoryResults.length} matching ${universalDirectoryResults.length === 1 ? 'community' : 'communities'} across colleges, clubs, and topics`}
               </p>
             )}
           </div>

           {showUniversalDirectory && (
             <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-[#0E0E12] border-white/10' : 'bg-white border-neutral-200'} space-y-4`}>
               <div className="flex items-center justify-between gap-3">
                 <div>
                   <p className={`text-[8px] font-black uppercase tracking-[0.2em] ${directoryMode === 'joined' ? 'text-emerald-500' : 'text-indigo-500'}`}>
                     ✦ {directoryMode === 'joined' ? 'Your spaces' : 'Directory results'}
                   </p>
                   <h3 className={`text-sm font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                     {directoryMode === 'joined' ? 'All Joined Communities' : 'Search Results'}
                   </h3>
                 </div>
                 <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                   directoryMode === 'joined'
                     ? darkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                     : darkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-700'
                 }`}>
                   {universalDirectoryResults.length} found
                 </span>
               </div>
               {universalDirectoryResults.length > 0 ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                   {universalDirectoryResults.map(renderDirectoryCard)}
                 </div>
               ) : (
                 <div className={`py-10 text-center rounded-xl border border-dashed ${darkMode ? 'border-white/10' : 'border-neutral-200'}`}>
                   <Search size={22} className="mx-auto mb-2 text-slate-400" />
                   <p className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                     {directoryMode === 'joined' ? 'You have not joined any communities yet' : 'No communities match that search'}
                   </p>
                   <p className="mt-1 text-[10px] text-slate-400">
                     {directoryMode === 'joined' ? 'Browse the directory and join a space that fits you.' : 'Try a college name, club, exam, or topic.'}
                   </p>
                   {directoryMode === 'joined' && (
                     <button
                       type="button"
                       onClick={() => setDirectoryMode('browse')}
                       className="mt-4 px-3 py-2 rounded-lg bg-indigo-600 text-white text-[10px] font-bold cursor-pointer"
                     >
                       Browse communities
                     </button>
                   )}
                 </div>
               )}
             </div>
           )}

          {/* Top Info Banner */}
           {!showUniversalDirectory && selectedDomain === 'All' && (
          <div className={`p-6 rounded-2xl border border-neutral-200/80 dark:border-white/10 ${darkMode ? 'bg-[#0E0E12]' : 'bg-white'} space-y-3`}>
            <div className="space-y-1">
              <h2 className="text-lg font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
                <Sparkles className="text-indigo-600 dark:text-indigo-400" size={20} />
                NATIONWIDE ECOSYSTEM CHAPTERS
              </h2>
              <p className={`text-xs leading-relaxed max-w-4xl text-left ${darkMode ? 'text-zinc-400' : 'text-slate-600'}`}>
                Welcome to India’s verified student network. Connect, learn, share blueprints, study, find co-founders, and coordinate opportunities with premier students from <strong>IITs, NITs, IIITs, AIIMS, NLS, NIDs, and leading state & private universities</strong>.
              </p>
            </div>

            {/* QUICK STATS RAIL */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-dashed border-neutral-200 dark:border-white/5">
              <div className="text-left font-mono">
                <span className="block text-sm font-black text-indigo-600 dark:text-indigo-400">10 Streams</span>
                <span className="text-[9px] uppercase tracking-wider text-slate-500">Multi-disciplinary hubs</span>
              </div>
              <div className="text-left font-mono">
                <span className="block text-sm font-black text-pink-500">60 Chapters</span>
                <span className="text-[9px] uppercase tracking-wider text-slate-500">Curated interest circles</span>
              </div>
              <div className="text-left font-mono">
                <span className="block text-sm font-black text-amber-500">Verified India-Wide</span>
                <span className="text-[9px] uppercase tracking-wider text-slate-500">Student-Only access</span>
              </div>
              <div className="text-left font-mono">
                <span className="block text-sm font-black text-emerald-500">Resource Lockers</span>
                <span className="text-[9px] uppercase tracking-wider text-slate-500">Syllabus & QA Share</span>
              </div>
            </div>
          </div>
          )} {/* end selectedDomain === 'All' info banner */}

          {/* ── COLLEGE COMMUNITIES ── */}
           {!showUniversalDirectory && collegeCommunities.length > 0 && (selectedDomain === 'All' || selectedDomain === 'College') && (
            <div className={`p-5 rounded-2xl border border-neutral-200/80 dark:border-white/10 ${darkMode ? 'bg-[#0E0E12]' : 'bg-white'} space-y-4`}>
              {/* Header */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
                    <GraduationCap size={17} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-500">✦ Official Campus Spaces</p>
                    <h3 className={`text-sm font-black leading-tight tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>College Communities</h3>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${darkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
                  {collegeCommunities.length} registered colleges
                </span>
              </div>

              {/* Your college community first */}
              {myCollegeCommunity && (
                <div className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${darkMode ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50'}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${darkMode ? 'bg-emerald-500/15' : 'bg-emerald-100'}`}>
                      <GraduationCap size={15} className="text-emerald-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className={`text-xs font-extrabold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{myCollegeCommunity.name}</p>
                        <span className="shrink-0 text-[9px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">YOUR COLLEGE</span>
                      </div>
                      <p className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                        {myCollegeCommunity.memberIds.length} joined · {(myCollegeCommunity as any).realMemberCount ?? '?'} students
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setActiveCommunityId(myCollegeCommunity.id)}
                      className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg cursor-pointer transition-all border ${darkMode ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-neutral-200 text-slate-600 hover:bg-neutral-50'}`}
                    >
                      View →
                    </button>
                    <button
                      onClick={() => handleJoinLeaveClick(myCollegeCommunity.id)}
                      className={`text-[10px] font-extrabold px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                        myCollegeCommunity.memberIds.includes(currentUser.id)
                          ? 'border border-rose-500/30 text-rose-500 hover:bg-rose-500/5'
                          : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
                      }`}
                    >
                      {myCollegeCommunity.memberIds.includes(currentUser.id) ? 'Leave' : 'Join'}
                    </button>
                  </div>
                </div>
              )}

              {/* All other colleges scroll list */}
              <div className="space-y-2">
                <p className={`text-[9px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>All Registered Colleges</p>
                <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
                  {collegeCommunities
                    .filter(c => c.id !== myCollegeCommunity?.id)
                    .map((comm) => {
                      const hasJoined = comm.memberIds.includes(currentUser.id);
                      const GRAD_PAIRS = [
                        'from-indigo-500 to-violet-600',
                        'from-rose-500 to-pink-600',
                        'from-amber-500 to-orange-600',
                        'from-sky-500 to-blue-600',
                        'from-teal-500 to-emerald-600',
                        'from-fuchsia-500 to-purple-600',
                      ];
                      const grad = GRAD_PAIRS[Math.abs(comm.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % GRAD_PAIRS.length];
                      return (
                        <div
                          key={comm.id}
                          style={{ touchAction: 'manipulation' }}
                          className={`shrink-0 w-52 rounded-2xl border overflow-hidden flex flex-col cursor-pointer transition-all hover:scale-[1.01] ${darkMode ? 'border-white/8 bg-[#111118]' : 'border-neutral-100 bg-white shadow-sm hover:shadow-md'}`}
                          onClick={() => setActiveCommunityId(comm.id)}
                        >
                          {/* Campus photo header */}
                          <div className="h-14 relative overflow-hidden flex items-center px-3 gap-2">
                            <img
                              src={getCollegeImage(comm.name)}
                              alt={comm.name}
                              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                              onError={(event) => {
                                event.currentTarget.onerror = null;
                                event.currentTarget.src = getCommunityImage(comm.name, comm.category, comm.id);
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 pointer-events-none" />
                            <div className="relative w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                              <GraduationCap size={14} className="text-white" />
                            </div>
                            {hasJoined && (
                              <span className="absolute top-2 right-2 text-[9px] font-bold bg-black/30 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-full pointer-events-none">✓ Joined</span>
                            )}
                          </div>
                          {/* Card body */}
                          <div className="flex flex-col flex-1 p-3 gap-2">
                            <p className={`text-[11px] font-extrabold leading-tight truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{comm.name}</p>
                            <p className={`text-[9px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                              {comm.memberIds.length} joined · {(comm as any).realMemberCount ?? '?'} students
                            </p>
                             <div className="flex gap-1.5 mt-auto">
                             {shareButton(comm, true)}
                             <button
                              style={{ touchAction: 'manipulation' }}
                              onClick={(e) => { e.stopPropagation(); handleJoinLeaveClick(comm.id); }}
                              className={`mt-auto text-[9px] font-extrabold py-1.5 rounded-lg cursor-pointer transition-all ${
                                hasJoined
                                  ? 'border border-rose-500/30 text-rose-500 hover:bg-rose-500/5'
                                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm hover:opacity-90'
                              }`}
                            >
                              {hasJoined ? 'Leave' : 'Join Community'}
                            </button>
                             </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* ── CAMPUS CLUBS & SOCIETIES ── */}
           {!showUniversalDirectory && visibleClubCommunities.length > 0 && (selectedDomain === 'All' || selectedDomain === 'Clubs') && (
            <div className={`p-5 rounded-2xl border border-fuchsia-200/80 dark:border-fuchsia-500/20 ${darkMode ? 'bg-[#0E0E12]' : 'bg-gradient-to-br from-fuchsia-50/70 via-white to-rose-50/70'} space-y-4`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-rose-500 flex items-center justify-center shadow-md shadow-fuchsia-500/20">
                    <Award size={17} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-fuchsia-500">✦ Student-led campus groups</p>
                    <h3 className={`text-sm font-black leading-tight tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>Clubs & Societies</h3>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${darkMode ? 'bg-fuchsia-500/10 text-fuchsia-400' : 'bg-fuchsia-100 text-fuchsia-700'}`}>
                  {visibleClubCommunities.length} clubs
                </span>
              </div>
              <p className={`text-[11px] leading-relaxed max-w-2xl ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Join student-led clubs, cultural groups, and campus societies. These are active groups with their own members and activities—not topic communities.
              </p>
              <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
                {visibleClubCommunities.map(comm => {
                  const hasJoined = comm.memberIds.includes(currentUser.id);
                  return (
                    <div
                      key={comm.id}
                      style={{ touchAction: 'manipulation' }}
                      className={`shrink-0 w-56 rounded-2xl border overflow-hidden flex flex-col cursor-pointer transition-all hover:scale-[1.01] ${darkMode ? 'border-fuchsia-500/15 bg-[#111118]' : 'border-fuchsia-100 bg-white shadow-sm hover:shadow-md'}`}
                      onClick={() => { setActiveCommunityId(comm.id); setActiveTab('feed'); }}
                    >
                      <div className="h-16 relative overflow-hidden flex items-center px-3 gap-2.5">
                        <img src={getCommunityImage(comm.name, comm.category, comm.id)} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
                        <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/75 to-rose-500/75 pointer-events-none" />
                        <div className="relative w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                          {renderIcon(comm.icon)}
                        </div>
                        <div className="relative min-w-0">
                          <p className="text-white text-[11px] font-extrabold leading-tight line-clamp-2">{comm.name}</p>
                          <p className="text-white/75 text-[9px] mt-0.5">Student club</p>
                        </div>
                        {hasJoined && <span className="absolute top-2 right-2 text-[8px] font-bold bg-black/25 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-full">✓ Joined</span>}
                      </div>
                      <div className="flex flex-col flex-1 p-3 gap-2">
                        <p className={`text-[9px] leading-relaxed line-clamp-2 flex-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{comm.description}</p>
                        <p className={`text-[9px] font-mono ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>{comm.memberIds.length} members</p>
                         <div className="flex gap-1.5 mt-1">
                           {shareButton(comm, true)}
                          <button
                            style={{ touchAction: 'manipulation' }}
                            onClick={e => { e.stopPropagation(); handleJoinLeaveClick(comm.id); }}
                            className={`flex-1 text-[9px] font-extrabold py-1.5 rounded-lg cursor-pointer transition-all active:scale-95 ${hasJoined ? 'border border-rose-500/30 text-rose-500 hover:bg-rose-500/5' : 'bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white shadow-sm hover:opacity-90'}`}
                          >
                            {hasJoined ? 'Leave' : 'Join Club'}
                          </button>
                          <button
                            style={{ touchAction: 'manipulation' }}
                            onClick={e => { e.stopPropagation(); setActiveCommunityId(comm.id); setActiveTab('feed'); }}
                            className={`px-2.5 text-[9px] font-bold rounded-lg cursor-pointer border transition-all active:scale-95 ${darkMode ? 'border-white/10 text-slate-400 hover:bg-white/5' : 'border-neutral-200 text-slate-500 hover:bg-neutral-50'}`}
                          >
                            View
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── DOMAIN-GROUPED COMMUNITY SECTIONS ── */}
           {!showUniversalDirectory && selectedDomain !== 'College' && (() => {
            const SECTION_DEFS = [
              {
                id: 'exam',
                label: 'Exam Prep',
                subtitle: 'Crack competitive exams with India\'s top aspirants',
                emoji: '📚',
                grad: 'from-violet-500 to-indigo-600',
                light: 'bg-violet-50',
                lightText: 'text-violet-700',
                darkBg: 'bg-violet-500/10',
                darkText: 'text-violet-400',
                ids: ['domain-upsc-2025','domain-gate-2026','domain-cat-prep','domain-clat-prep','domain-jee-prep','domain-neet-prep'],
                domains: ['Academics','All'],
              },
              {
                id: 'placement',
                label: 'Placements & Jobs',
                subtitle: 'Land your dream job or internship with peer support',
                emoji: '💼',
                grad: 'from-emerald-500 to-teal-600',
                light: 'bg-emerald-50',
                lightText: 'text-emerald-700',
                darkBg: 'bg-emerald-500/10',
                darkText: 'text-emerald-400',
                ids: ['domain-placement-hub','domain-interview-ready','domain-internship-hunt','domain-off-campus'],
                domains: ['Placements','All'],
              },
              {
                id: 'coding',
                label: 'Coding & Tech',
                subtitle: 'DSA, web dev, AI/ML, competitive programming',
                emoji: '💻',
                grad: 'from-blue-500 to-cyan-600',
                light: 'bg-blue-50',
                lightText: 'text-blue-700',
                darkBg: 'bg-blue-500/10',
                darkText: 'text-blue-400',
                ids: ['domain-dsa-corner','domain-web-dev','domain-aiml','domain-cp-club'],
                domains: ['Coding','All'],
              },
              {
                id: 'design-startup',
                label: 'Design & Startups',
                subtitle: 'Build products, design experiences, start companies',
                emoji: '🚀',
                grad: 'from-orange-500 to-pink-600',
                light: 'bg-orange-50',
                lightText: 'text-orange-700',
                darkBg: 'bg-orange-500/10',
                darkText: 'text-orange-400',
                ids: ['domain-uiux','domain-startup-founders'],
                domains: ['Interests','Design','All'],
              },
            ];

            const nonCollegeComms = communities.filter(c => c.category !== 'College Community' && c.category !== 'Club');
            const searchLower = searchQuery.toLowerCase();

            return (
              <div className="space-y-5">
                {/* Domain sections */}
                {SECTION_DEFS.filter(sec => sec.domains.includes(selectedDomain)).map(sec => {
                  // Get the communities for this section
                  let sectionComms = sec.ids
                    .map(id => nonCollegeComms.find(c => c.id === id))
                    .filter(Boolean) as typeof communities;

                  // If not found by ID (not yet seeded), fallback to category match
                  if (sectionComms.length === 0) {
                    sectionComms = nonCollegeComms.filter(c =>
                      DOMAIN_CATEGORIES[sec.id] ? DOMAIN_CATEGORIES[sec.id].includes(c.category) : false
                    );
                  }

                  // Apply search filter
                  if (searchQuery) {
                    sectionComms = sectionComms.filter(c =>
                      c.name.toLowerCase().includes(searchLower) ||
                      c.description.toLowerCase().includes(searchLower) ||
                      c.tags.some((t: string) => t.toLowerCase().includes(searchLower))
                    );
                  }

                  if (sectionComms.length === 0) return null;

                  return (
                    <div key={sec.id} className={`p-5 rounded-2xl border border-neutral-200/80 dark:border-white/10 ${darkMode ? 'bg-[#0E0E12]' : 'bg-white'} space-y-4`}>
                      {/* Section header */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-2xl bg-gradient-to-br ${sec.grad} flex items-center justify-center shadow-md`}>
                            <span className="text-base">{sec.emoji}</span>
                          </div>
                          <div>
                            <p className={`text-[8px] font-black uppercase tracking-[0.2em] ${darkMode ? sec.darkText : sec.lightText}`}>✦ {sec.subtitle}</p>
                            <h3 className={`text-sm font-black leading-tight tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{sec.label}</h3>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${darkMode ? `${sec.darkBg} ${sec.darkText}` : `${sec.light} ${sec.lightText}`}`}>
                          {sectionComms.length} communities
                        </span>
                      </div>

                      {/* Horizontal card scroll */}
                      <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
                        {sectionComms.map(comm => {
                          const hasJoined = comm.memberIds.includes(currentUser.id);
                          return (
                            <div
                              key={comm.id}
                              style={{ touchAction: 'manipulation' }}
                              className={`shrink-0 w-52 rounded-2xl border overflow-hidden flex flex-col cursor-pointer transition-all hover:scale-[1.01] ${darkMode ? 'border-white/8 bg-[#111118]' : 'border-neutral-100 bg-white shadow-sm hover:shadow-md'}`}
                              onClick={() => { setActiveCommunityId(comm.id); setActiveTab('feed'); }}
                            >
                              {/* Card colour header */}
                              <div className="h-14 relative overflow-hidden flex items-center px-3 gap-2.5">
                                <img src={getCommunityImage(comm.name, comm.category, comm.id)} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
                                <div className={`absolute inset-0 bg-gradient-to-br ${sec.grad} opacity-70 pointer-events-none`} />
                                <div className="relative w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                                  <span className="text-sm">{sec.emoji}</span>
                                </div>
                                <p className="relative text-white text-[10px] font-extrabold leading-tight line-clamp-2">{comm.name}</p>
                                {hasJoined && (
                                  <span className="absolute top-2 right-2 text-[8px] font-bold bg-black/30 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-full">✓ Joined</span>
                                )}
                              </div>
                              {/* Card body */}
                              <div className="flex flex-col flex-1 p-3 gap-2">
                                <p className={`text-[9px] leading-relaxed line-clamp-2 flex-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{comm.description}</p>
                                <p className={`text-[9px] font-mono ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>{comm.memberIds.length} members</p>
                                 <div className="flex gap-1.5 mt-1">
                                   {shareButton(comm, true)}
                                  <button
                                    style={{ touchAction: 'manipulation' }}
                                    onClick={e => { e.stopPropagation(); handleJoinLeaveClick(comm.id); }}
                                    className={`flex-1 text-[9px] font-extrabold py-1.5 rounded-lg cursor-pointer transition-all active:scale-95 ${
                                      hasJoined
                                        ? 'border border-rose-500/30 text-rose-500 hover:bg-rose-500/5'
                                        : `bg-gradient-to-r ${sec.grad} text-white shadow-sm hover:opacity-90`
                                    }`}
                                  >
                                    {hasJoined ? 'Leave' : 'Join'}
                                  </button>
                                  <button
                                    style={{ touchAction: 'manipulation' }}
                                    onClick={e => { e.stopPropagation(); setActiveCommunityId(comm.id); setActiveTab('feed'); }}
                                    className={`px-2.5 text-[9px] font-bold rounded-lg cursor-pointer border transition-all active:scale-95 ${darkMode ? 'border-white/10 text-slate-400 hover:bg-white/5' : 'border-neutral-200 text-slate-500 hover:bg-neutral-50'}`}
                                  >
                                    View
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* User-created / other communities not in domain sections */}
                {(() => {
                  const domainIds = new Set(SECTION_DEFS.flatMap(s => s.ids));
                  const others = nonCollegeComms.filter(c =>
                    !domainIds.has(c.id) &&
                    (selectedDomain === 'All' || DOMAIN_CATEGORIES[selectedDomain]?.includes(c.category)) &&
                    (!searchQuery || c.name.toLowerCase().includes(searchLower) || c.description.toLowerCase().includes(searchLower))
                  );
                  if (others.length === 0) return null;
                  return (
                    <div className={`p-5 rounded-2xl border border-neutral-200/80 dark:border-white/10 ${darkMode ? 'bg-[#0E0E12]' : 'bg-white'} space-y-4`}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-slate-500 to-zinc-600 flex items-center justify-center">
                          <span className="text-base">🏘️</span>
                        </div>
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">✦ Community Created</p>
                          <h3 className={`text-sm font-black leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>More Communities</h3>
                        </div>
                      </div>
                      <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
                        {others.map(comm => {
                          const hasJoined = comm.memberIds.includes(currentUser.id);
                          return (
                            <div
                              key={comm.id}
                              style={{ touchAction: 'manipulation' }}
                              className={`shrink-0 w-52 rounded-2xl border overflow-hidden flex flex-col cursor-pointer transition-all hover:scale-[1.01] ${darkMode ? 'border-white/8 bg-[#111118]' : 'border-neutral-100 bg-white shadow-sm hover:shadow-md'}`}
                              onClick={() => { setActiveCommunityId(comm.id); setActiveTab('feed'); }}
                            >
                              <div className="h-14 relative overflow-hidden flex items-center px-3 gap-2.5">
                                <img src={getCommunityImage(comm.name, comm.category, comm.id)} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
                                <div className="absolute inset-0 bg-gradient-to-br from-slate-500/75 to-zinc-600/75 pointer-events-none" />
                                <div className="relative w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">{renderIcon(comm.icon)}</div>
                                <p className="relative text-white text-[10px] font-extrabold leading-tight line-clamp-2">{comm.name}</p>
                                {hasJoined && <span className="absolute top-2 right-2 text-[8px] font-bold bg-black/30 text-white px-1.5 py-0.5 rounded-full">✓</span>}
                              </div>
                              <div className="flex flex-col flex-1 p-3 gap-2">
                                <p className={`text-[9px] leading-relaxed line-clamp-2 flex-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{comm.description}</p>
                                <p className={`text-[9px] font-mono ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>{comm.memberIds.length} members</p>
                                <div className="flex gap-1.5 mt-1">
                                  <button
                                    style={{ touchAction: 'manipulation' }}
                                    onClick={e => { e.stopPropagation(); handleJoinLeaveClick(comm.id); }}
                                    className={`flex-1 text-[9px] font-extrabold py-1.5 rounded-lg cursor-pointer transition-all active:scale-95 ${hasJoined ? 'border border-rose-500/30 text-rose-500' : 'bg-gradient-to-r from-slate-500 to-zinc-600 text-white shadow-sm hover:opacity-90'}`}
                                  >
                                    {hasJoined ? 'Leave' : 'Join'}
                                  </button>
                                  <button
                                    style={{ touchAction: 'manipulation' }}
                                    onClick={e => { e.stopPropagation(); setActiveCommunityId(comm.id); setActiveTab('feed'); }}
                                    className={`px-2.5 text-[9px] font-bold rounded-lg cursor-pointer border transition-all active:scale-95 ${darkMode ? 'border-white/10 text-slate-400 hover:bg-white/5' : 'border-neutral-200 text-slate-500 hover:bg-neutral-50'}`}
                                  >
                                    View
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })()}
        </div>
          )}
        </>
      )}

      {shareCommunity && (
        <CommunityShareModal
          community={shareCommunity}
          currentUser={currentUser}
          allUsers={allUsers}
          canInvite={shareCommunity.memberIds.includes(currentUser.id)}
          darkMode={darkMode}
          onClose={() => setShareCommunity(null)}
          onInvite={(userIds) => onInviteToCommunity(shareCommunity.id, userIds)}
        />
      )}

      {/* ======================== CREATE CLUB MODAL ======================== */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}
        >
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl ${darkMode ? 'bg-[#0E0E12] border-white/10' : 'bg-white border-neutral-200'}`}>
            {/* Modal Header */}
            <div className={`px-6 pt-6 pb-4 border-b ${darkMode ? 'border-white/5' : 'border-neutral-100'} flex items-center justify-between`}>
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2">
                   <Users size={16} className="text-indigo-500" /> Create a Community or Club
                </h2>
                <p className={`text-[11px] mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                   Start a student-led club or build a community around an idea, subject, or interest.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl leading-none font-bold cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Club Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                   Community or club name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={e => setCreateName(e.target.value)}
                  maxLength={60}
                  placeholder="e.g. Quantum Computing Circle, Debate Society..."
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${darkMode ? 'bg-[#121217] border-white/10 text-white placeholder:text-zinc-500' : 'bg-neutral-50 border-neutral-200 text-slate-800 placeholder:text-slate-400'}`}
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  value={createDesc}
                  onChange={e => setCreateDesc(e.target.value)}
                  rows={3}
                  maxLength={300}
                  placeholder="What is this club about? Who should join? What will members do together?"
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none ${darkMode ? 'bg-[#121217] border-white/10 text-white placeholder:text-zinc-500' : 'bg-neutral-50 border-neutral-200 text-slate-800 placeholder:text-slate-400'}`}
                />
                <p className="text-[10px] text-slate-400 text-right">{createDesc.length}/300</p>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                   Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={createCategory}
                  onChange={e => setCreateCategory(e.target.value)}
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${darkMode ? 'bg-[#121217] border-white/10 text-white' : 'bg-neutral-50 border-neutral-200 text-slate-800'}`}
                >
                  {categoriesList.filter(c => c !== 'All').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Icon Picker */}
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Icon
                </label>
                <div className="grid grid-cols-8 gap-1.5">
                  {ICON_OPTIONS.map(opt => (
                    <button
                      key={opt.name}
                      type="button"
                      onClick={() => setCreateIcon(opt.name)}
                      title={opt.label}
                      className={`p-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                        createIcon === opt.name
                          ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500'
                          : `border-neutral-200 dark:border-white/10 ${darkMode ? 'hover:bg-zinc-800' : 'hover:bg-neutral-100'}`
                      }`}
                    >
                      {renderIcon(opt.name)}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400">Selected: <span className="font-bold text-indigo-500 dark:text-indigo-400">{ICON_OPTIONS.find(o => o.name === createIcon)?.label}</span></p>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Tags <span className="text-slate-400 font-normal normal-case">(up to 6)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={createTagInput}
                    onChange={e => setCreateTagInput(e.target.value)}
                    onKeyDown={handleCreateTagKeyDown}
                    placeholder="e.g. DSA, Quantum, Finance..."
                    className={`flex-1 px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${darkMode ? 'bg-[#121217] border-white/10 text-white placeholder:text-zinc-500' : 'bg-neutral-50 border-neutral-200 text-slate-800 placeholder:text-slate-400'}`}
                  />
                  <button
                    type="button"
                    onClick={handleAddCreateTag}
                    disabled={createTags.length >= 6}
                    className="py-2 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-[10px] font-bold rounded-xl cursor-pointer transition-colors"
                  >
                    Add
                  </button>
                </div>
                {createTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {createTags.map(tag => (
                      <span
                        key={tag}
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${darkMode ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-700'}`}
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => setCreateTags(prev => prev.filter(t => t !== tag))}
                          className="text-indigo-400 hover:text-rose-500 cursor-pointer transition-colors leading-none"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className={`flex-1 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider cursor-pointer transition-all ${darkMode ? 'border-white/10 text-slate-400 hover:bg-zinc-800' : 'border-neutral-200 text-slate-600 hover:bg-neutral-50'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!createName.trim() || !createDesc.trim()}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-extrabold uppercase tracking-wider rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={13} /> Launch Club
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
