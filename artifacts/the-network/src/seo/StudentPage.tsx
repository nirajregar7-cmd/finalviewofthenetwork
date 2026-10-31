import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SEOHead, { SITE_URL } from './SEOHead';
import PublicAvatar from './PublicAvatar';
import { getEducationDisplay } from '../utils/education';
import { API_ORIGIN } from '../api';

interface StudentDetail {
  id: string;
  fullName: string;
  college: string;
  branch: string;
  degree: string;
  year: number;
  aboutMe: string;
  skills: string[];
  interests: string[];
  avatar: string;
  communities: { id: string; name: string; slug: string }[];
  isVerified: boolean;
}

export default function StudentPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`${API_ORIGIN}/api/seo/student/${id}`)
      .then(r => { if (!r.ok) throw new Error('not found'); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [id]);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="text-white/40">Loading...</div></div>;
  if (notFound || !data) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
      <h1 className="text-2xl font-bold mb-4">Student not found</h1>
      <Link to="/students" className="text-white/60 hover:text-white">← Browse students</Link>
    </div>
  );

  const collegeSlug = data.college.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: data.fullName,
      description: data.aboutMe || `${data.fullName} is a ${data.branch} student at ${data.college}.`,
      url: `${SITE_URL}/student/${id}`,
      affiliation: { '@type': 'EducationalOrganization', name: data.college },
      knowsAbout: data.skills,
      image: data.avatar || undefined,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Students', item: `${SITE_URL}/students` },
        { '@type': 'ListItem', position: 3, name: data.fullName, item: `${SITE_URL}/student/${id}` },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <SEOHead
        title={`${data.fullName} – ${data.branch} at ${data.college} | The Network`}
        description={`${data.fullName} is a ${data.branch} student at ${data.college}${data.skills.length ? `. Skills: ${data.skills.slice(0, 5).join(', ')}` : ''}. Connect on The Network.`}
        canonical={`/student/${id}`}
        keywords={`${data.fullName}, ${data.college} student, ${data.branch} student india, student profile`}
        robots="noindex, nofollow"
        schema={schema}
      />

      <header className="border-b border-white/10 px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-tight">The Network</Link>
        <nav className="flex gap-4 text-sm text-white/60">
          <Link to="/students" className="hover:text-white">Students</Link>
          <Link to="/colleges" className="hover:text-white">Colleges</Link>
          <Link to="/communities" className="hover:text-white">Communities</Link>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <nav className="text-sm text-white/40 mb-6">
          <Link to="/" className="hover:text-white">Home</Link>
          <span className="mx-2">/</span>
          <Link to="/students" className="hover:text-white">Students</Link>
          <span className="mx-2">/</span>
          <span className="text-white">{data.fullName}</span>
        </nav>

        {/* Profile Header */}
        <div className="flex items-start gap-6 mb-10">
          <PublicAvatar
            avatar={data.avatar}
            name={data.fullName}
            className="w-20 h-20 rounded-full bg-white/10 text-3xl shrink-0"
          />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-bold">{data.fullName}</h1>
              {data.isVerified && <span className="text-blue-400 text-sm">✓ Verified</span>}
            </div>
            <p className="text-white/60 mb-1">{getEducationDisplay(data).compact}</p>
            <Link to={`/college/${collegeSlug}`} className="text-white/50 hover:text-white text-sm">{data.college}</Link>
          </div>
        </div>

        {data.aboutMe && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3">About</h2>
            <p className="text-white/60 leading-relaxed">{data.aboutMe}</p>
          </section>
        )}

        {data.skills.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {data.skills.map(s => (
                <span key={s} className="bg-white/10 px-3 py-1 rounded-full text-sm">{s}</span>
              ))}
            </div>
          </section>
        )}

        {data.interests.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3">Interests</h2>
            <div className="flex flex-wrap gap-2">
              {data.interests.map(i => (
                <span key={i} className="border border-white/10 px-3 py-1 rounded-full text-sm text-white/60">{i}</span>
              ))}
            </div>
          </section>
        )}

        {data.communities.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3">Communities</h2>
            <div className="flex flex-wrap gap-2">
              {data.communities.map(c => (
                <Link key={c.id} to={`/community/${c.slug}`} className="bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1 rounded-full text-sm transition-all">{c.name}</Link>
              ))}
            </div>
          </section>
        )}

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Connect with {data.fullName.split(' ')[0]}</h2>
          <p className="text-white/60 mb-6">Join The Network to connect with students like {data.fullName.split(' ')[0]}.</p>
          <a href="/" className="inline-block bg-white text-black font-semibold px-8 py-3 rounded-full hover:bg-white/90 transition-all">
            Join The Network
          </a>
        </div>
      </main>

      <footer className="border-t border-white/10 mt-16 px-4 py-8 text-center">
        <div className="flex flex-wrap justify-center gap-6 text-sm text-white/50">
          <Link to="/colleges" className="hover:text-white">Colleges</Link>
          <Link to="/communities" className="hover:text-white">Communities</Link>
          <Link to="/opportunities" className="hover:text-white">Opportunities</Link>
          <Link to="/events" className="hover:text-white">Events</Link>
          <Link to="/students" className="hover:text-white">Students</Link>
        </div>
        <p className="text-white/20 text-xs mt-4">© 2025 The Network – India's Student Network</p>
      </footer>
    </div>
  );
}
