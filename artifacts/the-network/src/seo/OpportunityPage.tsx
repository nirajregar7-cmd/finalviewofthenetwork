import { Link, useParams } from 'react-router-dom';
import SEOHead, { SITE_URL } from './SEOHead';

const OPPORTUNITIES: Record<string, {
  title: string; org: string; type: string; desc: string;
  fullDesc: string; eligibility: string[]; deadline: string; link: string;
}> = {
  'smart-india-hackathon': {
    title: 'Smart India Hackathon', org: 'Ministry of Education, Govt. of India', type: 'Hackathon',
    desc: 'India\'s largest hackathon for engineering students. Solve real-world problems.',
    fullDesc: 'Smart India Hackathon (SIH) is a nationwide initiative to provide students a platform where they can solve some of the pressing problems we face in our daily lives. It also inculcates a culture of product innovation and a mindset of problem-solving. Over 1 million students participate every year across thousands of colleges.',
    eligibility: ['UG/PG students from recognized institutions', 'Teams of 6 members', 'All engineering branches eligible'],
    deadline: 'Check official website', link: 'https://www.sih.gov.in',
  },
  'flipkart-grid': {
    title: 'Flipkart GRiD', org: 'Flipkart', type: 'Hackathon',
    desc: 'Engineering challenge by Flipkart for undergraduate students.',
    fullDesc: 'Flipkart GRiD is an engineering challenge for undergraduate students. It covers domains like robotics, software engineering, and supply chain innovation. Top performers get internship and PPO offers from Flipkart.',
    eligibility: ['B.Tech/BE students (2nd, 3rd, 4th year)', 'CSE, ECE, Mechanical and allied branches', 'Individual or team participation'],
    deadline: 'Check official website', link: 'https://dare2compete.com/flipkart',
  },
  'google-summer-of-code': {
    title: 'Google Summer of Code', org: 'Google', type: 'Internship',
    desc: 'Paid open source internship program by Google for students worldwide.',
    fullDesc: 'Google Summer of Code (GSoC) is a global program focused on bringing more student developers into open source software development. Students work with an open source organization on a 3-month programming project during their break from school. Stipend ranges from $1500–$6600 USD.',
    eligibility: ['Students 18+ enrolled in an accredited university', 'Basic programming knowledge required', 'Strong interest in open source'],
    deadline: 'March–April every year', link: 'https://summerofcode.withgoogle.com',
  },
  'microsoft-engage': {
    title: 'Microsoft Engage', org: 'Microsoft', type: 'Internship',
    desc: 'Microsoft\'s mentorship and internship program for engineering students.',
    fullDesc: 'Microsoft Engage is a mentorship program designed for second-year engineering students. It offers live mentorship sessions, hackathons, and a chance to secure internship offers at Microsoft.',
    eligibility: ['2nd year B.Tech/BE students', 'CSE, IT, ECE branches preferred', 'Strong problem solving skills'],
    deadline: 'Check Microsoft careers portal', link: 'https://careers.microsoft.com',
  },
  'amazon-sde-internship': {
    title: 'Amazon SDE Internship', org: 'Amazon', type: 'Internship',
    desc: 'Software development internship at Amazon for penultimate year students.',
    fullDesc: 'Amazon\'s Software Development Engineering internship is one of the most sought-after internships for engineering students in India. Interns work on real products used by millions of customers. Strong DSA and system design skills are required.',
    eligibility: ['Penultimate year B.Tech/BE/M.Tech', 'CSE, IT or related branches', 'Strong DSA and coding skills'],
    deadline: 'August–October (for summer internship)', link: 'https://amazon.jobs',
  },
  'fossasia-hackathon': { title: 'FOSSASIA Summit', org: 'FOSSASIA', type: 'Hackathon', desc: 'Open source hackathon for student developers across Asia.', fullDesc: 'FOSSASIA is an open source organization that brings together developers and students across Asia to collaborate on open source projects. Hackathons, code sprints and talks are organized for students.', eligibility: ['All students with interest in open source', 'Any branch/year'], deadline: 'Annual — check official site', link: 'https://fossasia.org' },
  'icpc-asia': { title: 'ICPC Asia Regionals', org: 'ICPC Foundation', type: 'Competition', desc: 'International Collegiate Programming Contest for top competitive programmers.', fullDesc: 'The International Collegiate Programming Contest (ICPC) is the world\'s most prestigious competitive programming contest. Top teams from Asia regionals advance to the ICPC World Finals. It tests algorithms, data structures, and team problem-solving under time pressure.', eligibility: ['Teams of 3 students from same institution', 'Any year/branch', 'Strong competitive programming background'], deadline: 'September–December (Asia Regionals)', link: 'https://icpc.global' },
  'tata-imagination-challenge': { title: 'Tata Imagination Challenge', org: 'Tata Group', type: 'Competition', desc: 'National idea competition to solve India\'s biggest challenges.', fullDesc: 'The Tata Imagination Challenge invites young students to present innovative solutions to real-world Indian challenges. Winners get mentorship, internship opportunities, and cash prizes from the Tata Group.', eligibility: ['Students from recognized institutions', 'Teams accepted'], deadline: 'Check official website', link: 'https://www.tata.com' },
  'goldman-sachs-internship': { title: 'Goldman Sachs Engineering Campus Hiring', org: 'Goldman Sachs', type: 'Internship', desc: 'Technology internship at Goldman Sachs for engineering students.', fullDesc: 'Goldman Sachs hires engineering students for its technology division in India. The internship covers software engineering, quantitative analysis, and financial technology. Strong coding and math skills are preferred.', eligibility: ['Penultimate year B.Tech/BE students', 'CSE, Mathematics/Computing branches', 'Strong programming and analytical skills'], deadline: 'August–September (campus hiring)', link: 'https://www.goldmansachs.com/careers' },
  'adobe-gensolve': { title: 'Adobe GenSolve', org: 'Adobe', type: 'Hackathon', desc: 'Creative and technical hackathon for students by Adobe India.', fullDesc: 'Adobe GenSolve is a national hackathon for engineering students in India that combines creativity with technology. Participants build innovative solutions using Adobe\'s APIs and tools. Winners receive prizes and internship opportunities.', eligibility: ['B.Tech/BE students', 'All branches welcome', 'Creative problem-solving skills a plus'], deadline: 'Annual — check official site', link: 'https://www.adobe.com/in/careers' },
  'scholarship-prime-minister': { title: 'Prime Minister Scholarship Scheme', org: 'Government of India', type: 'Scholarship', desc: 'Scholarships for wards of ex-servicemen pursuing technical education.', fullDesc: 'The Prime Minister\'s Scholarship Scheme (PMSS) provides scholarships to wards and widows of ex-servicemen/ex-coastguard for pursuing technical and professional courses. Up to ₹3000 per month for boys and ₹3500 per month for girls.', eligibility: ['Wards of ex-servicemen/ex-coastguard', 'Enrolled in professional/technical course', 'Minimum 60% in qualifying examination'], deadline: 'Check KSB portal', link: 'https://ksb.gov.in' },
  'kvpy': { title: 'KVPY Fellowship', org: 'Department of Science & Technology', type: 'Scholarship', desc: 'Fellowship for students pursuing basic sciences.', fullDesc: 'Kishore Vaigyanik Protsahan Yojana (KVPY) is a fellowship funded by the Department of Science and Technology for students pursuing basic science courses. Fellows receive a monthly fellowship and contingency grant during their studies.', eligibility: ['Students in XI, XII or 1st year of undergraduate science', 'Indian nationals only', 'Must clear KVPY aptitude test'], deadline: 'July–August (application)', link: 'http://kvpy.iisc.ernet.in' },
};

