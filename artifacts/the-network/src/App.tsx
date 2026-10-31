import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import NetworkLoadingScreen from './components/NetworkLoadingScreen';
import { SITE_URL } from './seo/SEOHead';

// Keep route-specific code out of the first screen's JavaScript bundle.
const MainApp = React.lazy(() => import('./MainApp'));
const VideoPage = React.lazy(() => import('./VideoPage'));
const CollegesPage = React.lazy(() => import('./seo/CollegesPage'));
const CollegePage = React.lazy(() => import('./seo/CollegePage'));
const CommunitiesPage = React.lazy(() => import('./seo/CommunitiesPage'));
const CommunityPage = React.lazy(() => import('./seo/CommunityPage'));
const StudentsPage = React.lazy(() => import('./seo/StudentsPage'));
const StudentPage = React.lazy(() => import('./seo/StudentPage'));
const EventsPage = React.lazy(() => import('./seo/EventsPage'));
const OpportunitiesPage = React.lazy(() => import('./seo/OpportunitiesPage'));
const OpportunityPage = React.lazy(() => import('./seo/OpportunityPage'));
const BlogPage = React.lazy(() => import('./seo/BlogPage'));
const BlogPostPage = React.lazy(() => import('./seo/BlogPostPage'));
const CampusAmbassadorPage = React.lazy(() => import('./seo/CampusAmbassadorPage'));
const FoundingMembersPage = React.lazy(() => import('./seo/FoundingMembersPage'));
const SeoLandingPage = React.lazy(() => import('./seo/SeoLandingPage'));
const ResourcesPage = React.lazy(() => import('./seo/ResourcesPage'));

function AppSeoPolicy() {
  const { pathname, search } = useLocation();
  const isPublicPath =
    pathname === '/' ||
    pathname === '/about' ||
    pathname === '/founding-members' ||
    pathname === '/story' ||
    pathname === '/resources' ||
    pathname === '/colleges' ||
    pathname === '/communities' ||
    pathname === '/students' ||
    pathname === '/events' ||
    pathname === '/opportunities' ||
    pathname === '/blog' ||
    pathname === '/campus-ambassador' ||
    pathname === '/study-partners' ||
    pathname === '/project-teammates' ||
    pathname === '/jee' ||
    pathname === '/neet' ||
    pathname === '/gate' ||
    pathname.startsWith('/college/') ||
    pathname.startsWith('/community/') ||
    pathname.startsWith('/student/') ||
    pathname.startsWith('/opportunity/') ||
    pathname.startsWith('/blog/') ||
    pathname.startsWith('/looking-for/') ||
    pathname === '/jee/study-partner' ||
    pathname === '/neet/study-partner';

  if (isPublicPath && !(pathname === '/' && search)) return null;

  return (
    <Helmet>
      <meta name="robots" content="noindex, nofollow" />
      <link rel="canonical" href={`${SITE_URL}${pathname}`} />
    </Helmet>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppSeoPolicy />
      <React.Suspense fallback={<NetworkLoadingScreen />}>
        <Routes>
          {/* Public SEO routes */}
          <Route path="/colleges" element={<CollegesPage />} />
          <Route path="/college/:slug" element={<CollegePage />} />
          <Route path="/communities" element={<CommunitiesPage />} />
          <Route path="/community/:slug" element={<CommunityPage />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/student/:id" element={<StudentPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/opportunities" element={<OpportunitiesPage />} />
          <Route path="/opportunity/:slug" element={<OpportunityPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
          <Route path="/campus-ambassador" element={<CampusAmbassadorPage />} />
          <Route path="/founding-members" element={<FoundingMembersPage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/learn" element={<Navigate to="/resources" replace />} />
          <Route path="/about" element={<SeoLandingPage page="about" />} />
          <Route path="/story" element={<SeoLandingPage page="story" />} />
          <Route path="/study-partners" element={<SeoLandingPage page="study-partners" />} />
          <Route path="/project-teammates" element={<SeoLandingPage page="project-teammates" />} />
          <Route path="/jee" element={<SeoLandingPage page="jee" />} />
          <Route path="/neet" element={<SeoLandingPage page="neet" />} />
          <Route path="/gate" element={<SeoLandingPage page="gate" />} />
          <Route path="/jee/study-partner" element={<SeoLandingPage page="jee/study-partner" />} />
          <Route path="/neet/study-partner" element={<SeoLandingPage page="neet/study-partner" />} />
          <Route path="/looking-for/study-partner" element={<SeoLandingPage page="looking-for/study-partner" />} />
          <Route path="/looking-for/project-teammate" element={<SeoLandingPage page="looking-for/project-teammate" />} />
          <Route path="/looking-for/hackathon-team" element={<SeoLandingPage page="looking-for/hackathon-team" />} />
          <Route path="/looking-for/mentor" element={<SeoLandingPage page="looking-for/mentor" />} />
          <Route path="/looking-for/dsa-partner" element={<SeoLandingPage page="looking-for/dsa-partner" />} />

          {/* Video standalone page */}
          <Route path="/video" element={<VideoPage />} />

          {/* Main app — handles auth, feed, everything else */}
          <Route path="*" element={<MainApp />} />
        </Routes>
      </React.Suspense>
    </BrowserRouter>
  );
}
