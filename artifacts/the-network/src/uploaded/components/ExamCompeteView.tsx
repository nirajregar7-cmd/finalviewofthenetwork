import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Brain,
  BookOpen,
  CalendarDays,
  Code2,
  Clock3,
  Globe2,
  Target,
  Terminal,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react';
import type { NavTab, User, Community } from '../types';
import { findExamCommunity, getExamTrack, type ExamTrack } from '../examMode';

type ExamSubject = {
  name: string;
  description: string;
  category: string;
  communityId: string;
};

interface ExamCompeteViewProps {
  currentUser: User;
  communities: Community[];
  onSelectCommunity: (slug: string) => void;
  onSelectTab: (tab: NavTab) => void;
  onOpenCreatePost?: (requestType?: string) => void;
}

export const ExamCompeteView: React.FC<ExamCompeteViewProps> = ({
  currentUser,
  communities,
  onSelectCommunity,
  onSelectTab,
  onOpenCreatePost,
}) => {
  const detectedTrack = getExamTrack(currentUser);
  const [selectedTrack, setSelectedTrack] = useState<ExamTrack>(detectedTrack);
  useEffect(() => {
    setSelectedTrack(detectedTrack);
  }, [detectedTrack]);

  const examCommunity = findExamCommunity(currentUser, communities, selectedTrack);
  const track = selectedTrack;
  const trackContent = {
    jee: {
      label: 'Exam preparation',
      title: 'Compete with purpose.',
      description: 'Build speed and accuracy with Physics, Chemistry, and Mathematics mocks, revision sets, and peer doubt-solving.',
      mockTitle: 'Weekly topic mock',
      mockDescription: 'One timed topic mock every Sunday. The chapter is announced in {community} before the test.',
      subjectHeading: 'Your priority subjects',
      subjectDescription: 'Your current preparation path is prioritized here, with PCM practice before general school content.',
      subjects: [
        { name: 'Physics', description: 'Mechanics, electricity, modern physics, and timed numerical practice.', category: 'Priority subject', communityId: 'subject-physics-india' },
        { name: 'Mathematics', description: 'Algebra, calculus, coordinate geometry, and problem-solving speed.', category: 'Priority subject', communityId: 'subject-mathematics-india' },
        { name: 'Chemistry', description: 'Physical, organic, and inorganic chemistry with revision sets.', category: 'Priority subject', communityId: 'subject-chemistry-india' },
        { name: 'Biology foundation', description: 'Optional school-level Biology revision for students keeping more pathways open.', category: 'Class 10–12', communityId: 'subject-biology-india' },
      ],
    },
    neet: {
      label: 'Exam preparation',
      title: 'Compete with purpose.',
      description: 'Prepare with Biology-first revision, Physics and Chemistry question sets, timed mocks, and peer discussions.',
      mockTitle: 'Weekly topic mock',
      mockDescription: 'One timed topic mock every Sunday. The chapter is announced in {community} before the test.',
      subjectHeading: 'Your priority subjects',
      subjectDescription: 'Your current preparation path is prioritized here, with Biology, Physics, and Chemistry practice.',
      subjects: [
        { name: 'Biology', description: 'NCERT-first diagrams, human physiology, ecology, and high-yield revision.', category: 'NEET priority', communityId: 'subject-biology-india' },
        { name: 'Physics', description: 'Concept checks, formulas, numericals, and speed-focused practice.', category: 'NEET priority', communityId: 'subject-physics-india' },
        { name: 'Chemistry', description: 'Physical, organic, and inorganic question sets with quick revision.', category: 'NEET priority', communityId: 'subject-chemistry-india' },
        { name: 'Mathematics foundation', description: 'Optional school-level Maths practice for students keeping more pathways open.', category: 'Class 10–12', communityId: 'subject-mathematics-india' },
      ],
    },
    school: {
      label: 'School and exam preparation',
      title: 'Compete with purpose.',
      description: 'Keep board preparation on track while practicing the subjects and questions needed for entrance exams.',
      mockTitle: 'Weekly topic mock',
      mockDescription: 'One timed topic mock every Sunday, aligned to your class syllabus and the entrance path you are preparing for. The topic is announced in {community} before the test.',
      subjectHeading: 'Choose your subject path',
      subjectDescription: 'Explore the subjects that match your stream: Science, Commerce, Arts, and Culture.',
      subjects: [
        { name: 'Physics', description: 'Mechanics, waves, electricity, and chapter-wise board and entrance practice.', category: 'Science', communityId: 'subject-physics-india' },
        { name: 'Mathematics', description: 'Algebra, calculus, statistics, and exam-focused problem sets.', category: 'Science / Commerce', communityId: 'subject-mathematics-india' },
        { name: 'Chemistry', description: 'Physical, organic, and inorganic chemistry with notes and practice.', category: 'Science', communityId: 'subject-chemistry-india' },
        { name: 'Biology', description: 'Botany, zoology, human biology, and NCERT-based revision.', category: 'Science', communityId: 'subject-biology-india' },
        { name: 'Commerce', description: 'Accountancy, Business Studies, Economics, and applied Mathematics.', category: 'Commerce', communityId: 'subject-commerce-india' },
        { name: 'Arts & Culture', description: 'History, Political Science, Geography, Sociology, languages, and culture.', category: 'Arts / Humanities', communityId: 'subject-arts-culture-india' },
      ],
    },
    other: {
      label: 'Exam preparation',
      title: 'Compete with purpose.',
      description: 'Stay consistent with focused mocks, question practice, revision resources, and peer discussions for your exam.',
      mockTitle: 'Weekly topic mock',
      mockDescription: 'One timed topic mock every Sunday. The topic is announced in {community} before the test.',
      subjectHeading: 'Your exam subjects',
      subjectDescription: 'Pick the subjects used by your exam and find peers preparing for the same pathway.',
      subjects: [
        { name: 'Quantitative Aptitude', description: 'Arithmetic, algebra, data interpretation, and speed practice.', category: 'Competitive exams', communityId: 'subject-aptitude-india' },
        { name: 'Reasoning', description: 'Logical reasoning, analytical puzzles, and timed question sets.', category: 'Competitive exams', communityId: 'subject-reasoning-india' },
        { name: 'English & Languages', description: 'Reading comprehension, vocabulary, grammar, and language practice.', category: 'Competitive exams', communityId: 'subject-english-languages-india' },
        { name: 'General Awareness', description: 'Current affairs, history, polity, geography, and culture revision.', category: 'Competitive exams', communityId: 'subject-general-awareness-india' },
        { name: 'Commerce', description: 'Accountancy, Economics, and Business Studies for commerce-focused exams.', category: 'Commerce exams', communityId: 'subject-commerce-india' },
        { name: 'Arts & Culture', description: 'History, Political Science, Sociology, languages, and cultural studies.', category: 'Arts exams', communityId: 'subject-arts-culture-india' },
      ],
    },
  }[track];
  const communityLabel = examCommunity?.displayName || 'your exam community';
  const examOptions: { id: ExamTrack; title: string; detail: string }[] = [
    { id: 'jee', title: 'JEE Main & Advanced', detail: 'PCM mocks and problem-solving' },
    { id: 'neet', title: 'NEET UG', detail: 'PCB and NCERT-focused practice' },
    { id: 'school', title: 'Class 10–12', detail: 'Boards, foundation, and entrance preparation' },
    { id: 'other', title: 'Other exams', detail: 'CUET, CLAT, UPSC, SSC, CAT, GATE and more' },
  ];
  const skillPaths = [
    {
      title: 'Web Development',
      description: 'Build websites, full-stack projects, portfolios, and real products with student peers.',
      icon: Globe2,
      communityIds: ['domain-web-dev'],
    },
    {
      title: 'AI / ML',
      description: 'Learn machine learning, deep learning, LLMs, projects, papers, and Kaggle together.',
      icon: Brain,
      communityIds: ['domain-aiml'],
    },
    {
      title: 'DSA & Problem Solving',
      description: 'Practice LeetCode, algorithms, contests, interview problems, and coding patterns.',
      icon: Code2,
      communityIds: ['domain-dsa-corner'],
    },
    {
      title: 'Python',
      description: 'Start with Python fundamentals, automation, data science, and beginner projects.',
      icon: Terminal,
      communityIds: ['tech-python-india'],
    },
    {
      title: 'Java',
      description: 'Learn Java, OOP, backend development, DSA, and interview preparation.',
      icon: Code2,
      communityIds: ['tech-java-india'],
    },
    {
      title: 'C++',
      description: 'Build strong C++ foundations for DSA, competitive programming, and projects.',
      icon: Code2,
      communityIds: ['tech-cpp-india'],
    },
  ];

  const openCommunity = () => {
    if (examCommunity) {
      onSelectCommunity(examCommunity.slug);
    } else {
      onSelectTab('communities');
    }
  };

  const findSkillCommunity = (communityIds: string[]) => {
    const exactMatch = communities.find((community) => communityIds.includes(community.id));
    if (exactMatch) return exactMatch;
    return communities.find((community) => {
      const searchable = `${community.name} ${community.displayName} ${community.slug} ${(community.tags || []).join(' ')}`.toLowerCase();
      return communityIds.some((id) => searchable.includes(id.replace('domain-', '').replace('tech-', '').replace('-india', '').replace(/-/g, ' ')));
    });
  };

  return (
    <div className="network-exam-compete-view w-full max-w-6xl mx-auto px-4 py-5 pb-28 sm:px-6 lg:px-8">
      <div className="exam-compete-masthead mb-6">
        <p className="exam-compete-eyebrow">Preparation, with people around you</p>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">{trackContent.label}</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{trackContent.title}</h1>
        <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">
          {trackContent.description} This space is focused on preparation, practice, and progress with the right peers.
        </p>
      </div>

      <section className="mb-6 rounded-2xl border border-[#c9cdfc] bg-gradient-to-br from-white via-indigo-50/25 to-violet-50/55 p-4 shadow-[0_10px_26px_rgba(79,70,229,0.08)] sm:p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">Choose your track</p>
            <h2 className="mt-1 text-base font-black text-slate-900">Choose the path you are preparing for</h2>
          </div>
          <p className="text-[10px] font-medium text-slate-500">You can explore another exam anytime.</p>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {examOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setSelectedTrack(option.id)}
              className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                selectedTrack === option.id
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-800'
                  : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/40'
              }`}
            >
              <span className="block text-[11px] font-black">{option.title}</span>
              <span className="mt-1 block text-[10px] leading-4 text-slate-500">{option.detail}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-[#c9cdfc] bg-gradient-to-br from-indigo-50/75 via-white to-violet-50/65 p-4 shadow-[0_10px_26px_rgba(79,70,229,0.08)] sm:p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-700">{trackContent.subjectHeading}</p>
            <h2 className="mt-1 text-base font-black text-slate-900">Practice by subject</h2>
          </div>
          <p className="text-[10px] font-medium text-slate-600">{trackContent.subjectDescription}</p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {trackContent.subjects.map((subject) => {
            const subjectCommunity = communities.find((community) => community.id === subject.communityId);
            return (
            <article key={subject.name} className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-slate-900">{subject.name}</h3>
                  <p className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-violet-700">{subject.category}</p>
                </div>
                <BookOpen className="h-4 w-4 shrink-0 text-indigo-600" />
              </div>
              <p className="mt-3 text-[11px] leading-5 text-slate-500">{subject.description}</p>
              <p className="mt-3 text-[10px] font-bold text-indigo-600">
                Community room: {subjectCommunity?.displayName || 'Find your subject community'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => subjectCommunity ? onSelectCommunity(subjectCommunity.slug) : onSelectTab('communities')}
                  className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-2.5 py-2 text-[10px] font-black text-white shadow-sm transition-all hover:from-indigo-700 hover:to-violet-700"
                >
                  {subjectCommunity ? 'Open subject room' : 'Find subject community'}
                </button>
                <button
                  type="button"
                  onClick={() => onSelectTab('connect')}
                  className="rounded-lg border border-indigo-200 px-2.5 py-2 text-[10px] font-black text-indigo-700 hover:bg-indigo-50"
                >
                  Find peers
                </button>
              </div>
            </article>
            );
          })}
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-[#c9cdfc] bg-gradient-to-br from-indigo-50/75 via-white to-violet-50/65 p-4 shadow-[0_10px_26px_rgba(79,70,229,0.08)] sm:p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-700">Build skills with your preparation</p>
            <h2 className="mt-1 text-base font-black text-slate-900">Join a skill community</h2>
          </div>
          <p className="text-[10px] font-medium text-slate-600">Every card opens the real community room.</p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {skillPaths.map((skill) => {
            const SkillIcon = skill.icon;
            const skillCommunity = findSkillCommunity(skill.communityIds);
            return (
              <article key={skill.title} className="group relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-white to-violet-50/45 p-4 shadow-[0_4px_14px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-[0_12px_24px_rgba(79,70,229,0.12)]">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
                <div className="relative flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-inner">
                      <SkillIcon className="h-4 w-4" />
                    </span>
                    <h3 className="text-sm font-black text-slate-900">{skill.title}</h3>
                  </div>
                  <span className="rounded-full bg-violet-50 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-violet-700">
                    Skill
                  </span>
                </div>
                <p className="mt-3 text-[11px] leading-5 text-slate-500">{skill.description}</p>
                <p className="mt-3 text-[10px] font-bold text-violet-700">
                  {skillCommunity ? `${skillCommunity.membersCount.toLocaleString()} students joined` : 'Open to all learners'}
                </p>
                <button
                  type="button"
                  onClick={() => skillCommunity ? onSelectCommunity(skillCommunity.slug) : onSelectTab('communities')}
                  className="relative mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-2.5 py-2.5 text-[10px] font-black text-white shadow-[0_8px_16px_rgba(79,70,229,0.2)] transition-all hover:from-indigo-700 hover:to-violet-700"
                >
                  {skillCommunity ? 'Open skill community' : 'Find skill community'}
                  <ArrowRight className="h-3 w-3" />
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[1.5rem] border border-[#c9cdfc] bg-gradient-to-br from-[#202b66] via-[#35428b] to-[#5a4bb5] p-5 text-white shadow-[0_12px_30px_rgba(53,66,139,0.2)] sm:p-7">
        <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full border border-white/15" />
        <div className="pointer-events-none absolute -bottom-16 right-16 h-28 w-28 rounded-full border border-[#f5b99a]/20" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ffd5bd]/40 bg-[#ffd5bd]/15 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#ffe2d3]">
                <CalendarDays className="h-3 w-3" /> Every Sunday
              </span>
              <span className="text-[10px] font-bold text-indigo-100">9:00 AM IST</span>
            </div>
            <h2 className="mt-3 text-xl font-black tracking-tight text-white sm:text-2xl">{trackContent.mockTitle}</h2>
            <p className="mt-2 text-xs leading-5 text-indigo-100">
              {trackContent.mockDescription.replace('{community}', communityLabel)}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold text-indigo-100">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1.5"><Clock3 className="h-3.5 w-3.5" /> Timed practice</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1.5"><Target className="h-3.5 w-3.5" /> Topic-focused</span>
            </div>
          </div>
          <button
            type="button"
            onClick={openCommunity}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-[11px] font-black text-[#35428b] shadow-sm transition-colors hover:bg-[#fff4ee]"
          >
            {examCommunity ? 'Open preparation community' : 'Find preparation community'}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="relative mt-6 flex flex-wrap gap-2 border-t border-white/15 pt-4">
          <button
            type="button"
            onClick={() => onSelectTab('connect')}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-3 py-2.5 text-[10px] font-black text-white transition-colors hover:bg-white/20"
          >
            <Users className="h-3.5 w-3.5" /> Find teammates
          </button>
          <button
            type="button"
            onClick={() => onOpenCreatePost?.('Exam teammate')}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-3 py-2.5 text-[10px] font-black text-white transition-colors hover:bg-white/20"
          >
            <UserPlus className="h-3.5 w-3.5" /> Post teammate request
          </button>
          <button
            type="button"
            onClick={openCommunity}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-[10px] font-black text-[#35428b] transition-colors hover:bg-[#fff4ee]"
          >
            <Trophy className="h-3.5 w-3.5" /> Apply for mock
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
            <Trophy className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-black text-slate-900">Compete with your preparation, not against unrelated events</h2>
            <p className="mt-1 text-[11px] leading-5 text-slate-600">
              Your progress stays centered on mock tests, practice consistency, and helpful peer discussions. College hackathons and unrelated events are kept out of this view.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openCommunity}
          className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-black text-indigo-700 hover:text-indigo-900"
        >
          Go to {communityLabel}
          <Users className="h-3.5 w-3.5" />
        </button>
      </section>
    </div>
  );
};

export default ExamCompeteView;