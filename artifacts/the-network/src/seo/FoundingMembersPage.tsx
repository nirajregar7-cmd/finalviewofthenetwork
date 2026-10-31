import { Link } from 'react-router-dom';
import SEOHead, { SITE_URL } from './SEOHead';

type FoundingMember = {
  id: string;
  name: string;
  role: string;
  image?: string;
  imagePosition?: string;
  initial?: string;
  avatarBackground?: string;
  details: string[];
  bio?: string;
  contribution?: string;
  closingDetails?: string[];
  accent: 'indigo' | 'purple' | 'sky' | 'violet' | 'rose' | 'cyan' | 'fuchsia' | 'amber';
};

const sharedContribution =
  'Supported The Network during its initial phase, helping build a student network where every campus and every student can find meaningful opportunities.';

const foundingMembers: FoundingMember[] = [
  {
    id: 'niraj-regar',
    name: 'Niraj Regar',
    role: 'Founder & CEO',
    image: '/images/founder-1.jpg',
    imagePosition: 'object-top',
    details: ['NIT Tiruchirappalli'],
    accent: 'indigo',
  },
  {
    id: 'surekha',
    name: 'Surekha',
    role: 'Founding Member',
    initial: 'S',
    avatarBackground: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
    details: ['IIT Kharagpur · Department of Education', 'Final year undergraduate'],
    contribution: sharedContribution,
    accent: 'purple',
  },
  {
    id: 'ruthvik',
    name: 'Ruthvik',
    role: 'Founding Member',
    image: '/images/ruthvik.png',
    imagePosition: 'object-top',
    details: ['Physics Wallah · Class 12 · PCM', 'Final year school student'],
    contribution: sharedContribution,
    accent: 'sky',
  },
  {
    id: 'ananya-gupta',
    name: 'Ananya Gupta',
    role: 'Founding Member',
    image: '/images/ananya-gupta-upright.jpg',
    details: ['CBSE · Class 12 · PCM', 'Preparing for JEE and CUET'],
    contribution: sharedContribution,
    accent: 'violet',
  },
  {
    id: 'salman-rahi',
    name: 'Salman Rahi',
    role: 'Founding Member',
    image: '/images/salman-rahi.png',
    details: [
      'Aligarh Muslim University',
      'Founder of Unison',
      'Unison — Community Partner of The Network',
    ],
    contribution: 'Supported The Network in its initial phase.',
    closingDetails: ['Author of The Teen Founder Book'],
    accent: 'indigo',
  },
  {
    id: 'pranjal-malik',
    name: 'Pranjal Malik',
    role: 'Founding Member',
    image: '/images/pranjal-malik.png',
    imagePosition: 'object-[center_38%]',
    details: ['Gap-year student'],
    bio: 'I’m currently a gap-year student with a strong interest in technology, startups, and business. I’m curious about how ideas turn into real products and how communities grow. I’m looking forward to learning, contributing to the team, and being part of the journey as we build and grow.',
    accent: 'rose',
  },
  {
    id: 'rehan-shashi',
    name: 'Rehan Shashi',
    role: 'Founding Member',
    image: '/images/rehan-shashi.png',
    details: ['Founder of CrypticNode', 'CrypticNode — Community Partner of The Network'],
    contribution: sharedContribution,
    accent: 'cyan',
  },
  {
    id: 'jasmeet-kaur',
    name: 'Jasmeet Kaur',
    role: 'Founding Member',
    image: '/images/jasmeet-kaur.jpg',
    imagePosition: 'object-top',
    details: [],
    bio: 'Interested in technology, the internet, and the many things you can do with a little curiosity. I enjoy exploring new ideas, getting into things I know little about, and connecting with people from different backgrounds.',
    contribution: sharedContribution,
    accent: 'fuchsia',
  },
  {
    id: 'krishmika-senthil-raj',
    name: 'Krishmika Senthil Raj',
    role: 'Founding Member',
    image: '/images/krishmika-senthil-raj.png',
    details: ['KRCE Trichy · 1st-year B.Tech CSE · GATE aspirant', 'Aspiring entrepreneur'],
    contribution: sharedContribution,
    accent: 'indigo',
  },
  {
    id: 'madiha-jamal',
    name: 'Madiha Jamal',
    role: 'Founding Member',
    image: '/images/madiha-jamal.png',
    imagePosition: 'object-top',
    details: ['Class 12 Commerce · Jamia Millia Islamia'],
    bio: 'Drawn to the numbers behind business, the logic of accounting, and the bigger picture of global affairs. Exploring my interests in finance and international relations, while connecting with new perspectives and discovering opportunities beyond the classroom.',
    accent: 'amber',
  },
];

