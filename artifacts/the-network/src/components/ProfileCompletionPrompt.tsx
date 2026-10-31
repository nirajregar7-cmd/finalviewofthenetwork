import React from 'react';
import { ArrowRight, Building2, GraduationCap } from 'lucide-react';
import { UserProfile } from '../types';

interface ProfileCompletionPromptProps {
  currentUser: UserProfile;
  darkMode: boolean;
  onOpenProfile: () => void;
}

const PLACEHOLDER_INSTITUTIONS = new Set([
  '',
  'other',
  'not applicable',
  'n/a',
  'na',
  'self study',
  'self-study',
]);

export function hasInstitutionDetails(user: Pick<UserProfile, 'college' | 'schoolName' | 'coachingName'>) {
  return [user.college, user.schoolName, user.coachingName].some((value) => {
    const normalized = (value || '').trim().toLowerCase();
    return normalized.length >= 2 && !PLACEHOLDER_INSTITUTIONS.has(normalized);
  });
}

export default function ProfileCompletionPrompt({
  currentUser,
  darkMode,
  onOpenProfile,
}: ProfileCompletionPromptProps) {
  if (hasInstitutionDetails(currentUser)) return null;

  return (
    <aside
      role="status"
      className={`fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-xl rounded-2xl border p-3 shadow-2xl backdrop-blur-xl md:inset-x-auto md:bottom-6 md:right-6 md:left-auto md:w-[min(25rem,calc(100vw-3rem))] ${
        darkMode
          ? 'border-indigo-400/20 bg-[#171722]/95 text-slate-100'
          : 'border-indigo-200 bg-white/95 text-slate-900'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
          <Building2 size={19} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black">Help students find you</p>
          <p className={`mt-0.5 text-[11px] leading-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Add your school, college, or coaching institute to get better campus matches and recommendations.
          </p>
          <button
            type="button"
            onClick={onOpenProfile}
            className="mt-2 inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-white transition hover:bg-indigo-700"
          >
            <GraduationCap size={13} />
            Complete profile
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}