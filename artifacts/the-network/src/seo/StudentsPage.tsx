import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SEOHead from './SEOHead';
import { loadSeoData } from './data';
import PublicAvatar from './PublicAvatar';

interface StudentData {
  id: string;
  fullName: string;
  college: string;
  branch: string;
  avatar: string;
  skills: string[];
  isVerified: boolean;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadSeoData<StudentData[]>('students')
      .then(data => {
        if (cancelled) return;
        if (!Array.isArray(data)) throw new Error('Student list was not an array');
        setStudents(data);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError(true);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filtered = students.filter(s =>
    s.fullName.toLowerCase().includes(search.toLowerCase()) ||
    s.college.toLowerCase().includes(search.toLowerCase()) ||
    s.branch.toLowerCase().includes(search.toLowerCase())
  );

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Students on The Network',
    description: 'Browse engineering and college students across India',
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <SEOHead
        title="Student Profiles India | Engineering Students | The Network"
        description="Browse student profiles from IITs, NITs, VIT, SRM and colleges across India. Connect with engineering students, find co-founders, teammates and study partners."
        canonical="/students"
        keywords="engineering students india, student profiles, IIT students, NIT students, college students network india"
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
          <span className="text-white">Students</span>
        </nav>

        <h1 className="text-4xl font-bold mb-2">Students on The Network</h1>
        <p className="text-white/60 text-lg mb-8">
          Connect with engineering and college students across India. Find co-founders, study partners and teammates.
        </p>

        <input
          type="text"
          placeholder="Search by name, college, or branch..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-md bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 mb-8 focus:outline-none focus:border-white/30"
        />

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(12)].map((_, i) => <div key={i} className="bg-white/5 rounded-xl h-32 animate-pulse" />)}
          </div>
        ) : loadError ? (
          <p className="text-white/40 text-center py-12">Student listings are temporarily unavailable.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.slice(0, 80).map(s => (
              <Link
                key={s.id}
                to={`/student/${s.id}`}
                className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl p-4 flex flex-col items-center text-center transition-all"
              >
                <PublicAvatar
                  avatar={s.avatar}
                  name={s.fullName}
                  className="w-14 h-14 rounded-full bg-white/10 text-2xl mb-3"
                />
                <p className="font-medium text-sm">{s.fullName} {s.isVerified && <span className="text-blue-400">✓</span>}</p>
                <p className="text-white/40 text-xs mt-1 truncate w-full">{s.branch}</p>
                <p className="text-white/30 text-xs truncate w-full">{s.college}</p>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-white/10 mt-16 px-4 py-8 text-center">
        <div className="flex flex-wrap justify-center gap-6 text-sm text-white/50">
          <Link to="/colleges" className="hover:text-white">Colleges</Link>
          <Link to="/communities" className="hover:text-white">Communities</Link>
          <Link to="/opportunities" className="hover:text-white">Opportunities</Link>
          <Link to="/events" className="hover:text-white">Events</Link>
          <Link to="/campus-ambassador" className="hover:text-white">Campus Ambassador</Link>
        </div>
        <p className="text-white/20 text-xs mt-4">© 2025 The Network – India's Student Network</p>
      </footer>
    </div>
  );
}
