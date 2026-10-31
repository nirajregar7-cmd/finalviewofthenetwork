import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SEOHead, { SITE_URL } from './SEOHead';
import { toSlug } from './utils';
import { loadSeoData } from './data';

interface CollegeData {
  name: string;
  slug: string;
  studentCount: number;
  communityCount: number;
}

export default function CollegesPage() {
  const [colleges, setColleges] = useState<CollegeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadSeoData<CollegeData[]>('colleges')
      .then(data => {
        if (cancelled) return;
        if (!Array.isArray(data)) throw new Error('College list was not an array');
        setColleges(data);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError(true);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filtered = colleges.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Indian College Student Communities on The Network',
    description: 'Browse student communities from every college in India',
    itemListElement: colleges.slice(0, 50).map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: `${c.name} Student Community`,
      url: `${SITE_URL}/college/${c.slug}`,
    })),
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <SEOHead
        title="College Student Communities India | The Network"
        description="Browse student communities from IITs, NITs, IIITs, VIT, SRM, Manipal and 1000+ colleges across India. Connect with students, discover hackathons, internships and opportunities."
        canonical="/colleges"
        keywords="college communities india, IIT students, NIT students, engineering college network, student communities"
        schema={schema}
      />

      {/* Header */}
      <header className="border-b border-white/10 px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-tight">The Network</Link>
        <nav className="flex gap-4 text-sm text-white/60">
          <Link to="/communities" className="hover:text-white">Communities</Link>
          <Link to="/opportunities" className="hover:text-white">Opportunities</Link>
          <Link to="/events" className="hover:text-white">Events</Link>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <nav className="text-sm text-white/40 mb-6">
          <Link to="/" className="hover:text-white">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-white">Colleges</span>
        </nav>

        <h1 className="text-4xl font-bold mb-2">College Student Communities</h1>
        <p className="text-white/60 text-lg mb-8">
          Connect with students from every campus across India. Find your college, join communities, discover opportunities.
        </p>

        {/* Search */}
        <input
          type="text"
          placeholder="Search your college..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-md bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 mb-8 focus:outline-none focus:border-white/30"
        />

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="bg-white/5 rounded-xl h-28 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(college => (
              <Link
                key={college.slug}
                to={`/college/${college.slug}`}
                className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl p-5 transition-all group"
              >
                <h2 className="font-semibold text-white group-hover:text-white mb-2 leading-snug">{college.name}</h2>
                <div className="flex gap-4 text-sm text-white/50">
                  <span>{college.studentCount} students</span>
                  {college.communityCount > 0 && <span>{college.communityCount} communities</span>}
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && loadError && (
          <p className="text-white/40 text-center py-12">College listings are temporarily unavailable.</p>
        )}
        {!loading && !loadError && filtered.length === 0 && (
          <p className="text-white/40 text-center py-12">No colleges found for "{search}"</p>
        )}
      </main>

      {/* Internal links footer */}
      <footer className="border-t border-white/10 mt-16 px-4 py-8 text-center">
        <div className="flex flex-wrap justify-center gap-6 text-sm text-white/50">
          <Link to="/communities" className="hover:text-white">Communities</Link>
          <Link to="/opportunities" className="hover:text-white">Opportunities</Link>
          <Link to="/events" className="hover:text-white">Events</Link>
          <Link to="/students" className="hover:text-white">Students</Link>
          <Link to="/campus-ambassador" className="hover:text-white">Campus Ambassador</Link>
          <Link to="/blog" className="hover:text-white">Blog</Link>
        </div>
        <p className="text-white/20 text-xs mt-4">© 2025 The Network – India's Student Network</p>
      </footer>
    </div>
  );
}
