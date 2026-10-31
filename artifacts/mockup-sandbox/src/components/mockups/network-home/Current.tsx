import React from 'react';
import './_group.css';
import { Header } from './_source/uploaded/components/Header';
import { Sidebar } from './_source/uploaded/components/Sidebar';
import { BottomNav } from './_source/uploaded/components/BottomNav';
import { HomeFeed } from './_source/uploaded/components/HomeFeed';
import type {
  Community,
  NavTab,
  Opportunity,
  Post,
  User,
} from './_source/uploaded/types';

const currentUser: User = {
  id: 'student-aarav',
  name: 'Aarav Mehta',
  avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&h=160&fit=crop&crop=faces',
  college: 'IIT Bombay',
  branch: 'Computer Science',
  degree: 'B.Tech',
  year: '2nd year',
  verified: true,
  bio: 'Building useful things with code. Currently exploring machine learning and product design.',
  interests: ['AI & Machine Learning', 'Web Development', 'Startups'],
  skills: ['React', 'Python', 'Figma'],
  goals: ['Find project collaborators', 'Prepare for summer internships'],
  communities: ['/dsa', '/ai-ml', '/iit-bombay'],
  projects: [
    {
      title: 'Campus Route',
      description: 'An accessible wayfinding app built with React Native.',
      tags: ['React Native', 'Maps'],
    },
  ],
  stats: { postsCount: 8, connectionsCount: 124, points: 860 },
};

const students: User[] = [
  currentUser,
  {
    id: 'student-priya',
    name: 'Priya Sharma',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&h=160&fit=crop&crop=faces',
    college: 'IIT Delhi',
    branch: 'Electrical Engineering',
    degree: 'B.Tech',
    year: '3rd year',
    verified: true,
    bio: 'Interested in robotics, embedded systems, and making technology more accessible.',
    interests: ['Robotics', 'AI & Machine Learning', 'Hackathons'],
    skills: ['Python', 'Arduino', 'C++'],
    goals: ['Build a robotics team'],
    communities: ['/robotics', '/ai-ml'],
    isOnline: true,
  },
  {
    id: 'student-isha',
    name: 'Isha Kapoor',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=160&h=160&fit=crop&crop=faces',
    college: 'BITS Pilani',
    branch: 'Computer Science',
    degree: 'B.E.',
    year: '2nd year',
    verified: true,
    bio: 'Frontend developer, design systems enthusiast, and occasional hackathon builder.',
    interests: ['Web Development', 'Product Design', 'Startups'],
    skills: ['TypeScript', 'React', 'UI Design'],
    goals: ['Find a co-founder for a side project'],
    communities: ['/web-dev', '/startups'],
    isOnline: true,
  },
  {
    id: 'student-rahul',
    name: 'Rahul Nair',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=160&h=160&fit=crop&crop=faces',
    college: 'NIT Trichy',
    branch: 'Mechanical Engineering',
    degree: 'B.Tech',
    year: '3rd year',
    verified: true,
    bio: 'Working on low-cost climate tech and learning full-stack development.',
    interests: ['Climate Tech', 'Product Design', 'Startups'],
    skills: ['CAD', 'JavaScript', 'Prototyping'],
    goals: ['Join a climate-tech startup'],
    communities: ['/startups', '/projects'],
  },
];

const communities: Community[] = [
  {
    id: 'community-dsa',
    slug: '/dsa',
    name: 'DSA',
    displayName: 'Data Structures & Algorithms',
    iconType: 'code',
    iconBg: 'bg-indigo-100 text-indigo-600',
    description: 'Practice problems, interview prep, and peer learning.',
    tags: ['coding', 'interviews', 'programming'],
    membersCount: 18420,
    onlineCount: 324,
    category: 'interest',
    isJoined: true,
  },
  {
    id: 'community-ai',
    slug: '/ai-ml',
    name: 'AI & ML',
    displayName: 'Artificial Intelligence & ML',
    iconType: 'brain',
    iconBg: 'bg-violet-100 text-violet-600',
    description: 'Explore machine learning papers, tools, and projects.',
    tags: ['AI', 'machine learning', 'python'],
    membersCount: 12350,
    onlineCount: 187,
    category: 'interest',
    isJoined: true,
  },
  {
    id: 'community-web',
    slug: '/web-dev',
    name: 'Web Dev',
    displayName: 'Web Development',
    iconType: 'code',
    iconBg: 'bg-sky-100 text-sky-600',
    description: 'Build and share modern web projects with other students.',
    tags: ['React', 'web development', 'JavaScript'],
    membersCount: 9720,
    onlineCount: 142,
    category: 'interest',
    isJoined: false,
  },
  {
    id: 'community-bombay',
    slug: '/iit-bombay',
    name: 'IITB',
    displayName: 'IIT Bombay',
    iconType: 'building',
    iconBg: 'bg-orange-100 text-orange-600',
    description: 'Projects, opportunities, and campus conversations.',
    tags: ['college', 'campus'],
    membersCount: 6120,
    onlineCount: 86,
    category: 'college',
    isJoined: true,
  },
  {
    id: 'community-robotics',
    slug: '/robotics',
    name: 'Robotics',
    displayName: 'Robotics & Hardware',
    iconType: 'rocket',
    iconBg: 'bg-emerald-100 text-emerald-600',
    description: 'A home for makers building robots and hardware projects.',
    tags: ['robotics', 'hardware', 'engineering'],
    membersCount: 4380,
    onlineCount: 51,
    category: 'interest',
    isJoined: false,
  },
];

