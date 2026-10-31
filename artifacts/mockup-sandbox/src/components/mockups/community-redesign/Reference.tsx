import './_group.css';
import './Reference.css';
import { useMemo, useState } from 'react';
import {
  Bell,
  BookOpen,
  Building2,
  Check,
  ChevronRight,
  Code2,
  GraduationCap,
  Heart,
  Landmark,
  Layers3,
  Menu,
  Search,
  SlidersHorizontal,
  Sparkles,
  Stethoscope,
  Users,
  Wrench,
} from 'lucide-react';
import { getCollegeImage } from './collegeImages';

type Category = 'learning' | 'schools' | 'college' | 'skills' | 'interests' | 'career';

interface CommunityCard {
  id: string;
  name: string;
  handle: string;
  description: string;
  count: string;
  posts: string;
  category: Category;
  icon: typeof BookOpen;
  color: string;
  collegeName?: string;
  joined?: boolean;
  verified?: boolean;
}

const communities: CommunityCard[] = [
  {
    id: 'jee-aspirants',
    name: 'JEE Aspirants',
    handle: '/jee-aspirants',
    description: 'Solve doubts, stay consistent and prepare together.',
    count: '2.1K',
    posts: '318',
    category: 'learning',
    icon: Layers3,
    color: 'rose',
  },
  {
    id: 'neet-aspirants',
    name: 'NEET Aspirants',
    handle: '/neet-aspirants',
    description: 'A focused space for medical entrance prep.',
    count: '1.8K',
    posts: '246',
    category: 'learning',
    icon: Stethoscope,
    color: 'blue',
  },
  {
    id: 'class-12',
    name: 'Class 12',
    handle: '/class-12',
    description: 'Boards, entrance prep and everything in between.',
    count: '1.4K',
    posts: '192',
    category: 'schools',
    icon: GraduationCap,
    color: 'mint',
  },
  {
    id: 'class-11',
    name: 'Class 11',
    handle: '/class-11',
    description: 'Build strong fundamentals with fellow students.',
    count: '1.2K',
    posts: '156',
    category: 'schools',
    icon: BookOpen,
    color: 'amber',
  },
  {
    id: 'web-development',
    name: 'Web Development',
    handle: '/web-development',
    description: 'Discuss, learn and build together. Share your latest project.',
    count: '892',
    posts: '84',
    category: 'skills',
    icon: Code2,
    color: 'indigo',
  },
  {
    id: 'ai-ml',
    name: 'AI/ML',
    handle: '/ai-ml',
    description: 'Learn AI/ML, share resources and discuss projects.',
    count: '1.2K',
    posts: '96',
    category: 'skills',
    icon: Sparkles,
    color: 'sky',
  },
  {
    id: 'dsa',
    name: 'DSA Practice Club',
    handle: '/dsa',
    description: 'Daily problems, interview prep and peer review.',
    count: '2.8K',
    posts: '402',
    category: 'skills',
    icon: Code2,
    color: 'violet',
  },
  {
    id: 'nit-trichy',
    name: 'NIT Tiruchirappalli',
    handle: '/nit-tiruchirappalli',
    description: 'Official campus community for students of NIT Tiruchirappalli.',
    count: '174',
    posts: '14',
    category: 'college',
    icon: Building2,
    color: 'blue',
    collegeName: 'NIT Tiruchirappalli',
    joined: true,
    verified: true,
  },
  {
    id: 'iit-madras',
    name: 'IIT Madras',
    handle: '/iit-madras',
    description: 'Meet classmates, find study circles and campus updates.',
    count: '536',
    posts: '61',
    category: 'college',
    icon: Building2,
    color: 'mint',
    collegeName: 'IIT Madras',
  },
  {
    id: 'design-thinking',
    name: 'Design Thinking',
    handle: '/design-thinking',
    description: 'A home for curious minds, makers and problem solvers.',
    count: '764',
    posts: '58',
    category: 'interests',
    icon: Heart,
    color: 'rose',
  },
  {
    id: 'internship-circle',
    name: 'Internship Circle',
    handle: '/internship-circle',
    description: 'Find opportunities and get application feedback.',
    count: '1.6K',
    posts: '143',
    category: 'career',
    icon: Wrench,
    color: 'amber',
  },
];

const filters: { id: Category | 'all'; label: string; icon: typeof Users }[] = [
  { id: 'learning', label: 'Learning', icon: BookOpen },
  { id: 'schools', label: 'Schools', icon: Landmark },
  { id: 'college', label: 'College', icon: Building2 },
  { id: 'skills', label: 'Skills', icon: Wrench },
  { id: 'interests', label: 'Interests', icon: Heart },
  { id: 'career', label: 'Career', icon: Sparkles },
];

