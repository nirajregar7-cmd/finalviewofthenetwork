import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SEOHead, { SITE_URL } from './SEOHead';
import { toSlug } from './utils';
import { loadSeoData } from './data';

interface CommunityData {
  id: string;
  name: string;
  slug: string;
  description: string;
  memberCount: number;
  category: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  Tech: '💻', Engineering: '⚙️', Science: '🔬', Arts: '🎨',
  Business: '💼', Medical: '🏥', Law: '⚖️', Design: '🎭',
  Sports: '🏅', Music: '🎵', General: '🌐',
};

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<CommunityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadSeoData<CommunityData[]>('communities')
      .then(data => {
        if (cancelled) return;
        if (!Array.isArray(data)) throw new Error('Community list was not an array');
        setCommunities(data);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError(true);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filtered = communities.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase())
  );

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Student Communities in India | The Network',
    description: 'Browse AI, Web Dev, Startups, Placements, GATE, UPSC and 100+ student communities',
    itemListElement: communities.slice(0, 50).map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      url: `${SITE_URL}/community/${c.slug}`,
    })),
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <SEOHead
        title="Student Communities India | AI, Web Dev, Startups, Placements | The Network"
        description="Join student communities for AI, Web Development, Startups, Placements, GATE, UPSC, Design, Robotics and more. Connect with students across India."
        canonical="/communities"
        keywords="student communities india, AI community india, web development community, startup community students, placement community, GATE community, engineering students"
        schema={schema}
      />

      <header className="border-b border-white/10 px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-tight">The Network</Link>
        <nav className="flex gap-4 text-sm text-white/60">
          <Link to="/colleges" className="hover:text-white">Colleges</Link>
          <Link to="/opportunities" className="hover:text-white">Opportunities</Link>
          <Link to="/events" className="hover:text-white">Events</Link>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        <nav className="text-sm text-white/40 mb-6">
          <Link to="/" className="hover:text-white">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-white">Communities</span>
        </nav>

        <h1 className="text-4xl font-bold mb-2">Student Communities</h1>
        <p className="text-white/60 text-lg mb-8">
          Find your tribe. Join communities for AI, startups, placements, coding, design and more.
        </p>

        <input
          type="text"
          placeholder="Search communities..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-md bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 mb-8 focus:outline-none focus:border-white/30"
        />

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(9)].map((_, i) => <div key={i} className="bg-white/5 rounded-xl h-32 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(c => (
              <Link
                key={c.id}
                to={`/community/${c.slug}`}
                className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl p-5 transition-all group"
              >
                <div className="text-2xl mb-2">{CATEGORY_ICONS[c.category] || '🌐'}</div>
                <h2 className="font-semibold text-white mb-1 leading-snug">{c.name}</h2>
                <p className="text-white/40 text-sm line-clamp-2 mb-3">{c.description}</p>
                <span className="text-white/30 text-xs">{c.memberCount} members</span>
              </Link>
            ))}
          </div>
        )}

        {!loading && loadError && (
          <p className="text-white/40 text-center py-12">Community listings are temporarily unavailable.</p>
        )}
        {!loading && !loadError && filtered.length === 0 && (
          <p className="text-white/40 text-center py-12">No communities found for "{search}"</p>
        )}
      </main>

      <footer className="border-t border-white/10 mt-16 px-4 py-8 text-center">
        <div className="flex flex-wrap justify-center gap-6 text-sm text-white/50">
          <Link to="/colleges" className="hover:text-white">Colleges</Link>
          <Link to="/opportunities" className="hover:text-white">Opportunities</Link>
          <Link to="/events" className="hover:text-white">Events</Link>
          <Link to="/students" className="hover:text-white">Students</Link>
          <Link to="/campus-ambassador" className="hover:text-white">Campus Ambassador</Link>
        </div>
        <p className="text-white/20 text-xs mt-4">© 2025 The Network – India's Student Network</p>
      </footer>
    </div>
  );
}
