import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SEOHead from './SEOHead';
import { loadSeoData } from './data';

interface EventData {
  id: string;
  title: string;
  description: string;
  category: string;
  date: string;
  venue: string;
  college: string;
  isOnline: boolean;
  organizer: string;
  link: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  Hackathon: 'bg-orange-500/20 text-orange-300',
  Workshop: 'bg-blue-500/20 text-blue-300',
  Seminar: 'bg-purple-500/20 text-purple-300',
  'Study Group': 'bg-green-500/20 text-green-300',
  Social: 'bg-pink-500/20 text-pink-300',
  Sports: 'bg-yellow-500/20 text-yellow-300',
  Cultural: 'bg-red-500/20 text-red-300',
  General: 'bg-white/10 text-white/60',
};

export default function EventsPage() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [loadError, setLoadError] = useState(false);

  const categories = ['All', 'Hackathon', 'Workshop', 'Seminar', 'Study Group', 'Social', 'Sports', 'Cultural'];

  useEffect(() => {
    let cancelled = false;
    loadSeoData<EventData[]>('events')
      .then(data => {
        if (cancelled) return;
        if (!Array.isArray(data)) throw new Error('Event list was not an array');
        setEvents(data);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError(true);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filtered = filter === 'All' ? events : events.filter(e => e.category === filter);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Student Events in India | Hackathons, Workshops, Seminars',
    itemListElement: events.slice(0, 30).map((e, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Event',
        name: e.title,
        description: e.description.slice(0, 150),
        startDate: e.date,
        location: e.isOnline ? { '@type': 'VirtualLocation' } : { '@type': 'Place', name: e.venue || e.college },
      },
    })),
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <SEOHead
        title="Student Events India | Hackathons, Workshops, College Events | The Network"
        description="Discover hackathons, workshops, seminars, and college events across India. Find Smart India Hackathon, coding competitions, tech talks, and campus fests."
        canonical="/events"
        keywords="hackathons india 2025, student events india, college workshops, tech seminars, campus fest, coding competition india, smart india hackathon"
        schema={schema}
      />

      <header className="border-b border-white/10 px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-tight">The Network</Link>
        <nav className="flex gap-4 text-sm text-white/60">
          <Link to="/colleges" className="hover:text-white">Colleges</Link>
          <Link to="/communities" className="hover:text-white">Communities</Link>
          <Link to="/opportunities" className="hover:text-white">Opportunities</Link>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        <nav className="text-sm text-white/40 mb-6">
          <Link to="/" className="hover:text-white">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-white">Events</span>
        </nav>

        <h1 className="text-4xl font-bold mb-2">Student Events in India</h1>
        <p className="text-white/60 text-lg mb-8">
          Hackathons, workshops, seminars and campus events. Find your next opportunity.
        </p>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-full text-sm transition-all ${filter === cat ? 'bg-white text-black font-semibold' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => <div key={i} className="bg-white/5 rounded-xl h-28 animate-pulse" />)}
          </div>
        ) : loadError ? (
          <p className="text-white/40 text-center py-12">Event listings are temporarily unavailable.</p>
        ) : filtered.length === 0 ? (
          <p className="text-white/40 text-center py-12">No events found</p>
        ) : (
          <div className="space-y-4">
            {filtered.map(e => (
              <div key={e.id} className="bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl p-5 flex flex-col sm:flex-row sm:items-start gap-4 transition-all">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[e.category] || CATEGORY_COLORS.General}`}>{e.category}</span>
                    {e.isOnline && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Online</span>}
                  </div>
                  <h2 className="font-semibold text-lg mb-1">{e.title}</h2>
                  <p className="text-white/50 text-sm line-clamp-2 mb-3">{e.description}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-white/40">
                    {e.college && <span>📍 {e.college}</span>}
                    {e.venue && !e.isOnline && <span>🏛️ {e.venue}</span>}
                    {e.organizer && <span>👤 {e.organizer}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-white/50 text-sm mb-3">{e.date}</p>
                  {e.link ? (
                    <a href={e.link} target="_blank" rel="noopener noreferrer" className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-all">Register →</a>
                  ) : (
                    <a href="/" className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-all">View →</a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-white/10 mt-16 px-4 py-8 text-center">
        <div className="flex flex-wrap justify-center gap-6 text-sm text-white/50">
          <Link to="/colleges" className="hover:text-white">Colleges</Link>
          <Link to="/communities" className="hover:text-white">Communities</Link>
          <Link to="/opportunities" className="hover:text-white">Opportunities</Link>
          <Link to="/students" className="hover:text-white">Students</Link>
          <Link to="/campus-ambassador" className="hover:text-white">Campus Ambassador</Link>
        </div>
        <p className="text-white/20 text-xs mt-4">© 2025 The Network – India's Student Network</p>
      </footer>
    </div>
  );
}
