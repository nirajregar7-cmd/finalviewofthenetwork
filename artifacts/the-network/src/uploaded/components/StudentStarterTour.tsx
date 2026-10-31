import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  GraduationCap,
  Lightbulb,
  MessageCircle,
  Plus,
  Share2,
  Sparkles,
  Target,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import type { UserProfile } from '../../types';
import { getStudentAudience } from '../../utils/studentRecommendations';
import type { Community, NavTab } from '../types';
import { getStarterCommunityRecommendations } from '../communityRecommendations';

type StudentStarterTourProps = {
  currentUser: UserProfile;
  communities: Community[];
  onSelectTab: (tab: NavTab) => void;
  onOpenInvite: (handlers?: {
    onCancel?: () => void;
    onContinue?: () => void;
  }) => void;
  onOpenCommunity: (community: Community) => void;
  onJoinCommunity: (community: Community) => void | Promise<void>;
  onOpenCreatePost: (draft: { requestType: string; title: string; content: string }) => void;
};

type TourStep = {
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  actionLabel?: string;
  action?: () => void;
};

const TOUR_VERSION = 'student-starter-tour-v1';

function audienceLabel(currentUser: UserProfile): string {
  const audience = getStudentAudience(currentUser);
  const labels = [
    audience.classLevel,
    ...audience.examTargets.slice(0, 2),
    ...audience.techTopics.slice(0, 2),
    ...(currentUser.interests || []).slice(0, 1),
  ].filter(Boolean);
  return [...new Set(labels)].slice(0, 3).join(' · ') || 'your goals';
}

function studyPartnerDraft(currentUser: UserProfile) {
  const audience = getStudentAudience(currentUser);
  const focus = [
    audience.classLevel,
    ...audience.examTargets.slice(0, 2),
  ].filter(Boolean);
  const interests = [
    ...audience.techTopics,
    ...(currentUser.interests || []),
  ].filter((value, index, values) =>
    values.findIndex((candidate) => candidate.toLowerCase() === value.toLowerCase()) === index,
  ).slice(0, 3);
  const titleFocus = audience.examTargets[0]
    ? [audience.classLevel, audience.examTargets[0]].filter(Boolean).join(' ')
    : audience.classLevel || interests[0] || '';
  const title = titleFocus
    ? `Looking for a ${titleFocus} study partner`
    : 'Looking for a study partner';
  const focusSentence = focus.length
    ? ` with similar goals around ${focus.join(' and ')}`
    : '';
  const interestSentence = interests.length
    ? ` I’m also interested in ${interests.join(', ')}.`
    : '';

  return {
    requestType: 'Study partner',
    title,
    content: `Hi! I’m looking for a study partner${focusSentence}. I’d like to study consistently, discuss doubts, and keep each other accountable.${interestSentence} Let me know if you’d like to study together.`,
  };
}

