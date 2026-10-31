import React, { useState } from 'react';
import {
  X,
  Clock,
  Trophy,
  Users,
  Building,
  CheckCircle2,
  Share2,
  Calendar,
  Sparkles,
  ExternalLink,
  MapPin
} from 'lucide-react';
import { Opportunity } from '../types';
import confetti from 'canvas-confetti';

interface OpportunityDetailModalProps {
  opportunity: Opportunity;
  onClose: () => void;
}

export const OpportunityDetailModal: React.FC<OpportunityDetailModalProps> = ({
  opportunity,
  onClose,
}) => {
  const [applied, setApplied] = useState(false);
  const [teamMode, setTeamMode] = useState<'individual' | 'team'>('team');

  const handleApply = () => {
    setApplied(true);
    confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden relative my-8">
        {/* Header with image */}
        <div className="relative h-40 bg-slate-900 overflow-hidden">
          <img
            src={opportunity.thumbnail || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600'}
            alt={opportunity.title}
            className="w-full h-full object-cover opacity-60"
          />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="absolute bottom-4 left-6 right-6">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/90 text-slate-900 backdrop-blur-xs">
              {opportunity.category}
            </span>
            <h2 className="text-xl font-black text-white mt-1 leading-tight">
              {opportunity.title}
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Key metadata chips */}
          <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
            <div>
              <p className="text-xs font-bold text-slate-900">{opportunity.prizeOrStipend}</p>
              <p className="text-[10px] text-slate-400 font-medium">Prize / Stipend</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">{opportunity.teamSize}</p>
              <p className="text-[10px] text-slate-400 font-medium">Team Size</p>
            </div>
            <div>
              <p className="text-xs font-bold text-rose-600">{opportunity.daysLeft} days left</p>
              <p className="text-[10px] text-slate-400 font-medium">Deadline</p>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              About This Opportunity
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {opportunity.description}
            </p>
          </div>

          {opportunity.requirements && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Eligibility & Tracks
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {opportunity.requirements.map((req) => (
                  <span
                    key={req}
                    className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100"
                  >
                    {req}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Application Form Mode */}
          {applied ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2 animate-in zoom-in-95">
              <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-emerald-900">Application Submitted!</h4>
              <p className="text-xs text-emerald-700">
                Your team registration details have been sent to the organizing committee. Check your registered email for portal access!
              </p>
            </div>
          ) : (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Participating as:</span>
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                  <button
                    onClick={() => setTeamMode('team')}
                    className={`px-3 py-1 text-xs font-bold rounded-md ${
                      teamMode === 'team' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    Team (4 members)
                  </button>
                  <button
                    onClick={() => setTeamMode('individual')}
                    className={`px-3 py-1 text-xs font-bold rounded-md ${
                      teamMode === 'individual' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    Solo / Need Team
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  onClick={handleApply}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  Confirm & Apply
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
