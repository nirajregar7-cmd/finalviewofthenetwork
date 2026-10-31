import React, { useState, useEffect, useRef } from 'react';
import {
  Users, Zap, Award, Rocket, Search,
  Crown, ChevronRight, Star, ArrowRight,
  GraduationCap, Briefcase, Code2, FlaskConical,
  Cpu, TrendingUp, ChevronDown,
  Instagram, Linkedin, Twitter, Youtube, Mail,
  Building2, Handshake, Target, Sparkles, MapPin,
  BookOpen as BookOpenIcon
} from 'lucide-react';
import NetworkLogo from './NetworkLogo';
import { api } from '../api';
import { InstallAppButton } from '../uploaded/components/InstallAppButton';

interface LandingPageProps {
  onJoin: () => void;
  onLogin: () => void;
}

/* ─── Data ────────────────────────────────────────────────── */
type LandingStats = {
  students: number;
  colleges: number;
  collegeDirectory: Array<{ name: string; students: number }>;
  schoolDirectory: Array<{ name: string; students: number }>;
};

const AUDIENCE_CARDS = [
  { icon: GraduationCap, title: 'School Students', desc: 'Connect with students from your school and other schools across India. Explore JEE, NEET, coding, AI, robotics, aerospace, science and more.' },
  { icon: Building2, title: 'College Students', desc: 'Find project teammates, coding partners, hackathon teammates, seniors, mentors and students with similar interests.' },
  { icon: Target, title: 'Competitive Exam Students', desc: 'Connect with students preparing for JEE, NEET and other competitive exams. Find study partners, discuss doubts and share resources.' },
  { icon: Sparkles, title: 'Students Exploring Skills', desc: 'Connect with students learning coding, DSA, AI, ML, web development, app development, robotics, aerospace, aviation, startups, entrepreneurship, research and more.' },
];

const PEOPLE_FEATURES = [
  { icon: Search, title: 'Study Partner', desc: 'Prepare together with students working towards the same goals.' },
  { icon: Code2, title: 'Coding Partner', desc: 'Practice coding and DSA with other students.' },
  { icon: Rocket, title: 'Project Teammate', desc: 'Find students with complementary skills and build projects together.' },
  { icon: Award, title: 'Hackathon Teammate', desc: 'Connect with students who want to build and compete together.' },
  { icon: GraduationCap, title: 'Mentors & Seniors', desc: 'Learn from people who have already gone through the journey.' },
  { icon: Users, title: 'Like-Minded Students', desc: 'Meet students who are interested in the same things you are.' },
];

const COMMUNITIES = [
  { name: 'Web Developers',      college: 'Coding Community',       color: 'from-blue-600 to-indigo-700',   emoji: '💻' },
  { name: 'AI & ML Enthusiasts', college: 'School & College Students', color: 'from-violet-600 to-purple-700', emoji: '🤖' },
  { name: 'Placement Cell',      college: 'College Community',       color: 'from-orange-500 to-red-500',    emoji: '🎯' },
  { name: 'Startup Community',   college: 'Student Builders',        color: 'from-emerald-500 to-teal-600', emoji: '🚀' },
  { name: 'Design Circle',       college: 'Student Community',       color: 'from-pink-500 to-rose-600',    emoji: '🎨' },
  { name: 'Robotics Club',       college: 'Robotics Community',       color: 'from-cyan-500 to-blue-600',    emoji: '⚙️' },
];

const OPPORTUNITIES = [
  { logo: 'P',  bg: '#4285F4', company: 'People',       role: 'Find students on a similar path', location: 'Across India', type: 'Connect', deadline: 'Start with your interests' },
  { logo: 'C',  bg: '#1a1a2e', company: 'Communities',  role: 'Learn with people, not alone',     location: 'Across India', type: 'Learn',   deadline: 'Explore together' },
  { logo: 'R',  bg: '#4f46e5', company: 'Resources',    role: 'Discover useful knowledge',         location: 'For students', type: 'Discover', deadline: 'Keep exploring' },
  { logo: 'B',  bg: '#00a4ef', company: 'Build',        role: 'Find project teammates',           location: 'Across India', type: 'Collaborate', deadline: 'Build together' },
  { logo: 'O',  bg: '#1a1a2e', company: 'Opportunities', role: 'See what could be possible',      location: 'For students', type: 'Grow',    deadline: 'Look beyond your surroundings' },
];

const COMMUNITY_TYPES = [
  { icon: Target, label: 'JEE' },
  { icon: FlaskConical, label: 'NEET' },
  { icon: GraduationCap, label: 'CBSE Class 12' },
  { icon: Code2, label: 'Coding' },
  { icon: Cpu, label: 'DSA' },
  { icon: Sparkles, label: 'AI & ML' },
  { icon: Code2, label: 'Python' },
  { icon: Search, label: 'Web Development' },
  { icon: Cpu, label: 'Robotics' },
  { icon: Rocket, label: 'Aerospace' },
  { icon: TrendingUp, label: 'Aviation' },
  { icon: Rocket, label: 'Startups' },
  { icon: Handshake, label: 'Entrepreneurship' },
  { icon: FlaskConical, label: 'Research' },
  { icon: Users, label: 'YIIC' },
];

const ACCESS_CARDS = [
  { icon: Search, title: 'More Exposure', desc: 'Help students discover fields, skills and possibilities they may never encounter around them.' },
  { icon: Users, title: 'More Connections', desc: 'Help students find people with similar interests, goals and ambitions.' },
  { icon: BookOpenIcon, title: 'More Learning', desc: 'Make it easier for students to learn from each other, seniors and experienced people.' },
  { icon: Briefcase, title: 'More Opportunities', desc: 'Help students discover projects, competitions, events, communities and other opportunities.' },
];

const HOW_IT_WORKS = [
  { icon: Search, title: 'Discover', desc: 'Find people, communities, resources and opportunities.' },
  { icon: Handshake, title: 'Connect', desc: 'Meet students who share your interests and goals.' },
  { icon: BookOpenIcon, title: 'Learn', desc: 'Ask questions, share knowledge and learn together.' },
  { icon: Rocket, title: 'Build', desc: 'Work on projects, ideas, competitions and hackathons.' },
  { icon: TrendingUp, title: 'Grow', desc: 'Build skills, relationships and opportunities beyond your surroundings.' },
];

const IMPACT_POINTS = [
  'A student in a village discovers coding.',
  'A school student finds others preparing for JEE.',
  'A student finds a project teammate from another college.',
  'A student interested in aerospace finds others who share the same curiosity.',
  'A student building a startup finds someone with the skills they need.',
  'A student preparing for an exam finds people going through the same journey.',
  'A student discovers a field they didn’t even know existed.',
];

// Network cards — real colleges mixed with school-stage and community examples.
// tag colour: IIT=#4f46e5  NIT=#7c3aed  AIIMS=#059669  IIM=#f59e0b
const COLLEGE_CARDS = [
  { label: 'IIT Bombay',    sub: 'AI Research Community',   tag: 'IIT',   color: '#4f46e5', cardPos: { left: '0%',  top: '4%'  }, lineAnchor: [13, 11] },
  { label: 'NIT Trichy',    sub: 'Web Dev Community',        tag: 'NIT',   color: '#7c3aed', cardPos: { right: '0%', top: '2%'  }, lineAnchor: [87,  9] },
  { label: 'Class 12 Science', sub: 'School Community',        tag: 'SCHOOL', color: '#059669', cardPos: { left: '0%',  top: '37%' }, lineAnchor: [13, 42] },
  { label: 'JEE Community',   sub: 'Exam Preparation',         tag: 'EXAM',   color: '#f59e0b', cardPos: { right: '0%',top: '42%'  }, lineAnchor: [87, 47] },
  { label: 'AIIMS Delhi',     sub: 'Medical Research Hub',     tag: 'AIIMS',  color: '#059669', cardPos: { right: '2%',top: '59%'  }, lineAnchor: [83, 64] },
  { label: 'IIT Madras',      sub: 'Deep Tech Projects',       tag: 'IIT',    color: '#4f46e5', cardPos: { left: '2%',  top: '60%' }, lineAnchor: [14, 65] },
  { label: 'Coding Community',sub: 'Open Source Collective',   tag: 'COMMUNITY', color: '#7c3aed', cardPos: { left: '2%',  top: '79%' }, lineAnchor: [14, 84] },
  { label: 'Robotics Community', sub: 'Build & Learn Together',tag: 'COMMUNITY', color: '#0891b2', cardPos: { left: '33%', top: '84%' }, lineAnchor: [42, 89] },
];

/* ─── Animated Counter ────────────────────────────────────── */
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const duration = 1800;
        const steps = 60;
        const inc = target / steps;
        let cur = 0;
        const t = setInterval(() => {
          cur += inc;
          if (cur >= target) { setCount(target); clearInterval(t); }
          else setCount(Math.floor(cur));
        }, duration / steps);
      }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={ref}>{count >= 1000 ? (count / 1000).toFixed(count % 1000 === 0 ? 0 : 1) + 'K' : count}{suffix}</span>;
}

function LiveCount({ value, suffix = '+' }: { value: number | null; suffix?: string }) {
  if (value === null) {
    return <span className="text-base text-gray-400">Loading…</span>;
  }
  return <Counter target={value} suffix={suffix} />;
}

