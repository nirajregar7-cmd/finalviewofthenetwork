import './_group.css';
import React, { useState } from 'react';
import {
  Plus,
  ArrowUp,
  ArrowDown,
  MessageSquare,
  Bookmark,
  Share2,
  MoreVertical,
  LayoutGrid,
  List,
  Check,
  ChevronRight,
  Sparkles,
  Code,
  Brain,
  Book,
  Rocket,
  Building,
  Heart,
  Target,
  ShieldCheck,
  Smartphone,
  Users,
} from 'lucide-react';
import { Community, Post, User } from './types';
import { getCollegeImage } from './collegeImages';
import { getCommunityImage } from './communityImages';
import { SafeAvatar } from './SafeAvatar';

const confetti = (_options?: { particleCount?: number; spread?: number }) => undefined;

const INTEREST_TOPIC_KEYWORDS: Record<string, string[]> = {
  dsa: ['dsa', 'data structure', 'algorithm'],
  ai: ['ai', 'machine learning', 'ml'],
  web: ['web', 'frontend', 'backend', 'full stack'],
  cyber: ['cyber', 'security', 'ethical hacking'],
  app: ['app', 'android', 'ios', 'mobile'],
};

const INTEREST_TOPIC_LABELS: Record<string, string> = {
  dsa: 'DSA',
  ai: 'AI/ML',
  web: 'Web Dev',
  cyber: 'Cybersecurity',
  app: 'App Dev',
};

interface CommunitiesViewProps {
  communities: Community[];
  posts: Post[];
  currentUser: User;
  onSelectCommunity: (slug: string) => void;
  onOpenCreate: () => void;
  onOpenProfile: (user: User) => void;
  onToggleJoinCommunity: (slug: string) => void;
  onToggleUpvote: (postId: string, delta: 1 | -1) => void;
  onToggleSave: (postId: string) => void;
  onToggleSaveCommunity: (communityId: string) => void;
}

