import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Bookmark, BookOpen, Building2, Check, GraduationCap, Heart, MapPin, Search, Share2, Sparkles, Users, Wrench, X } from 'lucide-react';
import type { Community, Post, UserProfile } from '../types';
import Avatar from './Avatar';
import { getCollegeImage } from '../data/collegeImages';
import { getCommunityImage } from '../data/communityImages';

type DiscoveryCategory = 'Learning' | 'Schools' | 'College' | 'Skills' | 'Interests';
type DiscoveryView = 'overview' | 'category' | 'learning' | 'recommended' | 'popular';

interface CommunityDiscoveryProps {
  currentUser: UserProfile;
  communities: Community[];
  posts: Post[];
  allUsers: UserProfile[];
  onJoinLeave: (communityId: string) => void;
  onOpen: (communityId: string) => void;
  onShare: (community: Community) => void;
  onCreate: () => void;
}

const categories: { id: DiscoveryCategory; subtitle: string; description: string }[] = [
  { id: 'Learning', subtitle: 'Classes & study', description: 'Classes, exam prep and study circles.' },
  { id: 'Schools', subtitle: 'Find your school', description: 'Connect with students from your school.' },
  { id: 'College', subtitle: 'Your campus & beyond', description: 'Campus communities and college circles.' },
  { id: 'Skills', subtitle: 'Tech, domains & tools', description: 'Build practical skills with peers.' },
  { id: 'Interests', subtitle: 'Passions & people', description: 'Find others who care about the same things.' },
];

const categoryIcon = {
  Learning: BookOpen,
  Schools: Building2,
  College: GraduationCap,
  Skills: Wrench,
  Interests: Heart,
};

function categoryFor(community: Community): DiscoveryCategory {
  const text = `${community.name} ${community.description} ${community.category} ${community.tags.join(' ')}`.toLowerCase();
  if (/school|class\s?(1[0-2]|[6-9])|secondary|board exam/.test(text)) return 'Schools';
  if (community.category === 'College Community' || community.college || /campus|college|university/.test(text)) return 'College';
  if (/skill|coding|technology|engineering|design|programming|web dev|ai\/?ml|dsa|cybersecurity|software/.test(text)) return 'Skills';
  if (/interest|hobby|creative|social|club|startup|entrepreneur|music|gaming|sport/.test(text)) return 'Interests';
  if (/learning|course|study|exam|academic|research|jee|neet|upsc|gate|cat|clat/.test(text)) return 'Learning';
  return 'Learning';
}

function CommunityMark({ community, size = 'large' }: { community: Community; size?: 'small' | 'large' }) {
  const image = community.category === 'College Community' || community.college
    ? getCollegeImage(community.college || community.name)
    : getCommunityImage(community.name, community.category, community.id);
  return (
    <div className={`shrink-0 overflow-hidden rounded-2xl bg-violet-50 ${size === 'large' ? 'h-16 w-16' : 'h-12 w-12'}`}>
      <img className="h-full w-full object-cover" src={image} alt="" loading="lazy" />
    </div>
  );
}