function FoundingMembersSection() {
  return (
    <section id="founding-members" className="relative border-y border-indigo-100/70 bg-white py-10 sm:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-7 sm:mb-9">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 mb-3">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-[10px] sm:text-xs font-bold text-indigo-600 uppercase tracking-widest">Meet the Founding Members</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">The people building The Network.</h2>
          <p className="mt-2 text-sm text-gray-500 max-w-xl mx-auto">
            Built by students who believe every student deserves access to a bigger network.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 sm:p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
            <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-indigo-200 bg-indigo-100">
              <img src="/images/founder-1.jpg" alt="Niraj Regar" loading="lazy" decoding="async" className="w-full h-full object-cover object-top" />
            </div>
            <div className="min-w-0">
              <div className="text-base font-black text-gray-900">Niraj Regar</div>
              <div className="text-xs text-indigo-600 font-bold">Founder &amp; CEO</div>
              <div className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-gray-500">
                <GraduationCap className="w-3 h-3" /> NIT Tiruchirappalli
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-indigo-50 p-4 sm:p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl font-black text-white"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' }}>
              S
            </div>
            <div className="min-w-0">
              <div className="text-base font-black text-gray-900">Surekha</div>
              <div className="text-xs text-purple-700 font-bold">Founding Member</div>
              <div className="mt-1 text-[10px] font-semibold leading-4 text-gray-500">
                IIT Kharagpur · Department of Education
              </div>
              <div className="text-[10px] font-semibold leading-4 text-gray-500">
                Final year undergraduate
              </div>
              <p className="mt-1 text-[10px] leading-4 text-gray-500">
                Supported The Network during its initial phase, helping build a student network where every campus and every student can find meaningful opportunities.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-indigo-50 p-4 sm:p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
            <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-sky-200 bg-sky-100">
              <img src="/images/ruthvik.png" alt="Ruthvik" loading="lazy" decoding="async" className="w-full h-full object-cover object-top" />
            </div>
            <div className="min-w-0">
              <div className="text-base font-black text-gray-900">Ruthvik</div>
              <div className="text-xs text-sky-700 font-bold">Founding Member</div>
              <div className="mt-1 text-[10px] font-semibold leading-4 text-gray-500">
                Physics Wallah · Class 12 · PCM
              </div>
              <div className="text-[10px] font-semibold leading-4 text-gray-500">
                Final year school student
              </div>
              <p className="mt-1 text-[10px] leading-4 text-gray-500">
                Supported The Network during its initial phase, helping build a student network where every campus and every student can find meaningful opportunities.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-fuchsia-50 to-rose-50 p-4 sm:p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
            <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-violet-200 bg-gradient-to-br from-violet-100 to-pink-100">
              <img src="/images/ananya-gupta-upright.jpg" alt="Ananya Gupta" loading="lazy" decoding="async" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <div className="text-base font-black text-gray-900">Ananya Gupta</div>
              <div className="text-xs text-violet-700 font-bold">Founding Member</div>
              <div className="mt-1 text-[10px] font-semibold leading-4 text-gray-500">
                CBSE · Class 12 · PCM
              </div>
              <div className="text-[10px] font-semibold leading-4 text-gray-500">
                Preparing for JEE and CUET
              </div>
              <p className="mt-1 text-[10px] leading-4 text-gray-500">
                Supported The Network during its initial phase, helping build a student network where every campus and every student can find meaningful opportunities.
              </p>
            </div>
          </div>

          <div
            data-testid="card-founding-member-salman-rahi"
            className="flex items-center gap-4 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-violet-50 to-sky-50 p-4 sm:p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-indigo-300 bg-indigo-100">
              <img
                data-testid="img-founding-member-salman-rahi"
                src="/images/salman-rahi.png"
                alt="Salman Rahi"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="text-base font-black text-gray-900">Salman Rahi</div>
              <div className="text-xs text-indigo-700 font-bold">Founding Member</div>
              <div className="mt-1 text-[10px] font-semibold leading-4 text-gray-500">
                Aligarh Muslim University
              </div>
              <div className="text-[10px] font-semibold leading-4 text-gray-500">
                Founder of Unison
              </div>
              <div className="text-[10px] font-semibold leading-4 text-gray-500">
                Unison — Community Partner of The Network
              </div>
              <p className="mt-1 text-[10px] leading-4 text-gray-500">
                Supported The Network in its initial phase.
              </p>
              <div className="text-[10px] font-semibold leading-4 text-gray-500">
                Author of The Teen Founder Book
              </div>
            </div>
          </div>

          <div
            data-testid="card-founding-member-pranjal-malik"
            className="flex items-center gap-4 rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 p-4 sm:p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-rose-200 bg-rose-100">
              <img
                data-testid="img-founding-member-pranjal-malik"
                src="/images/pranjal-malik.png"
                alt="Pranjal Malik"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover object-[center_38%]"
              />
            </div>
            <div className="min-w-0">
              <div className="text-base font-black text-gray-900">Pranjal Malik</div>
              <div className="text-xs text-rose-700 font-bold">Founding Member</div>
              <div data-testid="status-founding-member-pranjal-malik" className="mt-1 text-[10px] font-semibold leading-4 text-gray-500">
                Gap-year student
              </div>
              <p data-testid="text-bio-pranjal-malik" className="mt-1 text-[10px] leading-4 text-gray-600">
                I’m currently a gap-year student with a strong interest in technology, startups, and business. I’m curious about how ideas turn into real products and how communities grow. I’m looking forward to learning, contributing to the team, and being part of the journey as we build and grow.
              </p>
            </div>
          </div>

          <div
            data-testid="card-founding-member-rehan-shashi"
            className="flex items-center gap-4 rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50 via-sky-50 to-indigo-50 p-4 sm:p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-cyan-200 bg-cyan-100">
              <img
                data-testid="img-founding-member-rehan-shashi"
                src="/images/rehan-shashi.png"
                alt="Rehan Shashi"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="text-base font-black text-gray-900">Rehan Shashi</div>
              <div className="text-xs text-cyan-800 font-bold">Founding Member</div>
              <div className="mt-1 text-[10px] font-semibold leading-4 text-gray-500">
                Founder of CrypticNode
              </div>
              <div className="text-[10px] font-semibold leading-4 text-gray-500">
                CrypticNode — Community Partner of The Network
              </div>
              <p data-testid="text-bio-rehan-shashi" className="mt-1 text-[10px] leading-4 text-gray-500">
                Supported The Network during its initial phase, helping build a student network where every campus and every student can find meaningful opportunities.
              </p>
            </div>
          </div>

          <div
            data-testid="card-founding-member-jasmeet-kaur"
            className="flex items-center gap-4 rounded-2xl border border-fuchsia-100 bg-gradient-to-br from-fuchsia-50 via-pink-50 to-violet-50 p-4 sm:p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-fuchsia-200 bg-fuchsia-100">
              <img
                data-testid="img-founding-member-jasmeet-kaur"
                src="/images/jasmeet-kaur.jpg"
                alt="Jasmeet Kaur"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover object-top"
              />
            </div>
            <div className="min-w-0">
              <div className="text-base font-black text-gray-900">Jasmeet Kaur</div>
              <div className="text-xs text-fuchsia-700 font-bold">Founding Member</div>
              <p data-testid="text-bio-jasmeet-kaur" className="mt-1 text-[10px] leading-4 text-gray-600">
                Interested in technology and the internet, curious about new ideas, and enjoys connecting with people from different backgrounds.
              </p>
              <p className="mt-1 text-[10px] leading-4 text-gray-500">
                Supported The Network during its initial phase, helping build a student network where every campus and every student can find meaningful opportunities.
              </p>
            </div>
          </div>

          <div
            data-testid="card-founding-member-krishmika-senthil-raj"
            className="flex items-center gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-violet-50 to-sky-50 p-4 sm:p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-indigo-200 bg-indigo-100">
              <img
                data-testid="img-founding-member-krishmika-senthil-raj"
                src="/images/krishmika-senthil-raj.png"
                alt="Krishmika Senthil Raj"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="text-base font-black text-gray-900">Krishmika Senthil Raj</div>
              <div className="text-xs text-indigo-700 font-bold">Founding Member</div>
              <div className="mt-1 text-[10px] font-semibold leading-4 text-gray-500">
                KRCE Trichy · 1st-year B.Tech CSE · GATE aspirant
              </div>
              <div className="text-[10px] font-semibold leading-4 text-gray-500">
                Aspiring entrepreneur
              </div>
              <p className="mt-1 text-[10px] leading-4 text-gray-500">
                Supported The Network during its initial phase, helping build a student network where every campus and every student can find meaningful opportunities.
              </p>
            </div>
          </div>

          <div
            data-testid="card-founding-member-madiha-jamal"
            className="flex items-center gap-4 rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-4 sm:p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl border-2 border-amber-200 bg-amber-100">
              <img
                data-testid="img-founding-member-madiha-jamal"
                src="/images/madiha-jamal.png"
                alt="Madiha Jamal"
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover object-top"
              />
            </div>
            <div className="min-w-0">
              <div className="text-base font-black text-gray-900">Madiha Jamal</div>
              <div className="text-xs font-bold text-amber-800">Founding Member</div>
              <div className="mt-1 text-[10px] font-semibold leading-4 text-gray-500">
                Class 12 Commerce · Jamia Millia Islamia
              </div>
              <p data-testid="text-bio-madiha-jamal" className="mt-1 text-[10px] leading-4 text-gray-600">
                Drawn to the numbers behind business, the logic of accounting, and the bigger picture of global affairs. Exploring my interests in finance and international relations, while connecting with new perspectives and discovering opportunities beyond the classroom.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-5 text-center">
          <a
            href="/founding-members"
            className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100"
          >
            Meet all founding members <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}

function FounderSection({ onJoin }: { onJoin: () => void }) {
  return (
    <section id="founder" className="py-20 overflow-hidden" style={{ background: 'linear-gradient(180deg, #f8f9ff 0%, #ffffff 100%)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Founder Story</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
            I Didn't Know What Was Possible.
          </h2>
          <p className="mt-3 text-sm text-gray-500 max-w-xl mx-auto">
            One student. One experience. One mission to make every student's network bigger than their surroundings.
          </p>
        </div>

        {/* Main two-column card */}
        <div className="rounded-3xl overflow-hidden shadow-lg border border-gray-100" style={{ background: '#fff' }}>
          <div className="grid grid-cols-1 lg:grid-cols-2">

            {/* ── Left: Single photo ── */}
            <div className="relative" style={{ background: 'linear-gradient(145deg, #0f0a2e 0%, #1e1b4b 100%)', minHeight: 480 }}>
              <img
                src="/images/founder-2.jpg"
                alt="Niraj Regar – Founder of The Network"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover object-top"
                style={{ minHeight: 480, maxHeight: 560, display: 'block' }}
              />
              {/* Gradient overlay bottom */}
              <div className="absolute inset-x-0 bottom-0 h-28 pointer-events-none"
                style={{ background: 'linear-gradient(to top, rgba(15,10,46,0.85) 0%, transparent 100%)' }} />
              {/* Name badge bottom-left */}
              <div className="absolute bottom-5 left-5">
                <div className="text-white font-black text-base leading-tight">Niraj Regar</div>
                <div className="text-indigo-300 text-xs font-bold">Founder & CEO · The Network</div>
              </div>
            </div>

            {/* ── Right: Bio ── */}
            <div className="p-8 sm:p-10 lg:p-12 flex flex-col justify-center">

              {/* Quote */}
              <div className="mb-6 pl-4 border-l-4 border-indigo-400">
                <p className="text-base sm:text-lg font-black text-gray-900 leading-snug">
                  "A student's potential shouldn't be limited
                </p>
                <p className="text-base sm:text-lg font-black text-indigo-600 leading-snug">
                  by their surroundings."
                </p>
                <p className="text-xs text-gray-400 font-medium mt-1">— Niraj Regar</p>
              </div>

              {/* Name card */}
              <div className="flex items-center gap-4 mb-6 p-4 rounded-2xl border border-gray-100 bg-gray-50">
                <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-indigo-200">
                  <img src="/images/founder-1.jpg" alt="Niraj Regar" loading="lazy" decoding="async" className="w-full h-full object-cover object-top" />
                </div>
                <div>
                  <div className="text-base font-black text-gray-900">Niraj Regar</div>
                  <div className="text-xs text-indigo-600 font-bold">Founder & CEO · The Network</div>
                  <div className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-gray-500">
                    <GraduationCap className="w-3 h-3" /> NIT Tiruchirappalli
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-50 border border-green-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-green-600">Building</span>
                </div>
              </div>

              {/* Bio */}
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                I come from a small village near <strong className="text-gray-900">Bidasar, Churu, Rajasthan</strong>. I studied Classes 11 and 12 in a government school in my village.
              </p>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                At that time, I didn't know much about coding, robotics, aerospace, startups or the different skills and paths students could explore. There weren't many people around me who could introduce me to those possibilities.
              </p>
              <p className="text-sm text-gray-600 leading-relaxed mb-7">
                After Class 11, a friend told me about JEE. I couldn't join a coaching institute or move to another city then. After Class 12, when I got good marks, someone suggested to my father that he send me to Sikar. That is when things started changing for me.
              </p>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                Later, I got into NIT Trichy, but I struggled at first. I wasn't comfortable with English, and my first semester was difficult. Then I met students who had been coding since Class 11 or 12, building projects and exploring technologies, competitions, startups and research.
              </p>
              <p className="text-sm text-gray-600 leading-relaxed mb-7">
                I kept thinking, <strong className="text-gray-900">“Why didn't I know about these things earlier?”</strong> It wasn't that I didn't want to learn. I simply didn't have the exposure or the people around me who could show me what was possible. That's why we're building The Network.
              </p>

              {/* Mission + Vision */}
              <div className="grid grid-cols-2 gap-3 mb-7">
                <div className="rounded-2xl p-4 border border-indigo-100 bg-indigo-50">
                  <div className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-1">🚀 Mission</div>
                  <div className="text-xs text-gray-700 font-medium leading-relaxed">Help students connect beyond the limits of their school, college, city or surroundings.</div>
                </div>
                <div className="rounded-2xl p-4 border border-purple-100 bg-purple-50">
                  <div className="text-xs font-black text-purple-600 uppercase tracking-widest mb-1">🎯 Long-term vision</div>
                  <div className="text-xs text-gray-700 font-medium leading-relaxed">A connected network where every student can find the people, knowledge and opportunities they need.</div>
                </div>
              </div>

              {/* Social row */}
              <div className="flex items-center gap-2 mb-6">
                {[
                  { icon: Linkedin,  label: 'LinkedIn',    href: 'https://www.linkedin.com/in/nirajthenetwork' },
                  { icon: Instagram, label: 'Instagram',   href: 'https://www.instagram.com/the_network.web.app' },
                  { icon: Twitter,   label: 'X / Twitter', href: 'https://x.com/niraj_fulwariya' },
                  { icon: Mail,      label: 'Email',       href: 'mailto:neeraj@the-network.app' },
                ].map(({ icon: Icon, label, href }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                    className="w-9 h-9 rounded-xl bg-white border border-gray-200 hover:bg-indigo-600 hover:border-indigo-600 active:scale-90 flex items-center justify-center transition-all shadow-sm group">
                    <Icon className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                  </a>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap gap-3">
                <a href="https://www.linkedin.com/in/nirajthenetwork" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}>
                  <Linkedin className="w-4 h-4" /> Connect with Me
                </a>
                <button onClick={onJoin}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-indigo-600 bg-white border border-indigo-200 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-95">
                  Join The Network <ArrowRight className="w-4 h-4" />
                </button>
                <a href="#founder"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-95">
                  Why I Started The Network <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Journey timeline */}
        <div className="mt-6 bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
          <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 text-center">The Journey</div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 relative">
            <div className="hidden sm:block absolute top-4 left-[10%] right-[10%] h-0.5"
              style={{ background: 'linear-gradient(90deg, #e0e7ff, #ede9fe, #e0e7ff)' }} />
            {[
              { dot: '11', label: 'Discovered JEE', sub: 'A new possibility' },
              { dot: '→',  label: 'Moved to Sikar', sub: 'More exposure' },
              { dot: '→',  label: 'Reached NIT Trichy', sub: 'A bigger world' },
              { dot: 'TN', label: 'Started The Network', sub: 'Mission begins' },
              { dot: '★',  label: 'Building together', sub: 'Students across India' },
            ].map(({ dot, label, sub }, i) => (
              <div key={i} className="flex sm:flex-col items-center gap-4 sm:gap-2 relative z-10 w-full sm:w-auto">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                  style={{ background: i === 4 ? 'linear-gradient(135deg, #059669, #047857)' : 'linear-gradient(135deg, #6366f1, #7c3aed)' }}>
                  {dot}
                </div>
                <div className="sm:text-center">
                  <div className="text-xs font-black text-gray-900">{label}</div>
                  <div className="text-[10px] text-gray-400 font-medium">{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}

function IndiaMap({ onJoin }: { onJoin: () => void }) {
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setPulse(p => (p + 1) % COLLEGE_CARDS.length), 1800);
    return () => clearInterval(t);
  }, []);

  // Center node position (% of container) — sits over India's geographic center
  const cx = 50, cy = 46;

  return (
    <div className="relative w-full h-full" style={{ overflow: 'visible' }}>

      {/* ── Real India map — used as CSS mask so we control the colour ── */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 2 }}>
        {/* Outer glow layer */}
        <div
          className="absolute"
          style={{
            width: '62%', height: '86%', maxHeight: 440,
            maskImage: 'url(/india-map.png)',
            WebkitMaskImage: 'url(/india-map.png)',
            maskSize: 'contain',
            WebkitMaskSize: 'contain',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
            maskPosition: 'center',
            WebkitMaskPosition: 'center',
            background: 'radial-gradient(ellipse at 50% 45%, rgba(99,102,241,0.22) 0%, rgba(139,92,246,0.10) 60%, transparent 100%)',
          }}
        />
        {/* Dot-pattern layer clipped to India silhouette */}
        <div
          style={{
            width: '62%', height: '86%', maxHeight: 440,
            maskImage: 'url(/india-map.png)',
            WebkitMaskImage: 'url(/india-map.png)',
            maskSize: 'contain',
            WebkitMaskSize: 'contain',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
            maskPosition: 'center',
            WebkitMaskPosition: 'center',
            backgroundImage:
              'radial-gradient(circle, #a5b4fc 1.4px, transparent 1.4px)',
            backgroundSize: '10px 10px',
            opacity: 0.55,
          }}
        />
        {/* Thin border outline */}
        <div
          className="absolute"
          style={{
            width: '62%', height: '86%', maxHeight: 440,
            maskImage: 'url(/india-map.png)',
            WebkitMaskImage: 'url(/india-map.png)',
            maskSize: 'contain',
            WebkitMaskSize: 'contain',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
            maskPosition: 'center',
            WebkitMaskPosition: 'center',
            border: '1px solid transparent',
            boxShadow: 'inset 0 0 0 1px rgba(99,102,241,0.25)',
          }}
        />
      </div>

      {/* ── Connection lines (SVG overlay) ── */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 6, overflow: 'visible' }}
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        {COLLEGE_CARDS.map((c, i) => (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={c.lineAnchor[0]} y2={c.lineAnchor[1]}
            stroke="#6366f1"
            strokeWidth="0.45"
            strokeOpacity="0.30"
          />
        ))}
      </svg>

      {/* ── Center node ── */}
      <div
        className="absolute"
        style={{ left: `${cx}%`, top: `${cy}%`, transform: 'translate(-50%,-50%)', zIndex: 15 }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
            boxShadow: '0 0 0 10px rgba(99,102,241,0.12), 0 0 36px rgba(99,102,241,0.45)',
          }}
        >
          <Users className="w-6 h-6 text-white" />
        </div>
        <div
          className="absolute rounded-full pointer-events-none"
          style={{ inset: '-12px', border: '1.5px solid rgba(99,102,241,0.22)', animation: 'ping 3s ease-in-out infinite' }}
        />
      </div>

      {/* ── Community cards ── */}
      {COLLEGE_CARDS.map((c, i) => {
        const active = pulse === i;
        return (
          <div key={i} className="absolute" style={{ ...c.cardPos, zIndex: 20 }}>
            <div
              onClick={onJoin}
              className="flex items-center gap-2.5 bg-white rounded-2xl px-3 py-2 cursor-pointer hover:-translate-y-0.5 transition-all duration-200"
              style={{
                boxShadow: active ? `0 8px 28px rgba(0,0,0,0.13), 0 0 0 2px ${c.color}55` : '0 3px 16px rgba(0,0,0,0.09)',
                border: `1px solid ${active ? c.color + '44' : '#f1f5f9'}`,
                transition: 'box-shadow 0.45s, border-color 0.45s',
              }}
            >
              {/* Tag badge */}
              <div
                className="flex-shrink-0 rounded-xl flex items-center justify-center text-white font-black leading-none"
                style={{
                  background: `linear-gradient(135deg,${c.color}ee,${c.color})`,
                  fontSize: c.tag === 'AIIMS' ? 7 : 9,
                  width: 38, height: 38,
                  letterSpacing: '-0.3px',
                }}
              >
                {c.tag}
              </div>
              <div>
                <div className="text-[11px] font-black text-gray-900 whitespace-nowrap leading-tight">{c.label}</div>
                <div className="text-[9px] text-gray-500 whitespace-nowrap font-medium mt-0.5">{c.sub}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Partner Colleges Data ───────────────────────────────── */
type LandingCollege = {
  name: string;
  short: string;
  grad: [string, string];
  students: number;
  hot: boolean;
};

const COLLEGE_GRADIENTS: Array<[string, string]> = [
  ['#2563eb', '#4f46e5'],
  ['#7c3aed', '#9333ea'],
  ['#0891b2', '#2563eb'],
  ['#e11d48', '#ec4899'],
  ['#059669', '#0d9488'],
  ['#ea580c', '#dc2626'],
  ['#0284c7', '#06b6d4'],
  ['#d97706', '#ea580c'],
];

function toCollegeCard(college: { name: string; students: number }, index: number): LandingCollege {
  const initials = college.name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 5)
    .toUpperCase();

  return {
    name: college.name,
    short: initials || 'COLLEGE',
    grad: COLLEGE_GRADIENTS[index % COLLEGE_GRADIENTS.length],
    students: college.students,
    hot: index < 3,
  };
}

/* ─── College Card ────────────────────────────────────────── */
function CollegeCard({
  c, rowId, index, activeKey, onActivate,
}: {
  c: LandingCollege;
  rowId: number; index: number;
  activeKey: string | null;
  onActivate: (key: string | null) => void;
  key?: React.Key;
}) {
  const key = `${rowId}-${index}`;
  const isActive = activeKey === key;

  const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    onActivate(isActive ? null : key);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleTap}
      onTouchEnd={handleTap}
      className="relative flex-shrink-0 select-none cursor-pointer"
      style={{ touchAction: 'manipulation' }}
    >
      {/* Floating popup */}
      {isActive && (
        <div
          className="absolute -top-12 left-1/2 z-30 pointer-events-none"
          style={{ transform: 'translateX(-50%)', animation: 'popIn 0.18s cubic-bezier(.34,1.56,.64,1) both' }}
        >
          <div className="whitespace-nowrap rounded-xl px-3 py-1.5 text-[11px] font-bold text-white shadow-xl"
            style={{ background: `linear-gradient(135deg, ${c.grad[0]}, ${c.grad[1]})` }}>
            🎓 {c.students} student{c.students > 1 ? 's' : ''} here
          </div>
          <div className="mx-auto mt-0.5 w-2 h-2 rotate-45 rounded-sm"
            style={{ background: c.grad[1], marginLeft: 'calc(50% - 4px)' }} />
        </div>
      )}

      <div
        className="flex items-center gap-3 rounded-2xl px-4 py-3 border-2 transition-all duration-200"
        style={{
          background: isActive ? `linear-gradient(135deg, ${c.grad[0]}18, ${c.grad[1]}28)` : '#f9fafb',
          borderColor: isActive ? c.grad[0] : '#f1f5f9',
          boxShadow: isActive ? `0 4px 20px ${c.grad[0]}40` : '0 1px 4px rgba(0,0,0,0.04)',
          transform: isActive ? 'scale(1.05)' : 'scale(1)',
        }}
      >
        {/* Badge */}
        <div
          className="relative w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${c.grad[0]}, ${c.grad[1]})` }}
        >
          <span className="text-white font-black" style={{ fontSize: 9 }}>{c.short}</span>
          {/* Live pulse for hot colleges */}
          {c.hot && (
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white"
              style={{ background: '#22c55e', animation: 'livePulse 1.8s ease-in-out infinite' }} />
          )}
        </div>
        <div>
          <div className="text-sm font-bold text-gray-900 whitespace-nowrap leading-tight">{c.name}</div>
          <div className="text-[11px] font-semibold leading-tight mt-0.5"
            style={{ color: c.grad[0] }}>
            {c.students} student{c.students > 1 ? 's' : ''} joined
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Marquee Row ─────────────────────────────────────────── */
function MarqueeRow({
  colleges, reverse, rowId, activeKey, onActivate,
}: {
  colleges: LandingCollege[];
  reverse?: boolean;
  rowId: number;
  activeKey: string | null;
  onActivate: (k: string | null) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const doubled = [...colleges, ...colleges];

  const pause  = () => { if (trackRef.current) trackRef.current.style.animationPlayState = 'paused';  pausedRef.current = true; };
  const resume = () => { if (trackRef.current) trackRef.current.style.animationPlayState = 'running'; pausedRef.current = false; };

  return (
    <div
      className="relative overflow-hidden"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onTouchStart={pause}
      onTouchEnd={resume}
    >
      {/* Left fade */}
      <div className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, white 0%, transparent 100%)' }} />
      {/* Right fade */}
      <div className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, white 0%, transparent 100%)' }} />

      <div
        ref={trackRef}
        className="flex gap-3 w-max py-1"
        style={{ animation: `${reverse ? 'marquee-reverse' : 'marquee'} 28s linear infinite` }}
      >
        {doubled.map((c, i) => (
          <CollegeCard
            key={i}
            c={c}
            rowId={rowId}
            index={i % colleges.length}
            activeKey={activeKey}
            onActivate={onActivate}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Partner Colleges Section ────────────────────────────── */
function PartnerColleges({
  onJoin,
  collegeCount,
  colleges,
}: {
  onJoin: () => void;
  collegeCount: number | null;
  colleges: LandingCollege[];
}) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const row1 = colleges.filter((_, index) => index % 2 === 0);
  const row2 = colleges.filter((_, index) => index % 2 === 1);

  // Auto-dismiss active card after 2s
  useEffect(() => {
    if (!activeKey) return;
    const t = setTimeout(() => setActiveKey(null), 2000);
    return () => clearTimeout(t);
  }, [activeKey]);

  // Tap outside dismisses
  const handleSectionClick = () => setActiveKey(null);

  return (
    <section
      className="py-16 bg-white overflow-hidden"
      onClick={handleSectionClick}
    >
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 mb-4">
          <Building2 className="w-3 h-3 text-indigo-600" />
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Colleges On The Network</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mb-2">
          Students from these colleges<br className="hidden sm:block" />
          <span style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {' '}are already here.
          </span>
        </h2>
        <p className="text-sm text-gray-500 font-medium">Tap any college to see who's joined 👇</p>
      </div>

      {/* Live college rows */}
      {colleges.length > 0 ? (
        <>
          <MarqueeRow colleges={row1} rowId={1} activeKey={activeKey} onActivate={setActiveKey} />
          {row2.length > 0 && (
            <div className="mt-3">
              <MarqueeRow colleges={row2} reverse rowId={2} activeKey={activeKey} onActivate={setActiveKey} />
            </div>
          )}
        </>
      ) : (
        <div className="mx-auto max-w-md rounded-2xl border border-indigo-100 bg-indigo-50/50 px-5 py-4 text-center text-sm font-semibold text-indigo-600">
          Loading colleges from The Network…
        </div>
      )}

      {/* Bottom CTA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Stat chips */}
        <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start">
          <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-full px-3.5 py-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-bold text-green-700">Live</span>
          </div>
          <div className="text-sm text-gray-500 font-medium">
            <span className="text-gray-900 font-black">
              {collegeCount === null ? 'Loading colleges…' : `${collegeCount} college${collegeCount === 1 ? '' : 's'}`}
            </span>{' '}· growing every week
          </div>
        </div>

        {/* CTA button */}
        <button
          onClick={(e) => { e.stopPropagation(); onJoin(); }}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-white transition-all active:scale-95 hover:-translate-y-0.5 hover:shadow-lg"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 4px 18px rgba(99,102,241,0.35)', minWidth: 200 }}
        >
          <Building2 className="w-4 h-4" />
          Add Your College
          <ArrowRight className="w-4 h-4 ml-auto" />
        </button>
      </div>
    </section>
  );
}

/* ─── Partner Schools Section ─────────────────────────────── */
function PartnerSchools({
  onJoin,
  schoolCount,
  schools,
}: {
  onJoin: () => void;
  schoolCount: number | null;
  schools: LandingCollege[];
}) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const row1 = schools.filter((_, index) => index % 2 === 0);
  const row2 = schools.filter((_, index) => index % 2 === 1);

  useEffect(() => {
    if (!activeKey) return;
    const t = setTimeout(() => setActiveKey(null), 2000);
    return () => clearTimeout(t);
  }, [activeKey]);

  return (
    <section className="py-16 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 mb-4">
          <GraduationCap className="w-3 h-3 text-indigo-600" />
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Schools On The Network</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mb-2">
          Students from these schools<br className="hidden sm:block" />
          <span style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {' '}are already here.
          </span>
        </h2>
        <p className="text-sm text-gray-500 font-medium max-w-xl mx-auto">
          Students are joining from schools across India and building connections beyond their classrooms.
        </p>
      </div>

      {schools.length > 0 ? (
        <>
          <MarqueeRow colleges={row1} rowId={3} activeKey={activeKey} onActivate={setActiveKey} />
          {row2.length > 0 && (
            <div className="mt-3">
              <MarqueeRow colleges={row2} reverse rowId={4} activeKey={activeKey} onActivate={setActiveKey} />
            </div>
          )}
        </>
      ) : (
        <div className="mx-auto max-w-md rounded-2xl border border-indigo-100 bg-indigo-50/50 px-5 py-4 text-center text-sm font-semibold text-indigo-600">
          {schoolCount === null ? 'Loading schools from The Network…' : 'School communities will appear here as students add their school.'}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start">
          <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-full px-3.5 py-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-bold text-green-700">Live</span>
          </div>
          <div className="text-sm text-gray-500 font-medium">
            <span className="text-gray-900 font-black">
              {schoolCount === null ? 'Loading schools…' : `${schoolCount} school${schoolCount === 1 ? '' : 's'} represented`}
            </span>{' '}· growing every week
          </div>
        </div>

        <button
          onClick={onJoin}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-white transition-all active:scale-95 hover:-translate-y-0.5 hover:shadow-lg"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 4px 18px rgba(99,102,241,0.35)', minWidth: 200 }}
        >
          <GraduationCap className="w-4 h-4" />
          Add Your School
          <ArrowRight className="w-4 h-4 ml-auto" />
        </button>
      </div>
    </section>
  );
}

/* ─── Main LandingPage Component ─────────────────────────── */
export default function LandingPage({ onJoin, onLogin }: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeFeature, setActiveFeature] = useState<number | null>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [liveStats, setLiveStats] = useState<LandingStats | null>(null);
  const [schoolDirectory, setSchoolDirectory] = useState<LandingCollege[]>([]);
  const [schoolDirectoryLoaded, setSchoolDirectoryLoaded] = useState(false);

  useEffect(() => {
    const fn = () => {
      setScrolled(window.scrollY > 20);
      setShowStickyBar(window.scrollY > 500);
    };
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    let mounted = true;
    api.publicStats()
      .then((stats) => {
        if (mounted) {
          setLiveStats(stats);
          setSchoolDirectory((stats.schoolDirectory || []).map(toCollegeCard));
          setSchoolDirectoryLoaded(true);
        }
      })
      .catch((error) => {
        console.error('Failed to load public landing stats:', error);
        if (mounted) setSchoolDirectoryLoaded(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>

      {/* ═══ HEADER ══════════════════════════════════════════════ */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/96 backdrop-blur-xl shadow-[0_1px_24px_rgba(99,102,241,0.10)]' : 'bg-white/78 backdrop-blur-xl'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16 sm:h-16">

          {/* Logo — same N icon from app */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="rounded-xl bg-white shadow-[0_6px_18px_rgba(99,102,241,0.16)]">
              <NetworkLogo size={34} />
            </div>
            <div>
              <div className="text-[13px] sm:text-sm font-black text-gray-900 leading-tight tracking-tight">The Network</div>
              <div className="text-[8px] sm:text-[9px] text-indigo-500 font-semibold leading-none">One Network. Every School.</div>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {[{ label: 'Home', id: 'hero' }, { label: 'Communities', id: 'communities' }, { label: 'Opportunities', id: 'opportunities' }, { label: 'About Us', id: 'vision' }].map(item => (
              <button key={item.id} onClick={() => scrollTo(item.id)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                {item.label}
              </button>
            ))}
          </nav>

          {/* CTAs */}
          <div className="hidden md:flex items-center gap-2">
            <button onClick={onLogin}
              className="px-4 py-2 text-sm font-bold text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
              Log in
            </button>
            <button onClick={onJoin}
              className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold text-white rounded-xl transition-all shadow-md hover:shadow-indigo-300 hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}>
              Join The Network
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden w-10 h-10 rounded-xl border border-indigo-100 bg-white/80 shadow-sm hover:bg-indigo-50 active:scale-95 transition-all flex items-center justify-center"
            onClick={() => setMobileMenuOpen(v => !v)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            <div className="w-5 space-y-1.5">
              <span className="block h-0.5 rounded-full bg-indigo-700 transition-all" style={{ transform: mobileMenuOpen ? 'translateY(8px) rotate(45deg)' : '' }} />
              <span className="block h-0.5 rounded-full bg-indigo-700 transition-all" style={{ opacity: mobileMenuOpen ? 0 : 1 }} />
              <span className="block h-0.5 rounded-full bg-indigo-700 transition-all" style={{ transform: mobileMenuOpen ? 'translateY(-8px) rotate(-45deg)' : '' }} />
            </div>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-1 shadow-lg">
            {[{ label: 'Communities', id: 'communities' }, { label: 'Opportunities', id: 'opportunities' }, { label: 'About Us', id: 'vision' }].map(item => (
              <button key={item.id} onClick={() => scrollTo(item.id)}
                className="flex w-full items-center px-3 py-3 text-sm font-semibold text-gray-700 hover:bg-indigo-50 active:bg-indigo-100 rounded-xl transition-all">
                {item.label}
              </button>
            ))}
            <div className="pt-2 space-y-2">
              <button onClick={onLogin} className="block w-full text-center py-3 text-sm font-bold text-gray-700 border border-gray-200 rounded-xl active:scale-95 transition-all">Log in</button>
              <button onClick={onJoin} className="block w-full text-center py-3.5 text-sm font-bold text-white rounded-xl active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}>Join The Network →</button>
            </div>
          </div>
        )}
      </header>

      {/* ═══ HERO ════════════════════════════════════════════════ */}
      <section id="hero" className="relative pt-16 sm:pt-16 overflow-hidden min-h-0 lg:min-h-[100svh] bg-[#f8f9ff]">
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse 90% 55% at 78% 12%, rgba(124,58,237,0.14) 0%, transparent 65%), radial-gradient(ellipse 75% 60% at 10% 72%, rgba(99,102,241,0.10) 0%, transparent 68%), linear-gradient(180deg, #fbfbff 0%, #f7f7ff 100%)'
        }} />
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: 'linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(90deg, #6366f1 1px, transparent 1px)', backgroundSize: '42px 42px' }} />
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.18) 0%, transparent 68%)', animation: 'pulse 4s ease-in-out infinite' }} />
        <div className="absolute top-48 -left-28 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-5 sm:gap-8 lg:gap-8 items-center">

            {/* ── Left: Text ── */}
            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 mb-6 sm:mb-6 px-3.5 py-2 sm:px-4 sm:py-2 rounded-full border border-indigo-200/80 bg-white/90 backdrop-blur-xl shadow-[0_8px_24px_rgba(99,102,241,0.12)]">
                <span className="text-sm">🇮🇳</span>
                <span className="text-[10px] sm:text-xs font-bold text-indigo-700">India's Student Network</span>
                <span className="relative flex h-1.5 w-1.5 rounded-full bg-green-500">
                  <span className="animate-ping absolute h-1.5 w-1.5 rounded-full bg-green-400 opacity-75" />
                </span>
                <span className="text-[9px] sm:text-[10px] text-green-600 font-semibold">Live</span>
              </div>

              <h1 className="text-[2.18rem] sm:text-5xl lg:text-6xl font-black text-gray-900 leading-[0.99] sm:leading-[1.06] mb-5 sm:mb-5 tracking-[-0.045em]">
                One Network. Every School.<br />
                <span style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 60%, #a855f7 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Every Campus. Every Student.
                </span>
              </h1>

              <p className="text-[13px] sm:text-base text-gray-600 leading-[1.5] sm:leading-relaxed mb-2.5 sm:mb-3 max-w-md">
                The Network is a student networking platform where students can connect with people from different schools, colleges and communities across India.
              </p>
              <p className="text-[13px] sm:text-base text-gray-600 leading-[1.5] sm:leading-relaxed mb-6 sm:mb-7 max-w-md">
                Find study partners, project teammates, mentors and students with similar interests. Join communities, share resources, ask questions and learn together.
              </p>

              {/* CTA buttons — stack on mobile, row on sm+ */}
              <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 mb-6 sm:mb-8">
                <button onClick={onJoin}
                  className="group flex items-center justify-center gap-2 min-h-[52px] px-7 py-3 sm:py-4 text-[13px] sm:text-sm font-bold text-white rounded-2xl transition-all hover:-translate-y-0.5 hover:shadow-2xl active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 58%, #9333ea 100%)', boxShadow: '0 12px 32px rgba(99,102,241,0.32)' }}>
                  Join The Network
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <button onClick={() => scrollTo('communities')}
                  className="flex items-center justify-center gap-2 min-h-[52px] px-7 py-3 sm:py-4 text-[13px] sm:text-sm font-bold text-gray-800 bg-white/90 rounded-2xl border border-indigo-100 hover:border-indigo-300 hover:shadow-lg active:scale-95 transition-all">
                  Explore Communities
                </button>
                <InstallAppButton
                  id="landing-install-app-button"
                  className="inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-3 text-[13px] sm:text-sm font-bold text-indigo-700 bg-white/90 rounded-2xl border border-indigo-200 hover:border-indigo-300 hover:shadow-lg active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                />
              </div>

              {/* Student-built proof */}
              <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-white/80 bg-white/55 text-[10px] sm:text-xs font-semibold text-gray-500 whitespace-nowrap shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Built by students at NIT Trichy <span className="text-gray-300">•</span> For students across India
              </div>
            </div>

            {/* ── Right: India Map — desktop only ── */}
            <div className="relative hidden lg:block h-[580px]" style={{ overflow: 'visible' }}>
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse 80% 80% at 50% 48%, rgba(99,102,241,0.07) 0%, transparent 70%)' }} />
              <div className="absolute bottom-6 right-0 z-30 bg-white/95 backdrop-blur-xl rounded-2xl p-4"
                style={{ boxShadow: '0 8px 40px rgba(99,102,241,0.18)', border: '1px solid #e0e7ff', minWidth: 168 }}>
                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Students already joined</div>
                <div className="text-2xl font-black text-gray-900 mb-1">
                  <LiveCount value={liveStats?.students ?? null} />
                </div>
                {['Schools and colleges', 'Communities', 'People and possibilities'].map(t => (
                  <div key={t} className="flex items-center gap-1.5 mb-0.5">
                    <TrendingUp className="w-2.5 h-2.5 text-indigo-400" />
                    <span className="text-[9px] text-gray-500 font-medium">{t}</span>
                  </div>
                ))}
              </div>
              <div className="absolute inset-0" style={{ zIndex: 10 }}>
                <IndiaMap onJoin={onJoin} />
              </div>
            </div>

            {/* ── Mobile-only: mini stats strip ── */}
              <div className="lg:hidden grid grid-cols-2 gap-2.5 sm:gap-3 pt-1">
              {[
                  { icon: GraduationCap, value: liveStats?.students ?? null, label: 'Students already joined' },
                  { icon: Building2, value: liveStats?.colleges ?? null, label: 'Colleges' },
                  { icon: GraduationCap, value: '10+', label: 'Schools represented' },
              ].map(s => (
                <div
                  key={s.label}
                  className={`group bg-white/90 rounded-2xl border border-indigo-100/80 p-3.5 sm:p-4 flex items-center gap-2.5 sm:gap-3 shadow-[0_8px_24px_rgba(79,70,229,0.08)] hover:-translate-y-0.5 transition-transform min-h-[68px] ${s.label === 'Schools represented' ? 'col-span-2 sm:col-span-1 bg-gradient-to-r from-white to-indigo-50/70' : ''}`}
                >
                  <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #e9d5ff 100%)' }}>
                    <s.icon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 group-hover:scale-110 transition-transform" />
                  </span>
                  <div>
                     <div className="text-lg sm:text-lg font-black text-gray-900 leading-tight tracking-tight">
                        {typeof s.value === 'string' ? s.value : <LiveCount value={s.value} />}
                     </div>
                    <div className="text-[10px] sm:text-[11px] text-gray-500 font-medium leading-tight">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Mobile-only: founding team teaser ── */}
            <button
              onClick={() => scrollTo('founding-members')}
              className="lg:hidden flex items-center gap-3 w-full mt-0.5 p-3 rounded-2xl border border-indigo-100 bg-white/75 backdrop-blur-sm shadow-[0_8px_24px_rgba(99,102,241,0.08)] text-left hover:bg-white active:scale-[0.99] transition-all"
            >
              <div className="flex -space-x-2 flex-shrink-0">
                <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-sm bg-indigo-100">
                  <img src="/images/founder-1.jpg" alt="" loading="lazy" decoding="async" className="w-full h-full object-cover object-top" />
                </div>
                <div className="w-9 h-9 rounded-full flex items-center justify-center border-2 border-white shadow-sm text-xs font-black text-white"
                  style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' }}>
                  S
                </div>
                <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-sm bg-sky-100">
                  <img src="/images/ruthvik.png" alt="" loading="lazy" decoding="async" className="w-full h-full object-cover object-top" />
                </div>
                <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-sm bg-rose-100">
                  <img src="/images/ananya-gupta-upright.jpg" alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                </div>
                <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-sm bg-cyan-100">
                  <img src="/images/rehan-shashi.png" alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-indigo-600">Meet the founding members</div>
                <div className="mt-0.5 text-xs font-semibold text-gray-600">Rehan Shashi and the founding team</div>
              </div>
              <ArrowRight className="w-4 h-4 flex-shrink-0 text-indigo-500" />
            </button>
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden sm:flex flex-col items-center gap-1.5 animate-bounce opacity-60">
          <span className="text-[10px] font-semibold text-gray-400 tracking-wider uppercase">Scroll</span>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>
      </section>

      {/* ═══ FOUNDING MEMBERS ═══════════════════════════════════ */}
      <FoundingMembersSection />

      {/* ═══ WHAT IS THE NETWORK ═════════════════════════════════ */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 mb-4">
              <Users className="w-3 h-3 text-indigo-600" />
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">What Is The Network?</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">A Bigger Network for Every Student</h2>
          </div>
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-10 items-stretch">
            <div className="rounded-3xl border border-gray-100 bg-gray-50 p-6 sm:p-8">
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-4">
                As students, our network is often limited to the people around us.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {['Our school', 'Our college', 'Our coaching institute', 'Our city', 'Sometimes even our village', 'And sometimes, that’s all we know'].map((item, index) => (
                  <div key={item} className={`rounded-2xl border p-3 text-sm font-bold ${index === 5 ? 'border-indigo-200 bg-indigo-50 text-indigo-700 col-span-2' : 'border-gray-100 bg-white text-gray-700'}`}>
                    {item}
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                But there are students across India who are interested in the same things we are.
              </p>
            </div>
            <div className="rounded-3xl border border-indigo-100 bg-indigo-50/60 p-6 sm:p-8">
              <p className="text-sm sm:text-base font-bold text-gray-900 mb-4">The Network helps you find them.</p>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {['Someone learning Python', 'Someone preparing for JEE', 'Someone building a robotics project', 'Someone interested in aerospace', 'Someone exploring AI', 'Someone looking for a project partner'].map(item => (
                  <div key={item} className="rounded-2xl border border-indigo-100 bg-white p-3 text-xs sm:text-sm font-semibold text-gray-700">
                    {item}
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Connect with people from your own school or college, your city or village, and completely different parts of India.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CORE IDEA ═══════════════════════════════════════════ */}
      <section className="py-14 sm:py-20" style={{ background: 'linear-gradient(180deg, #f8f9ff 0%, #fafafa 100%)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-indigo-100 mb-4">
            <Sparkles className="w-3 h-3 text-indigo-600" />
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">The Core Idea</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">Your Network Can Be Much Bigger.</h2>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
            {['Your School', 'Your College', 'Your City / Village', 'Students Across India'].map((step, index) => (
              <React.Fragment key={step}>
                <div className="rounded-2xl border border-gray-100 bg-white px-4 py-5 shadow-sm">
                  <div className="text-sm font-black text-gray-900">{step}</div>
                </div>
                {index < 3 && <div className="hidden sm:block text-2xl font-black text-indigo-300">↓</div>}
              </React.Fragment>
            ))}
          </div>
          <div className="mt-8 max-w-2xl mx-auto text-sm sm:text-base text-gray-600 leading-relaxed">
            <p>Your school is a network. Your college is a network. Your city is a network. Your village is a network.</p>
            <p className="mt-2 font-bold text-indigo-600">But your network doesn’t have to end there.</p>
            <p className="mt-2">The Network brings these networks together, so you can stay connected to the people around you while discovering students across India.</p>
          </div>
        </div>
      </section>

      {/* ═══ PILLARS ════════════════════════════════════════════ */}
      <section className="py-12 sm:py-16" style={{ background: 'linear-gradient(180deg, #f8f9ff 0%, #fafafa 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-indigo-100 mb-4">
              <GraduationCap className="w-3 h-3 text-indigo-600" />
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Who It's For</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight">For Every Student</h2>
          </div>
          {/* Mobile: horizontal scroll  Desktop: grid */}
          <div className="flex gap-3 overflow-x-auto pb-2 sm:pb-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {AUDIENCE_CARDS.map(({ icon: Icon, title, desc }, i) => (
              <div key={i}
                className="group bg-white rounded-2xl p-5 border border-gray-100 hover:border-indigo-200 hover:shadow-xl active:scale-95 transition-all duration-200 cursor-default flex-shrink-0 w-64 sm:w-auto snap-start">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4 transition-all group-hover:scale-110"
                  style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #ede9fe 100%)' }}>
                  <Icon className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="text-sm font-black text-gray-900 mb-1.5">{title}</div>
                <div className="text-xs text-gray-500 leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ WHAT YOU CAN DO ════════════════════════════════════ */}
      <section className="py-14 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 mb-4">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Find The Right People</span>
            </div>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-gray-900 tracking-tight">
              Find People Who Are<br className="hidden sm:block" /> On A Similar Path
            </h2>
            <p className="mt-3 text-sm text-gray-500 max-w-xl mx-auto">
              Connect with students who are learning, preparing, building and growing towards goals like yours.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PEOPLE_FEATURES.map(({ icon: Icon, title, desc }, i) => {
              const isActive = activeFeature === i;
              return (
                <div key={i}
                  className="group relative bg-white rounded-3xl p-6 sm:p-7 border transition-all duration-200 cursor-pointer overflow-hidden active:scale-[0.98]"
                  style={{
                    borderColor: isActive ? 'transparent' : '#f1f5f9',
                    boxShadow: isActive ? '0 8px 40px rgba(99,102,241,0.18)' : '0 1px 4px rgba(0,0,0,0.04)',
                    transform: isActive ? 'translateY(-2px)' : 'none',
                  }}
                  onPointerEnter={() => setActiveFeature(i)}
                  onPointerLeave={() => setActiveFeature(null)}
                  onClick={onJoin}>
                  <div className="absolute inset-0 transition-opacity duration-200 rounded-3xl"
                    style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #ede9fe 100%)', opacity: isActive ? 1 : 0 }} />
                  <div className="relative z-10">
                    <div className="w-13 h-13 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mb-4 sm:mb-5 transition-all duration-200"
                      style={{ background: isActive ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' : 'linear-gradient(135deg, #eef2ff 0%, #ede9fe 100%)' }}>
                      <Icon className={`w-5 h-5 sm:w-6 sm:h-6 transition-colors duration-200 ${isActive ? 'text-white' : 'text-indigo-600'}`} />
                    </div>
                    <div className="text-sm sm:text-base font-black text-gray-900 mb-2">{title}</div>
                    <div className="text-xs sm:text-sm text-gray-500 leading-relaxed mb-3">{desc}</div>
                    {/* Always visible on mobile, animated on desktop */}
                    <div className={`flex items-center gap-1 text-xs font-bold text-indigo-600 sm:transition-all sm:duration-300 ${isActive ? 'opacity-100 translate-x-0' : 'sm:opacity-0 sm:-translate-x-2'}`}>
                      Get started <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ COMMUNITIES ════════════════════════════════════════ */}
      <section id="communities" className="py-20" style={{ background: 'linear-gradient(180deg, #f8f9ff 0%, #fafafa 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-12">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 mb-4">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Explore Communities</span>
              </div>
               <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
                 Learn With People,<br />Not Alone.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-gray-500">
                 The Network is building communities around the things students care about. Inside communities, students can ask questions, share resources, discuss ideas and learn together.
              </p>
            </div>
            <button onClick={onJoin} className="hidden sm:flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-700 px-4 py-2 hover:bg-indigo-50 rounded-xl transition-all">
               Explore Communities <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {COMMUNITIES.map((c, i) => (
              <div key={i} className="group cursor-pointer" onClick={onJoin}>
                <div className={`relative bg-gradient-to-br ${c.color} rounded-2xl h-40 flex flex-col justify-end p-4 overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl`}>
                  {/* Big emoji background */}
                  <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-15 group-hover:opacity-25 transition-opacity">
                    {c.emoji}
                  </div>
                  {/* Shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  <div className="relative z-10">
                    <div className="text-white text-[11px] font-black leading-tight">{c.name}</div>
                    <div className="text-white/70 text-[9px] font-medium">{c.college}</div>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between px-1">
                   <div className="text-[10px] text-gray-500 font-semibold">Student community</div>
                   <div className="text-[10px] text-indigo-600 font-bold group-hover:underline">Explore →</div>
                </div>
              </div>
            ))}
          </div>

          {/* Community type pills — horizontal scroll on mobile */}
          <div className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:justify-center"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
             {COMMUNITY_TYPES.map(({ icon: Icon, label }) => (
              <button key={label} onClick={onJoin}
                className="flex-shrink-0 group flex items-center gap-2 bg-white border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 active:bg-indigo-100 active:scale-95 text-gray-700 hover:text-indigo-700 rounded-full px-4 py-2.5 text-xs font-bold transition-all">
                <Icon className="w-3 h-3 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                {label}
              </button>
            ))}
             <button onClick={onJoin}
              className="flex-shrink-0 flex items-center gap-2 text-white text-xs font-bold px-5 py-2.5 rounded-full transition-all active:scale-95 hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
               Explore Communities
            </button>
          </div>
           <p className="mt-5 text-center text-sm text-gray-500">
             The goal isn’t just to create another group. The goal is to create communities that are actually useful.
           </p>
        </div>
      </section>

      {/* ═══ LOCAL + NATIONAL NETWORK ═══════════════════════════ */}
      <section className="py-14 sm:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 mb-4">
              <MapPin className="w-3 h-3 text-indigo-600" />
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Local + National</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">Your Community. Your Country. One Network.</h2>
            <p className="mt-3 max-w-2xl mx-auto text-sm sm:text-base text-gray-500 leading-relaxed">
              You don’t have to choose between your own school or college and students across India. You can have both.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-9 gap-3 items-center">
            {['Your School', '+', 'Your College', '+', 'Your City / Village', '+', 'Communities', '+', 'Students Across India'].map((item, index) => (
              <div key={`${item}-${index}`} className={item === '+' ? 'hidden sm:flex items-center justify-center text-2xl font-black text-indigo-300' : 'rounded-2xl border border-gray-100 bg-gray-50 px-3 py-4 text-center text-xs sm:text-sm font-black text-gray-800'}>
                {item}
              </div>
            ))}
          </div>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
            {['Connect with your own school.', 'Connect with your city.', 'Connect with your college.', 'Discover students across India.'].map(item => (
              <div key={item} className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-xs font-black text-indigo-600">✓</span>
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ OPPORTUNITIES ══════════════════════════════════════ */}
      <section id="opportunities" className="py-14 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-8 sm:mb-12">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 mb-4">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Discover Possibilities</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight">
                Discover possibilities<br />beyond your surroundings.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-gray-500">
                Today, The Network helps students find people, communities, resources, guidance and opportunities to learn, build and grow.
              </p>
            </div>
            <button onClick={onJoin} className="flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-700 px-3 py-2 hover:bg-indigo-50 active:bg-indigo-100 rounded-xl transition-all">
              View all <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile: horizontal scroll  Desktop: grid */}
          <div className="flex gap-3 overflow-x-auto pb-3 sm:pb-0 sm:grid sm:grid-cols-2 lg:grid-cols-5 snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {OPPORTUNITIES.map((opp, i) => (
              <div key={i} onClick={onJoin}
                className="flex-shrink-0 w-64 sm:w-auto snap-start group bg-white rounded-2xl p-5 border border-gray-100 hover:border-indigo-200 hover:shadow-xl active:scale-95 transition-all duration-200 cursor-pointer">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                    style={{ backgroundColor: opp.bg }}>
                    {opp.logo}
                  </div>
                  <div>
                    <div className="text-xs font-black text-gray-900 leading-tight">{opp.company}</div>
                    <div className="text-[9px] text-gray-400 font-medium flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5" />{opp.location}
                    </div>
                  </div>
                </div>
                <div className="text-xs font-bold text-gray-800 mb-3 group-hover:text-indigo-700 transition-colors leading-snug">{opp.role}</div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#eef2ff', color: '#4f46e5' }}>{opp.type}</span>
                  <span className="text-[9px] text-gray-400 font-medium">{opp.deadline}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW THE NETWORK WORKS ══════════════════════════════ */}
      <section className="py-14 sm:py-20" style={{ background: 'linear-gradient(180deg, #f8f9ff 0%, #ffffff 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 mb-4">
              <Zap className="w-3 h-3 text-indigo-600" />
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">How The Network Works</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight">Discover → Connect → Learn → Build → Grow</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {HOW_IT_WORKS.map(({ icon: Icon, title, desc }, index) => (
              <div key={title} className="relative rounded-2xl border border-gray-100 bg-white p-5 hover:border-indigo-200 hover:shadow-lg transition-all">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: 'linear-gradient(135deg, #eef2ff, #ede9fe)' }}>
                  <Icon className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="text-sm font-black text-gray-900 mb-1">{title}</div>
                <div className="text-xs text-gray-500 leading-relaxed">{desc}</div>
                {index < HOW_IT_WORKS.length - 1 && <div className="hidden lg:block absolute -right-2 top-9 text-indigo-300 font-black">→</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ IDENTITY SHOWCASE ══════════════════════════════════ */}
      <section className="py-14 sm:py-20 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%)' }}>
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #818cf8, transparent 70%)' }} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-3 gap-6 sm:gap-8 items-start">
            {/* Left: Copy */}
            <div className="lg:col-span-1">
              <div className="text-indigo-300 text-xs font-bold uppercase tracking-widest mb-4">Your Identity</div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-4 leading-tight">
                You are more than<br />your school or college.<br />
                <span className="text-indigo-300 italic">You have an identity.</span>
              </h2>
              <p className="text-indigo-200 text-sm leading-relaxed mb-6">
                Showcase your skills, achievements and interests. Get discovered. Get opportunities.
              </p>
              <button onClick={onJoin}
                className="w-full sm:w-auto px-7 py-3.5 font-bold text-sm text-indigo-900 bg-white rounded-2xl hover:bg-indigo-50 active:scale-95 transition-all hover:shadow-xl">
                Create Your Profile
              </button>
            </div>

            {/* Center: Profile card */}
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-5 sm:p-6 border border-white/20 active:border-white/40 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>A</div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <div className="font-black text-white text-sm">Aditya Sharma</div>
                    <div className="w-4 h-4 rounded-full bg-indigo-400 flex items-center justify-center">
                      <Star className="w-2.5 h-2.5 text-white fill-white" />
                    </div>
                  </div>
                  <div className="text-indigo-300 text-[11px] font-semibold">NIT Trichy</div>
                  <div className="text-indigo-200/70 text-[10px]">Web Developer • Open Source</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {['React', 'Node.js', 'GSA', 'Open Source', 'LRUX'].map(tag => (
                  <span key={tag} className="text-[9px] bg-white/15 border border-white/20 text-white px-2.5 py-1 rounded-full font-semibold">{tag}</span>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2 bg-white/5 rounded-2xl p-3">
                {[{ val: 'Skills', label: 'Learning' }, { val: 'Projects', label: 'Building' }, { val: 'Interests', label: 'Exploring' }, { val: 'Goals', label: 'Growing' }].map(s => (
                  <div key={s.label} className="text-center">
                    <div className="font-black text-white text-xs sm:text-sm">{s.val}</div>
                    <div className="text-indigo-300 text-[8px] leading-tight font-medium">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Skills */}
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-5 sm:p-6 border border-white/20 transition-all">
              <div className="text-indigo-300 text-xs font-bold uppercase tracking-widest mb-4">Top Skills</div>
              {[['React', 92], ['Node.js', 85], ['MongoDB', 78], ['Python', 72], ['Git', 88]].map(([skill, pct]) => (
                <div key={skill as string} className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-white font-bold">{skill}</span>
                    <span className="text-xs text-indigo-300 font-semibold">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #818cf8, #a78bfa)' }} />
                  </div>
                </div>
              ))}
              <button onClick={onJoin}
                className="mt-4 w-full text-center text-xs text-indigo-300 hover:text-white active:text-white font-bold flex items-center justify-center gap-1 py-2 transition-colors">
                View Full Profile <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ ACCESS GAP ═══════════════════════════════════════ */}
      <section id="vision" className="py-20" style={{ background: '#f8f9ff' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 mb-4">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">The Problem We Want To Change</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-5 tracking-tight">
              Sometimes It’s Not an Ability Gap.<br />It’s an Access Gap.
            </h2>
            <p className="text-base text-gray-500 leading-relaxed max-w-2xl mx-auto">
              A student may be curious, willing to learn and capable — but still not know what they can learn, what fields exist, what other students are doing, who they can ask or where opportunities are available.
            </p>
          </div>

          {/* Story card */}
          <div className="bg-white rounded-3xl border border-gray-100 p-8 mb-10 shadow-sm hover:shadow-md transition-all">
            <div className="text-center mb-6">
              <div className="text-lg font-black text-gray-900 mb-2">Students shouldn’t have to wait to discover what’s possible.</div>
              <p className="text-sm text-gray-500">A student should not have to wait until college to discover coding, move to another city to discover robotics or already know the right people to find guidance.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { role: 'Discover coding', college: 'Before college', icon: '💻', color: 'bg-blue-50 border-blue-200' },
                { role: 'Explore robotics', college: 'From anywhere', icon: '⚙️', color: 'bg-pink-50 border-pink-200' },
                { role: 'Find guidance', college: 'Without already knowing someone', icon: '🧭', color: 'bg-purple-50 border-purple-200' },
                { role: 'Meet similar students', college: 'Across India', icon: '🤝', color: 'bg-green-50 border-green-200' },
              ].map(p => (
                <div key={p.role} className={`${p.color} border rounded-2xl p-4 text-center hover:scale-105 transition-transform cursor-default`}>
                  <div className="text-3xl mb-2">{p.icon}</div>
                  <div className="text-xs font-black text-gray-900">{p.role}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5 font-medium">{p.college}</div>
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-gray-700 font-bold">
              Students should be able to discover possibilities while they are still exploring what they want to do.
            </p>
          </div>

          <div className="text-center mb-6">
            <h3 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">We Want To Make Access Bigger.</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ACCESS_CARDS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3 bg-white rounded-2xl border border-gray-100 p-5 hover:border-indigo-200 hover:shadow-md transition-all group">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"
                  style={{ background: 'linear-gradient(135deg, #eef2ff, #ede9fe)' }}>
                  <Icon className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <div className="text-sm font-black text-gray-900">{title}</div>
                  <div className="text-xs text-gray-500 leading-relaxed mt-1">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FOUNDER ═══════════════════════════════════════════ */}
      <FounderSection onJoin={onJoin} />

      {/* ═══ BIGGER VISION + IMPACT ════════════════════════════ */}
      <section className="py-14 sm:py-20" style={{ background: '#f8f9ff' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-10 items-start">
            <div className="rounded-3xl bg-white border border-gray-100 p-6 sm:p-8 shadow-sm">
              <div className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-4">The Bigger Vision</div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mb-4">We’re Building More Than a Student Platform.</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-5">
                Today, we’re helping students find people, communities, resources, guidance and opportunities.
              </p>
              <p className="text-sm text-gray-600 leading-relaxed mb-5">
                The long-term vision is a connected network of students across India where every student can find the people, knowledge and opportunities they need to learn, build and grow.
              </p>
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                <div className="text-xs font-black text-indigo-700 uppercase tracking-widest mb-1">Long-term vision</div>
                <div className="text-sm font-bold text-gray-800">Discover → Connect → Learn → Build → Compete → Grow</div>
                <div className="text-[11px] text-gray-500 mt-2">The later stages are part of the long-term vision, not a claim about everything available today.</div>
              </div>
            </div>
            <div className="rounded-3xl bg-white border border-gray-100 p-6 sm:p-8 shadow-sm">
              <div className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-4">The Impact We Want To Create</div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mb-5">Imagine What Happens When Every Student Has Access To A Bigger Network.</h2>
              <div className="space-y-3">
                {IMPACT_POINTS.map(point => (
                  <div key={point} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #eef2ff, #ede9fe)' }}>
                      <ArrowRight className="w-3 h-3 text-indigo-600" />
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{point}</p>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-sm font-black text-gray-900">Not just more connections. <span className="text-indigo-600">More possibilities.</span></p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ COMMUNITY BUILDERS ═════════════════════════════════ */}
      <section className="py-14 sm:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="relative rounded-3xl p-6 sm:p-10 lg:p-14 text-center overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #ede9fe 100%)' }}>
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-30 pointer-events-none"
              style={{ background: 'radial-gradient(circle, #818cf8, transparent)' }} />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full opacity-30 pointer-events-none"
              style={{ background: 'radial-gradient(circle, #a78bfa, transparent)' }} />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-white text-xs font-bold mb-5"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                <Crown className="w-3 h-3" /> Student Community Builders
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900 mb-3 tracking-tight">
                Help Build Your Community.<br />
                <span style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Make Student Connections Bigger.
                </span>
              </h2>
              <p className="text-sm text-gray-600 mb-6 max-w-lg mx-auto leading-relaxed">
                We’re looking for students who want to help build their own school or college community on The Network. You don’t need thousands of followers or expert credentials — you just need to care about making your student community more connected.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 max-w-2xl mx-auto text-left">
                {[
                  { icon: Users, text: 'Bring interested students together' },
                  { icon: BookOpenIcon, text: 'Start discussions and share resources' },
                  { icon: Handshake, text: 'Give feedback on what students need' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-indigo-100/60 active:scale-[0.98] transition-all">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #eef2ff, #ede9fe)' }}>
                      <Icon className="w-4 h-4 text-indigo-600" />
                    </div>
                    <span className="text-xs text-gray-700 font-semibold leading-snug">{text}</span>
                  </div>
                ))}
              </div>
              <button onClick={onJoin}
                className="w-full sm:w-auto px-8 py-4 font-bold text-sm text-white rounded-2xl transition-all hover:-translate-y-0.5 hover:shadow-2xl active:scale-95"
                style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', boxShadow: '0 8px 32px rgba(99,102,241,0.35)' }}>
                Become a Community Builder
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PARTNER COLLEGES ══════════════════════════════════ */}
      <PartnerColleges
        onJoin={onJoin}
        collegeCount={liveStats?.colleges ?? null}
        colleges={(liveStats?.collegeDirectory ?? []).map(toCollegeCard)}
      />

      <PartnerSchools
        onJoin={onJoin}
        schoolCount={schoolDirectoryLoaded ? schoolDirectory.length : null}
        schools={schoolDirectory}
      />

      {/* ═══ SCHOOL TO COLLEGE MESSAGE ═════════════════════════ */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-tight">
            Your network starts at school.<br />
            It continues through college.<br />
            <span className="text-indigo-600">But it doesn't have to end there.</span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-gray-500 leading-relaxed">
            The Network helps students connect with people beyond their own school, college, city or surroundings — so they can discover new skills, communities, opportunities and people across India.
          </p>
        </div>
      </section>

      {/* ═══ FINAL CTA ════════════════════════════════════════ */}
      <section className="py-16 sm:py-20 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f0a2e 0%, #1e1b4b 50%, #312e81 100%)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(99,102,241,0.2) 0%, transparent 70%)' }} />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="flex justify-center mb-5">
            <NetworkLogo size={56} />
          </div>
           <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white mb-4 tracking-tight">
             Your Network Can Be Much Bigger<br className="hidden sm:block" /> Than Your Surroundings.
          </h2>
           <p className="text-indigo-300 mb-7 text-sm font-medium leading-relaxed">
             Start with your school.<br />
             Start with your college.<br />
             Start with your city or village.<br />
             Then discover what’s beyond it.
           </p>
           <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
             <button onClick={onJoin}
               className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-10 py-4 font-black text-base text-white rounded-2xl transition-all hover:-translate-y-0.5 hover:shadow-2xl active:scale-95"
               style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)', boxShadow: '0 8px 40px rgba(99,102,241,0.4)' }}>
               Join The Network <ArrowRight className="w-5 h-5" />
             </button>
             <button onClick={() => scrollTo('communities')}
               className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 font-bold text-sm text-white border border-indigo-300/50 rounded-2xl hover:bg-white/10 active:scale-95 transition-all">
               Explore Communities <ChevronRight className="w-4 h-4" />
             </button>
           </div>
          <p className="mt-6 text-xs text-indigo-400 font-medium leading-relaxed">
              The Network<br className="sm:hidden" /> Connect. Learn. Grow.
          </p>
        </div>
      </section>

      {/* ═══ FOOTER ════════════════════════════════════════════ */}
      <footer style={{ background: '#07060f' }} className="text-gray-500 pt-12 pb-24 sm:pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Brand row + social — always full-width on mobile */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-8 mb-10">
            <div className="flex-shrink-0">
              <div className="flex items-center gap-2.5 mb-3">
                <NetworkLogo size={36} />
                <div>
                  <div className="text-white text-sm font-black">The Network</div>
                  <div className="text-indigo-400 text-[9px] font-medium">Every School. Every Campus. Every Student.</div>
                </div>
              </div>
              <p className="text-xs leading-relaxed mb-4 text-gray-500 max-w-xs">
                 Connecting every school, college, community and student in India.
              </p>
              <div className="flex items-center gap-2.5">
                {[Instagram, Linkedin, Twitter, Youtube].map((Icon, i) => (
                  <button key={i} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-indigo-600 active:scale-90 flex items-center justify-center transition-all">
                    <Icon className="w-4 h-4 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>

            {/* Link columns — 3 cols on mobile, inline on sm+ */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 flex-1">
              {[
                { title: 'Platform',  links: ['Communities','Opportunities','Events','Groups'] },
                { title: 'Company',   links: ['About Us','Careers','Contact Us','Privacy Policy'] },
                { title: 'Resources', links: ['Blog','Community Builder','Help','Guidelines'] },
              ].map(col => (
                <div key={col.title}>
                  <div className="text-white text-xs font-black mb-3 uppercase tracking-wider">{col.title}</div>
                  <ul className="space-y-2">
                    {col.links.map(link => (
                      <li key={link}>
                        <button className="text-xs text-gray-500 hover:text-indigo-400 active:text-indigo-300 font-medium transition-colors">{link}</button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Newsletter */}
            <div className="sm:w-52 flex-shrink-0">
              <div className="text-white text-xs font-black mb-3 uppercase tracking-wider">Stay Updated</div>
              <div className="flex flex-col gap-2">
                <input type="email" placeholder="Enter your email"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  style={{ fontSize: 16 /* prevent iOS zoom */ }} />
                <button onClick={onJoin}
                  className="w-full text-white text-xs font-bold py-3 rounded-xl transition-all active:scale-95 hover:shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                  Subscribe
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-5 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="text-xs text-gray-600">© 2025 The Network. All rights reserved.</div>
              <div className="text-xs text-gray-600">Your Network Should Be Bigger Than Your Surroundings. 🇮🇳</div>
          </div>
        </div>
      </footer>

      {/* ═══ STICKY MOBILE BAR ════════════════════════════════ */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 md:hidden transition-all duration-300 ${showStickyBar ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
        style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)', borderTop: '1px solid #e0e7ff', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-black text-gray-900 leading-tight">Join The Network</div>
              <div className="text-[10px] text-gray-400 font-medium">Students across India · Free forever</div>
          </div>
          <button onClick={onLogin}
            className="px-4 py-2.5 text-xs font-bold text-gray-700 border border-gray-200 rounded-xl active:scale-95 transition-all flex-shrink-0">
            Log in
          </button>
          <button onClick={onJoin}
            className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white rounded-xl active:scale-95 transition-all flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 4px 16px rgba(99,102,241,0.4)' }}>
            Join Free <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
