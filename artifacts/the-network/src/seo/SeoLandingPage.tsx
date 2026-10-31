import { Link } from 'react-router-dom';
import SEOHead, { SITE_URL } from './SEOHead';

type LandingPageKey =
  | 'about'
  | 'story'
  | 'study-partners'
  | 'project-teammates'
  | 'jee'
  | 'neet'
  | 'gate'
  | 'jee/study-partner'
  | 'neet/study-partner'
  | 'looking-for/study-partner'
  | 'looking-for/project-teammate'
  | 'looking-for/hackathon-team'
  | 'looking-for/mentor'
  | 'looking-for/dsa-partner';

type ConfiguredLandingPageKey = Exclude<LandingPageKey, 'jee/study-partner' | 'neet/study-partner'>;

interface LandingPageConfig {
  title: string;
  description: string;
  h1: string;
  intro: string;
  label: string;
  sections: { heading: string; body: string; items?: string[] }[];
  related: { label: string; href: string }[];
  faqs?: { question: string; answer: string }[];
  person?: { name: string; description: string; image: string };
}

const PAGES: Record<ConfiguredLandingPageKey, LandingPageConfig> = {
  about: {
    title: 'About The Network | Student Networking Platform',
    description: 'Learn about The Network and founding member Rehan Shashi, who helped build a student network connecting every campus with meaningful opportunities.',
    h1: 'About The Network',
    label: 'About',
    intro: 'The Network is a student platform built to help students connect beyond the boundaries of their school, college, city and surroundings.',
    sections: [
      { heading: 'Our mission', body: "A student's potential should not be limited by their surroundings. The right peer, resource, mentor or opportunity can change what a student believes is possible." },
      { heading: 'Our vision', body: 'Build a network where every student can find the people, knowledge and opportunities they need to learn, build and grow.' },
      { heading: 'Rehan Shashi, Founding Member', body: 'Supported The Network during its initial phase, helping build a student network where every campus and every student can find meaningful opportunities.' },
      { heading: 'What students can do here', body: 'The Network brings student discovery and collaboration into one place.', items: ['Connect with students across India', 'Find study partners and project teammates', 'Join communities for coding, DSA, AI/ML, research and more', 'Share questions, resources and opportunities'] },
    ],
    person: {
      name: 'Rehan Shashi',
      description: 'Supported The Network during its initial phase, helping build a student network where every campus and every student can find meaningful opportunities.',
      image: `${SITE_URL}/images/rehan-shashi.png`,
    },
    related: [
      { label: 'Connect with students', href: '/students' },
      { label: 'Explore student communities', href: '/communities' },
      { label: 'Find a study partner', href: '/study-partners' },
      { label: 'Find project teammates', href: '/project-teammates' },
    ],
    faqs: [
      { question: 'What is The Network?', answer: 'The Network is a student networking platform where students can connect with other students, join communities, find study partners and project teammates, share resources and learn together.' },
      { question: 'Who can join The Network?', answer: 'Students from schools, colleges and different learning communities can join The Network.' },
    ],
  },
  story: {
    title: 'Why I Started The Network | A Student Networking Platform',
    description: 'Read the story behind The Network: from a village and government school to JEE, NIT Trichy and building a wider student network.',
    h1: "I Didn't Know What Was Possible",
    label: 'Our story',
    intro: 'The Network started with a personal question: how many students are missing opportunities simply because they do not know what is possible beyond their surroundings?',
    sections: [
      { heading: 'From a village to NIT Trichy', body: 'The founder’s journey from a village and government school through JEE to NIT Trichy showed how much exposure can change a student’s path. It also made one gap impossible to ignore: talent is spread everywhere, but access to people, information and opportunities is not.' },
      { heading: 'Why The Network exists', body: 'A student in one city may have the skills another student is looking for. Someone preparing for the same exam may be studying only a few kilometres away—or in another state. The Network is being built to make those connections easier to find.' },
      { heading: 'Building beyond one campus', body: 'The goal is a student network where school and college students can learn together, find collaborators, share useful resources and discover opportunities beyond their immediate campus.' },
    ],
    related: [
      { label: 'About The Network', href: '/about' },
      { label: 'Meet students across India', href: '/students' },
      { label: 'Browse communities', href: '/communities' },
    ],
  },
  'study-partners': {
    title: 'Find Study Partners Online | The Network',
    description: 'Find students preparing for the same exams or learning the same subjects. Connect with a study partner on The Network.',
    h1: 'Find a Study Partner',
    label: 'For students',
    intro: 'Looking for someone to study with? Find students preparing for the same exam or learning the same subjects and connect with them on The Network.',
    sections: [
      { heading: 'Study with people who understand your goal', body: 'A consistent study partner can make preparation more focused and less isolating. Connect with students who share your subjects, exam plans or learning goals.', items: ['JEE study partners', 'NEET study partners', 'College exam study partners', 'Coding study partners', 'GATE study partners', 'General study partners'] },
      { heading: 'Learn together', body: 'Use communities to ask questions, share resources, discuss difficult topics and find peers who are at a similar stage of preparation.' },
    ],
    related: [
      { label: 'Find a JEE study partner', href: '/jee/study-partner' },
      { label: 'Find a DSA practice partner', href: '/looking-for/dsa-partner' },
      { label: 'Explore student communities', href: '/communities' },
      { label: 'Connect with students', href: '/students' },
    ],
    faqs: [
      { question: 'Can I find a study partner for a specific exam?', answer: 'Yes. You can connect with students preparing for the same exam, including JEE, NEET, GATE and college exams.' },
      { question: 'Can I study with someone learning the same subject?', answer: 'Yes. The Network helps students find peers with shared subjects, skills and learning goals.' },
    ],
  },
  'project-teammates': {
    title: 'Find Project Teammates | Connect With Students',
    description: 'Find project teammates from different schools and colleges. Connect with students who bring complementary skills to your next project.',
    h1: 'Find Project Teammates',
    label: 'For builders',
    intro: 'Looking for someone who knows Python, AI/ML, web development or design? Find students who are interested in building projects together.',
    sections: [
      { heading: 'Build beyond your campus', body: 'Good project teams do not always come from the same classroom. Connect with students from other schools and colleges who share your interests and bring different strengths.', items: ['Python and software development', 'AI and machine learning', 'Web and mobile development', 'UI/UX and product design', 'Hardware, robotics and electronics', 'Research and technical writing'] },
      { heading: 'Find complementary skills', body: 'Share what you are building, what you can contribute and what kind of teammate you need. Communities and student posts make it easier to find people who want to build, learn and ship together.' },
    ],
    related: [
      { label: 'Find a hackathon team', href: '/looking-for/hackathon-team' },
      { label: 'Find a project teammate', href: '/looking-for/project-teammate' },
      { label: 'Explore coding communities', href: '/communities' },
      { label: 'Browse student opportunities', href: '/opportunities' },
    ],
    faqs: [
      { question: 'Can I find teammates from another college?', answer: 'Yes. The Network is designed to help students connect with peers beyond their own school, college and city.' },
      { question: 'What kinds of project skills can I find?', answer: 'Students can connect around software, AI/ML, web development, design, robotics, research and other complementary skills.' },
    ],
  },
  jee: {
    title: 'JEE Community | Connect With JEE Aspirants Across India',
    description: 'Connect with JEE aspirants from different schools, coaching institutes and cities. Find study partners, discuss doubts and share resources.',
    h1: 'JEE Aspirants: Learn, Connect & Prepare Together',
    label: 'Exam community',
    intro: 'Connect with JEE aspirants from different schools, coaching institutes and cities. Find study partners, discuss doubts, share resources and learn together.',
    sections: [
      { heading: 'A community for JEE preparation', body: 'Preparation can feel different when you only see the people around you. Meet students working toward similar goals, compare approaches and keep each other accountable.' },
      { heading: 'Useful connections for aspirants', body: 'Find a JEE study partner, join discussions about preparation and discover resources shared by other students.', items: ['JEE study partners', 'JEE preparation discussions', 'Doubt-solving conversations', 'Notes and resource sharing'] },
    ],
    related: [
      { label: 'Find a JEE study partner', href: '/jee/study-partner' },
      { label: 'Find a study partner', href: '/study-partners' },
      { label: 'Browse all communities', href: '/communities' },
    ],
  },
  neet: {
    title: 'NEET Community | Connect With NEET Aspirants Across India',
    description: 'Connect with NEET aspirants from schools, coaching institutes and cities across India. Find study partners and prepare together.',
    h1: 'NEET Aspirants: Prepare Together',
    label: 'Exam community',
    intro: 'Find students preparing for NEET, share useful resources, discuss difficult topics and build a study routine with peers who understand the goal.',
    sections: [
      { heading: 'Find your NEET study circle', body: 'The Network helps NEET aspirants connect beyond their immediate coaching batch or school. Meet peers with similar subjects, timelines and ambitions.' },
      { heading: 'Learn with other aspirants', body: 'Join conversations, exchange preparation ideas and find a NEET study partner for regular practice and accountability.' },
    ],
    related: [
      { label: 'Find a study partner', href: '/study-partners' },
      { label: 'Explore student communities', href: '/communities' },
      { label: 'Connect with students', href: '/students' },
    ],
  },
  gate: {
    title: 'GATE Student Community | Find GATE Study Partners',
    description: 'Connect with GATE aspirants, find study partners, discuss preparation and share resources on The Network.',
    h1: 'GATE Aspirants: Study and Prepare Together',
    label: 'Exam community',
    intro: 'Find GATE aspirants who are preparing for similar papers and timelines. Share resources, discuss difficult topics and study together.',
    sections: [
      { heading: 'A wider network for GATE preparation', body: 'Connect with students beyond your coaching centre or college. Find peers who understand your paper, preparation stage and target.' },
      { heading: 'Keep preparation collaborative', body: 'Use student communities to compare study plans, exchange notes and find a consistent GATE study partner.' },
    ],
    related: [
      { label: 'Find a study partner', href: '/study-partners' },
      { label: 'Explore student communities', href: '/communities' },
      { label: 'Browse students', href: '/students' },
    ],
  },
  'looking-for/study-partner': {
    title: 'Find a Study Partner | The Network',
    description: 'Find students who are preparing for the same exam or learning the same subject. Connect and study together on The Network.',
    h1: 'Find a Study Partner',
    label: 'Looking for',
    intro: 'Tell The Network what you are learning and connect with students who want to study together.',
    sections: [
      { heading: 'What are you preparing for?', body: 'Find peers around the goals that matter to you, from JEE, NEET and GATE to college exams, coding and general learning.' },
      { heading: 'Make preparation more consistent', body: 'Study together, share resources, discuss doubts and support each other through a longer learning journey.' },
    ],
    related: [{ label: 'Study partners', href: '/study-partners' }, { label: 'JEE community', href: '/jee' }, { label: 'NEET community', href: '/neet' }],
  },
  'looking-for/project-teammate': {
    title: 'Find a Project Teammate | The Network',
    description: 'Find a student project teammate with complementary skills in coding, AI/ML, design, research and more.',
    h1: 'Find a Project Teammate',
    label: 'Looking for',
    intro: 'Have an idea or an active project? Connect with students who want to contribute and build with you.',
    sections: [
      { heading: 'Share what you are building', body: 'Describe your idea, the skills you have and the skills you need. Find students who are excited to learn and contribute.' },
      { heading: 'Build with complementary skills', body: 'Connect around coding, AI/ML, design, research, robotics, web development and other project roles.' },
    ],
    related: [{ label: 'Project teammates', href: '/project-teammates' }, { label: 'Find a hackathon team', href: '/looking-for/hackathon-team' }, { label: 'Browse opportunities', href: '/opportunities' }],
  },
  'looking-for/hackathon-team': {
    title: 'Find a Hackathon Team | Connect With Student Builders',
    description: 'Find students for your next hackathon team. Connect with coders, designers, researchers and builders on The Network.',
    h1: 'Find a Hackathon Team',
    label: 'Looking for',
    intro: 'Find the people you need for your next hackathon, from idea validation to a working demo.',
    sections: [
      { heading: 'Build a balanced team', body: 'Connect with students who bring different strengths: problem-solving, engineering, product thinking, design, pitching and research.' },
      { heading: 'Discover opportunities together', body: 'Find teammates for hackathons and student competitions, share ideas and prepare together before the event.' },
    ],
    related: [{ label: 'Project teammates', href: '/project-teammates' }, { label: 'Student opportunities', href: '/opportunities' }, { label: 'Coding communities', href: '/communities' }],
  },
  'looking-for/mentor': {
    title: 'Find a Student Mentor | Learn From Peers',
    description: 'Connect with students who can share guidance about exams, projects, coding, college life and learning goals.',
    h1: 'Find a Student Mentor',
    label: 'Looking for',
    intro: 'Find peers a little further along in a subject, project or learning journey and learn from their experience.',
    sections: [
      { heading: 'Peer guidance that is practical', body: 'Ask questions, compare approaches and learn from students who have recently worked through a similar challenge.' },
      { heading: 'Give back as you grow', body: 'The Network is built on students helping students. Share what you know and become a helpful connection for someone else.' },
    ],
    related: [{ label: 'Connect with students', href: '/students' }, { label: 'Explore communities', href: '/communities' }, { label: 'Read our story', href: '/story' }],
  },
  'looking-for/dsa-partner': {
    title: 'Find a DSA Partner | Practice DSA With Students',
    description: 'Find students who are practicing Data Structures and Algorithms. Connect, solve problems together and learn on The Network.',
    h1: 'Find a DSA Practice Partner',
    label: 'Looking for',
    intro: 'Find students who are also practicing Data Structures and Algorithms. Connect, practice problems together and learn on The Network.',
    sections: [
      { heading: 'Practice with consistency', body: 'A DSA partner can help you set a routine, explain a different approach and stay accountable through problem-solving practice.' },
      { heading: 'Learn beyond one platform', body: 'Discuss arrays, strings, trees, graphs, dynamic programming and interview preparation with students who share your goals.' },
    ],
    related: [{ label: 'Find a study partner', href: '/study-partners' }, { label: 'Explore communities', href: '/communities' }, { label: 'Find project teammates', href: '/project-teammates' }],
  },
};

