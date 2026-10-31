import { Link } from 'react-router-dom';
import SEOHead, { SITE_URL } from './SEOHead';

const OPPORTUNITIES = [
  { slug: 'smart-india-hackathon', title: 'Smart India Hackathon', org: 'Government of India', type: 'Hackathon', desc: 'India\'s largest hackathon for engineering students. Solve real-world problems for government ministries.' },
  { slug: 'flipkart-grid', title: 'Flipkart GRiD', org: 'Flipkart', type: 'Hackathon', desc: 'Engineering challenge by Flipkart for undergraduate students. Compete in robotics, software and supply chain.' },
  { slug: 'google-summer-of-code', title: 'Google Summer of Code', org: 'Google', type: 'Internship', desc: 'Paid open source internship by Google for students. Work on real open source projects over the summer.' },
  { slug: 'microsoft-engage', title: 'Microsoft Engage', org: 'Microsoft', type: 'Internship', desc: 'Microsoft\'s mentorship program and internship for engineering students across India.' },
  { slug: 'amazon-sde-internship', title: 'Amazon SDE Internship', org: 'Amazon', type: 'Internship', desc: 'Software development engineering internship at Amazon for penultimate year students.' },
  { slug: 'fossasia-hackathon', title: 'FOSSASIA Summit', org: 'FOSSASIA', type: 'Hackathon', desc: 'Open source hackathon connecting student developers across Asia.' },
  { slug: 'icpc-asia', title: 'ICPC Asia Regionals', org: 'ICPC Foundation', type: 'Competition', desc: 'International Collegiate Programming Contest regional rounds for top competitive programmers.' },
  { slug: 'tata-imagination-challenge', title: 'Tata Imagination Challenge', org: 'Tata Group', type: 'Competition', desc: 'National level idea competition for students to solve India\'s biggest challenges.' },
  { slug: 'goldman-sachs-internship', title: 'Goldman Sachs Engineering Campus Hiring', org: 'Goldman Sachs', type: 'Internship', desc: 'Technology internship at Goldman Sachs for engineering students interested in fintech.' },
  { slug: 'adobe-gensolve', title: 'Adobe GenSolve', org: 'Adobe', type: 'Hackathon', desc: 'Creative and technical hackathon for students by Adobe India.' },
  { slug: 'scholarship-prime-minister', title: 'Prime Minister Scholarship Scheme', org: 'Government of India', type: 'Scholarship', desc: 'Scholarships for wards of ex-servicemen and ex-coastguard pursuing technical and professional education.' },
  { slug: 'kvpy', title: 'KVPY Fellowship', org: 'Department of Science & Technology', type: 'Scholarship', desc: 'Kishore Vaigyanik Protsahan Yojana – fellowship for students pursuing basic sciences.' },
];

const TYPE_COLORS: Record<string, string> = {
  Hackathon: 'bg-orange-500/20 text-orange-300',
  Internship: 'bg-blue-500/20 text-blue-300',
  Competition: 'bg-purple-500/20 text-purple-300',
  Scholarship: 'bg-green-500/20 text-green-300',
  Research: 'bg-yellow-500/20 text-yellow-300',
};

export default function OpportunitiesPage() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Engineering Student Opportunities India | Hackathons, Internships, Scholarships',
    itemListElement: OPPORTUNITIES.map((o, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: o.title,
      url: `${SITE_URL}/opportunity/${o.slug}`,
    })),
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <SEOHead
        title="Student Opportunities India | Hackathons, Internships, Scholarships | The Network"
        description="Discover hackathons, internships, scholarships and competitions for engineering students in India. Smart India Hackathon, Google Summer of Code, Flipkart GRiD and more."
        canonical="/opportunities"
        keywords="hackathons india, engineering internships india, student scholarships india, student competitions, smart india hackathon, google summer of code, flipkart grid"
        schema={schema}
      />

      <header className="border-b border-white/10 px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-tight">The Network</Link>
        <nav className="flex gap-4 text-sm text-white/60">
          <Link to="/colleges" className="hover:text-white">Colleges</Link>
          <Link to="/communities" className="hover:text-white">Communities</Link>
          <Link to="/events" className="hover:text-white">Events</Link>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <nav className="text-sm text-white/40 mb-6">
          <Link to="/" className="hover:text-white">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-white">Opportunities</span>
        </nav>

        <h1 className="text-4xl font-bold mb-2">Student Opportunities in India</h1>
        <p className="text-white/60 text-lg mb-10">
          Hackathons, internships, competitions and scholarships for engineering students across India.
        </p>

        <div className="space-y-4">
          {OPPORTUNITIES.map(o => (
            <Link
              key={o.slug}
              to={`/opportunity/${o.slug}`}
              className="block bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl p-6 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[o.type] || 'bg-white/10 text-white/60'}`}>{o.type}</span>
                    <span className="text-xs text-white/40">{o.org}</span>
                  </div>
                  <h2 className="font-semibold text-lg mb-2">{o.title}</h2>
                  <p className="text-white/50 text-sm">{o.desc}</p>
                </div>
                <span className="text-white/30 text-xl shrink-0">→</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-3">Find More Opportunities</h2>
          <p className="text-white/60 mb-6">Join The Network to discover opportunities shared by students and colleges across India.</p>
          <a href="/" className="inline-block bg-white text-black font-semibold px-8 py-3 rounded-full hover:bg-white/90 transition-all">
            Join The Network
          </a>
        </div>
      </main>

      <footer className="border-t border-white/10 mt-16 px-4 py-8 text-center">
        <div className="flex flex-wrap justify-center gap-6 text-sm text-white/50">
          <Link to="/colleges" className="hover:text-white">Colleges</Link>
          <Link to="/communities" className="hover:text-white">Communities</Link>
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
