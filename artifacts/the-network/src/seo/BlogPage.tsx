import { Link } from 'react-router-dom';
import SEOHead, { SITE_URL } from './SEOHead';

const POSTS = [
  { slug: 'best-hackathons-india-2025', title: 'Best Hackathons in India 2025', desc: 'Complete guide to the top hackathons for engineering students in India — SIH, Flipkart GRiD, Google Hashcode, and more.', category: 'Hackathons', date: 'August 2025', readTime: '8 min' },
  { slug: 'how-to-find-startup-cofounder-college', title: 'How to Find a Startup Co-founder in College', desc: 'Practical guide to finding the right co-founder during college. Where to look, what to look for, and how to evaluate fit.', category: 'Startups', date: 'July 2025', readTime: '6 min' },
  { slug: 'placement-preparation-engineering-students', title: 'Placement Preparation Guide for Engineering Students', desc: 'Complete roadmap for campus placements — DSA, system design, aptitude, HR rounds, and company-specific strategies.', category: 'Placements', date: 'July 2025', readTime: '12 min' },
  { slug: 'top-ai-communities-india-students', title: 'Top AI Communities in India for Students', desc: 'Best communities to learn AI/ML as a student in India — online and offline, free and paid options.', category: 'AI/ML', date: 'June 2025', readTime: '5 min' },
];

const CATEGORY_COLORS: Record<string, string> = {
  Hackathons: 'bg-orange-500/20 text-orange-300',
  Startups: 'bg-purple-500/20 text-purple-300',
  Placements: 'bg-blue-500/20 text-blue-300',
  'AI/ML': 'bg-green-500/20 text-green-300',
  Internships: 'bg-yellow-500/20 text-yellow-300',
  'College Life': 'bg-pink-500/20 text-pink-300',
  'Open Source': 'bg-red-500/20 text-red-300',
  Opportunities: 'bg-cyan-500/20 text-cyan-300',
};

export default function BlogPage() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'The Network Blog – Student Resources India',
    description: 'Guides, resources and articles for engineering students in India. Hackathons, internships, placements, startups and campus life.',
    url: `${SITE_URL}/blog`,
    publisher: { '@type': 'Organization', name: 'The Network', url: SITE_URL },
    blogPost: POSTS.slice(0, 5).map(p => ({
      '@type': 'BlogPosting',
      headline: p.title,
      description: p.desc,
      datePublished: p.date,
      url: `${SITE_URL}/blog/${p.slug}`,
    })),
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <SEOHead
        title="Blog – Hackathons, Internships, Placements, Startups | The Network"
        description="Articles and guides for engineering students in India. Hackathons, internships, placement prep, startup guide, AI communities and more."
        canonical="/blog"
        keywords="engineering students blog india, hackathon guide, internship guide india, placement preparation, startup guide college, AI communities india"
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
        <nav className="text-sm text-white/40 mb-6">
          <Link to="/" className="hover:text-white">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-white">Blog</span>
        </nav>

        <h1 className="text-4xl font-bold mb-2">The Network Blog</h1>
        <p className="text-white/60 text-lg mb-10">
          Guides, resources and articles for engineering students in India.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {POSTS.map(post => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl p-6 transition-all flex flex-col"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[post.category] || 'bg-white/10 text-white/60'}`}>{post.category}</span>
                <span className="text-white/30 text-xs">{post.readTime} read</span>
              </div>
              <h2 className="font-semibold text-lg leading-snug mb-2 flex-1">{post.title}</h2>
              <p className="text-white/50 text-sm line-clamp-2 mb-4">{post.desc}</p>
              <span className="text-white/30 text-xs">{post.date}</span>
            </Link>
          ))}
        </div>
      </main>

      <footer className="border-t border-white/10 mt-16 px-4 py-8 text-center">
        <div className="flex flex-wrap justify-center gap-6 text-sm text-white/50">
          <Link to="/colleges" className="hover:text-white">Colleges</Link>
          <Link to="/communities" className="hover:text-white">Communities</Link>
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
