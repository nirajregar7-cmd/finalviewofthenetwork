import React, { useState } from 'react';
import { X, Sparkles, CheckCircle2, ArrowRight, Brain, Target, BookOpen } from 'lucide-react';
import confetti from 'canvas-confetti';

interface RecommendRoadmapModalProps {
  onClose: () => void;
  onSelectRoadmap: (slug: string) => void;
}

export const RecommendRoadmapModal: React.FC<RecommendRoadmapModalProps> = ({
  onClose,
  onSelectRoadmap,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [targetGoal, setTargetGoal] = useState('AI & ML Engineer');
  const [experienceLevel, setExperienceLevel] = useState('Intermediate (knows Python & basic math)');
  const [weeklyHours, setWeeklyHours] = useState('10-15 hours/week');
  const [recommendedResult, setRecommendedResult] = useState<any>(null);

  const handleGenerate = () => {
    setRecommendedResult({
      title: 'Personalized AI/ML & Applied Systems Path',
      slug: '/ai-ml',
      duration: '14 Weeks',
      modulesCount: 4,
      skills: ['Python Math', 'Supervised Learning', 'Deep Learning', 'PyTorch Project'],
      fitScore: '96%',
    });
    setStep(3);
    confetti({ particleCount: 40, spread: 60 });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden relative my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">Personalized Roadmap Matcher</h2>
              <p className="text-[10px] text-slate-400">Tailored to your goal & current year</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  1. What is your primary dream target for 2025/2026?
                </label>
                <div className="space-y-1.5">
                  {(
                    [
                      'AI & ML Engineer / Researcher',
                      'GATE 2026 Top 100 Rank (CSE / EE)',
                      'Product Companies / SDE Placements (FAANG / Tier 1)',
                      'Building a Tech Startup / Co-Founder',
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setTargetGoal(opt)}
                      className={`w-full text-left p-3 rounded-xl border text-xs font-semibold transition-all ${
                        targetGoal === opt
                          ? 'bg-indigo-50 border-indigo-400 text-indigo-900 shadow-xs ring-1 ring-indigo-200'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setStep(2)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Next: Current Level</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  2. What is your current preparation level?
                </label>
                <div className="space-y-1.5">
                  {(
                    [
                      'Beginner (Starting from scratch)',
                      'Intermediate (knows Python & basic math)',
                      'Advanced (Solved 150+ DSA / knows ML basics)',
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setExperienceLevel(opt)}
                      className={`w-full text-left p-3 rounded-xl border text-xs font-semibold transition-all ${
                        experienceLevel === opt
                          ? 'bg-indigo-50 border-indigo-400 text-indigo-900 shadow-xs ring-1 ring-indigo-200'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  Back
                </button>
                <button
                  onClick={handleGenerate}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Build My Roadmap</span>
                </button>
              </div>
            </div>
          )}

          {step === 3 && recommendedResult && (
            <div className="space-y-4 animate-in zoom-in-95">
              <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 space-y-2.5 text-left">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {recommendedResult.fitScore} Career Fit Match
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    ⏱ {recommendedResult.duration}
                  </span>
                </div>
                <h3 className="text-sm font-black text-slate-900">{recommendedResult.title}</h3>
                <p className="text-xs text-slate-600">
                  Custom milestone curated with peer study groups from NIT Trichy & IIT Madras.
                </p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {recommendedResult.skills.map((s: string) => (
                    <span
                      key={s}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-white border border-indigo-200 text-indigo-700"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    onSelectRoadmap(recommendedResult.slug);
                    onClose();
                  }}
                  className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Enroll in Roadmap
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