const posts: Post[] = [
  {
    id: 'post-study-partner',
    author: students[1],
    communitySlug: '/dsa',
    communityName: 'Data Structures & Algorithms',
    timestamp: '2025-02-18T09:35:00.000Z',
    type: 'collab',
    title: 'Looking for a consistent DSA practice partner',
    content: 'I’m preparing for internship interviews this semester and would love to pair up with someone for a few problems each week. Thinking of starting with graphs and dynamic programming, then sharing notes as we go.',
    tags: ['Study Partner', 'Interview Prep', 'DSA'],
    upvotes: 28,
    commentsCount: 7,
    comments: [],
    saved: false,
    likesCount: 28,
  },
  {
    id: 'post-project',
    author: students[2],
    communitySlug: '/web-dev',
    communityName: 'Web Development',
    timestamp: '2025-02-18T07:12:00.000Z',
    type: 'project',
    title: 'We built a tiny design system for student teams',
    content: 'After seeing every campus project reinvent buttons and forms, we put together a simple React kit with accessible defaults. Looking for a couple of designers and developers to test it on a real project.',
    postImage: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=1200&h=700&fit=crop',
    tags: ['React', 'Open Source', 'Collaboration'],
    upvotes: 46,
    commentsCount: 12,
    comments: [],
    saved: false,
    likesCount: 46,
  },
  {
    id: 'post-opportunity',
    author: students[3],
    communitySlug: '/startups',
    communityName: 'Startups & Building',
    timestamp: '2025-02-17T15:40:00.000Z',
    type: 'question',
    title: 'Anyone heading to the student climate-tech sprint?',
    content: 'A few of us are forming a team for the upcoming student innovation sprint. We’re exploring low-cost campus energy monitoring and could use someone who enjoys data visualization or hardware.',
    tags: ['Climate Tech', 'Hackathon', 'Team Up'],
    upvotes: 19,
    commentsCount: 5,
    comments: [],
    saved: false,
    likesCount: 19,
  },
];

const opportunities: Opportunity[] = [
  {
    id: 'opportunity-build-for-bharat',
    title: 'Build for Bharat Student Challenge',
    category: 'Hackathon',
    categoryColor: 'indigo',
    description: 'A national student hackathon for ideas that make everyday services more accessible.',
    tags: ['Product', 'Team friendly', 'Online'],
    prizeOrStipend: '₹2,00,000 in prizes',
    teamSize: '2–4 students',
    daysLeft: 9,
    location: 'Online',
  },
  {
    id: 'opportunity-research',
    title: 'Undergraduate Research Fellowship',
    category: 'Research',
    description: 'Work with a student research group on trustworthy machine learning.',
    tags: ['Machine Learning', 'Research'],
    prizeOrStipend: 'Paid fellowship',
    daysLeft: 16,
    location: 'Hybrid',
  },
];

const noop = () => {};
const noopAsync = async () => {};

export function Current() {
  const activeTab: NavTab = 'home';
  const usersById = Object.fromEntries(students.map((student) => [student.id, student]));
  const selectTab = (_tab: NavTab) => {};

  return (
    <div className="network-app-shell min-h-screen bg-[#F8FAFC] text-[#0F172A] flex font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={selectTab}
        currentUser={currentUser}
        communities={communities}
        onSelectCommunity={noop}
        onOpenProfile={noop}
        unreadChatsCount={2}
      />
      <div className="main-content network-main-content flex flex-1 min-h-0 flex-col min-w-0 h-screen overflow-y-auto">
        <Header
          currentUser={currentUser}
          communities={communities}
          users={usersById}
          posts={posts}
          notifications={[
            {
              id: 'notification-1',
              type: 'connection_request',
              title: 'Priya Sharma sent you a connection request',
              subtitle: 'Connect with a student who shares your interests',
              timestamp: '2h',
              unread: true,
              avatar: students[1].avatar,
            },
            {
              id: 'notification-2',
              type: 'reply',
              title: 'Isha Kapoor replied to your discussion',
              subtitle: 'That sounds like a great project idea!',
              timestamp: 'Yesterday',
              unread: true,
              avatar: students[2].avatar,
            },
          ]}
          activeTab={activeTab}
          onSelectCommunity={noop}
          onOpenProfile={noop}
          onSelectTab={selectTab}
          onLogout={noop}
          unreadNotificationsCount={2}
          onMarkAllNotificationsRead={noop}
          onMarkNotificationRead={noop}
          onOpenNotification={noop}
          onOpenInvite={noop}
        />
        <main className="flex min-h-0 flex-1 w-full pb-24 lg:pb-12">
          <HomeFeed
            currentUser={currentUser}
            users={students}
            posts={posts}
            opportunities={opportunities}
            communities={communities}
            feedFilter="looking-for"
            isFeedLoading={false}
            hasMoreFeedPosts={false}
            onSelectCommunity={noop}
            onSelectTab={selectTab}
            onOpenNetworkChallenge={noop}
            onOpenProfile={noop}
            onOpenOpportunity={noop}
            onToggleConnect={noop}
            onToggleUpvote={noop}
            onToggleLike={noop}
            onToggleSave={noop}
            onEditPost={noopAsync}
            onDeletePost={noopAsync}
            onResharePost={noopAsync}
            onSharePostToCommunity={noopAsync}
            onVotePoll={noopAsync}
            onAddComment={noopAsync}
            onOpenCreatePost={noop}
            onStartAnonymousChat={noop}
            onToggleJoinCommunity={noop}
          />
        </main>
      </div>
      <div className="mobile-bottom-nav-container">
        <BottomNav
          currentTab={activeTab}
          onSelectTab={selectTab}
          unreadChatsCount={2}
        />
      </div>
    </div>
  );
}
