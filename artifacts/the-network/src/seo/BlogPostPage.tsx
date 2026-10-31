import { Link, useParams } from 'react-router-dom';
import SEOHead, { SITE_URL } from './SEOHead';

// Article content keyed by slug
const ARTICLES: Record<string, {
  title: string; category: string; date: string; desc: string; content: string[];
}> = {
  'best-hackathons-india-2025': {
    title: 'Best Hackathons in India 2025',
    category: 'Hackathons', date: 'August 2025',
    desc: 'Complete guide to the top hackathons for engineering students in India — SIH, Flipkart GRiD, Google Hashcode, and more.',
    content: [
      'Hackathons are one of the best ways for engineering students to build skills, network, and win recognition. India hosts some of the world\'s largest hackathons with thousands of participants every year.',
      '## 1. Smart India Hackathon (SIH)',
      'SIH is the world\'s biggest open innovation model organized by the Ministry of Education. Students solve real-world problems for government ministries and departments. Over 1 million students participate every year. Teams of 6. Both Software and Hardware editions. Winners get cash prizes and potential government contracts.',
      '## 2. Flipkart GRiD',
      'One of India\'s most prestigious industry hackathons. Covers robotics, software engineering, and supply chain. Top performers receive internship and PPO offers. Open to 2nd, 3rd and final year students.',
      '## 3. Google Hash Code',
      'Team-based programming competition by Google. Problems are real engineering challenges from Google. Indian teams consistently rank in the global top 10. Great for your resume and Google interview prep.',
      '## 4. Microsoft Imagine Cup',
      'Global innovation contest by Microsoft. Categories include AI, gaming, and mixed reality. Indian students have won multiple times globally. Microsoft Azure credits and mentorship for participants.',
      '## 5. Tata Imagination Challenge',
      'National competition for students to solve India\'s biggest problems. Strong industry mentorship. Cash prizes and internship opportunities. All disciplines welcome, not just engineering.',
      '## Tips to Win Hackathons',
      'Start with a real problem — judges favor solutions that address genuine pain points. Build a working prototype, not just slides. Practice presenting in 2-minute demos. Find teammates with complementary skills — one designer, one backend dev, one presenter.',
      '## Find Hackathon Teammates on The Network',
      'Join The Network to connect with students from IITs, NITs, and top colleges looking for hackathon teammates. Post your skills, find your team, and win together.',
    ],
  },
  'how-to-find-startup-cofounder-college': {
    title: 'How to Find a Startup Co-founder in College',
    category: 'Startups', date: 'July 2025',
    desc: 'Practical guide to finding the right co-founder during college.',
    content: [
      'Finding the right co-founder is one of the most important decisions you\'ll make as a founder. The right partner can 10x your chances of success. The wrong one can destroy your startup before it starts.',
      '## Where to Find Co-founders in College',
      'Hackathons are the best place. You see how someone works under pressure, with a deadline, and in a team. If you build something great together in 24 hours, you know you can work together.',
      'College clubs — coding clubs, entrepreneurship cells (E-Cells), design clubs — are where motivated students gather. E-Cell events often connect aspiring founders.',
      'Online communities like The Network connect students across colleges. You can find a CS student from IIT Delhi and a business student from IIM if you\'re looking for a technical+business co-founder pair.',
      '## What to Look For in a Co-founder',
      'Complementary skills — if you\'re technical, look for someone business-oriented and vice versa. Shared values and work ethic — differences here destroy partnerships. Commitment level — part-time vs full-time expectations must align. Honest communication — you need someone you can disagree with productively.',
      '## Red Flags to Avoid',
      'Someone who only talks about the idea but never builds. Someone who disappears during execution. Someone who won\'t share equity fairly. Someone who can\'t handle feedback or criticism.',
      '## The Co-founder Agreement',
      'Before you\'re "official" co-founders, agree on equity split, vesting schedule, roles and responsibilities, and what happens if one of you leaves. Do this in writing, even informally.',
    ],
  },
  'placement-preparation-engineering-students': {
    title: 'Placement Preparation Guide for Engineering Students',
    category: 'Placements', date: 'July 2025',
    desc: 'Complete roadmap for campus placements — DSA, system design, aptitude, HR rounds.',
    content: [
      'Campus placements at top companies require 6-12 months of focused preparation. This guide gives you the complete roadmap.',
      '## Phase 1: Data Structures & Algorithms (6 months before)',
      'DSA is the foundation of every technical interview. Master arrays, strings, linked lists, trees, graphs, dynamic programming and greedy algorithms. Practice on LeetCode, Codeforces and GeeksForGeeks. Target 200+ problems across difficulty levels.',
      '## Phase 2: System Design (3-4 months before)',
      'For senior roles and top companies, system design matters. Learn about databases, caching, load balancing, microservices, and distributed systems. "Designing Data-Intensive Applications" by Martin Kleppmann is the gold standard book.',
      '## Phase 3: Aptitude & Reasoning (2-3 months before)',
      'Most companies have aptitude rounds. Practice quantitative, verbal and logical reasoning. IndiaBix, PrepInsta, and Placement Season apps are good resources. Speed matters as much as accuracy.',
      '## Phase 4: Projects & Resume (3-4 months before)',
      'Build 2-3 strong projects. One web/mobile app, one that uses your core CS skills. Deploy them — GitHub and live links both matter. Quantify everything on your resume: "Reduced API response time by 40%", not "Worked on backend".',
      '## Phase 5: Company-Specific Prep (1-2 months before)',
      'Research each company\'s culture, products and interview style. Amazon focuses on leadership principles. Google focuses on algorithms. Microsoft focuses on coding + culture fit. Practice mock interviews with peers.',
      '## The Mindset',
      'Placements are a numbers game. Apply everywhere, practice every day, and don\'t be discouraged by rejections. Every rejection is data that makes your next interview better.',
    ],
  },
  'top-ai-communities-india-students': {
    title: 'Top AI Communities in India for Students',
    category: 'AI/ML', date: 'June 2025',
    desc: 'Best communities to learn AI/ML as a student in India.',
    content: [
      'India\'s AI ecosystem is booming. Here are the best communities for students to learn, network and grow in the AI space.',
      '## 1. The Network – AI Community',
      'Students from IITs, NITs and top colleges interested in AI/ML connect on The Network. Share projects, discuss papers, find research collaborators and discover AI opportunities. One of the fastest growing student AI communities in India.',
      '## 2. TFUG (TensorFlow User Groups)',
      'Google\'s official TensorFlow user groups across Indian cities — Bangalore, Mumbai, Delhi, Hyderabad, Pune. Regular meetups, workshops, and study jams. Free to join.',
      '## 3. GDSC (Google Developer Student Clubs)',
      'Every college can have a GDSC. They run ML study jams, workshops, and solution challenges. Great for hands-on learning and Google certifications.',
      '## 4. Papers With Code India Discord',
      'Active community for researchers and advanced students. Discuss latest AI papers, implementations, and research directions.',
      '## What to Build in AI',
      'Start with supervised learning — image classification, text classification. Move to NLP — fine-tuning LLMs, building chatbots. Then generative AI — diffusion models, RAG systems. Always deploy your models and share them publicly.',
    ],
  },
};

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? ARTICLES[slug] : null;

  if (!article) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
      <h1 className="text-2xl font-bold mb-4">Article not found</h1>
      <Link to="/blog" className="text-white/60 hover:text-white">← Back to Blog</Link>
    </div>
  );

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.desc,
    datePublished: article.date,
    publisher: { '@type': 'Organization', name: 'The Network', url: SITE_URL },
    mainEntityOfPage: `${SITE_URL}/blog/${slug}`,
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <SEOHead
        title={`${article.title} | The Network Blog`}
        description={article.desc}
        canonical={`/blog/${slug}`}
        keywords={`${article.title.toLowerCase()}, ${article.category.toLowerCase()} india, engineering students india`}
        schema={schema}
      />

      <header className="border-b border-white/10 px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-tight">The Network</Link>
        <nav className="flex gap-4 text-sm text-white/60">
          <Link to="/blog" className="hover:text-white">Blog</Link>
          <Link to="/communities" className="hover:text-white">Communities</Link>
          <Link to="/opportunities" className="hover:text-white">Opportunities</Link>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <nav className="text-sm text-white/40 mb-6">
          <Link to="/" className="hover:text-white">Home</Link>
          <span className="mx-2">/</span>
          <Link to="/blog" className="hover:text-white">Blog</Link>
          <span className="mx-2">/</span>
          <span className="text-white truncate">{article.title}</span>
        </nav>

        <span className="text-xs font-medium bg-white/10 px-3 py-1 rounded-full uppercase tracking-wide inline-block mb-4">{article.category}</span>
        <h1 className="text-4xl font-bold mb-4 leading-tight">{article.title}</h1>
        <p className="text-white/40 text-sm mb-10">{article.date}</p>

        <article className="prose-invert space-y-5">
          {article.content.map((para, i) => {
            if (para.startsWith('## ')) {
              return <h2 key={i} className="text-2xl font-semibold mt-8 mb-3">{para.slice(3)}</h2>;
            }
            return <p key={i} className="text-white/70 leading-relaxed">{para}</p>;
          })}
        </article>

        <div className="mt-12 bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Join India's Student Network</h2>
          <p className="text-white/60 mb-6">Connect with students from IITs, NITs, and colleges across India.</p>
          <a href="/" className="inline-block bg-white text-black font-semibold px-8 py-3 rounded-full hover:bg-white/90 transition-all">
            Join The Network — Free
          </a>
        </div>
      </main>

      <footer className="border-t border-white/10 mt-16 px-4 py-8 text-center">
        <div className="flex flex-wrap justify-center gap-6 text-sm text-white/50">
          <Link to="/colleges" className="hover:text-white">Colleges</Link>
          <Link to="/communities" className="hover:text-white">Communities</Link>
          <Link to="/opportunities" className="hover:text-white">Opportunities</Link>
          <Link to="/events" className="hover:text-white">Events</Link>
          <Link to="/blog" className="hover:text-white">Blog</Link>
        </div>
        <p className="text-white/20 text-xs mt-4">© 2025 The Network – India's Student Network</p>
      </footer>
    </div>
  );
}