const categoryCards: { id: Category; title: string; subtitle: string; total: string; icon: typeof Users; color: string }[] = [
  { id: 'learning', title: 'Learning', subtitle: 'Classes & study', total: '20+ communities', icon: GraduationCap, color: 'violet' },
  { id: 'schools', title: 'Schools', subtitle: 'Find your school community', total: '10+ communities', icon: Landmark, color: 'mint' },
  { id: 'college', title: 'College', subtitle: 'Your college and other colleges', total: '50+ communities', icon: Building2, color: 'blue' },
  { id: 'skills', title: 'Skills', subtitle: 'Tech, domains and tools', total: '30+ communities', icon: Code2, color: 'amber' },
];

function IconTile({ item, size = 'regular' }: { item: CommunityCard; size?: 'regular' | 'small' }) {
  const Icon = item.icon;
  if (item.category === 'college' && item.collegeName) {
    return (
      <div className={`reference-photo reference-photo--${size}`}>
        <img src={getCollegeImage(item.collegeName)} alt={`${item.collegeName} campus`} />
      </div>
    );
  }
  return (
    <div className={`reference-icon-tile tone-${item.color} reference-icon-tile--${size}`} aria-hidden="true">
      <Icon />
    </div>
  );
}

function MemberDots() {
  return (
    <div className="reference-member-dots" aria-label="Community members">
      <span>AS</span><span>RK</span><span>MP</span>
    </div>
  );
}

