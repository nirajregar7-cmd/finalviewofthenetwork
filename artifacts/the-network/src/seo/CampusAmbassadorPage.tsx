import { Link } from 'react-router-dom';
import SEOHead, { SITE_URL } from './SEOHead';

export default function CampusAmbassadorPage() {
  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      title: 'Campus Ambassador – The Network',
      description: 'Become the face of The Network on your campus. Grow the community, host events, and earn rewards.',
      hiringOrganization: { '@type': 'Organization', name: 'The Network', url: SITE_URL },
      jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressCountry: 'IN' } },
      employmentType: 'VOLUNTEER',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'What is the Campus Ambassador program?', acceptedAnswer: { '@type': 'Answer', text: 'Campus Ambassadors represent The Network at their college. They grow the student community, host events, and earn exclusive rewards and recognition.' } },
        { '@type': 'Question', name: 'Who can become a Campus Ambassador?', acceptedAnswer: { '@type': 'Answer', text: 'Any enrolled student from any college in India can apply. We look for leadership, communication skills, and passion for student communities.' } },
        { '@type': 'Question', name: 'What do Campus Ambassadors get?', acceptedAnswer: { '@type': 'Answer', text: 'Exclusive badge, priority access to opportunities, certificate, networking with students across India, and direct support from The Network team.' } },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <SEOHead
        title="Campus Ambassador Program India | Represent The Network | Apply Now"
        description="Become a Campus Ambassador for The Network at your college. Lead the student community, host events, earn rewards and build your leadership profile. Apply now."
        canonical="/campus-ambassador"
        keywords="campus ambassador program india, student ambassador program, college ambassador, campus representative, student leadership india"
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

      <main className="max-w-3xl mx-auto px-4 py-10">
        <nav className="text-sm text-white/40 mb-6">
          <Link to="/" className="hover:text-white">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-white">Campus Ambassador</span>
        </nav>

        {/* Hero */}
        <div className="mb-12 text-center">
          <span className="text-5xl mb-6 inline-block">🏆</span>
          <h1 className="text-4xl font-bold mb-4">Campus Ambassador Program</h1>
          <p className="text-white/60 text-lg">Be the face of The Network at your college. Lead. Grow. Earn recognition.</p>
        </div>

        {/* Benefits */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">What You Get</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: '🎖️', title: 'Exclusive Badge', desc: 'Campus Ambassador badge on your profile, visible to all students.' },
              { icon: '🎓', title: 'Certificate', desc: 'Official recognition letter to add to your resume and LinkedIn.' },
              { icon: '🔗', title: 'Pan-India Network', desc: 'Connect with ambassadors from IITs, NITs and 500+ colleges.' },
              { icon: '🚀', title: 'Priority Access', desc: 'First access to new features, opportunities and events.' },
              { icon: '👥', title: 'Leadership Experience', desc: 'Real community building experience valued by top recruiters.' },
              { icon: '💬', title: 'Direct Support', desc: 'Direct access to The Network founding team for guidance.' },
            ].map(b => (
              <div key={b.title} className="bg-white/5 border border-white/10 rounded-xl p-5">
                <span className="text-2xl mb-2 inline-block">{b.icon}</span>
                <h3 className="font-semibold mb-1">{b.title}</h3>
                <p className="text-white/50 text-sm">{b.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* What you do */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">What Ambassadors Do</h2>
          <div className="space-y-3">
            {[
              'Onboard students from your college to The Network',
              'Host campus events, hackathon teams, and study groups',
              'Share opportunities with your college community',
              'Give feedback to help us build better features',
              'Be the point of contact for The Network at your campus',
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-green-400 mt-0.5">✓</span>
                <span className="text-white/70">{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">FAQ</h2>
          <div className="space-y-4">
            {[
              { q: 'Who can apply?', a: 'Any enrolled student from any college in India. We especially welcome students with leadership experience in clubs or student bodies.' },
              { q: 'How much time does it take?', a: 'About 2-4 hours per week. Enough to make a real impact without affecting your studies.' },
              { q: 'Is it paid?', a: 'It\'s not paid but the experience, network, and recognition are extremely valuable for your career and profile.' },
              { q: 'How long is the program?', a: 'One semester, with the option to renew. Top ambassadors are recognized at the end of each semester.' },
            ].map(({ q, a }) => (
              <div key={q} className="bg-white/5 border border-white/10 rounded-xl p-5">
                <h3 className="font-semibold mb-2">{q}</h3>
                <p className="text-white/60 text-sm">{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="bg-white text-black rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-3">Apply to Be a Campus Ambassador</h2>
          <p className="text-black/60 mb-6">Join students from 100+ colleges representing The Network at their campus.</p>
          <a href="/" className="inline-block bg-black text-white font-semibold px-8 py-3 rounded-full hover:bg-black/80 transition-all">
            Apply Now on The Network →
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