export const CommunitiesView: React.FC<CommunitiesViewProps> = ({
  communities,
  posts,
  currentUser,
  onSelectCommunity,
  onOpenCreate,
  onOpenProfile,
  onToggleJoinCommunity,
  onToggleUpvote,
  onToggleSave,
  onToggleSaveCommunity,
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'my' | 'college' | 'interest' | 'career'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<'popular' | 'members' | 'recent'>('popular');
  const [trendingCommunityFilter, setTrendingCommunityFilter] = useState<string>('for_you');
  const [activeInterestTopic, setActiveInterestTopic] = useState<string | null>(null);

  // Filtered communities
  const filteredCommunities = communities.filter((c) => {
    if (activeCategory === 'my') return c.isJoined;
    if (activeCategory === 'college') return c.category === 'college';
    if (activeCategory === 'interest') {
      if (!activeInterestTopic) return c.category === 'interest';
      const keywords = INTEREST_TOPIC_KEYWORDS[activeInterestTopic] ?? [];
      const searchableText = `${c.name} ${c.displayName} ${c.description} ${c.slug}`.toLowerCase();
      return c.category === 'interest' && keywords.some((keyword) => searchableText.includes(keyword));
    }
    if (activeCategory === 'career') return c.category === 'career';
    return true;
  });
  const popularCommunities = [...filteredCommunities]
    .sort((a, b) => b.membersCount - a.membersCount)
    .slice(0, 5);
  const categoryLabel = activeInterestTopic
    ? INTEREST_TOPIC_LABELS[activeInterestTopic] || 'Interest'
    : {
      all: 'All',
      my: 'My',
      college: 'College',
      interest: 'Interest',
      career: 'Career',
    }[activeCategory];

  // Filtered trending posts
  const trendingPosts = posts.filter((p) => {
    if (trendingCommunityFilter === 'for_you') return true;
    return p.communitySlug === trendingCommunityFilter;
  });

  const getCommunityIcon = (slug: string) => {
    if (slug === '/dsa') return <Code className="w-5 h-5" />;
    if (slug === '/ai-ml') return <Brain className="w-5 h-5" />;
    if (slug === '/gate') return <Book className="w-5 h-5" />;
    if (slug === '/hackathons' || slug === '/startups') return <Rocket className="w-5 h-5" />;
    return <Building className="w-5 h-5" />;
  };

  const formatMemberCount = (count: number) => {
    if (!count) return 'New community';
    if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}K members`;
    return `${count} member${count === 1 ? '' : 's'}`;
  };

  const formatCompactCount = (count: number) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const interestTopics = [
    { id: 'dsa', label: 'DSA', keywords: ['dsa', 'data structures', 'algorithm', 'algorithms'], icon: <Code className="h-3.5 w-3.5" />, color: 'bg-indigo-50 text-indigo-600' },
    { id: 'ai', label: 'AI/ML', keywords: ['ai', 'ml', 'machine learning', 'deep learning', 'llm'], icon: <Brain className="h-3.5 w-3.5" />, color: 'bg-sky-50 text-sky-600' },
    { id: 'web', label: 'Web Dev', keywords: ['web', 'react', 'nextjs', 'fullstack', 'frontend', 'backend'], icon: <Building className="h-3.5 w-3.5" />, color: 'bg-slate-50 text-slate-600' },
    { id: 'cyber', label: 'Cybersecurity', keywords: ['cybersecurity', 'ethical hacking', 'security', 'ctf'], icon: <ShieldCheck className="h-3.5 w-3.5" />, color: 'bg-emerald-50 text-emerald-600' },
    { id: 'app', label: 'App Dev', keywords: ['app development', 'app developer', 'android', 'ios', 'mobile', 'react native', 'flutter'], icon: <Smartphone className="h-3.5 w-3.5" />, color: 'bg-amber-50 text-amber-600' },
  ].map((topic) => {
    const matchesTerm = (text: string, keyword: string) => {
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`(^|[^a-z0-9])${escapedKeyword}([^a-z0-9]|$)`, 'i').test(text);
    };
    const matches = communities.filter((community) => {
      const taggedText = (community.tags || []).join(' ').toLowerCase();
      const identityText = `${community.name} ${community.displayName} ${community.slug}`.toLowerCase();
      return topic.keywords.some((keyword) => matchesTerm(taggedText, keyword))
        || topic.keywords.some((keyword) => matchesTerm(identityText, keyword));
    });
    const memberIds = new Set(matches.flatMap((community) => community.memberIds || []));
    return {
      ...topic,
      memberCount: memberIds.size,
    };
  });

  const communityPeople = (community: Community): User[] => {
    const people = posts
      .filter((post) => post.communitySlug === community.slug)
      .flatMap((post) => [post.author, ...post.comments.map((comment) => comment.author)]);
    return Array.from(new Map<string, User>(people.map((person) => [person.id, person])).values()).slice(0, 3);
  };

  return (
    <>
      <div className="community-mobile-view md:hidden w-full px-4 pt-5 pb-28">
        <div className="space-y-6">
          <section className="community-mobile-intro space-y-3">
            <div>
              <h1 className="text-[28px] font-black leading-none tracking-[-0.04em] text-slate-950">Communities</h1>
              <p className="mt-2 text-[12px] font-medium leading-relaxed text-slate-500">
                Join communities around your <span className="font-bold text-indigo-600">interests</span>, <span className="font-bold text-indigo-600">college</span> and <span className="font-bold text-indigo-600">goals</span>.
              </p>
            </div>
            <button
              onClick={() => onOpenCreate()}
              id="create-community-mobile-button"
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2.5 text-[12px] font-black text-white shadow-[0_8px_18px_rgba(79,70,229,0.22)] transition-transform active:scale-[0.98] cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              Create Community
            </button>
          </section>

          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-0.5">
            {(
              [
                { id: 'all', label: 'All', icon: <LayoutGrid className="h-3.5 w-3.5" /> },
                { id: 'my', label: 'My Communities', icon: <Users className="h-3.5 w-3.5" /> },
                { id: 'college', label: 'College', icon: <Building className="h-3.5 w-3.5" /> },
                { id: 'interest', label: 'Interests', icon: <Heart className="h-3.5 w-3.5" /> },
                { id: 'career', label: 'Goals', icon: <Target className="h-3.5 w-3.5" /> },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveCategory(tab.id);
                  setActiveInterestTopic(null);
                }}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[10px] font-black whitespace-nowrap transition-colors cursor-pointer ${
                  activeCategory === tab.id
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[12px] font-black tracking-tight text-slate-900">Discover by interests</h2>
              <button
                type="button"
                onClick={() => {
                  setActiveCategory('interest');
                  setActiveInterestTopic(null);
                }}
                className="text-[11px] font-black text-indigo-600 cursor-pointer"
              >
                View all
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
              {interestTopics.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => {
                    setActiveCategory('interest');
                    setActiveInterestTopic(topic.id);
                  }}
                  className="flex min-w-[73px] shrink-0 flex-col items-center gap-1 rounded-xl border border-slate-200/90 bg-white px-2 py-2.5 text-center shadow-[0_2px_8px_rgba(15,23,42,0.04)] cursor-pointer"
                >
                  <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${topic.color}`}>{topic.icon}</span>
                  <span className="text-[9px] font-black leading-tight text-slate-800">{topic.label}</span>
                  <span className="text-[9px] font-medium text-slate-400">{formatCompactCount(topic.memberCount)}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setActiveCategory('interest');
                  setActiveInterestTopic(null);
                }}
                className="flex h-[83px] w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-[0_2px_8px_rgba(15,23,42,0.04)] cursor-pointer"
                aria-label="View all interest communities"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[12px] font-black tracking-tight text-slate-900">
                {activeCategory === 'all' ? 'Most popular communities' : `${categoryLabel} communities`}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setActiveCategory('all');
                  setActiveInterestTopic(null);
                }}
                className="text-[11px] font-black text-indigo-600 cursor-pointer"
              >
                See all
              </button>
            </div>

            <div className="space-y-2.5">
              {popularCommunities.slice(0, 4).map((comm) => {
                const people = communityPeople(comm);
                const postCount = posts.filter((post) => post.communitySlug === comm.slug).length;
                return (
                  <article
                    key={comm.id}
                    onClick={() => onSelectCommunity(comm.slug)}
                    className="relative rounded-2xl border border-slate-200/90 bg-white p-3 shadow-[0_2px_10px_rgba(15,23,42,0.04)] cursor-pointer transition-all active:scale-[0.995]"
                  >
                    <div className="flex gap-3">
                      <img
                        src={comm.category === 'college' ? getCollegeImage(comm.name) : getCommunityImage(comm.name, comm.category, comm.id)}
                        alt={`${comm.displayName || comm.name} community`}
                        className="h-16 w-16 shrink-0 rounded-2xl object-cover"
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = getCommunityImage(comm.name, comm.category, comm.id);
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-1.5 pr-5">
                          <h3 className="line-clamp-1 text-[13px] font-black leading-tight text-slate-900">
                            {comm.displayName || comm.name}
                          </h3>
                          <span className="mt-0.5 shrink-0 text-emerald-500" title="Verified community">
                            <Check className="h-3.5 w-3.5 rounded-full bg-emerald-50 p-0.5 stroke-[3]" />
                          </span>
                        </div>
                        <p className="mt-1 text-[10px] font-medium text-slate-400">{comm.slug}</p>
                        <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-slate-500">
                          {comm.description || 'A place for students to connect, learn and grow together.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggleSaveCommunity(comm.id);
                        }}
                        className={`absolute right-3 top-4 rounded-lg p-1 transition-colors ${comm.isSaved ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-600'}`}
                        aria-label={comm.isSaved ? 'Remove community bookmark' : 'Save community'}
                      >
                        <Bookmark className={`h-4 w-4 ${comm.isSaved ? 'fill-indigo-600' : ''}`} />
                      </button>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <div className="flex shrink-0 -space-x-1.5">
                          {(people.length ? people : [currentUser]).slice(0, 3).map((person) => (
                            <SafeAvatar key={person.id} src={person.avatar} name={person.name} className="h-5 w-5 rounded-full object-cover ring-2 ring-white" />
                          ))}
                        </div>
                        <span className="truncate text-[9px] font-medium text-slate-400">
                          {formatMemberCount(comm.membersCount)} · {postCount} posts
                        </span>
                      </div>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggleJoinCommunity(comm.slug);
                          if (!comm.isJoined) confetti({ particleCount: 30, spread: 50 });
                        }}
                        className={`shrink-0 rounded-xl px-4 py-2 text-[10px] font-black transition-colors cursor-pointer ${
                          comm.isJoined
                            ? 'border border-indigo-100 bg-indigo-50 text-indigo-700'
                            : 'bg-indigo-600 text-white shadow-sm'
                        }`}
                      >
                        {comm.isJoined ? 'Joined' : 'Join'}
                      </button>
                    </div>
                  </article>
                );
              })}
              {popularCommunities.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  <p className="text-xs font-bold text-slate-600">
                    {activeCategory === 'my' ? 'You have not joined any communities yet.' : `No ${categoryLabel.toLowerCase()} communities found yet.`}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory('all');
                      setActiveInterestTopic(null);
                    }}
                    className="mt-2 text-xs font-bold text-indigo-600 cursor-pointer"
                  >
                    Browse all communities
                  </button>
                </div>
              )}
            </div>
          </section>

          {filteredCommunities.length > 4 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[12px] font-black tracking-tight text-slate-900">More communities</h2>
                <span className="text-[10px] font-bold text-slate-400">{filteredCommunities.length} total</span>
              </div>
              <div className="space-y-2">
                {filteredCommunities.slice(4, 10).map((comm) => (
                  <button
                    key={comm.id}
                    onClick={() => onSelectCommunity(comm.slug)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 text-left cursor-pointer"
                  >
                    <img
                      src={comm.category === 'college' ? getCollegeImage(comm.name) : getCommunityImage(comm.name, comm.category, comm.id)}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-xl object-cover"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = getCommunityImage(comm.name, comm.category, comm.id);
                      }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-black text-slate-900">{comm.displayName || comm.name}</span>
                      <span className="mt-0.5 block truncate text-[10px] text-slate-400">{comm.membersCount.toLocaleString()} members · {comm.slug}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

    <div className="community-view network-communities-view hidden md:block max-w-7xl mx-auto px-4 sm:px-8 py-6 pb-28 space-y-7">
      {/* 1. Header & Create Community Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Communities</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Join communities around your interests, college and goals.
          </p>
        </div>
        <button
          onClick={() => onOpenCreate()}
          id="create-community-top-button"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-bold rounded-full shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Community</span>
        </button>
      </div>

      {/* 2. Category Filter Pills */}
      <div className="community-filter-rail flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        {(
          [
            { id: 'all', label: 'All', icon: LayoutGrid },
            { id: 'my', label: 'My Communities', icon: Users },
            { id: 'college', label: 'College', icon: Building },
            { id: 'interest', label: 'Interests', icon: Heart },
            { id: 'career', label: 'Goals', icon: Target },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveCategory(tab.id);
              setActiveInterestTopic(null);
            }}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
              activeCategory === tab.id
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Mobile discovery rail matching the compact reference layout. */}
      <section className="community-interest-discovery space-y-2.5">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-[12px] font-black tracking-tight text-slate-900">Discover by interests</h2>
          <button
            type="button"
            onClick={() => {
              setActiveCategory('interest');
              setActiveInterestTopic(null);
            }}
            className="text-[11px] font-black text-indigo-600 hover:text-indigo-800 cursor-pointer"
          >
            View all
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto px-0.5 pb-1 no-scrollbar">
          {interestTopics.map((topic) => (
            <button
              key={topic.id}
              type="button"
              onClick={() => {
                setActiveCategory('interest');
                setActiveInterestTopic(topic.id);
              }}
              className="community-interest-chip flex min-w-[76px] shrink-0 flex-col items-center gap-1 rounded-xl border border-slate-200/80 bg-white px-2.5 py-2 text-center shadow-[0_2px_8px_rgba(15,23,42,0.03)] cursor-pointer"
            >
              <span className={`flex h-6 w-6 items-center justify-center rounded-lg ${topic.color}`}>{topic.icon}</span>
              <span className="text-[9px] font-black leading-tight text-slate-800">{topic.label}</span>
              <span className="text-[9px] font-medium text-slate-400">{formatCompactCount(topic.memberCount)}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setActiveCategory('interest');
              setActiveInterestTopic(null);
            }}
            aria-label="View all interest communities"
            className="flex h-[76px] w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-[0_2px_8px_rgba(15,23,42,0.03)] cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* 3. Most Popular Communities (Cards Slider/Grid) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            {activeCategory === 'all' ? 'Most popular communities' : `${categoryLabel} communities`}
          </h2>
          <button
            type="button"
            onClick={() => {
              setActiveCategory('all');
              setActiveInterestTopic(null);
            }}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
          >
            See all
          </button>
        </div>

        <div className="community-popular-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {popularCommunities.map((comm) => (
            <div
              key={comm.id}
              onClick={() => onSelectCommunity(comm.slug)}
              className="community-popular-card bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-col justify-between min-h-[190px] hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5 transition-all group"
            >
              <div
                className="community-popular-main space-y-3 cursor-pointer"
              >
                <div
                  className={`community-popular-image w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm ${comm.iconBg}`}
                >
                  <img
                    src={comm.category === 'college' ? getCollegeImage(comm.name) : getCommunityImage(comm.name, comm.category, comm.id)}
                    alt={`${comm.displayName || comm.name} community`}
                    className="w-full h-full rounded-2xl object-cover"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = getCommunityImage(comm.name, comm.category, comm.id);
                    }}
                  />
                </div>
                <div className="community-popular-info">
                  <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                    {comm.displayName || comm.name}
                  </h3>
                  <p className="text-[10px] text-slate-400 truncate mt-1 leading-tight">
                    {comm.slug}
                  </p>
                  <p className="community-popular-description mt-1 text-[10px] leading-snug text-slate-500 line-clamp-2">
                    {comm.description}
                  </p>
                  <div className="community-popular-meta mt-2 flex items-center gap-1.5">
                    <div className="flex -space-x-1.5">
                      {communityPeople(comm).map((person) => (
                        <SafeAvatar key={person.id} src={person.avatar} name={person.name} className="h-5 w-5 rounded-full object-cover ring-2 ring-white" />
                      ))}
                      {communityPeople(comm).length === 0 && (
                        <span className="h-5 w-5 rounded-full bg-slate-200 ring-2 ring-white" />
                      )}
                    </div>
                    <span className="text-[9px] font-medium text-slate-400">
                      {formatMemberCount(comm.membersCount)} · {posts.filter((post) => post.communitySlug === comm.slug).length} posts
                    </span>
                  </div>
                </div>
                <p className="community-popular-count text-[11px] font-semibold text-slate-500">
                  {formatMemberCount(comm.membersCount)}
                </p>
              </div>

              {/* Joined / Join Button */}
              <div className="community-popular-actions">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleSaveCommunity(comm.id);
                  }}
                  className={`community-popular-bookmark rounded-lg p-1 transition-colors ${comm.isSaved ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-600'}`}
                  aria-label={comm.isSaved ? 'Remove community bookmark' : 'Save community'}
                >
                  <Bookmark className={`h-4 w-4 ${comm.isSaved ? 'fill-indigo-600' : ''}`} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleJoinCommunity(comm.slug);
                    if (!comm.isJoined) {
                      confetti({ particleCount: 30, spread: 50 });
                    }
                  }}
                   className={`community-popular-join w-full py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    comm.isJoined
                      ? 'bg-slate-100 text-indigo-700 hover:bg-slate-200 border border-slate-200'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                  }`}
                >
                  {comm.isJoined ? 'Joined' : 'Join'}
                </button>
              </div>
            </div>
          ))}
          {popularCommunities.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <p className="text-xs font-bold text-slate-600">
                {activeCategory === 'my' ? 'You have not joined any communities yet.' : `No ${categoryLabel.toLowerCase()} communities found yet.`}
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveCategory('all');
                  setActiveInterestTopic(null);
                }}
                className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
              >
                Browse all communities
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 4. All Communities List */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            {activeCategory === 'all' ? 'All communities' : `${categoryLabel} communities`}
          </h2>
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            >
              <option value="popular">Sort by: Popular</option>
              <option value="members">Sort by: Members</option>
              <option value="recent">Sort by: Active</option>
            </select>
            <div className="flex items-center border border-slate-200 rounded-lg bg-white p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1 rounded ${viewMode === 'list' ? 'bg-slate-100 text-indigo-600' : 'text-slate-400'}`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1 rounded ${viewMode === 'grid' ? 'bg-slate-100 text-indigo-600' : 'text-slate-400'}`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className={viewMode === 'list' ? 'space-y-2' : 'grid grid-cols-1 sm:grid-cols-2 gap-3'}>
          {filteredCommunities.map((comm) => (
            <div
              key={comm.id}
              onClick={() => onSelectCommunity(comm.slug)}
              className="bg-white rounded-2xl border border-slate-200/80 p-3.5 flex items-center justify-between gap-3 hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${comm.iconBg}`}
                >
                  <img
                    src={comm.category === 'college' ? getCollegeImage(comm.name) : getCommunityImage(comm.name, comm.category, comm.id)}
                    alt={`${comm.displayName || comm.name} community`}
                    className="w-full h-full rounded-xl object-cover"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = getCommunityImage(comm.name, comm.category, comm.id);
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {comm.displayName || comm.name}
                    </span>
                    {comm.membersCount > 7000 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                        Popular
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">
                    {comm.slug} · {comm.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right hidden sm:block">
                     <p className="text-xs font-semibold text-slate-700">
                       {formatMemberCount(comm.membersCount)}
                  </p>
                  <p className="text-[10px] text-slate-400 flex items-center justify-end gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    {comm.onlineCount} online
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleJoinCommunity(comm.slug);
                  }}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    comm.isJoined
                      ? 'bg-slate-100 text-indigo-700 hover:bg-slate-200 border border-slate-200'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                  }`}
                >
                  {comm.isJoined ? 'Joined' : 'Join'}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {filteredCommunities.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <p className="text-xs font-bold text-slate-600">Nothing here yet.</p>
              <p className="text-[11px] text-slate-500 mt-1">Try another category or browse all communities.</p>
            </div>
          )}
        </div>
      </section>

      {/* 5. Trending in Your Communities (Reddit Style Post Feed) */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            Trending in your communities
          </h2>
          <button
            onClick={() => setTrendingCommunityFilter('for_you')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
          >
            See all
          </button>
        </div>

        {/* Sub-Filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: 'for_you', label: 'For you' },
            { id: '/dsa', label: '/dsa' },
            { id: '/ai-ml', label: '/ai-ml' },
            { id: '/nit-trichy', label: '/nit-trichy' },
            { id: '/gate', label: '/gate' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setTrendingCommunityFilter(pill.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                trendingCommunityFilter === pill.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Reddit-Style Posts */}
        <div className="space-y-3">
          {trendingPosts.map((post) => (
            <div
              key={post.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex gap-3.5 transition-all hover:border-slate-300"
            >
              {/* Upvote Column */}
              <div className="flex flex-col items-center justify-start bg-slate-50 rounded-xl p-1.5 border border-slate-200/60 shrink-0 h-fit">
                <button
                  onClick={() => onToggleUpvote(post.id, 1)}
                  className={`p-1 rounded hover:bg-slate-200/80 transition-colors cursor-pointer ${
                    post.userVote === 1 ? 'text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title="Upvote"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <span
                  className={`text-xs font-bold my-0.5 ${
                    post.userVote === 1
                      ? 'text-indigo-600'
                      : post.userVote === -1
                      ? 'text-rose-600'
                      : 'text-slate-700'
                  }`}
                >
                  {post.upvotes}
                </span>
                <button
                  onClick={() => onToggleUpvote(post.id, -1)}
                  className={`p-1 rounded hover:bg-slate-200/80 transition-colors cursor-pointer ${
                    post.userVote === -1 ? 'text-rose-600 font-bold' : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title="Downvote"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>

              {/* Content Column */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <button
                      onClick={() => onSelectCommunity(post.communitySlug)}
                      className="font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      {post.communitySlug}
                    </button>
                    <span>·</span>
                    <span>{post.timestamp}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Multi-avatar stack for commenters */}
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {post.isAnonymous ? (
                        <div className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] text-slate-500 ring-2 ring-white">?</div>
                      ) : (
                        <SafeAvatar
                          className="inline-block h-5 w-5 rounded-full ring-2 ring-white object-cover"
                          src={post.author.avatar}
                          name={post.author.name}
                        />
                      )}
                      {post.comments.slice(0, 2).map((c) => (
                        <SafeAvatar
                          key={c.id}
                          className="inline-block h-5 w-5 rounded-full ring-2 ring-white object-cover"
                          src={c.author.avatar}
                          name={c.author.name}
                        />
                      ))}
                    </div>
                    <button className="text-slate-400 hover:text-slate-600 p-0.5">
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div
                  onClick={() => onSelectCommunity(post.communitySlug)}
                  className="cursor-pointer group"
                >
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                    {post.content}
                  </p>
                </div>

                {/* Footer buttons */}
                <div className="flex items-center gap-4 pt-1 text-xs text-slate-500 font-medium">
                  <button
                    onClick={() => onSelectCommunity(post.communitySlug)}
                    className="flex items-center gap-1 hover:text-slate-800 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{post.commentsCount || post.comments.length} comments</span>
                  </button>
                  <button
                    onClick={() => onToggleSave(post.id)}
                    className={`flex items-center gap-1 hover:text-slate-800 cursor-pointer ${
                      post.saved ? 'text-indigo-600 font-bold' : ''
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${post.saved ? 'fill-indigo-600' : ''}`} />
                    <span>{post.saved ? 'Saved' : 'Save'}</span>
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(window.location.href);
                      confetti({ particleCount: 15, spread: 35 });
                    }}
                    className="flex items-center gap-1 hover:text-slate-800 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
    </>
  );
};

const previewUser: User = {
  id: 'preview-student',
  name: 'Ananya Gupta',
  avatar: '',
  college: 'NIT Tiruchirappalli',
  branch: 'Computer Science',
  verified: true,
  interests: ['DSA', 'AI/ML'],
  skills: ['Problem solving'],
  communities: [],
};

const previewCommunities: Community[] = [
  {
    id: 'preview-dsa',
    slug: '/dsa',
    name: 'DSA',
    displayName: 'DSA Learners',
    iconType: 'code',
    iconBg: 'bg-indigo-50 text-indigo-700',
    description: 'Discuss data structures, algorithms, and interview preparation.',
    membersCount: 2100,
    onlineCount: 46,
    category: 'interest',
    isJoined: false,
  },
  {
    id: 'preview-jee',
    slug: '/jee-aspirants',
    name: 'JEE Aspirants',
    displayName: 'JEE Aspirants',
    iconType: 'book',
    iconBg: 'bg-rose-50 text-rose-700',
    description: 'Study together, ask doubts, share resources and prepare.',
    membersCount: 1820,
    onlineCount: 38,
    category: 'interest',
    isJoined: false,
  },
  {
    id: 'preview-nit',
    slug: '/nit-tiruchirappalli',
    name: 'NIT Tiruchirappalli',
    displayName: 'NIT Tiruchirappalli',
    iconType: 'building',
    iconBg: 'bg-emerald-50 text-emerald-700',
    description: 'The official campus community for students of NIT Tiruchirappalli.',
    membersCount: 174,
    onlineCount: 12,
    category: 'college',
    isJoined: true,
  },
  {
    id: 'preview-ai',
    slug: '/ai-ml',
    name: 'AI/ML',
    displayName: 'AI/ML',
    iconType: 'brain',
    iconBg: 'bg-sky-50 text-sky-700',
    description: 'Learn AI/ML, share resources, and discuss projects.',
    membersCount: 1200,
    onlineCount: 28,
    category: 'interest',
    isJoined: false,
  },
];

export function Current() {
  return (
    <div className="network-app-shell min-h-screen">
      <CommunitiesView
        communities={previewCommunities}
        posts={[]}
        currentUser={previewUser}
        onSelectCommunity={() => undefined}
        onOpenCreate={() => undefined}
        onOpenProfile={() => undefined}
        onToggleJoinCommunity={() => undefined}
        onToggleUpvote={() => undefined}
        onToggleSave={() => undefined}
        onToggleSaveCommunity={() => undefined}
      />
    </div>
  );
}