export function Reference() {
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('learning');
  const [search, setSearch] = useState('');
  const [joined, setJoined] = useState<string[]>(['nit-trichy']);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return communities.filter((community) => {
      const categoryMatch = activeCategory === 'all' || community.category === activeCategory || Boolean(term);
      const searchMatch = !term || `${community.name} ${community.handle} ${community.description}`.toLowerCase().includes(term);
      return categoryMatch && searchMatch;
    });
  }, [activeCategory, search]);

  const learningPicks = communities.filter((community) => community.category === 'learning' || community.id === 'class-12' || community.id === 'class-11');
  const recommended = communities.filter((community) => ['web-development', 'ai-ml', 'dsa'].includes(community.id));
  const popular = activeCategory === 'all' && !search
    ? communities.filter((community) => ['nit-trichy', 'jee-aspirants', 'dsa'].includes(community.id))
    : visible.slice(0, 4);

  const toggleJoin = (id: string) => {
    setJoined((current) => current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]);
  };

  const selectCategory = (category: Category | 'all') => setActiveCategory(category);
  const isFiltered = activeCategory !== 'learning' || Boolean(search);

  return (
    <main className="network-app-shell reference-communities">
      <div className="reference-page">
        <header className="reference-topbar">
          <a className="reference-brand" href="#communities" aria-label="The Network home">
            <span className="reference-logo">N</span>
            <span className="reference-brand-copy"><strong>The Network</strong><small>Connect. Learn. Grow.</small></span>
          </a>
          <div className="reference-top-actions">
            <button type="button" className="reference-icon-button menu-action" aria-label="Open menu"><Menu /></button>
            <button type="button" className="reference-icon-button" aria-label="Notifications"><Bell /><i /></button>
            <div className="reference-profile" aria-label="Student profile">AR<span /></div>
          </div>
        </header>

        <div className="reference-heading">
          <div>
            <span className="reference-eyebrow">YOUR PEOPLE, YOUR PLACE</span>
            <h1>Communities</h1>
            <p>Find your people. Learn something together.</p>
          </div>
          <button className="reference-create" type="button" onClick={() => window.alert('Community creation is coming soon.')}>
            <span>+</span> Create Community
          </button>
        </div>

        <label className="reference-search">
          <Search />
          <input
            aria-label="Search communities"
            placeholder="Search communities..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search ? <button type="button" onClick={() => setSearch('')} aria-label="Clear search">Clear</button> : <SlidersHorizontal className="reference-search-filter" />}
        </label>

        <nav className="reference-filter-rail" aria-label="Community categories">
          {filters.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => selectCategory(id)} className={activeCategory === id ? 'active' : ''}>
              <Icon />
              <span><b>{label}</b><small>{id === 'learning' ? 'Classes & Study' : id === 'schools' ? 'Your School' : id === 'college' ? 'Your College' : id === 'skills' ? 'Tech & Domains' : id === 'interests' ? 'Find your people' : 'Your next step'}</small></span>
            </button>
          ))}
        </nav>

        {isFiltered ? (
          <section className="reference-section reference-results">
            <div className="reference-section-heading">
              <div><h2>{search ? 'Search results' : `${filters.find((filter) => filter.id === activeCategory)?.label} communities`}</h2><p>{search ? `Communities matching “${search}”` : 'Find a group that feels like yours.'}</p></div>
              <span className="reference-result-count">{visible.length} found</span>
            </div>
            <div className="reference-result-list">
              {visible.map((item) => (
                <article className="reference-result-row" key={item.id}>
                  <IconTile item={item} size="small" />
                  <div className="reference-result-copy"><strong>{item.name}{item.verified && <Check className="reference-verified" />}</strong><small>{item.handle}</small><p>{item.description}</p><span className="reference-member-meta"><MemberDots />{item.count} members · {item.posts} posts</span></div>
                  <button className={`reference-join ${joined.includes(item.id) ? 'is-joined' : ''}`} type="button" onClick={() => toggleJoin(item.id)}>{joined.includes(item.id) ? 'Joined' : 'Join'}</button>
                </article>
              ))}
              {visible.length === 0 && <div className="reference-empty"><Search /><strong>No communities found</strong><span>Try another name or browse all categories.</span><button type="button" onClick={() => { setSearch(''); selectCategory('all'); }}>Browse everything</button></div>}
            </div>
          </section>
        ) : (
          <>
            <section className="reference-section reference-learning-section">
              <div className="reference-section-heading">
                <div><h2>Popular Learning Communities</h2><p>Study together, ask doubts, share resources and prepare.</p></div>
                <button className="reference-view-all" type="button" onClick={() => selectCategory('learning')}>View all <ChevronRight /></button>
              </div>
              <div className="reference-learning-rail">
                {learningPicks.map((item) => (
                  <article className={`reference-learning-card tone-card-${item.color}`} key={item.id}>
                    <IconTile item={item} size="small" />
                    <strong>{item.name}</strong>
                    <span>{item.count} members</span>
                    <div className="reference-learning-bottom"><MemberDots /><button className={`reference-join reference-join--mini ${joined.includes(item.id) ? 'is-joined' : ''}`} type="button" onClick={() => toggleJoin(item.id)}>{joined.includes(item.id) ? 'Joined' : 'Join'}</button></div>
                  </article>
                ))}
              </div>
            </section>

            <section className="reference-section reference-browse-section">
              <div className="reference-section-heading">
                <div><h2>Browse by category</h2><p>Explore communities based on what you’re interested in.</p></div>
              </div>
              <div className="reference-category-grid">
                {categoryCards.map(({ id, title, subtitle, total, icon: Icon, color }) => (
                  <button className={`reference-category-card tone-card-${color}`} key={id} type="button" onClick={() => selectCategory(id)}>
                    <span className={`reference-category-icon tone-${color}`}><Icon /></span>
                    <span className="reference-category-copy"><b>{title}</b><small>{subtitle}</small><em>{total}</em></span>
                    <ChevronRight />
                  </button>
                ))}
              </div>
            </section>

            <section className="reference-section reference-recommended">
              <div className="reference-section-heading">
                <div><h2>Recommended for you</h2><p>Based on your interests and profile.</p></div>
                <button className="reference-view-all" type="button" onClick={() => selectCategory('skills')}>See all <ChevronRight /></button>
              </div>
              <div className="reference-recommend-rail">
                {recommended.map((item) => (
                  <article className="reference-recommend-card" key={item.id}>
                    <div className="reference-recommend-main"><IconTile item={item} /><div><strong>{item.name}{item.id === 'web-development' && <Check className="reference-verified" />}</strong><small>{item.handle}</small><p>{item.description}</p></div></div>
                    <div className="reference-recommend-bottom"><span><MemberDots />{item.count} members · {item.posts} posts</span><button className={`reference-join reference-join--mini ${joined.includes(item.id) ? 'is-joined' : ''}`} type="button" onClick={() => toggleJoin(item.id)}>{joined.includes(item.id) ? 'Joined' : 'Join'}</button></div>
                  </article>
                ))}
              </div>
            </section>

            <section className="reference-section reference-popular-section">
              <div className="reference-section-heading">
                <div><h2>Most popular communities</h2><p>Good conversations start with good company.</p></div>
                <button className="reference-view-all" type="button" onClick={() => selectCategory('all')}>See all <ChevronRight /></button>
              </div>
              <div className="reference-popular-list">
                {popular.map((item) => (
                  <article className="reference-popular-row" key={item.id}>
                    <IconTile item={item} />
                    <div className="reference-popular-copy"><strong>{item.name}{item.verified && <Check className="reference-verified" />}</strong><small>{item.handle}</small><p>{item.description}</p><span><MemberDots />{item.count} members · {item.posts} posts</span></div>
                    <button className={`reference-join ${joined.includes(item.id) ? 'is-joined' : ''}`} type="button" onClick={() => toggleJoin(item.id)}>{joined.includes(item.id) ? 'Joined' : 'Join'}</button>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}

        <footer className="reference-mobile-nav">
          <button type="button"><Users /><span>Home</span></button>
          <button type="button" className="selected"><Users /><span>Communities</span></button>
          <button type="button"><Heart /><span>Connect</span></button>
          <button type="button"><BookOpen /><span>Learn</span></button>
          <button type="button"><Bell /><span>Chats</span></button>
        </footer>
      </div>
    </main>
  );
}

export default Reference;
