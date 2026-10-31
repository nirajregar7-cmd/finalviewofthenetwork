import React, { useEffect, useRef, useState } from 'react';
import { api, PUBLIC_APP_URL, type HostedWorkshop, type WorkshopParticipant } from '../../api';
import { getEducationDisplay } from '../../utils/education';
import {
  BookOpen,
  CheckCircle2,
  Lock,
  PlayCircle,
  FileText,
  HelpCircle,
  FolderGit2,
  Sparkles,
  ArrowRight,
  Clock,
  Bookmark,
  Users,
  Check,
  Award,
  ChevronRight,
  GraduationCap,
  Target,
  ExternalLink,
  X,
  Youtube,
  Search,
  Trophy,
  CalendarDays,
  MessageCircle,
  Linkedin,
  Link2,
  Share2,
} from 'lucide-react';
import { Community, LearningTopic, Opportunity, RoadmapStep, User } from '../types';
import { SafeAvatar } from './SafeAvatar';
import { LearnResumeCard } from './LearnResumeCard';

type CatalogItem = {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  color: string;
  whatToLearn: string[];
  platforms: { name: string; url: string; note: string }[];
  seniors: { name: string; role: string; experience: string }[];
};

const COURSE_CATALOG: CatalogItem[] = [
  {
    id: 'dsa',
    title: 'Data Structures & Algorithms',
    subtitle: 'C++ / Java / Python → problem solving → interviews',
    category: 'Computer Science',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    whatToLearn: ['Complexity analysis', 'Arrays, strings, linked lists', 'Stacks, queues, trees and graphs', 'Dynamic programming', 'Solve 150+ curated problems'],
    platforms: [
      { name: 'Striver A2Z DSA', url: 'https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2/', note: 'Structured free problem sheet' },
      { name: 'LeetCode', url: 'https://leetcode.com/', note: 'Interview practice and contests' },
      { name: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/data-structures/', note: 'Concepts and practice' },
    ],
    seniors: [
      { name: 'Arjun Patel', role: 'SDE Intern · IIT Madras', experience: 'Solved 500+ problems' },
      { name: 'Riya Sharma', role: 'Backend Engineer · NIT Surathkal', experience: 'Interview mentor' },
    ],
  },
  {
    id: 'cybersecurity',
    title: 'Cybersecurity & Ethical Hacking',
    subtitle: 'Networking → Linux → web security → blue team or red team',
    category: 'Security',
    color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    whatToLearn: ['Networking, HTTP/DNS and Linux command line', 'Python scripting and security fundamentals', 'OWASP web security and safe lab practice', 'SOC, detection and MITRE ATT&CK or ethical hacking', 'Build three ethical, documented security projects'],
    platforms: [
      { name: 'TryHackMe', url: 'https://tryhackme.com/paths', note: 'Guided browser-based labs' },
      { name: 'PortSwigger Academy', url: 'https://portswigger.net/web-security', note: 'Free web-security labs' },
      { name: 'OWASP WSTG', url: 'https://owasp.org/www-project-web-security-testing-guide/', note: 'Open testing methodology' },
    ],
    seniors: [
      { name: 'Professor Messer', role: 'Security+ educator', experience: 'Free foundations and certification lessons' },
      { name: 'John Hammond', role: 'Security researcher', experience: 'Malware analysis and CTF walkthroughs' },
    ],
  },
  {
    id: 'web',
    title: 'Web Development',
    subtitle: 'HTML/CSS → JavaScript → React → backend projects',
    category: 'Computer Science',
    color: 'bg-sky-50 text-sky-700 border-sky-200',
    whatToLearn: ['HTML, CSS and responsive design', 'JavaScript and browser APIs', 'React and state management', 'Node.js, APIs and databases', 'Deploy three portfolio projects'],
    platforms: [
      { name: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn/', note: 'Free guided curriculum' },
      { name: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Learn', note: 'Reliable reference and tutorials' },
      { name: 'The Odin Project', url: 'https://www.theodinproject.com/', note: 'Project-based full-stack path' },
    ],
    seniors: [
      { name: 'Karthik Menon', role: 'Full-stack Developer', experience: 'Built 12 production projects' },
      { name: 'Aditi Deshmukh', role: 'Frontend Engineer · NIT Trichy', experience: 'Portfolio and interview mentor' },
    ],
  },
  {
    id: 'aiml',
    title: 'AI & Machine Learning',
    subtitle: 'Python → maths → ML → deep learning → projects',
    category: 'Computer Science',
    color: 'bg-pink-50 text-pink-700 border-pink-200',
    whatToLearn: ['Python, NumPy and Pandas', 'Probability, statistics and linear algebra', 'Regression, trees and model evaluation', 'Neural networks and PyTorch', 'Build and deploy two real projects'],
    platforms: [
      { name: 'Kaggle Learn', url: 'https://www.kaggle.com/learn', note: 'Short practical courses' },
      { name: 'fast.ai', url: 'https://course.fast.ai/', note: 'Practical deep learning' },
      { name: 'DeepLearning.AI', url: 'https://www.deeplearning.ai/courses/', note: 'Specialized guided courses' },
    ],
    seniors: [
      { name: 'Riya Sharma', role: 'ML Engineer · NIT Surathkal', experience: 'Research and project mentor' },
      { name: 'Arjun Patel', role: 'AI Research Intern · IIT Madras', experience: 'Kaggle contributor' },
    ],
  },
  {
    id: 'gate',
    title: 'GATE Preparation',
    subtitle: 'Core subjects → previous papers → mock tests',
    category: 'Engineering Exam',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    whatToLearn: ['Engineering Mathematics and General Aptitude', 'Core branch concepts and formula revision', 'Topic-wise previous year questions', 'Full-length timed mock tests', 'Revision notebook and error log'],
    platforms: [
      { name: 'NPTEL', url: 'https://nptel.ac.in/', note: 'University-level free lectures' },
      { name: 'GATE Overflow', url: 'https://gateoverflow.in/', note: 'Questions and discussion' },
      { name: 'IIT Madras SWAYAM', url: 'https://swayam.gov.in/', note: 'Free academic courses' },
    ],
    seniors: [
      { name: 'Vikram Dwivedi', role: 'GATE 2024 · PSU Engineer', experience: 'Core subject mentor' },
      { name: 'Nihitha Dharmavaram', role: 'GATE Scholar · NIT Trichy', experience: 'Previous-paper study group lead' },
    ],
  },
];

const EXAM_CATALOG: CatalogItem[] = [
  {
    id: 'jee',
    title: 'JEE Main & Advanced',
    subtitle: 'Engineering entrance preparation',
    category: 'Engineering',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    whatToLearn: ['Physics: mechanics, electricity, optics and modern physics', 'Chemistry: physical, organic and inorganic chemistry', 'Mathematics: algebra, calculus, coordinate geometry and vectors', 'NCERT revision, PYQs and weekly timed mocks'],
    platforms: [
      { name: 'NTA Abhyas', url: 'https://www.nta.ac.in/abhyas', note: 'Official practice tests' },
      { name: 'IIT-PAL', url: 'https://www.youtube.com/@iitpal', note: 'Free concept lectures' },
      { name: 'Khan Academy India', url: 'https://hi.khanacademy.org/', note: 'Free fundamentals' },
    ],
    seniors: [
      { name: 'Dr. Meera Joshi', role: 'NEET 2023 · Medical Student', experience: 'Biology revision mentor' },
      { name: 'Ananya Rao', role: 'NEET Faculty', experience: 'NCERT and mock-test mentor' },
    ],
  },
  {
    id: 'neet',
    title: 'NEET UG',
    subtitle: 'Medical entrance preparation',
    category: 'Medical',
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    whatToLearn: ['Biology: NCERT line-by-line, diagrams and assertion questions', 'Chemistry: reactions, concepts and numerical practice', 'Physics: formulas, units and high-frequency problem types', 'Daily MCQs, error analysis and full mock exams'],
    platforms: [
      { name: 'NTA Abhyas', url: 'https://www.nta.ac.in/abhyas', note: 'Official practice tests' },
      { name: 'NCERT', url: 'https://ncert.nic.in/textbook.php', note: 'The core Biology source' },
      { name: 'Khan Academy India', url: 'https://hi.khanacademy.org/', note: 'Free science fundamentals' },
    ],
    seniors: [
      { name: 'Dr. Meera Joshi', role: 'NEET 2023 · Medical Student', experience: 'Biology revision mentor' },
      { name: 'Ananya Rao', role: 'NEET Faculty', experience: 'NCERT and mock-test mentor' },
    ],
  },
  {
    id: 'ssc-cgl',
    title: 'SSC CGL',
    subtitle: 'Central government graduate exam',
    category: 'Government Exam',
    color: 'bg-violet-50 text-violet-700 border-violet-200',
    whatToLearn: ['Quantitative aptitude and arithmetic', 'Reasoning: series, coding, analogy and puzzles', 'English grammar, vocabulary and comprehension', 'General awareness, current affairs and computer basics', 'Tier-wise speed practice and previous papers'],
    platforms: [
      { name: 'SSC Official', url: 'https://ssc.gov.in/', note: 'Notifications and official papers' },
      { name: 'Testbook', url: 'https://testbook.com/ssc-cgl', note: 'Mocks and practice sets' },
      { name: 'Oliveboard', url: 'https://www.oliveboard.in/ssc-cgl/', note: 'Mock tests and analysis' },
    ],
    seniors: [
      { name: 'Niraj Fulwariya', role: 'SSC CGL Aspirant', experience: 'Quant and reasoning study lead' },
      { name: 'Pooja Singh', role: 'CGL 2024 · Central Government', experience: 'Mock-test and strategy mentor' },
    ],
  },
  {
    id: 'upsc',
    title: 'UPSC Civil Services',
    subtitle: 'IAS / IPS / IFS preparation',
    category: 'Government Exam',
    color: 'bg-teal-50 text-teal-700 border-teal-200',
    whatToLearn: ['NCERTs and foundational history, geography and polity', 'Indian Polity, economy, environment and science', 'Daily current affairs with monthly revision', 'CSAT comprehension, reasoning and numeracy', 'Answer writing and optional-subject strategy'],
    platforms: [
      { name: 'UPSC Official', url: 'https://upsc.gov.in/', note: 'Syllabus and previous papers' },
      { name: 'PRS India', url: 'https://prsindia.org/', note: 'Bills, laws and polity context' },
      { name: 'PIB', url: 'https://pib.gov.in/', note: 'Government updates' },
    ],
    seniors: [
      { name: 'Aditya Verma', role: 'UPSC Mains Candidate', experience: 'Answer-writing study lead' },
      { name: 'Sana Khan', role: 'Civil Services Mentor', experience: 'Polity and current affairs mentor' },
    ],
  },
  {
    id: 'banking',
    title: 'Banking: IBPS & SBI',
    subtitle: 'PO, Clerk and specialist officer exams',
    category: 'Government Exam',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    whatToLearn: ['Quantitative aptitude and data interpretation', 'Reasoning and puzzle sets', 'English language and reading comprehension', 'Banking, financial and current affairs', 'Speed drills for prelims and descriptive mains practice'],
    platforms: [
      { name: 'IBPS Official', url: 'https://www.ibps.in/', note: 'Official notifications' },
      { name: 'SBI Careers', url: 'https://sbi.co.in/web/careers', note: 'Official SBI recruitment' },
      { name: 'PracticeMock', url: 'https://www.practicemock.com/', note: 'Mocks and analysis' },
    ],
    seniors: [
      { name: 'Rahul Nair', role: 'SBI PO · 2024', experience: 'Reasoning and mock mentor' },
      { name: 'Kavya Iyer', role: 'IBPS PO', experience: 'Speed-practice study lead' },
    ],
  },
  {
    id: 'cat',
    title: 'CAT & MBA Entrance',
    subtitle: 'MBA entrance aptitude preparation',
    category: 'Management',
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    whatToLearn: ['Quantitative aptitude and arithmetic', 'Logical reasoning and data interpretation', 'Reading comprehension and verbal ability', 'Sectional tests, mock strategy and time management'],
    platforms: [
      { name: 'CAT Official', url: 'https://iimcat.ac.in/', note: 'Official information' },
      { name: '2IIM', url: 'https://2iim.com/', note: 'Concepts and practice' },
      { name: 'Rodha', url: 'https://www.youtube.com/@Rodha', note: 'Free aptitude lessons' },
    ],
    seniors: [
      { name: 'Ankit Raj', role: 'IIM Ahmedabad Student', experience: 'VARC and interview mentor' },
      { name: 'Akshara Menon', role: 'CAT 99.5 Percentile', experience: 'Quant study group lead' },
    ],
  },
];

const CATALOG_COMMUNITY_TERMS: Record<string, string[]> = {
  dsa: ['data structures', 'algorithms', 'dsa'],
  cybersecurity: ['cybersecurity', 'cyber security', 'ethical hacking'],
  web: ['web development', 'frontend', 'web dev'],
  aiml: ['machine learning', 'artificial intelligence', 'ai'],
  gate: ['gate'],
  jee: ['jee'],
  neet: ['neet'],
  'ssc-cgl': ['ssc cgl'],
  upsc: ['upsc', 'civil services'],
  banking: ['ibps', 'banking'],
  cat: ['cat', 'mba'],
};

type RoadmapItemStatus = 'completed' | 'in_progress' | 'not_started';

const createFreshRoadmap = (template: RoadmapStep[]): RoadmapStep[] =>
  template.map((step, index) => ({
    ...step,
    status: index === 0 ? 'in_progress' : 'locked',
    items: step.items.map((item) => ({ ...item, status: 'not_started' })),
  }));

const normalizeRoadmapProgress = (steps: RoadmapStep[]): RoadmapStep[] => {
  let nextStepUnlocked = true;

  return steps.map((step) => {
    if (!nextStepUnlocked) return { ...step, status: 'locked' };

    const isComplete = step.items.length > 0 && step.items.every((item) => item.status === 'completed');
    nextStepUnlocked = isComplete;
    return { ...step, status: isComplete ? 'completed' : 'in_progress' };
  });
};

const loadRoadmapProgress = (storageKey: string, template: RoadmapStep[]): RoadmapStep[] => {
  const freshRoadmap = createFreshRoadmap(template);
  if (typeof window === 'undefined') return freshRoadmap;

  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey) || 'null');
    if (!Array.isArray(saved)) return freshRoadmap;

    const restored = freshRoadmap.map((step) => {
      const savedStep = saved.find((candidate) => candidate?.id === step.id);
      return {
        ...step,
        items: step.items.map((item) => {
          const savedItem = savedStep?.items?.find((candidate: { id?: string }) => candidate?.id === item.id);
          const status = savedItem?.status as RoadmapItemStatus | undefined;
          return {
            ...item,
            status: status === 'completed' || status === 'in_progress' || status === 'not_started'
              ? status
              : item.status,
          };
        }),
      };
    });

    return normalizeRoadmapProgress(restored);
  } catch {
    return freshRoadmap;
  }
};

