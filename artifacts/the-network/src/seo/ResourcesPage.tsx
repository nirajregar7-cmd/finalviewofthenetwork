import { Link } from 'react-router-dom';
import SEOHead, { SITE_URL } from './SEOHead';

const RESOURCE_HUBS = [
  {
    slug: 'jee',
    title: 'JEE Preparation Resources',
    description: 'Study resources, preparation discussions and peer support for JEE aspirants.',
    href: '/jee',
  },
  {
    slug: 'coding',
    title: 'Coding Resources for Students',
    description: 'Learn programming, build projects and find coding communities with students across India.',
    href: '/communities',
  },
  {
    slug: 'ai',
    title: 'AI & Machine Learning Resources',
    description: 'Explore AI/ML communities, project ideas and peers who are learning together.',
    href: '/communities',
  },
  {
    slug: 'cybersecurity',
    title: 'Cybersecurity Resources',
    description: 'Find safe, practical cybersecurity learning resources and a community of student builders.',
    href: '/communities',
  },
  {
    slug: 'student-life',
    title: 'Student Life Resources',
    description: 'Discover campus opportunities, events, communities and connections beyond your surroundings.',
    href: '/opportunities',
  },
];

export default function ResourcesPage() {
  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Student Resources | The Network',
      description: 'Guides, communities and learning resources for students across India.',
      url: `${SITE_URL}/resources`,
      isPartOf: { '@type': 'WebSite', name: 'The Network', url: SITE_URL },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Resources', item: `${SITE_URL}/resources` },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <SEOHead
        title="Student Resources | Learn, Build & Connect | The Network"
        description="Explore study resources, coding communities, AI/ML learning, cybersecurity guidance and student opportunities on The Network."
        canonical="/resources"
        keywords="student resources india, JEE resources, coding resources students, AI learning resources, cybersecurity students, student opportunities"
        schema={schema}
      />

      <header className="border-b border-white/10 px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-tight">The Network</Link>
        <nav className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-sm text-white/60">
          <Link to="/communities" className="hover:text-white">Communities</Link>
          <Link to="/study-partners" className="hover:text-white">Study Partners</Link>
          <Link to="/opportunities" className="hover:text-white">Opportunities</Link>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 sm:py-14">
        <nav className="text-sm text-white/40 mb-7" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-white">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-white">Resources</span>
        </nav>

        <span className="inline-flex rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-300">
          Learn with students
        </span>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Student Resources to Learn, Build & Connect</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-white/65">
          Find useful learning paths, communities, opportunities and people to learn with. The Network brings student resources and peer collaboration together in one place.
        </p>

        <section className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-labelledby="resource-hubs-heading">
          <h2 id="resource-hubs-heading" className="sr-only">Student resource categories</h2>
          {RESOURCE_HUBS.map(resource => (
            <Link
              key={resource.slug}
              to={resource.href}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:border-indigo-300/40 hover:bg-white/[0.07]"
            >
              <h2 className="text-xl font-semibold">{resource.title}</h2>
              <p className="mt-3 leading-7 text-white/60">{resource.description}</p>
              <span className="mt-5 inline-flex text-sm font-semibold text-indigo-300">Explore resources →</span>
            </Link>
          ))}
        </section>

        <section className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-7">
          <h2 className="text-2xl font-semibold">Learn with the right people</h2>
          <p className="mt-3 max-w-3xl leading-7 text-white/60">
            Resources become more useful when you can ask questions, compare approaches and stay accountable. Join student communities, find a study partner or connect with a project teammate.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/study-partners" className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/75 hover:border-white/40 hover:text-white">Find a study partner</Link>
            <Link to="/project-teammates" className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/75 hover:border-white/40 hover:text-white">Find project teammates</Link>
            <Link to="/communities" className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/75 hover:border-white/40 hover:text-white">Browse communities</Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-4 py-8 text-center">
        <div className="flex flex-wrap justify-center gap-5 text-sm text-white/50">
          <Link to="/about" className="hover:text-white">About</Link>
          <Link to="/story" className="hover:text-white">Our Story</Link>
          <Link to="/communities" className="hover:text-white">Communities</Link>
          <Link to="/study-partners" className="hover:text-white">Study Partners</Link>
          <Link to="/project-teammates" className="hover:text-white">Project Teammates</Link>
        </div>
        <p className="mt-4 text-xs text-white/25">© {new Date().getFullYear()} The Network — Student Networking Platform</p>
      </footer>
    </div>
  );
}