export const StudentStarterTour: React.FC<StudentStarterTourProps> = ({
  currentUser,
  communities,
  onSelectTab,
  onOpenInvite,
  onOpenCommunity,
  onJoinCommunity,
  onOpenCreatePost,
}) => {
  const storageKey = `${TOUR_VERSION}:${currentUser.id}`;
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [joiningCommunityIds, setJoiningCommunityIds] = useState<Set<string>>(() => new Set());
  const communityRecommendations = useMemo(
    () => getStarterCommunityRecommendations(currentUser, communities),
    [currentUser, communities],
  );
  const studentPath = audienceLabel(currentUser);

  useEffect(() => {
    setIsOpen(localStorage.getItem(storageKey) !== 'complete');
  }, [storageKey]);

  const closeTour = () => {
    localStorage.setItem(storageKey, 'complete');
    setIsOpen(false);
  };

  const navigateAndClose = (action: () => void) => {
    closeTour();
    action();
  };

  const steps = useMemo<TourStep[]>(() => [
    {
      eyebrow: 'Your first 2 minutes',
      title: 'Welcome to your student network',
      description: 'The Network helps you find classmates, study partners, mentors, communities, notes, opportunities, and conversations that match your path.',
      icon: Sparkles,
      actionLabel: 'Show me how',
    },
    {
      eyebrow: communityRecommendations.some((item) => item.isPersonalized)
        ? 'Picked for your path'
        : 'Find your space',
      title: communityRecommendations.length
        ? 'Communities for your goals'
        : 'Find your space',
      description: communityRecommendations.some((item) => item.isPersonalized)
        ? `Based on your ${studentPath} profile and interests, these are good places to start.`
        : 'Explore active communities for your class, exam, interests, or skills.',
      icon: Users,
      actionLabel: 'Next',
    },
    {
      eyebrow: 'Build your circle',
      title: 'Invite classmates and friends',
      description: 'Bring your class, coaching group, or college friends together. Share your invite link on WhatsApp or any group where your study partners already are.',
      icon: Share2,
      actionLabel: 'Invite classmates',
      action: () => {
        setIsOpen(false);
        onOpenInvite({
          onCancel: () => setIsOpen(true),
          onContinue: () => {
            setStepIndex((current) => current + 1);
            setIsOpen(true);
          },
        });
      },
    },
    {
      eyebrow: 'Find people',
      title: 'Meet students who are on the same path',
      description: 'Use Campus Match to find study partners, coding partners, senior guidance, and students with similar goals. Send a Connect request when you find a good fit.',
      icon: UserPlus,
      actionLabel: 'Open Campus Match',
      action: () => navigateAndClose(() => onSelectTab('connect')),
    },
    {
      eyebrow: 'Learn together',
      title: 'Grow skills with the right people',
      description: 'Join Web Development, AI / ML, DSA, Python, Java, C++, and other skill communities. Share what you are building, ask for feedback, and learn in public.',
      icon: Lightbulb,
      actionLabel: 'See skill communities',
      action: () => navigateAndClose(() => onSelectTab('communities')),
    },
    {
      eyebrow: 'Prepare with peers',
      title: 'Use communities for exams too',
      description: 'Class 10, Class 11, Class 12, JEE, NEET, GATE, CAT, UPSC, CUET, CLAT, NDA, and other competitive-exam learners can find doubts, resources, practice partners, and motivation here.',
      icon: Target,
      actionLabel: 'Explore exam communities',
      action: () => navigateAndClose(() => onSelectTab('communities')),
    },
    {
      eyebrow: 'You are ready',
      title: 'Take one small step today',
      description: 'Post one question, join one community, or invite one friend. Consistent small actions turn The Network into a useful study circle for you.',
      icon: Check,
      actionLabel: 'Start exploring',
      action: () => navigateAndClose(() => onSelectTab('home')),
    },
  ], [
    currentUser,
    navigateAndClose,
    onOpenCommunity,
    onOpenInvite,
    onJoinCommunity,
    onOpenCreatePost,
    onSelectTab,
    communityRecommendations,
    studentPath,
  ]);

  if (!isOpen) return null;

  const step = steps[stepIndex];
  const Icon = step.icon;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  const handlePrimary = () => {
    if (step.action) {
      step.action();
      return;
    }
    if (isLast) {
      closeTour();
    } else {
      setStepIndex((current) => current + 1);
    }
  };

  const handleJoinCommunity = async (community: Community) => {
    if (community.isJoined || joiningCommunityIds.has(community.id)) return;
    setJoiningCommunityIds((current) => new Set(current).add(community.id));
    try {
      await onJoinCommunity(community);
    } finally {
      setJoiningCommunityIds((current) => {
        const next = new Set(current);
        next.delete(community.id);
        return next;
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-starter-tour-title"
    >
      <div className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-x-hidden overflow-y-auto rounded-[28px] bg-white shadow-2xl shadow-slate-950/30">
        <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-400" />
        <div className="flex items-center justify-between px-5 pt-5 sm:px-7 sm:pt-7">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">
            <GraduationCap size={15} />
            The Network starter guide
          </div>
          <button
            type="button"
            onClick={closeTour}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close starter guide"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pb-5 pt-6 sm:px-7 sm:pb-7">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Icon size={28} strokeWidth={2.2} />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                {step.eyebrow}
              </p>
              <h2 id="student-starter-tour-title" className="text-2xl font-black leading-tight tracking-tight text-slate-950">
                {step.title}
              </h2>
            </div>
          </div>

          <p className="text-[15px] font-medium leading-7 text-slate-600">{step.description}</p>

          {stepIndex === 1 && (
            <div className="mt-5 space-y-2.5">
              {communityRecommendations.length > 0 ? communityRecommendations.map(({ community, reason, isPersonalized }) => {
                const isJoining = joiningCommunityIds.has(community.id);
                return (
                  <div
                    key={community.id}
                    className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
                      <Users size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => navigateAndClose(() => onOpenCommunity(community))}
                        className="block max-w-full truncate text-left text-sm font-black text-slate-900 hover:text-indigo-700"
                        aria-label={`Open ${community.displayName || community.name}`}
                      >
                        {community.displayName || community.name}
                      </button>
                      <p className="mt-0.5 truncate text-[10px] font-semibold text-indigo-700">
                        {isPersonalized ? reason : 'Popular with students'}
                      </p>
                      <p className="mt-0.5 text-[10px] font-medium text-slate-500">
                        {community.membersCount || 0} members · {community.onlineCount || 0} online
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isJoining}
                      onClick={() => void handleJoinCommunity(community)}
                      className="shrink-0 rounded-xl bg-indigo-600 px-3 py-2 text-[10px] font-black text-white transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
                    >
                      {isJoining ? 'Joining…' : 'Join'}
                    </button>
                  </div>
                );
              }) : (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500">
                  You’re already in the communities that match your profile. Explore the directory for more spaces.
                </p>
              )}

              <button
                type="button"
                onClick={() => navigateAndClose(() => onSelectTab('communities'))}
                className="mx-auto block rounded-lg px-3 py-2 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50"
              >
                Browse all communities
              </button>

              <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3">
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-900">Looking for a study partner?</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-slate-600">
                    Start a post with your goals already filled in. You can edit it before sharing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenCreatePost(studyPartnerDraft(currentUser))}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-[10px] font-black text-white transition hover:bg-emerald-700"
                >
                  <Plus size={14} />
                  Write post
                </button>
              </div>
            </div>
          )}

          {stepIndex === 0 && (
            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                { icon: Users, label: 'Meet peers' },
                { icon: BookOpen, label: 'Learn together' },
                { icon: MessageCircle, label: 'Ask & share' },
              ].map(({ icon: FeatureIcon, label }) => (
                <div key={label} className="rounded-2xl bg-slate-50 px-2 py-3 text-center">
                  <FeatureIcon size={18} className="mx-auto mb-1.5 text-indigo-500" />
                  <p className="text-[10px] font-bold text-slate-600">{label}</p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-7 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
              disabled={isFirst}
              className="inline-flex items-center gap-1 rounded-xl px-2 py-2 text-xs font-bold text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-0"
            >
              <ChevronLeft size={16} />
              Back
            </button>

            <div className="flex items-center gap-1.5" aria-label={`Step ${stepIndex + 1} of ${steps.length}`}>
              {steps.map((item, index) => (
                <span
                  key={item.title}
                  className={`h-1.5 rounded-full transition-all ${index === stepIndex ? 'w-6 bg-indigo-600' : 'w-1.5 bg-slate-200'}`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handlePrimary}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-700 active:scale-[0.98]"
            >
              {step.actionLabel || (isLast ? 'Finish' : 'Next')}
              {isLast ? <Check size={15} /> : <ArrowRight size={15} />}
            </button>
          </div>

          {!isLast && !step.action && (
            <button
              type="button"
              onClick={() => setStepIndex((current) => current + 1)}
              className="mx-auto mt-4 flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-indigo-600"
            >
              Skip this step
              <ChevronRight size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentStarterTour;