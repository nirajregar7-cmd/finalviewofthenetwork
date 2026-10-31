import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Book,
  Bookmark,
  Building,
  Check,
  ChevronRight,
  Code,
  Heart,
  LayoutGrid,
  MessageSquare,
  Plus,
  Search,
  Share2,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getCollegeImage } from '../../data/collegeImages';
import { Community, Post, User } from '../types';
import { SafeAvatar } from './SafeAvatar';

type DirectoryCategory = 'all' | 'learning' | 'schools' | 'college' | 'skills' | 'career' | 'my';

const CATEGORY_FILTERS: Array<{
  id: DirectoryCategory;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'learning', label: 'Learning', subtitle: 'Classes & Study', icon: Users },
  { id: 'schools', label: 'Schools', subtitle: 'Your School', icon: Book },
  { id: 'college', label: 'College', subtitle: 'Your College', icon: Building },
  { id: 'skills', label: 'Skills', subtitle: 'Tech & Domains', icon: Code },
  { id: 'career', label: 'Career', subtitle: 'Goals & Growth', icon: Target },
];

const BROWSE_CATEGORIES = [
  { id: 'learning' as const, title: 'Learning', subtitle: 'Classes & study', icon: Book, tone: 'community-category-lavender' },
  { id: 'schools' as const, title: 'Schools', subtitle: 'Find your school community', icon: Users, tone: 'community-category-mint' },
  { id: 'college' as const, title: 'College', subtitle: 'Your college and others', icon: Building, tone: 'community-category-blue' },
  { id: 'skills' as const, title: 'Skills', subtitle: 'Tech, domains and tools', icon: Code, tone: 'community-category-amber' },
];

function searchableCommunityText(community: Community) {
  return `${community.name} ${community.displayName} ${community.description} ${community.slug} ${(community.tags || []).join(' ')}`.toLowerCase();
}

function isSchoolCommunity(community: Community) {
  return /\b(class|school|neet|jee|aspirant|board exam)\b/i.test(searchableCommunityText(community));
}

function matchesCategory(community: Community, category: DirectoryCategory) {
  const text = searchableCommunityText(community);
  if (category === 'all') return true;
  if (category === 'my') return community.isJoined;
  if (category === 'college') return community.category === 'college';
  if (category === 'schools') return community.category !== 'college' && isSchoolCommunity(community);
  if (category === 'learning') return community.category === 'interest';
  if (category === 'skills') return community.category === 'interest' && /\b(dsa|ai|ml|code|web|tech|cyber|app|programming)\b/i.test(text);
  return community.category === 'career';
}

function communityTone(community: Community) {
  const text = searchableCommunityText(community);
  if (community.category === 'college') return 'community-mark-college';
  if (/\b(ai|ml|machine learning)\b/i.test(text)) return 'community-mark-blue';
  if (/\b(jee|neet|class|school|exam)\b/i.test(text)) return 'community-mark-coral';
  if (/\b(dsa|code|programming|web|developer)\b/i.test(text)) return 'community-mark-lavender';
  if (community.category === 'career') return 'community-mark-amber';
  return 'community-mark-mint';
}

function CommunityVisual({ community, size = 'regular' }: { community: Community; size?: 'regular' | 'small' }) {
  const dimensions = size === 'small'
    ? 'h-8 w-8 rounded-xl border'
    : 'h-10 w-10 rounded-xl';

  return (
    <span className={`community-mark ${dimensions} ${communityTone(community)}`} aria-hidden="true">
      <span className={size === 'small' ? 'text-[11px] font-bold' : 'text-sm font-black'}>
        {community.name.slice(0, 2).toUpperCase()}
      </span>
      {community.category === 'college' && (
        <img
          src={getCollegeImage(community.name)}
          alt=""
          className="community-mark-photo"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
      )}
    </span>
  );
}

