import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Instagram, Linkedin, Share2 } from 'lucide-react';
import SEOHead, { SITE_URL } from './SEOHead';
import { API_ORIGIN } from '../api';
import { loadSeoDetail } from './data';
import PublicAvatar from './PublicAvatar';

interface CommunityDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  memberCount: number;
  college: string | null;
  members: { id: string; fullName: string; branch: string; college: string; avatar: string }[];
}

export default function CommunityPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<CommunityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [shareNotice, setShareNotice] = useState('');

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    const loadCommunity = async () => {
      try {
        const detail = await loadSeoDetail<CommunityDetail>('community', slug);
        if (cancelled) return;
        setData(detail);
        setLoading(false);
      } catch {
        if (cancelled) return;
        setNotFound(true);
        setLoading(false);
      }
    };

    void loadCommunity();
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (!data || !localStorage.getItem('network_uid')) return;
    // Signed-in students should use the full community workspace. The
    // workspace resolves the canonical slug and preserves the current session.
    const referral = new URLSearchParams(window.location.search).get('ref');
    const referralQuery = referral ? `&ref=${encodeURIComponent(referral)}` : '';
    window.location.replace(`/?community=${encodeURIComponent(data.slug)}${referralQuery}`);
  }, [data]);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = data ? `Join ${data.name} on The Network — a community for Indian college students.` : '';
  const referralCode = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('ref')
    : null;
  const signInForCommunity = () => {
    if (!data) return;
    const referral = referralCode ? `&ref=${encodeURIComponent(referralCode)}` : '';
    window.location.href = `/?community=${encodeURIComponent(data.slug)}${referral}`;
  };

  const handleJoin = async () => {
    if (!data || joining) return;
    const userId = localStorage.getItem('network_uid');
    if (!userId) {
      signInForCommunity();
      return;
    }
    setJoining(true);
    try {
      const response = await fetch(`${API_ORIGIN}/api/communities/${data.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!response.ok) throw new Error('Could not join');
      setJoined(true);
    } catch {
      setShareNotice('Please sign in again to join this community.');
    } finally {
      setJoining(false);
    }
  };

  const copyAndOpenInstagram = async () => {
    await navigator.clipboard?.writeText(shareUrl).catch(() => {});
    setShareNotice('Link copied — paste it into Instagram');
    window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="text-white/40">Loading...</div></div>;
  if (notFound || !data) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
      <h1 className="text-2xl font-bold mb-4">Community not found</h1>
      <Link to="/communities" className="text-white/60 hover:text-white">← Browse all communities</Link>
    </div>
  );

  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: `${data.name} – Student Community`,
      description: data.description,
      url: `${SITE_URL}/community/${slug}`,
      memberOf: { '@type': 'Organization', name: 'The Network', url: SITE_URL },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Communities', item: `${SITE_URL}/communities` },
        { '@type': 'ListItem', position: 3, name: data.name, item: `${SITE_URL}/community/${slug}` },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <SEOHead
        title={`${data.name} Community | Student Network India | The Network`}
        description={`Join the ${data.name} community on The Network. ${data.description.slice(0, 100)}. Connect with ${data.memberCount}+ students across India.`}
        canonical={`/community/${slug}`}
        keywords={`${data.name} community, ${data.name} students india, student ${data.category} community india, ${data.name.toLowerCase()} network`}
        schema={schema}
      />

      <header className="border-b border-white/10 px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-tight">The Network</Link>
        <nav className="flex gap-4 text-sm text-white/60">
          <Link to="/communities" className="hover:text-white">Communities</Link>
          <Link to="/colleges" className="hover:text-white">Colleges</Link>
          <Link to="/opportunities" className="hover:text-white">Opportunities</Link>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <nav className="text-sm text-white/40 mb-6">
          <Link to="/" className="hover:text-white">Home</Link>
          <span className="mx-2">/</span>
          <Link to="/communities" className="hover:text-white">Communities</Link>
          <span className="mx-2">/</span>
          <span className="text-white">{data.name}</span>
        </nav>

        <div className="mb-10">
          <span className="text-xs font-medium bg-white/10 px-3 py-1 rounded-full uppercase tracking-wide mb-4 inline-block">{data.category}</span>
          <h1 className="text-4xl font-bold mb-3">{data.name}</h1>
          <p className="text-white/60 text-lg mb-6">{data.description}</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="bg-white/10 px-4 py-2 rounded-full">{data.memberCount} Members</span>
            {data.college && <span className="bg-white/10 px-4 py-2 rounded-full">{data.college}</span>}
          </div>
          <div className="flex flex-wrap gap-2 mt-5">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white no-underline"
            >
              💬 WhatsApp
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#0A66C2] px-4 py-2.5 text-sm font-semibold text-white no-underline"
            >
              <Linkedin size={15} /> LinkedIn
            </a>
            <button onClick={copyAndOpenInstagram} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 via-rose-500 to-amber-400 px-4 py-2.5 text-sm font-semibold text-white cursor-pointer border-0">
              <Instagram size={15} /> Instagram
            </button>
            <button
              onClick={() => navigator.share?.({ title: data.name, text: shareText, url: shareUrl }).catch(() => navigator.clipboard?.writeText(shareUrl))}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-sm font-semibold text-white cursor-pointer border border-white/10"
            >
              <Share2 size={15} /> More
            </button>
          </div>
          {shareNotice && <p className="text-emerald-400 text-sm mt-3">{shareNotice}</p>}
        </div>

        {data.members.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">Members</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {data.members.slice(0, 12).map(m => (
                <Link
                  key={m.id}
                  to={`/student/${m.id}`}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 flex items-center gap-3 transition-all"
                >
                  <PublicAvatar
                    avatar={m.avatar}
                    name={m.fullName}
                    className="w-10 h-10 rounded-full bg-white/10 text-lg shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{m.fullName}</p>
                    <p className="text-white/40 text-xs truncate">{m.college}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-3">Join {data.name}</h2>
          <p className="text-white/60 mb-6">Connect with {data.memberCount}+ students interested in {data.name}.</p>
          <button onClick={handleJoin} disabled={joining || joined} className={`inline-block font-semibold px-8 py-3 rounded-full transition-all cursor-pointer border-0 ${joined ? 'bg-emerald-400 text-black' : 'bg-white text-black hover:bg-white/90'}`}>
            {joining ? 'Joining…' : joined ? '✓ You joined this community' : 'Join the Community'}
          </button>
          {!joined && <p className="text-white/40 text-xs mt-3">New here? Create your free account and you’ll be added automatically.</p>}
        </div>
      </main>

      <footer className="border-t border-white/10 mt-16 px-4 py-8 text-center">
        <div className="flex flex-wrap justify-center gap-6 text-sm text-white/50">
          <Link to="/colleges" className="hover:text-white">Colleges</Link>
          <Link to="/communities" className="hover:text-white">All Communities</Link>
          <Link to="/opportunities" className="hover:text-white">Opportunities</Link>
          <Link to="/events" className="hover:text-white">Events</Link>
          <Link to="/students" className="hover:text-white">Students</Link>
        </div>
        <p className="text-white/20 text-xs mt-4">© 2025 The Network – India's Student Network</p>
      </footer>
    </div>
  );
}