const accentClasses: Record<FoundingMember['accent'], { card: string; avatar: string; role: string }> = {
  indigo: {
    card: 'border-indigo-100 bg-gradient-to-br from-indigo-50 via-violet-50 to-sky-50',
    avatar: 'border-indigo-200 bg-indigo-100',
    role: 'text-indigo-700',
  },
  purple: {
    card: 'border-purple-100 bg-gradient-to-br from-purple-50 to-indigo-50',
    avatar: 'border-purple-100 bg-purple-100',
    role: 'text-purple-700',
  },
  sky: {
    card: 'border-sky-100 bg-gradient-to-br from-sky-50 to-indigo-50',
    avatar: 'border-sky-200 bg-sky-100',
    role: 'text-sky-700',
  },
  violet: {
    card: 'border-violet-100 bg-gradient-to-br from-violet-50 via-fuchsia-50 to-rose-50',
    avatar: 'border-violet-200 bg-violet-100',
    role: 'text-violet-700',
  },
  rose: {
    card: 'border-rose-100 bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50',
    avatar: 'border-rose-200 bg-rose-100',
    role: 'text-rose-700',
  },
  cyan: {
    card: 'border-cyan-100 bg-gradient-to-br from-cyan-50 via-sky-50 to-indigo-50',
    avatar: 'border-cyan-200 bg-cyan-100',
    role: 'text-cyan-800',
  },
  fuchsia: {
    card: 'border-fuchsia-100 bg-gradient-to-br from-fuchsia-50 via-pink-50 to-violet-50',
    avatar: 'border-fuchsia-200 bg-fuchsia-100',
    role: 'text-fuchsia-700',
  },
  amber: {
    card: 'border-amber-100 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50',
    avatar: 'border-amber-200 bg-amber-100',
    role: 'text-amber-800',
  },
};

const pageTitle = 'Founding Members of The Network';
const pageDescription =
  'Meet The Network’s ten founding members: Niraj Regar, Surekha, Ruthvik, Ananya Gupta, Salman Rahi, Pranjal Malik, Rehan Shashi, Jasmeet Kaur, Krishmika Senthil Raj, and Madiha Jamal.';

const foundingMembersSchema = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: pageTitle,
  description: pageDescription,
  url: `${SITE_URL}/founding-members`,
  mainEntity: {
    '@type': 'ItemList',
    itemListElement: foundingMembers.map((member, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Person',
        name: member.name,
        jobTitle: member.role,
        ...(member.image ? { image: `${SITE_URL}${member.image}` } : {}),
        description: [
          ...member.details,
          member.bio,
          member.contribution,
          ...(member.closingDetails ?? []),
        ]
          .filter(Boolean)
          .join(' '),
        memberOf: {
          '@type': 'Organization',
          name: 'The Network',
          url: SITE_URL,
        },
      },
    })),
  },
};

function MemberCard({ member }: { member: FoundingMember }) {
  const accent = accentClasses[member.accent];

  return (
    <article
      id={member.id}
      className={`flex h-full items-start gap-4 rounded-2xl border p-5 shadow-sm sm:p-6 ${member.id === 'krishmika-senthil-raj' ? 'min-h-[230px]' : ''} ${accent.card}`}
    >
      {member.image ? (
        <img
          src={member.image}
          alt={member.name}
          width={72}
          height={72}
          loading="lazy"
          decoding="async"
          className={`h-16 w-16 flex-shrink-0 rounded-2xl border-2 object-cover sm:h-[72px] sm:w-[72px] ${accent.avatar} ${member.imagePosition ?? ''}`}
        />
      ) : (
        <div
          aria-hidden="true"
          className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl border-2 text-2xl font-black text-white sm:h-[72px] sm:w-[72px] ${accent.avatar}`}
          style={{ background: member.avatarBackground }}
        >
          {member.initial}
        </div>
      )}
      <div className="min-w-0">
        <h2 className="text-lg font-black text-gray-900">{member.name}</h2>
        <p className={`mt-0.5 text-sm font-bold ${accent.role}`}>{member.role}</p>
        {member.details.map((detail) => (
          <p key={detail} className="mt-1 text-sm leading-5 text-gray-600">
            {detail}
          </p>
        ))}
        {member.bio && <p className="mt-2 text-sm leading-6 text-gray-700">{member.bio}</p>}
        {member.contribution && (
          <p className="mt-2 text-sm leading-6 text-gray-600">{member.contribution}</p>
        )}
        {member.closingDetails?.map((detail) => (
          <p key={detail} className="mt-2 text-sm font-semibold leading-5 text-gray-600">
            {detail}
          </p>
        ))}
      </div>
    </article>
  );
}

export default function FoundingMembersPage() {
  return (
    <>
      <SEOHead
        title={pageTitle}
        description={pageDescription}
        canonical="/founding-members"
        schema={foundingMembersSchema}
      />
      <main className="min-h-screen bg-gradient-to-b from-indigo-50/70 via-white to-white px-4 py-10 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <Link
            to="/#founding-members"
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900"
          >
            <span aria-hidden="true">←</span> Back to The Network
          </Link>
          <header className="mb-8 text-center sm:mb-10">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
              The people building The Network
            </p>
            <h1 className="text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
              Meet the Founding Members
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
              Students and community builders who believe every student deserves access to a bigger network.
              Get to know all ten members.
            </p>
          </header>
          <section aria-label="The Network founding members">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
              {foundingMembers.map((member) => (
                <MemberCard key={member.id} member={member} />
              ))}
            </div>
          </section>
          <p className="mt-8 text-center text-sm text-gray-600">
            <Link to="/" className="font-semibold text-indigo-700 hover:text-indigo-900">
              Explore The Network
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