export default function CommunityDiscovery({
  currentUser, communities, posts, allUsers, onJoinLeave, onOpen, onShare, onCreate,
}: CommunityDiscoveryProps) {
  const [activeCategory, setActiveCategory] = useState<DiscoveryCategory>('Learning');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<DiscoveryView>('overview');
  const [bookmarks, setBookmarks] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(`network-community-bookmarks:${currentUser.id}`);
      setBookmarks(stored ? JSON.parse(stored) as string[] : []);
    } catch {
      setBookmarks([]);
    }
  }, [currentUser.id]);

  const toggleBookmark = (communityId: string) => {
    setBookmarks(previous => {
      const next = previous.includes(communityId)
        ? previous.filter(id => id !== communityId)
        : [...previous, communityId];
      try {
        window.localStorage.setItem(`network-community-bookmarks:${currentUser.id}`, JSON.stringify(next));
      } catch {
        // Bookmarks remain usable for this session if browser storage is unavailable.
      }
      return next;
    });
  };

  const normalizedQuery = query.trim().toLowerCase();
  const filteredBySearch = useMemo(() => communities.filter(community => {
    if (!normalizedQuery) return true;
    const searchable = [
      community.name, community.description, community.category, community.college || '',
      ...community.tags,
    ].join(' ').toLowerCase();
    return searchable.includes(normalizedQuery);
  }), [communities, normalizedQuery]);

  const categoryCounts = useMemo(() => categories.reduce((counts, category) => {
    counts[category.id] = communities.filter(community => categoryFor(community) === category.id).length;
    return counts;
  }, {} as Record<DiscoveryCategory, number>), [communities]);

  const selectedResults = filteredBySearch.filter(community => categoryFor(community) === activeCategory);
  const joinedIds = new Set(communities.filter(community => community.memberIds.includes(currentUser.id)).map(community => community.id));
  const postCount = (communityId: string) => posts.filter(post => post.communityId === communityId).length;
  const ranked = (list: Community[]) => [...list].sort((a, b) =>
    b.memberIds.length - a.memberIds.length || a.name.localeCompare(b.name)
  );
  const rankedLearning = ranked(filteredBySearch.filter(community => categoryFor(community) === 'Learning'));
  const popularLearning = rankedLearning.slice(0, 10);
  const popularAll = ranked(filteredBySearch);

  const profileSignals = [
    ...currentUser.interests, ...currentUser.skills, ...currentUser.lookingFor,
    currentUser.college, currentUser.schoolName || '',
  ].map(value => value.trim().toLowerCase()).filter(Boolean);
  const recommendations = filteredBySearch
    .filter(community => !joinedIds.has(community.id))
    .map(community => {
      const text = ` ${community.name} ${community.description} ${community.category} ${community.college || ''} ${community.tags.join(' ')} `.toLowerCase();
      const overlap = profileSignals.filter(signal => {
        const normalizedSignal = signal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`(^|[^a-z0-9])${normalizedSignal}([^a-z0-9]|$)`, 'i').test(text);
      }).length;
      return { community, overlap };
    })
    .filter(item => item.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || b.community.memberIds.length - a.community.memberIds.length)
    .map(item => item.community);

  const showDirectory = view !== 'overview' || Boolean(normalizedQuery);
  const directoryCommunities = normalizedQuery
    ? filteredBySearch
    : view === 'learning'
      ? rankedLearning
      : view === 'recommended'
        ? recommendations
        : view === 'popular'
          ? popularAll
          : selectedResults;
  const formatCount = (count: number) => new Intl.NumberFormat('en-IN').format(count);
  const sectionTitle = (title: string, actionLabel: string, onAction: () => void) => (
    <div className="flex items-end justify-between gap-3">
      <h2 className="font-serif text-[1.55rem] leading-tight tracking-[-0.035em] text-[#211d2a] sm:text-[1.8rem]">{title}</h2>
      <button type="button" onClick={onAction} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-violet-700 hover:text-violet-900" data-testid={`action-${actionLabel.toLowerCase().replaceAll(' ', '-')}`}>
        {actionLabel}<ArrowRight size={15} />
      </button>
    </div>
  );

  const compactCard = (community: Community) => {
    const joined = joinedIds.has(community.id);
    const members = community.memberIds.map(id => allUsers.find(user => user.id === id)).filter(Boolean).slice(0, 3) as UserProfile[];
    return (
      <article key={community.id} className="w-[268px] shrink-0 rounded-[20px] border border-[#ece8f0] bg-white p-4 shadow-[0_5px_20px_rgba(39,25,59,0.045)] transition-transform hover:-translate-y-0.5 sm:w-[290px]" data-testid={`card-community-${community.id}`}>
        <button type="button" className="flex w-full items-center gap-3 text-left" onClick={() => onOpen(community.id)} data-testid={`open-community-${community.id}`}>
          <CommunityMark community={community} />
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-bold text-[#24202c]">{community.name}</span>
            <span className="mt-1 block text-xs text-[#777181]">{formatCount(community.memberIds.length)} members</span>
          </span>
        </button>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex -space-x-2" aria-label={`${members.length} member avatars`}>
            {members.map(member => (
              <span key={member.id} className="h-7 w-7 overflow-hidden rounded-full border-2 border-white bg-violet-100">
                <Avatar avatar={member.avatar} fallbackText={member.fullName} />
              </span>
            ))}
            {members.length === 0 && <span className="text-xs text-[#8b8493]">A space to start together</span>}
          </div>
          <button type="button" onClick={() => onJoinLeave(community.id)} className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${joined ? 'border border-[#ded8e8] bg-white text-[#716b7b] hover:border-rose-200 hover:text-rose-700' : 'bg-violet-700 text-white hover:bg-violet-800'}`} data-testid={`join-community-${community.id}`}>
            {joined ? 'Joined' : 'Join'}
          </button>
        </div>
      </article>
    );
  };

  const featuredCard = (community: Community) => {
    const joined = joinedIds.has(community.id);
    const bookmarked = bookmarks.includes(community.id);
    const location = community.college || (community.category === 'College Community' ? community.name : community.category);
    return (
      <article key={community.id} className="flex min-w-0 flex-col rounded-[22px] border border-[#ebe7ef] bg-white p-4 shadow-[0_5px_20px_rgba(39,25,59,0.045)] sm:p-5" data-testid={`card-community-${community.id}`}>
        <div className="flex min-w-0 items-start gap-3">
          <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOpen(community.id)} data-testid={`open-community-${community.id}`}>
            <div className="flex items-center gap-3">
              <CommunityMark community={community} size="small" />
              <div className="min-w-0">
                <h3 className="truncate font-semibold text-[#26212f]">{community.name}</h3>
              <p className="mt-1 truncate text-xs text-[#80798a]">{community.college || community.category}</p>
              </div>
            </div>
          </button>
          <button type="button" aria-label={`${bookmarked ? 'Remove bookmark from' : 'Bookmark'} ${community.name}`} onClick={() => toggleBookmark(community.id)} className={`rounded-full p-2 transition-colors ${bookmarked ? 'text-violet-700' : 'text-[#9992a1] hover:bg-violet-50 hover:text-violet-700'}`} data-testid={`bookmark-community-${community.id}`}>
            <Bookmark size={18} fill={bookmarked ? 'currentColor' : 'none'} />
          </button>
        </div>
        <button type="button" className="mt-3 text-left" onClick={() => onOpen(community.id)} data-testid={`description-community-${community.id}`}>
          <p className="line-clamp-2 min-h-10 text-sm leading-5 text-[#6f6878]">{community.description}</p>
        </button>
        <div className="mt-4 flex items-center gap-2 text-xs text-[#827b8b]">
          <Users size={14} className="text-violet-600" />
          <span data-testid={`members-count-${community.id}`}>{formatCount(community.memberIds.length)} members</span>
          <span aria-hidden="true">·</span>
          <span data-testid={`posts-count-${community.id}`}>{formatCount(postCount(community.id))} posts</span>
        </div>
        {location && <p className="mt-2 flex items-center gap-1.5 truncate text-xs text-[#8a8493]"><MapPin size={13} />{location}</p>}
        <div className="mt-4 flex items-center justify-between border-t border-[#f0edf3] pt-3">
          <button type="button" onClick={() => onShare(community)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#777181] hover:text-violet-700" data-testid={`share-community-${community.id}`}><Share2 size={14} /> Share</button>
          <button type="button" onClick={() => onJoinLeave(community.id)} className={`rounded-full px-4 py-2 text-xs font-semibold ${joined ? 'border border-[#ded8e8] bg-white text-[#716b7b] hover:border-rose-200 hover:text-rose-700' : 'bg-violet-700 text-white hover:bg-violet-800'}`} data-testid={`join-community-${community.id}`}>
            {joined ? <><Check size={13} className="mr-1 inline" />Joined</> : 'Join community'}
          </button>
        </div>
      </article>
    );
  };

  const noCommunities = communities.length === 0;
  return (
    <main className="community-discovery mx-auto w-full max-w-[1240px] px-4 pb-8 pt-5 text-left sm:px-7 sm:pt-8 lg:px-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-violet-700">Find your people</p>
          <h1 className="font-serif text-[2.35rem] leading-[1.03] tracking-[-0.05em] text-[#211d2a] sm:text-[3.25rem]" data-testid="title-communities">Communities</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#777181] sm:text-base">Find and join communities to learn, discuss and grow together.</p>
        </div>
        <button type="button" onClick={onCreate} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-violet-700 px-5 py-3 text-sm font-semibold text-white shadow-[0_7px_18px_rgba(91,55,163,0.19)] transition hover:bg-violet-800 sm:w-auto" data-testid="create-community">
          <span className="text-lg leading-none">+</span> Create Community
        </button>
      </header>

      <div className="mt-6">
        <label className="flex h-[54px] items-center gap-3 rounded-full border border-[#e2dce9] bg-white px-4 shadow-[0_4px_16px_rgba(39,25,59,0.05)] focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-100/60 sm:px-5">
          <Search size={19} className="shrink-0 text-[#81798e]" />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search communities…" aria-label="Search communities" className="min-w-0 flex-1 bg-transparent text-sm text-[#2b2633] outline-none placeholder:text-[#a19aa8]" data-testid="search-communities" />
          {query && <button type="button" aria-label="Clear search" onClick={() => setQuery('')} className="rounded-full p-1 text-[#898291] hover:bg-violet-50" data-testid="clear-community-search"><X size={16} /></button>}
        </label>
      </div>

      <nav aria-label="Community categories" className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {categories.map(({ id, subtitle }) => {
          const Icon = categoryIcon[id];
          const active = activeCategory === id;
          return (
              <button key={id} type="button" onClick={() => { setActiveCategory(id); setView('category'); }} className={`flex shrink-0 items-center gap-2.5 rounded-full border px-4 py-2.5 text-left transition-colors ${active ? 'border-violet-700 bg-violet-700 text-white shadow-[0_4px_12px_rgba(91,55,163,0.18)]' : 'border-[#e9e5ed] bg-white text-[#393342] hover:border-violet-300'}`} data-testid={`category-${id.toLowerCase()}`}>
              <Icon size={17} />
              <span><span className="block text-xs font-semibold">{id}</span><span className={`mt-0.5 block text-[10px] ${active ? 'text-violet-100' : 'text-[#908997]'}`}>{subtitle}</span></span>
              <span className={`ml-1 text-[10px] ${active ? 'text-violet-100' : 'text-[#aaa4af]'}`} data-testid={`category-count-${id.toLowerCase()}`}>{categoryCounts[id]}</span>
            </button>
          );
        })}
      </nav>

      {noCommunities ? (
        <section className="mt-8 rounded-[24px] border border-dashed border-[#dcd5e4] bg-white px-6 py-12 text-center" data-testid="empty-communities">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700"><Users size={22} /></div>
          <h2 className="mt-4 font-serif text-2xl text-[#211d2a]">Your next community starts here</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#777181]">There aren’t any communities to explore yet. Create one to bring students together around a subject, skill or shared interest.</p>
          <button type="button" onClick={onCreate} className="mt-5 rounded-full bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white" data-testid="empty-create-community">Create a community</button>
        </section>
      ) : showDirectory ? (
        <section className="mt-8" data-testid="directory-results">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-700">{normalizedQuery ? 'Search results' : view === 'learning' ? 'Popular learning' : view === 'recommended' ? 'Profile matches' : view === 'popular' ? 'Most popular' : activeCategory}</p><h2 className="mt-1 font-serif text-2xl text-[#211d2a]">{normalizedQuery ? `Communities matching “${query.trim()}”` : view === 'learning' ? 'Popular Learning Communities' : view === 'recommended' ? 'Recommended for you' : view === 'popular' ? 'Most popular communities' : `${activeCategory} communities`}</h2></div>
            <button type="button" onClick={() => { setView('overview'); setQuery(''); }} className="shrink-0 text-sm font-semibold text-violet-700" data-testid="action-back-to-discovery">Back to discovery</button>
          </div>
          {directoryCommunities.length > 0 ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{(normalizedQuery || view === 'category' ? ranked(directoryCommunities) : directoryCommunities).map(featuredCard)}</div> : <div className="rounded-2xl border border-dashed border-[#ddd6e4] bg-white px-5 py-10 text-center" data-testid="empty-category-results"><p className="font-semibold text-[#393342]">{normalizedQuery ? 'No communities match that search' : 'No communities in this view yet'}</p><p className="mt-1 text-sm text-[#827b8b]">Try another category or search for a different topic.</p></div>}
        </section>
      ) : (
        <div className="mt-8 space-y-9 sm:mt-10 sm:space-y-11">
          <section>
            <div className="mb-3">
              {sectionTitle('Popular Learning Communities', 'View all', () => { setActiveCategory('Learning'); setView('learning'); })}
              <p className="mt-1 text-sm text-[#827b8b]">Study together, ask doubts, share resources and prepare.</p>
            </div>
            {popularLearning.length ? <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">{popularLearning.map(compactCard)}</div> : <p className="rounded-2xl border border-dashed border-[#ddd6e4] bg-white px-4 py-6 text-sm text-[#827b8b]" data-testid="empty-popular-learning">No learning communities match this search yet.</p>}
          </section>

          <section>
            <h2 className="font-serif text-[1.55rem] tracking-[-0.035em] text-[#211d2a] sm:text-[1.8rem]">Browse by category</h2>
            <p className="mt-1 text-sm text-[#827b8b]">Explore communities based on what you’re interested in.</p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {categories.slice(0, 4).map(({ id, description }) => {
                const Icon = categoryIcon[id];
                return (
                  <button key={id} type="button" onClick={() => { setActiveCategory(id); setView('category'); }} className="group flex min-w-0 items-center gap-4 rounded-[20px] border border-[#ebe7ef] bg-white p-4 text-left shadow-[0_4px_16px_rgba(39,25,59,0.035)] transition hover:border-violet-200 hover:shadow-[0_8px_22px_rgba(39,25,59,0.07)] sm:p-5" data-testid={`browse-category-${id.toLowerCase()}`}>
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700"><Icon size={22} /></span>
                    <span className="min-w-0 flex-1"><span className="block font-semibold text-[#2a2532]">{id}</span><span className="mt-1 block text-xs text-[#827b8b]">{description}</span><span className="mt-2 block text-xs font-medium text-violet-700">{categoryCounts[id]} {categoryCounts[id] === 1 ? 'community' : 'communities'}</span></span>
                    <ArrowRight size={17} className="shrink-0 text-[#81798e] transition-transform group-hover:translate-x-1" />
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <div className="mb-4">
              {sectionTitle('Recommended for you', 'See all', () => { setView('recommended'); })}
              <p className="mt-1 text-sm text-[#827b8b]">Picked from your profile, not a popularity list.</p>
            </div>
            {recommendations.length ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{recommendations.slice(0, 6).map(featuredCard)}</div> : (
              <div className="flex items-start gap-3 rounded-[20px] border border-[#ebe7ef] bg-white p-5" data-testid="empty-recommendations">
                <Sparkles size={19} className="mt-0.5 shrink-0 text-violet-700" />
                <div><p className="font-semibold text-[#393342]">We don’t have a match to suggest yet</p><p className="mt-1 text-sm leading-5 text-[#827b8b]">Add interests, skills, or your school and college to your profile to get relevant community recommendations.</p></div>
              </div>
            )}
          </section>

          <section>
            <div className="mb-4">
              {sectionTitle('Most popular communities', 'See all', () => { setView('popular'); })}
              <p className="mt-1 text-sm text-[#827b8b]">Student spaces with the largest communities.</p>
            </div>
            {popularAll.length ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{popularAll.slice(0, 8).map(featuredCard)}</div> : <p className="text-sm text-[#827b8b]" data-testid="empty-popular-communities">No communities to show yet.</p>}
          </section>
        </div>
      )}
    </main>
  );
}
