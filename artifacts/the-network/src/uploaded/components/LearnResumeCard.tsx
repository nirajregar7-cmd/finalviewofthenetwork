import React from 'react';
import { ArrowRight, BookOpen, ChevronRight } from 'lucide-react';
import type { Community, LearningTopic, RoadmapStep } from '../types';

interface LearnResumeCardProps {
  topic: LearningTopic;
  steps: RoadmapStep[];
  progressPercent: number;
  community?: Community;
  onContinue: () => void;
  onViewRoadmap: () => void;
  onOpenCommunity: () => void;
}

const formatMemberCount = (count: number) =>
  count >= 1000 ? `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}K` : count.toLocaleString();

export const LearnResumeCard: React.FC<LearnResumeCardProps> = ({
  topic,
  steps,
  progressPercent,
  community,
  onContinue,
  onViewRoadmap,
  onOpenCommunity,
}) => {
  const hasCompletedRoadmap = steps.length > 0 && steps.every((step) => step.status === 'completed');

  return (
    <section className="learn-resume-card" aria-labelledby="learn-resume-title">
      <div className="learn-resume-main">
        <div className="learn-resume-label">
          <span className="learn-resume-icon"><BookOpen aria-hidden="true" /></span>
          <span>Your learning plan</span>
        </div>

        <div className="learn-resume-heading">
          <p className="learn-resume-kicker">A good place to pick things back up.</p>
          <h2 id="learn-resume-title">{topic.name}</h2>
          <p className="learn-resume-summary">{topic.summaryPath}</p>
        </div>

        <div className="learn-resume-progress">
          <div className="learn-resume-progress-label">
            <span>Your progress</span>
            <span>{progressPercent}% complete</span>
          </div>
          <div
            className="learn-resume-progress-track"
            role="progressbar"
            aria-label={`${topic.name} progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
          >
            <span style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="learn-resume-actions">
          <button type="button" className="learn-resume-primary" onClick={onContinue}>
            {hasCompletedRoadmap ? 'Review roadmap' : 'Continue roadmap'}
            <ArrowRight aria-hidden="true" />
          </button>
          <button type="button" className="learn-resume-secondary" onClick={onViewRoadmap}>
            View full roadmap
          </button>
        </div>
      </div>

      <aside className="learn-resume-aside" aria-label="Learning community">
        {community && (
          <button type="button" className="learn-resume-community" onClick={onOpenCommunity}>
            <span className="learn-resume-community-count">
              {formatMemberCount(community.membersCount)}
            </span>
            <span className="learn-resume-community-copy">
              students in {community.displayName || community.name}
            </span>
            <ChevronRight aria-hidden="true" />
          </button>
        )}
      </aside>
    </section>
  );
};