function getSchema(page: LandingPageConfig, path: string) {
  const canonical = `${SITE_URL}${path}`;
  return [
    { '@context': 'https://schema.org', '@type': 'WebPage', name: page.title, description: page.description, url: canonical, isPartOf: { '@type': 'WebSite', name: 'The Network', url: SITE_URL } },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: page.label, item: canonical },
    ] },
    ...(page.person ? [{
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: page.person.name,
      description: page.person.description,
      image: page.person.image,
      mainEntityOfPage: canonical,
    }] : []),
    ...(page.faqs ? [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: page.faqs.map(faq => ({ '@type': 'Question', name: faq.question, acceptedAnswer: { '@type': 'Answer', text: faq.answer } })) }] : []),
  ];
}

export default function SeoLandingPage({ page: pageKey }: { page: LandingPageKey }) {
  const page = pageKey === 'jee/study-partner'
    ? {
        ...PAGES['looking-for/study-partner'],
        title: 'Find a JEE Study Partner | The Network',
        description: 'Find JEE aspirants who are preparing for the same exam. Connect, discuss doubts and study together on The Network.',
        h1: 'Find a JEE Study Partner',
        label: 'JEE study partner',
        intro: 'Connect with JEE aspirants from different schools, coaching institutes and cities. Prepare together, discuss doubts and stay accountable.',
        related: [{ label: 'JEE community', href: '/jee' }, { label: 'Find a study partner', href: '/study-partners' }, { label: 'Student communities', href: '/communities' }],
      }
    : pageKey === 'neet/study-partner'
      ? {
          ...PAGES['looking-for/study-partner'],
          title: 'Find a NEET Study Partner | The Network',
          description: 'Find NEET aspirants who are preparing for the same exam. Connect, share resources and study together on The Network.',
          h1: 'Find a NEET Study Partner',
          label: 'NEET study partner',
          intro: 'Connect with NEET aspirants who understand your subjects, timeline and goals. Share resources and prepare together.',
          related: [{ label: 'NEET community', href: '/neet' }, { label: 'Find a study partner', href: '/study-partners' }, { label: 'Student communities', href: '/communities' }],
        }
      : PAGES[pageKey as ConfiguredLandingPageKey];
  const path = `/${pageKey}`;

  return (
    <div className="min-h-screen bg-black text-white">
      <SEOHead title={page.title} description={page.description} canonical={path} keywords={`${page.label.toLowerCase()}, student networking platform, students across India`} schema={getSchema(page, path)} />
      <header className="border-b border-white/10 px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-tight">The Network</Link>
        <nav className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-sm text-white/60">
          <Link to="/communities" className="hover:text-white">Communities</Link>
          <Link to="/study-partners" className="hover:text-white">Study Partners</Link>
          <Link to="/project-teammates" className="hover:text-white">Project Teammates</Link>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10 sm:py-14">
        <nav className="text-sm text-white/40 mb-7" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-white">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-white">{page.label}</span>
        </nav>
        <span className="inline-flex rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-300">{page.label}</span>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">{page.h1}</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-white/65">{page.intro}</p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {page.sections.map(section => (
            <section key={section.heading} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-xl font-semibold">{section.heading}</h2>
              <p className="mt-3 leading-7 text-white/60">{section.body}</p>
              {section.items && (
                <ul className="mt-4 space-y-2 text-sm text-white/70">
                  {section.items.map(item => <li key={item} className="flex gap-2"><span className="text-indigo-300">•</span><span>{item}</span></li>)}
                </ul>
              )}
            </section>
          ))}
        </div>

        {page.faqs && (
          <section className="mt-10">
            <h2 className="text-2xl font-semibold">Frequently asked questions</h2>
            <div className="mt-4 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.03]">
              {page.faqs.map(faq => <details key={faq.question} className="p-5"><summary className="cursor-pointer font-semibold">{faq.question}</summary><p className="mt-3 leading-7 text-white/60">{faq.answer}</p></details>)}
            </div>
          </section>
        )}

        <section className="mt-10 rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-7">
          <h2 className="text-2xl font-bold">Join The Network</h2>
          <p className="mt-2 max-w-2xl text-white/65">Connect with students from schools, colleges and learning communities across India.</p>
          <Link to="/" className="mt-5 inline-flex rounded-xl bg-white px-5 py-3 font-semibold text-indigo-700 transition hover:bg-indigo-50">Join The Network</Link>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold">Explore more on The Network</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {page.related.map(link => <Link key={link.href} to={link.href} className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/75 transition hover:border-white/40 hover:text-white">{link.label}</Link>)}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-4 py-8 text-center">
        <div className="flex flex-wrap justify-center gap-5 text-sm text-white/50">
          <Link to="/about" className="hover:text-white">About</Link>
          <Link to="/story" className="hover:text-white">Our Story</Link>
          <Link to="/communities" className="hover:text-white">Communities</Link>
          <Link to="/students" className="hover:text-white">Students</Link>
          <Link to="/study-partners" className="hover:text-white">Study Partners</Link>
          <Link to="/project-teammates" className="hover:text-white">Project Teammates</Link>
        </div>
        <p className="mt-4 text-xs text-white/25">© {new Date().getFullYear()} The Network — Student Networking Platform</p>
      </footer>
    </div>
  );
}