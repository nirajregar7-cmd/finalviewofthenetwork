import { Community } from '../types';

export const CHAPTER_CATEGORIES = [
  'Engineering & Technology',
  'Startups & Entrepreneurship',
  'Medical & Healthcare',
  'Management & Business',
  'Government Exams',
  'Higher Education & Research',
  'Law & Public Policy',
  'Design & Creativity',
  'Campus Life & Social',
  'Opportunities'
];

export const ALL_PREDEFINED_CHAPTERS: Community[] = [
  // --- Engineering & Technology ---
  {
    id: 'ch-comp-coding',
    name: 'Competitive Coding',
    description: 'LeetCode, Codeforces grinds, Advanced DSA tips, and live programming contests discussion.',
    icon: 'Code',
    memberIds: ['user-1', 'user-3'],
    tags: ['LeetCode', 'DSA', 'Contests', 'Algorithms'],
    category: 'Engineering & Technology',
    threads: [
      {
        id: 'thread-cc1',
        title: 'How to break the 1800 rating barrier on Codeforces?',
        content: 'I have been stuck in the Specialist range for the past 4 months. I am comfortable with basic DP, Graphs, and Greedy algorithms, but fail when combined problems arise inside Div 2 B/C. Any tips on practicing?',
        authorId: 'user-3',
        createdAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
        replies: [
          {
            id: 'rep-cc1',
            authorId: 'user-1',
            content: 'Focus heavily on problem solving during virtual contests. Do not read the editorial until you have spent at least 1.5 hours on C. Up-solving is the single most important habit!',
            createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
          }
        ]
      }
    ],
    resources: [
      {
        id: 'res-cc1',
        title: 'The Ultimate CP Handbook PDF',
        link: 'https://cses.fi/book/book.pdf',
        description: 'Excellent resource for high-level data structures and fundamental algorithms.',
        authorId: 'user-1',
        createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString()
      }
    ]
  },
  {
    id: 'ch-ai-ml',
    name: 'AI/ML Ecosystem',
    description: 'Neural Networks, Large Language Models (LLMs), PyTorch mechanics, and cutting-edge vision papers.',
    icon: 'Cpu',
    memberIds: ['user-1', 'user-2', 'user-4'],
    tags: ['PyTorch', 'LLMs', 'Transformers', 'DL'],
    category: 'Engineering & Technology',
    threads: [],
    resources: []
  },
  {
    id: 'ch-web-dev',
    name: 'Web Development',
    description: 'Full-stack development, React, Next.js, Django, Node.js, and cloud application scaling.',
    icon: 'Globe',
    memberIds: ['user-1', 'user-5'],
    tags: ['React', 'NextJS', 'PostgreSQL', 'NodeJS'],
    category: 'Engineering & Technology',
    threads: [],
    resources: []
  },
  {
    id: 'ch-cybersec',
    name: 'Cybersecurity & CTFs',
    description: 'Ethical hacking, Capture The Flag (CTF) writeups, penetration testing, and security fundamentals.',
    icon: 'Shield',
    memberIds: ['user-3'],
    tags: ['CTF', 'Pentesting', 'Linux', 'Network'],
    category: 'Engineering & Technology',
    threads: [],
    resources: []
  },
  {
    id: 'ch-data-science',
    name: 'Data Science & Analytics',
    description: 'Pandas, NumPy, data cleaning, analytics storytelling, visualization dashboards, and big data.',
    icon: 'Database',
    memberIds: ['user-2'],
    tags: ['Pandas', 'Python', 'BI', 'Statistics'],
    category: 'Engineering & Technology',
    threads: [],
    resources: []
  },
  {
    id: 'ch-robotics',
    name: 'Robotics & Hardware',
    description: 'Embedded firmware, ROS, microcontrollers, brushless motors, and edge AI vision hardware.',
    icon: 'Cpu',
    memberIds: ['user-2'],
    tags: ['Arduino', 'ROS', 'Firmware', 'Hardware'],
    category: 'Engineering & Technology',
    threads: [],
    resources: []
  },
  {
    id: 'ch-electronics',
    name: 'Electronics & IoT',
    description: 'VLSI engineering, analog design, Altium designs, PCB fabrication, and smart gateway setups.',
    icon: 'Zap',
    memberIds: ['user-2'],
    tags: ['PCB', 'VLSI', 'IoT', 'Altium'],
    category: 'Engineering & Technology',
    threads: [],
    resources: []
  },
  {
    id: 'ch-open-source',
    name: 'Open Source',
    description: 'Contributing to Linux distributions, GSoC hacks, GitHub pull request rules, and public software codebases.',
    icon: 'Github',
    memberIds: ['user-1', 'user-2'],
    tags: ['Git', 'GSoC', 'Linux', 'PullRequests'],
    category: 'Engineering & Technology',
    threads: [],
    resources: []
  },

  // --- Startups & Entrepreneurship ---
  {
    id: 'ch-startup-founders',
    name: 'Startup Founders',
    description: 'Building MVPs, pitching venture funds, validating concepts, and running user tests.',
    icon: 'Rocket',
    memberIds: ['user-5', 'user-6'],
    tags: ['LeanStartup', 'MVP', 'PitchDeck', 'Venture'],
    category: 'Startups & Entrepreneurship',
    threads: [
      {
        id: 'th-sf1',
        title: 'How we got our first 50 beta testing student users in 2 days',
        content: 'We set up a simple QR code stand in the canteen offering free stickers if they filled out a 20-second survey. It cost us 300 INR for stickers but we gathered incredible qualitative insights.',
        authorId: 'user-5',
        createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
        replies: []
      }
    ],
    resources: []
  },
  {
    id: 'ch-co-founder',
    name: 'Co-Founder Search',
    description: 'Find a technical, design, or marketing partner for your campus startup project.',
    icon: 'Users',
    memberIds: ['user-4', 'user-5', 'user-6'],
    tags: ['Matchmaking', 'Equity', 'TechPartner', 'Marketing'],
    category: 'Startups & Entrepreneurship',
    threads: [],
    resources: []
  },
  {
    id: 'ch-prod-build',
    name: 'Product Building',
    description: 'Crafting product roadmaps, writing PRDs, Figma blueprints, and release engineering loops.',
    icon: 'Package',
    memberIds: ['user-5'],
    tags: ['PRD', 'Roadmap', 'Agile', 'Engineering'],
    category: 'Startups & Entrepreneurship',
    threads: [],
    resources: []
  },
  {
    id: 'ch-fundraising',
    name: 'Fundraising',
    description: 'Angel investing networks, pitching to incubators, seed rounds, and term sheet advice.',
    icon: 'DollarSign',
    memberIds: ['user-6'],
    tags: ['AngelSeed', 'TermSheets', 'Incubators', 'Valuation'],
    category: 'Startups & Entrepreneurship',
    threads: [],
    resources: []
  },
  {
    id: 'ch-marketing',
    name: 'Growth & Marketing',
    description: 'Acquisition strategies, SEO indexing, social brand assets, and campus viral hacks.',
    icon: 'Megaphone',
    memberIds: ['user-6'],
    tags: ['Growth', 'SEO', 'Ads', 'Branding'],
    category: 'Startups & Entrepreneurship',
    threads: [],
    resources: []
  },
  {
    id: 'ch-saas',
    name: 'SaaS Builder Collective',
    description: 'Micro-SaaS models, subscription pricing matrices, Stripe integrations, and recurrent revenue metrics.',
    icon: 'Cloud',
    memberIds: ['user-5'],
    tags: ['SaaS', 'Stripe', 'Subscriptions', 'MRR'],
    category: 'Startups & Entrepreneurship',
    threads: [],
    resources: []
  },
  {
    id: 'ch-ecommerce',
    name: 'E-Commerce & D2C',
    description: 'Shopify configurations, social storefront layouts, courier pipelines, and target ads.',
    icon: 'ShoppingBag',
    memberIds: ['user-6'],
    tags: ['D2C', 'Shopify', 'Logistics', 'Fulfillment'],
    category: 'Startups & Entrepreneurship',
    threads: [],
    resources: []
  },

  // --- Medical & Healthcare ---
  {
    id: 'ch-mbbs',
    name: 'MBBS Students',
    description: 'Clinical histories, ward logs, studying anatomy schemas, internal examinations advice.',
    icon: 'GraduationCap',
    memberIds: [],
    tags: ['MBBS', 'Clinical', 'Anatomy', 'Meds'],
    category: 'Medical & Healthcare',
    threads: [],
    resources: []
  },
  {
    id: 'ch-aiims',
    name: 'AIIMS Community',
    description: 'Inter-campus updates, clinical trial records, AIIMS PG prep checklists, and healthcare networking.',
    icon: 'Sparkles',
    memberIds: [],
    tags: ['AIIMS', 'PGPrep', 'ClinicalTrials', 'Research'],
    category: 'Medical & Healthcare',
    threads: [],
    resources: []
  },
  {
    id: 'ch-neet-pg',
    name: 'NEET PG Prep',
    description: 'MCQ discussions, Marrow/Prepladder review, mock scores, study schedules, high-yield topics.',
    icon: 'BookOpen',
    memberIds: [],
    tags: ['NEETPG', 'HighYield', 'Mocks', 'Preparation'],
    category: 'Medical & Healthcare',
    threads: [],
    resources: []
  },
  {
    id: 'ch-med-research',
    name: 'Medical Research',
    description: 'Writing PubMed papers, statistical meta-analyses, biomedical engineering, oncology studies.',
    icon: 'FileText',
    memberIds: [],
    tags: ['PubMed', 'MetaAnalysis', 'Oncology', 'Journals'],
    category: 'Medical & Healthcare',
    threads: [],
    resources: []
  },
  {
    id: 'ch-surgery',
    name: 'Surgery Discussions',
    description: 'Surgical sutures, instruments guides, OR observation logs, surgical anatomy walkthroughs.',
    icon: 'Activity',
    memberIds: [],
    tags: ['Sutures', 'ORLogs', 'Anatomy', 'Procedures'],
    category: 'Medical & Healthcare',
    threads: [],
    resources: []
  },
  {
    id: 'ch-health-startups',
    name: 'Healthcare Startups',
    description: 'MedTech ventures, mental health telehealth platforms, smart IoT diagnostic sensors.',
    icon: 'Heart',
    memberIds: [],
    tags: ['MedTech', 'Telehealth', 'Diagnostics', 'Biotech'],
    category: 'Medical & Healthcare',
    threads: [],
    resources: []
  },

  // --- Management & Business ---
  {
    id: 'ch-cat-prep',
    name: 'CAT Preparation',
    description: 'Quantitative aptitude shortcuts, Logical Reasoning & Data Interpretation sets, Vocabulary drills.',
    icon: 'BookOpen',
    memberIds: [],
    tags: ['CAT', 'Quants', 'LRDI', 'MockTests'],
    category: 'Management & Business',
    threads: [],
    resources: []
  },
  {
    id: 'ch-mba-aspirants',
    name: 'MBA Aspirants & IIMs',
    description: 'Profile reviews, GD/PI scripts, B-school interview templates, choosing specializations.',
    icon: 'Award',
    memberIds: [],
    tags: ['IIM', 'Admissions', 'GDPI', 'ProfileReview'],
    category: 'Management & Business',
    threads: [],
    resources: []
  },
  {
    id: 'ch-consulting',
    name: 'Management Consulting',
    description: 'Case interview frameworks, estimation practice, deck making, McKinsey/BCG prep tips.',
    icon: 'Briefcase',
    memberIds: [],
    tags: ['Cases', 'Frameworks', 'Guesstimates', 'MBB'],
    category: 'Management & Business',
    threads: [],
    resources: []
  },
  {
    id: 'ch-finance',
    name: 'Finance & Markets',
    description: 'Valuation models, stock portfolio reports, market research, CFA prep circles.',
    icon: 'TrendingUp',
    memberIds: [],
    tags: ['CFA', 'Valuation', 'Equity', 'Stocks'],
    category: 'Management & Business',
    threads: [],
    resources: []
  },
  {
    id: 'ch-investment-banking',
    name: 'Investment Banking',
    description: 'Mergers & Acquisitions, leverage buy-out analysis, premium pitchbooks, capital market news.',
    icon: 'DollarSign',
    memberIds: [],
    tags: ['MandA', 'LBO', 'WallStreet', 'Pitchbooks'],
    category: 'Management & Business',
    threads: [],
    resources: []
  },
  {
    id: 'ch-pm',
    name: 'Product Management',
    description: 'PRD drafts, product tear-downs, metrics analysis, UI/UX interaction workflows, PM case mocks.',
    icon: 'Sliders',
    memberIds: [],
    tags: ['PRD', 'Teardown', 'Metrics', 'CaseMock'],
    category: 'Management & Business',
    threads: [],
    resources: []
  },

  // --- Government Exams ---
  {
    id: 'ch-upsc',
    name: 'UPSC Aspirants',
    description: 'Indian polity notes, CSAT tricks, Mains answer review, current affairs summaries.',
    icon: 'FileText',
    memberIds: [],
    tags: ['UPSC', 'IAS', 'CurrentAffairs', 'Polity'],
    category: 'Government Exams',
    threads: [],
    resources: []
  },
  {
    id: 'ch-ssc',
    name: 'SSC Exam prep',
    description: 'CGL syllabus coverage, logical shortcuts, general awareness updates, question papers.',
    icon: 'Code',
    memberIds: [],
    tags: ['SSC', 'CGL', 'Aptitude', 'Gk'],
    category: 'Government Exams',
    threads: [],
    resources: []
  },
  {
    id: 'ch-pcs',
    name: 'State PCS Preparation',
    description: 'State geography, language exams guidelines, writing practice for administrative exams.',
    icon: 'Bookmark',
    memberIds: [],
    tags: ['PCS', 'StateExams', 'CivilServices', 'Mains'],
    category: 'Government Exams',
    threads: [],
    resources: []
  },
  {
    id: 'ch-banking-exams',
    name: 'Banking Exams Prep',
    description: 'SBI PO, IBPS Clerk mocks, quantitative aptitude benchmarks, general financial vocabulary.',
    icon: 'DollarSign',
    memberIds: [],
    tags: ['SBIPO', 'IBPS', 'Banking', 'Shortcuts'],
    category: 'Government Exams',
    threads: [],
    resources: []
  },
  {
    id: 'ch-railways',
    name: 'Railways Exam Prep',
    description: 'RRB NTPC, Group D past questions, technical science syllabus notes.',
    icon: 'Train',
    memberIds: [],
    tags: ['RRB', 'NTPC', 'Railways', 'Technical'],
    category: 'Government Exams',
    threads: [],
    resources: []
  },
  {
    id: 'ch-defence',
    name: 'Defence (NDA/CDS)',
    description: 'NDA/CDS practice tests, SSB physical standards, mental aptitude tests, officer lifestyle.',
    icon: 'Shield',
    memberIds: [],
    tags: ['NDA', 'CDS', 'SSB', 'AirForce', 'Navy', 'Army'],
    category: 'Government Exams',
    threads: [],
    resources: []
  },

  // --- Higher Education & Research ---
  {
    id: 'ch-gre',
    name: 'GRE & IELTS Hub',
    description: 'Aspirants sharing study plans, vocabulary flashcards, writing essays, SOP edits.',
    icon: 'BookOpen',
    memberIds: [],
    tags: ['GRE', 'IELTS', 'SOP', 'Verbal'],
    category: 'Higher Education & Research',
    threads: [],
    resources: []
  },
  {
    id: 'ch-gate',
    name: 'GATE Preparation',
    description: 'Subject concepts, reference books, previous year papers, PSU cutoff scores.',
    icon: 'Cpu',
    memberIds: [],
    tags: ['GATE', 'PSU', 'EngineeringGATE', 'Cutoff'],
    category: 'Higher Education & Research',
    threads: [],
    resources: []
  },
  {
    id: 'ch-research-papers',
    name: 'Research Papers & LaTeX',
    description: 'LaTeX paper format checklists, indexing journals, citation index guidelines.',
    icon: 'FileText',
    memberIds: [],
    tags: ['LaTeX', 'IEEE', 'ResearchGate', 'Publishing'],
    category: 'Higher Education & Research',
    threads: [],
    resources: []
  },
  {
    id: 'ch-phd',
    name: 'PhD Aspirants',
    description: 'Drafting synopses, finding an advisor, postgrad research methodologies, lab projects.',
    icon: 'Users',
    memberIds: [],
    tags: ['PhD', 'Thesis', 'Fellowship', 'Methodology'],
    category: 'Higher Education & Research',
    threads: [],
    resources: []
  },
  {
    id: 'ch-study-abroad',
    name: 'Study Abroad Guides',
    description: 'US, European, Australian applications, fully funded graduate assistant positions, VISA advice.',
    icon: 'Globe',
    memberIds: [],
    tags: ['StudyAbroad', 'VISA', 'Assistantship', 'Admissions'],
    category: 'Higher Education & Research',
    threads: [],
    resources: []
  },
  {
    id: 'ch-scholarships',
    name: 'Scholarship Seekers',
    description: 'Indian and international education scholarship notifications and application guides.',
    icon: 'Award',
    memberIds: [],
    tags: ['Scholarship', 'Funding', 'Grants', 'Sponsorship'],
    category: 'Higher Education & Research',
    threads: [],
    resources: []
  },

  // --- Law & Public Policy ---
  {
    id: 'ch-clat',
    name: 'CLAT & NLU Aspirants',
    description: 'Legal aptitude practice, daily GK points, logic mocks, NLU cutoff estimates.',
    icon: 'Scale',
    memberIds: [],
    tags: ['CLAT', 'NLU', 'LegaAptitude', 'Mocks'],
    category: 'Law & Public Policy',
    threads: [],
    resources: []
  },
  {
    id: 'ch-judiciary',
    name: 'Judiciary Preparation',
    description: 'IPC sections, criminal code updates, civil court mock briefs, judicial exams outline.',
    icon: 'Shield',
    memberIds: [],
    tags: ['Judiciary', 'IPC', 'LawExams', 'BareActs'],
    category: 'Law & Public Policy',
    threads: [],
    resources: []
  },
  {
    id: 'ch-corp-law',
    name: 'Corporate Law Support',
    description: 'Mergers guidelines, drafting contract clauses, internships discussions, SEBI alerts.',
    icon: 'Briefcase',
    memberIds: [],
    tags: ['Corporate', 'Contracts', 'Acquisitions', 'SEBI'],
    category: 'Law & Public Policy',
    threads: [],
    resources: []
  },
  {
    id: 'ch-const-law',
    name: 'Constitutional Law',
    description: 'Historic supreme court arguments, human rights acts, constitutional reviews.',
    icon: 'BookOpen',
    memberIds: [],
    tags: ['Constitution', 'SupremeCourt', 'Rights', 'Polity'],
    category: 'Law & Public Policy',
    threads: [],
    resources: []
  },
  {
    id: 'ch-public-policy',
    name: 'Public Policy Forum',
    description: 'Think-tank postings, public governance policies analysis, central scheme research.',
    icon: 'FileText',
    memberIds: [],
    tags: ['PublicPolicy', 'Governance', 'ThinkTanks', 'Internships'],
    category: 'Law & Public Policy',
    threads: [],
    resources: []
  },

  // --- Design & Creativity ---
  {
    id: 'ch-ui-ux',
    name: 'UI/UX Design',
    description: 'Figma auto-layouts, portfolio critiques, material design frameworks, UX research checklists.',
    icon: 'Palette',
    memberIds: ['user-5', 'user-6'],
    tags: ['Figma', 'UXResearch', 'Wireframes', 'Aesthetics'],
    category: 'Design & Creativity',
    threads: [],
    resources: []
  },
  {
    id: 'ch-graphic-design',
    name: 'Graphic Design',
    description: 'Vector artwork, logo layout, Canva design rules, Photoshop photo editing brushes exchange.',
    icon: 'Image',
    memberIds: [],
    tags: ['Illustrator', 'Branding', 'Vector', 'Typography'],
    category: 'Design & Creativity',
    threads: [],
    resources: []
  },
  {
    id: 'ch-animation',
    name: 'Animation & 3D',
    description: 'Blender model renders, After Effects motion parameters, character rigs exchange.',
    icon: 'Layers',
    memberIds: [],
    tags: ['Blender', 'AE', 'MotionGraphics', '3DModeling'],
    category: 'Design & Creativity',
    threads: [],
    resources: []
  },
  {
    id: 'ch-video-editing',
    name: 'Video Editing',
    description: 'Premiere Pro layouts, DaVinci coloring, green screen removal, transition effects library.',
    icon: 'Video',
    memberIds: [],
    tags: ['Premiere', 'DaVinci', 'Transitions', 'PostProduction'],
    category: 'Design & Creativity',
    threads: [],
    resources: []
  },
  {
    id: 'ch-photography',
    name: 'Photography Lounge',
    description: 'Camera lens specs reviews, street photography edits, RAW presets, light control.',
    icon: 'Camera',
    memberIds: [],
    tags: ['RAW', 'Lenses', 'ISO', 'Lightroom'],
    category: 'Design & Creativity',
    threads: [],
    resources: []
  },
  {
    id: 'ch-content-creation',
    name: 'Content Creators',
    description: 'Writing YouTube scripts, starting newsletters, dynamic editing, recording podcasts.',
    icon: 'Tv',
    memberIds: [],
    tags: ['YouTube', 'Newsletter', 'Podcast', 'ViralGrowth'],
    category: 'Design & Creativity',
    threads: [],
    resources: []
  },

  // --- Campus Life & Social ---
  {
    id: 'ch-new-friends',
    name: 'Make New Friends',
    description: 'Connecting campuses nationwide. Meetups, sharing regional culture, study buddies.',
    icon: 'Hash',
    memberIds: [],
    tags: ['Meetups', 'PenPals', 'CampusSocial', 'Hobbies'],
    category: 'Campus Life & Social',
    threads: [],
    resources: []
  },
  {
    id: 'ch-hostel',
    name: 'Hostel Life Hacks',
    description: 'Dealing with wardens, midnight canteen runs, roommate survival tips, study setups.',
    icon: 'Home',
    memberIds: [],
    tags: ['Hostel', 'Canteen', 'MessFood', 'SurvivalHacks'],
    category: 'Campus Life & Social',
    threads: [],
    resources: []
  },
  {
    id: 'ch-mental-health',
    name: 'Mental Health Support',
    description: 'A completely safe space to share exam pressure, failure anxiety, or seek kind support.',
    icon: 'Activity',
    memberIds: [],
    tags: ['SafeSpace', 'AnxietyAlleviation', 'PeerSupport', 'Wellness'],
    category: 'Campus Life & Social',
    threads: [],
    resources: []
  },
  {
    id: 'ch-travel',
    name: 'Student Travel & Treks',
    description: 'Budget backpacking routes, sharing road trips, student discounts tips, holiday camps.',
    icon: 'Map',
    memberIds: [],
    tags: ['Backpacking', 'Treks', 'RoadTrips', 'Discounts'],
    category: 'Campus Life & Social',
    threads: [],
    resources: []
  },
  {
    id: 'ch-music',
    name: 'Music & Jamming',
    description: 'Guitar chords sheets, sharing covers, Spotify playlists, college band guidelines.',
    icon: 'Play',
    memberIds: [],
    tags: ['Acoustic', 'Covers', 'Playlists', 'Bands'],
    category: 'Campus Life & Social',
    threads: [],
    resources: []
  },
  {
    id: 'ch-sports',
    name: 'College Sports Hub',
    description: 'Cricket, football leagues, university trials updates, workout logs, training tips.',
    icon: 'Award',
    memberIds: [],
    tags: ['Cricket', 'Football', 'Trials', 'Workout'],
    category: 'Campus Life & Social',
    threads: [],
    resources: []
  },
  {
    id: 'ch-gaming',
    name: 'Gaming & eSports',
    description: 'Esports matches, casual steam guilds, Valorant lobbies, streaming, LAN setups.',
    icon: 'Zap',
    memberIds: [],
    tags: ['Valorant', 'CS2', 'LANs', 'SteamGuild'],
    category: 'Campus Life & Social',
    threads: [],
    resources: []
  },
  {
    id: 'ch-books',
    name: 'Books & Literature',
    description: 'Philosophy debates, PDF shares, classic novels club, creative writing drafts.',
    icon: 'Book',
    memberIds: [],
    tags: ['Novels', 'Philosophy', 'PDFShare', 'CreativeWriting'],
    category: 'Campus Life & Social',
    threads: [],
    resources: []
  },

  // --- Opportunities ---
  {
    id: 'ch-internships',
    name: 'Internship Dispatches',
    description: 'Updates on summer internship postings, interview questions bank, refer matches.',
    icon: 'Briefcase',
    memberIds: [],
    tags: ['Internships', 'Summer2026', 'Interviews', 'Referrals'],
    category: 'Opportunities',
    threads: [],
    resources: []
  },
  {
    id: 'ch-hackathons',
    name: 'Hackathon Alert Tracker',
    description: 'Find team matches for Devfolio, Devpost, SIH (Smart India Hackathon) prompts.',
    icon: 'Laptop',
    memberIds: [],
    tags: ['Hackathons', 'SIH', 'Build', 'TeamMatch'],
    category: 'Opportunities',
    threads: [],
    resources: []
  },
  {
    id: 'ch-competitions',
    name: 'Competitions & Case study',
    description: 'Case challenges from L\'Oreal, HUL, corporate listings alerts for money prizes.',
    icon: 'Tv',
    memberIds: [],
    tags: ['Corporate', 'CaseStudy', 'Prizes', 'Challenges'],
    category: 'Opportunities',
    threads: [],
    resources: []
  },
  {
    id: 'ch-opp-scholarships',
    name: 'Scholarships List',
    description: 'Updates on government and private fellowships for undergraduate and masters level study.',
    icon: 'Award',
    memberIds: [],
    tags: ['Fellowships', 'Funding', 'Grants', 'UGC'],
    category: 'Opportunities',
    threads: [],
    resources: []
  },
  {
    id: 'ch-startup-jobs',
    name: 'Startup Job Openings',
    description: 'Student-contract, shadow VC roles, internship openings in early stages venture networks.',
    icon: 'Rocket',
    memberIds: [],
    tags: ['StartupJobs', 'VentureCapital', 'PartTime', 'Founders'],
    category: 'Opportunities',
    threads: [],
    resources: []
  },
  {
    id: 'ch-research-opp',
    name: 'Research Assistantships',
    description: 'Labs seeking research apprentices, data model developers, or computational physics coders.',
    icon: 'Layers',
    memberIds: [],
    tags: ['ResearchAssistant', 'Labs', 'IISc', 'IITProject'],
    category: 'Opportunities',
    threads: [],
    resources: []
  }
];