export type LearningHubTab = 'compete' | 'workshops' | 'resources_guidance';
export type LearningSectionTab = 'for_you' | 'all' | 'roadmaps' | 'my_learning' | 'saved' | 'mentors';

interface LearnViewProps {
  topic: LearningTopic;
  currentUser: User;
  users: User[];
  communities: Community[];
  opportunities: Opportunity[];
  initialHubTab?: LearningHubTab;
  initialSectionTab?: LearningSectionTab;
  pageTitle?: string;
  pageDescription?: string;
  showHubNavigation?: boolean;
  showSectionNavigation?: boolean;
  showCompete: boolean;
  competeContent: React.ReactNode;
  onOpenProfile: (user: User) => void;
  onSelectCommunity: (slug: string) => void;
  onToggleJoinCommunity: (slug: string) => void;
  onOpenOpportunity: (opp: Opportunity) => void;
  onOpenRecommendQuiz: () => void;
  onShareWorkshop: (draft: { title: string; content: string }) => void;
}

export const LearnView: React.FC<LearnViewProps> = ({
  topic,
  currentUser,
  users,
  communities,
  opportunities,
  initialHubTab = 'resources_guidance',
  initialSectionTab = 'for_you',
  pageTitle = 'Learn',
  pageDescription = 'A practical shelf of topics, roadmaps, saved resources, and people who can help.',
  showHubNavigation = true,
  showSectionNavigation = true,
  showCompete,
  competeContent,
  onOpenProfile,
  onSelectCommunity,
  onToggleJoinCommunity,
  onOpenOpportunity,
  onOpenRecommendQuiz,
  onShareWorkshop,
}) => {
  const [hubTab, setHubTab] = useState<LearningHubTab>(initialHubTab);
  const [activeTab, setActiveTab] = useState<LearningSectionTab>(initialSectionTab);
  const progressStorageKey = `the-network:roadmap-progress:${currentUser.id}:${topic.id}`;
  const [steps, setSteps] = useState<RoadmapStep[]>(() => loadRoadmapProgress(progressStorageKey, topic.steps));
  const [selectedStepId, setSelectedStepId] = useState<string>(
    () => steps.find((step) => step.status === 'in_progress')?.id ?? steps[0]?.id ?? '',
  );
  const [selectedCatalog, setSelectedCatalog] = useState<CatalogItem | null>(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [hostedWorkshops, setHostedWorkshops] = useState<HostedWorkshop[]>([]);
  const [hostedWorkshopsError, setHostedWorkshopsError] = useState('');
  const [copiedWorkshopId, setCopiedWorkshopId] = useState<string | null>(null);
  const [workshopShareErrors, setWorkshopShareErrors] = useState<Record<string, string>>({});
  const [showHostWorkshopForm, setShowHostWorkshopForm] = useState(false);
  const [hostedWorkshopTitle, setHostedWorkshopTitle] = useState('');
  const [hostedWorkshopDescription, setHostedWorkshopDescription] = useState('');
  const [hostedWorkshopDate, setHostedWorkshopDate] = useState('');
  const [hostedWorkshopVenue, setHostedWorkshopVenue] = useState('');
  const [hostedWorkshopIsOnline, setHostedWorkshopIsOnline] = useState(false);
  const [isCreatingHostedWorkshop, setIsCreatingHostedWorkshop] = useState(false);
  const [hostedWorkshopFormError, setHostedWorkshopFormError] = useState('');
  const [joiningHostedWorkshopId, setJoiningHostedWorkshopId] = useState<string | null>(null);
  const [hostedWorkshopActionErrors, setHostedWorkshopActionErrors] = useState<Record<string, string>>({});
  const [expandedWorkshopRosterId, setExpandedWorkshopRosterId] = useState<string | null>(null);
  const [participantsByWorkshop, setParticipantsByWorkshop] = useState<Record<string, WorkshopParticipant[]>>({});
  const [loadingWorkshopRosterId, setLoadingWorkshopRosterId] = useState<string | null>(null);
  const [workshopRosterErrors, setWorkshopRosterErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    setHostedWorkshopsError('');
    void api.workshops.getAll()
      .then(({ workshops: availableWorkshops }) => {
        if (!cancelled) setHostedWorkshops(availableWorkshops);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setHostedWorkshopsError(error instanceof Error ? error.message : 'Unable to load hosted workshops.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser.id]);

  const handleCreateHostedWorkshop = async () => {
    setIsCreatingHostedWorkshop(true);
    setHostedWorkshopFormError('');
    try {
      const created = await api.workshops.create({
        title: hostedWorkshopTitle.trim(),
        description: hostedWorkshopDescription.trim(),
        scheduledDate: hostedWorkshopDate,
        venue: hostedWorkshopVenue.trim(),
        isOnline: hostedWorkshopIsOnline,
      });
      setHostedWorkshops((existing) => [created, ...existing]);
      setHostedWorkshopTitle('');
      setHostedWorkshopDescription('');
      setHostedWorkshopDate('');
      setHostedWorkshopVenue('');
      setHostedWorkshopIsOnline(false);
      setShowHostWorkshopForm(false);
    } catch (error) {
      setHostedWorkshopFormError(error instanceof Error ? error.message : 'Unable to create this workshop.');
    } finally {
      setIsCreatingHostedWorkshop(false);
    }
  };

  const handleJoinHostedWorkshop = async (workshopId: string) => {
    setJoiningHostedWorkshopId(workshopId);
    setHostedWorkshopActionErrors((current) => ({ ...current, [workshopId]: '' }));
    try {
      const result = await api.workshops.register(workshopId);
      setHostedWorkshops((current) => current.map((workshop) =>
        workshop.id === workshopId
          ? { ...workshop, registered: true, participantCount: result.participantCount }
          : workshop,
      ));
      if (currentUser.role === 'admin' || hostedWorkshops.some((workshop) =>
        workshop.id === workshopId && workshop.isHost,
      )) {
        setWorkshopRosterErrors((current) => ({ ...current, [workshopId]: '' }));
        try {
          const { participants } = await api.workshops.getParticipants(workshopId);
          setParticipantsByWorkshop((current) => ({ ...current, [workshopId]: participants }));
        } catch (error) {
          setWorkshopRosterErrors((current) => ({
            ...current,
            [workshopId]: error instanceof Error ? error.message : 'Unable to load participant details.',
          }));
        }
      }
    } catch (error) {
      setHostedWorkshopActionErrors((current) => ({
        ...current,
        [workshopId]: error instanceof Error ? error.message : 'Unable to join this workshop.',
      }));
    } finally {
      setJoiningHostedWorkshopId(null);
    }
  };

  const handleToggleWorkshopRoster = async (workshopId: string) => {
    if (expandedWorkshopRosterId === workshopId) {
      setExpandedWorkshopRosterId(null);
      return;
    }
    setExpandedWorkshopRosterId(workshopId);
    setLoadingWorkshopRosterId(workshopId);
    setWorkshopRosterErrors((current) => ({ ...current, [workshopId]: '' }));
    try {
      const { participants } = await api.workshops.getParticipants(workshopId);
      setParticipantsByWorkshop((current) => ({ ...current, [workshopId]: participants }));
    } catch (error) {
      setWorkshopRosterErrors((current) => ({
        ...current,
        [workshopId]: error instanceof Error ? error.message : 'Unable to load participant details.',
      }));
    } finally {
      setLoadingWorkshopRosterId(null);
    }
  };

  const getWorkshopShareUrl = () => {
    const url = new URL(PUBLIC_APP_URL);
    url.searchParams.set('view', 'workshops');
    return url.toString();
  };

  const getWorkshopShareText = (workshop: HostedWorkshop) => {
    const workshopUrl = getWorkshopShareUrl();
    const details = [
      workshop.scheduledDate ? `Date: ${formatWorkshopDate(workshop.scheduledDate)}` : '',
      workshop.isOnline ? 'Online' : workshop.venue,
    ].filter(Boolean);
    return `Take a look at this workshop: ${workshop.title}\n\n${workshop.description}${details.length ? `\n\n${details.join(' · ')}` : ''}\n\nJoin with your Network ID: ${workshopUrl}`;
  };

  const copyWorkshopLink = async (workshopId: string) => {
    setWorkshopShareErrors((current) => ({ ...current, [workshopId]: '' }));
    try {
      const workshopUrl = getWorkshopShareUrl();
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(workshopUrl);
      } else {
        const input = document.createElement('textarea');
        input.value = workshopUrl;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        const copied = document.execCommand('copy');
        input.remove();
        if (!copied) throw new Error('Could not copy the workshop link.');
      }
      setCopiedWorkshopId(workshopId);
      window.setTimeout(() => setCopiedWorkshopId(null), 2000);
    } catch (error) {
      console.error('Unable to copy the workshop link', error);
      setWorkshopShareErrors((current) => ({
        ...current,
        [workshopId]: 'Could not copy the link. Please copy the page URL from your browser.',
      }));
    }
  };

  const escapeCsvValue = (value: string | number) =>
    `"${String(value).replace(/^[\t\r ]*[=+\-@]/, "'$&").replace(/"/g, '""')}"`;

  const downloadParticipantsCsv = (participants: WorkshopParticipant[], filename: string) => {
    const headers = ['Network ID', 'Name', 'Email', 'College', 'School', 'Branch', 'Year', 'Registered at'];
    const rows = participants.map((participant) => [
      participant.networkId,
      participant.name,
      participant.email,
      participant.college,
      participant.schoolName,
      participant.branch,
      participant.year,
      new Date(participant.registeredAt).toLocaleString(),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsvValue).join(','))
      .join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const roadmapRef = useRef<HTMLElement | null>(null);
  const hubTabs = [
    ...(showCompete ? [{ id: 'compete' as const, label: 'Compete', icon: Trophy }] : []),
    { id: 'workshops' as const, label: 'Workshops', icon: CalendarDays },
    { id: 'resources_guidance' as const, label: 'Resources & Guidance', icon: BookOpen },
  ];
  const hubNavigation = (
    <div role="tablist" aria-label="Learn sections" className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-slate-200">
      {hubTabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={hubTab === tab.id}
          onClick={() => setHubTab(tab.id)}
          className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-colors cursor-pointer ${
            hubTab === tab.id
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
          }`}
        >
          <tab.icon className="h-4 w-4" />
          {tab.label}
        </button>
      ))}
    </div>
  );
  const workshops = opportunities
    .filter((opportunity) => opportunity.category === 'Workshop')
    .filter((opportunity) => {
      if (!opportunity.deadlineDate) return true;
      const date = new Date(opportunity.deadlineDate);
      if (!Number.isFinite(date.getTime())) return true;
      const eventDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      return eventDay >= todayStart;
    })
    .sort((first, second) => {
      const firstDate = first.deadlineDate ? new Date(first.deadlineDate).getTime() : Number.MAX_SAFE_INTEGER;
      const secondDate = second.deadlineDate ? new Date(second.deadlineDate).getTime() : Number.MAX_SAFE_INTEGER;
      return firstDate - secondDate;
    });
  const formatWorkshopDate = (value?: string) => {
    if (!value) return 'Date to be announced';
    const date = new Date(value);
    return Number.isFinite(date.getTime())
      ? date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : value;
  };

  const currentStep = steps.find((s) => s.id === selectedStepId)
    || steps.find((step) => step.status === 'in_progress')
    || steps[0];

  useEffect(() => {
    try {
      window.localStorage.setItem(progressStorageKey, JSON.stringify(steps));
    } catch {
      // The checklist still works for this session when browser storage is unavailable.
    }
  }, [progressStorageKey, steps]);

  const handleToggleItem = (itemId: string) => {
    setSteps((currentSteps) => normalizeRoadmapProgress(
      currentSteps.map((step) => {
        if (step.id !== selectedStepId) return step;
        return {
          ...step,
          items: step.items.map((item) =>
            item.id === itemId
              ? { ...item, status: item.status === 'completed' ? 'not_started' : 'completed' }
              : item,
          ),
        };
      }),
    ));
  };

  const completedCount = currentStep?.items.filter((i) => i.status === 'completed').length ?? 0;
  const totalCount = currentStep?.items.length ?? 0;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const totalRoadmapItems = steps.reduce((count, step) => count + step.items.length, 0);
  const completedRoadmapItems = steps.reduce(
    (count, step) => count + step.items.filter((item) => item.status === 'completed').length,
    0,
  );
  const roadmapProgressPercent = totalRoadmapItems > 0
    ? Math.round((completedRoadmapItems / totalRoadmapItems) * 100)
    : 0;
  const preparationKeywords = [
    'jee', 'neet', 'gate', 'ssc', 'upsc', 'bank', 'ibps', 'sbi', 'cat', 'exam',
    'dsa', 'competitive', 'placement', 'interview', 'coding', 'programming',
    'web developer', 'ai', 'machine learning', 'cyber', 'security', 'ethical hacking',
    'aptitude', 'government',
  ];
  const preparationCommunities = communities
    .filter((community) => {
      const searchable = `${community.name} ${community.description} ${community.category}`.toLowerCase();
      return preparationKeywords.some((keyword) => searchable.includes(keyword));
    })
    .sort((a, b) => b.membersCount - a.membersCount);
  const visiblePreparationCommunities = preparationCommunities.length > 0
    ? preparationCommunities
    : [...communities].sort((a, b) => b.membersCount - a.membersCount);
  const formatMemberCount = (count: number) =>
    count >= 1000 ? `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}K` : count.toLocaleString();
  const membersFor = (community: Community) =>
    (community.memberIds || [])
      .map((id) => users.find((user) => user.id === id))
      .filter((user): user is User => Boolean(user));
  const topicCards = [
    { name: 'Data Structures & Algorithms', keywords: ['dsa', 'algorithm', 'programming'], bg: 'bg-emerald-50 text-emerald-600 border-emerald-200', catalog: 'dsa' },
    { name: 'Cybersecurity', keywords: ['cyber', 'security', 'ethical hacking'], bg: 'bg-cyan-50 text-cyan-600 border-cyan-200', catalog: 'cybersecurity' },
    { name: 'AI & Machine Learning', keywords: ['ai', 'machine learning'], bg: 'bg-pink-50 text-pink-600 border-pink-200', catalog: 'aiml' },
    { name: 'Web Development', keywords: ['web', 'developer'], bg: 'bg-sky-50 text-sky-600 border-sky-200', catalog: 'web' },
    { name: 'Operating Systems', keywords: ['operating systems', 'os'], bg: 'bg-amber-50 text-amber-600 border-amber-200', catalog: 'dsa' },
    { name: 'Discrete Mathematics', keywords: ['discrete', 'mathematics'], bg: 'bg-purple-50 text-purple-600 border-purple-200', catalog: 'dsa' },
  ].map((item) => {
    const community = communities.find((candidate) => {
      const searchable = `${candidate.name} ${candidate.description} ${candidate.tags?.join(' ') || ''}`.toLowerCase();
      return item.keywords.some((keyword) => searchable.includes(keyword));
    });
    return { ...item, community, members: community ? membersFor(community) : [] };
  });
  const topicCommunity = communities.find((community) => community.slug === topic.slug)
    ?? communities.find((community) => {
      const searchable = `${community.name} ${community.displayName} ${community.description} ${community.tags?.join(' ') || ''}`.toLowerCase();
      const isMachineLearningTopic = topic.name.toLowerCase().includes('machine learning')
        || topic.slug.toLowerCase().includes('ai-ml');
      if (isMachineLearningTopic) {
        const tokens = searchable.split(/[^a-z0-9]+/);
        return searchable.includes('machine learning') || tokens.includes('ai') || tokens.includes('ml');
      }
      return searchable.includes(topic.name.toLowerCase());
    });
  const topicCommunityMembers = topicCommunity ? membersFor(topicCommunity) : [];
  const topicCatalog = [...COURSE_CATALOG, ...EXAM_CATALOG].find(
    (item) => item.title.toLowerCase() === topic.name.toLowerCase(),
  );
  const selectedCatalogCommunity = selectedCatalog
    ? communities.find((community) => community.slug === selectedCatalog.id)
      ?? communities.find((community) => {
        const searchable = `${community.name} ${community.displayName} ${community.description} ${community.tags?.join(' ') || ''}`.toLowerCase();
        const tokens = searchable.split(/[^a-z0-9]+/);
        return (CATALOG_COMMUNITY_TERMS[selectedCatalog.id] || []).some((term) =>
          term.includes(' ') ? searchable.includes(term) : tokens.includes(term),
        );
      })
    : undefined;
  const selectedCatalogMembers = selectedCatalogCommunity ? membersFor(selectedCatalogCommunity) : [];
  const isCatalogJoined = Boolean(selectedCatalogCommunity?.isJoined);
  const seniorUsers = users
    .filter((user) => user.id !== currentUser.id && Number(user.year || 0) > Number(currentUser.year || 0))
    .sort((a, b) => Number(b.year || 0) - Number(a.year || 0))
    .slice(0, 12);

  const handleContinueRoadmap = () => {
    const nextStep = steps.find((step) => step.status === 'in_progress')
      ?? steps.find((step) => step.status !== 'completed' && step.status !== 'locked')
      ?? steps[steps.length - 1];
    if (nextStep) setSelectedStepId(nextStep.id);
    setActiveTab('for_you');
    window.requestAnimationFrame(() => {
      roadmapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleTopicCommunityAction = () => {
    if (!topicCommunity) {
      setActiveTab('all');
      return;
    }
    if (topicCommunity.isJoined) onSelectCommunity(topicCommunity.slug);
    else onToggleJoinCommunity(topicCommunity.slug);
  };

  if (hubTab === 'compete' && showCompete) {
    return (
      <div className="network-learn-view w-full min-w-0 max-w-7xl mx-auto px-4 sm:px-8 py-6 pb-28 space-y-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{pageTitle}</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">{pageDescription}</p>
        </div>
        {showHubNavigation && hubNavigation}
        <div role="tabpanel" aria-label="Compete">{competeContent}</div>
      </div>
    );
  }

  if (hubTab === 'workshops') {
    return (
      <div className="network-learn-view w-full min-w-0 max-w-7xl mx-auto px-4 sm:px-8 py-6 pb-28 space-y-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{pageTitle}</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">{pageDescription}</p>
        </div>
        {showHubNavigation && hubNavigation}
        <section role="tabpanel" aria-label="Workshops" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">Upcoming workshops</h2>
              <p className="mt-1 text-xs text-slate-500">Join workshops hosted by The Network community or host one yourself.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setHostedWorkshopFormError('');
                setShowHostWorkshopForm((open) => !open);
              }}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
            >
              <Users className="h-4 w-4" /> Host a workshop
            </button>
          </div>
          {showHostWorkshopForm && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void handleCreateHostedWorkshop();
              }}
              className="space-y-4 rounded-2xl border border-indigo-200 bg-white p-4 shadow-sm sm:p-5"
            >
              <div>
                <h3 className="text-sm font-black text-slate-900">Create a community workshop</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Your Network account will be listed as host. Only you and admins can view the participant contact details.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-700">
                  Workshop title
                  <input
                    value={hostedWorkshopTitle}
                    onChange={(event) => setHostedWorkshopTitle(event.target.value)}
                    required
                    maxLength={120}
                    placeholder="e.g. Build your first website"
                    className="mt-1.5 min-h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
                <label className="text-xs font-bold text-slate-700">
                  Date (optional)
                  <input
                    type="date"
                    value={hostedWorkshopDate}
                    onChange={(event) => setHostedWorkshopDate(event.target.value)}
                    className="mt-1.5 min-h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
              </div>
              <label className="block text-xs font-bold text-slate-700">
                Description
                <textarea
                  value={hostedWorkshopDescription}
                  onChange={(event) => setHostedWorkshopDescription(event.target.value)}
                  required
                  maxLength={3000}
                  rows={4}
                  placeholder="What will participants learn or do?"
                  className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <label className="text-xs font-bold text-slate-700">
                  {hostedWorkshopIsOnline ? 'Online location or link (optional)' : 'Location (optional)'}
                  <input
                    value={hostedWorkshopVenue}
                    onChange={(event) => setHostedWorkshopVenue(event.target.value)}
                    maxLength={160}
                    placeholder={hostedWorkshopIsOnline ? 'Online' : 'City, venue, or campus'}
                    className="mt-1.5 min-h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
                <label className="inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={hostedWorkshopIsOnline}
                    onChange={(event) => setHostedWorkshopIsOnline(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Online workshop
                </label>
              </div>
              {hostedWorkshopFormError && (
                <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                  {hostedWorkshopFormError}
                </p>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowHostWorkshopForm(false)}
                  className="min-h-10 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingHostedWorkshop}
                  className="min-h-10 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreatingHostedWorkshop ? 'Publishing…' : 'Publish workshop'}
                </button>
              </div>
            </form>
          )}
          {hostedWorkshopsError && (
            <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">
              {hostedWorkshopsError}
            </p>
          )}
          {hostedWorkshops.length > 0 && (
            <section className="space-y-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Community-hosted workshops</h3>
                <p className="mt-1 text-xs text-slate-500">Participant details are shared only with each workshop’s host and admins.</p>
              </div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {hostedWorkshops.map((workshop) => {
                  const canViewRoster = currentUser.role === 'admin' || workshop.isHost;
                  const participants = participantsByWorkshop[workshop.id] || [];
                  const isRosterExpanded = expandedWorkshopRosterId === workshop.id;
                  return (
                    <article key={workshop.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700">
                              Community workshop
                            </span>
                            <h4 className="mt-2 text-sm font-black text-slate-900">{workshop.title}</h4>
                          </div>
                          <CalendarDays className="mt-1 h-5 w-5 shrink-0 text-indigo-500" />
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">{workshop.description}</p>
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                          <span>{formatWorkshopDate(workshop.scheduledDate)}</span>
                          <span>{workshop.isOnline ? 'Online' : workshop.venue || 'Location to be announced'}</span>
                        </div>
                        <p className="mt-2 text-[11px] font-semibold text-indigo-700">
                          Hosted by {workshop.isHost ? 'you' : workshop.hostName}
                        </p>
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                          <p className="text-[11px] font-semibold text-slate-500">
                            {workshop.participantCount} {workshop.participantCount === 1 ? 'participant' : 'participants'}
                          </p>
                          {workshop.registered ? (
                            <span className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-50 px-3 text-[11px] font-bold text-emerald-700">
                              <CheckCircle2 className="h-4 w-4" /> You’re registered
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleJoinHostedWorkshop(workshop.id)}
                              disabled={joiningHostedWorkshopId !== null}
                              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-[11px] font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {joiningHostedWorkshopId === workshop.id ? 'Joining…' : 'Join with your Network ID'}
                            </button>
                          )}
                        </div>
                        <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                          Joining shares your profile name, Network ID, email, school/college, class/year, and branch with this host and admins.
                        </p>
                        {hostedWorkshopActionErrors[workshop.id] && (
                          <p role="alert" className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700">
                            {hostedWorkshopActionErrors[workshop.id]}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                          <span className="mr-1 inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                            <Share2 className="h-3.5 w-3.5" /> Share
                          </span>
                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(getWorkshopShareText(workshop))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[10px] font-bold text-emerald-800 transition hover:bg-emerald-100"
                          >
                            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                          </a>
                          <a
                            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getWorkshopShareUrl())}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2.5 text-[10px] font-bold text-sky-800 transition hover:bg-sky-100"
                          >
                            <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                          </a>
                          <button
                            type="button"
                            onClick={() => void copyWorkshopLink(workshop.id)}
                            className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-bold text-slate-700 transition hover:bg-slate-50"
                          >
                            {copiedWorkshopId === workshop.id ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                            {copiedWorkshopId === workshop.id ? 'Link copied' : 'Copy link'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onShareWorkshop({
                              title: workshop.title,
                              content: getWorkshopShareText(workshop),
                            })}
                            className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-indigo-600 px-2.5 text-[10px] font-bold text-white transition hover:bg-indigo-700"
                          >
                            <Share2 className="h-3.5 w-3.5" /> Share on The Network
                          </button>
                        </div>
                        {workshopShareErrors[workshop.id] && (
                          <p role="alert" className="mt-2 text-[10px] font-medium text-rose-700">
                            {workshopShareErrors[workshop.id]}
                          </p>
                        )}
                        {canViewRoster && (
                          <button
                            type="button"
                            aria-expanded={isRosterExpanded}
                            onClick={() => void handleToggleWorkshopRoster(workshop.id)}
                            className="mt-3 text-[11px] font-bold text-indigo-700 hover:text-indigo-900"
                          >
                            {isRosterExpanded ? 'Hide participants' : 'View participant details'}
                          </button>
                        )}
                      </div>
                      {canViewRoster && isRosterExpanded && (
                        <div className="border-t border-slate-100 bg-slate-50/60">
                          <div className="flex items-center justify-between gap-2 px-4 py-3">
                            <p className="text-[11px] font-black text-slate-700">
                              {participants.length} registered
                            </p>
                            <button
                              type="button"
                              onClick={() => downloadParticipantsCsv(
                                participants,
                                `workshop-${workshop.id.replace(/[^a-zA-Z0-9_-]/g, '-')}-participants.csv`,
                              )}
                              disabled={participants.length === 0 || loadingWorkshopRosterId === workshop.id}
                              className="min-h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-bold text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Download CSV
                            </button>
                          </div>
                          {loadingWorkshopRosterId === workshop.id ? (
                            <p className="px-4 pb-4 text-[11px] text-slate-500">Loading participant details…</p>
                          ) : workshopRosterErrors[workshop.id] ? (
                            <p role="alert" className="mx-4 mb-4 rounded-lg bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700">
                              {workshopRosterErrors[workshop.id]}
                            </p>
                          ) : participants.length === 0 ? (
                            <p className="px-4 pb-4 text-[11px] text-slate-500">No participants have registered yet.</p>
                          ) : (
                            <div className="divide-y divide-slate-100">
                              {participants.map((participant) => (
                                <article key={participant.networkId} className="grid gap-1.5 px-4 py-3 sm:grid-cols-2">
                                  <div className="min-w-0">
                                    <p className="truncate text-[11px] font-bold text-slate-900">{participant.name}</p>
                                    <p className="truncate text-[10px] text-slate-500">Network ID: {participant.networkId}</p>
                                    <p className="truncate text-[10px] text-indigo-700">{participant.email}</p>
                                  </div>
                                  <div className="min-w-0 text-[10px] text-slate-600">
                                    <p className="truncate">{participant.schoolName || participant.college || 'Institution not provided'}</p>
                                    <p className="mt-0.5 truncate">{participant.branch || 'Branch not provided'} · Year/Class {participant.year || 'not provided'}</p>
                                    <p className="mt-0.5 text-slate-500">Joined {new Date(participant.registeredAt).toLocaleString()}</p>
                                  </div>
                                </article>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          )}
          {workshops.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {workshops.map((workshop) => (
                <article key={workshop.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="inline-flex rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-bold text-cyan-700">Workshop</span>
                      <h3 className="mt-3 text-sm font-black text-slate-900">{workshop.title}</h3>
                    </div>
                    <CalendarDays className="mt-1 h-5 w-5 shrink-0 text-indigo-500" />
                  </div>
                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-600">{workshop.description}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-500">
                    <span>{formatWorkshopDate(workshop.deadlineDate)}</span>
                    {workshop.location && <span>{workshop.location}</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenOpportunity(workshop)}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-700 cursor-pointer"
                  >
                    View workshop <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-slate-300" />
              <h3 className="mt-3 text-sm font-bold text-slate-700">No additional workshops right now</h3>
              <p className="mt-1 text-xs text-slate-500">More community workshop listings will appear here when they are shared.</p>
            </div>
          )}
        </section>
      </div>
    );
  }

  const handleExploreResources = () => {
    if (topicCatalog) setSelectedCatalog(topicCatalog);
    else setActiveTab('all');
  };

  // The navigation tabs are real views, not only visual filters.
  if (activeTab !== 'for_you') {
    const tabContent = activeTab === 'all' ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[...COURSE_CATALOG, ...EXAM_CATALOG].map((item) => (
          <button
            key={item.id}
            onClick={() => { setActiveTab('for_you'); setSelectedCatalog(item); }}
            className={`text-left bg-white rounded-2xl border p-4 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer ${item.color}`}
          >
            <BookOpen className="w-5 h-5" />
            <h3 className="text-sm font-black text-slate-900 mt-3">{item.title}</h3>
            <p className="text-[11px] text-slate-500 mt-1">{item.subtitle}</p>
            <span className="inline-block mt-3 text-[9px] font-bold uppercase tracking-wider opacity-70">{item.category}</span>
          </button>
        ))}
      </div>
    ) : activeTab === 'roadmaps' ? (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Current roadmap</p>
          <h2 className="text-xl font-black text-slate-900 mt-2">{topic.name}</h2>
          <p className="text-xs text-slate-500 mt-1">{topic.summaryPath}</p>
          <div className="mt-5 space-y-2">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => {
                  if (step.status === 'locked') return;
                  setSelectedStepId(step.id);
                  setActiveTab('for_you');
                  window.requestAnimationFrame(() => {
                    roadmapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  });
                }}
                disabled={step.status === 'locked'}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                  step.status === 'locked'
                    ? 'border-slate-100 bg-slate-50/60 text-slate-400 cursor-not-allowed'
                    : 'border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 cursor-pointer'
                }`}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step.status === 'completed' ? 'bg-emerald-500 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
                  {step.status === 'completed' ? '✓' : index + 1}
                </span>
                <span className="text-xs font-bold text-slate-800">{step.title}</span>
                <span className="ml-auto text-[10px] text-slate-400 capitalize">{step.status.replace('_', ' ')}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="learn-roadmap-progress-panel">
          <p className="learn-resume-aside-label">Your progress</p>
          <p className="learn-roadmap-progress-value">{roadmapProgressPercent}%</p>
          <p className="learn-roadmap-progress-copy">
            {completedRoadmapItems} of {totalRoadmapItems} learning tasks complete.
          </p>
          <button type="button" onClick={handleContinueRoadmap} className="learn-resume-primary">
            Continue roadmap <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    ) : activeTab === 'my_learning' ? (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-lg font-black text-slate-900">My learning</h2>
          <p className="text-xs text-slate-500 mt-1">Communities you have joined and the roadmap you are following.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {communities.filter((community) => community.isJoined).map((community) => (
            <button key={community.id} onClick={() => onSelectCommunity(community.slug)} className="text-left bg-white rounded-2xl border border-emerald-200 p-4 hover:border-indigo-300 cursor-pointer">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-black text-slate-900 truncate">{community.displayName}</h3>
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              </div>
              <p className="text-[11px] text-slate-500 mt-2 line-clamp-2">{community.description}</p>
              <p className="text-[10px] text-indigo-600 font-bold mt-3">{community.membersCount} students · Open community →</p>
            </button>
          ))}
          {communities.filter((community) => community.isJoined).length === 0 && (
            <div className="sm:col-span-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <Users className="w-7 h-7 mx-auto text-slate-300" />
              <p className="text-xs font-bold text-slate-600 mt-2">You have not joined a learning community yet.</p>
              <button onClick={() => setActiveTab('all')} className="mt-3 text-xs font-bold text-indigo-600 cursor-pointer">Browse all topics</button>
            </div>
          )}
        </div>
      </div>
    ) : activeTab === 'mentors' ? (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-lg font-black text-slate-900">Senior students & mentors</h2>
          <p className="text-xs text-slate-500 mt-1">Real Network profiles from students ahead of you. Open a profile to connect or message them.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {seniorUsers.map((user) => (
            <div key={user.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
              <SafeAvatar src={user.avatar} name={user.name} className="w-11 h-11 rounded-full object-cover bg-indigo-50" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-slate-900 truncate">{user.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{getEducationDisplay(user).compact}</p>
                <button onClick={() => onOpenProfile(user)} className="text-[10px] font-bold text-indigo-600 mt-1 cursor-pointer">View profile →</button>
              </div>
            </div>
          ))}
          {seniorUsers.length === 0 && <p className="text-xs text-slate-500">No senior profiles match your year yet.</p>}
        </div>
      </div>
    ) : activeTab === 'saved' ? (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <Bookmark className="w-8 h-8 mx-auto text-indigo-400" />
        <h2 className="text-lg font-black text-slate-900 mt-3">Saved learning</h2>
        <p className="text-xs text-slate-500 mt-1">Save resources and posts from a community to collect them here.</p>
        <button onClick={() => setActiveTab('for_you')} className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer">Explore resources</button>
      </div>
    ) : null;

    return (
      <div className="network-learn-view w-full min-w-0 max-w-7xl mx-auto px-4 sm:px-8 py-6 pb-28 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{pageTitle}</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">{pageDescription}</p>
        </div>
      {showHubNavigation && hubNavigation}
        {showSectionNavigation && (
        <div className="learn-section-tabs flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {(
            [
              { id: 'for_you', label: 'For you', icon: Sparkles },
              { id: 'all', label: 'All Topics', icon: BookOpen },
              { id: 'roadmaps', label: 'Roadmaps', icon: Target },
              { id: 'my_learning', label: 'My Learning', icon: CheckCircle2 },
              { id: 'saved', label: 'Saved', icon: Bookmark },
              { id: 'mentors', label: 'Mentors', icon: GraduationCap },
            ] as const
          ).map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border cursor-pointer ${activeTab === tab.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
              <tab.icon className="h-3.5 w-3.5" /><span>{tab.label}</span>
            </button>
          ))}
        </div>
        )}
        {tabContent}
      </div>
    );
  }

  return (
    <div className="network-learn-view w-full min-w-0 max-w-7xl mx-auto px-4 sm:px-8 py-6 pb-28 space-y-6">
      {/* 1. Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">{pageTitle}</h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">{pageDescription}</p>
      </div>
      {showHubNavigation && hubNavigation}

      {/* 2. Nav Filter Tabs */}
      {showSectionNavigation && (
      <div className="learn-section-tabs flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        {(
          [
            { id: 'for_you', label: 'For you', icon: Sparkles },
            { id: 'all', label: 'All Topics', icon: BookOpen },
            { id: 'roadmaps', label: 'Roadmaps', icon: Target },
            { id: 'my_learning', label: 'My Learning', icon: CheckCircle2 },
            { id: 'saved', label: 'Saved', icon: Bookmark },
            { id: 'mentors', label: 'Mentors', icon: GraduationCap },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      )}

      {/* Resume the actual roadmap; learner counts come from the matched community. */}
      <LearnResumeCard
        topic={topic}
        steps={steps}
        progressPercent={roadmapProgressPercent}
        community={topicCommunity}
        onContinue={handleContinueRoadmap}
        onViewRoadmap={() => setActiveTab('roadmaps')}
        onOpenCommunity={() => {
          if (topicCommunity) onSelectCommunity(topicCommunity.slug);
        }}
      />

      {/* 4. Popular Learning Topics */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            Popular learning topics
          </h2>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
          >
            View all
          </button>
        </div>

        <div className="grid grid-cols-1 min-[380px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {topicCards.map((top) => (
            <button
              key={top.name}
              onClick={() => {
                if (top.community) onSelectCommunity(top.community.slug);
                else setSelectedCatalog(COURSE_CATALOG.find((item) => item.id === top.catalog) || COURSE_CATALOG[0]);
              }}
              type="button"
              className="bg-white rounded-2xl border border-slate-200/80 p-3.5 flex flex-col justify-between space-y-2.5 text-left hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer group"
            >
              <div className="space-y-2">
                <div className={`w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-bold ${top.bg}`}>
                  {top.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">
                    {top.name}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {top.community ? `${formatMemberCount(top.community.membersCount)} students` : 'No community yet'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                <div className="flex -space-x-1 overflow-hidden">
                  {top.members.slice(0, 3).map((member) => (
                    <SafeAvatar key={member.id} src={member.avatar} name={member.name} className="h-4 w-4 rounded-full ring-1 ring-white object-cover" />
                  ))}
                </div>
                <span className="text-[8px] text-slate-400 truncate">
                  {top.members.length > 0 ? top.members.slice(0, 2).map((member) => member.name.split(' ')[0]).join(', ') : 'Be the first to join'}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 5. Live preparation communities */}
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">Join preparation communities</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Real students are already studying here. Join a group to ask doubts, share resources and follow the roadmap together.
            </p>
          </div>
          <Users className="w-5 h-5 text-indigo-500 shrink-0" />
        </div>

        {visiblePreparationCommunities.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visiblePreparationCommunities.map((community) => (
              <div key={community.id} className="bg-white rounded-2xl border border-slate-200/80 p-4 hover:border-indigo-300 hover:shadow-sm transition-all">
                <button
                  onClick={() => onSelectCommunity(community.slug)}
                  className="w-full text-left cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${community.iconBg}`}>
                      {community.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-black text-slate-900 truncate">{community.displayName || community.name}</h3>
                      <p className="text-[10px] font-semibold text-indigo-600 mt-0.5">
                         {formatMemberCount(community.membersCount)} students joined
                      </p>
                     <div className="flex items-center gap-1.5 mt-1.5">
                       <div className="flex -space-x-1">
                         {membersFor(community).slice(0, 4).map((member) => (
                           <SafeAvatar key={member.id} src={member.avatar} name={member.name} className="w-5 h-5 rounded-full ring-2 ring-white object-cover" />
                         ))}
                       </div>
                       <span className="text-[9px] text-slate-400">
                         {membersFor(community).length > 0
                           ? `${membersFor(community).slice(0, 2).map((member) => member.name.split(' ')[0]).join(', ')} joined`
                           : 'No members yet'}
                       </span>
                     </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-3 line-clamp-2">{community.description}</p>
                </button>
                <div className="flex items-center justify-between gap-2 mt-3">
                  <span className="text-[10px] text-slate-400">{community.category === 'career' ? 'Career prep' : 'Study community'}</span>
                  <button
                    onClick={() => {
                      if (!community.isJoined) {
                        onToggleJoinCommunity(community.slug);
                      } else {
                        onSelectCommunity(community.slug);
                      }
                    }}
                    type="button"
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                      community.isJoined
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {community.isJoined ? 'Joined · Open' : 'Join community'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-xs text-slate-500">
            Communities are loading. Please refresh in a moment.
          </div>
        )}
      </section>

      {/* 6. Courses and exam preparation */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">Courses & exam preparation</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Choose a path to see what to learn and where to start.</p>
          </div>
          <Target className="w-5 h-5 text-indigo-500" />
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={catalogSearch}
            onChange={(e) => setCatalogSearch(e.target.value)}
            placeholder="Search courses, JEE, NEET, SSC CGL..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {COURSE_CATALOG.filter((item) =>
            `${item.title} ${item.subtitle} ${item.category}`.toLowerCase().includes(catalogSearch.toLowerCase()),
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedCatalog(item)}
              className={`text-left bg-white rounded-2xl border p-4 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer ${item.color}`}
            >
              <div className="flex items-start justify-between gap-2">
                <BookOpen className="w-5 h-5 shrink-0" />
                <ArrowRight className="w-4 h-4 opacity-60" />
              </div>
              <h3 className="text-sm font-black text-slate-900 mt-3">{item.title}</h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{item.subtitle}</p>
              <span className="inline-block mt-3 text-[9px] font-bold uppercase tracking-wider opacity-70">{item.category}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <GraduationCap className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">Competitive exams</h3>
          <span className="text-[10px] text-slate-400">JEE · NEET · SSC · UPSC · Banking · CAT</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {EXAM_CATALOG.filter((item) =>
            `${item.title} ${item.subtitle} ${item.category}`.toLowerCase().includes(catalogSearch.toLowerCase()),
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedCatalog(item)}
              className="text-left bg-white rounded-2xl border border-slate-200/80 p-4 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className={`w-9 h-9 rounded-xl border flex items-center justify-center ${item.color}`}><GraduationCap className="w-4 h-4" /></span>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500" />
              </div>
              <h3 className="text-sm font-black text-slate-900 mt-3 group-hover:text-indigo-700">{item.title}</h3>
              <p className="text-[11px] text-slate-500 mt-1">{item.subtitle}</p>
            </button>
          ))}
        </div>
      </section>

      {/* 5. Your Learning Roadmap (Stepper + Details + Resources) */}
      <section ref={roadmapRef} id="learn-roadmap" className="space-y-3 scroll-mt-24">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            Your learning roadmap
          </h2>
          <button
            onClick={() => setActiveTab('roadmaps')}
            type="button"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
          >
            View all
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left 4 Cols: Steps Stepper */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Roadmap Modules
            </h3>
            <div className="space-y-2">
              {steps.map((st, idx) => {
                const isSelected = st.id === selectedStepId;
                return (
                  <button
                    key={st.id}
                    onClick={() => setSelectedStepId(st.id)}
                    type="button"
                    disabled={st.status === 'locked'}
                    aria-pressed={isSelected}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                      st.status === 'locked'
                        ? 'bg-slate-50/50 border-slate-200 text-slate-400 cursor-not-allowed'
                        : isSelected
                          ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-100 shadow-xs cursor-pointer'
                          : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                          st.status === 'completed'
                            ? 'bg-emerald-500 text-white'
                            : isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {st.status === 'completed' ? '✓' : idx + 1}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 leading-tight">
                          {st.title}
                        </h4>
                        <p className="text-[10px] text-slate-400 capitalize">
                          {st.status.replace('_', ' ')}
                        </p>
                      </div>
                    </div>

                    {st.status === 'locked' && (
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Center 5 Cols: Active Step Checklist */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900">{currentStep.title}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 capitalize">
                    {currentStep.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  {currentStep.description}
                </p>
              </div>
            </div>

            {/* Step progress */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                <span>
                  {completedCount}/{totalCount} completed
                </span>
                <span>{percent}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                  style={{ width: `${percent}%` }}
                ></div>
              </div>
            </div>

            {/* Checklist Items */}
            <div className="space-y-2 pt-1">
              {currentStep.items.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleToggleItem(item.id)}
                  aria-pressed={item.status === 'completed'}
                  className="w-full text-left flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-slate-50/50 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-xs transition-colors ${
                        item.status === 'completed'
                          ? 'bg-emerald-500 text-white'
                          : 'border border-slate-300 group-hover:border-indigo-400'
                      }`}
                    >
                      {item.status === 'completed' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        item.status === 'completed'
                          ? 'text-slate-800 line-through text-opacity-60'
                          : 'text-slate-800'
                      }`}
                    >
                      {idx + 1}. {item.title}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      item.status === 'completed'
                        ? 'text-emerald-700 bg-emerald-50'
                        : item.status === 'in_progress'
                        ? 'text-indigo-700 bg-indigo-50'
                        : 'text-slate-400 bg-slate-100'
                    }`}
                  >
                    {item.status.replace('_', ' ')}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Right 3 Cols: Resources for this step */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-900">Resources for this step</h3>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-semibold text-slate-700">Notes</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500">
                    {topic.resources.notesCount} resources
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                  <div className="flex items-center gap-2">
                    <PlayCircle className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-semibold text-slate-700">Videos</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500">
                    {topic.resources.videosCount} resources
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-semibold text-slate-700">Practice Problems</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500">
                    {topic.resources.practiceCount} problems
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                  <div className="flex items-center gap-2">
                    <FolderGit2 className="w-4 h-4 text-rose-600" />
                    <span className="text-xs font-semibold text-slate-700">Projects</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500">
                    {topic.resources.projectsCount} projects
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExploreResources}
              className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Explore all resources
            </button>
          </div>
        </div>
      </section>

      {/* 6. Students Learning This & Opportunities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Students Learning This */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900">People in this study group</h3>
            <button
              type="button"
              onClick={() => {
                if (topicCommunity) onSelectCommunity(topicCommunity.slug);
                else setActiveTab('all');
              }}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              {topicCommunity ? 'View group' : 'Browse topics'}
            </button>
          </div>

          <div className="space-y-2">
            {topicCommunityMembers.slice(0, 3).map((student) => (
              <button
                key={student.id}
                type="button"
                onClick={() => onOpenProfile(student)}
                className="w-full flex items-center gap-2.5 p-1.5 rounded-xl text-left hover:bg-slate-50"
              >
                <SafeAvatar src={student.avatar} name={student.name} className="w-8 h-8 rounded-full object-cover" />
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-slate-800 truncate">{student.name}</span>
                  <span className="block text-[10px] text-slate-400 truncate">{getEducationDisplay(student).compact}</span>
                </span>
              </button>
            ))}
            {topicCommunityMembers.length === 0 && (
              <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                {topicCommunity
                  ? 'No member profiles are listed in this group yet.'
                  : 'There is no matching study group yet. Browse topics to find one.'}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleTopicCommunityAction}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            {topicCommunity
              ? topicCommunity.isJoined ? 'Open community' : 'Join community'
              : 'Browse learning topics'}
          </button>
        </div>

        {/* Opportunities For You */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900">Opportunities for you</h3>
            <span className="text-xs font-semibold text-slate-400">
              Recommended
            </span>
          </div>

          <div className="space-y-2.5">
            {topic.opportunities.map((opp) => (
              <button
                key={opp.id}
                type="button"
                onClick={() => onOpenOpportunity(opp)}
                className="w-full text-left flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                    {opp.category[0]}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{opp.title}</h4>
                    <p className="text-[10px] text-slate-500">{opp.prizeOrStipend}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span>{opp.daysLeft} days left</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 7. Bottom Recommend Personalized Roadmap Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
        <div>
          <h3 className="text-sm sm:text-base font-black">Not sure what to learn next?</h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Answer a few questions and we'll suggest a personalized roadmap for your career goals.
          </p>
        </div>
        <button
          onClick={onOpenRecommendQuiz}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Recommend for me</span>
        </button>
      </div>

      {/* Catalog detail panel */}
      {selectedCatalog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 p-0 sm:p-4">
          <div className="w-full sm:max-w-2xl max-h-[88dvh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl">
            <div className={`p-5 sm:p-6 border-b ${selectedCatalog.color}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{selectedCatalog.category}</span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{selectedCatalog.title}</h2>
                  <p className="text-xs text-slate-600 mt-1">{selectedCatalog.subtitle}</p>
                </div>
                <button onClick={() => setSelectedCatalog(null)} className="p-2 rounded-xl hover:bg-black/5 cursor-pointer" aria-label="Close">
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            </div>
            <div className="p-5 sm:p-6 space-y-6">
              <section>
                <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> What to learn
                </h3>
                <div className="grid sm:grid-cols-2 gap-2 mt-3">
                  {selectedCatalog.whatToLearn.map((item, index) => (
                    <div key={item} className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-black shrink-0">{index + 1}</span>
                      <span className="text-xs font-semibold text-slate-700 leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
                  <PlayCircle className="w-4 h-4 text-indigo-500" /> Best platforms to start
                </h3>
                <div className="space-y-2 mt-3">
                  {selectedCatalog.platforms.map((platform) => (
                    <a
                      key={platform.name}
                      href={platform.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                          {platform.name.toLowerCase().includes('youtube') ? <Youtube className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{platform.name}</p>
                          <p className="text-[10px] text-slate-500">{platform.note}</p>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-indigo-500 shrink-0" />
                    </a>
                  ))}
                </div>
              </section>
              {selectedCatalogCommunity ? (
                <section>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
                        <Users className="w-4 h-4 text-emerald-600" /> {selectedCatalogCommunity.displayName || selectedCatalogCommunity.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {formatMemberCount(selectedCatalogCommunity.membersCount)} students
                      </p>
                    </div>
                    {selectedCatalogCommunity.isJoined && (
                      <span className="text-[10px] font-semibold text-emerald-700">Joined</span>
                    )}
                  </div>
                  {selectedCatalogMembers.length > 0 ? (
                    <div className="grid sm:grid-cols-2 gap-2 mt-3">
                      {selectedCatalogMembers.slice(0, 4).map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => onOpenProfile(member)}
                          className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50"
                        >
                          <SafeAvatar src={member.avatar} name={member.name} className="h-9 w-9 shrink-0 rounded-full object-cover" />
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-bold text-slate-800">{member.name}</span>
                            <span className="block truncate text-[10px] text-slate-500">{getEducationDisplay(member).compact}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                      No member profiles are listed in this group yet.
                    </p>
                  )}
                </section>
              ) : (
                <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                  These resources are public. There is no linked study group for this topic yet.
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  if (!selectedCatalog) return;
                  if (!selectedCatalogCommunity) {
                    setSelectedCatalog(null);
                    setActiveTab('all');
                  } else if (selectedCatalogCommunity.isJoined) {
                    setSelectedCatalog(null);
                    onSelectCommunity(selectedCatalogCommunity.slug);
                  } else {
                    onToggleJoinCommunity(selectedCatalogCommunity.slug);
                  }
                }}
                className={`w-full py-3 rounded-xl text-xs font-bold cursor-pointer ${
                  isCatalogJoined
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {selectedCatalogCommunity
                  ? isCatalogJoined ? 'Open community' : 'Join community'
                  : 'Browse all topics'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedCatalog(null)}
                className="w-full py-3 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold cursor-pointer hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