function formatStudentCount(count: number) {
  if (count >= 1000) return (count / 1000).toFixed(count >= 10000 ? 0 : 1);
  return count.toLocaleString();
}

interface CommunitiesViewProps {
  communities: Community[];
  posts: Post[];
  currentUser: User;
  users: User[];
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
  users,
  onSelectCommunity,
  onOpenCreate,
  onOpenProfile,
  onToggleJoinCommunity,
  onToggleUpvote,
  onToggleSave,
  onToggleSaveCommunity,
}) => {
  const [activeCategory, setActiveCategory] = useState<DirectoryCategory>('learning');
  const [hasChosenCategory, setHasChosenCategory] = useState(false);
  const [showAllCommunities, setShowAllCommunities] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const mostPopularSectionRef = useRef<HTMLElement | null>(null);
  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);

  const membersFor = (community: Community) =>
    (community.memberIds || [])
      .map((id) => usersById.get(id))
      .filter((user): user is User => Boolean(user));

  const chooseCategory = (category: DirectoryCategory) => {
    setActiveCategory(category);
    setHasChosenCategory(true);
    setShowAllCommunities(false);
  };

  const viewAllCommunities = (category: DirectoryCategory) => {
    setActiveCategory(category);
    setHasChosenCategory(true);
    setShowAllCommunities(true);
    window.requestAnimationFrame(() => {
      mostPopularSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const searchFilteredCommunities = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return communities.filter((community) => !query || searchableCommunityText(community).includes(query));
  }, [communities, searchQuery]);

  const filteredCommunities = useMemo(
    () => searchFilteredCommunities.filter((community) => matchesCategory(community, activeCategory)),
    [searchFilteredCommunities, activeCategory],
  );

  const popularLearning = searchFilteredCommunities
    .filter((community) => community.category === 'interest');

  const featuredCommunities = [...(hasChosenCategory ? filteredCommunities : popularLearning)]
    .sort((a, b) => b.membersCount - a.membersCount)
    .slice(0, 8);
  const featuredHeading = !hasChosenCategory || activeCategory === 'learning'
    ? 'Popular learning topics'
    : activeCategory === 'all'
      ? 'Popular communities'
      : `${CATEGORY_FILTERS.find((item) => item.id === activeCategory)?.label || 'My'} communities`;

  const recommendedSource = hasChosenCategory ? filteredCommunities : searchFilteredCommunities;
  const recommended = [...recommendedSource]
    .filter((community) => !community.isJoined)
    .sort((a, b) => {
      const interests = currentUser.interests.map((interest) => interest.toLowerCase());
      const score = (community: Community) =>
        interests.reduce((total, interest) => total + (searchableCommunityText(community).includes(interest) ? 1 : 0), 0);
      return score(b) - score(a) || b.membersCount - a.membersCount;
    })
    .slice(0, 8);

  const mostPopularSource = hasChosenCategory ? filteredCommunities : searchFilteredCommunities;
  const sortedMostPopular = [...mostPopularSource].sort((a, b) => b.membersCount - a.membersCount);
  const mostPopular = showAllCommunities ? sortedMostPopular : sortedMostPopular.slice(0, 8);
  const trendingPosts = posts.slice(0, 3);

  const countFor = (category: DirectoryCategory) =>
    searchFilteredCommunities.filter((community) => matchesCategory(community, category)).length;

  const openCommunityFromCard = (event: React.MouseEvent<HTMLElement>, community: Community) => {
    const target = event.target;
    if (target instanceof Element && target.closest('button, a, input, select, textarea, [role="button"]')) return;
    onSelectCommunity(community.slug);
  };

  const joinCommunity = (event: React.MouseEvent, community: Community) => {
    event.stopPropagation();
    if (community.isJoined) {
      onSelectCommunity(community.slug);
      return;
    }
    onToggleJoinCommunity(community.slug);
    confetti({ particleCount: 28, spread: 48 });
  };

  const renderFeaturedCommunity = (community: Community, section: string) => {
    const members = membersFor(community);
    return (
      <article
        key={`${section}-${community.id}`}
        className="group flex min-h-[156px] min-w-0 cursor-pointer flex-col justify-between gap-2.5 rounded-2xl border border-slate-200/80 bg-white p-3.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
        data-testid={`card-community-${section}-${community.id}`}
        onClick={(event) => openCommunityFromCard(event, community)}
      >
        <button
          type="button"
          className="flex w-full min-w-0 items-start gap-2.5 text-left"
          onClick={() => onSelectCommunity(community.slug)}
          aria-label={`Open ${community.displayName || community.name}`}
        >
          <CommunityVisual community={community} size="small" />
          <span className="min-w-0">
            <span className="block line-clamp-2 text-xs font-bold leading-tight text-slate-900 transition-colors group-hover:text-indigo-600">
              {community.displayName || community.name}
            </span>
            <span className="mt-0.5 block text-[10px] text-slate-400">
              {community.membersCount ? `${formatStudentCount(community.membersCount)} students` : 'New community'}
            </span>
          </span>
        </button>
        <div className="flex min-w-0 items-center gap-1.5 pt-1">
          <div className="flex shrink-0 -space-x-1 overflow-hidden" aria-label={`${members.length} community members`}>
            {members.slice(0, 3).map((person) => (
              <button
                type="button"
                key={person.id}
                onClick={() => onOpenProfile(person)}
                aria-label={`Open ${person.name}'s profile`}
                data-testid={`button-community-member-${community.id}-${person.id}`}
              >
                <SafeAvatar src={person.avatar} name={person.name} className="h-4 w-4 rounded-full object-cover ring-1 ring-white" />
              </button>
            ))}
          </div>
          <span className="min-w-0 truncate text-[8px] text-slate-400">
            {members.length ? members.slice(0, 2).map((member) => member.name.split(' ')[0]).join(', ') : 'Be the first to join'}
          </span>
        </div>
      </article>
    );
  };

  const renderCommunityCard = (community: Community, section: string) => {
    const members = membersFor(community);
    return (
      <article
        key={`${section}-${community.id}`}
        className="cursor-pointer rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md"
        data-testid={`card-community-${section}-${community.id}`}
        onClick={(event) => openCommunityFromCard(event, community)}
      >
        <button
          type="button"
          className="w-full text-left"
          onClick={() => onSelectCommunity(community.slug)}
          aria-label={`Open ${community.displayName || community.name}`}
        >
          <div className="flex items-start gap-3">
            <CommunityVisual community={community} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-sm font-black text-slate-900">{community.displayName || community.name}</span>
                {community.membersCount >= 7000 && <Check className="h-4 w-4 shrink-0 text-emerald-500" aria-label="Popular" />}
              </span>
              <span className="mt-0.5 block text-[10px] font-semibold text-indigo-600">
                {formatStudentCount(community.membersCount)} students joined
              </span>
              <span className="mt-1.5 flex items-center gap-1.5">
                <span className="flex -space-x-1">
                  {members.slice(0, 4).map((member) => (
                    <span key={member.id} className="rounded-full ring-2 ring-white">
                      <SafeAvatar src={member.avatar} name={member.name} className="h-5 w-5 rounded-full object-cover" />
                    </span>
                  ))}
                </span>
                <span className="truncate text-[9px] text-slate-400">
                  {members.length ? `${members.slice(0, 2).map((member) => member.name.split(' ')[0]).join(', ')} joined` : 'No members yet'}
                </span>
              </span>
            </span>
          </div>
          <span className="mt-3 block line-clamp-2 text-[11px] leading-relaxed text-slate-500">
            {community.description}
          </span>
        </button>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-[10px] text-slate-400">
            {community.category === 'college' ? 'Campus community' : community.category === 'career' ? 'Career prep' : 'Study community'}
          </span>
          <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleSaveCommunity(community.id)}
            className={`rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600 ${community.isSaved ? 'text-indigo-600' : ''}`}
            aria-label={community.isSaved ? 'Remove saved community' : 'Save community'}
            data-testid={`button-save-community-${community.id}`}
          >
            <Bookmark className={`h-4 w-4 ${community.isSaved ? 'fill-current' : ''}`} />
          </button>
          <button
            type="button"
            className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-colors ${
              community.isJoined
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
            onClick={(event) => joinCommunity(event, community)}
            data-testid={`button-join-${section}-${community.id}`}
          >
            {community.isJoined ? 'Joined · Open' : 'Join community'}
          </button>
          </div>
        </div>
      </article>
    );
  };

  return (
    <main className="community-view community-discovery-page max-w-7xl mx-auto px-4 sm:px-7 py-5 sm:py-7 pb-28">
      <header className="community-page-heading">
        <div>
          <p className="community-eyebrow"><Sparkles className="h-3.5 w-3.5" /> Find your people</p>
          <h1>Communities</h1>
          <p className="community-page-subtitle">Find and join communities to learn, discuss and grow together.</p>
        </div>
        <button
          type="button"
          onClick={onOpenCreate}
          id="create-community-top-button"
          className="community-create-button"
          data-testid="button-create-community"
        >
          <Plus className="h-4 w-4" />
          <span>Create Community</span>
        </button>
      </header>

      <label className="community-search">
        <Search className="h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search communities..."
          aria-label="Search communities"
          data-testid="input-search-communities"
        />
      </label>

      <nav className="community-filter-rail" aria-label="Community categories">
        {CATEGORY_FILTERS.map(({ id, label, subtitle, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => chooseCategory(id)}
            className={`community-category-pill ${activeCategory === id ? 'is-active' : ''}`}
            aria-pressed={activeCategory === id}
            data-testid={`filter-community-${id}`}
          >
            <Icon className="h-4 w-4" />
            <span><strong>{label}</strong><small>{subtitle}</small></span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => chooseCategory('all')}
          className={`community-category-pill community-category-all ${activeCategory === 'all' ? 'is-active' : ''}`}
          aria-pressed={activeCategory === 'all'}
          data-testid="filter-community-all"
        >
          <LayoutGrid className="h-4 w-4" />
          <span><strong>All</strong><small>{countFor('all')} communities</small></span>
        </button>
      </nav>

      <div className="community-discovery-content">
        <section className="community-section" aria-labelledby="popular-learning-heading">
          <div className="community-section-heading">
            <div>
              <h2 id="popular-learning-heading">{featuredHeading}</h2>
              <p>Find groups to learn and prepare together.</p>
            </div>
            <button type="button" className="community-view-all" onClick={() => viewAllCommunities(activeCategory)}>
              View all <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {featuredCommunities.map((community) => renderFeaturedCommunity(community, 'learning'))}
            {featuredCommunities.length === 0 && (
              <p className="community-empty-state">No communities match this category or search.</p>
            )}
          </div>
        </section>

        <section className="community-section" aria-labelledby="browse-category-heading">
          <div className="community-section-heading">
            <div>
              <h2 id="browse-category-heading">Browse by category</h2>
              <p>Explore communities based on what you are interested in.</p>
            </div>
          </div>
          <div className="community-category-grid">
            {BROWSE_CATEGORIES.map(({ id, title, subtitle, icon: Icon, tone }) => (
              <button
                type="button"
                key={id}
                onClick={() => chooseCategory(id)}
                className={`community-category-card ${tone}`}
                data-testid={`browse-category-${id}`}
              >
                <span className="community-category-card-icon"><Icon className="h-6 w-6" /></span>
                <span className="community-category-card-copy">
                  <strong>{title}</strong>
                  <small>{subtitle}</small>
                  <span>{countFor(id)}+ communities</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0" />
              </button>
            ))}
          </div>
        </section>

        <section className="community-section" aria-labelledby="recommended-heading">
          <div className="community-section-heading">
            <div>
              <h2 id="recommended-heading">Recommended for you</h2>
              <p>Communities picked from your interests and profile.</p>
            </div>
            <button type="button" className="community-view-all" onClick={() => viewAllCommunities('all')}>
              See all <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.map((community) => renderCommunityCard(community, 'recommended'))}
            {recommended.length === 0 && <p className="community-empty-state">No recommendations match this search.</p>}
          </div>
        </section>

        <section ref={mostPopularSectionRef} className="community-section scroll-mt-4" aria-labelledby="most-popular-heading">
          <div className="community-section-heading">
            <div>
              <h2 id="most-popular-heading">{!hasChosenCategory || activeCategory === 'all' ? 'Most popular communities' : `${CATEGORY_FILTERS.find((item) => item.id === activeCategory)?.label || 'My'} communities`}</h2>
              <p>Meet students who share your interests and goals.</p>
            </div>
            <button
              type="button"
              className="community-view-all"
              onClick={() => viewAllCommunities(hasChosenCategory ? activeCategory : 'all')}
            >
              See all <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mostPopular.map((community) => renderCommunityCard(community, 'popular'))}
            {mostPopular.length === 0 && (
              <div className="community-empty-state community-empty-card">
                <Heart className="h-5 w-5" />
                <strong>{activeCategory === 'my' ? 'You have not joined any communities yet.' : 'No communities found.'}</strong>
                <span>Try another category or clear your search.</span>
                <button type="button" onClick={() => { chooseCategory('all'); setSearchQuery(''); }}>Browse all communities</button>
              </div>
            )}
          </div>
        </section>

        {trendingPosts.length > 0 && (
          <section className="community-section community-trending-section" aria-labelledby="trending-heading">
            <div className="community-section-heading">
              <div>
                <h2 id="trending-heading">Trending in your communities</h2>
                <p>Recent questions and conversations from your network.</p>
              </div>
            </div>
            <div className="community-trending-list">
              {trendingPosts.map((post) => (
                <article key={post.id} className="community-trending-card" data-testid={`card-trending-post-${post.id}`}>
                  <div className="community-vote-control">
                    <button
                      type="button"
                      onClick={() => onToggleUpvote(post.id, 1)}
                      aria-label="Upvote post"
                      data-testid={`button-upvote-${post.id}`}
                      className={post.userVote === 1 ? 'is-upvoted' : ''}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <strong>{post.upvotes}</strong>
                    <button
                      type="button"
                      onClick={() => onToggleUpvote(post.id, -1)}
                      aria-label="Downvote post"
                      data-testid={`button-downvote-${post.id}`}
                      className={post.userVote === -1 ? 'is-downvoted' : ''}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="community-trending-content">
                    <div className="community-trending-meta">
                      <button type="button" onClick={() => onSelectCommunity(post.communitySlug)}>{post.communityName || post.communitySlug}</button>
                      <span>·</span><span>{post.timestamp}</span>
                    </div>
                    <button type="button" className="community-trending-title" onClick={() => onSelectCommunity(post.communitySlug)}>
                      {post.title}
                    </button>
                    <p>{post.content}</p>
                    <div className="community-trending-actions">
                      <button type="button" onClick={() => onSelectCommunity(post.communitySlug)}>
                        <MessageSquare className="h-4 w-4" /> {post.commentsCount || post.comments.length} comments
                      </button>
                      <button type="button" onClick={() => onToggleSave(post.id)}>
                        <Bookmark className={`h-4 w-4 ${post.saved ? 'fill-current' : ''}`} /> {post.saved ? 'Saved' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(window.location.href);
                          confetti({ particleCount: 15, spread: 35 });
                        }}
                      >
                        <Share2 className="h-4 w-4" /> Share
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
};