export default function OpportunityPage() {
  const { slug } = useParams<{ slug: string }>();
  const opp = slug ? OPPORTUNITIES[slug] : null;

  if (!opp) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
      <h1 className="text-2xl font-bold mb-4">Opportunity not found</h1>
      <Link to="/opportunities" className="text-white/60 hover:text-white">← Browse all opportunities</Link>
    </div>
  );

  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': opp.type === 'Scholarship' ? 'Scholarship' : 'Event',
      name: opp.title,
      description: opp.fullDesc,
      organizer: { '@type': 'Organization', name: opp.org },
      url: opp.link,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Opportunities', item: `${SITE_URL}/opportunities` },
        { '@type': 'ListItem', position: 3, name: opp.title, item: `${SITE_URL}/opportunity/${slug}` },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <SEOHead
        title={`${opp.title} ${new Date().getFullYear()} – ${opp.type} for Engineering Students | The Network`}
        description={`${opp.title} by ${opp.org}. ${opp.desc} Find hackathon teams, discuss strategies and connect with students on The Network.`}
        canonical={`/opportunity/${slug}`}
        keywords={`${opp.title}, ${opp.title.toLowerCase()} ${new Date().getFullYear()}, ${opp.org.toLowerCase()} ${opp.type.toLowerCase()}, ${opp.type.toLowerCase()} engineering students india`}
        schema={schema}
      />

      <header className="border-b border-white/10 px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-tight">The Network</Link>
        <nav className="flex gap-4 text-sm text-white/60">
          <Link to="/opportunities" className="hover:text-white">Opportunities</Link>
          <Link to="/events" className="hover:text-white">Events</Link>
          <Link to="/communities" className="hover:text-white">Communities</Link>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <nav className="text-sm text-white/40 mb-6">
          <Link to="/" className="hover:text-white">Home</Link>
          <span className="mx-2">/</span>
          <Link to="/opportunities" className="hover:text-white">Opportunities</Link>
          <span className="mx-2">/</span>
          <span className="text-white">{opp.title}</span>
        </nav>

        <span className="text-xs font-medium bg-white/10 px-3 py-1 rounded-full uppercase tracking-wide inline-block mb-4">{opp.type}</span>
        <h1 className="text-4xl font-bold mb-2">{opp.title}</h1>
        <p className="text-white/50 mb-8">by {opp.org}</p>

        <p className="text-white/70 text-lg leading-relaxed mb-8">{opp.fullDesc}</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Eligibility</h2>
          <ul className="space-y-2">
            {opp.eligibility.map((e, i) => (
              <li key={i} className="flex items-start gap-2 text-white/60">
                <span className="text-green-400 mt-0.5">✓</span>
                <span>{e}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">Deadline</h2>
          <p className="text-white/60">{opp.deadline}</p>
        </section>

        <div className="flex gap-4 flex-wrap mb-12">
          <a href={opp.link} target="_blank" rel="noopener noreferrer" className="bg-white text-black font-semibold px-6 py-3 rounded-full hover:bg-white/90 transition-all">
            Apply / Learn More →
          </a>
          <a href="/" className="border border-white/20 text-white px-6 py-3 rounded-full hover:bg-white/5 transition-all">
            Find Teammates on The Network
          </a>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Find Teammates for {opp.title}</h2>
          <p className="text-white/60 mb-6">Connect with students preparing for {opp.title} on The Network. Form teams, share resources and collaborate.</p>
          <a href="/" className="inline-block bg-white text-black font-semibold px-8 py-3 rounded-full hover:bg-white/90 transition-all">
            Join The Network — Free
          </a>
        </div>
      </main>

      <footer className="border-t border-white/10 mt-16 px-4 py-8 text-center">
        <div className="flex flex-wrap justify-center gap-6 text-sm text-white/50">
          <Link to="/colleges" className="hover:text-white">Colleges</Link>
          <Link to="/communities" className="hover:text-white">Communities</Link>
          <Link to="/events" className="hover:text-white">Events</Link>
          <Link to="/students" className="hover:text-white">Students</Link>
          <Link to="/opportunities" className="hover:text-white">All Opportunities</Link>
        </div>
        <p className="text-white/20 text-xs mt-4">© 2025 The Network – India's Student Network</p>
      </footer>
    </div>
  );
}
