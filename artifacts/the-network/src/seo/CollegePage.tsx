import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SEOHead, { SITE_URL } from './SEOHead';
import { loadSeoDetail } from './data';
import PublicAvatar from './PublicAvatar';

interface CollegeDetail {
  name: string;
  slug: string;
  studentCount: number;
  communityCount?: number;
  communities: { name: string; slug: string; memberCount: number }[];
  recentEvents: { id: string; title: string; date: string; category: string }[];
  topStudents: { id: string; fullName: string; branch: string; avatar: string }[];
}

export default function CollegePage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<CollegeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    loadSeoDetail<CollegeDetail>('college', slug)
      .then(data => {
        if (cancelled) return;
        setData(data);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setNotFound(true);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white/40">Loading...</div>
    </div>
  );

  if (notFound || !data) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
      <h1 className="text-2xl font-bold mb-4">College not found</h1>
      <Link to="/colleges" className="text-white/60 hover:text-white">← Browse all colleges</Link>
    </div>
  );

  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'EducationalOrganization',
      name: data.name,
      description: `${data.name} student community on The Network. Connect with ${data.studentCount} students, discover communities, hackathons, internships and opportunities.`,
      url: `${SITE_URL}/college/${slug}`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Colleges', item: `${SITE_URL}/colleges` },
        { '@type': 'ListItem', position: 3, name: data.name, item: `${SITE_URL}/college/${slug}` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: `How many students from ${data.name} are on The Network?`,
          acceptedAnswer: { '@type': 'Answer', text: `${data.studentCount} students from ${data.name} have joined The Network.` },
        },
        {
          '@type': 'Question',
          name: `What communities can ${data.name} students join?`,
          acceptedAnswer: { '@type': 'Answer', text: `${data.name} students can join communities in AI, Web Development, Startups, Placements, Coding, Design, and more on The Network.` },
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <SEOHead
        title={`${data.name} Student Community | The Network`}
        description={`Join ${data.studentCount}+ students from ${data.name} on The Network. Discover coding clubs, placement communities, hackathons, internships and campus opportunities.`}
        canonical={`/college/${slug}`}
        keywords={`${data.name} students, ${data.name} community, ${data.name} hackathon, ${data.name} placements, ${data.name} coding club, engineering students india`}
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

      <main className="max-w-4xl mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <nav className="text-sm text-white/40 mb-6">
          <Link to="/" className="hover:text-white">Home</Link>
          <span className="mx-2">/</span>
          <Link to="/colleges" className="hover:text-white">Colleges</Link>
          <span className="mx-2">/</span>
          <span className="text-white">{data.name}</span>
        </nav>

        {/* Hero */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-3">{data.name} Student Community</h1>
          <p className="text-white/60 text-lg mb-6">
            Connect with {data.studentCount}+ students from {data.name}. Discover communities, hackathons, internships and campus opportunities.
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="bg-white/10 px-4 py-2 rounded-full">{data.studentCount} Students</span>
            <span className="bg-white/10 px-4 py-2 rounded-full">{data.communities.length || data.communityCount || 0} Communities</span>
            <span className="bg-white/10 px-4 py-2 rounded-full">{data.recentEvents.length} Events</span>
          </div>
        </div>

        {/* Communities */}
        {data.communities.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">Communities at {data.name}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.communities.map(c => (
                <Link
                  key={c.slug}
                  to={`/community/${c.slug}`}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl p-4 flex justify-between items-center transition-all"
                >
                  <span className="font-medium">{c.name}</span>
                  <span className="text-white/40 text-sm">{c.memberCount} members</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Events */}
        {data.recentEvents.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">Events at {data.name}</h2>
            <div className="space-y-3">
              {data.recentEvents.map(e => (
                <div key={e.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{e.title}</p>
                    <p className="text-white/40 text-sm">{e.category}</p>
                  </div>
                  <span className="text-white/40 text-sm">{e.date}</span>
                </div>
              ))}
            </div>
            <Link to="/events" className="text-white/50 hover:text-white text-sm mt-3 inline-block">View all events →</Link>
          </section>
        )}

        {/* Top Students */}
        {data.topStudents.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">Students from {data.name}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {data.topStudents.map(s => (
                <Link
                  key={s.id}
                  to={`/student/${s.id}`}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 flex items-center gap-3 transition-all"
                >
                  <PublicAvatar
                    avatar={s.avatar}
                    name={s.fullName}
                    className="w-10 h-10 rounded-full bg-white/10 text-lg shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{s.fullName}</p>
                    <p className="text-white/40 text-xs truncate">{s.branch}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-3">Join {data.name} on The Network</h2>
          <p className="text-white/60 mb-6">Connect with your classmates. Discover opportunities. Build your network.</p>
          <a href="/" className="inline-block bg-white text-black font-semibold px-8 py-3 rounded-full hover:bg-white/90 transition-all">
            Join Now — It's Free
          </a>
        </div>
      </main>

      <footer className="border-t border-white/10 mt-16 px-4 py-8 text-center">
        <div className="flex flex-wrap justify-center gap-6 text-sm text-white/50 mb-4">
          <Link to="/colleges" className="hover:text-white">All Colleges</Link>
          <Link to="/communities" className="hover:text-white">Communities</Link>
          <Link to="/opportunities" className="hover:text-white">Opportunities</Link>
          <Link to="/events" className="hover:text-white">Events</Link>
          <Link to="/students" className="hover:text-white">Students</Link>
          <Link to="/campus-ambassador" className="hover:text-white">Campus Ambassador</Link>
        </div>
        <p className="text-white/20 text-xs">© 2025 The Network – India's Student Network</p>
      </footer>
    </div>
  );
}
